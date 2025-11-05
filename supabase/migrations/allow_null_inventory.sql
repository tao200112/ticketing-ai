-- 允许库存为null（表示无限库存）
-- 修改库存检查触发器，当inventory为null时跳过检查

-- 更新库存检查函数
CREATE OR REPLACE FUNCTION check_inventory_constraint()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果inventory为null，表示无限库存，跳过检查
    IF NEW.inventory IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- 只在有库存限制时检查
    IF NEW.sold_count > NEW.inventory THEN
        RAISE EXCEPTION 'Sold count cannot exceed inventory';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 确保触发器存在
DROP TRIGGER IF EXISTS check_prices_inventory ON prices;
CREATE TRIGGER check_prices_inventory 
    BEFORE INSERT OR UPDATE ON prices
    FOR EACH ROW 
    EXECUTE FUNCTION check_inventory_constraint();

