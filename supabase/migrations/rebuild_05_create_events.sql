-- ========================================
-- 数据库重建 - 第五步：创建活动相关表
-- ========================================

BEGIN;

-- 创建活动表
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  venue_name TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'US',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  poster_url TEXT,
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 999999,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建活动表索引
CREATE INDEX IF NOT EXISTS idx_events_merchant_id ON public.events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events(start_at);
CREATE INDEX IF NOT EXISTS idx_events_sort_order ON public.events(sort_order);

-- 创建活动表更新时间触发器
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON public.events
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建活动参与人数检查触发器
DROP TRIGGER IF EXISTS check_events_attendees ON public.events;
CREATE TRIGGER check_events_attendees 
    BEFORE INSERT OR UPDATE ON public.events
    FOR EACH ROW 
    EXECUTE FUNCTION check_event_attendees_constraint();

-- 创建价格表
CREATE TABLE IF NOT EXISTS public.prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'CNY')),
  inventory INTEGER DEFAULT 0 CHECK (inventory >= 0),
  sold_count INTEGER DEFAULT 0 CHECK (sold_count >= 0),
  limit_per_user INTEGER DEFAULT 4 CHECK (limit_per_user > 0),
  tier_sort INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建价格表索引
CREATE INDEX IF NOT EXISTS idx_prices_event_id ON public.prices(event_id);
CREATE INDEX IF NOT EXISTS idx_prices_is_active ON public.prices(is_active);

-- 创建价格表更新时间触发器
DROP TRIGGER IF EXISTS update_prices_updated_at ON public.prices;
CREATE TRIGGER update_prices_updated_at 
    BEFORE UPDATE ON public.prices
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建价格库存检查触发器
DROP TRIGGER IF EXISTS check_prices_inventory ON public.prices;
CREATE TRIGGER check_prices_inventory 
    BEFORE INSERT OR UPDATE ON public.prices
    FOR EACH ROW 
    EXECUTE FUNCTION check_inventory_constraint();

COMMIT;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 第五步完成：活动相关表已创建';
END $$;

