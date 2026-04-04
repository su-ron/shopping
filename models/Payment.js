// 支付模型
const { db } = require('../database/connection');
const crypto = require('crypto');

class Payment {
    // 生成支付单号
    static generatePaymentNo() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `PAY${timestamp}${random}`;
    }

    // 生成支付宝/微信交易号
    static generateTradeNo() {
        return crypto.randomBytes(16).toString('hex').toUpperCase();
    }

    // 创建支付记录
    static async create(paymentData) {
        const {
            order_id,
            payment_method, // alipay, wechat
            amount,
            payment_gateway = 'sandbox', // 沙箱环境
            currency = 'CNY',
            user_id
        } = paymentData;

        const payment_no = this.generatePaymentNo();
        const trade_no = this.generateTradeNo();

        const sql = `
            INSERT INTO payments (
                order_id, payment_method, payment_gateway, transaction_id,
                amount, currency, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
        `;

        const params = [
            order_id,
            payment_method,
            payment_gateway,
            trade_no,
            amount,
            currency
        ];

        const [result] = await db.query(sql, params);
        const paymentId = result.insertId;

        // 更新订单的支付方式
        await db.query(
            'UPDATE orders SET payment_method = ? WHERE id = ?',
            [payment_method, order_id]
        );

        return await this.findById(paymentId);
    }

    // 根据ID查找支付记录
    static async findById(id) {
        const sql = `
            SELECT p.*, o.order_number, o.user_id, o.total_amount,
                   o.customer_name, o.customer_email, o.customer_phone
            FROM payments p
            LEFT JOIN orders o ON p.order_id = o.id
            WHERE p.id = ?
        `;

        const [payments] = await db.query(sql, [id]);
        return payments[0] || null;
    }

    // 根据订单ID查找支付记录
    static async findByOrderId(orderId) {
        const sql = `
            SELECT p.*, o.order_number, o.user_id, o.total_amount
            FROM payments p
            LEFT JOIN orders o ON p.order_id = o.id
            WHERE p.order_id = ?
            ORDER BY p.created_at DESC
        `;

        const [payments] = await db.query(sql, [orderId]);
        return payments;
    }

    // 根据交易号查找
    static async findByTradeNo(tradeNo) {
        const sql = `
            SELECT p.*, o.order_number, o.user_id, o.total_amount
            FROM payments p
            LEFT JOIN orders o ON p.order_id = o.id
            WHERE p.transaction_id = ?
        `;

        const [payments] = await db.query(sql, [tradeNo]);
        return payments[0] || null;
    }

    // 更新支付状态
    static async updateStatus(id, status, gatewayResponse = null) {
        const allowedStatuses = ['pending', 'success', 'failed', 'refunded'];

        if (!allowedStatuses.includes(status)) {
            throw new Error(`无效的支付状态: ${status}`);
        }

        const updateData = {
            status,
            updated_at: new Date()
        };

        if (status === 'success') {
            updateData.paid_at = new Date();
        }

        if (gatewayResponse) {
            updateData.gateway_response = typeof gatewayResponse === 'string'
                ? gatewayResponse
                : JSON.stringify(gatewayResponse);
        }

        const sql = 'UPDATE payments SET ? WHERE id = ?';
        await db.query(sql, [updateData, id]);

        const payment = await this.findById(id);

        // 如果支付成功，更新订单支付状态
        if (status === 'success' && payment.order_id) {
            const Order = require('./Order');
            await Order.updatePaymentStatus(payment.order_id, 'paid', payment.transaction_id);
        }

        return payment;
    }

    // 处理支付回调
    static async handleCallback(paymentMethod, callbackData) {
        try {
            let payment = null;
            let isValid = false;

            // 根据支付方式验证回调数据
            if (paymentMethod === 'alipay') {
                isValid = this.validateAlipayCallback(callbackData);
                if (isValid && callbackData.out_trade_no) {
                    payment = await this.findByTradeNo(callbackData.out_trade_no);
                }
            } else if (paymentMethod === 'wechat') {
                isValid = this.validateWechatCallback(callbackData);
                if (isValid && callbackData.transaction_id) {
                    payment = await this.findByTradeNo(callbackData.transaction_id);
                }
            }

            if (!isValid || !payment) {
                throw new Error('支付回调验证失败');
            }

            // 更新支付状态
            const updatedPayment = await this.updateStatus(
                payment.id,
                'success',
                callbackData
            );

            return {
                success: true,
                payment: updatedPayment
            };

        } catch (error) {
            console.error('支付回调处理错误:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 验证支付宝回调（沙箱环境简化验证）
    static validateAlipayCallback(callbackData) {
        // 生产环境需要验证签名
        // 这里简化处理，只检查必要字段
        const requiredFields = ['out_trade_no', 'trade_no', 'trade_status', 'total_amount'];

        for (const field of requiredFields) {
            if (!callbackData[field]) {
                return false;
            }
        }

        // 检查交易状态
        if (callbackData.trade_status !== 'TRADE_SUCCESS' &&
            callbackData.trade_status !== 'TRADE_FINISHED') {
            return false;
        }

        return true;
    }

    // 验证微信支付回调（沙箱环境简化验证）
    static validateWechatCallback(callbackData) {
        // 生产环境需要验证签名
        // 这里简化处理，只检查必要字段
        const requiredFields = ['transaction_id', 'out_trade_no', 'result_code', 'total_fee'];

        for (const field of requiredFields) {
            if (!callbackData[field]) {
                return false;
            }
        }

        // 检查结果代码
        if (callbackData.result_code !== 'SUCCESS') {
            return false;
        }

        return true;
    }

    // 获取支付二维码URL（沙箱环境模拟）
    static async getQrCodeUrl(paymentId, paymentMethod) {
        const payment = await this.findById(paymentId);

        if (!payment) {
            throw new Error('支付记录不存在');
        }

        // 沙箱环境返回模拟二维码URL
        // 生产环境需要调用支付宝/微信API生成真实二维码
        let qrCodeUrl = '';

        if (paymentMethod === 'alipay') {
            // 支付宝沙箱二维码（模拟）
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                `alipay://platformapi/startapp?appId=20000067&url=${encodeURIComponent(
                    `https://sandbox.alipay.com/pay?out_trade_no=${payment.transaction_id}&amount=${payment.amount}`
                )}`
            )}`;
        } else if (paymentMethod === 'wechat') {
            // 微信支付沙箱二维码（模拟）
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                `weixin://wxpay/bizpayurl?pr=${payment.transaction_id}`
            )}`;
        }

        return {
            qr_code_url: qrCodeUrl,
            payment_no: payment.transaction_id,
            amount: payment.amount,
            expire_time: new Date(Date.now() + 30 * 60 * 1000) // 30分钟后过期
        };
    }

    // 查询支付状态
    static async queryStatus(paymentId) {
        const payment = await this.findById(paymentId);

        if (!payment) {
            throw new Error('支付记录不存在');
        }

        // 沙箱环境模拟查询
        // 生产环境需要调用支付宝/微信API查询真实状态
        const statusMap = {
            'pending': '待支付',
            'success': '支付成功',
            'failed': '支付失败',
            'refunded': '已退款'
        };

        return {
            payment_id: payment.id,
            order_id: payment.order_id,
            payment_no: payment.transaction_id,
            status: payment.status,
            status_text: statusMap[payment.status] || '未知状态',
            amount: payment.amount,
            paid_at: payment.paid_at,
            created_at: payment.created_at
        };
    }

    // 生成退款单号
    static generateRefundNo() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `REF${timestamp}${random}`;
    }

    // 退款
    static async refund(paymentId, refundAmount, refundReason = '') {
        const payment = await this.findById(paymentId);

        if (!payment) {
            throw new Error('支付记录不存在');
        }

        if (payment.status !== 'success') {
            throw new Error('只有支付成功的订单才能退款');
        }

        if (refundAmount > payment.amount) {
            throw new Error('退款金额不能超过支付金额');
        }

        return await db.transaction(async (connection) => {
            // 更新支付状态为退款
            await connection.execute(
                'UPDATE payments SET status = "refunded", updated_at = NOW() WHERE id = ?',
                [paymentId]
            );

            // 更新订单状态
            await connection.execute(
                'UPDATE orders SET payment_status = "refunded", status = "refunded", updated_at = NOW() WHERE id = ?',
                [payment.order_id]
            );

            // 记录退款信息
            const refundNo = this.generateRefundNo();
            const refundSql = `
                INSERT INTO refunds (payment_id, order_id, refund_no, refund_amount, refund_reason, status)
                VALUES (?, ?, ?, ?, ?, 'completed')
            `;
            await connection.execute(refundSql, [
                paymentId,
                payment.order_id,
                refundNo,
                refundAmount,
                refundReason
            ]);

            // 恢复产品库存
            const itemsSql = 'SELECT product_id, quantity FROM order_items WHERE order_id = ?';
            const [items] = await connection.execute(itemsSql, [payment.order_id]);

            for (const item of items) {
                await connection.execute(
                    'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }

            return await this.findById(paymentId, connection);
        });
    }

    // 获取用户支付记录
    static async findByUserId(userId, page = 1, limit = 10, filters = {}) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE o.user_id = ?';
        const params = [userId];

        // 应用筛选条件
        if (filters.status) {
            whereClause += ' AND p.status = ?';
            params.push(filters.status);
        }

        if (filters.payment_method) {
            whereClause += ' AND p.payment_method = ?';
            params.push(filters.payment_method);
        }

        if (filters.start_date) {
            whereClause += ' AND p.created_at >= ?';
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            whereClause += ' AND p.created_at <= ?';
            params.push(filters.end_date);
        }

        // 获取总数
        const countSql = `
            SELECT COUNT(*) as total
            FROM payments p
            LEFT JOIN orders o ON p.order_id = o.id
            ${whereClause}
        `;
        const [countResult] = await db.query(countSql, params);
        const total = countResult[0].total;

        // 获取数据
        const dataSql = `
            SELECT p.*, o.order_number, o.total_amount, o.customer_name
            FROM payments p
            LEFT JOIN orders o ON p.order_id = o.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...params, limit, offset];
        const payments = await db.query(dataSql, dataParams);

        return {
            payments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // 清理过期支付记录（超过30分钟未支付的记录）
    static async cleanupExpiredPayments() {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        const sql = `
            SELECT p.id, p.order_id
            FROM payments p
            WHERE p.status = 'pending'
            AND p.created_at < ?
        `;

        const [expiredPayments] = await db.query(sql, [thirtyMinutesAgo]);

        for (const payment of expiredPayments) {
            try {
                // 更新支付状态为失败
                await this.updateStatus(payment.id, 'failed', { reason: '支付超时' });

                // 更新订单状态为取消
                await db.query(
                    'UPDATE orders SET status = "cancelled", cancelled_at = NOW() WHERE id = ?',
                    [payment.order_id]
                );

                console.log(`已清理过期支付记录: ${payment.id}`);
            } catch (error) {
                console.error(`清理支付记录 ${payment.id} 失败:`, error);
            }
        }

        return {
            cleaned: expiredPayments.length,
            timestamp: new Date()
        };
    }
}

module.exports = Payment;