# 蓝牙耳机专卖网购网站 - API服务器

## 项目概述

这是一个完整的蓝牙耳机专卖网购网站后端API系统，基于Node.js + Express + MySQL构建。系统包含用户认证、产品管理、购物车、订单管理、支付集成等功能。

## 技术栈

- **后端框架**: Node.js + Express
- **数据库**: MySQL 8.0+
- **认证**: JWT (JSON Web Token)
- **密码加密**: bcrypt
- **数据验证**: Joi
- **跨域**: CORS

## 快速开始

### 1. 环境要求

- Node.js 16+
- MySQL 8.0+
- npm 或 yarn

### 2. 安装依赖

```bash
npm install
```

### 3. 数据库设置

1. 创建数据库：
```sql
CREATE DATABASE bluetooth_earbuds_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 导入数据库架构：
```bash
mysql -u root -p bluetooth_earbuds_store < database/schema.sql
```

3. 配置数据库连接：
编辑 `database/config.js` 文件，设置正确的数据库连接信息。

### 4. 启动服务器

#### 方式一：同时启动前端和后端（推荐）
```bash
npm run dev:all
```

这将同时启动：
- 前端静态服务器：http://localhost:8000
- 后端API服务器：http://localhost:3000

#### 方式二：单独启动后端API
```bash
npm run api:dev
```

后端API服务器将在 http://localhost:3000 启动。

#### 方式三：单独启动前端
```bash
npm run dev
```

前端静态服务器将在 http://localhost:8000 启动。

## API文档

### 认证API

#### 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "full_name": "测试用户",
  "phone": "13800138000"
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

#### 获取用户信息
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### 更新用户信息
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "新姓名",
  "phone": "13900139000"
}
```

### 产品API

#### 获取产品列表
```http
GET /api/products?page=1&limit=20&category=1&brand=SoundMaster&minPrice=100&maxPrice=1000&sortBy=price&sortOrder=asc&search=降噪
```

#### 获取产品详情
```http
GET /api/products/1
```

#### 获取产品分类
```http
GET /api/products/categories/all
```

#### 获取热门产品
```http
GET /api/products/featured/products?limit=8
```

### 购物车API（需要认证）

#### 获取购物车
```http
GET /api/cart
Authorization: Bearer <token>
```

#### 添加商品到购物车
```http
POST /api/cart/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 2,
  "sku_id": 1
}
```

#### 更新购物车商品数量
```http
PUT /api/cart/item/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3
}
```

#### 移除购物车商品
```http
DELETE /api/cart/item/1
Authorization: Bearer <token>
```

### 订单API（需要认证）

#### 创建订单
```http
POST /api/orders/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "shipping_address": "北京市朝阳区xxx",
  "customer_name": "张三",
  "customer_phone": "13800138000",
  "cart_items": [
    {
      "product_id": 1,
      "quantity": 1,
      "price": 899.00
    }
  ]
}
```

#### 获取订单列表
```http
GET /api/orders?page=1&limit=10&status=pending
Authorization: Bearer <token>
```

#### 获取订单详情
```http
GET /api/orders/1
Authorization: Bearer <token>
```

#### 取消订单
```http
PUT /api/orders/1/cancel
Authorization: Bearer <token>
```

### 管理员API（需要管理员权限）

#### 获取仪表板统计
```http
GET /api/admin/dashboard/stats
Authorization: Bearer <admin_token>
```

#### 用户管理
```http
GET /api/admin/users?page=1&limit=20&role=customer&is_active=true&search=test
PUT /api/admin/users/1
DELETE /api/admin/users/1
Authorization: Bearer <admin_token>
```

#### 产品管理
```http
POST /api/admin/products
PUT /api/admin/products/1
DELETE /api/admin/products/1
Authorization: Bearer <admin_token>
```

#### 订单管理
```http
GET /api/admin/orders?page=1&limit=20&status=pending
PUT /api/admin/orders/1/status
PUT /api/admin/orders/1/ship
Authorization: Bearer <admin_token>
```

## 数据库架构

数据库包含以下主要表：

1. **users** - 用户表
2. **categories** - 分类表（树状结构）
3. **products** - 产品表（蓝牙耳机SPU）
4. **product_skus** - 产品SKU表（颜色/配置）
5. **product_images** - 产品图片表
6. **carts** - 购物车表
7. **cart_items** - 购物车商品表
8. **orders** - 订单表
9. **order_items** - 订单商品表
10. **payments** - 支付记录表
11. **reviews** - 产品评价表
12. **search_history** - 搜索历史表
13. **admin_logs** - 管理员操作日志表

## 测试

### 运行认证系统测试
```bash
node test-auth.js
```

确保API服务器已启动（http://localhost:3000）。

### 测试数据

数据库已包含以下测试数据：

1. **用户**：
   - 管理员：admin / admin123
   - 15个蓝牙耳机产品，包含详细的规格参数
   - 产品SKU（颜色/配置）
   - 产品图片

2. **蓝牙耳机分类**：
   - 一级分类：真无线耳机、骨传导耳机、颈挂式耳机、头戴式耳机
   - 二级分类：降噪耳机、运动耳机、游戏耳机、入门款等

## 项目结构

```
ecommerce-website/
├── app.js                    # Express应用主文件
├── server-express.js         # Express服务器启动文件
├── server.js                 # 前端静态服务器
├── package.json
├── README-API.md            # API文档
├── test-auth.js             # 认证测试脚本
│
├── controllers/             # 控制器
│   └── authController.js    # 认证控制器
│
├── middleware/              # 中间件
│   └── auth.js             # 认证中间件
│
├── models/                  # 数据模型
│   ├── User.js             # 用户模型
│   ├── Product.js          # 产品模型
│   ├── Cart.js             # 购物车模型
│   └── Order.js            # 订单模型
│
├── routes/                  # 路由
│   ├── authRoutes.js       # 认证路由
│   ├── productRoutes.js    # 产品路由
│   ├── cartRoutes.js       # 购物车路由
│   ├── orderRoutes.js      # 订单路由
│   └── adminRoutes.js      # 管理员路由
│
├── database/               # 数据库配置
│   ├── config.js          # 数据库配置
│   ├── connection.js      # 数据库连接
│   └── schema.sql         # 数据库架构
│
├── frontend/              # 前端文件
│   ├── index.html         # 主页面
│   ├── style.css          # 样式文件
│   └── script.js          # 前端JavaScript
│
└── node_modules/          # 依赖包
```

## 下一步开发计划

1. **支付集成** - 支付宝扫码支付 + 微信扫码支付
2. **搜索功能** - 商品搜索API和前端搜索界面
3. **图片上传** - 支持本地上传产品图片
4. **前端界面更新** - 适配蓝牙耳机特性，优化用户体验
5. **管理员后台** - 完整的商品管理和订单管理界面

## 故障排除

### 数据库连接失败
1. 检查MySQL服务是否运行
2. 检查`database/config.js`中的连接信息
3. 确保数据库`bluetooth_earbuds_store`已创建

### 端口被占用
1. 检查端口3000和8000是否被其他程序占用
2. 可以修改`server-express.js`和`server.js`中的端口号

### 认证失败
1. 确保请求头中包含正确的Authorization头
2. 检查JWT令牌是否过期
3. 验证用户是否被禁用

## 许可证

MIT License