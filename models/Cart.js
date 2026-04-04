// 购物车模型
const { db } = require('../database/connection');

class Cart {
    // 获取或创建用户购物车
    static async getOrCreateCart(userId, sessionId = null) {
        let cart;

        if (userId) {
            // 优先使用用户ID查找购物车
            const sql = 'SELECT * FROM carts WHERE user_id = ?';
            const [carts] = await db.query(sql, [userId]);
            cart = carts[0];
        } else if (sessionId) {
            // 使用会话ID查找购物车
            const sql = 'SELECT * FROM carts WHERE session_id = ? AND user_id IS NULL';
            const [carts] = await db.query(sql, [sessionId]);
            cart = carts[0];
        }

        // 如果找不到购物车，创建新的
        if (!cart) {
            const insertSql = 'INSERT INTO carts (user_id, session_id) VALUES (?, ?)';
            const [result] = await db.query(insertSql, [userId || null, sessionId || null]);

            const selectSql = 'SELECT * FROM carts WHERE id = ?';
            const [carts] = await db.query(selectSql, [result.insertId]);
            cart = carts[0];
        }

        return cart;
    }

    // 合并购物车（用户登录后）
    static async mergeCarts(sessionCartId, userId) {
        return await db.transaction(async (connection) => {
            // 1. 获取用户购物车
            const userCartSql = 'SELECT * FROM carts WHERE user_id = ?';
            const [userCarts] = await connection.execute(userCartSql, [userId]);
            let userCart = userCarts[0];

            // 2. 如果用户没有购物车，创建新的
            if (!userCart) {
                const insertSql = 'INSERT INTO carts (user_id) VALUES (?)';
                const [result] = await connection.execute(insertSql, [userId]);

                const selectSql = 'SELECT * FROM carts WHERE id = ?';
                const [carts] = await connection.execute(selectSql, [result.insertId]);
                userCart = carts[0];
            }

            // 3. 获取会话购物车商品
            const sessionItemsSql = 'SELECT * FROM cart_items WHERE cart_id = ?';
            const [sessionItems] = await connection.execute(sessionItemsSql, [sessionCartId]);

            // 4. 合并商品
            for (const sessionItem of sessionItems) {
                // 检查用户购物车是否已有该商品
                const existingItemSql = 'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?';
                const [existingItems] = await connection.execute(existingItemSql, [userCart.id, sessionItem.product_id]);

                if (existingItems.length > 0) {
                    // 合并数量
                    const updateSql = 'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?';
                    await connection.execute(updateSql, [sessionItem.quantity, existingItems[0].id]);
                } else {
                    // 添加新商品
                    const insertItemSql = `
                        INSERT INTO cart_items (cart_id, product_id, quantity, price_at_add)
                        VALUES (?, ?, ?, ?)
                    `;
                    await connection.execute(insertItemSql, [
                        userCart.id,
                        sessionItem.product_id,
                        sessionItem.quantity,
                        sessionItem.price_at_add
                    ]);
                }
            }

            // 5. 删除会话购物车
            await connection.execute('DELETE FROM cart_items WHERE cart_id = ?', [sessionCartId]);
            await connection.execute('DELETE FROM carts WHERE id = ?', [sessionCartId]);

            // 6. 返回合并后的购物车
            return await this.getCartDetails(userCart.id, connection);
        });
    }

    // 获取购物车详情
    static async getCartDetails(cartId, connection = null) {
        const query = connection ? connection.execute.bind(connection) : db.query.bind(db);

        const sql = `
            SELECT
                ci.id as item_id,
                ci.product_id,
                p.name as product_name,
                p.slug as product_slug,
                pi.image_url as product_image,
                ci.quantity,
                ci.price_at_add as price,
                p.price as current_price,
                p.stock_quantity as stock,
                (ci.quantity * ci.price_at_add) as item_total,
                (ci.quantity * p.price) as current_item_total,
                p.is_active as product_active
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
            WHERE ci.cart_id = ?
            ORDER BY ci.created_at DESC
        `;

        const items = await query(sql, [cartId]);

        // 计算总计和验证
        let subtotal = 0;
        let currentSubtotal = 0;
        let itemCount = 0;
        const invalidItems = [];

        for (const item of items) {
            // 检查商品是否有效
            if (!item.product_active || item.stock <= 0) {
                invalidItems.push({
                    item_id: item.item_id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    reason: !item.product_active ? '商品已下架' : '库存不足'
                });
                continue;
            }

            // 检查库存是否足够
            if (item.quantity > item.stock) {
                invalidItems.push({
                    item_id: item.item_id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    reason: `库存不足，剩余 ${item.stock} 件`
                });
                continue;
            }

            subtotal += item.item_total;
            currentSubtotal += item.current_item_total;
            itemCount += item.quantity;
        }

        // 计算运费（满99免运费）
        const shipping = subtotal >= 99 ? 0 : 15;
        const tax = subtotal * 0.10; // 10% 税
        const total = subtotal + shipping + tax;

        return {
            cart_id: cartId,
            items: items.filter(item =>
                item.product_active && item.stock > 0 && item.quantity <= item.stock
            ),
            summary: {
                itemCount,
                subtotal: parseFloat(subtotal.toFixed(2)),
                currentSubtotal: parseFloat(currentSubtotal.toFixed(2)),
                shipping: parseFloat(shipping.toFixed(2)),
                tax: parseFloat(tax.toFixed(2)),
                total: parseFloat(total.toFixed(2)),
                formattedTotal: `¥${total.toFixed(2)}`,
                freeShippingThreshold: 99,
                isEligibleForFreeShipping: subtotal >= 99
            },
            invalidItems,
            warnings: invalidItems.length > 0 ? '购物车中有无效商品，请检查' : null
        };
    }

    // 添加商品到购物车
    static async addItem(cartId, productId, quantity = 1) {
        return await db.transaction(async (connection) => {
            // 1. 检查产品是否存在且有库存
            const productSql = 'SELECT id, name, price, stock_quantity, is_active FROM products WHERE id = ?';
            const [products] = await connection.execute(productSql, [productId]);
            const product = products[0];

            if (!product) {
                throw new Error('产品不存在');
            }

            if (!product.is_active) {
                throw new Error('产品已下架');
            }

            if (product.stock_quantity < quantity) {
                throw new Error(`库存不足，剩余 ${product.stock_quantity} 件`);
            }

            // 2. 检查购物车是否已有该商品
            const existingItemSql = 'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?';
            const [existingItems] = await connection.execute(existingItemSql, [cartId, productId]);

            if (existingItems.length > 0) {
                // 更新数量
                const newQuantity = existingItems[0].quantity + quantity;

                if (product.stock_quantity < newQuantity) {
                    throw new Error(`库存不足，最多可添加 ${product.stock_quantity - existingItems[0].quantity} 件`);
                }

                const updateSql = 'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
                await connection.execute(updateSql, [newQuantity, existingItems[0].id]);
            } else {
                // 添加新商品
                const insertSql = `
                    INSERT INTO cart_items (cart_id, product_id, quantity, price_at_add)
                    VALUES (?, ?, ?, ?)
                `;
                await connection.execute(insertSql, [cartId, productId, quantity, product.price]);
            }

            // 3. 返回更新后的购物车
            return await this.getCartDetails(cartId, connection);
        });
    }

    // 更新购物车商品数量
    static async updateItemQuantity(cartId, productId, quantity) {
        if (quantity < 1) {
            throw new Error('数量必须大于0');
        }

        return await db.transaction(async (connection) => {
            // 1. 检查产品库存
            const productSql = 'SELECT stock_quantity FROM products WHERE id = ?';
            const [products] = await connection.execute(productSql, [productId]);
            const product = products[0];

            if (!product) {
                throw new Error('产品不存在');
            }

            if (product.stock_quantity < quantity) {
                throw new Error(`库存不足，最多可购买 ${product.stock_quantity} 件`);
            }

            // 2. 更新数量
            const updateSql = 'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE cart_id = ? AND product_id = ?';
            const [result] = await connection.execute(updateSql, [quantity, cartId, productId]);

            if (result.affectedRows === 0) {
                throw new Error('购物车中未找到该商品');
            }

            // 3. 返回更新后的购物车
            return await this.getCartDetails(cartId, connection);
        });
    }

    // 从购物车移除商品
    static async removeItem(cartId, productId) {
        const deleteSql = 'DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?';
        const [result] = await db.query(deleteSql, [cartId, productId]);

        if (result.affectedRows === 0) {
            throw new Error('购物车中未找到该商品');
        }

        return await this.getCartDetails(cartId);
    }

    // 清空购物车
    static async clearCart(cartId) {
        const deleteSql = 'DELETE FROM cart_items WHERE cart_id = ?';
        await db.query(deleteSql, [cartId]);
        return { cart_id: cartId, items: [], summary: { itemCount: 0, subtotal: 0, total: 0 } };
    }

    // 获取购物车商品数量
    static async getItemCount(cartId) {
        const sql = 'SELECT SUM(quantity) as total FROM cart_items WHERE cart_id = ?';
        const [result] = await db.query(sql, [cartId]);
        return result[0].total || 0;
    }

    // 验证购物车（下单前）
    static async validateCart(cartId) {
        const cart = await this.getCartDetails(cartId);

        if (cart.items.length === 0) {
            throw new Error('购物车为空');
        }

        if (cart.invalidItems.length > 0) {
            const invalidProducts = cart.invalidItems.map(item => item.product_name).join(', ');
            throw new Error(`购物车中有无效商品: ${invalidProducts}`);
        }

        // 检查价格是否变化
        const priceChanged = cart.items.some(item => item.price !== item.current_price);
        if (priceChanged) {
            console.warn('购物车中商品价格已发生变化');
        }

        return {
            isValid: true,
            cart,
            warnings: priceChanged ? '部分商品价格已更新，请确认' : null
        };
    }

    // 获取购物车统计
    static async getStats() {
        const sql = `
            SELECT
                COUNT(DISTINCT c.id) as active_carts,
                COUNT(DISTINCT c.user_id) as active_users,
                COUNT(ci.id) as total_items,
                SUM(ci.quantity) as total_quantity,
                AVG(ci.quantity) as avg_items_per_cart,
                DATE(c.updated_at) as date,
                COUNT(DISTINCT c.id) as daily_active_carts
            FROM carts c
            LEFT JOIN cart_items ci ON c.id = ci.cart_id
            WHERE c.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(c.updated_at)
            ORDER BY date DESC
        `;

        const stats = await db.query(sql);

        // 计算放弃率（假设24小时未更新为放弃）
        const abandonedSql = `
            SELECT COUNT(*) as abandoned_carts
            FROM carts c
            WHERE c.updated_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
            AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id)
        `;

        const [abandonedResult] = await db.query(abandonedSql);

        return {
            overview: {
                activeCarts: stats.reduce((sum, item) => sum + item.daily_active_carts, 0),
                activeUsers: stats[0]?.active_users || 0,
                totalItems: stats.reduce((sum, item) => sum + item.total_items, 0),
                avgItemsPerCart: stats[0]?.avg_items_per_cart || 0
            },
            abandonedCarts: abandonedResult[0].abandoned_carts,
            dailyStats: stats
        };
    }

    // 批量更新购物车商品价格（当产品价格变化时）
    static async updatePricesForProduct(productId, newPrice) {
        const sql = 'UPDATE cart_items SET price_at_add = ? WHERE product_id = ?';
        const [result] = await db.query(sql, [newPrice, productId]);
        return result.affectedRows;
    }

    // 清理过期购物车（30天未更新）
    static async cleanupExpiredCarts() {
        const sql = `
            DELETE c, ci
            FROM carts c
            LEFT JOIN cart_items ci ON c.id = ci.cart_id
            WHERE c.updated_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
            AND c.user_id IS NULL
        `;

        const [result] = await db.query(sql);
        return result.affectedRows;
    }

    // 获取用户购物车历史（已购买商品）
    static async getPurchaseHistory(userId, limit = 20) {
        const sql = `
            SELECT DISTINCT
                p.id,
                p.name,
                p.slug,
                pi.image_url as image,
                MAX(o.created_at) as last_purchased,
                COUNT(DISTINCT o.id) as purchase_count,
                SUM(oi.quantity) as total_quantity
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
            WHERE o.user_id = ?
            AND o.status NOT IN ('cancelled', 'refunded')
            GROUP BY p.id, p.name, p.slug, pi.image_url
            ORDER BY last_purchased DESC
            LIMIT ?
        `;

        return await db.query(sql, [userId, limit]);
    }
}

module.exports = Cart;