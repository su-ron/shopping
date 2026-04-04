# 蓝牙耳机商城 - 图片功能API文档

## 概述

本文档描述了蓝牙耳机商城的图片管理API，包括图片的上传、获取、管理以及从电商平台获取图片等功能。

## 基础信息

- **基础URL**: `http://localhost:3000/api`
- **内容类型**: `application/json` (除文件上传外)
- **文件上传**: `multipart/form-data`

## 图片类型说明

| 类型 | 说明 | 示例用途 |
|------|------|----------|
| `main` | 主图 | 产品列表显示、详情页主展示图 |
| `angle` | 多角度图 | 产品详情页轮播图、多角度展示 |
| `detail` | 细节图 | 产品细节特写 |
| `scene` | 场景图 | 使用场景展示 |
| `package` | 包装图 | 包装盒、配件展示 |

## API端点

### 1. 获取产品图片

获取指定产品的所有图片。

**端点**: `GET /products/:productId/images`

**参数**:
- `productId` (路径参数): 产品ID
- `image_type` (查询参数, 可选): 按图片类型筛选
- `sort` (查询参数, 可选): 排序方式，可选值: `display_order_desc`, `created_at_desc`, `created_at_asc`

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "product_id": 1,
      "image_url": "https://example.com/image1.jpg",
      "alt_text": "产品主图",
      "image_type": "main",
      "display_order": 1,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

### 2. 获取分组图片

获取按类型分组的产品图片。

**端点**: `GET /products/:productId/images/grouped`

**参数**:
- `productId` (路径参数): 产品ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "main": [...],
    "angle": [...],
    "detail": [...],
    "scene": [...],
    "package": [...]
  }
}
```

### 3. 获取轮播图

获取用于轮播展示的图片（主图+角度图）。

**端点**: `GET /products/:productId/images/carousel`

**参数**:
- `productId` (路径参数): 产品ID
- `limit` (查询参数, 可选): 返回数量，默认8

**响应示例**:
```json
{
  "success": true,
  "data": [...],
  "count": 5
}
```

### 4. 获取缩略图

获取产品缩略图（第一张主图或角度图）。

**端点**: `GET /products/:productId/images/thumbnail`

**参数**:
- `productId` (路径参数): 产品ID

### 5. 添加单张图片

为产品添加一张图片。

**端点**: `POST /products/:productId/images`

**请求体**:
```json
{
  "image_url": "https://example.com/image.jpg",
  "alt_text": "图片描述",
  "image_type": "main",
  "display_order": 1
}
```

### 6. 批量添加图片

为产品批量添加多张图片。

**端点**: `POST /products/:productId/images/bulk`

**请求体**:
```json
{
  "images": [
    {
      "image_url": "https://example.com/image1.jpg",
      "alt_text": "图片1",
      "image_type": "main",
      "display_order": 1
    },
    {
      "image_url": "https://example.com/image2.jpg",
      "alt_text": "图片2",
      "image_type": "angle",
      "display_order": 2
    }
  ]
}
```

### 7. 更新图片

更新图片信息。

**端点**: `PUT /images/:imageId`

**参数**:
- `imageId` (路径参数): 图片ID

**请求体**:
```json
{
  "image_url": "https://new-url.com/image.jpg",
  "alt_text": "新的描述",
  "image_type": "angle",
  "display_order": 3
}
```

### 8. 删除图片

删除指定图片。

**端点**: `DELETE /images/:imageId`

**参数**:
- `imageId` (路径参数): 图片ID

### 9. 更新图片显示顺序

批量更新图片的显示顺序。

**端点**: `PUT /products/:productId/images/order`

**参数**:
- `productId` (路径参数): 产品ID

**请求体**:
```json
{
  "images": [
    {
      "id": 1,
      "display_order": 2
    },
    {
      "id": 2,
      "display_order": 1
    }
  ]
}
```

### 10. 从淘宝获取图片

从淘宝获取产品图片并保存到数据库。

**端点**: `POST /products/:productId/images/fetch/taobao`

**参数**:
- `productId` (路径参数): 产品ID

**请求体** (二选一):
```json
{
  "taobao_url": "https://item.taobao.com/item.htm?id=123456"
}
```
或
```json
{
  "keyword": "蓝牙耳机"
}
```

### 11. 从京东获取图片

从京东获取产品图片并保存到数据库。

**端点**: `POST /products/:productId/images/fetch/jd`

**参数**:
- `productId` (路径参数): 产品ID

**请求体** (二选一):
```json
{
  "jd_url": "https://item.jd.com/123456.html"
}
```
或
```json
{
  "keyword": "蓝牙耳机"
}
```

### 12. 搜索电商平台图片

搜索电商平台的图片但不保存到数据库。

**端点**: `POST /products/:productId/images/search`

**参数**:
- `productId` (路径参数): 产品ID

**请求体**:
```json
{
  "platform": "taobao", // 或 "jd", "tmall"
  "keyword": "无线蓝牙耳机",
  "limit": 10
}
```

### 13. 本地上传单张图片

上传单张图片到服务器。

**端点**: `POST /products/:productId/images/upload`

**参数**:
- `productId` (路径参数): 产品ID

**请求格式**: `multipart/form-data`
- `image` (文件字段): 图片文件

**限制**:
- 文件大小: ≤5MB
- 文件类型: jpeg, jpg, png, gif, webp

### 14. 批量本地上传图片

批量上传多张图片到服务器。

**端点**: `POST /products/:productId/images/upload/bulk`

**参数**:
- `productId` (路径参数): 产品ID

**请求格式**: `multipart/form-data`
- `images` (文件字段): 图片文件数组

**限制**:
- 单文件大小: ≤5MB
- 总文件数: ≤10个
- 文件类型: jpeg, jpg, png, gif, webp

### 15. 获取图片统计

获取产品的图片统计信息。

**端点**: `GET /products/:productId/images/stats`

**参数**:
- `productId` (路径参数): 产品ID

**响应示例**:
```json
{
  "success": true,
  "data": {
    "product_id": 1,
    "product_name": "Pro ANC 真无线降噪耳机",
    "total_images": 8,
    "by_type": [
      {
        "image_type": "main",
        "count": 1
      },
      {
        "image_type": "angle",
        "count": 4
      },
      {
        "image_type": "detail",
        "count": 2
      },
      {
        "image_type": "scene",
        "count": 1
      }
    ]
  }
}
```

## 错误响应

所有API端点都遵循统一的错误响应格式：

```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息"
}
```

**常见状态码**:
- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误

## 使用示例

### 前端集成示例

```javascript
// 获取产品轮播图
async function getProductCarousel(productId) {
  try {
    const response = await fetch(`/api/products/${productId}/images/carousel`);
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      console.error('获取轮播图失败:', data.message);
      return [];
    }
  } catch (error) {
    console.error('请求失败:', error);
    return [];
  }
}

// 本地上传图片
async function uploadProductImage(productId, file) {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await fetch(`/api/products/${productId}/images/upload`, {
      method: 'POST',
      body: formData
    });
    
    return await response.json();
  } catch (error) {
    console.error('上传失败:', error);
    return { success: false, message: '上传失败' };
  }
}
```

### 从电商平台获取图片

```javascript
// 从淘宝获取图片
async function fetchImagesFromTaobao(productId, keyword) {
  try {
    const response = await fetch(`/api/products/${productId}/images/fetch/taobao`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ keyword })
    });
    
    return await response.json();
  } catch (error) {
    console.error('获取失败:', error);
    return { success: false, message: '获取失败' };
  }
}
```

## 数据库结构

图片数据存储在 `product_images` 表中：

```sql
CREATE TABLE product_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(200),
    image_type ENUM('main', 'angle', 'detail', 'scene', 'package') DEFAULT 'main',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_type (image_type),
    INDEX idx_order (display_order)
);
```

## 注意事项

1. **图片URL**: 支持绝对URL和相对URL（对于本地上传的图片）
2. **重复检查**: 系统会检查同一产品下是否有重复的图片URL
3. **文件存储**: 本地上传的图片存储在 `uploads/` 目录下
4. **电商平台API**: 当前实现为模拟数据，实际使用时需要接入相应平台的API
5. **安全性**: 文件上传有类型和大小限制，防止恶意文件上传

## 测试

运行测试脚本验证API功能：

```bash
node test-images.js
```

确保服务器正在运行：
```bash
npm start
```

## 更新日志

- **v1.0.0** (2024-04-04): 初始版本发布
  - 基础图片管理功能
  - 电商平台图片获取
  - 本地上传功能
  - 分组和轮播图支持