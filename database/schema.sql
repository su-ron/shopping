-- 蓝牙耳机专卖网站数据库架构
-- 创建数据库
CREATE DATABASE IF NOT EXISTS bluetooth_earbuds_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bluetooth_earbuds_store;

-- 1. 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    role ENUM('customer', 'admin') DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username)
);

-- 2. 蓝牙耳机分类表（树状结构）
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INT DEFAULT NULL,
    image_url VARCHAR(500),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_parent (parent_id)
);

-- 3. 产品表（SPU级别 - 蓝牙耳机）
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2),
    stock_quantity INT DEFAULT 0,
    sold_count INT DEFAULT 0,
    category_id INT,
    brand VARCHAR(100),
    weight DECIMAL(8, 2),
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    video_url VARCHAR(500),
    specs JSON, -- 存储蓝牙耳机规格参数
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_category (category_id),
    INDEX idx_slug (slug),
    INDEX idx_price (price),
    INDEX idx_featured (is_featured),
    INDEX idx_active (is_active),
    INDEX idx_brand (brand)
);

-- 4. 产品SKU表（不同颜色/配置）
CREATE TABLE product_skus (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    spec_name VARCHAR(50) NOT NULL, -- 如：颜色、版本
    spec_value VARCHAR(100) NOT NULL, -- 如：黑色、标准版
    price DECIMAL(10, 2),
    stock_quantity INT DEFAULT 0,
    image_url VARCHAR(500),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_sku_code (sku_code),
    INDEX idx_spec (spec_name, spec_value)
);

-- 5. 产品图片表
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

-- 5. 购物车表
CREATE TABLE carts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_session (session_id)
);

-- 6. 购物车商品表
CREATE TABLE cart_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cart_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price_at_add DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_product (cart_id, product_id),
    INDEX idx_cart (cart_id),
    INDEX idx_product (product_id)
);

-- 7. 订单表
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    shipping_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    payment_method VARCHAR(50),
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    payment_id VARCHAR(100),
    shipping_address TEXT,
    billing_address TEXT,
    customer_name VARCHAR(100),
    customer_email VARCHAR(100),
    customer_phone VARCHAR(20),
    notes TEXT,
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- 8. 订单商品表
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
);

-- 9. 支付记录表
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
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order (order_id),
    INDEX idx_transaction (transaction_id),
    INDEX idx_status (status)
);

-- 10. 退款记录表
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
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_payment (payment_id),
    INDEX idx_order (order_id),
    INDEX idx_refund_no (refund_no),
    INDEX idx_status (status)
);

-- 11. 产品评价表
CREATE TABLE reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    order_id INT,
    rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    UNIQUE KEY unique_product_user (product_id, user_id),
    INDEX idx_product (product_id),
    INDEX idx_user (user_id),
    INDEX idx_rating (rating)
);

-- 12. 搜索历史表
CREATE TABLE search_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    search_query VARCHAR(200) NOT NULL,
    search_results_count INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_query (search_query(50)),
    INDEX idx_created_at (created_at)
);

-- 13. 管理员操作日志表
CREATE TABLE admin_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INT,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_admin (admin_id),
    INDEX idx_action (action_type),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at)
);

-- 插入初始数据

-- 插入默认管理员用户 (密码: admin123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@earbudsstore.com', '$2b$10$YourHashedPasswordHere', '系统管理员', 'admin');

-- 插入蓝牙耳机分类（树状结构）
INSERT INTO categories (name, slug, description, parent_id, display_order) VALUES
-- 一级分类
('真无线耳机', 'tws-earbuds', 'TWS真无线蓝牙耳机', NULL, 1),
('骨传导耳机', 'bone-conduction', '骨传导运动耳机', NULL, 2),
('颈挂式耳机', 'neckband', '颈挂式蓝牙耳机', NULL, 3),
('头戴式耳机', 'over-ear', '头戴式蓝牙耳机', NULL, 4),

-- 二级分类（真无线耳机的子分类）
('降噪耳机', 'noise-cancelling', '主动降噪真无线耳机', 1, 1),
('运动耳机', 'sports', '防水防汗运动耳机', 1, 2),
('游戏耳机', 'gaming', '低延迟游戏耳机', 1, 3),
('入门款', 'entry-level', '高性价比入门款', 1, 4),

-- 二级分类（其他）
('开放式耳机', 'open-ear', '半入耳/开放式耳机', NULL, 5);

-- 插入蓝牙耳机产品（15个示例）
INSERT INTO products (name, slug, description, short_description, price, original_price, stock_quantity, category_id, brand, is_featured, specs) VALUES
-- 1. 高端降噪耳机
('Pro ANC 真无线降噪耳机', 'pro-anc-tws', '旗舰级主动降噪，35dB深度降噪，Hi-Res音质，40小时续航', '旗舰降噪，极致音质', 899.00, 1299.00, 50, 5, 'SoundMaster', TRUE,
 '{"蓝牙版本": "5.3", "降噪类型": "主动降噪 ANC（最高35dB）", "电池续航": "单次8小时 + 充电仓总40小时", "防水等级": "IPX5", "驱动单元": "10mm 复合振膜", "音频编解码": "SBC / AAC / LDAC", "重量": "单耳4.2g", "适用场景": "通勤、办公、旅行", "充电接口": "Type-C", "无线充电": "支持", "通透模式": "支持"}'),

-- 2. 运动耳机
('Sport X1 防水运动耳机', 'sport-x1-waterproof', 'IPX7级防水，耳翼防脱落设计，30小时续航，专为运动设计', '运动防水，稳固佩戴', 399.00, 599.00, 100, 6, 'FitAudio', TRUE,
 '{"蓝牙版本": "5.2", "降噪类型": "被动降噪", "电池续航": "单次6小时 + 充电仓总30小时", "防水等级": "IPX7", "驱动单元": "8mm 动圈", "音频编解码": "SBC / AAC", "重量": "单耳5.1g", "适用场景": "跑步、健身、游泳", "充电接口": "Type-C", "无线充电": "不支持", "通透模式": "不支持"}'),

-- 3. 游戏耳机
('Game Pro 低延迟游戏耳机', 'game-pro-low-latency', '60ms超低延迟，游戏模式，RGB灯效，ENC通话降噪', '游戏专用，超低延迟', 499.00, 699.00, 80, 7, 'GameSound', TRUE,
 '{"蓝牙版本": "5.3", "降噪类型": "ENC通话降噪", "电池续航": "单次7小时 + 充电仓总35小时", "防水等级": "IPX4", "驱动单元": "9mm 石墨烯", "音频编解码": "SBC / AAC / aptX LL", "重量": "单耳4.8g", "适用场景": "游戏、电竞、直播", "充电接口": "Type-C", "无线充电": "支持", "延迟": "60ms"}'),

-- 4. 入门款耳机
('Basic TWS 入门级耳机', 'basic-tws-entry', '高性价比入门款，20小时续航，轻巧舒适，适合日常使用', '入门首选，性价比高', 199.00, 299.00, 200, 8, 'SoundValue', FALSE,
 '{"蓝牙版本": "5.1", "降噪类型": "被动降噪", "电池续航": "单次5小时 + 充电仓总20小时", "防水等级": "IPX4", "驱动单元": "6mm 动圈", "音频编解码": "SBC", "重量": "单耳3.9g", "适用场景": "日常使用、学习", "充电接口": "Micro-USB", "无线充电": "不支持", "通透模式": "不支持"}'),

-- 5. 骨传导耳机
('Bone Conduction Pro 骨传导耳机', 'bone-conduction-pro', '开放双耳设计，IP68防水防尘，8小时续航，运动安全', '骨传导，运动更安全', 699.00, 899.00, 60, 2, 'SafeSound', TRUE,
 '{"蓝牙版本": "5.2", "降噪类型": "无降噪", "电池续航": "单次8小时", "防水等级": "IP68", "驱动单元": "骨传导振子", "音频编解码": "SBC / AAC", "重量": "28g", "适用场景": "跑步、骑行、户外", "充电接口": "Type-C", "无线充电": "不支持", "存储": "8GB内置存储"}'),

-- 6. 颈挂式耳机
('Neckband Sport 颈挂式运动耳机', 'neckband-sport', '磁吸收纳，IPX5防水，12小时续航，颈挂式设计', '颈挂设计，运动更稳', 349.00, 499.00, 120, 3, 'NeckAudio', FALSE,
 '{"蓝牙版本": "5.0", "降噪类型": "被动降噪", "电池续航": "12小时", "防水等级": "IPX5", "驱动单元": "9mm 动圈", "音频编解码": "SBC / AAC", "重量": "32g", "适用场景": "运动、通勤", "充电接口": "Type-C", "无线充电": "不支持", "磁吸收纳": "支持"}'),

-- 7. 头戴式降噪耳机
('Over-Ear ANC 头戴式降噪耳机', 'over-ear-anc', '包耳式设计，45dB深度降噪，60小时续航，Hi-Fi音质', '头戴降噪，沉浸体验', 1299.00, 1799.00, 30, 4, 'AudioPro', TRUE,
 '{"蓝牙版本": "5.3", "降噪类型": "主动降噪 ANC（最高45dB）", "电池续航": "60小时（降噪开）", "防水等级": "无", "驱动单元": "40mm 复合振膜", "音频编解码": "SBC / AAC / aptX HD / LDAC", "重量": "265g", "适用场景": "旅行、办公、音乐欣赏", "充电接口": "Type-C", "无线充电": "支持", "折叠设计": "支持"}'),

-- 8. 开放式耳机
('Open Ear Comfort 开放式耳机', 'open-ear-comfort', '半入耳设计，舒适佩戴，24小时续航，环境音通透', '舒适佩戴，全天候使用', 449.00, 599.00, 90, 9, 'ComfortSound', FALSE,
 '{"蓝牙版本": "5.2", "降噪类型": "无降噪", "电池续航": "单次6小时 + 充电仓总24小时", "防水等级": "IPX4", "驱动单元": "14.2mm 动圈", "音频编解码": "SBC / AAC", "重量": "单耳4.5g", "适用场景": "办公、学习、日常", "充电接口": "Type-C", "无线充电": "支持", "佩戴方式": "半入耳"}'),

-- 9. 睡眠耳机
('Sleep Buds 睡眠耳机', 'sleep-buds', '超小体积，侧睡无感，白噪音助眠，8小时续航', '专为睡眠设计', 299.00, 399.00, 70, 8, 'SleepAudio', FALSE,
 '{"蓝牙版本": "5.0", "降噪类型": "被动降噪", "电池续航": "8小时", "防水等级": "IPX4", "驱动单元": "6mm 微动圈", "音频编解码": "SBC", "重量": "单耳2.8g", "适用场景": "睡眠、冥想", "充电接口": "Type-C", "无线充电": "不支持", "侧睡设计": "优化"}'),

-- 10. 商务耳机
('Business Pro 商务降噪耳机', 'business-pro', '4麦克风ENC降噪，无线充电，30小时续航，商务设计', '商务通话，清晰降噪', 799.00, 1099.00, 40, 5, 'BizAudio', TRUE,
 '{"蓝牙版本": "5.3", "降噪类型": "4麦克风ENC通话降噪", "电池续航": "单次7小时 + 充电仓总30小时", "防水等级": "IPX4", "驱动单元": "10mm 动圈", "音频编解码": "SBC / AAC / aptX", "重量": "单耳5.2g", "适用场景": "商务、会议、通话", "充电接口": "Type-C", "无线充电": "支持", "多设备连接": "支持"}'),

-- 11. 学生款耳机
('Student Edition 学生耳机', 'student-edition', '经济实惠，25小时续航，轻便耐用，学习专用', '学生优选，经济耐用', 159.00, 229.00, 150, 8, 'EduSound', FALSE,
 '{"蓝牙版本": "5.0", "降噪类型": "被动降噪", "电池续航": "单次5小时 + 充电仓总25小时", "防水等级": "IPX4", "驱动单元": "6mm 动圈", "音频编解码": "SBC", "重量": "单耳3.7g", "适用场景": "学习、网课、日常", "充电接口": "Micro-USB", "无线充电": "不支持", "学习模式": "专注模式"}'),

-- 12. 女性款耳机
('Ladies Edition 女性耳机', 'ladies-edition', '小巧精致，多彩配色，舒适佩戴，女性专属设计', '女性专属，时尚设计', 369.00, 499.00, 80, 6, 'LadyAudio', FALSE,
 '{"蓝牙版本": "5.2", "降噪类型": "被动降噪", "电池续航": "单次6小时 + 充电仓总30小时", "防水等级": "IPX5", "驱动单元": "8mm 动圈", "音频编解码": "SBC / AAC", "重量": "单耳4.1g", "适用场景": "日常、运动、通勤", "充电接口": "Type-C", "无线充电": "支持", "配色": "樱花粉、薄荷绿、薰衣草紫"}'),

-- 13. 复古款耳机
('Retro Classic 复古耳机', 'retro-classic', '复古设计，物理按键，30小时续航，经典造型', '复古设计，经典重现', 429.00, 569.00, 60, 3, 'RetroSound', FALSE,
 '{"蓝牙版本": "5.1", "降噪类型": "被动降噪", "电池续航": "15小时", "防水等级": "IPX4", "驱动单元": "10mm 动圈", "音频编解码": "SBC / AAC", "重量": "35g", "适用场景": "日常、复古爱好者", "充电接口": "Type-C", "无线充电": "不支持", "控制方式": "物理按键"}'),

-- 14. 儿童耳机
('Kids Safe 儿童耳机', 'kids-safe', '音量限制，安全材质，可爱造型，专为儿童设计', '儿童专用，安全第一', 199.00, 299.00, 100, 8, 'KidSafe', FALSE,
 '{"蓝牙版本": "5.0", "降噪类型": "被动降噪", "电池续航": "单次4小时 + 充电仓总16小时", "防水等级": "IPX4", "驱动单元": "6mm 动圈", "音频编解码": "SBC", "重量": "单耳3.5g", "适用场景": "儿童学习、娱乐", "充电接口": "Type-C", "无线充电": "不支持", "音量限制": "85dB以下"}'),

-- 15. 限量版耳机
('Limited Edition 限量版耳机', 'limited-edition', '限量发售，特殊工艺，专属编号，收藏价值', '限量发售，收藏珍品', 1499.00, 1999.00, 20, 5, 'LuxuryAudio', TRUE,
 '{"蓝牙版本": "5.3", "降噪类型": "主动降噪 ANC（最高40dB）", "电池续航": "单次8小时 + 充电仓总40小时", "防水等级": "IPX6", "驱动单元": "12mm 镀钛振膜", "音频编解码": "SBC / AAC / aptX HD / LDAC", "重量": "单耳4.5g", "适用场景": "收藏、高端用户", "充电接口": "Type-C", "无线充电": "支持", "材质": "钛合金+陶瓷", "限量编号": "每副唯一"}');

-- 插入产品SKU（颜色/配置）
INSERT INTO product_skus (product_id, sku_code, spec_name, spec_value, price, stock_quantity, is_default) VALUES
-- Pro ANC 真无线降噪耳机（3种颜色）
(1, 'BE-ANC-BK-01', '颜色', '黑色', 899.00, 20, TRUE),
(1, 'BE-ANC-WH-01', '颜色', '白色', 899.00, 15, FALSE),
(1, 'BE-ANC-BL-01', '颜色', '蓝色', 899.00, 15, FALSE),

-- Sport X1 防水运动耳机（2种颜色）
(2, 'BE-SPT-BK-01', '颜色', '黑色', 399.00, 50, TRUE),
(2, 'BE-SPT-GN-01', '颜色', '绿色', 399.00, 50, FALSE),

-- Game Pro 低延迟游戏耳机（2种配置）
(3, 'BE-GAM-STD-01', '版本', '标准版', 499.00, 40, TRUE),
(3, 'BE-GAM-PRO-01', '版本', 'Pro版（带RGB）', 599.00, 40, FALSE),

-- Basic TWS 入门级耳机（4种颜色）
(4, 'BE-BAS-BK-01', '颜色', '黑色', 199.00, 50, TRUE),
(4, 'BE-BAS-WH-01', '颜色', '白色', 199.00, 50, FALSE),
(4, 'BE-BAS-RD-01', '颜色', '红色', 199.00, 50, FALSE),
(4, 'BE-BAS-BL-01', '颜色', '蓝色', 199.00, 50, FALSE),

-- Bone Conduction Pro 骨传导耳机
(5, 'BE-BON-BK-01', '颜色', '黑色', 699.00, 30, TRUE),
(5, 'BE-BON-GY-01', '颜色', '灰色', 699.00, 30, FALSE),

-- Ladies Edition 女性耳机（3种颜色）
(12, 'BE-LAD-PK-01', '颜色', '樱花粉', 369.00, 30, TRUE),
(12, 'BE-LAD-GN-01', '颜色', '薄荷绿', 369.00, 25, FALSE),
(12, 'BE-LAD-PP-01', '颜色', '薰衣草紫', 369.00, 25, FALSE),

-- Limited Edition 限量版耳机（带编号）
(15, 'BE-LIM-001', '编号', '001/500', 1499.00, 1, TRUE),
(15, 'BE-LIM-002', '编号', '002/500', 1499.00, 1, FALSE),
(15, 'BE-LIM-003', '编号', '003/500', 1499.00, 1, FALSE);

-- 插入产品图片（每个产品5-8张图片）
INSERT INTO product_images (product_id, image_url, alt_text, image_type, display_order) VALUES
-- Pro ANC 真无线降噪耳机
(1, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Pro ANC 真无线降噪耳机主图', 'main', 1),
(1, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Pro ANC 耳机侧面', 'angle', 2),
(1, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Pro ANC 充电仓', 'detail', 3),
(1, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Pro ANC 佩戴效果', 'scene', 4),
(1, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Pro ANC 包装盒', 'package', 5),

-- Sport X1 防水运动耳机
(2, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Sport X1 防水运动耳机主图', 'main', 1),
(2, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Sport X1 防水测试', 'scene', 2),
(2, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Sport X1 运动佩戴', 'scene', 3),

-- Game Pro 低延迟游戏耳机
(3, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Game Pro 低延迟游戏耳机主图', 'main', 1),
(3, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Game Pro RGB灯效', 'detail', 2),
(3, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Game Pro 游戏场景', 'scene', 3),

-- Basic TWS 入门级耳机
(4, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Basic TWS 入门级耳机主图', 'main', 1),
(4, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Basic TWS 多色展示', 'angle', 2),

-- Bone Conduction Pro 骨传导耳机
(5, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', 'Bone Conduction Pro 骨传导耳机主图', 'main', 1),
(5, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', '骨传导佩戴示意图', 'scene', 2),
(5, 'https://images.unsplash.com/photo-1590658165737-15a047b8b5e7', '骨传导户外运动', 'scene', 3);

-- 创建视图

-- 产品详情视图
CREATE VIEW product_details AS
SELECT
    p.*,
    c.name as category_name,
    c.slug as category_slug,
    pi.image_url as primary_image,
    (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as approved_reviews_count,
    (SELECT AVG(rating) FROM reviews r WHERE r.product_id = p.id AND r.is_approved = TRUE) as average_rating
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
WHERE p.is_active = TRUE;

-- 订单详情视图
CREATE VIEW order_details AS
SELECT
    o.*,
    u.username,
    u.email as user_email,
    u.full_name as user_full_name,
    COUNT(oi.id) as item_count,
    SUM(oi.quantity) as total_quantity
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;

-- 创建存储过程

-- 更新产品评分
DELIMITER //
CREATE PROCEDURE update_product_rating(IN product_id_param INT)
BEGIN
    DECLARE avg_rating DECIMAL(3,2);
    DECLARE review_count INT;

    SELECT AVG(rating), COUNT(*) INTO avg_rating, review_count
    FROM reviews
    WHERE product_id = product_id_param AND is_approved = TRUE;

    UPDATE products
    SET rating = COALESCE(avg_rating, 0.00),
        review_count = COALESCE(review_count, 0)
    WHERE id = product_id_param;
END //
DELIMITER ;

-- 创建订单触发器
DELIMITER //
CREATE TRIGGER after_order_insert
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    -- 记录管理员操作日志
    INSERT INTO admin_logs (admin_id, action_type, resource_type, resource_id, details)
    VALUES (NEW.user_id, 'create', 'order', NEW.id, CONCAT('创建订单: ', NEW.order_number));
END //
DELIMITER ;

-- 创建触发器：订单商品插入时更新产品销量
DELIMITER //
CREATE TRIGGER after_order_item_insert
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    -- 更新产品销量
    UPDATE products
    SET sold_count = sold_count + NEW.quantity,
        stock_quantity = stock_quantity - NEW.quantity
    WHERE id = NEW.product_id;
END //
DELIMITER ;

-- 创建索引优化查询性能
CREATE INDEX idx_products_search ON products(name, description(100), short_description(100));
CREATE INDEX idx_orders_date_user ON orders(created_at DESC, user_id);
CREATE INDEX idx_products_price_stock ON products(price, stock_quantity, is_active);

-- 创建数据库用户（生产环境使用）
-- CREATE USER 'claude_mall_user'@'localhost' IDENTIFIED BY 'secure_password_123';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON claude_mall.* TO 'claude_mall_user'@'localhost';
-- FLUSH PRIVILEGES;