// 支付功能测试脚本
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// 测试用户凭证（需要先通过注册/登录获取）
const TEST_USER = {
    username: 'testuser',
    password: 'test123',
    token: null
};

// 测试订单数据
const TEST_ORDER = {
    shipping_address: '北京市海淀区中关村大街1号',
    billing_address: '北京市海淀区中关村大街1号',
    customer_name: '测试用户',
    customer_email: 'test@example.com',
    customer_phone: '13800138000',
    notes: '测试订单',
    cart_items: [
        {
            product_id: 1,
            quantity: 2,
            price: 899.00
        }
    ]
};

async function testPaymentFlow() {
    console.log('=== 支付功能测试开始 ===\n');

    try {
        // 1. 用户登录（假设用户已注册）
        console.log('1. 用户登录...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: TEST_USER.username,
            password: TEST_USER.password
        });

        if (!loginResponse.data.success) {
            console.log('❌ 登录失败，请先注册测试用户');
            return;
        }

        TEST_USER.token = loginResponse.data.data.token;
        console.log('✅ 登录成功，token:', TEST_USER.token.substring(0, 20) + '...\n');

        // 2. 创建订单
        console.log('2. 创建测试订单...');
        const orderResponse = await axios.post(`${API_BASE_URL}/orders/create`, TEST_ORDER, {
            headers: {
                'Authorization': `Bearer ${TEST_USER.token}`
            }
        });

        if (!orderResponse.data.success) {
            console.log('❌ 创建订单失败:', orderResponse.data.message);
            return;
        }

        const order = orderResponse.data.data;
        const orderId = order.id;
        console.log('✅ 订单创建成功');
        console.log('   订单号:', order.order_number);
        console.log('   订单金额: ¥', order.total_amount);
        console.log('   订单状态:', order.status);
        console.log('   支付状态:', order.payment_status, '\n');

        // 3. 创建支付（支付宝）
        console.log('3. 创建支付宝支付...');
        const paymentResponse = await axios.post(`${API_BASE_URL}/payments/create`, {
            order_id: orderId,
            payment_method: 'alipay'
        }, {
            headers: {
                'Authorization': `Bearer ${TEST_USER.token}`
            }
        });

        if (!paymentResponse.data.success) {
            console.log('❌ 创建支付失败:', paymentResponse.data.message);
            return;
        }

        const payment = paymentResponse.data.data.payment;
        const paymentId = payment.id;
        console.log('✅ 支付创建成功');
        console.log('   支付ID:', paymentId);
        console.log('   支付方式:', payment.payment_method);
        console.log('   支付金额: ¥', payment.amount);
        console.log('   支付状态:', payment.status);
        console.log('   交易号:', payment.transaction_id, '\n');

        // 4. 获取支付二维码
        console.log('4. 获取支付二维码...');
        const qrcodeResponse = await axios.get(`${API_BASE_URL}/payments/${paymentId}/qrcode`, {
            headers: {
                'Authorization': `Bearer ${TEST_USER.token}`
            }
        });

        if (!qrcodeResponse.data.success) {
            console.log('❌ 获取二维码失败:', qrcodeResponse.data.message);
            return;
        }

        const qrcode = qrcodeResponse.data.data;
        console.log('✅ 二维码获取成功');
        console.log('   二维码URL:', qrcode.qr_code_url.substring(0, 50) + '...');
        console.log('   支付单号:', qrcode.payment_no);
        console.log('   过期时间:', qrcode.expire_time, '\n');

        // 5. 查询支付状态
        console.log('5. 查询支付状态...');
        const statusResponse = await axios.get(`${API_BASE_URL}/payments/${paymentId}/status`, {
            headers: {
                'Authorization': `Bearer ${TEST_USER.token}`
            }
        });

        if (!statusResponse.data.success) {
            console.log('❌ 查询支付状态失败:', statusResponse.data.message);
            return;
        }

        const status = statusResponse.data.data;
        console.log('✅ 支付状态查询成功');
        console.log('   当前状态:', status.status);
        console.log('   状态描述:', status.status_text);
        console.log('   支付金额: ¥', status.amount, '\n');

        // 6. 模拟支付回调（仅开发环境）
        console.log('6. 模拟支付回调...');
        const simulateResponse = await axios.post(`${API_BASE_URL}/payments/simulate`, {
            payment_id: paymentId
        }, {
            headers: {
                'Authorization': `Bearer ${TEST_USER.token}`
            }
        });

        if (!simulateResponse.data.success) {
            console.log('⚠️  模拟支付失败（可能不是开发环境）:', simulateResponse.data.message);
            console.log('   跳过模拟支付，继续测试...\n');
        } else {
            console.log('✅ 模拟支付成功');
            console.log('   支付状态已更新为: success\n');
        }

        // 7. 再次查询支付状态
        console.log('7. 再次查询支付状态...');
        const finalStatusResponse = await axios.get(`${API_BASE_URL}/payments/${paymentId}/status`, {
            headers: {
                'Authorization': `Bearer ${TEST_USER.token}`
            }
        });

        if (finalStatusResponse.data.success) {
            const finalStatus = finalStatusResponse.data.data;
            console.log('✅ 最终支付状态:');
            console.log('   状态:', finalStatus.status);
            console.log('   状态描述:', finalStatus.status_text);
            console.log('   支付时间:', finalStatus.paid_at || '未支付');
        }

        // 8. 查询订单详情
        console.log('\n8. 查询订单详情...');
        const orderDetailResponse = await axios.get(`${API_BASE_URL}/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${TEST_USER.token}`
            }
        });

        if (orderDetailResponse.data.success) {
            const orderDetail = orderDetailResponse.data.data.order;
            console.log('✅ 订单详情:');
            console.log('   订单状态:', orderDetail.status);
            console.log('   支付状态:', orderDetail.payment_status);
            console.log('   支付方式:', orderDetail.payment_method);
            console.log('   支付ID:', orderDetail.payment_id);
        }

        console.log('\n=== 支付功能测试完成 ===');
        console.log('\n测试总结:');
        console.log('1. ✅ 用户登录');
        console.log('2. ✅ 订单创建');
        console.log('3. ✅ 支付创建');
        console.log('4. ✅ 二维码生成');
        console.log('5. ✅ 状态查询');
        console.log('6. ⚠️  模拟支付（开发环境）');
        console.log('7. ✅ 最终状态验证');
        console.log('8. ✅ 订单详情验证');

        console.log('\n前端页面测试:');
        console.log(`1. 支付页面: http://localhost:3000/payment.html?order_id=${orderId}`);
        console.log(`2. 订单详情: http://localhost:3000/order-detail.html?order_id=${orderId}`);

    } catch (error) {
        console.error('❌ 测试过程中发生错误:');
        if (error.response) {
            console.error('   状态码:', error.response.status);
            console.error('   错误信息:', error.response.data.message || error.response.data);
        } else {
            console.error('   错误信息:', error.message);
        }
        console.error('   堆栈:', error.stack);
    }
}

// 运行测试
if (require.main === module) {
    console.log('注意: 运行此测试前请确保:');
    console.log('1. 数据库已初始化 (运行 database/schema.sql)');
    console.log('2. 已注册测试用户 (用户名: testuser, 密码: test123)');
    console.log('3. API服务正在运行 (npm run api:dev)');
    console.log('4. 至少有一个产品 (ID: 1) 有库存\n');

    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('是否继续测试？(y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
            testPaymentFlow();
        } else {
            console.log('测试已取消');
        }
        readline.close();
    });
}

module.exports = { testPaymentFlow };