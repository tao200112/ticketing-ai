# 数据库迁移说明

## 📋 迁移步骤

由于 Supabase 的限制，需要手动在 Supabase SQL Editor 中运行迁移脚本。

### 1. 打开 Supabase SQL Editor

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目：`htaqcvnyipiqdbmvvfvj`
3. 点击左侧菜单的 "SQL Editor"

### 2. 运行迁移脚本

复制以下 SQL 脚本并在 SQL Editor 中运行：

```sql
-- 邮箱验证和找回密码功能数据库迁移
-- 在 Supabase SQL Editor 中运行此文件

-- ========================================
-- 更新用户表，添加邮箱验证相关字段
-- ========================================

-- 添加邮箱验证相关字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_password_reset_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reset_token_hash TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expire_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_expire_at TIMESTAMPTZ;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified_at);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token_hash);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(email_verification_token);

-- ========================================
-- 创建限流表
-- ========================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL, -- IP地址或邮箱
  type TEXT NOT NULL CHECK (type IN ('ip', 'email', 'action')),
  action TEXT NOT NULL, -- 操作类型：register, login, reset_password, verify_email
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_type_action ON rate_limits(key, type, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);

-- ========================================
-- 创建邮箱验证日志表
-- ========================================

CREATE TABLE IF NOT EXISTS email_verification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('verification_sent', 'verification_verified', 'password_reset_sent', 'password_reset_used')),
  token_hash TEXT,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_user_id ON email_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_email ON email_verification_logs(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_created_at ON email_verification_logs(created_at);

-- ========================================
-- 创建 RLS 策略
-- ========================================

-- 启用 RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_logs ENABLE ROW LEVEL SECURITY;

-- 限流表策略：只有服务端可以访问
CREATE POLICY "rate_limits_service_only" ON rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- 邮箱验证日志策略：用户只能查看自己的日志
CREATE POLICY "email_verification_logs_user_access" ON email_verification_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "email_verification_logs_service_access" ON email_verification_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- 创建清理过期数据的函数
-- ========================================

CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  -- 清理过期的重置令牌
  UPDATE users 
  SET reset_token_hash = NULL, reset_token_expire_at = NULL
  WHERE reset_token_expire_at < NOW();
  
  -- 清理过期的验证令牌
  UPDATE users 
  SET email_verification_token = NULL, email_verification_expire_at = NULL
  WHERE email_verification_expire_at < NOW();
  
  -- 清理过期的限流记录
  DELETE FROM rate_limits WHERE expires_at < NOW();
  
  -- 清理旧的验证日志（保留30天）
  DELETE FROM email_verification_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 创建检查邮箱验证状态的函数
-- ========================================

CREATE OR REPLACE FUNCTION is_email_verified(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND email_verified_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 创建检查限流的函数
-- ========================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_type TEXT,
  p_action TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  -- 获取当前窗口的开始时间
  window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- 获取当前计数
  SELECT COALESCE(SUM(count), 0) INTO current_count
  FROM rate_limits
  WHERE key = p_key 
    AND type = p_type 
    AND action = p_action
    AND window_start >= window_start;
  
  -- 检查是否超过限制
  IF current_count >= p_max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- 记录本次尝试
  INSERT INTO rate_limits (key, type, action, window_start, expires_at)
  VALUES (p_key, p_type, p_action, NOW(), NOW() + (p_window_minutes || ' minutes')::INTERVAL)
  ON CONFLICT (key, type, action, window_start) 
  DO UPDATE SET count = rate_limits.count + 1;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 创建发送验证邮件的函数
-- ========================================

CREATE OR REPLACE FUNCTION send_verification_email(
  p_user_id UUID,
  p_email TEXT
)
RETURNS TEXT AS $$
DECLARE
  verification_token TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  -- 生成验证令牌
  verification_token := encode(gen_random_bytes(32), 'hex');
  expires_at := NOW() + INTERVAL '24 hours';
  
  -- 更新用户记录
  UPDATE users 
  SET email_verification_token = verification_token,
      email_verification_expire_at = expires_at
  WHERE id = p_user_id;
  
  -- 记录日志
  INSERT INTO email_verification_logs (user_id, email, action, token_hash, success)
  VALUES (p_user_id, p_email, 'verification_sent', encode(digest(verification_token, 'sha256'), 'hex'), TRUE);
  
  RETURN verification_token;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 创建发送重置密码邮件的函数
-- ========================================

CREATE OR REPLACE FUNCTION send_password_reset_email(
  p_user_id UUID,
  p_email TEXT
)
RETURNS TEXT AS $$
DECLARE
  reset_token TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  -- 生成重置令牌
  reset_token := encode(gen_random_bytes(32), 'hex');
  expires_at := NOW() + INTERVAL '30 minutes';
  
  -- 更新用户记录
  UPDATE users 
  SET reset_token_hash = encode(digest(reset_token, 'sha256'), 'hex'),
      reset_token_expire_at = expires_at,
      last_password_reset_sent_at = NOW()
  WHERE id = p_user_id;
  
  -- 记录日志
  INSERT INTO email_verification_logs (user_id, email, action, token_hash, success)
  VALUES (p_user_id, p_email, 'password_reset_sent', encode(digest(reset_token, 'sha256'), 'hex'), TRUE);
  
  RETURN reset_token;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 完成迁移
-- ========================================

-- 更新现有用户的邮箱验证状态（可选）
-- 如果你想让现有用户需要重新验证邮箱，可以注释掉下面的代码
UPDATE users 
SET email_verified_at = NOW() 
WHERE email_verified_at IS NULL;

-- 输出完成信息
DO $$
BEGIN
  RAISE NOTICE '邮箱验证和找回密码功能数据库迁移完成！';
  RAISE NOTICE '新增字段：email_verified_at, last_password_reset_sent_at, reset_token_hash, reset_token_expire_at';
  RAISE NOTICE '新增表：rate_limits, email_verification_logs';
  RAISE NOTICE '新增函数：is_email_verified, check_rate_limit, send_verification_email, send_password_reset_email';
END $$;
```

### 3. 验证迁移结果

运行以下查询来验证迁移是否成功：

```sql
-- 检查用户表新增字段
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN (
  'email_verified_at',
  'last_password_reset_sent_at', 
  'reset_token_hash',
  'reset_token_expire_at',
  'email_verification_token',
  'email_verification_expire_at'
);

-- 检查新增表
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('rate_limits', 'email_verification_logs');

-- 检查新增函数
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'is_email_verified',
  'check_rate_limit', 
  'send_verification_email',
  'send_password_reset_email'
);
```

### 4. 完成迁移

如果所有查询都返回预期的结果，说明迁移成功！

## 🎉 迁移完成后

运行以下命令测试功能：

```bash
# 测试环境变量
npm run test:env

# 测试邮箱验证功能
npm run test:email-verification-simple
```

## ❓ 如果遇到问题

1. **权限错误**: 确保使用 Service Role Key
2. **语法错误**: 检查 SQL 语法
3. **字段已存在**: 忽略 "already exists" 错误
4. **函数创建失败**: 检查函数名称冲突

## 📞 获取帮助

如果遇到问题，可以：
1. 查看 Supabase 日志
2. 检查 SQL 语法
3. 联系技术支持
