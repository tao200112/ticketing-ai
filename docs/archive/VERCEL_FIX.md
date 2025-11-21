# Vercel 配置问题排查

## 问题症状
- 代码回退后网站仍然无法运行
- 本地数据库连接正常
- 说明问题不在代码，而在 Vercel 配置

## 可能的原因

### 1. Vercel 环境变量未配置或配置错误

**检查步骤**:
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择项目 `ticketing-ai`
3. 进入 **Settings** → **Environment Variables**
4. 检查以下变量是否配置：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY` (可选)
   - `STRIPE_WEBHOOK_SECRET` (可选)

### 2. 环境变量值错误

**修复方法**:
- 从 `.env.local` 文件复制正确的值
- 确保没有多余的空格或换行
- 点击 **Save** 保存

### 3. 部署环境不匹配

**检查步骤**:
- 确保 Production、Preview、Development 环境都配置了正确的变量

### 4. 需要重新部署

**修复方法**:
1. 在 Environment Variables 页面点击 **Save**
2. 手动触发重新部署：
   - 进入 **Deployments** 标签
   - 点击最新部署右侧的 **⋯**
   - 选择 **Redeploy**

## 快速修复步骤

### 步骤 1: 检查环境变量

确保以下变量在 Vercel 中正确配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://htaqcvnyipiqdbmvvfvj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 步骤 2: 重新部署

1. 在 Vercel Dashboard 中
2. 进入 **Deployments**
3. 找到最新部署
4. 点击 **⋯** → **Redeploy**

### 步骤 3: 检查部署日志

1. 在 **Deployments** 页面
2. 点击部署记录查看构建日志
3. 查找错误信息

## 常见错误

### Error: Missing environment variables
- **原因**: 环境变量未配置
- **解决**: 在 Vercel 中添加缺失的环境变量

### Error: Failed to connect to database
- **原因**: SUPABASE URL 或 KEY 错误
- **解决**: 检查环境变量值是否正确

### Build succeeded but site shows 500 error
- **原因**: 运行时代码出错（通常是数据库连接）
- **解决**: 检查运行日志，确保环境变量在运行时可用

## 验证修复

部署完成后，访问：
- 应用主页：`https://your-app.vercel.app`
- 检查浏览器控制台是否有错误
- 检查 Network 标签中的 API 请求状态

## 如果仍然无法解决

1. 查看 Vercel 的 **Function Logs**（实时日志）
2. 复制错误信息
3. 检查 Supabase 项目状态
4. 确认数据库表是否存在

---

**重要**: 确保 Vercel 中的环境变量值与本地 `.env.local` 文件中的值完全一致。
