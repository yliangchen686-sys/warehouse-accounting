-- 修复 RLS 策略问题
-- 问题：应用使用自定义认证（localStorage），不使用 Supabase Auth
-- 解决：将 RLS 策略改为 using (true)，允许所有已认证的客户端访问

-- 1. 删除现有的 RLS 策略
DROP POLICY IF EXISTS "Merchants can manage all employees" ON employees;
DROP POLICY IF EXISTS "Employees can view active employees" ON employees;
DROP POLICY IF EXISTS "Merchants can manage all transactions" ON transactions;
DROP POLICY IF EXISTS "Employees can view transactions" ON transactions;

-- 对于其他可能存在的表也删除策略
DROP POLICY IF EXISTS "Allow all operations on customers" ON customers CASCADE;
DROP POLICY IF EXISTS "Allow all operations on customer_bindings" ON customer_bindings CASCADE;
DROP POLICY IF EXISTS "Allow all operations on employee_transfers" ON employee_transfers CASCADE;
DROP POLICY IF EXISTS "Allow all operations on merchant_withdrawals" ON merchant_withdrawals CASCADE;
DROP POLICY IF EXISTS "Allow all operations on inventory_records" ON inventory_records CASCADE;
DROP POLICY IF EXISTS "Allow all operations on salary_records" ON salary_records CASCADE;

-- 2. 创建新的宽松 RLS 策略（允许所有操作）
-- 员工表
CREATE POLICY "Allow all operations on employees" ON employees
    FOR ALL USING (true);

-- 交易记录表
CREATE POLICY "Allow all operations on transactions" ON transactions
    FOR ALL USING (true);

-- 客户表（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        EXECUTE 'CREATE POLICY "Allow all operations on customers" ON customers FOR ALL USING (true)';
    END IF;
END $$;

-- 客户绑定表（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_bindings') THEN
        EXECUTE 'CREATE POLICY "Allow all operations on customer_bindings" ON customer_bindings FOR ALL USING (true)';
    END IF;
END $$;

-- 员工转账表（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_transfers') THEN
        EXECUTE 'CREATE POLICY "Allow all operations on employee_transfers" ON employee_transfers FOR ALL USING (true)';
    END IF;
END $$;

-- 商人提现表（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'merchant_withdrawals') THEN
        EXECUTE 'CREATE POLICY "Allow all operations on merchant_withdrawals" ON merchant_withdrawals FOR ALL USING (true)';
    END IF;
END $$;

-- 库存记录表（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_records') THEN
        EXECUTE 'CREATE POLICY "Allow all operations on inventory_records" ON inventory_records FOR ALL USING (true)';
    END IF;
END $$;

-- 工资记录表（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'salary_records') THEN
        EXECUTE 'CREATE POLICY "Allow all operations on salary_records" ON salary_records FOR ALL USING (true)';
    END IF;
END $$;

-- 3. 验证 RLS 是否启用
-- 显示所有表的 RLS 状态
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. 显示所有 RLS 策略
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
