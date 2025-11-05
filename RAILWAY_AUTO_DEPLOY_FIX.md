# Railway 自动部署修复指南

## 🚨 问题：Railway 后端没有自动部署

### 可能的原因：

1. **GitHub 连接问题**
   - Railway 项目没有正确连接到 GitHub 仓库
   - Webhook 配置丢失或失效

2. **自动部署设置**
   - Railway 项目设置中自动部署可能被禁用
   - 分支配置不正确

3. **Railway 服务配置**
   - 服务源配置错误
   - 构建配置问题

## ✅ 解决方案

### 方法 1: 检查并重新连接 GitHub（推荐）

1. **登录 Railway Dashboard**
   - 访问 https://railway.app/dashboard
   - 找到您的 `ticketing-ai` 项目

2. **检查服务源配置**
   - 进入项目设置 (Settings)
   - 查看 "Source" 或 "GitHub" 部分
   - 确认仓库连接状态

3. **重新连接 GitHub（如果需要）**
   - 点击 "Connect to GitHub"
   - 选择 `ticketing-ai` 仓库
   - 授权 Railway 访问

4. **检查分支配置**
   - 确认部署分支设置为 `main`
   - 如果需要，可以设置为 `main` 分支

5. **启用自动部署**
   - 在服务设置中，找到 "Auto Deploy" 选项
   - 确保已启用 "Auto Deploy on Push"

### 方法 2: 使用 Railway CLI 手动触发部署

```bash
# 1. 确保已安装 Railway CLI
npm install -g @railway/cli

# 2. 登录 Railway
railway login

# 3. 连接到项目
railway link

# 4. 手动触发部署
railway up
```

### 方法 3: 检查 Railway 项目设置

1. **进入 Railway Dashboard**
   - 项目 → Settings → Service

2. **检查以下设置**：
   - ✅ Source: 应该显示 GitHub 仓库链接
   - ✅ Branch: 应该是 `main`
   - ✅ Auto Deploy: 应该启用
   - ✅ Root Directory: 应该设置为 `backend`（或留空，因为 railway.json 已配置）

3. **如果 Root Directory 需要设置**：
   - 在 Settings → Service → Build Settings
   - 设置 Root Directory 为 `backend`

### 方法 4: 重新创建 Railway Webhook

如果以上方法都不行，可能需要重新创建 webhook：

1. **在 Railway Dashboard**：
   - 进入项目 Settings
   - 找到 "Webhooks" 或 "GitHub Integration" 部分
   - 删除现有的 webhook（如果有）
   - 重新创建 webhook

2. **或者在 GitHub 仓库设置**：
   - 进入 `ticketing-ai` 仓库
   - Settings → Webhooks
   - 检查是否有 Railway 的 webhook
   - 如果没有，需要 Railway 自动创建（通过重新连接）

## 🔍 诊断步骤

### 1. 检查 Railway 服务状态

```bash
railway status
```

### 2. 查看最近的部署

在 Railway Dashboard 中：
- 进入项目的 "Deployments" 标签
- 查看最近的部署记录
- 检查是否有错误信息

### 3. 检查构建日志

在 Railway Dashboard 中：
- 进入项目的 "Logs" 标签
- 查看最近的构建日志
- 确认是否有构建错误

### 4. 验证配置文件

确认以下文件存在且正确：
- ✅ `railway.json` - 在项目根目录
- ✅ `railway.toml` - 在项目根目录（可选）
- ✅ `backend/package.json` - 包含 start 脚本

## 🚀 快速修复步骤

### 步骤 1: 验证 GitHub 连接

1. 登录 Railway Dashboard
2. 进入项目 Settings
3. 查看 "Source" 部分
4. 确认显示 GitHub 仓库链接

### 步骤 2: 启用自动部署

1. 在 Settings → Service
2. 找到 "Auto Deploy" 选项
3. 确保已启用
4. 保存设置

### 步骤 3: 手动触发一次部署

```bash
railway up
```

这将：
- 立即触发一次部署
- 验证配置是否正确
- 显示任何错误信息

### 步骤 4: 测试自动部署

1. 在代码中做一个小改动
2. 提交并推送到 GitHub
3. 观察 Railway Dashboard 是否自动开始构建

## 📋 检查清单

- [ ] Railway 项目已连接到 GitHub 仓库
- [ ] Auto Deploy 已启用
- [ ] 部署分支设置为 `main`
- [ ] `railway.json` 文件存在且配置正确
- [ ] `backend/package.json` 包含 start 脚本
- [ ] 环境变量已正确设置
- [ ] Railway CLI 已安装并登录

## ⚠️ 常见问题

### Q: Railway 显示 "No deployments"？
**A**: 这意味着从未触发过部署。尝试：
1. 使用 `railway up` 手动触发
2. 检查 GitHub 连接
3. 确认 Auto Deploy 已启用

### Q: 部署失败但看不到错误？
**A**: 检查：
1. Railway Dashboard → Logs
2. 构建日志中的错误信息
3. 环境变量是否正确设置

### Q: GitHub 推送后 Railway 没有反应？
**A**: 可能原因：
1. Webhook 未配置或失效
2. Auto Deploy 被禁用
3. 分支配置不匹配

解决：
1. 重新连接 GitHub
2. 启用 Auto Deploy
3. 确认分支配置

## 🎯 推荐的配置

在 Railway Dashboard 中，Service Settings 应该配置为：

```
Source: GitHub (ticketing-ai)
Branch: main
Root Directory: backend (或留空，railway.json 已配置)
Auto Deploy: ✅ Enabled
Build Command: (使用 railway.json 中的配置)
Start Command: (使用 railway.json 中的配置)
```

## 💡 提示

如果以上方法都不行，可以：
1. 删除现有的 Railway 服务
2. 创建新的服务
3. 重新连接到 GitHub 仓库
4. 配置所有设置

---

**最后更新**: 2025-01-XX
**相关文件**: `railway.json`, `railway.toml`, `backend/package.json`

