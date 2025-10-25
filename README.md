# 🎫 PartyTix - 智能票务平台

这是一个基于 Next.js + Supabase + Vercel 的现代化票务管理系统，具备完整的版本管理和快速回滚功能。

## 🚀 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 清理缓存并重启
npm run dev:clean
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 环境配置

1. 复制环境变量模板：
```bash
cp env.example .env.local
```

2. 配置必要的环境变量（见下方环境变量说明）

## 🔥 部署与回滚指南

### 🚀 Vercel 部署

#### 自动部署
- 推送代码到 `main` 分支将自动触发部署
- GitHub Actions 会自动创建版本标签和发布说明

#### 手动部署
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署到生产环境
vercel --prod

# 查看部署历史
vercel ls
```

### 🔄 快速回滚

#### 方法 1: Vercel Dashboard 回滚
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择项目 → Deployments
3. 找到要回滚的版本，点击 "Promote to Production"

#### 方法 2: CLI 回滚
```bash
# 查看部署历史
vercel ls

# 回滚到指定部署
vercel promote <deployment_id>
```

#### 方法 3: 一键回滚脚本
```bash
# 快速回滚到上一个稳定版本
./scripts/quick_rollback.sh
```

### 🗄️ 数据库回滚

#### 备份数据库
```bash
# 手动备份
./scripts/backup_db.sh

# 查看备份列表
ls -la backups/
```

#### 恢复数据库
```bash
# 恢复指定备份
./scripts/restore_db.sh backups/backup_20241025_143022.sql
```

### 📋 Git 回滚

```bash
# 回滚到上一个提交
git revert -m 1 <merge_sha>
git push origin main

# 查看提交历史
git log --oneline -10
```

## 🔧 环境变量配置

### 必需变量
```bash
# Supabase 配置
SUPABASE_DB_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://your_project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Stripe 配置
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Vercel 配置
VERCEL_TOKEN=your_vercel_token
```

### 完整配置
查看 `env.example` 文件获取所有可用环境变量的详细说明。

## 📊 版本管理

### 分支策略
- `main`: 生产环境分支
- `develop`: 开发环境分支  
- `feature/*`: 功能开发分支

### 自动版本管理
- 每次合并到 `main` 分支时自动创建版本标签
- 自动生成 CHANGELOG.md
- 自动创建 GitHub Release

### 版本号规则
- `v1.0.0`: 主版本.次版本.修订号
- `feat:` 提交 → 次版本号 +1
- `fix:` 提交 → 修订号 +1

## 🛠️ 开发工具

### 可用脚本
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 代码检查
npm run clean        # 清理缓存
npm run dev:clean    # 清理并重启开发服务器
```

### 数据库工具
```bash
./scripts/backup_db.sh      # 备份数据库
./scripts/restore_db.sh     # 恢复数据库
./scripts/quick_rollback.sh # 快速回滚
```

## 📚 技术栈

- **前端**: Next.js 15, React 18, Tailwind CSS
- **后端**: Next.js API Routes, Supabase
- **数据库**: PostgreSQL (Supabase)
- **支付**: Stripe
- **部署**: Vercel
- **版本控制**: Git + GitHub Actions

## 🔒 安全特性

- 行级安全策略 (RLS)
- 环境变量加密存储
- 自动备份和恢复
- 版本控制和回滚机制

## 📞 支持

如有问题，请查看：
- [部署指南](DEPLOY.md)
- [环境设置指南](ENVIRONMENT_SETUP.md)
- [数据库设置指南](DATABASE_SETUP_GUIDE.md)
- [Stripe 设置指南](STRIPE_SETUP_GUIDE.md)

---

*最后更新: 2024年10月25日*
