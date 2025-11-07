-- ========================================
-- 为 tickets 表的 used_at 字段添加索引
-- 用于优化事后核验查询性能
-- ========================================

-- 添加 used_at 索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_tickets_used_at ON tickets(used_at);

-- 添加复合索引：用于查询已使用的票务（按使用时间排序）
CREATE INDEX IF NOT EXISTS idx_tickets_status_used_at ON tickets(status, used_at) 
WHERE status = 'used';

-- 添加复合索引：用于查询特定用户的已使用票务
CREATE INDEX IF NOT EXISTS idx_tickets_user_id_used_at ON tickets(user_id, used_at) 
WHERE used_at IS NOT NULL;

-- 添加注释说明索引用途
COMMENT ON INDEX idx_tickets_used_at IS 'Index for querying tickets by usage timestamp for verification purposes';
COMMENT ON INDEX idx_tickets_status_used_at IS 'Composite index for querying used tickets sorted by usage time';
COMMENT ON INDEX idx_tickets_user_id_used_at IS 'Composite index for querying user tickets by usage time';

SELECT 'Migration completed: Added indexes for used_at field' as status;

