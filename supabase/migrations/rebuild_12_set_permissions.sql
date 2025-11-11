-- ========================================
-- 数据库重建 - 第十二步：设置权限
-- ========================================

BEGIN;

-- 授予服务角色所有权限
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.merchants TO service_role;
GRANT ALL ON public.merchant_members TO service_role;
GRANT ALL ON public.events TO service_role;
GRANT ALL ON public.prices TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.tickets TO service_role;
GRANT ALL ON public.activities TO service_role;
GRANT ALL ON public.contact_messages TO service_role;
GRANT ALL ON public.admin_invite_codes TO service_role;

-- 授予认证用户基本权限
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.merchants TO authenticated;
GRANT SELECT ON public.events TO authenticated;
GRANT SELECT ON public.prices TO authenticated;
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT SELECT ON public.tickets TO authenticated;
GRANT SELECT ON public.activities TO authenticated;
GRANT INSERT ON public.contact_messages TO authenticated;

-- 授予匿名用户基本权限
GRANT INSERT ON public.users TO anon;
GRANT SELECT ON public.merchants TO anon;
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.prices TO anon;
GRANT SELECT ON public.activities TO anon;
GRANT INSERT ON public.contact_messages TO anon;
GRANT SELECT ON public.admin_invite_codes TO anon;

COMMIT;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 第十二步完成：所有权限已设置';
    RAISE NOTICE '🎉 数据库重建完成！';
    RAISE NOTICE '📊 所有表、索引、触发器、RLS 策略和权限已正确设置';
END $$;

