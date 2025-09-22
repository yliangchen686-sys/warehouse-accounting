-- 员工收款管理数据库表结构

-- 创建员工转账记录表
CREATE TABLE IF NOT EXISTS employee_transfers (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transfer_date TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为员工转账表启用 RLS
ALTER TABLE employee_transfers ENABLE ROW LEVEL SECURITY;

-- 创建员工转账表的 RLS 策略
CREATE POLICY "Allow all operations on employee_transfers" ON employee_transfers FOR ALL TO anon, authenticated USING (true);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_employee_transfers_employee_name ON employee_transfers(employee_name);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_transfer_date ON employee_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_created_at ON employee_transfers(created_at);

-- 创建视图：员工收款统计
CREATE OR REPLACE VIEW employee_payment_summary AS
SELECT 
    t.collector as employee_name,
    COUNT(t.id) as transaction_count,
    SUM(t.total_amount) as total_collected,
    COALESCE(tf.total_transferred, 0) as total_transferred,
    SUM(t.total_amount) - COALESCE(tf.total_transferred, 0) as current_balance
FROM transactions t
LEFT JOIN (
    SELECT 
        employee_name,
        SUM(amount) as total_transferred
    FROM employee_transfers
    GROUP BY employee_name
) tf ON t.collector = tf.employee_name
GROUP BY t.collector, tf.total_transferred
ORDER BY current_balance DESC;

-- 创建函数：获取员工收款详情
CREATE OR REPLACE FUNCTION get_employee_payment_details(p_employee_name VARCHAR(100))
RETURNS TABLE(
    transaction_id INTEGER,
    transaction_type VARCHAR(20),
    customer_name VARCHAR(200),
    amount DECIMAL(12,2),
    transaction_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.type,
        t.customer_name,
        t.total_amount,
        t.created_at
    FROM transactions t
    WHERE t.collector = p_employee_name
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 插入示例转账记录（可选）
-- INSERT INTO employee_transfers (employee_name, amount, transfer_date, note) VALUES
-- ('张三', 1000.00, NOW() - INTERVAL '1 day', '第一次转账'),
-- ('李四', 800.00, NOW() - INTERVAL '2 days', '周结转账');

-- 授予必要的权限
GRANT SELECT ON employee_payment_summary TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_employee_payment_details TO authenticated, anon;


