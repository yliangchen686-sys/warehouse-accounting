-- 测试员工角色更新

-- 查看当前所有员工的角色
SELECT id, name, username, role, status FROM employees ORDER BY id;

-- 如果需要手动更新某个员工的角色，可以运行：
-- UPDATE employees SET role = 'merchant' WHERE name = '员工姓名';

-- 验证更新后的结果
-- SELECT id, name, username, role, status FROM employees WHERE name = '员工姓名';


