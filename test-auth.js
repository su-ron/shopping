// 用户认证系统测试脚本
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// 测试用户数据
const testUser = {
    username: 'testuser_' + Date.now(),
    email: `test${Date.now()}@example.com`,
    password: 'Test123456',
    confirmPassword: 'Test123456',
    full_name: '测试用户',
    phone: '13800138000'
};

let authToken = null;

async function testAuthentication() {
    console.log('🔍 开始测试用户认证系统...\n');

    try {
        // 1. 测试用户注册
        console.log('1. 测试用户注册');
        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
        console.log('   注册成功:', registerResponse.data.message);
        console.log('   用户ID:', registerResponse.data.data.user.id);
        console.log('   用户名:', registerResponse.data.data.user.username);
        console.log('   Token:', registerResponse.data.data.token.substring(0, 30) + '...');
        authToken = registerResponse.data.data.token;
        console.log();

        // 2. 测试用户登录
        console.log('2. 测试用户登录');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: testUser.username,
            password: testUser.password
        });
        console.log('   登录成功:', loginResponse.data.message);
        console.log('   用户信息:', {
            id: loginResponse.data.data.user.id,
            username: loginResponse.data.data.user.username,
            email: loginResponse.data.data.user.email,
            role: loginResponse.data.data.user.role
        });
        console.log();

        // 3. 测试获取用户信息（需要认证）
        console.log('3. 测试获取用户信息');
        const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        console.log('   获取成功:', profileResponse.data.data.username);
        console.log('   邮箱:', profileResponse.data.data.email);
        console.log('   角色:', profileResponse.data.data.role);
        console.log();

        // 4. 测试更新用户信息
        console.log('4. 测试更新用户信息');
        const updateResponse = await axios.put(`${API_BASE_URL}/auth/profile`, {
            full_name: '更新后的测试用户',
            phone: '13900139000'
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        console.log('   更新成功:', updateResponse.data.message);
        console.log('   新姓名:', updateResponse.data.data.full_name);
        console.log('   新电话:', updateResponse.data.data.phone);
        console.log();

        // 5. 测试验证令牌
        console.log('5. 测试验证令牌');
        const verifyResponse = await axios.get(`${API_BASE_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        console.log('   令牌有效:', verifyResponse.data.message);
        console.log();

        // 6. 测试更新密码
        console.log('6. 测试更新密码');
        const updatePasswordResponse = await axios.put(`${API_BASE_URL}/auth/password`, {
            currentPassword: testUser.password,
            newPassword: 'NewTest123456',
            confirmPassword: 'NewTest123456'
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        console.log('   密码更新成功:', updatePasswordResponse.data.message);
        console.log();

        // 7. 测试使用新密码登录
        console.log('7. 测试使用新密码登录');
        const newLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: testUser.username,
            password: 'NewTest123456'
        });
        console.log('   新密码登录成功:', newLoginResponse.data.message);
        console.log();

        // 8. 测试注销
        console.log('8. 测试注销');
        const logoutResponse = await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        console.log('   注销成功:', logoutResponse.data.message);
        console.log();

        // 9. 测试健康检查
        console.log('9. 测试健康检查');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('   服务状态:', healthResponse.data.status);
        console.log('   服务名称:', healthResponse.data.service);
        console.log('   版本:', healthResponse.data.version);
        console.log();

        console.log('✅ 所有测试通过！');
        console.log('\n📋 测试总结:');
        console.log('   - 用户注册 ✓');
        console.log('   - 用户登录 ✓');
        console.log('   - 获取用户信息 ✓');
        console.log('   - 更新用户信息 ✓');
        console.log('   - 验证令牌 ✓');
        console.log('   - 更新密码 ✓');
        console.log('   - 注销登录 ✓');
        console.log('   - 健康检查 ✓');

    } catch (error) {
        console.error('❌ 测试失败:');

        if (error.response) {
            console.error('   状态码:', error.response.status);
            console.error('   错误信息:', error.response.data.message);
            if (error.response.data.errors) {
                console.error('   验证错误:', error.response.data.errors);
            }
        } else if (error.request) {
            console.error('   请求失败，请确保服务器已启动');
            console.error('   服务器地址:', API_BASE_URL);
        } else {
            console.error('   错误:', error.message);
        }

        process.exit(1);
    }
}

// 运行测试
testAuthentication();