-- 创建员工转账记录表 - 简化版本

-- 创建员工转账记录表
CREATE TABLE employee_transfers (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transfer_date TIMESTAMP WITH TIME ZONE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE employee_transfers ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "employee_transfers_policy" ON employee_transfers FOR ALL TO anon, authenticated USING (true);

-- 创建索引
CREATE INDEX idx_employee_transfers_employee_name ON employee_transfers(employee_name);
CREATE INDEX idx_employee_transfers_transfer_date ON employee_transfers(transfer_date);
CREATE INDEX idx_employee_transfers_created_at ON employee_transfers(created_at);


