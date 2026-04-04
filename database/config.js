// 数据库配置
require('dotenv').config();
const securityConfig = require('../config/security');

const dbConfig = {
    development: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'claude_mall',
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
        waitForConnections: true,
        charset: 'utf8mb4',
        timezone: '+08:00',
        ssl: process.env.DB_SSL === 'true' ? {
            rejectUnauthorized: false
        } : false
    },
    test: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'test_user',
        password: process.env.DB_PASSWORD || 'test_password',
        database: process.env.DB_NAME || 'claude_mall_test',
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 5,
        waitForConnections: true,
        charset: 'utf8mb4',
        timezone: '+08:00'
    },
    production: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'claude_mall_user',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'claude_mall',
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
        waitForConnections: true,
        charset: 'utf8mb4',
        timezone: '+08:00',
        ssl: process.env.DB_SSL === 'true' ? {
            rejectUnauthorized: true
        } : false
    }
};

// 根据环境选择配置
const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// 验证数据库配置安全性
try {
    securityConfig.database.validateConfig(config);
    console.log(`✅ 数据库配置验证通过 (环境: ${env})`);
} catch (error) {
    console.error(`❌ 数据库配置验证失败: ${error.message}`);
    if (securityConfig.database.requireEnvVars) {
        throw error;
    }
}

// 导出配置
module.exports = config;