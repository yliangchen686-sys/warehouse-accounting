-- ====================================
-- 为所有表创建宽松的 RLS 策略
-- ====================================
-- 基于您提供的表列表创建策略
-- ====================================

-- 删除所有表的旧策略
DROP POLICY IF EXISTS "allow_all" ON customer_bindings;
DROP POLICY IF EXISTS "allow_all" ON customer_gifts;
DROP POLICY IF EXISTS "allow_all" ON employee_transfers;
DROP POLICY IF EXISTS "allow_all" ON merchant_withdrawals;
DROP POLICY IF EXISTS "allow_all" ON salary_records;
DROP POLICY IF EXISTS "employee_transfers_policy" ON employee_transfers;

-- 为所有表创建统一的宽松策略
CREATE POLICY "allow_all" ON customer_bindings FOR ALL USING (true);
CREATE POLICY "allow_all" ON customer_gifts FOR ALL USING (true);
CREATE POLICY "allow_all" ON employee_transfers FOR ALL USING (true);
CREATE POLICY "allow_all" ON merchant_withdrawals FOR ALL USING (true);
CREATE POLICY "allow_all" ON salary_records FOR ALL USING (true);

-- ====================================
-- 验证所有表的策略
-- ====================================

SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
