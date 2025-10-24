-- 创建测试商家账号
-- 在 Supabase SQL Editor 中运行此文件

-- 1. 创建测试用户
INSERT INTO users (id, email, name, age, password_hash, role, created_at)
VALUES (
    'test-user-123',
    'test@merchant.com',
    'Test Merchant',
    25,
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8Kz8', -- password: test123
    'merchant',
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- 2. 创建测试商家
INSERT INTO merchants (id, owner_user_id, name, description, contact_email, verified, status, created_at)
VALUES (
    'test-merchant-123',
    'test-user-123',
    'Test Business',
    'A test business for development',
    'test@merchant.com',
    true,
    'active',
    NOW()
) ON CONFLICT (contact_email) DO NOTHING;

-- 3. 创建测试活动
INSERT INTO events (id, merchant_id, title, description, start_at, end_at, venue_name, status, created_at)
VALUES (
    'test-event-123',
    'test-merchant-123',
    'Test Event',
    'A test event for development',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '3 hours',
    'Test Venue',
    'published',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. 创建测试价格
INSERT INTO prices (id, event_id, name, description, amount_cents, currency, inventory, is_active, created_at)
VALUES (
    'test-price-123',
    'test-event-123',
    'General Admission',
    'General admission ticket',
    2000, -- $20.00
    'USD',
    100,
    true,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 5. 验证数据
SELECT 
    u.email as user_email,
    u.name as user_name,
    m.name as business_name,
    m.verified as business_verified,
    e.title as event_title,
    p.name as price_name,
    p.amount_cents as price_amount
FROM users u
JOIN merchants m ON u.id = m.owner_user_id
LEFT JOIN events e ON m.id = e.merchant_id
LEFT JOIN prices p ON e.id = p.event_id
WHERE u.email = 'test@merchant.com';

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE 'Test merchant account created successfully!';
    RAISE NOTICE 'Email: test@merchant.com';
    RAISE NOTICE 'Password: test123';
    RAISE NOTICE 'Business: Test Business';
    RAISE NOTICE 'Event: Test Event';
    RAISE NOTICE 'Price: $20.00 General Admission';
END $$;
