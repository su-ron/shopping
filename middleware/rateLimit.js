// 速率限制中间件
const rateLimit = require('express-rate-limit');
const securityConfig = require('../config/security');

// 全局速率限制器
const globalLimiter = rateLimit({
    windowMs: securityConfig.rateLimit.windowMs,
    max: securityConfig.rateLimit.maxRequests,
    message: {
        success: false,
        message: securityConfig.rateLimit.message
    },
    standardHeaders: true, // 返回速率限制信息在 `RateLimit-*` 头中
    legacyHeaders: false, // 禁用 `X-RateLimit-*` 头
    skip: (req) => {
        // 跳过健康检查等路径
        return securityConfig.rateLimit.skipPaths.some(path => req.path.startsWith(path));
    },
    keyGenerator: (req) => {
        // 使用IP地址作为限制键
        return req.ip || req.connection.remoteAddress;
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: securityConfig.rateLimit.message,
            retryAfter: Math.ceil(securityConfig.rateLimit.windowMs / 1000)
        });
    }
});

// 登录专用速率限制器（更严格）
const loginLimiter = rateLimit({
    windowMs: securityConfig.rateLimit.loginWindowMs,
    max: securityConfig.rateLimit.loginMaxAttempts,
    message: {
        success: false,
        message: securityConfig.rateLimit.loginMessage
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: false, // 即使登录失败也计数
    keyGenerator: (req) => {
        // 使用IP地址和用户名组合作为限制键
        const ip = req.ip || req.connection.remoteAddress;
        const username = req.body.username || req.body.email || 'unknown';
        return `${ip}:${username}`;
    },
    handler: (req, res) => {
        const retrySeconds = Math.ceil(securityConfig.rateLimit.loginWindowMs / 1000);
        res.status(429).json({
            success: false,
            message: securityConfig.rateLimit.loginMessage,
            retryAfter: retrySeconds,
            retryAt: new Date(Date.now() + securityConfig.rateLimit.loginWindowMs).toISOString()
        });
    }
});

// 注册专用速率限制器
const registerLimiter = rateLimit({
    windowMs: securityConfig.rateLimit.loginWindowMs,
    max: 3, // 注册限制更严格
    message: {
        success: false,
        message: '注册请求过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // 使用IP地址作为限制键
        return req.ip || req.connection.remoteAddress;
    }
});

// API端点速率限制器（针对敏感操作）
const sensitiveApiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5分钟
    max: 10, // 敏感操作限制
    message: {
        success: false,
        message: '操作过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // 跳过GET请求（只限制POST/PUT/DELETE）
        return req.method === 'GET';
    }
});

// 管理员API速率限制器
const adminLimiter = rateLimit({
    windowMs: securityConfig.rateLimit.windowMs,
    max: 50, // 管理员限制稍宽松
    message: {
        success: false,
        message: '管理员操作过于频繁'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // 使用管理员用户ID作为限制键
        const ip = req.ip || req.connection.remoteAddress;
        const userId = req.user ? req.user.id : 'anonymous';
        return `admin:${ip}:${userId}`;
    }
});

// 暴力破解防护中间件
const bruteForceProtection = (req, res, next) => {
    // 记录失败的登录尝试
    if (req.path === '/api/auth/login' && req.method === 'POST') {
        const ip = req.ip || req.connection.remoteAddress;
        const username = req.body.username || req.body.email;

        // 这里可以集成更复杂的暴力破解检测逻辑
        // 例如：记录失败次数、检测可疑模式等

        console.log(`🔐 登录尝试: IP=${ip}, 用户名=${username || 'unknown'}`);
    }

    next();
};

// 请求频率分析中间件（用于监控）
const requestFrequencyAnalysis = (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.connection.remoteAddress;

    // 这里可以添加请求频率分析逻辑
    // 例如：检测异常请求模式、DDoS攻击等

    // 记录高频端点访问
    if (req.path.includes('/api/')) {
        const endpoint = req.path;
        // 可以在这里集成监控系统
    }

    next();
};

module.exports = {
    globalLimiter,
    loginLimiter,
    registerLimiter,
    sensitiveApiLimiter,
    adminLimiter,
    bruteForceProtection,
    requestFrequencyAnalysis,

    // 中间件组合
    applySecurityMiddleware: (app) => {
        console.log('🔒 应用安全中间件...');

        // 应用全局速率限制
        app.use(globalLimiter);

        // 应用暴力破解防护
        app.use(bruteForceProtection);

        // 应用请求频率分析
        if (securityConfig.environment.isProduction) {
            app.use(requestFrequencyAnalysis);
        }

        console.log('✅ 安全中间件已应用\n');
    }
};