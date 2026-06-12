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

-- Tiers table - 达人等级
CREATE TABLE IF NOT EXISTS tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(20) DEFAULT '#1890ff',
    min_followers INT DEFAULT 0,
    max_followers INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    description VARCHAR(200),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sort_order (sort_order)
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
    tier_id INT,
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
    INDEX idx_tier (tier_id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (tier_id) REFERENCES tiers(id)
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

-- Collaboration Deliverables table
CREATE TABLE IF NOT EXISTS collaboration_deliverables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    collaboration_id INT NOT NULL,
    platform VARCHAR(50),
    content_link VARCHAR(500),
    published_at DATETIME,
    review_status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_collaboration (collaboration_id),
    INDEX idx_review_status (review_status),
    FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Price Histories table - 报价变更历史
CREATE TABLE IF NOT EXISTS price_histories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    influencer_id INT NOT NULL,
    old_price DECIMAL(12, 2) NOT NULL,
    new_price DECIMAL(12, 2) NOT NULL,
    change_reason TEXT,
    operator_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_influencer (influencer_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Brands table - 品牌方
CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    industry VARCHAR(100),
    contact_name VARCHAR(50),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    logo VARCHAR(255),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add brand_id to users (must run after brands table exists)
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'brand_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_schema = @dbname)
      AND (table_name = @tablename)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL AFTER role_id, ADD CONSTRAINT fk_users_brand_id FOREIGN KEY (', @columnname, ') REFERENCES brands(id) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Brand Collaboration Authorizations table - 品牌方授权可见的合作
CREATE TABLE IF NOT EXISTS brand_collaboration_authorizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brand_id INT NOT NULL,
    collaboration_id INT NOT NULL,
    granted_by INT,
    notes VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_brand (brand_id),
    INDEX idx_collaboration (collaboration_id),
    UNIQUE KEY uk_brand_collaboration (brand_id, collaboration_id),
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial roles - add brand role
INSERT INTO roles (id, name, description, permissions) VALUES
(1, 'admin', '管理员', 'all'),
(2, 'operator', '运营人员', 'influencers,collaborations,categories'),
(3, 'user', '普通用户', 'read'),
(4, 'brand', '品牌方客户', 'brand_portal,read_authorized')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), permissions=VALUES(permissions);

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

-- Insert initial tiers - 达人等级
INSERT INTO tiers (name, color, min_followers, max_followers, sort_order, description) VALUES
('头部达人', '#f5222d', 1000000, 0, 1, '粉丝数100万以上的顶级达人'),
('腰部达人', '#fa8c16', 300000, 1000000, 2, '粉丝数30万-100万的中坚力量'),
('尾部达人', '#1890ff', 100000, 300000, 3, '粉丝数10万-30万的成长型达人'),
('潜力达人', '#52c41a', 0, 100000, 4, '粉丝数10万以下的潜力新秀');

-- Insert sample influencers
INSERT INTO influencers (name, platform, account_id, followers, category_id, tier_id, contact_name, contact_phone, contact_email, tags, cost_per_post, engagement_rate, status, notes) VALUES
('李美妆', '小红书', 'limeizhunag', 580000, 1, 2, '李经理', '13800138001', 'li@example.com', '美妆,护肤,口红', 15000.00, 5.20, 'active', '小红书头部美妆博主，种草能力强'),
('时尚王子', '抖音', 'fashionprince', 1200000, 2, 1, '王助理', '13800138002', 'wang@example.com', '穿搭,时尚,男装', 25000.00, 4.80, 'active', '抖音时尚领域TOP博主'),
('吃货小明', 'B站', 'foodiexiaoming', 850000, 3, 2, '陈经理', '13800138003', 'chen@example.com', '美食,探店,吃播', 18000.00, 6.50, 'active', 'B站美食区知名UP主'),
('生活家小美', '微博', 'lifestylemei', 2500000, 4, 1, '刘总', '13800138004', 'liu@example.com', '生活,家居,旅行', 35000.00, 3.20, 'active', '微博生活方式大V'),
('科技达人', '抖音', 'techmaster', 980000, 5, 2, '张经理', '13800138005', 'zhang@example.com', '科技,数码,测评', 22000.00, 4.50, 'active', '专业数码产品测评博主'),
('辣妈日记', '小红书', 'hotmom', 420000, 6, 2, '赵助理', '13800138006', 'zhao@example.com', '母婴,育儿,亲子', 12000.00, 7.80, 'active', '母婴领域专业博主'),
('健身教练阿强', '快手', 'fitcoach', 680000, 7, 2, '钱教练', '13800138007', 'qian@example.com', '健身,减脂,增肌', 16000.00, 5.60, 'active', '专业健身教练，粉丝粘性高'),
('知识分享官', 'B站', 'knowledgeshare', 1500000, 8, 1, '孙老师', '13800138008', 'sun@example.com', '知识,教育,学习', 28000.00, 8.20, 'active', 'B站知识区头部UP主'),
('搞笑小王', '抖音', 'funnyking', 3200000, 9, 1, '周经理', '13800138009', 'zhou@example.com', '搞笑,剧情,段子', 50000.00, 9.50, 'active', '抖音搞笑领域头部达人'),
('护肤专家', '微信', 'skinexpert', 280000, 1, 3, '吴经理', '13800138010', 'wu@example.com', '护肤,成分,测评', 10000.00, 4.30, 'active', '微信公众号护肤专家');

-- Insert sample collaborations (dates adjusted to current year/month for demo purposes)
INSERT INTO collaborations (influencer_id, user_id, project_name, status, start_date, end_date, budget, actual_cost, content_type, content_requirements, views, likes, comments, shares) VALUES
(1, 2, '春季新品口红推广', 'completed', '2026-05-15', '2026-05-30', 15000.00, 15000.00, '图文', '发布3篇小红书笔记，突出产品色号和持久度', 125000, 8500, 620, 1200),
(2, 2, '男装品牌联名活动', 'in_progress', '2026-06-01', '2026-06-30', 30000.00, 15000.00, '短视频', '发布2条抖音短视频，展示穿搭效果', 85000, 5200, 380, 850),
(3, 2, '餐厅开业推广', 'completed', '2026-05-10', '2026-05-20', 20000.00, 18000.00, '长视频', 'B站探店视频，时长10-15分钟', 230000, 15000, 2100, 3500),
(4, 1, '家居品牌年度合作', 'in_progress', '2026-01-01', '2026-12-31', 100000.00, 35000.00, '图文', '每月发布2篇家居好物推荐', 580000, 42000, 5800, 12000),
(5, 2, '新款手机评测', 'pending', '2026-06-15', '2026-06-28', 25000.00, 0.00, '短视频', '发布产品开箱和深度评测视频', 0, 0, 0, 0),
(6, 2, '婴儿用品种草', 'completed', '2026-05-05', '2026-05-15', 12000.00, 12000.00, '图文', '发布5篇母婴好物推荐笔记', 95000, 7200, 890, 1500),
(7, 2, '健身器材推广', 'in_progress', '2026-06-01', '2026-06-15', 18000.00, 9000.00, '直播', '快手直播介绍健身器材使用方法', 45000, 3200, 420, 280),
(8, 1, '在线教育平台推广', 'completed', '2026-04-01', '2026-04-30', 30000.00, 30000.00, '长视频', 'B站发布学习方法分享视频，植入平台', 420000, 35000, 4200, 8500),
(9, 2, '品牌夏季活动', 'pending', '2026-06-20', '2026-07-05', 60000.00, 0.00, '短视频', '夏日主题搞笑短视频，融入品牌元素', 0, 0, 0, 0),
(1, 1, '护肤品牌年度代言', 'in_progress', '2026-01-01', '2026-12-31', 80000.00, 40000.00, '图文', '每月发布护肤日常和产品推荐', 320000, 25000, 3200, 5800);

-- Insert sample deliverables - 内容交付物示例 (dates adjusted to 2026-05/06 for demo)
INSERT INTO collaboration_deliverables (collaboration_id, platform, content_link, published_at, review_status, notes) VALUES
(1, '小红书', 'https://xiaohongshu.com/discovery/item/65a1b2c3d4e5f67890abcdef', '2026-05-16 10:00:00', 'approved', '首篇笔记：春季口红试色'),
(1, '小红书', 'https://xiaohongshu.com/discovery/item/65a2c3d4e5f67890abcdef1', '2026-05-20 14:30:00', 'approved', '第二篇：持久度测评'),
(1, '小红书', 'https://xiaohongshu.com/discovery/item/65a3d4e5f67890abcdef123', '2026-05-25 09:15:00', 'pending', '第三篇：唇部护理+口红叠涂技巧'),
(2, '抖音', 'https://www.douyin.com/video/7312345678901234567', '2026-06-05 18:00:00', 'pending', '第一条短视频：夏季穿搭合集'),
(2, '抖音', 'https://www.douyin.com/video/7312345678901234568', '2026-06-08 20:00:00', 'rejected', '第二条：品牌联名开箱，植入太硬需重拍'),
(3, 'B站', 'https://www.bilibili.com/video/BV1x12345678', '2026-05-12 12:00:00', 'approved', '探店视频：新开的日料店，时长12分钟'),
(4, '微博', 'https://weibo.com/1234567890/L1abcdefgh', '2026-05-05 11:00:00', 'approved', '五月第一篇：北欧风家居好物'),
(4, '小红书', 'https://xiaohongshu.com/discovery/item/65b1c2d3e4f567890abcdef', '2026-05-15 16:00:00', 'approved', '五月第二篇：租房改造'),
(4, '微博', 'https://weibo.com/1234567890/L2abcdefgh', '2026-06-03 10:00:00', 'pending', '六月第一篇：简约办公桌面'),
(4, '小红书', 'https://xiaohongshu.com/discovery/item/65b2d3e4f567890abcdef12', '2026-06-10 15:00:00', 'pending', '六月第二篇：小户型收纳神器'),
(7, '快手', 'https://www.kuaishou.com/short-video/3x1234567890abcdefg', '2026-06-03 19:30:00', 'pending', '第一场直播回放剪辑：家用健身器材使用教程'),
(10, '小红书', 'https://xiaohongshu.com/discovery/item/65c1d2e3f4567890abcdef1', '2026-05-08 09:00:00', 'approved', '五月第一篇：换季护肤routine'),
(10, '小红书', 'https://xiaohongshu.com/discovery/item/65c2e3f4567890abcdef123', '2026-06-01 11:00:00', 'pending', '六月第一篇：夏日清爽妆容+护肤'),
(10, '小红书', 'https://xiaohongshu.com/discovery/item/65c3f4567890abcdef12345', '2026-06-01 08:30:00', 'rejected', '六月第二篇：产品成分解析，内容有误需修改');

-- Insert sample price histories - 报价变更历史示例
INSERT INTO price_histories (influencer_id, old_price, new_price, change_reason, operator_id, created_at) VALUES
(1, 12000.00, 15000.00, '粉丝量增长，市场需求增加', 2, '2024-11-15 10:30:00'),
(1, 15000.00, 15000.00, '续约确认，价格维持', 2, '2025-01-20 14:00:00'),
(2, 20000.00, 25000.00, '粉丝突破100万，进入头部达人', 2, '2024-12-01 09:15:00'),
(3, 15000.00, 18000.00, '内容质量提升，互动率增加', 2, '2024-12-20 16:45:00'),
(4, 30000.00, 35000.00, '年度合作报价调整', 1, '2024-11-30 11:00:00'),
(5, 18000.00, 22000.00, '测评专业性受认可，价格调整', 2, '2025-01-10 15:20:00'),
(9, 40000.00, 50000.00, '粉丝量大幅增长，平台影响力提升', 2, '2024-12-15 13:30:00');

-- Insert sample brands - 品牌方示例
INSERT INTO brands (name, industry, contact_name, contact_phone, contact_email, description, status) VALUES
('美肌美妆集团', '美妆护肤', '李品牌', '13900139001', 'brand@meiji.com', '国内知名美妆护肤品牌，旗下拥有多个护肤和彩妆产品线', 'active'),
('潮牌服饰有限公司', '时尚服饰', '王品牌', '13900139002', 'brand@fashion.com', '潮流男装品牌，主打年轻时尚市场', 'active'),
('美味餐饮连锁', '餐饮美食', '陈品牌', '13900139003', 'brand@foodie.com', '全国连锁餐饮企业，拥有200+门店', 'active');

-- Insert sample brand users - 品牌方用户示例 (password: 123456)
INSERT INTO users (username, password_hash, nickname, email, role_id, brand_id, status) VALUES
('brand_meiji', '$2b$12$b2w3HFknNkunYeCTS1jmyuieCSCViQWQbjSYlN5NuxtIx2H0KeM7e', '美肌美妆-张经理', 'zhang@meiji.com', 4, 1, 'active'),
('brand_fashion', '$2b$12$b2w3HFknNkunYeCTS1jmyuieCSCViQWQbjSYlN5NuxtIx2H0KeM7e', '潮牌服饰-李总监', 'li@fashion.com', 4, 2, 'active'),
('brand_foodie', '$2b$12$b2w3HFknNkunYeCTS1jmyuieCSCViQWQbjSYlN5NuxtIx2H0KeM7e', '美味餐饮-王市场', 'wang@foodie.com', 4, 3, 'active');

-- Influencer Pipelines table - 达人触达漏斗
CREATE TABLE IF NOT EXISTS influencer_pipelines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    influencer_id INT NOT NULL UNIQUE,
    stage VARCHAR(30) NOT NULL DEFAULT 'to_contact',
    notes TEXT,
    owner_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stage (stage),
    INDEX idx_owner (owner_id),
    FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample pipeline data - 示例触达漏斗数据
INSERT INTO influencer_pipelines (influencer_id, stage, notes, owner_id, created_at) VALUES
(1, 'signed', '已签署年度合作协议，报价¥15,000/条', 2, '2024-11-01 10:00:00'),
(2, 'quote_confirmed', '对方确认报价¥25,000，等待合同审批', 2, '2024-11-15 14:30:00'),
(3, 'communicating', '已建立联系，对方对合作表示兴趣，等待具体方案', 2, '2024-12-01 09:20:00'),
(4, 'signed', '年度家居品牌合作已签约，预算¥100,000', 1, '2024-10-20 16:00:00'),
(5, 'communicating', '已发送合作资料，跟进中', 2, '2024-12-10 11:15:00'),
(6, 'to_contact', '母婴领域潜力达人，待电话联系', 2, '2025-01-05 08:30:00'),
(7, 'quote_confirmed', '健身器材推广报价¥16,000已确认，下周签约', 2, '2025-01-10 15:45:00'),
(8, 'signed', '知识分享官年度合作，报价¥28,000/条', 1, '2024-11-25 13:00:00'),
(9, 'abandoned', '对方档期已满，暂时无法合作，3个月后再跟进', 2, '2024-12-20 10:30:00'),
(10, 'to_contact', '微信护肤专家，初步评估适合中小预算合作', 2, '2025-01-15 09:00:00');

-- Insert sample brand-collaboration authorizations - 品牌方授权合作示例
-- 美味餐饮授权可见的合作: 餐厅开业推广(3)
INSERT INTO brand_collaboration_authorizations (brand_id, collaboration_id, granted_by, notes) VALUES
(1, 1, 1, '2025春季口红推广授权'),
(1, 10, 1, '年度护肤代言合作授权'),
-- 潮牌服饰授权可见的合作: 男装品牌联名活动(2)
(2, 2, 1, '2025春季联名活动授权'),
-- 美味餐饮授权可见的合作: 餐厅开业推广(3)
(3, 3, 1, '新店开业推广授权');

-- Message Templates table - 消息模板
CREATE TABLE IF NOT EXISTS message_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(200),
    content TEXT NOT NULL,
    variables VARCHAR(500),
    description VARCHAR(200),
    sort_order INT DEFAULT 0,
    is_active INT DEFAULT 1,
    creator_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_is_active (is_active),
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial message templates - 初始消息模板
INSERT INTO message_templates (name, category, subject, content, description, sort_order, is_active, creator_id) VALUES
('初次邀约邮件', '初次邀约', '品牌合作邀约 - {达人姓名}', '尊敬的{达人姓名}：\n\n您好！我是{我方品牌}的{联系人姓名}。\n\n我们一直在关注您在{所属平台}的精彩内容，特别是您在{领域}领域的专业见解和独特风格，给我们留下了深刻印象。\n\n我们品牌近期正在筹备{项目名称}项目，非常希望能与您达成合作。\n\n合作形式：{合作形式}\n预算范围：{预算范围}\n预计时间：{预计时间}\n\n如果您对此次合作感兴趣，或者想了解更多详情，欢迎随时与我联系。\n\n期待您的回复！\n\nBest regards,\n{联系人姓名}\n{我方品牌}\n联系方式：{联系电话} / {联系邮箱}', '用于初次联系达人，介绍品牌和合作意向', 1, 1, 1),
('初次邀约微信', '初次邀约', NULL, '您好{达人姓名}，我是{我方品牌}的{联系人姓名}。关注您{所属平台}的内容很久了，非常欣赏您在{领域}的专业度。我们近期有个{项目名称}的合作想邀请您参与，预算{预算范围}，请问方便聊聊吗？', '用于微信等即时通讯工具的初次联系', 2, 1, 1),
('跟进催复-首次', '跟进催复', '跟进：关于{项目名称}合作邀约', '您好{达人姓名}：\n\n冒昧跟进，请问您之前收到的关于{项目名称}的合作邀约，考虑得怎么样了？\n\n我们非常期待能与您合作，如果有任何疑问或者需要调整的地方，欢迎随时沟通。\n\n如果您暂时没有档期，也没关系，可以先加个联系方式，后续有合适的项目再联系您。\n\n盼复！\n\n{联系人姓名}\n{联系电话}', '发送邀约后3-5天未回复时使用', 1, 1, 1),
('跟进催复-二次', '跟进催复', '再次跟进：{项目名称}合作机会', '您好{达人姓名}：\n\n再次打扰您了！关于之前提到的{项目名称}合作，不知道您近期是否有档期呢？\n\n我们非常欣赏您的内容风格，即使这次合作不成，也希望能保持联系，后续有其他项目也可以第一时间与您沟通。\n\n方便的话可以告知一下您的合作意向吗？非常感谢！\n\n{联系人姓名}\n{联系电话}', '首次跟进后仍未回复时使用', 2, 1, 1),
('合同确认邮件', '合同确认', '合同确认 - {项目名称}合作', '您好{达人姓名}：\n\n感谢您确认与我们的合作！\n\n现将{项目名称}的合作合同发送给您，请查收附件。\n\n合同要点回顾：\n1. 合作内容：{合作内容}\n2. 合作金额：{合作金额}\n3. 交付时间：{交付时间}\n4. 付款方式：{付款方式}\n\n请您仔细核对合同内容，如无异议请签署后回传。如有问题，请随时与我联系。\n\n感谢您的配合！\n\n{联系人姓名}\n{我方品牌}', '用于发送合同并请达人确认', 1, 1, 1),
('内容审核反馈', '内容审核', '关于{项目名称}内容审核反馈', '您好{达人姓名}：\n\n收到您提交的{项目名称}内容了，感谢您的高效产出！\n\n我们内部审核后，有几点小建议想与您沟通：\n{审核反馈}\n\n整体内容方向我们非常认可，以上只是一些细节调整建议，您看看是否合理？如有任何疑问欢迎随时讨论。\n\n期待您的调整版本！\n\n{联系人姓名}', '用于内容审核后的反馈沟通', 1, 1, 1),
('付款通知', '合同确认', '付款通知 - {项目名称}', '您好{达人姓名}：\n\n{项目名称}的合作款项已安排支付，请您注意查收。\n\n付款金额：{付款金额}\n付款时间：{付款时间}\n\n预计{到账时间}左右到账，如有任何问题请随时联系我们。\n\n感谢您的优质合作，期待下次继续！\n\n{联系人姓名}\n{我方品牌}', '用于通知达人款项已支付', 2, 1, 1),
('节日问候', '日常维护', NULL, '您好{达人姓名}，{节日}快乐！感谢您一直以来对{我方品牌}的支持，期待未来继续携手，创造更多精彩内容！', '节日时发送问候，维护客情', 1, 1, 1),
('新品推荐', '日常维护', NULL, '您好{达人姓名}，我们最近推出了{新品名称}，想第一时间分享给您。产品主打{产品卖点}，不知道您是否感兴趣体验一下？如果喜欢的话我们可以寄样给您~', '新品上市时推荐给达人', 2, 1, 1);

-- Competitive Intelligence table - 竞品情报
CREATE TABLE IF NOT EXISTS competitive_intelligence (
    id INT AUTO_INCREMENT PRIMARY KEY,
    influencer_id INT NOT NULL,
    competitor_name VARCHAR(200) NOT NULL,
    estimated_amount DECIMAL(12, 2) DEFAULT 0,
    source VARCHAR(200),
    discovery_date DATE,
    notes TEXT,
    creator_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_influencer (influencer_id),
    INDEX idx_competitor (competitor_name),
    FOREIGN KEY (influencer_id) REFERENCES influencers(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample competitive intelligence data - 示例竞品情报数据
INSERT INTO competitive_intelligence (influencer_id, competitor_name, estimated_amount, source, discovery_date, notes, creator_id) VALUES
(1, '完美日记', 20000.00, '小红书平台观察', '2025-01-10', '近期发布完美日记口红推广笔记', 2),
(2, '李宁', 35000.00, '抖音广告投放', '2025-01-15', '抖音开屏广告出现该达人为李宁拍摄的宣传片', 2),
(5, '小米', 25000.00, 'B站视频植入', '2025-01-20', '视频中出现小米最新款手机测评', 2),
(9, '元气森林', 55000.00, '品牌官方微博', '2025-02-01', '元气森林官宣该达人为品牌大使', 2);

-- Content Deliverables table (if not exists)
CREATE TABLE IF NOT EXISTS content_deliverables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    collaboration_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    platform VARCHAR(50),
    content_type VARCHAR(50),
    due_date DATE,
    content_link VARCHAR(500),
    published_at DATE,
    review_status VARCHAR(20) DEFAULT 'pending',
    review_notes TEXT,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    creator_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_collaboration (collaboration_id),
    INDEX idx_review_status (review_status),
    INDEX idx_platform (platform),
    FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample deliverables data - 示例交付物数据
INSERT INTO content_deliverables (collaboration_id, title, platform, content_type, due_date, content_link, published_at, review_status, views, likes, comments, shares, creator_id) VALUES
(1, '春季新品口红测评', '小红书', '图文', '2025-01-25', 'https://xiaohongshu.com/example1', '2025-01-26', 'approved', 125000, 8500, 620, 1200, 2),
(2, '男装春季穿搭指南', '抖音', '短视频', '2025-02-20', NULL, NULL, 'pending', 0, 0, 0, 0, 2),
(3, '高端餐厅探店vlog', 'B站', '长视频', '2025-01-18', 'https://bilibili.com/example3', '2025-01-19', 'approved', 230000, 15000, 2100, 3500, 2),
(4, '2月家居好物推荐', '微博', '图文', '2025-02-15', NULL, NULL, 'pending', 0, 0, 0, 0, 2),
(7, '健身器材使用教程', '快手', '直播', '2025-02-10', 'https://kuaishou.com/example7', '2025-02-10', 'approved', 45000, 3200, 420, 280, 2),
(8, '高效学习方法分享', 'B站', '长视频', '2024-12-25', 'https://bilibili.com/example8', '2024-12-26', 'approved', 420000, 35000, 4200, 8500, 2),
(10, '1月护肤routine', '小红书', '图文', '2025-01-30', 'https://xiaohongshu.com/example10', '2025-01-31', 'approved', 180000, 12000, 950, 2100, 2),
(10, '2月护肤爱用品', '小红书', '图文', '2025-02-28', NULL, NULL, 'pending', 0, 0, 0, 0, 2);

-- Finance Ledger table - 财务台账
CREATE TABLE IF NOT EXISTS finance_ledgers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    collaboration_id INT NOT NULL,
    influencer_id INT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'payment',
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE,
    payment_method VARCHAR(50),
    transaction_no VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    creator_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_collaboration (collaboration_id),
    INDEX idx_influencer (influencer_id),
    INDEX idx_status (status),
    INDEX idx_type (type),
    FOREIGN KEY (collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE,
    FOREIGN KEY (influencer_id) REFERENCES influencers(id),
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample finance ledger data - 示例财务数据
INSERT INTO finance_ledgers (collaboration_id, influencer_id, type, amount, payment_date, payment_method, transaction_no, status, notes, creator_id) VALUES
(1, 1, 'payment', 15000.00, '2025-02-01', '银行转账', 'TRX20250201001', 'paid', '春季口红推广首款50%', 1),
(1, 1, 'payment', 15000.00, '2025-02-15', '银行转账', 'TRX20250215001', 'paid', '春季口红推广尾款50%', 1),
(2, 2, 'payment', 15000.00, '2025-02-05', '银行转账', 'TRX20250205001', 'paid', '男装联名活动首款50%', 1),
(3, 3, 'payment', 18000.00, '2025-01-25', '银行转账', 'TRX20250125001', 'paid', '餐厅推广全款', 1),
(4, 4, 'payment', 35000.00, '2025-01-20', '银行转账', 'TRX20250120001', 'paid', '年度合作Q1款项', 1),
(5, 5, 'payment', 12500.00, NULL, NULL, NULL, 'pending', '手机评测首款50%待支付', 1),
(6, 6, 'payment', 12000.00, '2025-01-20', '银行转账', 'TRX20250120002', 'paid', '母婴用品种草全款', 1),
(7, 7, 'payment', 9000.00, '2025-02-08', '银行转账', 'TRX20250208001', 'paid', '健身器材推广首款50%', 1),
(8, 8, 'payment', 30000.00, '2025-01-05', '银行转账', 'TRX20250105001', 'paid', '教育平台推广全款', 1),
(10, 1, 'payment', 40000.00, '2025-01-15', '银行转账', 'TRX20250115001', 'paid', '年度代言Q1款项', 1);

-- Finance Payments table - 付款记录明细
CREATE TABLE IF NOT EXISTS finance_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ledger_id INT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    transaction_no VARCHAR(100),
    notes TEXT,
    creator_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ledger (ledger_id),
    FOREIGN KEY (ledger_id) REFERENCES finance_ledgers(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample payment records - 示例付款记录
INSERT INTO finance_payments (ledger_id, amount, payment_date, payment_method, transaction_no, notes, creator_id) VALUES
(1, 7500.00, '2025-02-01', '银行转账', 'TRX20250201001', '首款50%', 1),
(1, 7500.00, '2025-02-15', '银行转账', 'TRX20250215001', '尾款50%', 1),
(2, 15000.00, '2025-02-15', '银行转账', 'TRX20250215002', '全款', 1),
(3, 9000.00, '2025-02-05', '银行转账', 'TRX20250205001', '首款50%', 1),
(4, 18000.00, '2025-01-25', '银行转账', 'TRX20250125001', '全款', 1),
(5, 35000.00, '2025-01-20', '银行转账', 'TRX20250120001', 'Q1款项', 1),
(6, 12000.00, '2025-01-20', '银行转账', 'TRX20250120002', '全款', 1),
(7, 9000.00, '2025-02-08', '银行转账', 'TRX20250208001', '首款50%', 1),
(8, 30000.00, '2025-01-05', '银行转账', 'TRX20250105001', '全款', 1),
(9, 40000.00, '2025-01-15', '银行转账', 'TRX20250115001', 'Q1款项', 1);
