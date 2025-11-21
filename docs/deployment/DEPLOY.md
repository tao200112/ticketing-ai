# Vercel 部署指南

## 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

### 必需变量：
- `NEXT_PUBLIC_SUPABASE_URL`: https://htaqcvnyipiqdbmvvfvj.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YXFjdm55aXBpcWRibXZ2ZnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzYwOTgsImV4cCI6MjA3NjY1MjA5OH0.5fPm5rvK_41wc9XZhzqaVupMlD9EEo4wwjaguQkCRKw
- `SUPABASE_SERVICE_ROLE_KEY`: (从 Supabase 项目设置获取)
- `NEXT_PUBLIC_APP_URL`: (部署后填入 Vercel 预览域名)
- `SERVER_SALT`: change_me_later

## 部署步骤

1. 访问 https://vercel.com
2. 点击 "New Project"
3. 选择 "Import Git Repository" 或 "Upload Files"
4. 上传项目文件夹
5. 在 Environment Variables 中添加上述变量
6. 点击 Deploy

## 测试端点

部署完成后访问：
- `{PreviewURL}/api/hello` - API 测试
- `{PreviewURL}/events` - 事件页面（Mock 数据）
- `{PreviewURL}/test` - Supabase 连接诊断


