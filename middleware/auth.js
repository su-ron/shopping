// 认证中间件
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const securityConfig = require('../config/security');

// JWT配置
const JWT_CONFIG = {
    accessToken: {
        secret: securityConfig.jwt.accessTokenSecret,
        expiresIn: securityConfig.jwt.accessTokenExpiresIn
    },
    refreshToken: {
        secret: securityConfig.jwt.refreshTokenSecret,
        expiresIn: securityConfig.jwt.refreshTokenExpiresIn
    }
};

/**
 * 生成访问令牌
 * @param {Object} user - 用户对象
 * @returns {String} JWT访问令牌
 */
const generateAccessToken = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        type: 'access'
    };

    return jwt.sign(payload, JWT_CONFIG.accessToken.secret, {
        expiresIn: JWT_CONFIG.accessToken.expiresIn
    });
};

/**
 * 生成刷新令牌
 * @param {Object} user - 用户对象
 * @returns {String} JWT刷新令牌
 */
const generateRefreshToken = (user) => {
    const payload = {
        id: user.id,
        type: 'refresh'
    };

    return jwt.sign(payload, JWT_CONFIG.refreshToken.secret, {
        expiresIn: JWT_CONFIG.refreshToken.expiresIn
    });
};

/**
 * 生成令牌对（访问令牌 + 刷新令牌）
 * @param {Object} user - 用户对象
 * @returns {Object} 包含访问令牌和刷新令牌的对象
 */
const generateTokenPair = (user) => {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
        expiresIn: JWT_CONFIG.accessToken.expiresIn
    };
};

/**
 * 验证访问令牌
 * @param {String} token - JWT访问令牌
 * @returns {Object|null} 解码后的payload或null
 */
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, JWT_CONFIG.accessToken.secret);
    } catch (error) {
        return null;
    }
};

/**
 * 验证刷新令牌
 * @param {String} token - JWT刷新令牌
 * @returns {Object|null} 解码后的payload或null
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, JWT_CONFIG.refreshToken.secret);
    } catch (error) {
        return null;
    }
};

/**
 * 刷新访问令牌
 * @param {String} refreshToken - 刷新令牌
 * @returns {Object|null} 新的访问令牌或null
 */
const refreshAccessToken = async (refreshToken) => {
    try {
        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded || decoded.type !== 'refresh') {
            return null;
        }

        // 查找用户
        const user = await User.findById(decoded.id);
        if (!user || !user.is_active) {
            return null;
        }

        // 生成新的访问令牌
        return generateAccessToken(user);
    } catch (error) {
        console.error('刷新令牌错误:', error);
        return null;
    }
};

/**
 * 认证中间件 - 验证JWT令牌
 */
const authenticate = async (req, res, next) => {
    try {
        // 从请求头获取token
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: '未提供认证令牌'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: '无效的认证令牌'
            });
        }

        // 查找用户
        const user = await User.findById(decoded.id);

        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: '用户不存在或已被禁用'
            });
        }

        // 将用户信息附加到请求对象
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            full_name: user.full_name
        };

        next();
    } catch (error) {
        console.error('认证中间件错误:', error);
        return res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 管理员权限中间件
 */
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: '需要管理员权限'
        });
    }
    next();
};

/**
 * 验证请求数据中间件
 */
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: '请求数据验证失败',
                errors: error.details.map(detail => detail.message)
            });
        }

        next();
    };
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    refreshAccessToken,
    authenticate,
    requireAdmin,
    validateRequest,
    JWT_CONFIG
};