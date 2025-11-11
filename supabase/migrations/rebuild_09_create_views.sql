-- ========================================
-- 数据库重建 - 第九步：创建视图
-- ========================================

BEGIN;

-- 创建活动概览视图
CREATE OR REPLACE VIEW events_overview AS
SELECT 
    e.id,
    e.title,
    e.description,
    e.start_at,
    e.end_at,
    e.venue_name,
    e.status,
    e.poster_url,
    e.current_attendees,
    e.max_attendees,
    m.name as merchant_name,
    m.verified as merchant_verified,
    COUNT(p.id) as price_count,
    MIN(p.amount_cents) as min_price_cents,
    MAX(p.amount_cents) as max_price_cents
FROM public.events e
LEFT JOIN public.merchants m ON e.merchant_id = m.id
LEFT JOIN public.prices p ON e.id = p.event_id AND p.is_active = true
GROUP BY e.id, e.title, e.description, e.start_at, e.end_at, e.venue_name, 
         e.status, e.poster_url, e.current_attendees, e.max_attendees, 
         m.name, m.verified;

-- 创建商家统计视图
CREATE OR REPLACE VIEW merchant_stats AS
SELECT 
    m.id,
    m.name,
    m.verified,
    COUNT(DISTINCT e.id) as total_events,
    COUNT(DISTINCT CASE WHEN e.status = 'published' THEN e.id END) as published_events,
    SUM(CASE WHEN e.status = 'published' THEN e.current_attendees ELSE 0 END) as total_attendees,
    SUM(CASE WHEN p.is_active = true THEN p.sold_count * p.amount_cents ELSE 0 END) as total_revenue_cents
FROM public.merchants m
LEFT JOIN public.events e ON m.id = e.merchant_id
LEFT JOIN public.prices p ON e.id = p.event_id
GROUP BY m.id, m.name, m.verified;

COMMIT;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 第九步完成：视图已创建';
END $$;

