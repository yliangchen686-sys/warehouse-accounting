-- 更新客户赠送表结构，支持月度追踪和倒计时

-- 删除旧表重新创建
DROP TABLE IF EXISTS customer_gifts CASCADE;

-- 创建新的客户赠送记录表
CREATE TABLE customer_gifts (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(200) NOT NULL,
    daily_gift_quantity INTEGER NOT NULL DEFAULT 0,
    current_month_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
    last_month_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_month_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    last_month_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    gift_source VARCHAR(50) NOT NULL,
    gift_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    remaining_days INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE customer_gifts ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "customer_gifts_all_access" ON customer_gifts FOR ALL TO anon, authenticated USING (true);

-- 创建索引
CREATE INDEX idx_customer_gifts_customer_name ON customer_gifts(customer_name);
CREATE INDEX idx_customer_gifts_gift_end_date ON customer_gifts(gift_end_date);
CREATE INDEX idx_customer_gifts_remaining_days ON customer_gifts(remaining_days);
CREATE INDEX idx_customer_gifts_created_at ON customer_gifts(created_at);

-- 创建视图：客户赠送汇总
CREATE OR REPLACE VIEW customer_gift_summary AS
SELECT 
    customer_name,
    daily_gift_quantity,
    current_month_sales,
    last_month_sales,
    current_month_amount + last_month_amount as total_amount,
    gift_source,
    gift_end_date,
    remaining_days,
    CASE 
        WHEN current_month_sales + last_month_sales >= 5000 THEN 'VIP客户'
        WHEN current_month_sales + last_month_sales >= 1000 THEN '优质客户'
        ELSE '普通客户'
    END as customer_level,
    created_at
FROM customer_gifts
WHERE remaining_days > 0
ORDER BY remaining_days ASC, (current_month_sales + last_month_sales) DESC;


