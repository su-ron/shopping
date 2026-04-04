# 支付集成功能说明

## 概述

本系统实现了支付宝扫码支付和微信扫码支付功能，支持沙箱环境测试和模拟支付。支付系统采用异步回调 + 前端轮询的方式确保支付状态的实时更新。

## 功能特性

### 1. 支付方式
- **支付宝扫码支付**：电脑网站支付模式
- **微信扫码支付**：Native支付模式

### 2. 核心功能
- 支付页面展示订单信息
- 支付方式选择（支付宝/微信图标）
- 大尺寸二维码生成与展示
- 支付金额、订单号、剩余支付时间显示
- 二维码刷新功能
- 支付成功后自动跳转
- 支付超时自动取消订单（30分钟）
- 异步回调处理
- 前端轮询查询支付状态

### 3. 开发环境特性
- 支付宝沙箱环境支持
- 微信支付沙箱环境支持
- 模拟支付功能（仅开发环境）
- 支付回调模拟

## 数据库结构

### 支付相关表

#### 1. payments表（已存在）
```sql
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_gateway VARCHAR(50),
    transaction_id VARCHAR(100) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CNY',
    status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
    gateway_response TEXT,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

#### 2. refunds表（新增）
```sql
CREATE TABLE refunds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_id INT NOT NULL,
    order_id INT NOT NULL,
    refund_no VARCHAR(50) UNIQUE NOT NULL,
    refund_amount DECIMAL(10, 2) NOT NULL,
    refund_reason TEXT,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    gateway_response TEXT,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

## API接口

### 支付相关接口

#### 1. 创建支付
```
POST /api/payments/create
Headers: Authorization: Bearer {token}
Body: {
    "order_id": 1,
    "payment_method": "alipay"  // 或 "wechat"
}
```

#### 2. 获取支付二维码
```
GET /api/payments/{payment_id}/qrcode
Headers: Authorization: Bearer {token}
```

#### 3. 查询支付状态
```
GET /api/payments/{payment_id}/status
Headers: Authorization: Bearer {token}
```

#### 4. 支付宝回调接口
```
GET/POST /api/payments/callback/alipay
Body: 支付宝回调参数
```

#### 5. 微信支付回调接口
```
POST /api/payments/callback/wechat
Body: 微信支付回调XML
```

#### 6. 退款申请
```
POST /api/payments/refund
Headers: Authorization: Bearer {token}
Body: {
    "payment_id": 1,
    "refund_amount": 100.00,
    "refund_reason": "商品质量问题"
}
```

#### 7. 模拟支付（仅开发环境）
```
POST /api/payments/simulate
Headers: Authorization: Bearer {token}
Body: {
    "payment_id": 1
}
```

## 前端页面

### 1. 支付页面
**文件**: `payment.html`
**访问方式**: `payment.html?order_id={订单ID}`

#### 页面功能
- 显示订单信息（商品、金额、地址）
- 支付方式选择（支付宝/微信图标）
- 二维码展示区域
- 30分钟倒计时
- 刷新二维码按钮
- 检查支付状态按钮
- 模拟支付按钮（仅开发环境）

### 2. 订单详情页面
**文件**: `order-detail.html`
**访问方式**: `order-detail.html?order_id={订单ID}`

#### 页面功能
- 订单状态时间线
- 订单详细信息
- 支付详情展示
- 订单商品列表
- 订单金额汇总
- 状态相关操作按钮

## 支付流程

### 1. 用户支付流程
1. 用户在订单确认页提交订单，生成"待支付"订单
2. 跳转至支付页面 (`payment.html?order_id={订单ID}`)
3. 选择支付方式（支付宝或微信）
4. 后端调用支付平台接口生成二维码
5. 前端展示二维码图片
6. 用户使用支付宝/微信App扫描二维码完成支付
7. 支付平台异步回调后端接口
8. 后端验证后更新订单状态为"已支付"，扣减库存
9. 前端通过轮询查询订单状态，支付成功后跳转到订单详情页

### 2. 支付回调流程
```
用户支付 → 支付平台 → 异步回调 → 后端验证 → 更新状态 → 前端轮询 → 页面跳转
```

### 3. 支付超时处理
- 支付创建后30分钟内未支付，订单自动取消
- 前端显示30分钟倒计时
- 后端定时任务清理过期支付记录

## 开发环境配置

### 1. 环境变量
在 `.env` 文件中添加支付相关配置：

```env
# 支付配置
PAYMENT_TIMEOUT_MINUTES=30
ALIPAY_SANDBOX_MODE=true
WECHAT_SANDBOX_MODE=true

# 支付宝沙箱配置（生产环境需要真实配置）
ALIPAY_APP_ID=2021000123456789
ALIPAY_PRIVATE_KEY=your_private_key
ALIPAY_PUBLIC_KEY=your_public_key
ALIPAY_NOTIFY_URL=https://your-domain.com/api/payments/callback/alipay

# 微信支付沙箱配置（生产环境需要真实配置）
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_MCH_ID=1234567890
WECHAT_API_KEY=your_api_key
WECHAT_NOTIFY_URL=https://your-domain.com/api/payments/callback/wechat
```

### 2. 数据库初始化
运行数据库schema文件创建支付相关表：
```bash
mysql -u root -p < database/schema.sql
```

### 3. 启动服务
```bash
# 启动后端API服务
npm run api:dev

# 或者启动完整服务
npm run dev:all
```

## 测试支付功能

### 1. 模拟支付测试
1. 登录系统并创建测试订单
2. 进入支付页面 (`payment.html?order_id={订单ID}`)
3. 选择支付方式
4. 点击"模拟支付"按钮（仅开发环境显示）
5. 系统将模拟支付成功并跳转到订单详情页

### 2. 支付回调测试
#### 支付宝回调测试：
```
GET http://localhost:3000/api/payments/callback/alipay?out_trade_no=PAY123456&trade_no=20240404123456&trade_status=TRADE_SUCCESS&total_amount=100.00
```

#### 微信支付回调测试：
```xml
POST http://localhost:3000/api/payments/callback/wechat
Content-Type: text/xml

<xml>
  <appid><![CDATA[wx1234567890abcdef]]></appid>
  <mch_id><![CDATA[1234567890]]></mch_id>
  <transaction_id><![CDATA[1008450740201411110005820873]]></transaction_id>
  <out_trade_no><![CDATA[PAY123456]]></out_trade_no>
  <result_code><![CDATA[SUCCESS]]></result_code>
  <total_fee>100</total_fee>
</xml>
```

### 3. 支付超时测试
1. 创建支付记录
2. 等待30分钟（或修改代码缩短超时时间）
3. 检查支付状态是否自动更新为"failed"
4. 检查订单状态是否自动更新为"cancelled"

## 生产环境部署

### 1. 配置真实支付信息
1. 申请支付宝开放平台商户账号
2. 申请微信支付商户账号
3. 更新环境变量中的真实配置
4. 关闭沙箱模式：
   ```env
   ALIPAY_SANDBOX_MODE=false
   WECHAT_SANDBOX_MODE=false
   ```

### 2. HTTPS配置
支付回调接口必须使用HTTPS：
1. 申请SSL证书
2. 配置Nginx/Apache反向代理
3. 更新支付平台回调地址为HTTPS

### 3. 安全配置
1. 验证支付回调签名
2. 限制支付回调IP（支付宝/微信官方IP）
3. 记录支付操作日志
4. 定期审计支付记录

### 4. 监控与告警
1. 监控支付成功率
2. 设置支付失败告警
3. 监控支付超时率
4. 定期对账

## 故障排除

### 常见问题

#### 1. 二维码无法显示
- 检查网络连接
- 检查API服务是否正常运行
- 检查支付记录是否创建成功
- 查看浏览器控制台错误信息

#### 2. 支付回调失败
- 检查回调URL是否正确配置
- 检查服务器是否支持HTTPS
- 检查防火墙设置
- 查看服务器日志

#### 3. 支付状态未更新
- 检查轮询接口是否正常工作
- 检查数据库连接
- 检查支付回调处理逻辑
- 查看支付平台交易状态

#### 4. 退款失败
- 检查支付状态是否为"success"
- 检查退款金额是否超过支付金额
- 检查库存恢复逻辑
- 查看数据库事务是否完整

### 日志查看
支付相关日志输出到控制台：
- 支付创建日志
- 二维码生成日志
- 支付回调日志
- 状态更新日志
- 错误日志

## 扩展开发

### 1. 添加新的支付方式
1. 在`Payment`模型中添加新的支付方法验证
2. 在`PaymentController`中添加新的回调处理
3. 在前端页面添加新的支付方式选项
4. 更新数据库枚举类型（如果需要）

### 2. 集成真实支付SDK
1. 安装支付宝/微信支付SDK
2. 实现真实的二维码生成
3. 实现真实的签名验证
4. 更新回调处理逻辑

### 3. 添加支付统计
1. 扩展`PaymentController.getPaymentStats`方法
2. 添加更多统计维度
3. 创建支付统计页面
4. 添加数据可视化

### 4. 优化支付体验
1. 添加支付进度条
2. 添加支付成功动画
3. 添加支付失败重试机制
4. 添加支付帮助文档

## 注意事项

1. **安全第一**：支付涉及资金安全，务必做好安全防护
2. **测试充分**：上线前充分测试所有支付场景
3. **监控到位**：实时监控支付系统运行状态
4. **备份重要**：定期备份支付相关数据
5. **合规经营**：遵守相关支付法规和政策

## 技术支持

如有问题，请参考：
1. 支付宝开放平台文档：https://open.alipay.com/
2. 微信支付开发文档：https://pay.weixin.qq.com/
3. 项目GitHub仓库：https://github.com/your-repo/ecommerce-website
4. 联系开发者：developer@example.com