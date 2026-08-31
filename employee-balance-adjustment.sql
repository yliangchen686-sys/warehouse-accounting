-- 员工余额调整表（手动添加余额）
-- 请在 Supabase SQL 编辑器中运行此脚本

CREATE TABLE IF NOT EXISTS employee_balance_adjustments (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    note TEXT,
    operator_name VARCHAR(100),
    adjustment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE employee_balance_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_balance_adjustments_all_access" ON employee_balance_adjustments;
CREATE POLICY "employee_balance_adjustments_all_access"
ON employee_balance_adjustments
FOR ALL
TO anon, authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_employee_balance_adjustments_employee_name
ON employee_balance_adjustments(employee_name);

CREATE INDEX IF NOT EXISTS idx_employee_balance_adjustments_created_at
ON employee_balance_adjustments(created_at);

COMMENT ON TABLE employee_balance_adjustments IS '员工余额手动调整记录（添加余额）';
