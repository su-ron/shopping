// 支付路由
const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

/**
 * 创建支付（需要认证）
 * POST /api/payments/create
 * Body: { order_id, payment_method }
 */
router.post('/create', authenticate, PaymentController.createPayment);

/**
 * 获取支付二维码（需要认证）
 * GET /api/payments/:payment_id/qrcode
 */
router.get('/:payment_id/qrcode', authenticate, PaymentController.getQrCode);

/**
 * 查询支付状态（需要认证）
 * GET /api/payments/:payment_id/status
 */
router.get('/:payment_id/status', authenticate, PaymentController.getPaymentStatus);

/**
 * 获取用户支付记录（需要认证）
 * GET /api/payments/user
 * Query: page, limit, status, payment_method, start_date, end_date
 */
router.get('/user', authenticate, PaymentController.getUserPayments);

/**
 * 退款申请（需要认证）
 * POST /api/payments/refund
 * Body: { payment_id, refund_amount, refund_reason }
 */
router.post('/refund', authenticate, PaymentController.requestRefund);

/**
 * 支付宝回调接口（不需要认证）
 * GET/POST /api/payments/callback/alipay
 */
router.all('/callback/alipay', PaymentController.alipayCallback);

/**
 * 微信支付回调接口（不需要认证）
 * POST /api/payments/callback/wechat
 */
router.post('/callback/wechat', PaymentController.wechatCallback);

/**
 * 清理过期支付记录（需要管理员权限）
 * POST /api/payments/cleanup-expired
 */
router.post('/cleanup-expired', authenticate, PaymentController.cleanupExpired);

/**
 * 获取支付统计（需要管理员权限）
 * GET /api/payments/stats
 * Query: time_range (day/week/month/year), payment_method
 */
router.get('/stats', authenticate, PaymentController.getPaymentStats);

/**
 * 模拟支付成功（仅开发环境使用）
 * POST /api/payments/simulate
 * Body: { payment_id }
 */
router.post('/simulate', authenticate, PaymentController.simulatePayment);

module.exports = router;