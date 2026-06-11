# Influencer Management Platform

企业级网红(Influencer)管理平台，帮助品牌方高效管理网红资源、追踪合作项目效果。

## 功能特性

- **用户管理**：基于角色的权限控制 (管理员、运营、普通用户)
- **Influencer库**：多维度筛选、分类管理、详细档案
- **合作管理**：全流程跟进合作项目，记录预算与效果数据
- **数据看板**：可视化展示平台分布、预算支出、互动数据等关键指标
- **安全认证**：JWT认证，密码加密存储

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18, React Router 6, Recharts, Axios |
| 后端 | FastAPI, SQLAlchemy, Pydantic, PyMySQL |
| 数据库 | MySQL 8.0 |
| 部署 | Docker, Docker Compose, Nginx |

## 快速开始

### 前提条件

- 安装 [Docker](https://www.docker.com/products/docker-desktop)

### 一键部署

```bash
# 启动服务
docker compose up -d --build

# 查看日志
docker compose logs -f
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:3000 |
| 后端API文档 | http://localhost:8000/docs |
| 数据库 | localhost:3306 |

### 默认账号

密码均为 `123456`：

| 账号 | 角色 | 权限 |
|------|------|------|
| admin | 管理员 | 所有权限 |
| operator | 运营人员 | 管理Influencer和合作项目 |
| user | 普通用户 | 仅查看 |

## 目录结构

```
├── backend/                # FastAPI后端
│   ├── app/
│   │   ├── models/         # SQLAlchemy模型
│   │   ├── routers/        # API路由
│   │   ├── schemas/        # Pydantic模式
│   │   └── utils/          # 工具函数
│   ├── init.sql            # 数据库初始化
│   └── Dockerfile
├── frontend/               # React前端
│   ├── src/
│   │   ├── api/            # API接口
│   │   ├── components/     # 公共组件
│   │   ├── contexts/       # React Context
│   │   └── pages/          # 页面组件
│   ├── nginx.conf          # Nginx配置
│   └── Dockerfile
└── docker-compose.yml      # 容器编排
```

## 开发指南

### 后端开发

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端开发

```bash
cd frontend
npm install
npm start
```

## 许可证

MIT License
