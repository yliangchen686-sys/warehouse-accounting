-- 测试工资计算函数是否正确更新

-- 1. 检查函数是否存在
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'calculate_employee_salary';

-- 2. 查看函数定义（确认是否使用了 customer_bindings JOIN）
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'calculate_employee_salary';

-- 3. 测试函数调用（请替换为实际的员工姓名和日期）
-- SELECT * FROM calculate_employee_salary('员工姓名', 2024, 10);

-- 4. 检查客户绑定表数据
SELECT COUNT(*) as binding_count,
       COUNT(DISTINCT customer_name) as unique_customers,
       COUNT(DISTINCT employee_name) as unique_employees
FROM customer_bindings;

-- 5. 查看前几条绑定记录
SELECT * FROM customer_bindings
ORDER BY created_at DESC
LIMIT 10;

-- 6. 检查未绑定的客户（这些客户的交易不会计入任何员工提成）
SELECT DISTINCT t.customer_name, COUNT(*) as transaction_count
FROM transactions t
LEFT JOIN customer_bindings cb ON t.customer_name = cb.customer_name
WHERE cb.customer_name IS NULL
  AND t.type = 'sale'
GROUP BY t.customer_name
ORDER BY transaction_count DESC;
