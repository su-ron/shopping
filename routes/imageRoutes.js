// 图片路由
const express = require('express');
const router = express.Router();
const ImageController = require('../controllers/imageController');
const multer = require('multer');
const path = require('path');

// 配置multer用于文件上传
const storage = multer.memoryStorage(); // 使用内存存储，可以改为磁盘存储
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB限制
        files: 10 // 最多10个文件
    },
    fileFilter: (req, file, cb) => {
        // 允许的图片类型
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件 (jpeg, jpg, png, gif, webp)'));
        }
    }
});

// 产品图片路由
// GET /api/products/:productId/images - 获取产品所有图片
router.get('/products/:productId/images', ImageController.getProductImages);

// GET /api/products/:productId/images/grouped - 获取分组图片
router.get('/products/:productId/images/grouped', ImageController.getGroupedImages);

// GET /api/products/:productId/images/carousel - 获取轮播图
router.get('/products/:productId/images/carousel', ImageController.getCarouselImages);

// GET /api/products/:productId/images/thumbnail - 获取缩略图
router.get('/products/:productId/images/thumbnail', ImageController.getThumbnail);

// GET /api/products/:productId/images/stats - 获取图片统计
router.get('/products/:productId/images/stats', ImageController.getImageStats);

// POST /api/products/:productId/images - 添加单张图片
router.post('/products/:productId/images', ImageController.addImage);

// POST /api/products/:productId/images/bulk - 批量添加图片
router.post('/products/:productId/images/bulk', ImageController.bulkAddImages);

// PUT /api/images/:imageId - 更新图片
router.put('/images/:imageId', ImageController.updateImage);

// DELETE /api/images/:imageId - 删除图片
router.delete('/images/:imageId', ImageController.deleteImage);

// PUT /api/products/:productId/images/order - 更新图片显示顺序
router.put('/products/:productId/images/order', ImageController.updateDisplayOrder);

// 电商平台图片获取路由
// POST /api/products/:productId/images/fetch/taobao - 从淘宝获取图片
router.post('/products/:productId/images/fetch/taobao', ImageController.fetchFromTaobao);

// POST /api/products/:productId/images/fetch/jd - 从京东获取图片
router.post('/products/:productId/images/fetch/jd', ImageController.fetchFromJd);

// POST /api/products/:productId/images/search - 搜索电商平台图片
router.post('/products/:productId/images/search', ImageController.searchEcommerceImages);

// 本地上传路由
// POST /api/products/:productId/images/upload - 上传单张图片
router.post('/products/:productId/images/upload',
    upload.single('image'),
    ImageController.uploadLocalImage
);

// POST /api/products/:productId/images/upload/bulk - 批量上传图片
router.post('/products/:productId/images/upload/bulk',
    upload.array('images', 10), // 最多10个文件
    ImageController.bulkUploadLocalImages
);

// 错误处理中间件
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer错误处理
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: '文件大小超过限制（最大5MB）'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: '上传文件数量超过限制'
            });
        }
        return res.status(400).json({
            success: false,
            message: '文件上传错误',
            error: err.message
        });
    } else if (err) {
        // 其他错误
        console.error('路由错误:', err);
        return res.status(500).json({
            success: false,
            message: '服务器内部错误',
            error: err.message
        });
    }
    next();
});

module.exports = router;