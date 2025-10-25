# 调试路由策略文档

> **原则**: 生产环境禁止访问调试页面  
> **最后更新**: PR-1

## 📋 概述

本项目的调试路由在生产环境被自动拦截，防止意外暴露内部信息。

---

## 🛡️ 受保护的路由

以下路由在生产环境（`NODE_ENV=production`）会被重定向到首页：

- `/debug-*` - 所有调试页面
  - `/debug-db-status`
  - `/debug-production`
  - `/debug-supabase-config`
  - `/debug-qr`
  - `/debug-purchase`
- `/fix-*` - 所有修复工具页面
  - `/fix-production-issues`
- `/admin/fix-production-data` - 生产数据修复

---

## ⚙️ 启用调试路由（紧急情况）

在特殊情况下，你可能需要临时启用调试页面：

### 方法 1: 环境变量

```bash
# 在 .env.local 或生产环境变量中设置
DEBUG_PAGES=true
NODE_ENV=production
```

### 方法 2: 构建时设置

```bash
DEBUG_PAGES=true npm run build
DEBUG_PAGES=true npm start
```

⚠️ **警告**: 启用调试页面会增加安全风险，仅在必要时使用。

---

## 🔧 实现方式

### Middleware 拦截

`middleware.ts` 在生产环境自动拦截调试路由：

```typescript
export function middleware(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production'
  const debugPagesEnabled = process.env.DEBUG_PAGES === 'true'
  
  if (isProduction && !debugPagesEnabled) {
    // 拦截调试路由
    if (pathname.startsWith('/debug-') || pathname.startsWith('/fix-')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
}
```

---

## 📊 影响范围

### 受影响的文件

- `middleware.ts` - 路由拦截逻辑
- `app/debug-*/page.js` - 所有调试页面
- `app/fix-*/page.js` - 所有修复工具页面

### 不受影响的文件

- API Routes (`app/api/*/route.js`) - 不受中间件影响
- 正常页面 (`app/*/page.js`) - 不受影响

---

## 🚨 安全风险

### 调试页面可能的暴露内容

1. **数据库连接信息**
   - Supabase URL
   - 表结构
   - 数据示例

2. **环境变量**
   - Service Role Key（如果误用）
   - Stripe Secret Key

3. **业务逻辑**
   - 内部 API 调用
   - 错误堆栈
   - 调试信息

---

## ✅ 最佳实践

### 开发环境

```bash
# 开发环境正常使用
npm run dev
# 所有调试路由可访问
```

### 生产环境

```bash
# 生产环境默认禁止
npm run build
npm start
# 调试路由被拦截
```

### 紧急调试

```bash
# 仅在必要时启用
DEBUG_PAGES=true npm start
# 使用完毕后立即禁用
```

---

## 🔍 验证

### 检查调试路由是否被拦截

```bash
# 生产环境
curl http://localhost:3000/debug-db-status
# 预期: 302 重定向到 /

# 开发环境
curl http://localhost:3000/debug-db-status
# 预期: 200 OK
```

### 检查环境变量

```bash
# 查看当前环境
echo $NODE_ENV

# 查看调试页开关
echo $DEBUG_PAGES
```

---

## 📚 相关文档

- [架构数据源文档](ARCHITECTURE_DATASOURCE.md)
- [技术债扫描工具](scripts/report-tech-debt.cjs)
