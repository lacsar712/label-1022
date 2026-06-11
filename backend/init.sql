-- Influencer Management Platform Database Initialization
-- Ensure UTF-8 encoding

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS influencer_platform 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE influencer_platform;

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    permissions TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    role_id INT DEFAULT 3,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    parent_id INT,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Influencers table
CREATE TABLE IF NOT EXISTS influencers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    account_id VARCHAR(100),
    avatar VARCHAR(255),
    followers INT DEFAULT 0,
    category_id INT,
    contact_name VARCHAR(50),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    contact_wechat VARCHAR(50),
    tags VARCHAR(500),
    cost_per_post DECIMAL(12, 2) DEFAULT 0,
    engagement_rate DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_platform (platform),
    INDEX idx_category (category_id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Collaborations table
CREATE TABLE IF NOT EXISTS collaborations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    influencer_id INT NOT NULL,
    user_id INT NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12, 2) DEFAULT 0,
    actual_cost DECIMAL(12, 2) DEFAULT 0,
    content_type VARCHAR(50),
    content_requirements TEXT,
    deliverables TEXT,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_influencer (influencer_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    FOREIGN KEY (influencer_id) REFERENCES influencers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial roles
INSERT INTO roles (id, name, description, permissions) VALUES
(1, 'admin', '管理员', 'all'),
(2, 'operator', '运营人员', 'influencers,collaborations,categories'),
(3, 'user', '普通用户', 'read');

-- Insert initial admin user (password: 123456)
INSERT INTO users (username, password_hash, nickname, email, role_id, status) VALUES
('admin', '$2b$12$b2w3HFknNkunYeCTS1jmyuieCSCViQWQbjSYlN5NuxtIx2H0KeM7e', '系统管理员', 'admin@example.com', 1, 'active'),
('operator', '$2b$12$b2w3HFknNkunYeCTS1jmyuieCSCViQWQbjSYlN5NuxtIx2H0KeM7e', '运营张三', 'operator@example.com', 2, 'active'),
('user', '$2b$12$b2w3HFknNkunYeCTS1jmyuieCSCViQWQbjSYlN5NuxtIx2H0KeM7e', '普通用户', 'user@example.com', 3, 'active');

-- Insert initial categories
INSERT INTO categories (name, description, sort_order) VALUES
('美妆护肤', '美妆、护肤、彩妆类博主', 1),
('时尚穿搭', '时尚、穿搭、服饰类博主', 2),
('美食探店', '美食、探店、餐饮类博主', 3),
('生活方式', '生活方式、家居、旅行类博主', 4),
('科技数码', '科技、数码、测评类博主', 5),
('母婴亲子', '母婴、亲子、育儿类博主', 6),
('健身运动', '健身、运动、户外类博主', 7),
('知识教育', '知识分享、教育培训类博主', 8),
('娱乐搞笑', '娱乐、搞笑、剧情类博主', 9),
('其他', '其他类型博主', 10);

-- Insert sample influencers
INSERT INTO influencers (name, platform, account_id, followers, category_id, contact_name, contact_phone, contact_email, tags, cost_per_post, engagement_rate, status, notes) VALUES
('李美妆', '小红书', 'limeizhunag', 580000, 1, '李经理', '13800138001', 'li@example.com', '美妆,护肤,口红', 15000.00, 5.20, 'active', '小红书头部美妆博主，种草能力强'),
('时尚王子', '抖音', 'fashionprince', 1200000, 2, '王助理', '13800138002', 'wang@example.com', '穿搭,时尚,男装', 25000.00, 4.80, 'active', '抖音时尚领域TOP博主'),
('吃货小明', 'B站', 'foodiexiaoming', 850000, 3, '陈经理', '13800138003', 'chen@example.com', '美食,探店,吃播', 18000.00, 6.50, 'active', 'B站美食区知名UP主'),
('生活家小美', '微博', 'lifestylemei', 2500000, 4, '刘总', '13800138004', 'liu@example.com', '生活,家居,旅行', 35000.00, 3.20, 'active', '微博生活方式大V'),
('科技达人', '抖音', 'techmaster', 980000, 5, '张经理', '13800138005', 'zhang@example.com', '科技,数码,测评', 22000.00, 4.50, 'active', '专业数码产品测评博主'),
('辣妈日记', '小红书', 'hotmom', 420000, 6, '赵助理', '13800138006', 'zhao@example.com', '母婴,育儿,亲子', 12000.00, 7.80, 'active', '母婴领域专业博主'),
('健身教练阿强', '快手', 'fitcoach', 680000, 7, '钱教练', '13800138007', 'qian@example.com', '健身,减脂,增肌', 16000.00, 5.60, 'active', '专业健身教练，粉丝粘性高'),
('知识分享官', 'B站', 'knowledgeshare', 1500000, 8, '孙老师', '13800138008', 'sun@example.com', '知识,教育,学习', 28000.00, 8.20, 'active', 'B站知识区头部UP主'),
('搞笑小王', '抖音', 'funnyking', 3200000, 9, '周经理', '13800138009', 'zhou@example.com', '搞笑,剧情,段子', 50000.00, 9.50, 'active', '抖音搞笑领域头部达人'),
('护肤专家', '微信', 'skinexpert', 280000, 1, '吴经理', '13800138010', 'wu@example.com', '护肤,成分,测评', 10000.00, 4.30, 'active', '微信公众号护肤专家');

-- Insert sample collaborations
INSERT INTO collaborations (influencer_id, user_id, project_name, status, start_date, end_date, budget, actual_cost, content_type, content_requirements, views, likes, comments, shares) VALUES
(1, 2, '春季新品口红推广', 'completed', '2025-01-15', '2025-01-30', 15000.00, 15000.00, '图文', '发布3篇小红书笔记，突出产品色号和持久度', 125000, 8500, 620, 1200),
(2, 2, '男装品牌联名活动', 'in_progress', '2025-02-01', '2025-02-28', 30000.00, 15000.00, '短视频', '发布2条抖音短视频，展示穿搭效果', 85000, 5200, 380, 850),
(3, 2, '餐厅开业推广', 'completed', '2025-01-10', '2025-01-20', 20000.00, 18000.00, '长视频', 'B站探店视频，时长10-15分钟', 230000, 15000, 2100, 3500),
(4, 1, '家居品牌年度合作', 'in_progress', '2025-01-01', '2025-12-31', 100000.00, 35000.00, '图文', '每月发布2篇家居好物推荐', 580000, 42000, 5800, 12000),
(5, 2, '新款手机评测', 'pending', '2025-02-15', '2025-02-28', 25000.00, 0.00, '短视频', '发布产品开箱和深度评测视频', 0, 0, 0, 0),
(6, 2, '婴儿用品种草', 'completed', '2025-01-05', '2025-01-15', 12000.00, 12000.00, '图文', '发布5篇母婴好物推荐笔记', 95000, 7200, 890, 1500),
(7, 2, '健身器材推广', 'in_progress', '2025-02-01', '2025-02-15', 18000.00, 9000.00, '直播', '快手直播介绍健身器材使用方法', 45000, 3200, 420, 280),
(8, 1, '在线教育平台推广', 'completed', '2024-12-01', '2024-12-31', 30000.00, 30000.00, '长视频', 'B站发布学习方法分享视频，植入平台', 420000, 35000, 4200, 8500),
(9, 2, '品牌春节活动', 'pending', '2025-02-05', '2025-02-15', 60000.00, 0.00, '短视频', '春节主题搞笑短视频，融入品牌元素', 0, 0, 0, 0),
(1, 1, '护肤品牌年度代言', 'in_progress', '2025-01-01', '2025-06-30', 80000.00, 40000.00, '图文', '每月发布护肤日常和产品推荐', 320000, 25000, 3200, 5800);
