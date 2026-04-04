// 安全配置模块
require('dotenv').config();

const securityConfig = {
    // JWT配置
    jwt: {
        accessTokenSecret: process.env.JWT_SECRET || 'your_strong_jwt_secret_key_min_32_chars',
        refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET || 'your_refresh_token_secret_different_from_access',
        accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
        refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',

        // 验证密钥强度
        validateSecrets: function() {
            const minLength = 32;
            if (this.accessTokenSecret.length < minLength) {
                console.warn(`⚠️  JWT_SECRET长度不足${minLength}字符，建议使用更强的密钥`);
            }
            if (this.refreshTokenSecret.length < minLength) {
                console.warn(`⚠️  JWT_REFRESH_TOKEN_SECRET长度不足${minLength}字符，建议使用更强的密钥`);
            }
            if (this.accessTokenSecret === this.refreshTokenSecret) {
                console.warn('⚠️  JWT_SECRET和JWT_REFRESH_TOKEN_SECRET相同，建议使用不同的密钥');
            }
            if (this.accessTokenSecret.includes('your_') || this.refreshTokenSecret.includes('your_')) {
                console.warn('⚠️  检测到默认密钥，请在生产环境中设置实际的JWT密钥');
            }
        }
    },

    // 速率限制配置
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        loginMaxAttempts: parseInt(process.env.RATE_LIMIT_LOGIN_MAX_ATTEMPTS) || 5,
        loginWindowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS) || 15 * 60 * 1000,

        // 消息配置
        message: '请求过于频繁，请稍后再试',
        loginMessage: '登录尝试次数过多，请15分钟后再试',

        // 跳过速率限制的路径（健康检查等）
        skipPaths: ['/api/health', '/favicon.ico']
    },

    // CORS配置
    cors: {
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:8000', 'http://127.0.0.1:8000'],
        credentials: process.env.CORS_CREDENTIALS === 'true' || true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
        exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
    },

    // Helmet安全头配置
    helmet: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"]
            }
        },
        hsts: {
            maxAge: 31536000, // 1年
            includeSubDomains: true,
            preload: true
        },
        noSniff: true,
        xssFilter: true,
        hidePoweredBy: true,
        frameguard: {
            action: 'deny'
        }
    },

    // 数据库安全配置
    database: {
        // 生产环境强制使用环境变量
        requireEnvVars: process.env.NODE_ENV === 'production',

        // 验证数据库配置
        validateConfig: function(config) {
            if (process.env.NODE_ENV === 'production') {
                if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === '') {
                    throw new Error('生产环境必须设置DB_PASSWORD环境变量');
                }
                if (config.password === '' || config.password.includes('your_')) {
                    throw new Error('生产环境不能使用空密码或默认密码');
                }
            }

            // 测试环境警告
            if (process.env.NODE_ENV === 'test' &&
                (config.password === 'test_password' || config.password.includes('test'))) {
                console.warn('⚠️  测试环境使用默认密码，建议在生产前更改');
            }
        }
    },

    // 会话安全
    session: {
        secret: process.env.SESSION_SECRET || 'your_session_secret_key',
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24小时
        }
    },

    // 环境检查
    environment: {
        isProduction: process.env.NODE_ENV === 'production',
        isDevelopment: process.env.NODE_ENV === 'development',
        isTest: process.env.NODE_ENV === 'test',

        // 安全检查
        securityCheck: function() {
            console.log('🔒 安全配置检查:');
            console.log(`   环境: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   JWT密钥已设置: ${!!process.env.JWT_SECRET}`);
            console.log(`   数据库密码已设置: ${!!process.env.DB_PASSWORD}`);
            console.log(`   使用HTTPS: ${process.env.NODE_ENV === 'production'}`);

            // 验证密钥
            securityConfig.jwt.validateSecrets();

            // 验证数据库配置
            if (securityConfig.database.requireEnvVars) {
                try {
                    // 这里会在数据库连接时验证
                    console.log('   生产环境数据库配置检查: 待连接时验证');
                } catch (error) {
                    console.error(`   ❌ ${error.message}`);
                }
            }

            console.log('✅ 安全配置检查完成\n');
        }
    }
};

// 初始化时执行安全检查
if (require.main === module) {
    securityConfig.environment.securityCheck();
}

module.exports = securityConfig;