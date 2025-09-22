-- 修复客户绑定表策略

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "customer_bindings_policy" ON customer_bindings;

-- 重新创建策略
CREATE POLICY "customer_bindings_all_access" ON customer_bindings FOR ALL TO anon, authenticated USING (true);

-- 确保表存在并启用 RLS
CREATE TABLE IF NOT EXISTS customer_bindings (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(200) NOT NULL UNIQUE,
    employee_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE customer_bindings ENABLE ROW LEVEL SECURITY;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_customer_bindings_customer_name ON customer_bindings(customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_bindings_employee_name ON customer_bindings(employee_name);

-- 插入一些测试数据
INSERT INTO customer_bindings (customer_name, employee_name) VALUES
('测试客户A', '西瓜'),
('测试客户B', '商人')
ON CONFLICT (customer_name) DO NOTHING;
