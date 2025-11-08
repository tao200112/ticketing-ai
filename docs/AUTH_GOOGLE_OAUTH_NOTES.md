## Google OAuth 数据流概览（2025-11-08）

1. **auth.users 写入**  
   - Supabase 完成 OAuth 或邮箱注册后，首先向 `auth.users` 插入一条账号记录，包含 `raw_app_meta_data`（provider 信息）和 `raw_user_meta_data`（Google profile、潜在 role 提示等）。

2. **触发器同步到 public.users**  
   - 迁移 `202511080345_handle_new_auth_user_upsert.sql` 重写了 `public.handle_new_auth_user_to_users`。  
   - 逻辑：`INSERT ... ON CONFLICT (email, role) DO UPDATE`，因此同一个 `(email, role)` 只会保留一条业务用户记录。  
   - 当冲突发生时只更新 `name / auth_provider / email_verified_at / updated_at`，并在 Supabase Logs 输出 `handle_new_auth_user_to_users:` 的日志，帮助诊断是“新插入”还是“复用旧记录”。  
   - 触发器默认 role 为 `'user'`，其它角色由应用层在后续 API 中更新。

3. **Next.js /api/auth/callback**  
   - 负责交换 Supabase Session、根据业务需求（域名、state 参数）推断目标 `role`，并通过 `users` 表的 `(email, role)` upsert 更新业务字段（如 `name`、`auth_provider`、`registration_domain` 等）。  
   - 任何写入 `public.users` 的操作都必须以 `(email, role)` 作为 `onConflict` 条件，避免与数据库触发器重复插入。

4. **唯一约束保证**  
   - `users_email_role_unique` 保证 `(email, role)` 不重复。触发器与 API 均使用 upsert 策略，因此不会再看到 `duplicate key value violates unique constraint "users_email_role_unique"`。

5. **调试提示**  
   - Supabase Logs 中的 `handle_new_auth_user_to_users:` 日志可快速判断是插入还是更新。  
   - 前端在调用 `signInWithOAuth` 时输出 `signInWithOAuth result` 与 `Redirecting to provider URL`，方便复原登录流程。  
   - 如果仍检测到重复，请使用 `docs/DB_DUPLICATE_USERS_CLEANUP.sql` 中的查询排查历史数据，并参照模板手动清理。

