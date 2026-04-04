// Express应用主文件
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

// 导入安全中间件
const securityConfig = require('./config/security');
const { applyAllSecurityHeaders } = require('./middleware/securityHeaders');
const { applySecurityMiddleware } = require('./middleware/rateLimit');

// 导入路由
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const imageRoutes = require('./routes/imageRoutes');
const searchRoutes = require('./routes/searchRoutes');

// 创建Express应用
const app = express();

// 初始化安全检查
securityConfig.environment.securityCheck();

// 中间件配置
app.use(bodyParser.json({
    limit: '10mb' // 限制请求体大小
}));
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '10mb'
}));

// 应用安全中间件
applyAllSecurityHeaders(app);
applySecurityMiddleware(app);

// 静态文件服务
app.use(express.static(path.join(__dirname)));
// 上传文件静态服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 请求日志中间件（安全增强版）
app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';

    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - IP: ${ip}`);

    // 记录可疑请求
    if (userAgent.includes('curl') || userAgent.includes('wget') || userAgent.includes('python')) {
        console.log(`   ⚠️  可疑User-Agent: ${userAgent.substring(0, 50)}...`);
    }

    next();
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', imageRoutes);
app.use('/api/search', searchRoutes);

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: '蓝牙耳机商城API',
        version: '1.0.0'
    });
});

// 根路径重定向到首页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API端点不存在',
        requestedUrl: req.url,
        method: req.method
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || '服务器内部错误';

    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 导出应用
module.exports = app;