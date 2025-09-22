-- 客户每日赠送功能数据库表

-- 创建客户赠送记录表
CREATE TABLE IF NOT EXISTS customer_gifts (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(200) NOT NULL,
    gift_quantity INTEGER NOT NULL DEFAULT 0,
    sales_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    sales_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    gift_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE customer_gifts ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "customer_gifts_policy" ON customer_gifts FOR ALL TO anon, authenticated USING (true);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_customer_gifts_customer_name ON customer_gifts(customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_gifts_gift_date ON customer_gifts(gift_date);
CREATE INDEX IF NOT EXISTS idx_customer_gifts_created_at ON customer_gifts(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_gifts_sales_quantity ON customer_gifts(sales_quantity);

-- 创建视图：客户赠送统计
CREATE OR REPLACE VIEW customer_gift_summary AS
SELECT 
    customer_name,
    COUNT(*) as gift_count,
    SUM(gift_quantity) as total_gifts,
    SUM(sales_quantity) as total_sales_quantity,
    SUM(sales_amount) as total_sales_amount,
    MAX(gift_date) as last_gift_date
FROM customer_gifts
GROUP BY customer_name
ORDER BY total_sales_quantity DESC;


