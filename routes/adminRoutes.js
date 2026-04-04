// 管理员路由
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

// 所有管理员路由都需要认证和admin权限
router.use(authenticate);
router.use(requireAdmin);

/**
 * 管理员仪表板统计
 */
router.get('/dashboard/stats', async (req, res) => {
    try {
        // 获取用户统计
        const userStats = await User.getStats();

        // 获取产品统计
        const productStats = await Product.getStats();

        // 获取订单统计
        const orderStats = await Order.getStats();

        // 获取销售统计
        const salesStats = await Order.getSalesStats();

        res.json({
            success: true,
            data: {
                users: userStats,
                products: productStats,
                orders: orderStats,
                sales: salesStats
            }
        });

    } catch (error) {
        console.error('获取仪表板统计错误:', error);
        res.status(500).json({
            success: false,
            message: '获取仪表板统计失败'
        });
    }
});

/**
 * 用户管理 - 获取用户列表
 */
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const role = req.query.role;
        const is_active = req.query.is_active;
        const search = req.query.search;

        const filters = {};
        if (role) filters.role = role;
        if (is_active !== undefined) filters.is_active = is_active === 'true';
        if (search) filters.search = search;

        const result = await User.findAll(page, limit, filters);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取用户列表失败'
        });
    }
});

/**
 * 用户管理 - 获取用户详情
 */
router.get('/users/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 获取用户订单统计
        const orderStats = await Order.getUserStats(userId);

        res.json({
            success: true,
            data: {
                user,
                orderStats
            }
        });

    } catch (error) {
        console.error('获取用户详情错误:', error);
        res.status(500).json({
            success: false,
            message: '获取用户详情失败'
        });
    }
});

/**
 * 用户管理 - 更新用户信息
 */
router.put('/users/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { full_name, phone, avatar_url, role, is_active } = req.body;

        const updateData = {};
        if (full_name !== undefined) updateData.full_name = full_name;
        if (phone !== undefined) updateData.phone = phone;
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
        if (role !== undefined) updateData.role = role;
        if (is_active !== undefined) updateData.is_active = is_active;

        const updatedUser = await User.update(userId, updateData);

        if (!updatedUser) {
            return res.status(400).json({
                success: false,
                message: '没有需要更新的信息'
            });
        }

        res.json({
            success: true,
            message: '用户信息更新成功',
            data: updatedUser
        });

    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '更新用户信息失败'
        });
    }
});

/**
 * 用户管理 - 删除用户（软删除）
 */
router.delete('/users/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        // 不能删除自己
        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: '不能删除自己的账户'
            });
        }

        await User.delete(userId);

        res.json({
            success: true,
            message: '用户已禁用'
        });

    } catch (error) {
        console.error('删除用户错误:', error);
        res.status(500).json({
            success: false,
            message: '删除用户失败'
        });
    }
});

/**
 * 产品管理 - 创建产品
 */
router.post('/products', async (req, res) => {
    try {
        const productData = req.body;
        const product = await Product.create(productData);

        res.status(201).json({
            success: true,
            message: '产品创建成功',
            data: product
        });

    } catch (error) {
        console.error('创建产品错误:', error);
        res.status(500).json({
            success: false,
            message: '创建产品失败'
        });
    }
});

/**
 * 产品管理 - 更新产品
 */
router.put('/products/:productId', async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const updateData = req.body;

        const updatedProduct = await Product.update(productId, updateData);

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: '产品不存在'
            });
        }

        res.json({
            success: true,
            message: '产品更新成功',
            data: updatedProduct
        });

    } catch (error) {
        console.error('更新产品错误:', error);
        res.status(500).json({
            success: false,
            message: '更新产品失败'
        });
    }
});

/**
 * 产品管理 - 删除产品（软删除）
 */
router.delete('/products/:productId', async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        await Product.delete(productId);

        res.json({
            success: true,
            message: '产品已下架'
        });

    } catch (error) {
        console.error('删除产品错误:', error);
        res.status(500).json({
            success: false,
            message: '删除产品失败'
        });
    }
});

/**
 * 产品管理 - 批量更新产品状态
 */
router.put('/products/batch/status', async (req, res) => {
    try {
        const { product_ids, is_active } = req.body;

        if (!Array.isArray(product_ids) || product_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: '请选择要操作的产品'
            });
        }

        if (is_active === undefined) {
            return res.status(400).json({
                success: false,
                message: '请指定状态'
            });
        }

        const result = await Product.batchUpdateStatus(product_ids, is_active);

        res.json({
            success: true,
            message: `已${is_active ? '上架' : '下架'} ${result.affectedRows} 个产品`,
            data: result
        });

    } catch (error) {
        console.error('批量更新产品状态错误:', error);
        res.status(500).json({
            success: false,
            message: '批量更新产品状态失败'
        });
    }
});

/**
 * 订单管理 - 获取所有订单
 */
router.get('/orders', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;

        const filters = {};
        if (status) filters.status = status;
        if (startDate) filters.start_date = startDate;
        if (endDate) filters.end_date = endDate;

        const result = await Order.findAll(page, limit, filters);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('获取订单列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取订单列表失败'
        });
    }
});

/**
 * 订单管理 - 更新订单状态
 */
router.put('/orders/:orderId/status', async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId);
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: '请指定订单状态'
            });
        }

        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: '无效的订单状态'
            });
        }

        const updatedOrder = await Order.updateStatus(orderId, status);

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        res.json({
            success: true,
            message: '订单状态更新成功',
            data: updatedOrder
        });

    } catch (error) {
        console.error('更新订单状态错误:', error);
        res.status(500).json({
            success: false,
            message: '更新订单状态失败'
        });
    }
});

/**
 * 订单管理 - 发货操作
 */
router.put('/orders/:orderId/ship', async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId);
        const { tracking_number, shipping_company } = req.body;

        const updatedOrder = await Order.ship(orderId, tracking_number, shipping_company);

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: '订单不存在或无法发货'
            });
        }

        res.json({
            success: true,
            message: '订单已发货',
            data: updatedOrder
        });

    } catch (error) {
        console.error('发货操作错误:', error);
        res.status(500).json({
            success: false,
            message: '发货操作失败'
        });
    }
});

/**
 * 获取管理员操作日志
 */
router.get('/logs', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const adminId = req.query.admin_id;
        const actionType = req.query.action_type;
        const startDate = req.query.start_date;
        const endDate = req.query.end_date;

        // 这里需要实现AdminLog模型来获取日志
        // 暂时返回空数据
        res.json({
            success: true,
            data: {
                logs: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0
                }
            }
        });

    } catch (error) {
        console.error('获取操作日志错误:', error);
        res.status(500).json({
            success: false,
            message: '获取操作日志失败'
        });
    }
});

module.exports = router;