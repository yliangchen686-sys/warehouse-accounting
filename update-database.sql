-- 数据库更新脚本 - 添加库存管理功能

-- 1. 创建商品库存表
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL UNIQUE,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT '件',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 为库存表启用 RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 3. 创建库存表的 RLS 策略
CREATE POLICY "Allow all operations on inventory" ON inventory FOR ALL TO anon, authenticated USING (true);

-- 4. 创建库存变动记录表
CREATE TABLE IF NOT EXISTS inventory_changes (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    transaction_id INTEGER REFERENCES transactions(id),
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('increase', 'decrease')),
    quantity_change DECIMAL(10,2) NOT NULL,
    stock_before DECIMAL(10,2) NOT NULL,
    stock_after DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 为库存变动表启用 RLS
ALTER TABLE inventory_changes ENABLE ROW LEVEL SECURITY;

-- 6. 创建库存变动表的 RLS 策略
CREATE POLICY "Allow all operations on inventory_changes" ON inventory_changes FOR ALL TO anon, authenticated USING (true);

-- 7. 为 transactions 表添加商品名称字段
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS product_name VARCHAR(200);

-- 8. 创建更新库存的函数
CREATE OR REPLACE FUNCTION update_inventory_stock(
    p_product_name VARCHAR(200),
    p_quantity_change DECIMAL(10,2),
    p_change_type VARCHAR(20),
    p_transaction_id INTEGER DEFAULT NULL
)
RETURNS TABLE(old_stock DECIMAL, new_stock DECIMAL) AS $$
DECLARE
    current_stock_value DECIMAL(10,2);
    new_stock_value DECIMAL(10,2);
BEGIN
    -- 获取当前库存，如果商品不存在则创建
    INSERT INTO inventory (product_name, current_stock)
    VALUES (p_product_name, 0)
    ON CONFLICT (product_name) DO NOTHING;
    
    SELECT current_stock INTO current_stock_value
    FROM inventory
    WHERE product_name = p_product_name;
    
    -- 计算新库存
    IF p_change_type = 'increase' THEN
        new_stock_value := current_stock_value + p_quantity_change;
    ELSE
        new_stock_value := current_stock_value - p_quantity_change;
    END IF;
    
    -- 确保库存不为负数
    IF new_stock_value < 0 THEN
        new_stock_value := 0;
    END IF;
    
    -- 更新库存
    UPDATE inventory
    SET current_stock = new_stock_value,
        updated_at = NOW()
    WHERE product_name = p_product_name;
    
    -- 记录库存变动
    INSERT INTO inventory_changes (
        product_name, transaction_id, change_type, 
        quantity_change, stock_before, stock_after
    )
    VALUES (
        p_product_name, p_transaction_id, p_change_type,
        p_quantity_change, current_stock_value, new_stock_value
    );
    
    RETURN QUERY SELECT current_stock_value, new_stock_value;
END;
$$ LANGUAGE plpgsql;

-- 9. 插入一些示例商品
INSERT INTO inventory (product_name, current_stock, unit) VALUES
('商品A', 100, '件'),
('商品B', 50, '盒'),
('商品C', 200, '个')
ON CONFLICT (product_name) DO NOTHING;


