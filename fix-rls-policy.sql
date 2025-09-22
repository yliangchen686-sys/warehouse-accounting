-- 修复 RLS 策略 - 允许匿名用户访问
-- 在 Supabase SQL 编辑器中运行此脚本

-- 删除现有的严格策略
DROP POLICY IF EXISTS "Allow all for authenticated users" ON employees;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON transactions;

-- 创建更宽松的策略，允许匿名用户访问
CREATE POLICY "Allow all operations" ON employees FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "Allow all operations" ON transactions FOR ALL TO anon, authenticated USING (true);

-- 确保表启用了 RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;


