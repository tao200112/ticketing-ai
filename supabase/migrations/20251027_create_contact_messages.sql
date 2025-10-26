-- 创建联系表单消息表
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  zip VARCHAR(20),
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, read, replied
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- 启用 RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- 创建策略：管理员可以查看所有消息
CREATE POLICY "Admins can view all contact messages"
  ON contact_messages FOR SELECT
  USING (true); -- 临时允许所有人读取，后续应该基于用户角色

-- 创建策略：任何人都可以创建消息
CREATE POLICY "Anyone can create contact messages"
  ON contact_messages FOR INSERT
  WITH CHECK (true);

-- 创建策略：管理员可以更新消息状态
CREATE POLICY "Admins can update contact messages"
  ON contact_messages FOR UPDATE
  USING (true) -- 临时允许所有人更新
  WITH CHECK (true);
