-- 员工工资手动调整表
-- 请在 Supabase SQL 编辑器中运行此脚本

CREATE TABLE IF NOT EXISTS salary_adjustments (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    adjustment_amount DECIMAL(12,2) NOT NULL,
    note TEXT,
    operator_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE salary_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salary_adjustments_all_access" ON salary_adjustments;
CREATE POLICY "salary_adjustments_all_access"
ON salary_adjustments
FOR ALL
TO anon, authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_salary_adjustments_employee_year_month
ON salary_adjustments(employee_name, year, month);

CREATE INDEX IF NOT EXISTS idx_salary_adjustments_year_month
ON salary_adjustments(year, month);

COMMENT ON TABLE salary_adjustments IS '员工工资手动调整记录（可正可负）';
