# 蓝牙耳机专卖网站 - 生产环境部署指南

## 安全修复总结

已完成以下安全漏洞修复：

### ✅ 已修复的安全问题
1. **硬编码JWT密钥** - 已改为环境变量管理
2. **数据库密码硬编码** - 已改为环境变量管理  
3. **缺少速率限制** - 已添加express-rate-limit保护登录/注册端点
4. **JWT过期时间过长** - 缩短为15分钟访问令牌 + 7天刷新令牌
5. **缺少安全HTTP头** - 已添加helmet.js设置
6. **CORS配置不足** - 已增强CORS安全配置
7. **缺少请求验证** - 已添加请求大小和类型检查

## 生产环境部署步骤

### 1. 环境准备

```bash
# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env
```

### 2. 配置环境变量 (.env)

编辑 `.env` 文件，设置以下关键配置：

```env
# ========== 必须修改的配置 ==========
NODE_ENV=production
JWT_SECRET=your_strong_jwt_secret_key_min_32_chars_here
JWT_REFRESH_TOKEN_SECRET=your_different_refresh_token_secret_here
DB_PASSWORD=your_strong_database_password_here

# ========== 数据库配置 ==========
DB_HOST=your_production_db_host
DB_USER=your_production_db_user
DB_NAME=claude_mall_production

# ========== 安全建议配置 ==========
DB_SSL=true  # 如果数据库支持SSL
```

### 3. 生成安全密钥

```bash
# 生成JWT密钥（32字符以上）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成刷新令牌密钥（不同密钥）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 数据库安全设置

1. **创建专用数据库用户**：
   ```sql
   CREATE USER 'claude_mall_user'@'%' IDENTIFIED BY 'strong_password_here';
   GRANT SELECT, INSERT, UPDATE, DELETE ON claude_mall_production.* TO 'claude_mall_user'@'%';
   FLUSH PRIVILEGES;
   ```

2. **启用SSL连接**（如果数据库支持）

### 5. 启动前安全检查

```bash
# 运行安全检查
npm run security:check

# 预期输出：
# 🔒 安全配置检查:
#    环境: production
#    JWT密钥已设置: true
#   数据库密码已设置: true
#   使用HTTPS: true
# ✅ 安全配置检查完成
```

### 6. 启动生产服务器

```bash
# 设置环境变量
export NODE_ENV=production

# 启动服务器
npm run api
```

## 安全监控和维护

### 定期任务

1. **密钥轮换**：
   - 每3-6个月轮换JWT密钥
   - 更新环境变量后重启服务

2. **日志监控**：
   ```bash
   # 监控安全相关日志
   tail -f logs/access.log | grep -E "(429|401|403|failed.*login|suspicious)"
   ```

3. **依赖更新**：
   ```bash
   # 定期更新安全依赖
   npm audit
   npm update helmet express-rate-limit
   ```

### 安全测试

```bash
# 运行完整安全测试
npm run test:security

# 测试速率限制
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"wrong"}' \
  -w "\nHTTP Status: %{http_code}\n"
```

## 防火墙配置

### 必要端口
- `3000` - API服务器端口
- `3306` - MySQL数据库端口（仅限内网访问）

### 推荐配置
```bash
# 只允许特定IP访问数据库
iptables -A INPUT -p tcp --dport 3306 -s 10.0.0.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 3306 -j DROP

# 限制API访问频率
iptables -A INPUT -p tcp --dport 3000 -m limit --limit 100/minute -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j DROP
```

## HTTPS配置（生产环境必须）

### 使用Nginx反向代理
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    # 安全SSL配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # 安全头
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
}
```

## 应急响应

### 发现安全事件时

1. **立即操作**：
   ```bash
   # 1. 停止服务
   pm2 stop all
   
   # 2. 轮换所有密钥
   # 更新.env文件中的：
   # - JWT_SECRET
   # - JWT_REFRESH_TOKEN_SECRET  
   # - DB_PASSWORD
   
   # 3. 检查日志
   tail -n 1000 logs/error.log | grep -i "attack\|brute\|inject"
   
   # 4. 重启服务
   pm2 start all
   ```

2. **调查步骤**：
   - 检查数据库异常查询
   - 审查API访问日志
   - 验证用户账户安全

## 备份策略

### 数据库备份
```bash
# 每日备份
mysqldump -u username -p claude_mall_production > backup_$(date +%Y%m%d).sql

# 加密备份
gpg -c backup_$(date +%Y%m%d).sql
```

### 环境变量备份
```bash
# 备份加密的环境变量
gpg -c .env
```

## 联系支持

如遇安全问题，请立即：
1. 联系系统管理员
2. 暂停受影响服务
3. 保留相关日志证据

---

**最后更新**: 2026-04-04  
**安全版本**: v2.0  
**审核状态**: ✅ 已通过安全审查