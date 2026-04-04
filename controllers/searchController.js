// 蓝牙耳机搜索控制器
const { db } = require('../database/connection');
const Product = require('../models/Product');

class SearchController {
    /**
     * 高级搜索API
     * 支持关键词搜索、多条件筛选、排序和分页
     */
    static async advancedSearch(req, res) {
        try {
            const {
                q = '', // 搜索关键词
                page = 1,
                limit = 20,
                // 价格筛选
                min_price,
                max_price,
                // 品牌筛选
                brand,
                // 分类筛选
                category_id,
                category_slug,
                // 蓝牙耳机专用筛选
                bluetooth_version,
                noise_cancellation_type,
                waterproof_rating,
                battery_life_min,
                battery_life_max,
                usage_scenario,
                // 排序
                sort = 'relevance', // relevance, price_asc, price_desc, sales, rating, newest
                // 其他筛选
                in_stock,
                is_featured,
                // 高级搜索选项
                search_fields = 'all', // all, name, description, brand, specs
                match_type = 'fuzzy' // fuzzy, exact
            } = req.query;

            const offset = (page - 1) * limit;
            let whereClause = 'WHERE p.is_active = TRUE';
            const params = [];

            // 关键词搜索
            if (q && q.trim()) {
                const searchTerm = match_type === 'exact' ? q.trim() : `%${q.trim()}%`;

                if (search_fields === 'all') {
                    // 在所有字段中搜索
                    whereClause += ` AND (
                        p.name LIKE ? OR
                        p.description LIKE ? OR
                        p.short_description LIKE ? OR
                        p.brand LIKE ? OR
                        JSON_UNQUOTE(JSON_EXTRACT(p.specs, '$."蓝牙版本"')) LIKE ? OR
                        JSON_UNQUOTE(JSON_EXTRACT(p.specs, '$."降噪类型"')) LIKE ? OR
                        JSON_UNQUOTE(JSON_EXTRACT(p.specs, '$."适用场景"')) LIKE ?
                    )`;
                    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
                } else if (search_fields === 'name') {
                    whereClause += ' AND p.name LIKE ?';
                    params.push(searchTerm);
                } else if (search_fields === 'description') {
                    whereClause += ' AND (p.description LIKE ? OR p.short_description LIKE ?)';
                    params.push(searchTerm, searchTerm);
                } else if (search_fields === 'brand') {
                    whereClause += ' AND p.brand LIKE ?';
                    params.push(searchTerm);
                } else if (search_fields === 'specs') {
                    // 在规格参数中搜索
                    whereClause += ` AND (
                        JSON_UNQUOTE(JSON_EXTRACT(p.specs, '$."蓝牙版本"')) LIKE ? OR
                        JSON_UNQUOTE(JSON_EXTRACT(p.specs, '$."降噪类型"')) LIKE ? OR
                        JSON_UNQUOTE(JSON_EXTRACT(p.specs, '$."适用场景"')) LIKE ? OR
                        JSON_UNQUOTE(JSON_EXTRACT(p.specs, '$."驱动单元"')) LIKE ?
                    )`;
                    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
                }
            }

            // 价格筛选
            if (min_price !== undefined) {
                whereClause += ' AND p.price >= ?';
                params.push(parseFloat(min_price));
            }
            if (max_price !== undefined) {
                whereClause += ' AND p.price <= ?';
                params.push(parseFloat(max_price));
            }

            // 品牌筛选
            if (brand) {
                whereClause += ' AND p.brand = ?';
                params.push(brand);
            }

            // 分类筛选
            if (category_id) {
                whereClause += ' AND p.category_id = ?';
                params.push(parseInt(category_id));
            }
            if (category_slug) {
                whereClause += ' AND c.slug = ?';
                params.push(category_slug);
            }

            // 蓝牙版本筛选
            if (bluetooth_version) {
                whereClause += ' AND JSON_UNQUOTE(JSON_EXTRACT(p.specs, \'$."蓝牙版本"\')) = ?';
                params.push(bluetooth_version);
            }

            // 降噪类型筛选
            if (noise_cancellation_type) {
                whereClause += ' AND JSON_UNQUOTE(JSON_EXTRACT(p.specs, \'$."降噪类型"\')) LIKE ?';
                params.push(`%${noise_cancellation_type}%`);
            }

            // 防水等级筛选
            if (waterproof_rating) {
                whereClause += ' AND JSON_UNQUOTE(JSON_EXTRACT(p.specs, \'$."防水等级"\')) LIKE ?';
                params.push(`%${waterproof_rating}%`);
            }

            // 电池续航筛选
            if (battery_life_min !== undefined) {
                whereClause += ' AND CAST(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(p.specs, \'$."电池续航"\')), \'小时\', 1) AS UNSIGNED) >= ?';
                params.push(parseInt(battery_life_min));
            }
            if (battery_life_max !== undefined) {
                whereClause += ' AND CAST(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(p.specs, \'$."电池续航"\')), \'小时\', 1) AS UNSIGNED) <= ?';
                params.push(parseInt(battery_life_max));
            }

            // 适用场景筛选
            if (usage_scenario) {
                whereClause += ' AND JSON_UNQUOTE(JSON_EXTRACT(p.specs, \'$."适用场景"\')) LIKE ?';
                params.push(`%${usage_scenario}%`);
            }

            // 库存筛选
            if (in_stock !== undefined) {
                if (in_stock === 'true' || in_stock === true) {
                    whereClause += ' AND p.stock_quantity > 0';
                } else {
                    whereClause += ' AND p.stock_quantity <= 0';
                }
            }

            // 特色产品筛选
            if (is_featured !== undefined) {
                whereClause += ' AND p.is_featured = ?';
                params.push(is_featured === 'true' || is_featured === true ? 1 : 0);
            }

            // 排序逻辑
            let orderBy = '';
            switch (sort) {
                case 'relevance':
                    if (q && q.trim()) {
                        orderBy = `
                            CASE
                                WHEN p.name LIKE ? THEN 5
                                WHEN p.short_description LIKE ? THEN 4
                                WHEN p.description LIKE ? THEN 3
                                WHEN p.brand LIKE ? THEN 2
                                ELSE 1
                            END DESC,
                            p.sold_count DESC,
                            p.rating DESC
                        `;
                        const searchTerm = `%${q.trim()}%`;
                        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
                    } else {
                        orderBy = 'p.sold_count DESC, p.rating DESC, p.created_at DESC';
                    }
                    break;
                case 'price_asc':
                    orderBy = 'p.price ASC';
                    break;
                case 'price_desc':
                    orderBy = 'p.price DESC';
                    break;
                case 'sales':
                    orderBy = 'p.sold_count DESC';
                    break;
                case 'rating':
                    orderBy = 'p.rating DESC, p.review_count DESC';
                    break;
                case 'newest':
                    orderBy = 'p.created_at DESC';
                    break;
                default:
                    orderBy = 'p.created_at DESC';
            }

            // 获取总数
            const countSql = `
                SELECT COUNT(*) as total
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                ${whereClause}
            `;
            const [countResult] = await db.query(countSql, params);
            const total = countResult[0].total;

            // 获取数据
            const dataSql = `
                SELECT
                    p.*,
                    c.name as category_name,
                    c.slug as category_slug,
                    (SELECT image_url FROM product_images WHERE product_id = p.id AND image_type = 'main' LIMIT 1) as thumbnail
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                ${whereClause}
                ORDER BY ${orderBy}
                LIMIT ? OFFSET ?
            `;

            const dataParams = [...params, parseInt(limit), offset];
            const products = await db.query(dataSql, dataParams);

            // 解析规格参数
            products.forEach(product => {
                if (product.specs) {
                    try {
                        product.specs = JSON.parse(product.specs);
                    } catch (e) {
                        product.specs = {};
                    }
                }
            });

            // 记录搜索历史（如果有用户ID）
            if (req.user && q && q.trim()) {
                await Product.recordSearchHistory(req.user.id, q, total);
            }

            res.json({
                success: true,
                data: {
                    products,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    },
                    search: {
                        query: q,
                        resultsCount: total,
                        filters: {
                            price: { min: min_price, max: max_price },
                            brand,
                            category: { id: category_id, slug: category_slug },
                            bluetooth_version,
                            noise_cancellation_type,
                            waterproof_rating,
                            battery_life: { min: battery_life_min, max: battery_life_max },
                            usage_scenario,
                            in_stock,
                            is_featured
                        },
                        sort,
                        search_fields,
                        match_type
                    }
                }
            });

        } catch (error) {
            console.error('高级搜索错误:', error);
            res.status(500).json({
                success: false,
                message: '搜索失败',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * 搜索建议/自动完成
     */
    static async searchSuggestions(req, res) {
        try {
            const { q = '', limit = 10 } = req.query;

            if (!q || q.trim().length < 2) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const searchTerm = `%${q.trim()}%`;

            // 搜索产品名称
            const productSql = `
                SELECT DISTINCT name as text, 'product' as type, id as product_id
                FROM products
                WHERE name LIKE ? AND is_active = TRUE
                LIMIT ?
            `;

            // 搜索品牌
            const brandSql = `
                SELECT DISTINCT brand as text, 'brand' as type, NULL as product_id
                FROM products
                WHERE brand LIKE ? AND is_active = TRUE
                LIMIT ?
            `;

            // 搜索分类
            const categorySql = `
                SELECT DISTINCT c.name as text, 'category' as type, c.id as category_id
                FROM categories c
                JOIN products p ON c.id = p.category_id
                WHERE c.name LIKE ? AND p.is_active = TRUE
                LIMIT ?
            `;

            // 搜索规格关键词
            const specsSql = `
                SELECT DISTINCT
                    CASE
                        WHEN JSON_UNQUOTE(JSON_EXTRACT(specs, '$."降噪类型"')) LIKE ? THEN '降噪耳机'
                        WHEN JSON_UNQUOTE(JSON_EXTRACT(specs, '$."防水等级"')) LIKE '%IPX7%' THEN '防水耳机'
                        WHEN JSON_UNQUOTE(JSON_EXTRACT(specs, '$."适用场景"')) LIKE '%运动%' THEN '运动耳机'
                        WHEN JSON_UNQUOTE(JSON_EXTRACT(specs, '$."适用场景"')) LIKE '%游戏%' THEN '游戏耳机'
                        WHEN JSON_UNQUOTE(JSON_EXTRACT(specs, '$."适用场景"')) LIKE '%商务%' THEN '商务耳机'
                        ELSE NULL
                    END as text,
                    'keyword' as type,
                    NULL as product_id
                FROM products
                WHERE (
                    JSON_UNQUOTE(JSON_EXTRACT(specs, '$."降噪类型"')) LIKE ? OR
                    JSON_UNQUOTE(JSON_EXTRACT(specs, '$."防水等级"')) LIKE ? OR
                    JSON_UNQUOTE(JSON_EXTRACT(specs, '$."适用场景"')) LIKE ?
                ) AND is_active = TRUE
                LIMIT ?
            `;

            const [products, brands, categories, keywords] = await Promise.all([
                db.query(productSql, [searchTerm, limit]),
                db.query(brandSql, [searchTerm, limit]),
                db.query(categorySql, [searchTerm, limit]),
                db.query(specsSql, [searchTerm, searchTerm, searchTerm, searchTerm, limit])
            ]);

            // 合并结果并去重
            const suggestions = [
                ...products.map(p => ({ ...p, score: 4 })),
                ...brands.map(b => ({ ...b, score: 3 })),
                ...categories.map(c => ({ ...c, score: 2 })),
                ...keywords.filter(k => k.text).map(k => ({ ...k, score: 1 }))
            ];

            // 按相关性排序
            suggestions.sort((a, b) => b.score - a.score);

            // 去重
            const uniqueSuggestions = [];
            const seen = new Set();
            for (const suggestion of suggestions) {
                const key = `${suggestion.text}-${suggestion.type}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueSuggestions.push(suggestion);
                }
                if (uniqueSuggestions.length >= limit) break;
            }

            res.json({
                success: true,
                data: uniqueSuggestions
            });

        } catch (error) {
            console.error('搜索建议错误:', error);
            res.status(500).json({
                success: false,
                message: '获取搜索建议失败'
            });
        }
    }

    /**
     * 获取热门搜索
     */
    static async getPopularSearches(req, res) {
        try {
            const { limit = 10, days = 7 } = req.query;

            const sql = `
                SELECT
                    search_query,
                    COUNT(*) as search_count,
                    AVG(search_results_count) as avg_results,
                    MAX(created_at) as last_searched
                FROM search_history
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY search_query
                ORDER BY search_count DESC
                LIMIT ?
            `;

            const popularSearches = await db.query(sql, [parseInt(days), parseInt(limit)]);

            res.json({
                success: true,
                data: popularSearches
            });

        } catch (error) {
            console.error('获取热门搜索错误:', error);
            res.status(500).json({
                success: false,
                message: '获取热门搜索失败'
            });
        }
    }

    /**
     * 获取筛选选项（用于前端筛选器）
     */
    static async getFilterOptions(req, res) {
        try {
            // 获取品牌列表
            const brandSql = `
                SELECT DISTINCT brand, COUNT(*) as product_count
                FROM products
                WHERE is_active = TRUE AND brand IS NOT NULL
                GROUP BY brand
                ORDER BY product_count DESC
            `;

            // 获取价格范围
            const priceSql = `
                SELECT
                    MIN(price) as min_price,
                    MAX(price) as max_price,
                    AVG(price) as avg_price
                FROM products
                WHERE is_active = TRUE
            `;

            // 获取蓝牙版本选项
            const bluetoothSql = `
                SELECT DISTINCT
                    JSON_UNQUOTE(JSON_EXTRACT(specs, '$."蓝牙版本"')) as version,
                    COUNT(*) as product_count
                FROM products
                WHERE is_active = TRUE
                    AND JSON_UNQUOTE(JSON_EXTRACT(specs, '$."蓝牙版本"')) IS NOT NULL
                GROUP BY JSON_UNQUOTE(JSON_EXTRACT(specs, '$."蓝牙版本"'))
                ORDER BY version DESC
            `;

            // 获取降噪类型选项
            const noiseCancellationSql = `
                SELECT DISTINCT
                    CASE
                        WHEN JSON_UNQUOTE(JSON_EXTRACT(specs, '$."降噪类型"')) LIKE '%主动降噪%' THEN '主动降噪'
                        WHEN JSON_UNQUOTE(JSON_EXTRACT(specs, '$."降噪类型"')) LIKE '%ENC%' THEN '通话降噪'
                        WHEN JSON_UNQUOTE(JSON_EXTRACT(specs, '$."降噪类型"')) LIKE '%被动降噪%' THEN '被动降噪'
                        WHEN JSON_UNQUOTE(JSON_EXTRACT(specs, '$."降噪类型"')) LIKE '%无降噪%' THEN '无降噪'
                        ELSE '其他'
                    END as type,
                    COUNT(*) as product_count
                FROM products
                WHERE is_active = TRUE
                    AND JSON_UNQUOTE(JSON_EXTRACT(specs, '$."降噪类型"')) IS NOT NULL
                GROUP BY type
                ORDER BY product_count DESC
            `;

            // 获取防水等级选项
            const waterproofSql = `
                SELECT DISTINCT
                    JSON_UNQUOTE(JSON_EXTRACT(specs, '$."防水等级"')) as rating,
                    COUNT(*) as product_count
                FROM products
                WHERE is_active = TRUE
                    AND JSON_UNQUOTE(JSON_EXTRACT(specs, '$."防水等级"')) IS NOT NULL
                GROUP BY JSON_UNQUOTE(JSON_EXTRACT(specs, '$."防水等级"'))
                ORDER BY
                    CASE
                        WHEN rating LIKE '%IPX8%' THEN 1
                        WHEN rating LIKE '%IPX7%' THEN 2
                        WHEN rating LIKE '%IPX6%' THEN 3
                        WHEN rating LIKE '%IPX5%' THEN 4
                        WHEN rating LIKE '%IPX4%' THEN 5
                        ELSE 6
                    END
            `;

            // 获取适用场景选项
            const usageScenarioSql = `
                SELECT DISTINCT
                    TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(specs, '$."适用场景"')), '、', numbers.n), '、', -1)) as scenario,
                    COUNT(*) as product_count
                FROM products
                CROSS JOIN (
                    SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
                ) numbers
                WHERE is_active = TRUE
                    AND JSON_UNQUOTE(JSON_EXTRACT(specs, '$."适用场景"')) IS NOT NULL
                    AND CHAR_LENGTH(JSON_UNQUOTE(JSON_EXTRACT(specs, '$."适用场景"')))-CHAR_LENGTH(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(specs, '$."适用场景"')), '、', '')) >= numbers.n-1
                GROUP BY scenario
                ORDER BY product_count DESC
            `;

            // 获取电池续航范围
            const batteryLifeSql = `
                SELECT
                    MIN(CAST(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(specs, '$."电池续航"')), '小时', 1) AS UNSIGNED)) as min_hours,
                    MAX(CAST(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(specs, '$."电池续航"')), '小时', 1) AS UNSIGNED)) as max_hours,
                    AVG(CAST(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(specs, '$."电池续航"')), '小时', 1) AS UNSIGNED)) as avg_hours
                FROM products
                WHERE is_active = TRUE
                    AND JSON_UNQUOTE(JSON_EXTRACT(specs, '$."电池续航"')) IS NOT NULL
                    AND JSON_UNQUOTE(JSON_EXTRACT(specs, '$."电池续航"')) REGEXP '^[0-9]+小时'
            `;

            const [
                brands,
                priceRange,
                bluetoothVersions,
                noiseCancellationTypes,
                waterproofRatings,
                usageScenarios,
                batteryLifeRange
            ] = await Promise.all([
                db.query(brandSql),
                db.query(priceSql),
                db.query(bluetoothSql),
                db.query(noiseCancellationSql),
                db.query(waterproofSql),
                db.query(usageScenarioSql),
                db.query(batteryLifeSql)
            ]);

            res.json({
                success: true,
                data: {
                    brands: brands.filter(b => b.brand),
                    priceRange: priceRange[0] || { min_price: 0, max_price: 0, avg_price: 0 },
                    bluetoothVersions: bluetoothVersions.filter(v => v.version),
                    noiseCancellationTypes: noiseCancellationTypes.filter(t => t.type),
                    waterproofRatings: waterproofRatings.filter(r => r.rating),
                    usageScenarios: usageScenarios.filter(s => s.scenario),
                    batteryLifeRange: batteryLifeRange[0] || { min_hours: 0, max_hours: 0, avg_hours: 0 }
                }
            });

        } catch (error) {
            console.error('获取筛选选项错误:', error);
            res.status(500).json({
                success: false,
                message: '获取筛选选项失败',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * 获取搜索历史（需要用户登录）
     */
    static async getSearchHistory(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: '需要登录'
                });
            }

            const { limit = 20 } = req.query;

            const sql = `
                SELECT
                    search_query,
                    search_results_count,
                    created_at
                FROM search_history
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            `;

            const history = await db.query(sql, [req.user.id, parseInt(limit)]);

            res.json({
                success: true,
                data: history
            });

        } catch (error) {
            console.error('获取搜索历史错误:', error);
            res.status(500).json({
                success: false,
                message: '获取搜索历史失败'
            });
        }
    }

    /**
     * 清除搜索历史（需要用户登录）
     */
    static async clearSearchHistory(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: '需要登录'
                });
            }

            const sql = 'DELETE FROM search_history WHERE user_id = ?';
            await db.query(sql, [req.user.id]);

            res.json({
                success: true,
                message: '搜索历史已清除'
            });

        } catch (error) {
            console.error('清除搜索历史错误:', error);
            res.status(500).json({
                success: false,
                message: '清除搜索历史失败'
            });
        }
    }
}

module.exports = SearchController;