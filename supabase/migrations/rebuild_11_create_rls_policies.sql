-- ========================================
-- 数据库重建 - 第十一步：创建 RLS 策略
-- ========================================

BEGIN;

-- ========================================
-- Users RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Allow service role to manage users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow public registration" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON public.users;

-- 服务角色可以完全管理用户
CREATE POLICY "Allow service role to manage users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- 用户可以查看自己的资料
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- 用户可以更新自己的资料
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 允许公开注册（插入新用户）
CREATE POLICY "Allow public registration" ON public.users
  FOR INSERT WITH CHECK (true);

-- 认证用户可以看到用户数据（用于基本查找）
CREATE POLICY "Allow authenticated users to read users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

-- ========================================
-- Merchants RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Merchants: Public read verified" ON public.merchants;
DROP POLICY IF EXISTS "Merchants: Owner can manage" ON public.merchants;
DROP POLICY IF EXISTS "Merchants: Service role can manage" ON public.merchants;

-- 公开读取已验证的商家
CREATE POLICY "Merchants: Public read verified" ON public.merchants
  FOR SELECT USING (verified = true AND status = 'active');

-- 商家拥有者可以管理自己的商家
CREATE POLICY "Merchants: Owner can manage" ON public.merchants
  FOR ALL USING (owner_user_id = auth.uid());

-- 服务角色可以管理所有商家
CREATE POLICY "Merchants: Service role can manage" ON public.merchants
  FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- Merchant Members RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Merchant Members: Access own membership" ON public.merchant_members;
DROP POLICY IF EXISTS "Merchant Members: Merchant owner can manage" ON public.merchant_members;

-- 用户可以查看自己的商家成员身份
CREATE POLICY "Merchant Members: Access own membership" ON public.merchant_members
  FOR SELECT USING (user_id = auth.uid());

-- 商家拥有者可以管理自己商家的成员
CREATE POLICY "Merchant Members: Merchant owner can manage" ON public.merchant_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = merchant_members.merchant_id
      AND m.owner_user_id = auth.uid()
    )
  );

-- ========================================
-- Events RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Events: Public read published" ON public.events;
DROP POLICY IF EXISTS "Events: Access for merchant members and owners" ON public.events;

-- 公开读取已发布的活动
CREATE POLICY "Events: Public read published" ON public.events
  FOR SELECT USING (status = 'published');

-- 商家成员和拥有者可以访问自己的活动
CREATE POLICY "Events: Access for merchant members and owners" ON public.events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.merchant_members mm
      WHERE mm.merchant_id = events.merchant_id
      AND mm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = events.merchant_id
      AND m.owner_user_id = auth.uid()
    )
  );

-- ========================================
-- Prices RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Prices: Public read active" ON public.prices;
DROP POLICY IF EXISTS "Prices: Merchant can manage" ON public.prices;

-- 公开读取活跃的价格
CREATE POLICY "Prices: Public read active" ON public.prices
  FOR SELECT USING (is_active = true);

-- 商家可以管理自己活动的价格
CREATE POLICY "Prices: Merchant can manage" ON public.prices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.merchants m ON e.merchant_id = m.id
      WHERE e.id = prices.event_id
      AND (m.owner_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.merchant_members mm
        WHERE mm.merchant_id = m.id
        AND mm.user_id = auth.uid()
      ))
    )
  );

-- ========================================
-- Orders RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Orders: Access for merchant members and owners" ON public.orders;
DROP POLICY IF EXISTS "Orders: User can view own" ON public.orders;

-- 商家成员和拥有者可以访问自己商家的订单
CREATE POLICY "Orders: Access for merchant members and owners" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.events e ON t.event_id = e.id
      JOIN public.merchant_members mm ON mm.merchant_id = e.merchant_id
      WHERE t.order_id = orders.id
      AND mm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.events e ON t.event_id = e.id
      JOIN public.merchants m ON m.id = e.merchant_id
      WHERE t.order_id = orders.id
      AND m.owner_user_id = auth.uid()
    )
  );

-- 用户可以查看自己的订单
CREATE POLICY "Orders: User can view own" ON public.orders
  FOR SELECT USING (user_id = auth.uid() OR customer_email = (SELECT email FROM public.users WHERE id = auth.uid()));

-- ========================================
-- Tickets RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Tickets: Access for merchant members and owners" ON public.tickets;
DROP POLICY IF EXISTS "Tickets: Update for merchant members and owners" ON public.tickets;
DROP POLICY IF EXISTS "Tickets: User can view own" ON public.tickets;

-- 商家成员和拥有者可以访问自己商家的票据
CREATE POLICY "Tickets: Access for merchant members and owners" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.merchant_members mm ON mm.merchant_id = e.merchant_id
      WHERE e.id = tickets.event_id
      AND mm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.merchants m ON m.id = e.merchant_id
      WHERE e.id = tickets.event_id
      AND m.owner_user_id = auth.uid()
    )
  );

-- 商家成员和拥有者可以更新自己商家的票据（用于兑换）
CREATE POLICY "Tickets: Update for merchant members and owners" ON public.tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.merchant_members mm ON mm.merchant_id = e.merchant_id
      WHERE e.id = tickets.event_id
      AND mm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.merchants m ON m.id = e.merchant_id
      WHERE e.id = tickets.event_id
      AND m.owner_user_id = auth.uid()
    )
  );

-- 用户可以查看自己的票据
CREATE POLICY "Tickets: User can view own" ON public.tickets
  FOR SELECT USING (user_id = auth.uid() OR holder_email = (SELECT email FROM public.users WHERE id = auth.uid()));

-- ========================================
-- Activities RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Activities: Public read active" ON public.activities;
DROP POLICY IF EXISTS "Activities: Admin can manage" ON public.activities;

-- 公开读取活跃的活动内容
CREATE POLICY "Activities: Public read active" ON public.activities
  FOR SELECT USING (is_active = true);

-- 管理员可以管理活动内容（需要 service_role 或 admin 角色）
CREATE POLICY "Activities: Admin can manage" ON public.activities
  FOR ALL USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- ========================================
-- Contact Messages RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Contact Messages: Anyone can create" ON public.contact_messages;
DROP POLICY IF EXISTS "Contact Messages: Admin can view" ON public.contact_messages;
DROP POLICY IF EXISTS "Contact Messages: Admin can update" ON public.contact_messages;

-- 任何人都可以创建联系消息
CREATE POLICY "Contact Messages: Anyone can create" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

-- 管理员可以查看所有联系消息
CREATE POLICY "Contact Messages: Admin can view" ON public.contact_messages
  FOR SELECT USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- 管理员可以更新联系消息状态
CREATE POLICY "Contact Messages: Admin can update" ON public.contact_messages
  FOR UPDATE USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

-- ========================================
-- Admin Invite Codes RLS 策略
-- ========================================

-- 删除现有策略
DROP POLICY IF EXISTS "Admin Invite Codes: Public can read active" ON public.admin_invite_codes;
DROP POLICY IF EXISTS "Admin Invite Codes: Admin can manage" ON public.admin_invite_codes;

-- 公开可以读取活跃的邀请码
CREATE POLICY "Admin Invite Codes: Public can read active" ON public.admin_invite_codes
  FOR SELECT USING (is_active = true AND expires_at > NOW());

-- 管理员可以管理邀请码
CREATE POLICY "Admin Invite Codes: Admin can manage" ON public.admin_invite_codes
  FOR ALL USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

COMMIT;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 第十一步完成：所有 RLS 策略已创建';
END $$;

