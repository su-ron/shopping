// 订单模型
const { db } = require('../database/connection');

class Order {
    // 生成订单号
    static generateOrderNumber() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `ORD${timestamp}${random}`;
    }

    // 创建订单
    static async create(orderData) {
        const {
            user_id,
            items,
            shipping_address,
            billing_address,
            customer_name,
            customer_email,
            customer_phone,
            payment_method = 'alipay',
            notes
        } = orderData;

        return await db.transaction(async (connection) => {
            // 1. 计算订单金额
            let subtotal = 0;
            const orderItems = [];

            for (const item of items) {
                const productSql = 'SELECT id, name, price, stock_quantity FROM products WHERE id = ?';
                const [products] = await connection.execute(productSql, [item.product_id]);
                const product = products[0];

                if (!product) {
                    throw new Error(`产品不存在: ${item.product_id}`);
                }

                if (product.stock_quantity < item.quantity) {
                    throw new Error(`产品 ${product.name} 库存不足，剩余 ${product.stock_quantity} 件`);
                }

                const itemSubtotal = product.price * item.quantity;
                subtotal += itemSubtotal;

                orderItems.push({
                    product_id: product.id,
                    product_name: product.name,
                    product_price: product.price,
                    quantity: item.quantity,
                    subtotal: itemSubtotal
                });
            }

            // 2. 计算其他费用（这里简化处理）
            const tax_amount = subtotal * 0.10; // 10% 税
            const shipping_amount = subtotal > 99 ? 0 : 15; // 满99免运费
            const discount_amount = 0; // 可扩展优惠券功能
            const total_amount = subtotal + tax_amount + shipping_amount - discount_amount;

            // 3. 创建订单
            const orderNumber = this.generateOrderNumber();
            const orderSql = `
                INSERT INTO orders (
                    order_number, user_id, status, total_amount, subtotal, tax_amount,
                    shipping_amount, discount_amount, payment_method, shipping_address,
                    billing_address, customer_name, customer_email, customer_phone, notes
                ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const orderParams = [
                orderNumber, user_id, total_amount, subtotal, tax_amount,
                shipping_amount, discount_amount, payment_method, shipping_address,
                billing_address, customer_name, customer_email, customer_phone, notes
            ];

            const [orderResult] = await connection.execute(orderSql, orderParams);
            const orderId = orderResult.insertId;

            // 4. 创建订单商品
            for (const item of orderItems) {
                const itemSql = `
                    INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;

                await connection.execute(itemSql, [
                    orderId, item.product_id, item.product_name,
                    item.product_price, item.quantity, item.subtotal
                ]);

                // 5. 更新产品库存
                const updateStockSql = 'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?';
                await connection.execute(updateStockSql, [item.quantity, item.product_id]);
            }

            // 6. 清空用户购物车
            const cartSql = 'SELECT id FROM carts WHERE user_id = ?';
            const [carts] = await connection.execute(cartSql, [user_id]);

            if (carts.length > 0) {
                const cartId = carts[0].id;
                await connection.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
            }

            // 7. 返回完整的订单信息
            return await this.findById(orderId, connection);
        });
    }

    // 根据ID查找订单
    static async findById(id, connection = null) {
        const query = connection ? connection.execute.bind(connection) : db.query.bind(db);

        const sql = `
            SELECT o.*,
                u.username,
                u.email as user_email,
                u.full_name as user_full_name,
                COUNT(oi.id) as item_count,
                SUM(oi.quantity) as total_quantity
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = ?
            GROUP BY o.id
        `;

        const [orders] = await query(sql, [id]);
        if (!orders[0]) return null;

        const order = orders[0];

        // 获取订单商品
        const itemsSql = 'SELECT * FROM order_items WHERE order_id = ?';
        const [items] = await query(itemsSql, [id]);
        order.items = items;

        // 获取支付信息
        const paymentSql = 'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1';
        const [payments] = await query(paymentSql, [id]);
        order.payment = payments[0] || null;

        return order;
    }

    // 根据订单号查找
    static async findByOrderNumber(orderNumber) {
        const sql = 'SELECT id FROM orders WHERE order_number = ?';
        const [orders] = await db.query(sql, [orderNumber]);
        return orders[0] ? await this.findById(orders[0].id) : null;
    }

    // 更新订单状态
    static async updateStatus(id, status, adminId = null) {
        const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

        if (!allowedStatuses.includes(status)) {
            throw new Error(`无效的订单状态: ${status}`);
        }

        const updateData = { status };

        // 设置时间戳
        if (status === 'shipped') {
            updateData.shipped_at = new Date();
        } else if (status === 'delivered') {
            updateData.delivered_at = new Date();
        } else if (status === 'cancelled') {
            updateData.cancelled_at = new Date();
        }

        const sql = `
            UPDATE orders
            SET status = ?,
                ${status === 'shipped' ? 'shipped_at = NOW(), ' : ''}
                ${status === 'delivered' ? 'delivered_at = NOW(), ' : ''}
                ${status === 'cancelled' ? 'cancelled_at = NOW(), ' : ''}
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await db.query(sql, [status, id]);

        // 记录管理员操作日志
        if (adminId) {
            const logSql = `
                INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, details)
                VALUES (?, 'update', 'order', ?, ?)
            `;
            await db.query(logSql, [adminId, id, `更新订单状态为: ${status}`]);
        }

        return await this.findById(id);
    }

    // 更新支付状态
    static async updatePaymentStatus(id, paymentStatus, paymentId = null) {
        const allowedStatuses = ['pending', 'paid', 'failed', 'refunded'];

        if (!allowedStatuses.includes(paymentStatus)) {
            throw new Error(`无效的支付状态: ${paymentStatus}`);
        }

        const updateData = { payment_status: paymentStatus };
        if (paymentId) {
            updateData.payment_id = paymentId;
        }

        if (paymentStatus === 'paid') {
            // 支付成功，更新订单状态为processing
            updateData.status = 'processing';
        }

        const sql = 'UPDATE orders SET ? WHERE id = ?';
        await db.query(sql, [updateData, id]);

        return await this.findById(id);
    }

    // 获取用户订单列表
    static async findByUserId(userId, page = 1, limit = 10, filters = {}) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE o.user_id = ?';
        const params = [userId];

        // 应用筛选条件
        if (filters.status) {
            whereClause += ' AND o.status = ?';
            params.push(filters.status);
        }

        if (filters.payment_status) {
            whereClause += ' AND o.payment_status = ?';
            params.push(filters.payment_status);
        }

        if (filters.start_date) {
            whereClause += ' AND o.created_at >= ?';
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            whereClause += ' AND o.created_at <= ?';
            params.push(filters.end_date);
        }

        if (filters.search) {
            whereClause += ' AND (o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // 获取总数
        const countSql = `SELECT COUNT(*) as total FROM orders o ${whereClause}`;
        const [countResult] = await db.query(countSql, params);
        const total = countResult[0].total;

        // 获取数据
        const dataSql = `
            SELECT
                o.*,
                COUNT(oi.id) as item_count,
                SUM(oi.quantity) as total_quantity
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            ${whereClause}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...params, limit, offset];
        const orders = await db.query(dataSql, dataParams);

        return {
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 获取所有订单（管理员）
    static async findAll(page = 1, limit = 20, filters = {}) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];

        // 应用筛选条件
        if (filters.status) {
            whereClause += ' AND o.status = ?';
            params.push(filters.status);
        }

        if (filters.payment_status) {
            whereClause += ' AND o.payment_status = ?';
            params.push(filters.payment_status);
        }

        if (filters.user_id) {
            whereClause += ' AND o.user_id = ?';
            params.push(filters.user_id);
        }

        if (filters.start_date) {
            whereClause += ' AND o.created_at >= ?';
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            whereClause += ' AND o.created_at <= ?';
            params.push(filters.end_date);
        }

        if (filters.search) {
            whereClause += ' AND (o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ? OR u.username LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // 获取总数
        const countSql = `
            SELECT COUNT(DISTINCT o.id) as total
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ${whereClause}
        `;
        const [countResult] = await db.query(countSql, params);
        const total = countResult[0].total;

        // 获取数据
        const dataSql = `
            SELECT
                o.*,
                u.username,
                u.email as user_email,
                COUNT(oi.id) as item_count,
                SUM(oi.quantity) as total_quantity
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            ${whereClause}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...params, limit, offset];
        const orders = await db.query(dataSql, dataParams);

        return {
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 取消订单
    static async cancel(id, userId, reason = '') {
        const order = await this.findById(id);

        if (!order) {
            throw new Error('订单不存在');
        }

        if (order.user_id !== userId && order.user_id.toString() !== userId.toString()) {
            throw new Error('无权取消此订单');
        }

        if (!['pending', 'processing'].includes(order.status)) {
            throw new Error(`订单状态为 ${order.status}，无法取消`);
        }

        return await db.transaction(async (connection) => {
            // 1. 更新订单状态
            await connection.execute(
                'UPDATE orders SET status = "cancelled", cancelled_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );

            // 2. 恢复产品库存
            const itemsSql = 'SELECT product_id, quantity FROM order_items WHERE order_id = ?';
            const [items] = await connection.execute(itemsSql, [id]);

            for (const item of items) {
                await connection.execute(
                    'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }

            // 3. 记录取消原因
            if (reason) {
                await connection.execute(
                    'UPDATE orders SET notes = CONCAT(notes, ?) WHERE id = ?',
                    [`\n取消原因: ${reason}`, id]
                );
            }

            return await this.findById(id, connection);
        });
    }

    // 获取订单统计
    static async getStats(timeRange = 'month') {
        let dateFilter;
        switch (timeRange) {
            case 'day':
                dateFilter = 'DATE(created_at) = CURDATE()';
                break;
            case 'week':
                dateFilter = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                break;
            case 'month':
                dateFilter = 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                break;
            case 'year':
                dateFilter = 'created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
                break;
            default:
                dateFilter = '1=1';
        }

        const sql = `
            SELECT
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing_orders,
                SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
                SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as avg_order_value,
                DATE(created_at) as date,
                COUNT(*) as daily_orders,
                SUM(total_amount) as daily_revenue
            FROM orders
            WHERE ${dateFilter}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `;

        const stats = await db.query(sql);

        // 计算增长率
        let orderGrowth = 0;
        let revenueGrowth = 0;

        if (stats.length >= 2) {
            const todayOrders = stats[0].daily_orders;
            const yesterdayOrders = stats[1].daily_orders;
            orderGrowth = yesterdayOrders > 0 ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100 : 100;

            const todayRevenue = stats[0].daily_revenue || 0;
            const yesterdayRevenue = stats[1].daily_revenue || 0;
            revenueGrowth = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 100;
        }

        return {
            overview: {
                total: stats.reduce((sum, item) => sum + item.daily_orders, 0),
                revenue: stats.reduce((sum, item) => sum + (item.daily_revenue || 0), 0),
                avgOrderValue: stats.length > 0 ? stats[0].avg_order_value : 0
            },
            byStatus: {
                pending: stats.reduce((sum, item) => sum + item.pending_orders, 0),
                processing: stats.reduce((sum, item) => sum + item.processing_orders, 0),
                shipped: stats.reduce((sum, item) => sum + item.shipped_orders, 0),
                delivered: stats.reduce((sum, item) => sum + item.delivered_orders, 0),
                cancelled: stats.reduce((sum, item) => sum + item.cancelled_orders, 0)
            },
            byPayment: {
                paid: stats.reduce((sum, item) => sum + item.paid_orders, 0)
            },
            dailyStats: stats,
            growth: {
                orders: orderGrowth.toFixed(2),
                revenue: revenueGrowth.toFixed(2)
            }
        };
    }

    // 获取热门产品（按销量）
    static async getTopProducts(limit = 10) {
        const sql = `
            SELECT
                p.id,
                p.name,
                p.slug,
                pi.image_url as image,
                SUM(oi.quantity) as total_sold,
                SUM(oi.subtotal) as total_revenue,
                p.price,
                p.stock_quantity
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status NOT IN ('cancelled', 'refunded')
            AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY p.id, p.name, p.slug, pi.image_url, p.price, p.stock_quantity
            ORDER BY total_sold DESC
            LIMIT ?
        `;

        return await db.query(sql, [limit]);
    }

    // 导出订单数据
    static async export(startDate, endDate, format = 'json') {
        const sql = `
            SELECT
                o.*,
                u.username,
                u.email as user_email,
                u.full_name as user_full_name,
                GROUP_CONCAT(
                    CONCAT(oi.product_name, ' (x', oi.quantity, ')')
                    SEPARATOR ', '
                ) as products
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.created_at BETWEEN ? AND ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;

        const orders = await db.query(sql, [startDate, endDate]);

        if (format === 'csv') {
            // 转换为CSV格式
            const headers = ['订单号', '客户', '邮箱', '总金额', '状态', '支付状态', '创建时间', '商品'];
            const rows = orders.map(order => [
                order.order_number,
                order.customer_name || order.user_full_name || order.username,
                order.customer_email || order.user_email,
                order.total_amount,
                order.status,
                order.payment_status,
                order.created_at,
                order.products
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            return csvContent;
        }

        // 默认返回JSON
        return orders;
    }

    // 批量更新订单状态
    static async bulkUpdateStatus(orderIds, status, adminId) {
        return await db.transaction(async (connection) => {
            for (const orderId of orderIds) {
                await this.updateStatus(orderId, status, adminId);

                // 记录批量操作日志
                await connection.execute(
                    'INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, details) VALUES (?, ?, ?, ?, ?)',
                    [adminId, 'bulk_update', 'order', orderId, `批量更新状态为: ${status}`]
                );
            }
            return true;
        });
    }
}

module.exports = Order;