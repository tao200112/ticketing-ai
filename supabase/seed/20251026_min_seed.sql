-- ========================================
-- PR-7: 最小种子数据
-- ========================================
-- 功能：插入最小必需数据，确保系统可正常运行
-- 原则：幂等执行，仅在不存在的条件下插入

BEGIN;

-- ========================================
-- 1. 插入示例事件（如果不存在）
-- ========================================

INSERT INTO events (
    id,
    title,
    description,
    slug,
    status,
    start_at,
    end_at,
    venue_name,
    address,
    max_attendees,
    poster_url,
    merchant_id,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'Ridiculous Chicken Night',
    'Enjoy delicious chicken and an amazing night at Virginia Tech''s most popular event. We provide the freshest ingredients, the most unique cooking methods, and the warmest service.',
    'ridiculous-chicken',
    'published',
    NOW() + INTERVAL '30 days',
    NOW() + INTERVAL '30 days' + INTERVAL '3 hours',
    'Shanghai Concert Hall',
    'Shanghai Concert Hall',
    150,
    NULL,
    (SELECT id FROM merchants LIMIT 1), -- 使用第一个商家
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM events WHERE slug = 'ridiculous-chicken'
);

-- ========================================
-- 2. 插入示例价格（如果事件存在且无价格）
-- ========================================

INSERT INTO prices (
    id,
    event_id,
    name,
    description,
    amount_cents,
    currency,
    inventory,
    limit_per_user,
    is_active,
    valid_from,
    valid_to,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    e.id,
    'Regular Ticket (21+)',
    'General admission ticket for adults 21 and over',
    1500,
    'usd',
    100,
    5,
    TRUE,
    NOW(),
    NOW() + INTERVAL '1 year',
    NOW(),
    NOW()
FROM events e
WHERE e.slug = 'ridiculous-chicken'
  AND NOT EXISTS (
    SELECT 1 FROM prices WHERE event_id = e.id
  );

-- 插入第二个价格选项
INSERT INTO prices (
    id,
    event_id,
    name,
    description,
    amount_cents,
    currency,
    inventory,
    limit_per_user,
    is_active,
    valid_from,
    valid_to,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    e.id,
    'Special Ticket (18-20)',
    'Special ticket for ages 18-20',
    3000,
    'usd',
    50,
    2,
    TRUE,
    NOW(),
    NOW() + INTERVAL '1 year',
    NOW(),
    NOW()
FROM events e
WHERE e.slug = 'ridiculous-chicken'
  AND (SELECT COUNT(*) FROM prices WHERE event_id = e.id) = 1; -- 只有一条价格时添加第二条

-- ========================================
-- 3. 确保有默认商家（如果不存在）
-- ========================================

INSERT INTO merchants (
    id,
    name,
    contact_email,
    description,
    verified,
    status,
    owner_user_id,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'Default Merchant',
    'merchant@example.com',
    'Default merchant for testing',
    FALSE,
    'active',
    (SELECT id FROM users WHERE role = 'merchant' LIMIT 1),
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM merchants
);

-- ========================================
-- 4. 统计查询
-- ========================================

-- 显示插入结果
SELECT 
    'Seed data insertion completed' as status,
    (SELECT COUNT(*) FROM events WHERE slug = 'ridiculous-chicken') as events_count,
    (SELECT COUNT(*) FROM prices p 
     JOIN events e ON p.event_id = e.id 
     WHERE e.slug = 'ridiculous-chicken') as prices_count,
    (SELECT COUNT(*) FROM merchants) as merchants_count;

-- 显示具体数据
SELECT 
    'Events with ridiculous-chicken slug:' as info,
    id,
    title,
    slug,
    status,
    start_at
FROM events 
WHERE slug = 'ridiculous-chicken';

SELECT 
    'Prices for ridiculous-chicken event:' as info,
    p.id,
    p.name,
    p.amount_cents,
    p.currency,
    p.inventory,
    p.is_active
FROM prices p
JOIN events e ON p.event_id = e.id
WHERE e.slug = 'ridiculous-chicken';

COMMIT;
