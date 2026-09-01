-- 员工底薪字段（按员工设置，永久生效）
-- 请在 Supabase SQL 编辑器中运行此脚本

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS base_salary DECIMAL(10,2) NOT NULL DEFAULT 3000;

COMMENT ON COLUMN employees.base_salary IS '员工固定底薪，默认3000元';
