-- 客户绑定和员工工资管理数据库表结构

-- 1. 创建客户绑定表
CREATE TABLE IF NOT EXISTS customer_bindings (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(200) NOT NULL UNIQUE,
    employee_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建工资记录表
CREATE TABLE IF NOT EXISTS salary_records (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    base_salary DECIMAL(10,2) NOT NULL DEFAULT 3000,
    sales_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    commission DECIMAL(10,2) NOT NULL DEFAULT 0,
    bonus DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_name, year, month)
);

-- 3. 启用 RLS
ALTER TABLE customer_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;

-- 4. 创建 RLS 策略
CREATE POLICY "customer_bindings_policy" ON customer_bindings FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "salary_records_policy" ON salary_records FOR ALL TO anon, authenticated USING (true);

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_customer_bindings_customer_name ON customer_bindings(customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_bindings_employee_name ON customer_bindings(employee_name);
CREATE INDEX IF NOT EXISTS idx_salary_records_employee_name ON salary_records(employee_name);
CREATE INDEX IF NOT EXISTS idx_salary_records_year_month ON salary_records(year, month);

-- 6. 创建视图：员工客户统计
CREATE OR REPLACE VIEW employee_customer_stats AS
SELECT 
    cb.employee_name,
    COUNT(cb.id) as customer_count,
    array_agg(cb.customer_name) as customers
FROM customer_bindings cb
GROUP BY cb.employee_name
ORDER BY customer_count DESC;

-- 7. 创建函数：计算员工月工资
CREATE OR REPLACE FUNCTION calculate_employee_salary(
    p_employee_name VARCHAR(100),
    p_year INTEGER,
    p_month INTEGER
)
RETURNS TABLE(
    base_salary DECIMAL,
    sales_quantity DECIMAL,
    commission DECIMAL,
    bonus DECIMAL,
    total_salary DECIMAL,
    transaction_count BIGINT
) AS $$
DECLARE
    sales_qty DECIMAL := 0;
    comm DECIMAL := 0;
    bon DECIMAL := 0;
    base_sal DECIMAL := 3000;
BEGIN
    -- 计算指定月份的销售数量（不包括赠送数量）
    SELECT COALESCE(SUM(quantity), 0), COUNT(*)
    INTO sales_qty, transaction_count
    FROM transactions
    WHERE collector = p_employee_name
      AND type = 'sale'
      AND EXTRACT(YEAR FROM created_at) = p_year
      AND EXTRACT(MONTH FROM created_at) = p_month;
    
    -- 计算提成：销售数量 × 0.7
    comm := sales_qty * 0.7;
    
    -- 计算奖金（按阶梯）
    IF sales_qty > 20000 THEN
        bon := 10000;
    ELSIF sales_qty > 7000 THEN
        bon := 5000;
    ELSIF sales_qty > 5000 THEN
        bon := 2000;
    ELSIF sales_qty > 3000 THEN
        bon := 1000;
    ELSIF sales_qty > 1000 THEN
        bon := 500;
    ELSE
        bon := 0;
    END IF;
    
    RETURN QUERY SELECT 
        base_sal,
        sales_qty,
        comm,
        bon,
        base_sal + comm + bon,
        transaction_count;
END;
$$ LANGUAGE plpgsql;

-- 8. 插入示例客户绑定（可选）
-- INSERT INTO customer_bindings (customer_name, employee_name) VALUES
-- ('客户A公司', '张三'),
-- ('客户B商店', '李四'),
-- ('客户C超市', '王五');

-- 9. 授予权限
GRANT SELECT ON employee_customer_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_employee_salary TO authenticated, anon;


