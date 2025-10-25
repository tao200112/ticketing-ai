# PR-3 完成总结

## ✅ 已完成

### 1. RLS 启用脚本
- **文件**: `supabase/migrations/20251025_rls_enable.sql`
- **内容**:
  - 3 个安全视图（user_accounts, event_full_view, event_prices_view）
  - 4 个性能索引
  - 5 张表的 RLS 启用
  - 11 条策略（events 2条, prices 2条, orders 3条, tickets 3条, merchants 1条）

### 2. 回滚脚本
- **文件**: `supabase/migrations/20251025_rls_disable_rollback.sql`
- **内容**: 完整回滚所有策略、RLS、视图、索引

### 3. 验证文档
- **文件**: `docs/RLS_GUIDE.md`
- **内容**: 执行步骤、回滚步骤、验证测试、故障排除

### 4. 验证脚本
- `scripts/verify-rls-anon.mjs` - 匿名场景测试
- `scripts/verify-rls-auth.mjs` - 登录场景测试

---

## 📊 策略统计

| 表 | 策略数 | SELECT | INSERT | UPDATE | DELETE |
|----|-------|--------|--------|--------|--------|
| events | 2 | ✅ 公开 | 商家 | 商家 | 商家 |
| prices | 2 | ✅ 公开 | 商家 | 商家 | 商家 |
| orders | 3 | 本人 | 允许 | 本人 | - |
| tickets | 3 | 本人 | 允许 | 商家/服务端 | - |
| merchants | 1 | 自有 | 自有 | 自有 | 自有 |

---

## 🔑 关键点

### 身份映射方式

由于 `orders` 表没有 `user_id` 字段，RLS 策略使用：

```sql
-- 通过 email 关联
customer_email = (SELECT email FROM users WHERE id = auth.uid())
```

**未来建议**: 迁移到 Supabase Auth 后，添加 `user_id UUID REFERENCES auth.users(id)` 字段

### Service Role 不受影响

✅ 所有服务端操作（webhook、出票）使用 Service Role，绕过 RLS 限制

---

## ⚡ 快速执行

```bash
# 执行 RLS 启用
psql $DATABASE_URL -f supabase/migrations/20251025_rls_enable.sql

# 回滚（如需要）
psql $DATABASE_URL -f supabase/migrations/20251025_rls_disable_rollback.sql
```

---

## 📝 验收清单

- [x] SQL 脚本完整且幂等
- [x] 回滚脚本可用
- [x] 验证手册完整
- [x] 不改 UI/业务逻辑
- [x] Service Role 路径不受影响
