// 图片功能测试脚本
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_PRODUCT_ID = 1; // 使用数据库中的第一个产品进行测试

async function testImageAPIs() {
    console.log('=== 蓝牙耳机商城图片功能测试 ===\n');

    try {
        // 1. 测试获取产品图片
        console.log('1. 测试获取产品图片...');
        const imagesResponse = await axios.get(`${BASE_URL}/products/${TEST_PRODUCT_ID}/images`);
        console.log(`   成功获取 ${imagesResponse.data.count} 张图片`);
        console.log(`   状态: ${imagesResponse.data.success ? '✓' : '✗'}`);

        // 2. 测试获取分组图片
        console.log('\n2. 测试获取分组图片...');
        const groupedResponse = await axios.get(`${BASE_URL}/products/${TEST_PRODUCT_ID}/images/grouped`);
        const groupedData = groupedResponse.data.data;
        console.log(`   主图数量: ${groupedData.main?.length || 0}`);
        console.log(`   角度图数量: ${groupedData.angle?.length || 0}`);
        console.log(`   详情图数量: ${groupedData.detail?.length || 0}`);
        console.log(`   状态: ${groupedResponse.data.success ? '✓' : '✗'}`);

        // 3. 测试获取轮播图
        console.log('\n3. 测试获取轮播图...');
        const carouselResponse = await axios.get(`${BASE_URL}/products/${TEST_PRODUCT_ID}/images/carousel`);
        console.log(`   轮播图数量: ${carouselResponse.data.count}`);
        console.log(`   状态: ${carouselResponse.data.success ? '✓' : '✗'}`);

        // 4. 测试获取缩略图
        console.log('\n4. 测试获取缩略图...');
        const thumbnailResponse = await axios.get(`${BASE_URL}/products/${TEST_PRODUCT_ID}/images/thumbnail`);
        if (thumbnailResponse.data.data) {
            console.log(`   缩略图URL: ${thumbnailResponse.data.data.image_url}`);
        } else {
            console.log(`   无缩略图`);
        }
        console.log(`   状态: ${thumbnailResponse.data.success ? '✓' : '✗'}`);

        // 5. 测试添加图片
        console.log('\n5. 测试添加图片...');
        const newImage = {
            image_url: 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7',
            alt_text: '测试添加的图片',
            image_type: 'angle',
            display_order: 10
        };

        try {
            const addResponse = await axios.post(`${BASE_URL}/products/${TEST_PRODUCT_ID}/images`, newImage);
            const addedImageId = addResponse.data.data.id;
            console.log(`   成功添加图片，ID: ${addedImageId}`);
            console.log(`   状态: ${addResponse.data.success ? '✓' : '✗'}`);

            // 6. 测试更新图片
            console.log('\n6. 测试更新图片...');
            const updateData = {
                alt_text: '更新后的图片描述',
                display_order: 5
            };

            const updateResponse = await axios.put(`${BASE_URL}/images/${addedImageId}`, updateData);
            console.log(`   图片更新成功`);
            console.log(`   新描述: ${updateResponse.data.data.alt_text}`);
            console.log(`   新顺序: ${updateResponse.data.data.display_order}`);
            console.log(`   状态: ${updateResponse.data.success ? '✓' : '✗'}`);

            // 7. 测试删除图片
            console.log('\n7. 测试删除图片...');
            const deleteResponse = await axios.delete(`${BASE_URL}/images/${addedImageId}`);
            console.log(`   图片删除成功`);
            console.log(`   状态: ${deleteResponse.data.success ? '✓' : '✗'}`);

        } catch (addError) {
            console.log(`   添加图片失败: ${addError.response?.data?.message || addError.message}`);
        }

        // 8. 测试批量添加图片
        console.log('\n8. 测试批量添加图片...');
        const bulkImages = [
            {
                image_url: 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7',
                alt_text: '批量添加图片1',
                image_type: 'angle',
                display_order: 20
            },
            {
                image_url: 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7',
                alt_text: '批量添加图片2',
                image_type: 'detail',
                display_order: 21
            }
        ];

        try {
            const bulkResponse = await axios.post(`${BASE_URL}/products/${TEST_PRODUCT_ID}/images/bulk`, {
                images: bulkImages
            });
            console.log(`   成功批量添加 ${bulkResponse.data.data.length} 张图片`);
            console.log(`   状态: ${bulkResponse.data.success ? '✓' : '✗'}`);
        } catch (bulkError) {
            console.log(`   批量添加失败: ${bulkError.response?.data?.message || bulkError.message}`);
        }

        // 9. 测试获取图片统计
        console.log('\n9. 测试获取图片统计...');
        const statsResponse = await axios.get(`${BASE_URL}/products/${TEST_PRODUCT_ID}/images/stats`);
        console.log(`   总图片数: ${statsResponse.data.data.total_images}`);
        console.log(`   产品名称: ${statsResponse.data.data.product_name}`);
        console.log(`   状态: ${statsResponse.data.success ? '✓' : '✗'}`);

        // 10. 测试从淘宝获取图片（模拟）
        console.log('\n10. 测试从淘宝获取图片（模拟）...');
        try {
            const taobaoResponse = await axios.post(`${BASE_URL}/products/${TEST_PRODUCT_ID}/images/fetch/taobao`, {
                keyword: '蓝牙耳机'
            });
            console.log(`   从淘宝获取 ${taobaoResponse.data.data?.length || 0} 张图片`);
            console.log(`   状态: ${taobaoResponse.data.success ? '✓' : '✗'}`);
        } catch (taobaoError) {
            console.log(`   淘宝获取失败: ${taobaoError.response?.data?.message || taobaoError.message}`);
        }

        // 11. 测试搜索电商平台图片
        console.log('\n11. 测试搜索电商平台图片...');
        try {
            const searchResponse = await axios.post(`${BASE_URL}/products/${TEST_PRODUCT_ID}/images/search`, {
                platform: 'taobao',
                keyword: '无线蓝牙耳机',
                limit: 5
            });
            console.log(`   搜索到 ${searchResponse.data.data.images.length} 张图片`);
            console.log(`   平台: ${searchResponse.data.data.platform}`);
            console.log(`   关键词: ${searchResponse.data.data.keyword}`);
            console.log(`   状态: ${searchResponse.data.success ? '✓' : '✗'}`);
        } catch (searchError) {
            console.log(`   搜索失败: ${searchError.response?.data?.message || searchError.message}`);
        }

        console.log('\n=== 测试完成 ===');
        console.log('所有图片API功能测试完毕。');
        console.log('注意：本地上传功能需要实际运行服务器并发送multipart/form-data请求。');

    } catch (error) {
        console.error('\n测试过程中发生错误:');
        console.error(`   错误信息: ${error.message}`);
        if (error.response) {
            console.error(`   状态码: ${error.response.status}`);
            console.error(`   响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        console.error('\n请确保：');
        console.error('1. 服务器正在运行 (npm start)');
        console.error('2. 数据库连接正常');
        console.error('3. 产品ID存在');
    }
}

// 运行测试
testImageAPIs();