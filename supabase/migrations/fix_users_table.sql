-- 修复 users 表结构
-- 安全地添加缺失的列

-- 检查并添加 is_active 列
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to users table';
    ELSE
        RAISE NOTICE 'is_active column already exists in users table';
    END IF;
END $$;

-- 检查并添加 created_at 列
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to users table';
    ELSE
        RAISE NOTICE 'created_at column already exists in users table';
    END IF;
END $$;

-- 检查并添加 updated_at 列
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to users table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in users table';
    END IF;
END $$;

-- 检查并添加 role 列
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'merchant', 'admin'));
        RAISE NOTICE 'Added role column to users table';
    ELSE
        RAISE NOTICE 'role column already exists in users table';
    END IF;
END $$;

-- 检查并添加 age 列
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'age') THEN
        ALTER TABLE users ADD COLUMN age INTEGER NOT NULL DEFAULT 18 CHECK (age >= 16);
        RAISE NOTICE 'Added age column to users table';
    ELSE
        RAISE NOTICE 'age column already exists in users table';
    END IF;
END $$;

-- 检查并添加 password_hash 列
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
        RAISE NOTICE 'Added password_hash column to users table';
    ELSE
        RAISE NOTICE 'password_hash column already exists in users table';
    END IF;
END $$;

-- 现在插入默认管理员账号（如果不存在）
INSERT INTO users (email, name, age, password_hash, role, is_active) 
VALUES (
  'admin@partytix.com',
  'Admin User',
  25,
  '$2b$10$9C1ympkGwmvLWuVtJtic6OhWpYewlZlUOe2Mdk97cg7SHYJkCpI9a', -- password: admin123
  'admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- 插入默认邀请码（如果不存在）
INSERT INTO admin_invite_codes (code, is_active, expires_at) 
VALUES (
  'WELCOME2024',
  true,
  '2025-12-31T23:59:59Z'
) ON CONFLICT (code) DO NOTHING;

SELECT 'Users table structure fixed successfully!' as status;
