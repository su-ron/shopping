// 图片控制器
const ProductImage = require('../models/ProductImage');
const Product = require('../models/Product');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ImageController {
    // 获取产品所有图片
    static async getProductImages(req, res) {
        try {
            const { productId } = req.params;
            const { image_type, sort } = req.query;

            const images = await ProductImage.findByProductId(productId, {
                image_type,
                sort
            });

            res.json({
                success: true,
                data: images,
                count: images.length
            });
        } catch (error) {
            console.error('获取产品图片失败:', error);
            res.status(500).json({
                success: false,
                message: '获取产品图片失败',
                error: error.message
            });
        }
    }

    // 获取产品分组图片
    static async getGroupedImages(req, res) {
        try {
            const { productId } = req.params;
            const groupedImages = await ProductImage.getGroupedImages(productId);

            res.json({
                success: true,
                data: groupedImages
            });
        } catch (error) {
            console.error('获取分组图片失败:', error);
            res.status(500).json({
                success: false,
                message: '获取分组图片失败',
                error: error.message
            });
        }
    }

    // 获取产品轮播图
    static async getCarouselImages(req, res) {
        try {
            const { productId } = req.params;
            const { limit = 8 } = req.query;

            const images = await ProductImage.getCarouselImages(productId, parseInt(limit));

            res.json({
                success: true,
                data: images,
                count: images.length
            });
        } catch (error) {
            console.error('获取轮播图失败:', error);
            res.status(500).json({
                success: false,
                message: '获取轮播图失败',
                error: error.message
            });
        }
    }

    // 获取产品缩略图
    static async getThumbnail(req, res) {
        try {
            const { productId } = req.params;
            const thumbnail = await ProductImage.getThumbnail(productId);

            res.json({
                success: true,
                data: thumbnail
            });
        } catch (error) {
            console.error('获取缩略图失败:', error);
            res.status(500).json({
                success: false,
                message: '获取缩略图失败',
                error: error.message
            });
        }
    }

    // 添加产品图片
    static async addImage(req, res) {
        try {
            const { productId } = req.params;
            const { image_url, alt_text, image_type, display_order } = req.body;

            // 验证产品是否存在
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: '产品不存在'
                });
            }

            // 检查图片URL是否已存在
            const exists = await ProductImage.isImageUrlExists(productId, image_url);
            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: '图片URL已存在'
                });
            }

            const imageData = {
                product_id: productId,
                image_url,
                alt_text: alt_text || '',
                image_type: image_type || 'main',
                display_order: display_order || 0
            };

            const image = await ProductImage.create(imageData);

            res.status(201).json({
                success: true,
                message: '图片添加成功',
                data: image
            });
        } catch (error) {
            console.error('添加图片失败:', error);
            res.status(500).json({
                success: false,
                message: '添加图片失败',
                error: error.message
            });
        }
    }

    // 批量添加产品图片
    static async bulkAddImages(req, res) {
        try {
            const { productId } = req.params;
            const { images } = req.body;

            // 验证产品是否存在
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: '产品不存在'
                });
            }

            // 验证图片数组
            if (!Array.isArray(images) || images.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请提供有效的图片数组'
                });
            }

            // 检查是否有重复的图片URL
            const urls = images.map(img => img.image_url);
            const uniqueUrls = [...new Set(urls)];
            if (urls.length !== uniqueUrls.length) {
                return res.status(400).json({
                    success: false,
                    message: '图片URL不能重复'
                });
            }

            // 批量创建图片
            const createdImages = await ProductImage.bulkCreate(productId, images);

            res.status(201).json({
                success: true,
                message: `成功添加 ${createdImages.length} 张图片`,
                data: createdImages
            });
        } catch (error) {
            console.error('批量添加图片失败:', error);
            res.status(500).json({
                success: false,
                message: '批量添加图片失败',
                error: error.message
            });
        }
    }

    // 更新图片
    static async updateImage(req, res) {
        try {
            const { imageId } = req.params;
            const updateData = req.body;

            // 检查图片是否存在
            const existingImage = await ProductImage.findById(imageId);
            if (!existingImage) {
                return res.status(404).json({
                    success: false,
                    message: '图片不存在'
                });
            }

            // 如果更新了图片URL，检查是否重复
            if (updateData.image_url && updateData.image_url !== existingImage.image_url) {
                const exists = await ProductImage.isImageUrlExists(existingImage.product_id, updateData.image_url);
                if (exists) {
                    return res.status(400).json({
                        success: false,
                        message: '图片URL已存在'
                    });
                }
            }

            const updatedImage = await ProductImage.update(imageId, updateData);

            res.json({
                success: true,
                message: '图片更新成功',
                data: updatedImage
            });
        } catch (error) {
            console.error('更新图片失败:', error);
            res.status(500).json({
                success: false,
                message: '更新图片失败',
                error: error.message
            });
        }
    }

    // 删除图片
    static async deleteImage(req, res) {
        try {
            const { imageId } = req.params;

            // 检查图片是否存在
            const existingImage = await ProductImage.findById(imageId);
            if (!existingImage) {
                return res.status(404).json({
                    success: false,
                    message: '图片不存在'
                });
            }

            await ProductImage.delete(imageId);

            res.json({
                success: true,
                message: '图片删除成功'
            });
        } catch (error) {
            console.error('删除图片失败:', error);
            res.status(500).json({
                success: false,
                message: '删除图片失败',
                error: error.message
            });
        }
    }

    // 更新图片显示顺序
    static async updateDisplayOrder(req, res) {
        try {
            const { productId } = req.params;
            const { images } = req.body;

            // 验证图片数组
            if (!Array.isArray(images) || images.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请提供有效的图片顺序数组'
                });
            }

            // 验证所有图片都属于该产品
            for (const image of images) {
                const existingImage = await ProductImage.findById(image.id);
                if (!existingImage || existingImage.product_id != productId) {
                    return res.status(400).json({
                        success: false,
                        message: `图片 ${image.id} 不属于该产品`
                    });
                }
            }

            await ProductImage.updateDisplayOrder(images);

            res.json({
                success: true,
                message: '图片顺序更新成功'
            });
        } catch (error) {
            console.error('更新图片顺序失败:', error);
            res.status(500).json({
                success: false,
                message: '更新图片顺序失败',
                error: error.message
            });
        }
    }

    // 从淘宝获取图片
    static async fetchFromTaobao(req, res) {
        try {
            const { productId } = req.params;
            const { taobao_url, keyword } = req.body;

            if (!taobao_url && !keyword) {
                return res.status(400).json({
                    success: false,
                    message: '请提供淘宝商品URL或搜索关键词'
                });
            }

            // 验证产品是否存在
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: '产品不存在'
                });
            }

            let imageUrls = [];

            if (taobao_url) {
                // 从淘宝商品页面抓取图片
                imageUrls = await this.scrapeTaobaoImages(taobao_url);
            } else if (keyword) {
                // 根据关键词搜索淘宝图片
                imageUrls = await this.searchTaobaoImages(keyword);
            }

            if (imageUrls.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '未找到相关图片'
                });
            }

            // 保存图片到数据库
            const images = imageUrls.map((url, index) => ({
                image_url: url,
                alt_text: `${product.name} - 图片${index + 1}`,
                image_type: index === 0 ? 'main' : 'angle',
                display_order: index
            }));

            const createdImages = await ProductImage.bulkCreate(productId, images);

            res.json({
                success: true,
                message: `成功从淘宝获取 ${createdImages.length} 张图片`,
                data: createdImages
            });
        } catch (error) {
            console.error('从淘宝获取图片失败:', error);
            res.status(500).json({
                success: false,
                message: '从淘宝获取图片失败',
                error: error.message
            });
        }
    }

    // 从京东获取图片
    static async fetchFromJd(req, res) {
        try {
            const { productId } = req.params;
            const { jd_url, keyword } = req.body;

            if (!jd_url && !keyword) {
                return res.status(400).json({
                    success: false,
                    message: '请提供京东商品URL或搜索关键词'
                });
            }

            // 验证产品是否存在
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: '产品不存在'
                });
            }

            let imageUrls = [];

            if (jd_url) {
                // 从京东商品页面抓取图片
                imageUrls = await this.scrapeJdImages(jd_url);
            } else if (keyword) {
                // 根据关键词搜索京东图片
                imageUrls = await this.searchJdImages(keyword);
            }

            if (imageUrls.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '未找到相关图片'
                });
            }

            // 保存图片到数据库
            const images = imageUrls.map((url, index) => ({
                image_url: url,
                alt_text: `${product.name} - 图片${index + 1}`,
                image_type: index === 0 ? 'main' : 'angle',
                display_order: index
            }));

            const createdImages = await ProductImage.bulkCreate(productId, images);

            res.json({
                success: true,
                message: `成功从京东获取 ${createdImages.length} 张图片`,
                data: createdImages
            });
        } catch (error) {
            console.error('从京东获取图片失败:', error);
            res.status(500).json({
                success: false,
                message: '从京东获取图片失败',
                error: error.message
            });
        }
    }

    // 从电商平台搜索图片
    static async searchEcommerceImages(req, res) {
        try {
            const { productId } = req.params;
            const { platform, keyword, limit = 10 } = req.body;

            if (!platform || !keyword) {
                return res.status(400).json({
                    success: false,
                    message: '请提供平台和搜索关键词'
                });
            }

            // 验证产品是否存在
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: '产品不存在'
                });
            }

            let imageUrls = [];

            switch (platform.toLowerCase()) {
                case 'taobao':
                    imageUrls = await this.searchTaobaoImages(keyword, limit);
                    break;
                case 'jd':
                    imageUrls = await this.searchJdImages(keyword, limit);
                    break;
                case 'tmall':
                    imageUrls = await this.searchTmallImages(keyword, limit);
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: '不支持的平台，支持: taobao, jd, tmall'
                    });
            }

            if (imageUrls.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '未找到相关图片'
                });
            }

            res.json({
                success: true,
                message: `从${platform}找到 ${imageUrls.length} 张图片`,
                data: {
                    product_id: productId,
                    product_name: product.name,
                    platform,
                    keyword,
                    images: imageUrls.map((url, index) => ({
                        url,
                        alt_text: `${product.name} - ${platform}图片${index + 1}`,
                        index
                    }))
                }
            });
        } catch (error) {
            console.error('搜索电商图片失败:', error);
            res.status(500).json({
                success: false,
                message: '搜索电商图片失败',
                error: error.message
            });
        }
    }

    // 本地上传图片
    static async uploadLocalImage(req, res) {
        try {
            const { productId } = req.params;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: '请上传图片文件'
                });
            }

            // 验证产品是否存在
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: '产品不存在'
                });
            }

            // 创建uploads目录（如果不存在）
            const uploadsDir = path.join(__dirname, '../uploads');
            try {
                await fs.access(uploadsDir);
            } catch {
                await fs.mkdir(uploadsDir, { recursive: true });
            }

            // 生成唯一文件名
            const fileExt = path.extname(file.originalname);
            const fileName = `${uuidv4()}${fileExt}`;
            const filePath = path.join(uploadsDir, fileName);

            // 保存文件
            await fs.writeFile(filePath, file.buffer);

            // 构建图片URL（相对路径）
            const imageUrl = `/uploads/${fileName}`;

            // 保存到数据库
            const imageData = {
                product_id: productId,
                image_url: imageUrl,
                alt_text: `${product.name} - 上传图片`,
                image_type: 'main',
                display_order: 0
            };

            const image = await ProductImage.create(imageData);

            res.status(201).json({
                success: true,
                message: '图片上传成功',
                data: {
                    ...image,
                    file_info: {
                        original_name: file.originalname,
                        size: file.size,
                        mimetype: file.mimetype,
                        file_path: filePath
                    }
                }
            });
        } catch (error) {
            console.error('上传图片失败:', error);
            res.status(500).json({
                success: false,
                message: '上传图片失败',
                error: error.message
            });
        }
    }

    // 批量本地上传图片
    static async bulkUploadLocalImages(req, res) {
        try {
            const { productId } = req.params;
            const files = req.files;

            if (!files || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请上传图片文件'
                });
            }

            // 验证产品是否存在
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: '产品不存在'
                });
            }

            // 创建uploads目录（如果不存在）
            const uploadsDir = path.join(__dirname, '../uploads');
            try {
                await fs.access(uploadsDir);
            } catch {
                await fs.mkdir(uploadsDir, { recursive: true });
            }

            const uploadedImages = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // 生成唯一文件名
                const fileExt = path.extname(file.originalname);
                const fileName = `${uuidv4()}${fileExt}`;
                const filePath = path.join(uploadsDir, fileName);

                // 保存文件
                await fs.writeFile(filePath, file.buffer);

                // 构建图片URL
                const imageUrl = `/uploads/${fileName}`;

                // 保存到数据库
                const imageData = {
                    product_id: productId,
                    image_url: imageUrl,
                    alt_text: `${product.name} - 上传图片${i + 1}`,
                    image_type: i === 0 ? 'main' : 'angle',
                    display_order: i
                };

                const image = await ProductImage.create(imageData);
                uploadedImages.push(image);
            }

            res.status(201).json({
                success: true,
                message: `成功上传 ${uploadedImages.length} 张图片`,
                data: uploadedImages
            });
        } catch (error) {
            console.error('批量上传图片失败:', error);
            res.status(500).json({
                success: false,
                message: '批量上传图片失败',
                error: error.message
            });
        }
    }

    // 辅助方法：从淘宝页面抓取图片
    static async scrapeTaobaoImages(url) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const imageUrls = [];

            // 尝试不同的选择器来获取图片
            $('img').each((i, elem) => {
                const src = $(elem).attr('src') || $(elem).attr('data-src');
                if (src && src.includes('alicdn.com')) {
                    // 处理淘宝图片URL
                    let imageUrl = src;
                    if (imageUrl.startsWith('//')) {
                        imageUrl = 'https:' + imageUrl;
                    }
                    if (!imageUrl.startsWith('http')) {
                        imageUrl = 'https:' + imageUrl;
                    }
                    imageUrls.push(imageUrl);
                }
            });

            // 去重并返回前10张
            return [...new Set(imageUrls)].slice(0, 10);
        } catch (error) {
            console.error('抓取淘宝图片失败:', error);
            return [];
        }
    }

    // 辅助方法：从京东页面抓取图片
    static async scrapeJdImages(url) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const imageUrls = [];

            // 尝试不同的选择器来获取图片
            $('img').each((i, elem) => {
                const src = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).attr('data-original');
                if (src && (src.includes('jd.com') || src.includes('360buyimg.com'))) {
                    let imageUrl = src;
                    if (imageUrl.startsWith('//')) {
                        imageUrl = 'https:' + imageUrl;
                    }
                    if (!imageUrl.startsWith('http')) {
                        imageUrl = 'https:' + imageUrl;
                    }
                    imageUrls.push(imageUrl);
                }
            });

            // 去重并返回前10张
            return [...new Set(imageUrls)].slice(0, 10);
        } catch (error) {
            console.error('抓取京东图片失败:', error);
            return [];
        }
    }

    // 辅助方法：搜索淘宝图片
    static async searchTaobaoImages(keyword, limit = 10) {
        try {
            // 这里可以使用淘宝开放API或模拟搜索
            // 由于API限制，这里返回模拟数据
            console.log(`搜索淘宝图片: ${keyword}, 限制: ${limit}`);

            // 模拟返回一些蓝牙耳机相关的图片URL
            const mockImages = [
                'https://img.alicdn.com/imgextra/i3/2200741234567/O1CN01ABCDEF1GHIJKLMNOP_!!2200741234567.jpg',
                'https://img.alicdn.com/imgextra/i4/2200741234567/O1CN01ABCDEF2GHIJKLMNOP_!!2200741234567.jpg',
                'https://img.alicdn.com/imgextra/i1/2200741234567/O1CN01ABCDEF3GHIJKLMNOP_!!2200741234567.jpg',
                'https://img.alicdn.com/imgextra/i2/2200741234567/O1CN01ABCDEF4GHIJKLMNOP_!!2200741234567.jpg',
                'https://img.alicdn.com/imgextra/i3/2200741234567/O1CN01ABCDEF5GHIJKLMNOP_!!2200741234567.jpg'
            ];

            return mockImages.slice(0, limit);
        } catch (error) {
            console.error('搜索淘宝图片失败:', error);
            return [];
        }
    }

    // 辅助方法：搜索京东图片
    static async searchJdImages(keyword, limit = 10) {
        try {
            // 这里可以使用京东开放API或模拟搜索
            console.log(`搜索京东图片: ${keyword}, 限制: ${limit}`);

            // 模拟返回一些蓝牙耳机相关的图片URL
            const mockImages = [
                'https://img14.360buyimg.com/n1/jfs/t1/123456/12/12345/123456/abcdefgh/12345678/abcdefgh.jpg',
                'https://img14.360buyimg.com/n1/jfs/t1/123456/12/12345/123456/abcdefgh/12345678/ijklmnop.jpg',
                'https://img14.360buyimg.com/n1/jfs/t1/123456/12/12345/123456/abcdefgh/12345678/qrstuvwx.jpg',
                'https://img14.360buyimg.com/n1/jfs/t1/123456/12/12345/123456/abcdefgh/12345678/yzabcdef.jpg',
                'https://img14.360buyimg.com/n1/jfs/t1/123456/12/12345/123456/abcdefgh/12345678/ghijklmn.jpg'
            ];

            return mockImages.slice(0, limit);
        } catch (error) {
            console.error('搜索京东图片失败:', error);
            return [];
        }
    }

    // 辅助方法：搜索天猫图片
    static async searchTmallImages(keyword, limit = 10) {
        try {
            // 天猫搜索类似淘宝
            return await this.searchTaobaoImages(keyword, limit);
        } catch (error) {
            console.error('搜索天猫图片失败:', error);
            return [];
        }
    }

    // 获取图片统计信息
    static async getImageStats(req, res) {
        try {
            const { productId } = req.params;

            // 验证产品是否存在
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: '产品不存在'
                });
            }

            const totalCount = await ProductImage.countByProductId(productId);
            const typeCounts = await ProductImage.countByType(productId);

            res.json({
                success: true,
                data: {
                    product_id: productId,
                    product_name: product.name,
                    total_images: totalCount,
                    by_type: typeCounts
                }
            });
        } catch (error) {
            console.error('获取图片统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取图片统计失败',
                error: error.message
            });
        }
    }
}

module.exports = ImageController;