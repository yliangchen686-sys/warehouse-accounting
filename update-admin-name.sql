-- 将系统管理员名称改为商人

-- 更新数据库中的管理员名称
UPDATE employees 
SET name = '商人' 
WHERE username = 'admin' AND role = 'merchant';

-- 验证更新结果
SELECT id, name, username, role FROM employees WHERE username = 'admin';


