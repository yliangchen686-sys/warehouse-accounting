-- ====================================
-- 诊断和修复 Supabase 同步问题
-- ====================================
-- 问题：交易记录无法同步到 Supabase
-- 可能原因：角色约束冲突或 RLS 策略问题
-- ====================================

-- 第一步：诊断当前状态
-- ====================================

-- 1. 查看 employees 表的角色约束
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'employees' AND con.contype = 'c';

-- 2. 查看 admin 账户的当前信息
SELECT id, name, username, role, status, created_at
FROM employees
WHERE username = 'admin';

-- 3. 查看所有员工的角色分布
SELECT role, COUNT(*) as count, status
FROM employees
GROUP BY role, status
ORDER BY role;

-- 4. 查看所有表的 RLS 策略
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. 查看表的 RLS 启用状态
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;


-- ====================================
-- 第二步：修复方案
-- ====================================
-- 请先查看上面的诊断结果，确认问题后再执行下面的修复
-- ====================================

-- 修复1：角色约束（支持所有4种角色）
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check
CHECK (role IN ('merchant', 'employee', 'admin', 'manager'));

-- 修复2：确保 admin 账户状态正确
UPDATE employees
SET status = 'active'
WHERE username = 'admin';

-- 修复3：删除所有旧的 RLS 策略
DROP POLICY IF EXISTS "Merchants can manage all employees" ON employees;
DROP POLICY IF EXISTS "Employees can view active employees" ON employees;
DROP POLICY IF EXISTS "Merchants can manage all transactions" ON transactions;
DROP POLICY IF EXISTS "Employees can view transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations" ON employees;
DROP POLICY IF EXISTS "Allow all operations" ON transactions;
DROP POLICY IF EXISTS "Allow all operations" ON employee_transfers;
DROP POLICY IF EXISTS "Allow all operations" ON merchant_withdrawals;
DROP POLICY IF EXISTS "Allow all operations" ON customers;
DROP POLICY IF EXISTS "Allow all operations" ON customer_bindings;
DROP POLICY IF EXISTS "Allow all operations" ON inventory_records;
DROP POLICY IF EXISTS "Allow all operations" ON salary_records;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON employees;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON transactions;
DROP POLICY IF EXISTS "employees_policy" ON employees;
DROP POLICY IF EXISTS "transactions_policy" ON transactions;
DROP POLICY IF EXISTS "employee_transfers_policy" ON employee_transfers;

-- 修复4：创建统一的宽松 RLS 策略
-- 因为应用使用 localStorage 认证，不使用 Supabase Auth
-- 所以使用 using (true) 允许所有操作

CREATE POLICY "allow_all" ON employees FOR ALL USING (true);
CREATE POLICY "allow_all" ON transactions FOR ALL USING (true);

-- 为其他表也创建策略（如果表存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_transfers') THEN
        EXECUTE 'DROP POLICY IF EXISTS "allow_all" ON employee_transfers';
        EXECUTE 'CREATE POLICY "allow_all" ON employee_transfers FOR ALL USING (true)';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'merchant_withdrawals') THEN
        EXECUTE 'DROP POLICY IF EXISTS "allow_all" ON merchant_withdrawals';
        EXECUTE 'CREATE POLICY "allow_all" ON merchant_withdrawals FOR ALL USING (true)';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        EXECUTE 'DROP POLICY IF EXISTS "allow_all" ON customers';
        EXECUTE 'CREATE POLICY "allow_all" ON customers FOR ALL USING (true)';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_bindings') THEN
        EXECUTE 'DROP POLICY IF EXISTS "allow_all" ON customer_bindings';
        EXECUTE 'CREATE POLICY "allow_all" ON customer_bindings FOR ALL USING (true)';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_records') THEN
        EXECUTE 'DROP POLICY IF EXISTS "allow_all" ON inventory_records';
        EXECUTE 'CREATE POLICY "allow_all" ON inventory_records FOR ALL USING (true)';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'salary_records') THEN
        EXECUTE 'DROP POLICY IF EXISTS "allow_all" ON salary_records';
        EXECUTE 'CREATE POLICY "allow_all" ON salary_records FOR ALL USING (true)';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_gifts') THEN
        EXECUTE 'DROP POLICY IF EXISTS "allow_all" ON customer_gifts';
        EXECUTE 'CREATE POLICY "allow_all" ON customer_gifts FOR ALL USING (true)';
    END IF;
END $$;

-- 修复5：确保 RLS 已启用
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_transfers') THEN
        EXECUTE 'ALTER TABLE employee_transfers ENABLE ROW LEVEL SECURITY';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'merchant_withdrawals') THEN
        EXECUTE 'ALTER TABLE merchant_withdrawals ENABLE ROW LEVEL SECURITY';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        EXECUTE 'ALTER TABLE customers ENABLE ROW LEVEL SECURITY';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_bindings') THEN
        EXECUTE 'ALTER TABLE customer_bindings ENABLE ROW LEVEL SECURITY';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_records') THEN
        EXECUTE 'ALTER TABLE inventory_records ENABLE ROW LEVEL SECURITY';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'salary_records') THEN
        EXECUTE 'ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY';
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_gifts') THEN
        EXECUTE 'ALTER TABLE customer_gifts ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;


-- ====================================
-- 第三步：验证修复结果
-- ====================================

-- 1. 验证角色约束
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'employees' AND con.contype = 'c';

-- 2. 验证 admin 账户
SELECT id, name, username, role, status
FROM employees
WHERE username = 'admin';

-- 3. 验证所有 RLS 策略
SELECT
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. 验证 RLS 启用状态
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ====================================
-- 执行说明
-- ====================================
-- 1. 复制整个文件内容
-- 2. 到 Supabase 控制台 → SQL Editor
-- 3. 粘贴并点击 Run
-- 4. 查看诊断结果，确认问题
-- 5. 修复会自动执行
-- 6. 查看验证结果，确认修复成功
-- ====================================
