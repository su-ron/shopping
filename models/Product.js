// 产品模型
const { db } = require('../database/connection');
const ProductImage = require('./ProductImage');

class Product {
    // 创建产品
    static async create(productData) {
        const {
            name,
            slug,
            description,
            short_description,
            price,
            original_price,
            cost_price,
            stock_quantity = 0,
            category_id,
            brand,
            weight,
            dimensions,
            is_featured = false,
            sku
        } = productData;

        const sql = `
            INSERT INTO products (
                name, slug, description, short_description, price, original_price,
                cost_price, stock_quantity, category_id, brand, weight, dimensions,
                is_featured, sku
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            name, slug, description, short_description, price, original_price,
            cost_price, stock_quantity, category_id, brand, weight, dimensions,
            is_featured, sku
        ];

        const result = await db.query(sql, params);
        return await this.findById(result.insertId);
    }

    // 根据ID查找产品
    static async findById(id, includeImages = false) {
        const sql = 'SELECT * FROM product_details WHERE id = ?';
        const [products] = await db.query(sql, [id]);
        const product = products[0] || null;

        if (product && includeImages) {
            product.images = await ProductImage.findByProductId(id);
            product.carousel_images = await ProductImage.getCarouselImages(id);
            product.thumbnail = await ProductImage.getThumbnail(id);
        }

        return product;
    }

    // 根据slug查找产品
    static async findBySlug(slug, includeImages = false) {
        const sql = 'SELECT * FROM product_details WHERE slug = ?';
        const [products] = await db.query(sql, [slug]);
        const product = products[0] || null;

        if (product && includeImages) {
            product.images = await ProductImage.findByProductId(product.id);
            product.carousel_images = await ProductImage.getCarouselImages(product.id);
            product.thumbnail = await ProductImage.getThumbnail(product.id);
        }

        return product;
    }

    // 更新产品
    static async update(id, updateData) {
        const allowedFields = [
            'name', 'slug', 'description', 'short_description', 'price', 'original_price',
            'cost_price', 'stock_quantity', 'category_id', 'brand', 'weight', 'dimensions',
            'is_featured', 'is_active', 'sku'
        ];

        const updates = [];
        const params = [];

        for (const [field, value] of Object.entries(updateData)) {
            if (allowedFields.includes(field) && value !== undefined) {
                updates.push(`${field} = ?`);
                params.push(value);
            }
        }

        if (updates.length === 0) {
            return null;
        }

        params.push(id);
        const sql = `UPDATE products SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

        await db.query(sql, params);
        return await this.findById(id);
    }

    // 删除产品（软删除）
    static async delete(id) {
        const sql = 'UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await db.query(sql, [id]);
        return true;
    }

    // 获取产品列表（分页+筛选）
    static async findAll(page = 1, limit = 20, filters = {}) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];

        // 应用筛选条件
        if (filters.category_id) {
            whereClause += ' AND category_id = ?';
            params.push(filters.category_id);
        }

        if (filters.category_slug) {
            whereClause += ' AND category_slug = ?';
            params.push(filters.category_slug);
        }

        if (filters.min_price !== undefined) {
            whereClause += ' AND price >= ?';
            params.push(filters.min_price);
        }

        if (filters.max_price !== undefined) {
            whereClause += ' AND price <= ?';
            params.push(filters.max_price);
        }

        if (filters.is_featured !== undefined) {
            whereClause += ' AND is_featured = ?';
            params.push(filters.is_featured);
        }

        if (filters.in_stock !== undefined) {
            if (filters.in_stock) {
                whereClause += ' AND stock_quantity > 0';
            } else {
                whereClause += ' AND stock_quantity <= 0';
            }
        }

        if (filters.search) {
            whereClause += ' AND (name LIKE ? OR description LIKE ? OR short_description LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // 排序
        let orderBy = 'created_at DESC';
        if (filters.sort) {
            switch (filters.sort) {
                case 'price_asc':
                    orderBy = 'price ASC';
                    break;
                case 'price_desc':
                    orderBy = 'price DESC';
                    break;
                case 'name_asc':
                    orderBy = 'name ASC';
                    break;
                case 'name_desc':
                    orderBy = 'name DESC';
                    break;
                case 'rating_desc':
                    orderBy = 'average_rating DESC';
                    break;
                case 'newest':
                    orderBy = 'created_at DESC';
                    break;
                case 'bestseller':
                    orderBy = 'sold_count DESC';
                    break;
            }
        }

        // 获取总数
        const countSql = `SELECT COUNT(*) as total FROM product_details ${whereClause}`;
        const [countResult] = await db.query(countSql, params);
        const total = countResult[0].total;

        // 获取数据
        const dataSql = `
            SELECT *
            FROM product_details
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...params, limit, offset];
        const products = await db.query(dataSql, dataParams);

        // 如果需要包含图片，为每个产品获取缩略图
        if (filters.include_images) {
            for (const product of products) {
                product.thumbnail = await ProductImage.getThumbnail(product.id);
            }
        }

        return {
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 搜索产品
    static async search(query, page = 1, limit = 20, filters = {}) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];

        // 搜索条件
        if (query) {
            whereClause += ' AND (name LIKE ? OR description LIKE ? OR short_description LIKE ?)';
            const searchTerm = `%${query}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // 其他筛选条件
        if (filters.category_id) {
            whereClause += ' AND category_id = ?';
            params.push(filters.category_id);
        }

        if (filters.min_price !== undefined) {
            whereClause += ' AND price >= ?';
            params.push(filters.min_price);
        }

        if (filters.max_price !== undefined) {
            whereClause += ' AND price <= ?';
            params.push(filters.max_price);
        }

        if (filters.in_stock !== undefined && filters.in_stock) {
            whereClause += ' AND stock_quantity > 0';
        }

        // 获取总数
        const countSql = `SELECT COUNT(*) as total FROM product_details ${whereClause}`;
        const [countResult] = await db.query(countSql, params);
        const total = countResult[0].total;

        // 获取数据（按相关性排序）
        const dataSql = `
            SELECT *,
                CASE
                    WHEN name LIKE ? THEN 3
                    WHEN short_description LIKE ? THEN 2
                    WHEN description LIKE ? THEN 1
                    ELSE 0
                END as relevance
            FROM product_details
            ${whereClause}
            ORDER BY relevance DESC, sold_count DESC, created_at DESC
            LIMIT ? OFFSET ?
        `;

        const searchTerm = query ? `%${query}%` : '%';
        const dataParams = [...params, searchTerm, searchTerm, searchTerm, limit, offset];
        const products = await db.query(dataSql, dataParams);

        // 如果需要包含图片，为每个产品获取缩略图
        if (filters.include_images) {
            for (const product of products) {
                product.thumbnail = await ProductImage.getThumbnail(product.id);
            }
        }

        // 记录搜索历史（如果有用户ID）
        if (filters.user_id && query) {
            await this.recordSearchHistory(filters.user_id, query, total);
        }

        return {
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            },
            search: {
                query,
                resultsCount: total
            }
        };
    }

    // 记录搜索历史
    static async recordSearchHistory(userId, query, resultsCount) {
        const sql = 'INSERT INTO search_history (user_id, search_query, search_results_count) VALUES (?, ?, ?)';
        await db.query(sql, [userId, query, resultsCount]);
    }

    // 获取热门搜索
    static async getPopularSearches(limit = 10) {
        const sql = `
            SELECT search_query, COUNT(*) as search_count, AVG(search_results_count) as avg_results
            FROM search_history
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY search_query
            ORDER BY search_count DESC
            LIMIT ?
        `;

        return await db.query(sql, [limit]);
    }

    // 获取推荐产品
    static async getRecommendedProducts(userId = null, limit = 10, includeImages = false) {
        let sql;
        let params;

        if (userId) {
            // 基于用户购买历史的推荐
            sql = `
                SELECT p.*
                FROM products p
                WHERE p.id IN (
                    SELECT DISTINCT oi2.product_id
                    FROM orders o
                    JOIN order_items oi ON o.id = oi.order_id
                    JOIN order_items oi2 ON o.id = oi2.order_id
                    WHERE o.user_id = ? AND oi.product_id != oi2.product_id
                    LIMIT 50
                )
                AND p.is_active = TRUE
                AND p.stock_quantity > 0
                ORDER BY p.rating DESC, p.sold_count DESC
                LIMIT ?
            `;
            params = [userId, limit];
        } else {
            // 热门产品推荐
            sql = `
                SELECT *
                FROM product_details
                WHERE is_featured = TRUE
                AND stock_quantity > 0
                ORDER BY sold_count DESC, rating DESC
                LIMIT ?
            `;
            params = [limit];
        }

        const products = await db.query(sql, params);

        // 如果需要包含图片，为每个产品获取缩略图
        if (includeImages) {
            for (const product of products) {
                product.thumbnail = await ProductImage.getThumbnail(product.id);
            }
        }

        return products;
    }

    // 获取相关产品
    static async getRelatedProducts(productId, limit = 8, includeImages = false) {
        const product = await this.findById(productId);
        if (!product) return [];

        const sql = `
            SELECT *
            FROM product_details
            WHERE category_id = ?
            AND id != ?
            AND is_active = TRUE
            AND stock_quantity > 0
            ORDER BY is_featured DESC, sold_count DESC, rating DESC
            LIMIT ?
        `;

        const products = await db.query(sql, [product.category_id, productId, limit]);

        // 如果需要包含图片，为每个产品获取缩略图
        if (includeImages) {
            for (const product of products) {
                product.thumbnail = await ProductImage.getThumbnail(product.id);
            }
        }

        return products;
    }

    // 更新库存
    static async updateStock(productId, quantityChange) {
        const sql = 'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await db.query(sql, [quantityChange, productId]);

        // 检查库存是否不足
        const product = await this.findById(productId);
        if (product.stock_quantity < 0) {
            throw new Error(`产品 ${product.name} 库存不足`);
        }

        return product;
    }

    // 获取产品统计
    static async getStats() {
        const sql = `
            SELECT
                COUNT(*) as total_products,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_products,
                SUM(CASE WHEN is_featured = TRUE THEN 1 ELSE 0 END) as featured_products,
                SUM(CASE WHEN stock_quantity > 0 THEN 1 ELSE 0 END) as in_stock_products,
                SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_products,
                SUM(sold_count) as total_sold,
                AVG(price) as avg_price,
                MAX(price) as max_price,
                MIN(price) as min_price,
                SUM(stock_quantity * cost_price) as inventory_value
            FROM products
        `;

        const [stats] = await db.query(sql);

        // 按分类统计
        const categorySql = `
            SELECT
                c.name as category_name,
                COUNT(p.id) as product_count,
                SUM(p.sold_count) as total_sold,
                AVG(p.price) as avg_price
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = TRUE
            GROUP BY c.id, c.name
            ORDER BY product_count DESC
        `;

        const byCategory = await db.query(categorySql);

        return {
            overview: stats[0],
            byCategory
        };
    }

    // 批量更新产品
    static async bulkUpdate(updates) {
        return await db.transaction(async (connection) => {
            for (const update of updates) {
                const { id, ...updateData } = update;
                await connection.execute(
                    'UPDATE products SET ? WHERE id = ?',
                    [updateData, id]
                );
            }
            return true;
        });
    }

    // 检查SKU是否唯一
    static async isSkuUnique(sku, excludeId = null) {
        let sql = 'SELECT COUNT(*) as count FROM products WHERE sku = ?';
        const params = [sku];

        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }

        const [result] = await db.query(sql, params);
        return result[0].count === 0;
    }

    // 检查slug是否唯一
    static async isSlugUnique(slug, excludeId = null) {
        let sql = 'SELECT COUNT(*) as count FROM products WHERE slug = ?';
        const params = [slug];

        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }

        const [result] = await db.query(sql, params);
        return result[0].count === 0;
    }
}

module.exports = Product;