# Claude商城后端API文档

## 基础信息
- 基础URL: `http://localhost:3000`
- 所有API返回JSON格式数据
- 需要包含 `x-session-id` 请求头来标识用户会话（购物车和订单相关API）

## API端点

### 1. 产品API

#### 获取所有产品
```
GET /api/products
```

响应示例：
```json
[
  {
    "id": 1,
    "name": "无线蓝牙耳机",
    "description": "高音质降噪耳机，续航长达30小时",
    "price": 299.99,
    "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    "category": "电子产品",
    "stock": 50
  }
]
```

#### 获取单个产品
```
GET /api/products/:id
```

参数：
- `id`: 产品ID

#### 按分类获取产品
```
GET /api/products/category/:category
```

参数：
- `category`: 产品分类（如：电子产品、服装服饰等）

### 2. 购物车API

#### 获取购物车
```
GET /api/cart
```

请求头：
```
x-session-id: <用户会话ID>
```

响应示例：
```json
{
  "sessionId": "uuid-string",
  "cart": [
    {
      "id": 1,
      "name": "无线蓝牙耳机",
      "price": 299.99,
      "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      "quantity": 2
    }
  ]
}
```

#### 添加商品到购物车
```
POST /api/cart/add
```

请求头：
```
x-session-id: <用户会话ID>
Content-Type: application/json
```

请求体：
```json
{
  "productId": 1,
  "quantity": 1
}
```

#### 更新购物车商品数量
```
PUT /api/cart/update/:productId
```

请求头：
```
x-session-id: <用户会话ID>
Content-Type: application/json
```

参数：
- `productId`: 产品ID

请求体：
```json
{
  "quantity": 3
}
```

#### 从购物车移除商品
```
DELETE /api/cart/remove/:productId
```

请求头：
```
x-session-id: <用户会话ID>
```

参数：
- `productId`: 产品ID

#### 清空购物车
```
DELETE /api/cart/clear
```

请求头：
```
x-session-id: <用户会话ID>
```

### 3. 订单API

#### 创建订单
```
POST /api/orders/create
```

请求头：
```
x-session-id: <用户会话ID>
Content-Type: application/json
```

请求体：
```json
{
  "customerName": "张三",
  "customerEmail": "zhangsan@example.com",
  "shippingAddress": "北京市朝阳区"
}
```

响应示例：
```json
{
  "success": true,
  "message": "订单创建成功",
  "order": {
    "id": "uuid-string",
    "orderNumber": "ORD123456789",
    "sessionId": "uuid-string",
    "customerName": "张三",
    "customerEmail": "zhangsan@example.com",
    "shippingAddress": "北京市朝阳区",
    "items": [...],
    "total": 599.98,
    "status": "待处理",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 获取用户订单列表
```
GET /api/orders
```

请求头：
```
x-session-id: <用户会话ID>
```

#### 获取订单详情
```
GET /api/orders/:orderId
```

请求头：
```
x-session-id: <用户会话ID>
```

参数：
- `orderId`: 订单ID

### 4. 健康检查
```
GET /api/health
```

响应示例：
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "productsCount": 8,
  "ordersCount": 5
}
```

## 错误处理

所有API在出错时返回以下格式：

```json
{
  "error": "错误描述信息"
}
```

HTTP状态码：
- 200: 成功
- 400: 请求参数错误
- 404: 资源不存在
- 500: 服务器内部错误

## 会话管理

购物车和订单功能需要会话ID来标识用户。前端应在首次访问时生成一个会话ID，并在后续请求中通过 `x-session-id` 请求头传递。

生成会话ID的JavaScript示例：
```javascript
function getSessionId() {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
}
```