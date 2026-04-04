// 用户认证路由
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimit');

// 用户注册（应用注册速率限制）
router.post('/register', registerLimiter, authController.register);

// 用户登录（应用登录速率限制）
router.post('/login', loginLimiter, authController.login);

// 刷新访问令牌
router.post('/refresh', authController.refreshToken);

// 获取当前用户信息（需要认证）
router.get('/profile', authenticate, authController.getProfile);

// 更新用户信息（需要认证）
router.put('/profile', authenticate, authController.updateProfile);

// 更新密码（需要认证）
router.put('/password', authenticate, authController.updatePassword);

// 注销登录（需要认证）
router.post('/logout', authenticate, authController.logout);

// 安全注销（使刷新令牌失效）
router.post('/secure-logout', authenticate, authController.secureLogout);

// 验证令牌（需要认证）
router.get('/verify', authenticate, authController.verifyToken);

module.exports = router;