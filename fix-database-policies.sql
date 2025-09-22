-- 修复数据库策略脚本 - 解决策略重复问题

-- 1. 删除可能存在的旧策略
DROP POLICY IF EXISTS "Allow all operations" ON employees;
DROP POLICY IF EXISTS "Allow all operations" ON transactions;
DROP POLICY IF EXISTS "Allow all operations" ON employee_transfers;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON employees;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON transactions;

-- 2. 创建员工转账记录表（如果不存在）
CREATE TABLE IF NOT EXISTS employee_transfers (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transfer_date TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 启用 RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_transfers ENABLE ROW LEVEL SECURITY;

-- 4. 创建新的 RLS 策略
CREATE POLICY "employees_policy" ON employees FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "transactions_policy" ON transactions FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "employee_transfers_policy" ON employee_transfers FOR ALL TO anon, authenticated USING (true);

-- 5. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_employee_transfers_employee_name ON employee_transfers(employee_name);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_transfer_date ON employee_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_created_at ON employee_transfers(created_at);

-- 6. 确保默认管理员账户存在
INSERT INTO employees (name, username, password, role, status) 
VALUES ('商人', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.5xCGwJzCG3.8l7iJzG5P3g8OYzJq1u', 'merchant', 'active')
ON CONFLICT (username) DO NOTHING;
