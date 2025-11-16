-- 添加临时密码字段到 merchants 表（仅用于管理员查看，调试目的）
-- 注意：这是不安全的做法，仅用于调试

-- 检查并添加 temp_password 列（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'merchants' 
    AND column_name = 'temp_password'
  ) THEN
    ALTER TABLE merchants 
    ADD COLUMN temp_password TEXT;
    
    COMMENT ON COLUMN merchants.temp_password IS '临时存储的明文密码（仅用于管理员查看，调试目的）。注意：这是不安全的做法，仅用于调试。';
  END IF;
END $$;

