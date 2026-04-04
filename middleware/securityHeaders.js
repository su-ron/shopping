// 安全HTTP头中间件
const helmet = require('helmet');
const securityConfig = require('../config/security');

// 自定义安全头中间件
const securityHeaders = (req, res, next) => {
    // 设置安全相关HTTP头
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // 生产环境添加更多安全头
    if (securityConfig.environment.isProduction) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    next();
};

// 内容安全策略中间件
const contentSecurityPolicy = (req, res, next) => {
    // 根据请求类型设置不同的CSP
    if (req.path.startsWith('/api/')) {
        // API端点 - 更严格的CSP
        res.setHeader('Content-Security-Policy',
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self'; " +
            "connect-src 'self'; " +
            "frame-ancestors 'none';"
        );
    } else {
        // 静态页面 - 稍微宽松的CSP
        res.setHeader('Content-Security-Policy',
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self'; " +
            "connect-src 'self'; " +
            "frame-ancestors 'none';"
        );
    }

    next();
};

// CORS配置中间件
const corsMiddleware = (req, res, next) => {
    const origin = req.headers.origin;

    // 检查来源是否在允许列表中
    if (securityConfig.cors.origin.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (securityConfig.cors.origin.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', securityConfig.cors.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', securityConfig.cors.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Expose-Headers', securityConfig.cors.exposedHeaders.join(', '));

    if (securityConfig.cors.credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Max-Age', '86400'); // 24小时
        return res.status(200).end();
    }

    next();
};

// 请求验证中间件
const requestValidation = (req, res, next) => {
    // 验证请求大小
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
        return res.status(413).json({
            success: false,
            message: '请求体过大'
        });
    }

    // 验证Content-Type
    if (req.method === 'POST' || req.method === 'PUT') {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(415).json({
                success: false,
                message: '只支持application/json格式'
            });
        }
    }

    // 验证User-Agent（可选）
    const userAgent = req.headers['user-agent'];
    if (!userAgent || userAgent.length > 500) {
        console.warn(`可疑User-Agent: ${userAgent?.substring(0, 100)}...`);
    }

    next();
};

// 响应安全中间件
const responseSecurity = (req, res, next) => {
    // 保存原始的send和json方法
    const originalSend = res.send;
    const originalJson = res.json;

    // 包装send方法以添加安全头
    res.send = function(data) {
        // 确保安全头已设置
        this.setHeader('X-Content-Type-Options', 'nosniff');
        return originalSend.call(this, data);
    };

    // 包装json方法以添加安全头
    res.json = function(data) {
        // 确保安全头已设置
        this.setHeader('X-Content-Type-Options', 'nosniff');
        return originalJson.call(this, data);
    };

    next();
};

// 应用所有安全中间件
const applyAllSecurityHeaders = (app) => {
    console.log('🔒 应用安全HTTP头中间件...');

    // 使用helmet的基本保护
    app.use(helmet(securityConfig.helmet));

    // 自定义安全头
    app.use(securityHeaders);

    // 内容安全策略
    app.use(contentSecurityPolicy);

    // CORS配置
    app.use(corsMiddleware);

    // 请求验证
    app.use(requestValidation);

    // 响应安全
    app.use(responseSecurity);

    console.log('✅ 安全HTTP头中间件已应用\n');
};

module.exports = {
    securityHeaders,
    contentSecurityPolicy,
    corsMiddleware,
    requestValidation,
    responseSecurity,
    applyAllSecurityHeaders
};