# 项目清理计划

## 清理任务清单

### Task 1: 删除未使用的代码
- [ ] 删除废弃的 API 路由（app/api/auth/* 中的 deprecationResponse）
- [ ] 删除废弃的函数（lib/ticket-service.js 中的 @deprecated 函数）
- [ ] 删除未使用的导入
- [ ] 删除临时测试文件（test-*.js, test-*.html）

### Task 2: 清理冗余注释与调试日志
- [ ] 删除非必要的 console.log
- [ ] 删除被注释掉的大段代码
- [ ] 清理 Cursor 自动生成的注释

### Task 3: 重构 supabase_uid 相关代码
- [ ] 删除所有 user_id fallback 逻辑
- [ ] 统一使用 supabase_uid 查询

### Task 4: 重构 snapshot 相关逻辑
- [ ] 删除旧 snapshot 字段生成逻辑
- [ ] 统一使用 event_snapshot 和 price_snapshot JSONB

### Task 5-8: 其他任务
- [ ] 重构前端组件
- [ ] 统一 API 风格
- [ ] ESLint 优化

