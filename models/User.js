// 用户模型
const bcrypt = require('bcrypt');
const { db } = require('../database/connection');

class User {
    // 创建用户
    static async create(userData) {
        const {
            username,
            email,
            password,
            full_name,
            phone,
            avatar_url,
            role = 'customer'
        } = userData;

        // 密码加密
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const sql = `
            INSERT INTO users (username, email, password_hash, full_name, phone, avatar_url, role)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [username, email, passwordHash, full_name, phone, avatar_url, role];
        const result = await db.query(sql, params);

        return {
            id: result.insertId,
            username,
            email,
            full_name,
            phone,
            avatar_url,
            role,
            is_active: true
        };
    }

    // 根据ID查找用户
    static async findById(id) {
        const sql = 'SELECT * FROM users WHERE id = ?';
        const [users] = await db.query(sql, [id]);
        return users[0] || null;
    }

    // 根据用户名查找
    static async findByUsername(username) {
        const sql = 'SELECT * FROM users WHERE username = ?';
        const [users] = await db.query(sql, [username]);
        return users[0] || null;
    }

    // 根据邮箱查找
    static async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [users] = await db.query(sql, [email]);
        return users[0] || null;
    }

    // 验证密码
    static async verifyPassword(user, password) {
        return await bcrypt.compare(password, user.password_hash);
    }

    // 更新用户信息
    static async update(id, updateData) {
        const allowedFields = ['full_name', 'phone', 'avatar_url', 'is_active'];
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
        const sql = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

        await db.query(sql, params);
        return await this.findById(id);
    }

    // 更新密码
    static async updatePassword(id, newPassword) {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        const sql = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await db.query(sql, [passwordHash, id]);
        return true;
    }

    // 删除用户（软删除）
    static async delete(id) {
        const sql = 'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await db.query(sql, [id]);
        return true;
    }

    // 获取用户列表（分页）
    static async findAll(page = 1, limit = 20, filters = {}) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (filters.role) {
            whereClause += ' AND role = ?';
            params.push(filters.role);
        }

        if (filters.is_active !== undefined) {
            whereClause += ' AND is_active = ?';
            params.push(filters.is_active);
        }

        if (filters.search) {
            whereClause += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // 获取总数
        const countSql = `SELECT COUNT(*) as total FROM users ${whereClause}`;
        const [countResult] = await db.query(countSql, params);
        const total = countResult[0].total;

        // 获取数据
        const dataSql = `
            SELECT id, username, email, full_name, phone, avatar_url, role, is_active, created_at, updated_at
            FROM users ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...params, limit, offset];
        const users = await db.query(dataSql, dataParams);

        return {
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 获取用户统计信息
    static async getStats() {
        const sql = `
            SELECT
                COUNT(*) as total_users,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
                SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END) as customer_count,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as inactive_users,
                DATE(created_at) as date,
                COUNT(*) as daily_registrations
            FROM users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `;

        const stats = await db.query(sql);

        // 计算增长率
        let growthRate = 0;
        if (stats.length >= 2) {
            const today = stats[0].daily_registrations;
            const yesterday = stats[1].daily_registrations;
            growthRate = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : 100;
        }

        return {
            total: stats.reduce((sum, item) => sum + item.daily_registrations, 0),
            byRole: {
                admin: stats.reduce((sum, item) => sum + (item.role === 'admin' ? item.daily_registrations : 0), 0),
                customer: stats.reduce((sum, item) => sum + (item.role === 'customer' ? item.daily_registrations : 0), 0)
            },
            byStatus: {
                active: stats.reduce((sum, item) => sum + (item.is_active ? item.daily_registrations : 0), 0),
                inactive: stats.reduce((sum, item) => sum + (!item.is_active ? item.daily_registrations : 0), 0)
            },
            dailyRegistrations: stats,
            growthRate: growthRate.toFixed(2)
        };
    }

    // 验证用户是否存在
    static async exists(username, email) {
        const sql = 'SELECT COUNT(*) as count FROM users WHERE username = ? OR email = ?';
        const [result] = await db.query(sql, [username, email]);
        return result[0].count > 0;
    }

    // 获取用户购物车
    static async getCart(userId) {
        const sql = `
            SELECT
                c.id as cart_id,
                ci.id as item_id,
                ci.product_id,
                p.name as product_name,
                p.slug as product_slug,
                pi.image_url as product_image,
                ci.quantity,
                ci.price_at_add as price,
                p.stock_quantity as stock,
                (ci.quantity * ci.price_at_add) as item_total
            FROM carts c
            LEFT JOIN cart_items ci ON c.id = ci.cart_id
            LEFT JOIN products p ON ci.product_id = p.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
            WHERE c.user_id = ?
            ORDER BY ci.created_at DESC
        `;

        const items = await db.query(sql, [userId]);

        // 计算购物车总计
        const total = items.reduce((sum, item) => sum + (item.item_total || 0), 0);
        const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

        return {
            items,
            summary: {
                itemCount,
                total: parseFloat(total.toFixed(2)),
                formattedTotal: `¥${total.toFixed(2)}`
            }
        };
    }

    // 获取用户订单
    static async getOrders(userId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;

        const sql = `
            SELECT
                o.*,
                COUNT(oi.id) as item_count,
                SUM(oi.quantity) as total_quantity
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const orders = await db.query(sql, [userId, limit, offset]);

        // 获取订单总数
        const countSql = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
        const [countResult] = await db.query(countSql, [userId]);
        const total = countResult[0].total;

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
}

module.exports = User;