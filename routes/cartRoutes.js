// 购物车路由
const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const { authenticate } = require('../middleware/auth');

/**
 * 获取购物车（需要认证）
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.getByUserId(userId);

        res.json({
            success: true,
            data: cart
        });

    } catch (error) {
        console.error('获取购物车错误:', error);
        res.status(500).json({
            success: false,
            message: '获取购物车失败'
        });
    }
});

/**
 * 添加商品到购物车（需要认证）
 */
router.post('/add', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { product_id, quantity = 1, sku_id } = req.body;

        // 验证参数
        if (!product_id) {
            return res.status(400).json({
                success: false,
                message: '产品ID是必填项'
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: '数量必须大于0'
            });
        }

        const result = await Cart.addItem(userId, product_id, quantity, sku_id);

        res.json({
            success: true,
            message: '商品已添加到购物车',
            data: result
        });

    } catch (error) {
        console.error('添加购物车商品错误:', error);

        if (error.message.includes('库存不足')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: '添加商品到购物车失败'
        });
    }
});

/**
 * 更新购物车商品数量（需要认证）
 */
router.put('/item/:itemId', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const itemId = parseInt(req.params.itemId);
        const { quantity } = req.body;

        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: '数量必须大于0'
            });
        }

        const result = await Cart.updateItem(userId, itemId, quantity);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: '购物车商品不存在'
            });
        }

        res.json({
            success: true,
            message: '购物车商品已更新',
            data: result
        });

    } catch (error) {
        console.error('更新购物车商品错误:', error);

        if (error.message.includes('库存不足')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: '更新购物车商品失败'
        });
    }
});

/**
 * 从购物车移除商品（需要认证）
 */
router.delete('/item/:itemId', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const itemId = parseInt(req.params.itemId);

        const success = await Cart.removeItem(userId, itemId);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: '购物车商品不存在'
            });
        }

        res.json({
            success: true,
            message: '商品已从购物车移除'
        });

    } catch (error) {
        console.error('移除购物车商品错误:', error);
        res.status(500).json({
            success: false,
            message: '移除购物车商品失败'
        });
    }
});

/**
 * 清空购物车（需要认证）
 */
router.delete('/clear', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        await Cart.clear(userId);

        res.json({
            success: true,
            message: '购物车已清空'
        });

    } catch (error) {
        console.error('清空购物车错误:', error);
        res.status(500).json({
            success: false,
            message: '清空购物车失败'
        });
    }
});

/**
 * 获取购物车商品数量（需要认证）
 */
router.get('/count', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await Cart.getItemCount(userId);

        res.json({
            success: true,
            data: { count }
        });

    } catch (error) {
        console.error('获取购物车数量错误:', error);
        res.status(500).json({
            success: false,
            message: '获取购物车数量失败'
        });
    }
});

/**
 * 合并游客购物车（登录时调用）
 */
router.post('/merge', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { guestCart } = req.body; // 游客购物车数据

        if (!guestCart || !Array.isArray(guestCart)) {
            return res.status(400).json({
                success: false,
                message: '无效的游客购物车数据'
            });
        }

        const result = await Cart.mergeGuestCart(userId, guestCart);

        res.json({
            success: true,
            message: '购物车合并成功',
            data: result
        });

    } catch (error) {
        console.error('合并购物车错误:', error);
        res.status(500).json({
            success: false,
            message: '合并购物车失败'
        });
    }
});

module.exports = router;