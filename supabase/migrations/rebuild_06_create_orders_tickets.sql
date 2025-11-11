-- ========================================
-- 数据库重建 - 第六步：创建订单和票据表
-- ========================================

BEGIN;

-- 创建订单表
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_age INTEGER,
  total_amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建订单表索引
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON public.orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- 创建订单表更新时间触发器
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建票据表
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tier TEXT NOT NULL,
  holder_email TEXT NOT NULL,
  holder_name TEXT,
  holder_age INTEGER,
  short_id TEXT UNIQUE NOT NULL,
  qr_payload TEXT,
  status TEXT DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'refunded')),
  used_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建票据表索引
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON public.tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_short_id ON public.tickets(short_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_holder_name ON public.tickets(holder_name);
CREATE INDEX IF NOT EXISTS idx_tickets_holder_age ON public.tickets(holder_age);
CREATE INDEX IF NOT EXISTS idx_tickets_redeemed_by ON public.tickets(redeemed_by);
CREATE INDEX IF NOT EXISTS idx_tickets_redeemed_at ON public.tickets(redeemed_at);
CREATE INDEX IF NOT EXISTS idx_tickets_used_at ON public.tickets(used_at);

COMMIT;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 第六步完成：订单和票据表已创建';
END $$;

