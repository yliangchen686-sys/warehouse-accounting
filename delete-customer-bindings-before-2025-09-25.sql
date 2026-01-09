-- 删除 2025年9月25号及之前的客户绑定数据
-- 请在 Supabase SQL 编辑器中运行此脚本

-- 1. 先查看将要删除的数据（建议先执行此查询确认）
SELECT 
    id,
    customer_name,
    employee_name,
    created_at
FROM customer_bindings
WHERE created_at <= '2025-09-25 23:59:59'
ORDER BY created_at DESC;

-- 2. 查看将要删除的数据数量
SELECT COUNT(*) as delete_count
FROM customer_bindings
WHERE created_at <= '2025-09-25 23:59:59';

-- 3. 执行删除操作（确认无误后取消注释执行）
-- DELETE FROM customer_bindings
-- WHERE created_at <= '2025-09-25 23:59:59';

-- 4. 删除后查看剩余数据
-- SELECT COUNT(*) as remaining_count FROM customer_bindings;
