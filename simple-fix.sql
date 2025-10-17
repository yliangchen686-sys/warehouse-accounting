-- ====================================
-- 简化版修复脚本（避免表不存在的错误）
-- ====================================

-- 修复1：角色约束（支持所有4种角色）
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check
CHECK (role IN ('merchant', 'employee', 'admin', 'manager'));

-- 修复2：确保 admin 账户状态正确
UPDATE employees SET status = 'active' WHERE username = 'admin';

-- 修复3：删除核心表的旧策略
DROP POLICY IF EXISTS "Merchants can manage all employees" ON employees;
DROP POLICY IF EXISTS "Employees can view active employees" ON employees;
DROP POLICY IF EXISTS "Merchants can manage all transactions" ON transactions;
DROP POLICY IF EXISTS "Employees can view transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations" ON employees;
DROP POLICY IF EXISTS "Allow all operations" ON transactions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON employees;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON transactions;
DROP POLICY IF EXISTS "employees_policy" ON employees;
DROP POLICY IF EXISTS "transactions_policy" ON transactions;
DROP POLICY IF EXISTS "allow_all" ON employees;
DROP POLICY IF EXISTS "allow_all" ON transactions;

-- 修复4：创建新的宽松策略
CREATE POLICY "allow_all" ON employees FOR ALL USING (true);
CREATE POLICY "allow_all" ON transactions FOR ALL USING (true);

-- 修复5：确保 RLS 已启用
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ====================================
-- 验证结果
-- ====================================

-- 1. 查看角色约束
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'employees' AND con.contype = 'c';

-- 2. 查看 admin 账户
SELECT id, name, username, role, status FROM employees WHERE username = 'admin';

-- 3. 查看 RLS 策略
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. 查看所有表
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
