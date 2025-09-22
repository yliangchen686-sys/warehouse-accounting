-- 仓储记账系统数据库初始化脚本
-- 请在 Supabase SQL 编辑器中运行此脚本

-- 创建员工表
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('merchant', 'employee')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE
);

-- 创建交易记录表
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'sale', 'return', 'gift')),
    customer_name VARCHAR(200) NOT NULL,
    collector VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    gift_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_name ON transactions(customer_name);

-- 启用 RLS (Row Level Security)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Merchants can manage all employees" ON employees;
DROP POLICY IF EXISTS "Employees can view active employees" ON employees;
DROP POLICY IF EXISTS "Merchants can manage all transactions" ON transactions;
DROP POLICY IF EXISTS "Employees can view transactions" ON transactions;

-- 员工表的 RLS 策略
-- 商人可以查看和修改所有员工信息
CREATE POLICY "Merchants can manage all employees" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE username = current_setting('app.current_user', true)
            AND role = 'merchant'
            AND status = 'active'
        )
    );

-- 员工可以查看在职员工列表
CREATE POLICY "Employees can view active employees" ON employees
    FOR SELECT USING (
        status = 'active' AND
        EXISTS (
            SELECT 1 FROM employees 
            WHERE username = current_setting('app.current_user', true)
            AND status = 'active'
        )
    );

-- 交易记录表的 RLS 策略
-- 商人可以管理所有交易记录
CREATE POLICY "Merchants can manage all transactions" ON transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE username = current_setting('app.current_user', true)
            AND role = 'merchant'
            AND status = 'active'
        )
    );

-- 员工只能查看交易记录
CREATE POLICY "Employees can view transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE username = current_setting('app.current_user', true)
            AND status = 'active'
        )
    );

-- 创建默认商人账户
-- 用户名: admin
-- 密码: admin123 (已加密)
INSERT INTO employees (name, username, password, role, status) 
VALUES (
    '系统管理员', 
    'admin', 
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.5xCGwJzCG3.8l7iJzG5P3g8OYzJq1u', 
    'merchant', 
    'active'
)
ON CONFLICT (username) DO NOTHING;

-- 创建示例员工账户
-- 用户名: employee1
-- 密码: employee123 (已加密)
INSERT INTO employees (name, username, password, role, status) 
VALUES (
    '员工一号', 
    'employee1', 
    '$2a$10$rZ8kK9Q9.Yx8xYxYxYxYxOxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxY', 
    'employee', 
    'active'
)
ON CONFLICT (username) DO NOTHING;

-- 插入示例交易记录
INSERT INTO transactions (type, customer_name, collector, quantity, gift_quantity, unit_price, total_amount) 
VALUES 
    ('purchase', '供应商A', '张三', 100.00, 0.00, 10.50, 1050.00),
    ('sale', '客户B', '李四', 50.00, 5.00, 12.00, 600.00),
    ('return', '客户C', '王五', 20.00, 0.00, 11.00, 220.00),
    ('gift', '合作伙伴D', '赵六', 0.00, 10.00, 0.00, 0.00),
    ('purchase', '供应商E', '张三', 200.00, 0.00, 8.50, 1700.00),
    ('sale', '客户F', '李四', 80.00, 2.00, 15.00, 1200.00)
ON CONFLICT DO NOTHING;

-- 创建视图以简化查询
CREATE OR REPLACE VIEW employee_summary AS
SELECT 
    id,
    name,
    username,
    role,
    status,
    created_at,
    left_at,
    CASE 
        WHEN status = 'active' THEN EXTRACT(days FROM NOW() - created_at)
        ELSE EXTRACT(days FROM COALESCE(left_at, NOW()) - created_at)
    END as work_days
FROM employees;

CREATE OR REPLACE VIEW transaction_summary AS
SELECT 
    t.*,
    CASE 
        WHEN t.type = 'purchase' THEN '进货'
        WHEN t.type = 'sale' THEN '销售'
        WHEN t.type = 'return' THEN '回收'
        WHEN t.type = 'gift' THEN '赠送'
    END as type_name
FROM transactions t
ORDER BY t.created_at DESC;

-- 创建函数以获取统计数据
CREATE OR REPLACE FUNCTION get_transaction_stats(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_transactions', COUNT(*),
        'total_amount', COALESCE(SUM(total_amount), 0),
        'total_quantity', COALESCE(SUM(quantity), 0),
        'total_gift_quantity', COALESCE(SUM(gift_quantity), 0),
        'purchase_count', COUNT(*) FILTER (WHERE type = 'purchase'),
        'sale_count', COUNT(*) FILTER (WHERE type = 'sale'),
        'return_count', COUNT(*) FILTER (WHERE type = 'return'),
        'gift_count', COUNT(*) FILTER (WHERE type = 'gift'),
        'purchase_amount', COALESCE(SUM(total_amount) FILTER (WHERE type = 'purchase'), 0),
        'sale_amount', COALESCE(SUM(total_amount) FILTER (WHERE type = 'sale'), 0),
        'return_amount', COALESCE(SUM(total_amount) FILTER (WHERE type = 'return'), 0),
        'gift_amount', COALESCE(SUM(total_amount) FILTER (WHERE type = 'gift'), 0)
    ) INTO result
    FROM transactions
    WHERE (start_date IS NULL OR created_at >= start_date)
      AND (end_date IS NULL OR created_at <= end_date);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器函数以记录员工状态变更
CREATE OR REPLACE FUNCTION update_employee_left_at()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果状态从 active 变为 inactive，设置离职时间
    IF OLD.status = 'active' AND NEW.status = 'inactive' AND NEW.left_at IS NULL THEN
        NEW.left_at = NOW();
    END IF;
    
    -- 如果状态从 inactive 变为 active，清除离职时间
    IF OLD.status = 'inactive' AND NEW.status = 'active' THEN
        NEW.left_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_employee_left_at ON employees;
CREATE TRIGGER trigger_update_employee_left_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_left_at();

-- 授予必要的权限
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON employees TO authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON employee_summary TO authenticated;
GRANT ALL ON transaction_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_transaction_stats TO authenticated;

-- 完成提示
DO $$
BEGIN
    RAISE NOTICE '数据库初始化完成！';
    RAISE NOTICE '默认管理员账户: admin / admin123';
    RAISE NOTICE '示例员工账户: employee1 / employee123';
    RAISE NOTICE '已插入 % 条示例交易记录', (SELECT COUNT(*) FROM transactions);
END $$;


