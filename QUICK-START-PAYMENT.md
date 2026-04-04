# 支付功能快速启动指南

## 1. 环境准备

### 1.1 安装依赖
```bash
# 进入项目目录
cd ecommerce-website

# 安装依赖（如果尚未安装）
npm install

# 安装mysql2依赖（支付功能需要）
npm install mysql2
```

### 1.2 数据库设置
```bash
# 创建数据库并导入schema
mysql -u root -p < database/schema.sql
```

### 1.3 环境配置
确保 `.env` 文件包含以下配置：
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bluetooth_earbuds_store
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

## 2. 启动服务

### 2.1 启动后端API
```bash
# 方式1：启动Express API服务
npm run api:dev

# 方式2：启动完整服务（前端+后端）
npm run dev:all
```

### 2.2 验证服务运行
- 前端页面：http://localhost:8000
- 后端API：http://localhost:3000
- 健康检查：http://localhost:3000/api/health

## 3. 测试支付功能

### 3.1 准备测试数据
1. 确保数据库中有产品数据（schema.sql已包含15个蓝牙耳机产品）
2. 注册测试用户或使用默认管理员账户：
   - 用户名：admin
   - 密码：admin123

### 3.2 运行自动化测试
```bash
# 运行支付功能测试
node test-payment.js
```

测试脚本将执行以下步骤：
1. 用户登录
2. 创建测试订单
3. 创建支付宝支付
4. 获取支付二维码
5. 查询支付状态
6. 模拟支付回调（开发环境）
7. 验证支付结果

### 3.3 手动测试

#### 步骤1：创建订单
1. 访问 http://localhost:8000
2. 登录系统
3. 添加商品到购物车
4. 创建订单

#### 步骤2：进入支付页面
支付页面URL格式：`http://localhost:8000/payment.html?order_id={订单ID}`

#### 步骤3：测试支付流程
1. 选择支付方式（支付宝/微信）
2. 扫描显示的二维码
3. 在开发环境可使用"模拟支付"按钮
4. 支付成功后自动跳转到订单详情页

## 4. 支付页面说明

### 4.1 支付页面 (payment.html)
- **URL**: `payment.html?order_id={订单ID}`
- **功能**：
  - 显示订单信息
  - 选择支付方式
  - 展示支付二维码
  - 30分钟倒计时
  - 刷新二维码
  - 检查支付状态
  - 模拟支付（开发环境）

### 4.2 订单详情页面 (order-detail.html)
- **URL**: `order-detail.html?order_id={订单ID}`
- **功能**：
  - 显示订单状态时间线
  - 展示订单详细信息
  - 显示支付详情
  - 提供订单操作按钮

## 5. API接口测试

### 5.1 使用curl测试
```bash
# 1. 用户登录获取token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. 创建支付（使用上一步获取的token）
curl -X POST http://localhost:3000/api/payments/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"order_id":1,"payment_method":"alipay"}'

# 3. 获取支付状态
curl -X GET http://localhost:3000/api/payments/1/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.2 使用Postman测试
1. 导入Postman集合（可从API文档生成）
2. 设置环境变量：`base_url=http://localhost:3000`
3. 先执行登录请求获取token
4. 将token设置为全局变量
5. 测试支付相关接口

## 6. 开发环境特性

### 6.1 模拟支付
在开发环境（localhost或127.0.0.1）中，支付页面会显示"模拟支付"按钮，点击可模拟支付成功，无需真实扫码。

### 6.2 沙箱环境
- 支付宝：使用沙箱环境，无需真实商户号
- 微信支付：使用测试环境，无需真实商户号
- 二维码：使用在线二维码生成服务模拟

### 6.3 回调测试
```bash
# 支付宝回调测试
curl "http://localhost:3000/api/payments/callback/alipay?out_trade_no=PAY123456&trade_no=20240404123456&trade_status=TRADE_SUCCESS&total_amount=100.00"

# 微信支付回调测试
curl -X POST http://localhost:3000/api/payments/callback/wechat \
  -H "Content-Type: text/xml" \
  -d '<xml><appid><![CDATA[wx1234567890abcdef]]></appid><mch_id><![CDATA[1234567890]]></mch_id><transaction_id><![CDATA[1008450740201411110005820873]]></transaction_id><out_trade_no><![CDATA[PAY123456]]></out_trade_no><result_code><![CDATA[SUCCESS]]></result_code><total_fee>100</total_fee></xml>'
```

## 7. 故障排除

### 7.1 常见问题

#### 问题1：数据库连接失败
```
错误：ER_ACCESS_DENIED_ERROR: Access denied for user 'root'@'localhost'
```
**解决方案**：
1. 检查 `.env` 文件中的数据库配置
2. 确认MySQL服务正在运行
3. 验证用户名和密码是否正确

#### 问题2：支付页面无法加载
```
错误：Failed to load order information
```
**解决方案**：
1. 检查API服务是否运行：`http://localhost:3000/api/health`
2. 检查订单ID是否正确
3. 检查用户是否登录

#### 问题3：二维码无法显示
```
错误：二维码图片加载失败
```
**解决方案**：
1. 检查网络连接
2. 检查二维码生成API是否可访问
3. 查看浏览器控制台错误信息

#### 问题4：支付回调失败
```
错误：支付状态未更新
```
**解决方案**：
1. 检查回调URL配置
2. 查看服务器日志
3. 验证回调数据格式

### 7.2 日志查看
```bash
# 查看API服务日志
npm run api:dev 2>&1 | tee api.log

# 查看错误日志
tail -f api.log | grep -i error
```

## 8. 生产环境部署

### 8.1 配置真实支付信息
1. 申请支付宝商户账号
2. 申请微信支付商户账号
3. 更新 `.env` 文件中的支付配置
4. 关闭沙箱模式：
   ```env
   ALIPAY_SANDBOX_MODE=false
   WECHAT_SANDBOX_MODE=false
   ```

### 8.2 HTTPS配置
支付回调必须使用HTTPS：
1. 申请SSL证书
2. 配置Nginx反向代理
3. 更新支付平台回调地址

### 8.3 安全加固
1. 验证支付回调签名
2. 限制回调IP地址
3. 启用支付日志记录
4. 定期安全审计

## 9. 更多资源

### 9.1 文档链接
- [完整支付文档](README-PAYMENT.md)
- [API接口文档](README-API.md)
- [数据库设计](database/schema.sql)
- [安全配置](config/security.js)

### 9.2 技术支持
- 支付宝开放平台：https://open.alipay.com/
- 微信支付开发文档：https://pay.weixin.qq.com/
- MySQL文档：https://dev.mysql.com/doc/

### 9.3 联系支持
如有问题，请：
1. 查看相关文档
2. 检查错误日志
3. 提交GitHub Issue
4. 联系开发团队

---

**提示**：支付功能涉及资金安全，请在生产环境部署前进行充分测试！