# Stripe 支付集成设置指南

## 1. 获取 Stripe API 密钥

1. 访问 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 注册或登录您的 Stripe 账户
3. 在左侧菜单中点击 "Developers" > "API keys"
4. 复制以下密钥：
   - **Secret key** (以 `sk_test_` 开头)
   - **Publishable key** (以 `pk_test_` 开头)

## 2. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 3. 安装 Stripe 依赖

确保已安装 Stripe Node.js SDK：

```bash
npm install stripe
```

## 4. 测试支付流程

1. 启动开发服务器：`npm run dev`
2. 创建商家账户并登录
3. 创建一个新事件，设置票务价格
4. 访问事件页面，点击 "Buy Tickets Now"
5. 使用 Stripe 测试卡号进行支付：
   - **成功支付**: `4242 4242 4242 4242`
   - **失败支付**: `4000 0000 0000 0002`
   - **需要验证**: `4000 0025 0000 3155`

## 5. 生产环境配置

### 获取生产环境密钥
1. 在 Stripe Dashboard 中切换到 "Live mode"
2. 获取生产环境的 API 密钥
3. 更新环境变量为生产环境密钥

### 配置 Webhook
1. 在 Stripe Dashboard 中设置 Webhook 端点
2. 配置事件监听器处理支付成功/失败事件

## 6. 功能特性

- ✅ **动态事件支付**: 支持商家创建的事件
- ✅ **多种票种**: 支持不同价格和库存的票种
- ✅ **库存管理**: 自动更新票务库存
- ✅ **收入统计**: 实时更新商家收入统计
- ✅ **购买记录**: 完整的购买历史记录
- ✅ **票务验证**: 生成可验证的票务二维码

## 7. 支付流程

1. **顾客选择票种**: 在事件页面选择票种和数量
2. **填写信息**: 输入姓名和邮箱
3. **跳转支付**: 自动跳转到 Stripe 结账页面
4. **完成支付**: 使用信用卡或其他支付方式
5. **支付成功**: 自动更新库存和统计信息
6. **生成票务**: 显示票务详情和二维码

## 8. 故障排除

### 常见问题
1. **"Invalid API key"**: 检查环境变量是否正确设置
2. **"Event not found"**: 确保事件数据正确传递
3. **"Insufficient inventory"**: 检查票务库存设置
4. **支付失败**: 检查 Stripe 账户状态和网络连接

### 调试步骤
1. 检查浏览器控制台错误信息
2. 查看服务器终端日志
3. 验证 Stripe Dashboard 中的支付记录
4. 确认环境变量配置正确

