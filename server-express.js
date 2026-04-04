// Express服务器启动文件
const app = require('./app');
const { db } = require('./database/connection');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// 测试数据库连接
async function testDatabaseConnection() {
    try {
        await db.query('SELECT 1');
        console.log('✅ 数据库连接成功');
        return true;
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        return false;
    }
}

// 启动服务器
async function startServer() {
    console.log('='.repeat(60));
    console.log('🎧 蓝牙耳机专卖网购网站 - Express服务器');
    console.log('='.repeat(60));

    // 测试数据库连接
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
        console.log('⚠️  数据库连接失败，部分功能可能无法正常工作');
    }

    // 启动Express服务器
    const server = app.listen(PORT, HOST, () => {
        console.log(`🚀 服务器已启动`);
        console.log(`📍 本地访问: http://${HOST}:${PORT}`);
        console.log(`🌐 网络访问: http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT}`);
        console.log('='.repeat(60));
        console.log('📋 可用API端点:');
        console.log(`  健康检查: GET http://${HOST}:${PORT}/api/health`);
        console.log(`  用户注册: POST http://${HOST}:${PORT}/api/auth/register`);
        console.log(`  用户登录: POST http://${HOST}:${PORT}/api/auth/login`);
        console.log(`  产品列表: GET http://${HOST}:${PORT}/api/products`);
        console.log(`  购物车: GET http://${HOST}:${PORT}/api/cart (需要认证)`);
        console.log(`  创建订单: POST http://${HOST}:${PORT}/api/orders/create (需要认证)`);
        console.log(`  管理员API: http://${HOST}:${PORT}/api/admin (需要管理员权限)`);
        console.log('='.repeat(60));
        console.log('📁 前端页面: http://localhost:8000 (由静态服务器提供)');
        console.log('='.repeat(60));
        console.log('按 Ctrl+C 停止服务器');
        console.log('='.repeat(60));
    });

    // 优雅关闭
    process.on('SIGINT', () => {
        console.log('\n\n👋 正在关闭服务器...');
        server.close(() => {
            console.log('✅ 服务器已关闭');
            process.exit(0);
        });
    });

    // 错误处理
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.log(`❌ 端口 ${PORT} 已被占用，请尝试其他端口`);
        } else {
            console.log(`❌ 启动服务器失败: ${error.message}`);
        }
        process.exit(1);
    });
}

// 启动服务器
startServer().catch(error => {
    console.error('启动服务器失败:', error);
    process.exit(1);
});