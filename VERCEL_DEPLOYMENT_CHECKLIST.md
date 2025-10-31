# 🚨 Vercel 部署问题检查清单

## 当前问题
- API 路由返回 404 错误
- Sentry 返回 403 错误
- 新页面无法访问

## ✅ 已确认正常
- 本地构建成功
- API 路由文件存在
- 代码已推送到正确分支

## 🔧 需要检查的 Vercel 配置

### 1. 环境变量检查
在 Vercel Dashboard > Settings > Environment Variables 中确认：

**必需的环境变量：**
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://ticketing-ai-six.vercel.app`
- [ ] `NEXT_PUBLIC_SENTRY_DSN` = `https://o1336925.ingest.sentry.io/6606312`
- [ ] `NEXT_PUBLIC_MERCHANT_ID` = `default-merchant-id`
- [ ] `SENTRY_DSN` = `https://o1336925.ingest.sentry.io/6606312`
- [ ] `MERCHANT_ID` = `default-merchant-id`

**环境范围：** 确保所有变量都设置为 `Production`, `Preview`, `Development`

### 2. 部署检查
在 Vercel Dashboard > Deployments 中：

- [ ] 确认最新部署是 `feat/identity-rbac-errors` 分支
- [ ] 确认部署状态是 `Ready` 或 `Success`
- [ ] 检查构建日志是否有错误

### 3. 强制重新部署
如果环境变量已正确设置：

1. 进入 `Deployments` 页面
2. 找到最新部署记录
3. 点击 `Redeploy` 按钮
4. 选择 `Use existing Build Cache: No`
5. 点击 `Redeploy` 确认

### 4. 测试步骤
部署完成后，按顺序测试：

1. **健康检查 API**：
   ```
   https://ticketing-ai-six.vercel.app/api/health
   ```
   期望返回：`{"status":"ok","timestamp":"...","message":"API is working!"}`

2. **环境变量测试 API**：
   ```
   https://ticketing-ai-six.vercel.app/api/test-env
   ```
   期望返回：环境变量状态信息

3. **调试页面**：
   ```
   https://ticketing-ai-six.vercel.app/debug-vercel
   ```
   期望：显示环境信息，无 Sentry 403 错误

## 🚨 如果仍然 404

### 可能的原因：
1. **分支问题** - Vercel 可能部署了错误的分支
2. **缓存问题** - Vercel 缓存了旧版本
3. **配置冲突** - `vercel.json` 或其他配置有问题
4. **构建失败** - 线上构建过程中出现错误

### 解决方案：
1. **检查 Vercel 项目设置** - 确认 Git 分支配置
2. **清除所有缓存** - 在重新部署时选择不使用缓存
3. **检查构建日志** - 查看是否有构建错误
4. **联系 Vercel 支持** - 如果问题持续存在

## 📞 紧急联系
如果按照以上步骤操作后问题仍然存在，请：
1. 截图 Vercel Dashboard 的部署状态
2. 截图环境变量配置页面
3. 提供构建日志的截图
