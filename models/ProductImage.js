// 产品图片模型
const { db } = require('../database/connection');

class ProductImage {
    // 创建产品图片
    static async create(imageData) {
        const {
            product_id,
            image_url,
            alt_text = '',
            image_type = 'main',
            display_order = 0
        } = imageData;

        const sql = `
            INSERT INTO product_images (product_id, image_url, alt_text, image_type, display_order)
            VALUES (?, ?, ?, ?, ?)
        `;

        const params = [product_id, image_url, alt_text, image_type, display_order];
        const result = await db.query(sql, params);
        return await this.findById(result.insertId);
    }

    // 批量创建产品图片
    static async bulkCreate(productId, images) {
        const results = [];

        for (const image of images) {
            const imageData = {
                product_id: productId,
                image_url: image.image_url,
                alt_text: image.alt_text || '',
                image_type: image.image_type || 'main',
                display_order: image.display_order || 0
            };

            const result = await this.create(imageData);
            results.push(result);
        }

        return results;
    }

    // 根据ID查找图片
    static async findById(id) {
        const sql = 'SELECT * FROM product_images WHERE id = ?';
        const [images] = await db.query(sql, [id]);
        return images[0] || null;
    }

    // 根据产品ID查找所有图片
    static async findByProductId(productId, options = {}) {
        let whereClause = 'WHERE product_id = ?';
        const params = [productId];

        // 按图片类型筛选
        if (options.image_type) {
            whereClause += ' AND image_type = ?';
            params.push(options.image_type);
        }

        // 排序
        let orderBy = 'display_order ASC, created_at ASC';
        if (options.sort) {
            switch (options.sort) {
                case 'display_order_desc':
                    orderBy = 'display_order DESC, created_at ASC';
                    break;
                case 'created_at_desc':
                    orderBy = 'created_at DESC';
                    break;
                case 'created_at_asc':
                    orderBy = 'created_at ASC';
                    break;
            }
        }

        const sql = `
            SELECT * FROM product_images
            ${whereClause}
            ORDER BY ${orderBy}
        `;

        return await db.query(sql, params);
    }

    // 获取产品主图
    static async getMainImage(productId) {
        const sql = `
            SELECT * FROM product_images
            WHERE product_id = ? AND image_type = 'main'
            ORDER BY display_order ASC, created_at ASC
            LIMIT 1
        `;

        const [images] = await db.query(sql, [productId]);
        return images[0] || null;
    }

    // 获取产品多角度图片
    static async getAngleImages(productId, limit = 5) {
        const sql = `
            SELECT * FROM product_images
            WHERE product_id = ? AND image_type = 'angle'
            ORDER BY display_order ASC, created_at ASC
            LIMIT ?
        `;

        return await db.query(sql, [productId, limit]);
    }

    // 获取产品详情图片
    static async getDetailImages(productId) {
        const sql = `
            SELECT * FROM product_images
            WHERE product_id = ? AND image_type = 'detail'
            ORDER BY display_order ASC, created_at ASC
        `;

        return await db.query(sql, [productId]);
    }

    // 获取产品场景图片
    static async getSceneImages(productId) {
        const sql = `
            SELECT * FROM product_images
            WHERE product_id = ? AND image_type = 'scene'
            ORDER BY display_order ASC, created_at ASC
        `;

        return await db.query(sql, [productId]);
    }

    // 获取产品包装图片
    static async getPackageImages(productId) {
        const sql = `
            SELECT * FROM product_images
            WHERE product_id = ? AND image_type = 'package'
            ORDER BY display_order ASC, created_at ASC
        `;

        return await db.query(sql, [productId]);
    }

    // 更新图片
    static async update(id, updateData) {
        const allowedFields = [
            'image_url', 'alt_text', 'image_type', 'display_order'
        ];

        const updates = [];
        const params = [];

        for (const [field, value] of Object.entries(updateData)) {
            if (allowedFields.includes(field) && value !== undefined) {
                updates.push(`${field} = ?`);
                params.push(value);
            }
        }

        if (updates.length === 0) {
            return null;
        }

        params.push(id);
        const sql = `UPDATE product_images SET ${updates.join(', ')} WHERE id = ?`;

        await db.query(sql, params);
        return await this.findById(id);
    }

    // 删除图片
    static async delete(id) {
        const sql = 'DELETE FROM product_images WHERE id = ?';
        await db.query(sql, [id]);
        return true;
    }

    // 删除产品所有图片
    static async deleteByProductId(productId) {
        const sql = 'DELETE FROM product_images WHERE product_id = ?';
        await db.query(sql, [productId]);
        return true;
    }

    // 更新图片显示顺序
    static async updateDisplayOrder(images) {
        return await db.transaction(async (connection) => {
            for (const image of images) {
                await connection.execute(
                    'UPDATE product_images SET display_order = ? WHERE id = ?',
                    [image.display_order, image.id]
                );
            }
            return true;
        });
    }

    // 统计产品图片数量
    static async countByProductId(productId) {
        const sql = 'SELECT COUNT(*) as count FROM product_images WHERE product_id = ?';
        const [result] = await db.query(sql, [productId]);
        return result[0].count;
    }

    // 按图片类型统计
    static async countByType(productId) {
        const sql = `
            SELECT image_type, COUNT(*) as count
            FROM product_images
            WHERE product_id = ?
            GROUP BY image_type
            ORDER BY image_type
        `;

        return await db.query(sql, [productId]);
    }

    // 检查图片URL是否已存在
    static async isImageUrlExists(productId, imageUrl) {
        const sql = 'SELECT COUNT(*) as count FROM product_images WHERE product_id = ? AND image_url = ?';
        const [result] = await db.query(sql, [productId, imageUrl]);
        return result[0].count > 0;
    }

    // 获取产品所有图片（按类型分组）
    static async getGroupedImages(productId) {
        const images = await this.findByProductId(productId);

        const grouped = {
            main: [],
            angle: [],
            detail: [],
            scene: [],
            package: []
        };

        images.forEach(image => {
            if (grouped[image.image_type]) {
                grouped[image.image_type].push(image);
            }
        });

        // 按display_order排序每个分组
        Object.keys(grouped).forEach(type => {
            grouped[type].sort((a, b) => a.display_order - b.display_order);
        });

        return grouped;
    }

    // 获取产品轮播图（主图+角度图，最多8张）
    static async getCarouselImages(productId, limit = 8) {
        const sql = `
            SELECT * FROM product_images
            WHERE product_id = ? AND image_type IN ('main', 'angle')
            ORDER BY
                CASE image_type
                    WHEN 'main' THEN 0
                    WHEN 'angle' THEN 1
                    ELSE 2
                END,
                display_order ASC,
                created_at ASC
            LIMIT ?
        `;

        return await db.query(sql, [productId, limit]);
    }

    // 获取产品缩略图（第一张主图或角度图）
    static async getThumbnail(productId) {
        const sql = `
            SELECT * FROM product_images
            WHERE product_id = ? AND image_type IN ('main', 'angle')
            ORDER BY
                CASE image_type
                    WHEN 'main' THEN 0
                    WHEN 'angle' THEN 1
                    ELSE 2
                END,
                display_order ASC,
                created_at ASC
            LIMIT 1
        `;

        const [images] = await db.query(sql, [productId]);
        return images[0] || null;
    }

    // 批量更新图片信息
    static async bulkUpdate(updates) {
        return await db.transaction(async (connection) => {
            for (const update of updates) {
                const { id, ...updateData } = update;
                await connection.execute(
                    'UPDATE product_images SET ? WHERE id = ?',
                    [updateData, id]
                );
            }
            return true;
        });
    }
}

module.exports = ProductImage;