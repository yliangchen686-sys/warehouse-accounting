-- 完整更新admin角色为管理员的SQL脚本
-- 执行此脚本将admin的职位从商人改为管理员

-- 1. 更新角色约束，添加'admin'角色
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK (role IN ('merchant', 'employee', 'admin'));

-- 2. 更新admin账户的角色和名称
UPDATE employees 
SET name = '管理员', role = 'admin' 
WHERE username = 'admin';

-- 3. 更新交易记录中的collector名称
UPDATE transactions 
SET collector = '管理员' 
WHERE collector = '商人' OR collector = '系统管理员';

-- 4. 更新员工转账记录中的相关名称
UPDATE employee_transfers 
SET employee_name = '管理员' 
WHERE employee_name = '商人' OR employee_name = '系统管理员';

-- 5. 更新商人提现记录中的相关名称
UPDATE merchant_withdrawals 
SET merchant_name = '管理员' 
WHERE merchant_name = '商人' OR merchant_name = '系统管理员';

-- 6. 更新客户绑定记录中的相关名称
UPDATE customer_bindings 
SET employee_name = '管理员' 
WHERE employee_name = '商人' OR employee_name = '系统管理员';

-- 7. 客户赠送记录表没有employee_name字段，跳过此步骤

-- 验证更新结果
SELECT id, name, username, role FROM employees WHERE username = 'admin';

-- 显示所有角色分布
SELECT role, COUNT(*) as count FROM employees GROUP BY role;
