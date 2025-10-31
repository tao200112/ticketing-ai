# 邮箱验证测试指南

## 🔍 问题分析

### 为什么 `example.com` 收不到邮件？
- `example.com` 是**保留域名**，用于文档示例
- 没有真实的邮件服务器配置
- DNS 没有 MX 记录来接收邮件

### 为什么 `taoliu001711@gmail.com` 能收到邮件？
- Gmail 是**真实的邮件服务**
- 有完整的邮件服务器配置
- 可以正常接收和发送邮件

## ✅ 正确的测试方法

### 1. **使用真实邮箱地址**
推荐使用以下类型的邮箱进行测试：
- **Gmail**: `yourname@gmail.com`
- **Outlook**: `yourname@outlook.com`
- **Yahoo**: `yourname@yahoo.com`
- **企业邮箱**: `yourname@company.com`

### 2. **避免使用测试域名**
❌ **不要使用**：
- `test@example.com`
- `user@test.com`
- `demo@example.org`

✅ **应该使用**：
- 你自己的真实邮箱
- 朋友的邮箱
- 测试专用的真实邮箱

## 🔧 测试步骤

### 1. **注册测试**
1. 使用**真实邮箱地址**注册新用户
2. 检查邮箱收件箱和垃圾邮件文件夹
3. 点击验证链接完成验证

### 2. **重新发送验证邮件**
1. 如果没收到邮件，等待 15 分钟后重试
2. 避免频繁点击"重新发送"按钮
3. 检查限流状态

### 3. **检查邮件内容**
- 验证邮件应该包含：
  - 发件人：`PartyTix <taoliu001711@gmail.com>`
  - 主题：`Verify Your Email - PartyTix`
  - 内容：纯英文的验证说明
  - 链接：指向 `/auth/verify-email?token=...`

## 🚨 常见问题

### 1. **收不到邮件**
- 检查垃圾邮件文件夹
- 等待 15 分钟后重试
- 使用不同的真实邮箱地址

### 2. **邮件链接 404**
- 确保 `NEXT_PUBLIC_SITE_URL` 没有尾随斜杠
- 检查 Vercel 部署是否成功
- 确认环境变量配置正确

### 3. **限流错误 (429)**
- 等待 15-30 分钟后重试
- 避免频繁测试
- 检查 Redis 限流配置

## 📧 邮件模板示例

### 验证邮件
```
发件人: PartyTix <taoliu001711@gmail.com>
主题: Verify Your Email - PartyTix
内容: 
Welcome to PartyTix!

Please click the link below to verify your email address:
https://ticketing-ai-six.vercel.app/auth/verify-email?token=abc123

This link will expire in 24 hours.
```

## 🔍 调试工具

### 1. **检查 SMTP 配置**
```bash
node scripts/test-real-email.js
```

### 2. **检查限流状态**
```bash
node scripts/check-rate-limit.js
```

### 3. **检查环境变量**
```bash
node scripts/test-env-config.js
```

## 💡 最佳实践

1. **使用真实邮箱**进行测试
2. **检查垃圾邮件文件夹**
3. **避免频繁测试**触发限流
4. **等待足够时间**让邮件到达
5. **使用不同的邮箱**进行多次测试



