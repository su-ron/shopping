// 搜索功能路由
const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/searchController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: 蓝牙耳机搜索功能
 */

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: 高级搜索
 *     description: 支持关键词搜索、多条件筛选、排序和分页的蓝牙耳机搜索功能
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *         description: 最低价格
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *         description: 最高价格
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: 品牌筛选
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *         description: 分类ID筛选
 *       - in: query
 *         name: category_slug
 *         schema:
 *           type: string
 *         description: 分类slug筛选
 *       - in: query
 *         name: bluetooth_version
 *         schema:
 *           type: string
 *         description: 蓝牙版本筛选（如5.0、5.1、5.2、5.3）
 *       - in: query
 *         name: noise_cancellation_type
 *         schema:
 *           type: string
 *         description: 降噪类型筛选（主动降噪、通话降噪、被动降噪、无降噪）
 *       - in: query
 *         name: waterproof_rating
 *         schema:
 *           type: string
 *         description: 防水等级筛选（IPX4、IPX5、IPX6、IPX7、IPX8）
 *       - in: query
 *         name: battery_life_min
 *         schema:
 *           type: integer
 *         description: 最小电池续航（小时）
 *       - in: query
 *         name: battery_life_max
 *         schema:
 *           type: integer
 *         description: 最大电池续航（小时）
 *       - in: query
 *         name: usage_scenario
 *         schema:
 *           type: string
 *         description: 适用场景筛选（运动、游戏、商务、通勤、旅行等）
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [relevance, price_asc, price_desc, sales, rating, newest]
 *           default: relevance
 *         description: 排序方式
 *       - in: query
 *         name: in_stock
 *         schema:
 *           type: boolean
 *         description: 仅显示有库存商品
 *       - in: query
 *         name: is_featured
 *         schema:
 *           type: boolean
 *         description: 仅显示特色商品
 *       - in: query
 *         name: search_fields
 *         schema:
 *           type: string
 *           enum: [all, name, description, brand, specs]
 *           default: all
 *         description: 搜索字段范围
 *       - in: query
 *         name: match_type
 *         schema:
 *           type: string
 *           enum: [fuzzy, exact]
 *           default: fuzzy
 *         description: 匹配类型（模糊/精确）
 *     responses:
 *       200:
 *         description: 搜索成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                     search:
 *                       type: object
 *                       properties:
 *                         query:
 *                           type: string
 *                         resultsCount:
 *                           type: integer
 *                         filters:
 *                           type: object
 *       500:
 *         description: 服务器错误
 */
router.get('/', SearchController.advancedSearch);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: 搜索建议
 *     description: 获取搜索关键词的自动完成建议
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: 搜索关键词
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 建议数量限制
 *     responses:
 *       200:
 *         description: 成功获取搜索建议
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       text:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [product, brand, category, keyword]
 *                       product_id:
 *                         type: integer
 *                         nullable: true
 *                       category_id:
 *                         type: integer
 *                         nullable: true
 *       500:
 *         description: 服务器错误
 */
router.get('/suggestions', SearchController.searchSuggestions);

/**
 * @swagger
 * /api/search/popular:
 *   get:
 *     summary: 热门搜索
 *     description: 获取最近的热门搜索关键词
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 热门搜索数量限制
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: 统计天数
 *     responses:
 *       200:
 *         description: 成功获取热门搜索
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       search_query:
 *                         type: string
 *                       search_count:
 *                         type: integer
 *                       avg_results:
 *                         type: number
 *                       last_searched:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: 服务器错误
 */
router.get('/popular', SearchController.getPopularSearches);

/**
 * @swagger
 * /api/search/filters:
 *   get:
 *     summary: 获取筛选选项
 *     description: 获取所有可用的筛选选项（品牌、价格范围、蓝牙版本等）
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: 成功获取筛选选项
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     brands:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           brand:
 *                             type: string
 *                           product_count:
 *                             type: integer
 *                     priceRange:
 *                       type: object
 *                       properties:
 *                         min_price:
 *                           type: number
 *                         max_price:
 *                           type: number
 *                         avg_price:
 *                           type: number
 *                     bluetoothVersions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           version:
 *                             type: string
 *                           product_count:
 *                             type: integer
 *                     noiseCancellationTypes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           product_count:
 *                             type: integer
 *                     waterproofRatings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rating:
 *                             type: string
 *                           product_count:
 *                             type: integer
 *                     usageScenarios:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           scenario:
 *                             type: string
 *                           product_count:
 *                             type: integer
 *                     batteryLifeRange:
 *                       type: object
 *                       properties:
 *                         min_hours:
 *                           type: integer
 *                         max_hours:
 *                           type: integer
 *                         avg_hours:
 *                           type: number
 *       500:
 *         description: 服务器错误
 */
router.get('/filters', SearchController.getFilterOptions);

/**
 * @swagger
 * /api/search/history:
 *   get:
 *     summary: 获取搜索历史
 *     description: 获取当前用户的搜索历史（需要登录）
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 历史记录数量限制
 *     responses:
 *       200:
 *         description: 成功获取搜索历史
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       search_query:
 *                         type: string
 *                       search_results_count:
 *                         type: integer
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/history', authMiddleware, SearchController.getSearchHistory);

/**
 * @swagger
 * /api/search/history:
 *   delete:
 *     summary: 清除搜索历史
 *     description: 清除当前用户的搜索历史（需要登录）
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功清除搜索历史
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.delete('/history', authMiddleware, SearchController.clearSearchHistory);

module.exports = router;