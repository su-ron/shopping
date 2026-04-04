// 产品路由
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

/**
 * 获取产品列表
 * 查询参数：
 * - page: 页码（默认1）
 * - limit: 每页数量（默认20）
 * - category: 分类ID
 * - brand: 品牌
 * - minPrice: 最低价格
 * - maxPrice: 最高价格
 * - sortBy: 排序字段（price, sales, rating, created_at）
 * - sortOrder: 排序顺序（asc, desc）
 * - search: 搜索关键词
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            category,
            brand,
            minPrice,
            maxPrice,
            sortBy = 'created_at',
            sortOrder = 'desc',
            search
        } = req.query;

        const filters = {};

        if (category) filters.category_id = category;
        if (brand) filters.brand = brand;
        if (minPrice) filters.minPrice = parseFloat(minPrice);
        if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
        if (search) filters.search = search;

        const result = await Product.findAll(
            parseInt(page),
            parseInt(limit),
            filters,
            sortBy,
            sortOrder
        );

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('获取产品列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取产品列表失败'
        });
    }
});

/**
 * 获取产品详情
 */
router.get('/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: '产品不存在'
            });
        }

        // 获取产品SKU
        const skus = await Product.getSKUs(productId);

        // 获取产品图片
        const images = await Product.getImages(productId);

        // 获取相关产品
        const relatedProducts = await Product.findRelated(productId, 4);

        res.json({
            success: true,
            data: {
                product,
                skus,
                images,
                relatedProducts
            }
        });

    } catch (error) {
        console.error('获取产品详情错误:', error);
        res.status(500).json({
            success: false,
            message: '获取产品详情失败'
        });
    }
});

/**
 * 获取产品分类
 */
router.get('/categories/all', async (req, res) => {
    try {
        const categories = await Product.getAllCategories();
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('获取分类错误:', error);
        res.status(500).json({
            success: false,
            message: '获取分类失败'
        });
    }
});

/**
 * 获取热门产品
 */
router.get('/featured/products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;
        const products = await Product.findFeatured(limit);

        res.json({
            success: true,
            data: products
        });
    } catch (error) {
        console.error('获取热门产品错误:', error);
        res.status(500).json({
            success: false,
            message: '获取热门产品失败'
        });
    }
});

/**
 * 获取品牌列表
 */
router.get('/brands/list', async (req, res) => {
    try {
        const brands = await Product.getBrands();
        res.json({
            success: true,
            data: brands
        });
    } catch (error) {
        console.error('获取品牌列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取品牌列表失败'
        });
    }
});

/**
 * 搜索产品
 */
router.get('/search/suggestions', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.trim().length < 2) {
            return res.json({
                success: true,
                data: []
            });
        }

        const suggestions = await Product.searchSuggestions(query, 10);
        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        console.error('搜索建议错误:', error);
        res.status(500).json({
            success: false,
            message: '搜索失败'
        });
    }
});

module.exports = router;