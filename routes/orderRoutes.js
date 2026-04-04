// 订单路由
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { authenticate } = require('../middleware/auth');

/**
 * 创建订单（需要认证）
 */
router.post('/create', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            shipping_address,
            billing_address,
            customer_name,
            customer_email,
            customer_phone,
            notes,
            cart_items
        } = req.body;

        // 验证必填字段
        if (!shipping_address || !customer_name || !customer_phone) {
            return res.status(400).json({
                success: false,
                message: '收货地址、收货人姓名和电话是必填项'
            });
        }

        // 如果没有提供购物车商品，使用用户的购物车
        let items = cart_items;
        if (!items || !Array.isArray(items) || items.length === 0) {
            // 从用户购物车获取商品
            const Cart = require('../models/Cart');
            const cart = await Cart.getByUserId(userId);
            items = cart.items.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price
            }));
        }

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: '购物车为空，无法创建订单'
            });
        }

        // 创建订单
        const orderData = {
            user_id: userId,
            shipping_address,
            billing_address: billing_address || shipping_address,
            customer_name,
            customer_email: customer_email || req.user.email,
            customer_phone,
            notes,
            items
        };

        const order = await Order.create(orderData);

        // 清空购物车
        const Cart = require('../models/Cart');
        await Cart.clear(userId);

        res.status(201).json({
            success: true,
            message: '订单创建成功',
            data: order
        });

    } catch (error) {
        console.error('创建订单错误:', error);

        if (error.message.includes('库存不足')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: '创建订单失败'
        });
    }
});

/**
 * 获取用户订单列表（需要认证）
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status; // 可选：按状态筛选

        const result = await Order.findByUserId(userId, page, limit, status);

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
 * 获取订单详情（需要认证）
 */
router.get('/:orderId', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const orderId = parseInt(req.params.orderId);

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        // 检查订单是否属于当前用户
        if (order.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权访问此订单'
            });
        }

        // 获取订单商品
        const items = await Order.getItems(orderId);

        res.json({
            success: true,
            data: {
                order,
                items
            }
        });

    } catch (error) {
        console.error('获取订单详情错误:', error);
        res.status(500).json({
            success: false,
            message: '获取订单详情失败'
        });
    }
});

/**
 * 取消订单（需要认证）
 */
router.put('/:orderId/cancel', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const orderId = parseInt(req.params.orderId);

        // 检查订单是否存在且属于当前用户
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        if (order.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权取消此订单'
            });
        }

        // 检查订单状态是否可以取消
        if (!['pending', 'processing'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: '当前订单状态无法取消'
            });
        }

        const updatedOrder = await Order.cancel(orderId);

        res.json({
            success: true,
            message: '订单已取消',
            data: updatedOrder
        });

    } catch (error) {
        console.error('取消订单错误:', error);
        res.status(500).json({
            success: false,
            message: '取消订单失败'
        });
    }
});

/**
 * 确认收货（需要认证）
 */
router.put('/:orderId/confirm-delivery', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const orderId = parseInt(req.params.orderId);

        // 检查订单是否存在且属于当前用户
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单不存在'
            });
        }

        if (order.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: '无权确认此订单收货'
            });
        }

        // 检查订单状态是否可以确认收货
        if (order.status !== 'shipped') {
            return res.status(400).json({
                success: false,
                message: '订单未发货，无法确认收货'
            });
        }

        const updatedOrder = await Order.confirmDelivery(orderId);

        res.json({
            success: true,
            message: '已确认收货',
            data: updatedOrder
        });

    } catch (error) {
        console.error('确认收货错误:', error);
        res.status(500).json({
            success: false,
            message: '确认收货失败'
        });
    }
});

/**
 * 获取订单统计（需要认证）
 */
router.get('/stats/summary', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await Order.getUserStats(userId);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('获取订单统计错误:', error);
        res.status(500).json({
            success: false,
            message: '获取订单统计失败'
        });
    }
});

module.exports = router;