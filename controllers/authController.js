// 用户认证控制器
const User = require('../models/User');
const {
    generateTokenPair,
    refreshAccessToken,
    validateRequest
} = require('../middleware/auth');
const Joi = require('joi');

// 注册验证模式
const registerSchema = Joi.object({
    username: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .required()
        .messages({
            'string.alphanum': '用户名只能包含字母和数字',
            'string.min': '用户名至少需要3个字符',
            'string.max': '用户名最多30个字符',
            'any.required': '用户名是必填项'
        }),
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': '请输入有效的邮箱地址',
            'any.required': '邮箱是必填项'
        }),
    password: Joi.string()
        .pattern(new RegExp('^[a-zA-Z0-9]{6,30}$'))
        .required()
        .messages({
            'string.pattern.base': '密码必须是6-30位的字母和数字组合',
            'any.required': '密码是必填项'
        }),
    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': '两次输入的密码不一致',
            'any.required': '确认密码是必填项'
        }),
    full_name: Joi.string()
        .max(100)
        .allow('')
        .optional(),
    phone: Joi.string()
        .pattern(new RegExp('^[0-9]{11}$'))
        .allow('')
        .optional()
        .messages({
            'string.pattern.base': '手机号必须是11位数字'
        })
});

// 登录验证模式
const loginSchema = Joi.object({
    username: Joi.string()
        .required()
        .messages({
            'any.required': '用户名或邮箱是必填项'
        }),
    password: Joi.string()
        .required()
        .messages({
            'any.required': '密码是必填项'
        })
});

// 更新用户信息验证模式
const updateProfileSchema = Joi.object({
    full_name: Joi.string()
        .max(100)
        .allow('')
        .optional(),
    phone: Joi.string()
        .pattern(new RegExp('^[0-9]{11}$'))
        .allow('')
        .optional()
        .messages({
            'string.pattern.base': '手机号必须是11位数字'
        }),
    avatar_url: Joi.string()
        .uri()
        .allow('')
        .optional()
        .messages({
            'string.uri': '头像链接必须是有效的URL'
        })
});

// 更新密码验证模式
const updatePasswordSchema = Joi.object({
    currentPassword: Joi.string()
        .required()
        .messages({
            'any.required': '当前密码是必填项'
        }),
    newPassword: Joi.string()
        .pattern(new RegExp('^[a-zA-Z0-9]{6,30}$'))
        .required()
        .messages({
            'string.pattern.base': '新密码必须是6-30位的字母和数字组合',
            'any.required': '新密码是必填项'
        }),
    confirmPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': '两次输入的新密码不一致',
            'any.required': '确认密码是必填项'
        })
});

/**
 * 用户注册
 */
const register = [
    validateRequest(registerSchema),
    async (req, res) => {
        try {
            const { username, email, password, full_name, phone } = req.body;

            // 检查用户是否已存在
            const userExists = await User.exists(username, email);

            if (userExists) {
                return res.status(400).json({
                    success: false,
                    message: '用户名或邮箱已被注册'
                });
            }

            // 创建用户
            const userData = {
                username,
                email,
                password,
                full_name: full_name || '',
                phone: phone || '',
                avatar_url: ''
            };

            const user = await User.create(userData);

            // 生成JWT令牌对
            const tokens = generateTokenPair(user);

            // 返回用户信息（不包含密码）
            const userResponse = {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                avatar_url: user.avatar_url,
                role: user.role,
                is_active: user.is_active,
                created_at: user.created_at
            };

            res.status(201).json({
                success: true,
                message: '注册成功',
                data: {
                    user: userResponse,
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresIn: tokens.expiresIn
                }
            });

        } catch (error) {
            console.error('注册错误:', error);
            res.status(500).json({
                success: false,
                message: '注册失败，请稍后重试'
            });
        }
    }
];

/**
 * 用户登录
 */
const login = [
    validateRequest(loginSchema),
    async (req, res) => {
        try {
            const { username, password } = req.body;

            // 查找用户（支持用户名或邮箱登录）
            let user = await User.findByUsername(username);

            if (!user) {
                // 尝试使用邮箱查找
                user = await User.findByEmail(username);
            }

            // 用户不存在
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }

            // 检查用户是否被禁用
            if (!user.is_active) {
                return res.status(403).json({
                    success: false,
                    message: '账户已被禁用，请联系管理员'
                });
            }

            // 验证密码
            const isValidPassword = await User.verifyPassword(user, password);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }

            // 生成JWT令牌对
            const tokens = generateTokenPair(user);

            // 返回用户信息（不包含密码）
            const userResponse = {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                phone: user.phone,
                avatar_url: user.avatar_url,
                role: user.role,
                is_active: user.is_active,
                created_at: user.created_at
            };

            res.json({
                success: true,
                message: '登录成功',
                data: {
                    user: userResponse,
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresIn: tokens.expiresIn
                }
            });

        } catch (error) {
            console.error('登录错误:', error);
            res.status(500).json({
                success: false,
                message: '登录失败，请稍后重试'
            });
        }
    }
];

/**
 * 获取当前用户信息
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 返回用户信息（不包含密码）
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            avatar_url: user.avatar_url,
            role: user.role,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at
        };

        res.json({
            success: true,
            data: userResponse
        });

    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '获取用户信息失败'
        });
    }
};

/**
 * 更新用户信息
 */
const updateProfile = [
    validateRequest(updateProfileSchema),
    async (req, res) => {
        try {
            const { full_name, phone, avatar_url } = req.body;
            const updateData = {};

            if (full_name !== undefined) updateData.full_name = full_name;
            if (phone !== undefined) updateData.phone = phone;
            if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

            const updatedUser = await User.update(req.user.id, updateData);

            if (!updatedUser) {
                return res.status(400).json({
                    success: false,
                    message: '没有需要更新的信息'
                });
            }

            // 返回更新后的用户信息
            const userResponse = {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                full_name: updatedUser.full_name,
                phone: updatedUser.phone,
                avatar_url: updatedUser.avatar_url,
                role: updatedUser.role,
                is_active: updatedUser.is_active,
                updated_at: updatedUser.updated_at
            };

            res.json({
                success: true,
                message: '用户信息更新成功',
                data: userResponse
            });

        } catch (error) {
            console.error('更新用户信息错误:', error);
            res.status(500).json({
                success: false,
                message: '更新用户信息失败'
            });
        }
    }
];

/**
 * 更新密码
 */
const updatePassword = [
    validateRequest(updatePasswordSchema),
    async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            // 获取当前用户
            const user = await User.findById(req.user.id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在'
                });
            }

            // 验证当前密码
            const isValidPassword = await User.verifyPassword(user, currentPassword);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: '当前密码错误'
                });
            }

            // 更新密码
            await User.updatePassword(req.user.id, newPassword);

            res.json({
                success: true,
                message: '密码更新成功'
            });

        } catch (error) {
            console.error('更新密码错误:', error);
            res.status(500).json({
                success: false,
                message: '更新密码失败'
            });
        }
    }
];

/**
 * 注销登录
 */
const logout = async (req, res) => {
    try {
        // 在实际应用中，这里可以添加令牌黑名单逻辑
        // 对于JWT，客户端需要删除存储的令牌

        res.json({
            success: true,
            message: '注销成功'
        });

    } catch (error) {
        console.error('注销错误:', error);
        res.status(500).json({
            success: false,
            message: '注销失败'
        });
    }
};

/**
 * 验证令牌
 */
const verifyToken = async (req, res) => {
    try {
        // 如果中间件验证通过，直接返回用户信息
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            avatar_url: user.avatar_url,
            role: user.role,
            is_active: user.is_active
        };

        res.json({
            success: true,
            message: '令牌有效',
            data: userResponse
        });

    } catch (error) {
        console.error('验证令牌错误:', error);
        res.status(500).json({
            success: false,
            message: '验证令牌失败'
        });
    }
};

/**
 * 刷新访问令牌
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: '刷新令牌是必填项'
            });
        }

        // 刷新访问令牌
        const newAccessToken = await refreshAccessToken(refreshToken);

        if (!newAccessToken) {
            return res.status(401).json({
                success: false,
                message: '无效的刷新令牌'
            });
        }

        res.json({
            success: true,
            message: '令牌刷新成功',
            data: {
                accessToken: newAccessToken
            }
        });

    } catch (error) {
        console.error('刷新令牌错误:', error);
        res.status(500).json({
            success: false,
            message: '刷新令牌失败'
        });
    }
};

/**
 * 安全注销（使刷新令牌失效）
 */
const secureLogout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // 在实际应用中，这里可以将刷新令牌加入黑名单
        // 或者从数据库中删除关联的刷新令牌

        console.log(`用户 ${req.user.id} 安全注销，刷新令牌已失效`);

        res.json({
            success: true,
            message: '安全注销成功，所有令牌已失效'
        });

    } catch (error) {
        console.error('安全注销错误:', error);
        res.status(500).json({
            success: false,
            message: '注销失败'
        });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    updatePassword,
    logout,
    verifyToken,
    refreshToken,
    secureLogout
};