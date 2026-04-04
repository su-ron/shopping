// 支付控制器
const Payment = require('../models/Payment');
const Order = require('../models/Order');

class PaymentController {
    /**
     * 创建支付
     */
    static async createPayment(req, res) {
        try {
            const userId = req.user.id;
            const { order_id, payment_method } = req.body;

            // 验证必填字段
            if (!order_id || !payment_method) {
                return res.status(400).json({
                    success: false,
                    message: '订单ID和支付方式是必填项'
                });
            }

            // 验证支付方式
            const allowedMethods = ['alipay', 'wechat'];
            if (!allowedMethods.includes(payment_method)) {
                return res.status(400).json({
                    success: false,
                    message: '不支持的支付方式，请选择支付宝(alipay)或微信(wechat)'
                });
            }

            // 获取订单信息
            const order = await Order.findById(order_id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: '订单不存在'
                });
            }

            // 验证订单是否属于当前用户
            if (order.user_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '无权为此订单创建支付'
                });
            }

            // 检查订单状态
            if (order.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `订单状态为 ${order.status}，无法支付`
                });
            }

            // 检查是否已有支付记录
            const existingPayments = await Payment.findByOrderId(order_id);
            const pendingPayment = existingPayments.find(p => p.status === 'pending');

            if (pendingPayment) {
                // 返回已有的待支付记录
                const qrCodeInfo = await Payment.getQrCodeUrl(pendingPayment.id, payment_method);

                return res.json({
                    success: true,
                    message: '已有待支付记录',
                    data: {
                        payment: pendingPayment,
                        qr_code: qrCodeInfo
                    }
                });
            }

            // 创建支付记录
            const paymentData = {
                order_id,
                payment_method,
                amount: order.total_amount,
                user_id: userId
            };

            const payment = await Payment.create(paymentData);

            // 获取二维码信息
            const qrCodeInfo = await Payment.getQrCodeUrl(payment.id, payment_method);

            res.status(201).json({
                success: true,
                message: '支付创建成功',
                data: {
                    payment,
                    qr_code: qrCodeInfo
                }
            });

        } catch (error) {
            console.error('创建支付错误:', error);
            res.status(500).json({
                success: false,
                message: '创建支付失败'
            });
        }
    }

    /**
     * 获取支付二维码
     */
    static async getQrCode(req, res) {
        try {
            const userId = req.user.id;
            const { payment_id } = req.params;

            // 获取支付记录
            const payment = await Payment.findById(payment_id);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: '支付记录不存在'
                });
            }

            // 验证支付记录是否属于当前用户
            if (payment.user_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '无权访问此支付记录'
                });
            }

            // 检查支付状态
            if (payment.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `支付状态为 ${payment.status}，无法获取二维码`
                });
            }

            // 获取二维码信息
            const qrCodeInfo = await Payment.getQrCodeUrl(payment_id, payment.payment_method);

            res.json({
                success: true,
                data: qrCodeInfo
            });

        } catch (error) {
            console.error('获取二维码错误:', error);
            res.status(500).json({
                success: false,
                message: '获取二维码失败'
            });
        }
    }

    /**
     * 查询支付状态
     */
    static async getPaymentStatus(req, res) {
        try {
            const userId = req.user.id;
            const { payment_id } = req.params;

            // 获取支付记录
            const payment = await Payment.findById(payment_id);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: '支付记录不存在'
                });
            }

            // 验证支付记录是否属于当前用户
            if (payment.user_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '无权访问此支付记录'
                });
            }

            // 查询支付状态
            const statusInfo = await Payment.queryStatus(payment_id);

            res.json({
                success: true,
                data: statusInfo
            });

        } catch (error) {
            console.error('查询支付状态错误:', error);
            res.status(500).json({
                success: false,
                message: '查询支付状态失败'
            });
        }
    }

    /**
     * 支付宝回调接口
     */
    static async alipayCallback(req, res) {
        try {
            const callbackData = req.method === 'GET' ? req.query : req.body;

            console.log('支付宝回调数据:', callbackData);

            // 处理回调
            const result = await Payment.handleCallback('alipay', callbackData);

            if (result.success) {
                // 支付宝要求返回success字符串
                res.send('success');
            } else {
                res.status(400).send('fail');
            }

        } catch (error) {
            console.error('支付宝回调处理错误:', error);
            res.status(500).send('fail');
        }
    }

    /**
     * 微信支付回调接口
     */
    static async wechatCallback(req, res) {
        try {
            const callbackData = req.body;

            console.log('微信支付回调数据:', callbackData);

            // 处理回调
            const result = await Payment.handleCallback('wechat', callbackData);

            if (result.success) {
                // 微信支付要求返回XML格式的成功响应
                const xmlResponse = `
                    <xml>
                        <return_code><![CDATA[SUCCESS]]></return_code>
                        <return_msg><![CDATA[OK]]></return_msg>
                    </xml>
                `;
                res.set('Content-Type', 'text/xml');
                res.send(xmlResponse);
            } else {
                const xmlResponse = `
                    <xml>
                        <return_code><![CDATA[FAIL]]></return_code>
                        <return_msg><![CDATA[${result.error}]]></return_msg>
                    </xml>
                `;
                res.set('Content-Type', 'text/xml');
                res.status(400).send(xmlResponse);
            }

        } catch (error) {
            console.error('微信支付回调处理错误:', error);
            const xmlResponse = `
                <xml>
                    <return_code><![CDATA[FAIL]]></return_code>
                    <return_msg><![CDATA[服务器错误]]></return_msg>
                </xml>
            `;
            res.set('Content-Type', 'text/xml');
            res.status(500).send(xmlResponse);
        }
    }

    /**
     * 获取用户支付记录
     */
    static async getUserPayments(req, res) {
        try {
            const userId = req.user.id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status;
            const payment_method = req.query.payment_method;
            const start_date = req.query.start_date;
            const end_date = req.query.end_date;

            const filters = {};
            if (status) filters.status = status;
            if (payment_method) filters.payment_method = payment_method;
            if (start_date) filters.start_date = start_date;
            if (end_date) filters.end_date = end_date;

            const result = await Payment.findByUserId(userId, page, limit, filters);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('获取用户支付记录错误:', error);
            res.status(500).json({
                success: false,
                message: '获取支付记录失败'
            });
        }
    }

    /**
     * 退款申请
     */
    static async requestRefund(req, res) {
        try {
            const userId = req.user.id;
            const { payment_id, refund_amount, refund_reason } = req.body;

            // 验证必填字段
            if (!payment_id || !refund_amount) {
                return res.status(400).json({
                    success: false,
                    message: '支付ID和退款金额是必填项'
                });
            }

            // 获取支付记录
            const payment = await Payment.findById(payment_id);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: '支付记录不存在'
                });
            }

            // 验证支付记录是否属于当前用户
            if (payment.user_id !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '无权为此支付记录申请退款'
                });
            }

            // 执行退款
            const refundedPayment = await Payment.refund(
                payment_id,
                parseFloat(refund_amount),
                refund_reason || ''
            );

            res.json({
                success: true,
                message: '退款申请已提交',
                data: refundedPayment
            });

        } catch (error) {
            console.error('退款申请错误:', error);
            res.status(500).json({
                success: false,
                message: error.message || '退款申请失败'
            });
        }
    }

    /**
     * 清理过期支付记录（管理员接口）
     */
    static async cleanupExpired(req, res) {
        try {
            // 检查管理员权限
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '需要管理员权限'
                });
            }

            const result = await Payment.cleanupExpiredPayments();

            res.json({
                success: true,
                message: '过期支付记录清理完成',
                data: result
            });

        } catch (error) {
            console.error('清理过期支付记录错误:', error);
            res.status(500).json({
                success: false,
                message: '清理过期支付记录失败'
            });
        }
    }

    /**
     * 获取支付统计（管理员接口）
     */
    static async getPaymentStats(req, res) {
        try {
            // 检查管理员权限
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '需要管理员权限'
                });
            }

            const timeRange = req.query.time_range || 'month';
            const paymentMethod = req.query.payment_method;

            let whereClause = 'WHERE 1=1';
            const params = [];

            // 时间范围筛选
            switch (timeRange) {
                case 'day':
                    whereClause += ' AND p.created_at >= CURDATE()';
                    break;
                case 'week':
                    whereClause += ' AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    whereClause += ' AND p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    break;
                case 'year':
                    whereClause += ' AND p.created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
                    break;
            }

            // 支付方式筛选
            if (paymentMethod) {
                whereClause += ' AND p.payment_method = ?';
                params.push(paymentMethod);
            }

            // 获取支付统计
            const sql = `
                SELECT
                    COUNT(*) as total_payments,
                    SUM(CASE WHEN p.status = 'success' THEN 1 ELSE 0 END) as successful_payments,
                    SUM(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
                    SUM(CASE WHEN p.status = 'failed' THEN 1 ELSE 0 END) as failed_payments,
                    SUM(CASE WHEN p.status = 'refunded' THEN 1 ELSE 0 END) as refunded_payments,
                    SUM(CASE WHEN p.status = 'success' THEN p.amount ELSE 0 END) as total_amount,
                    AVG(CASE WHEN p.status = 'success' THEN p.amount ELSE NULL END) as avg_amount,
                    p.payment_method,
                    DATE(p.created_at) as date,
                    COUNT(*) as daily_count,
                    SUM(CASE WHEN p.status = 'success' THEN p.amount ELSE 0 END) as daily_amount
                FROM payments p
                ${whereClause}
                GROUP BY p.payment_method, DATE(p.created_at)
                ORDER BY date DESC, p.payment_method
            `;

            const [stats] = await db.query(sql, params);

            // 计算汇总
            const summary = {
                total_payments: 0,
                successful_payments: 0,
                pending_payments: 0,
                failed_payments: 0,
                refunded_payments: 0,
                total_amount: 0,
                by_method: {}
            };

            for (const stat of stats) {
                summary.total_payments += stat.total_payments;
                summary.successful_payments += stat.successful_payments;
                summary.pending_payments += stat.pending_payments;
                summary.failed_payments += stat.failed_payments;
                summary.refunded_payments += stat.refunded_payments;
                summary.total_amount += parseFloat(stat.total_amount || 0);

                if (!summary.by_method[stat.payment_method]) {
                    summary.by_method[stat.payment_method] = {
                        total: 0,
                        success: 0,
                        amount: 0
                    };
                }

                summary.by_method[stat.payment_method].total += stat.total_payments;
                summary.by_method[stat.payment_method].success += stat.successful_payments;
                summary.by_method[stat.payment_method].amount += parseFloat(stat.total_amount || 0);
            }

            res.json({
                success: true,
                data: {
                    summary,
                    daily_stats: stats,
                    time_range: timeRange
                }
            });

        } catch (error) {
            console.error('获取支付统计错误:', error);
            res.status(500).json({
                success: false,
                message: '获取支付统计失败'
            });
        }
    }

    /**
     * 模拟支付成功（开发环境使用）
     */
    static async simulatePayment(req, res) {
        try {
            // 仅限开发环境使用
            if (process.env.NODE_ENV !== 'development') {
                return res.status(403).json({
                    success: false,
                    message: '此功能仅限开发环境使用'
                });
            }

            const { payment_id } = req.body;

            if (!payment_id) {
                return res.status(400).json({
                    success: false,
                    message: '支付ID是必填项'
                });
            }

            // 获取支付记录
            const payment = await Payment.findById(payment_id);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: '支付记录不存在'
                });
            }

            if (payment.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `支付状态为 ${payment.status}，无法模拟支付`
                });
            }

            // 模拟支付成功
            const simulatedCallback = {
                out_trade_no: payment.transaction_id,
                trade_no: `SIM${Date.now()}`,
                trade_status: 'TRADE_SUCCESS',
                total_amount: payment.amount.toString(),
                buyer_id: '2088101111111111',
                buyer_logon_id: 'test@example.com',
                gmt_payment: new Date().toISOString()
            };

            const result = await Payment.handleCallback('alipay', simulatedCallback);

            if (result.success) {
                res.json({
                    success: true,
                    message: '支付模拟成功',
                    data: result.payment
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: '支付模拟失败',
                    error: result.error
                });
            }

        } catch (error) {
            console.error('模拟支付错误:', error);
            res.status(500).json({
                success: false,
                message: '模拟支付失败'
            });
        }
    }
}

module.exports = PaymentController;