-- 演示数据脚本
-- 在完成基本数据库设置后运行此脚本来添加演示数据

-- 添加更多员工账户用于演示
INSERT INTO employees (name, username, password, role, status, created_at) VALUES
('张三', 'zhangsan', '$2a$10$rZ8kK9Q9.Yx8xYxYxYxYxOxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxY', 'employee', 'active', '2024-01-15 08:00:00+00'),
('李四', 'lisi', '$2a$10$rZ8kK9Q9.Yx8xYxYxYxYxOxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxY', 'employee', 'active', '2024-02-01 09:00:00+00'),
('王五', 'wangwu', '$2a$10$rZ8kK9Q9.Yx8xYxYxYxYxOxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxY', 'employee', 'active', '2024-02-15 10:00:00+00'),
('赵六', 'zhaoliu', '$2a$10$rZ8kK9Q9.Yx8xYxYxYxYxOxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxY', 'employee', 'inactive', '2024-01-01 08:00:00+00')
ON CONFLICT (username) DO NOTHING;

-- 更新离职员工的离职时间
UPDATE employees SET left_at = '2024-03-01 17:00:00+00' WHERE username = 'zhaoliu';

-- 添加丰富的交易记录演示数据
INSERT INTO transactions (type, customer_name, collector, quantity, gift_quantity, unit_price, total_amount, created_at) VALUES
-- 进货记录
('purchase', '北京供应商A', '张三', 500.00, 0.00, 8.50, 4250.00, '2024-01-15 09:30:00+00'),
('purchase', '上海供应商B', '李四', 300.00, 0.00, 12.00, 3600.00, '2024-01-16 10:15:00+00'),
('purchase', '广州供应商C', '张三', 800.00, 0.00, 6.80, 5440.00, '2024-01-18 14:20:00+00'),
('purchase', '深圳供应商D', '王五', 200.00, 0.00, 15.50, 3100.00, '2024-01-20 11:45:00+00'),
('purchase', '天津供应商E', '张三', 450.00, 0.00, 9.20, 4140.00, '2024-01-22 16:30:00+00'),

-- 销售记录
('sale', '客户甲公司', '张三', 120.00, 5.00, 18.00, 2160.00, '2024-01-17 13:20:00+00'),
('sale', '客户乙商店', '李四', 80.00, 2.00, 20.50, 1640.00, '2024-01-19 15:45:00+00'),
('sale', '客户丙超市', '王五', 200.00, 10.00, 16.80, 3360.00, '2024-01-21 10:30:00+00'),
('sale', '客户丁批发', '张三', 350.00, 15.00, 14.20, 4970.00, '2024-01-23 09:15:00+00'),
('sale', '客户戊零售', '李四', 90.00, 3.00, 22.00, 1980.00, '2024-01-24 14:50:00+00'),
('sale', '客户己连锁', '王五', 280.00, 12.00, 17.50, 4900.00, '2024-01-25 11:20:00+00'),

-- 回收记录
('return', '客户甲公司', '张三', 15.00, 0.00, 18.00, 270.00, '2024-01-26 16:10:00+00'),
('return', '客户乙商店', '李四', 8.00, 0.00, 20.50, 164.00, '2024-01-27 12:30:00+00'),
('return', '客户丙超市', '王五', 25.00, 0.00, 16.80, 420.00, '2024-01-28 15:40:00+00'),

-- 赠送记录
('gift', '合作伙伴A', '张三', 0.00, 50.00, 0.00, 0.00, '2024-01-29 10:00:00+00'),
('gift', '重要客户B', '李四', 0.00, 30.00, 0.00, 0.00, '2024-01-30 14:30:00+00'),
('gift', '战略伙伴C', '王五', 0.00, 20.00, 0.00, 0.00, '2024-01-31 16:45:00+00'),

-- 最近的交易记录（用于演示实时同步）
('purchase', '新供应商F', '张三', 600.00, 0.00, 7.30, 4380.00, NOW() - INTERVAL '2 hours'),
('sale', '新客户G', '李四', 150.00, 8.00, 19.50, 2925.00, NOW() - INTERVAL '1 hour'),
('sale', '老客户H', '王五', 220.00, 5.00, 16.20, 3564.00, NOW() - INTERVAL '30 minutes'),
('return', '客户I', '张三', 12.00, 0.00, 19.50, 234.00, NOW() - INTERVAL '15 minutes'),
('gift', 'VIP客户J', '李四', 0.00, 15.00, 0.00, 0.00, NOW() - INTERVAL '5 minutes')

ON CONFLICT DO NOTHING;

-- 创建一些统计视图用于演示
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
    DATE(created_at) as sale_date,
    COUNT(*) as transaction_count,
    SUM(quantity) as total_quantity,
    SUM(total_amount) as total_amount,
    AVG(unit_price) as avg_unit_price
FROM transactions 
WHERE type = 'sale'
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

CREATE OR REPLACE VIEW employee_performance AS
SELECT 
    e.name as employee_name,
    e.username,
    COUNT(t.id) as transaction_count,
    SUM(CASE WHEN t.type = 'sale' THEN t.total_amount ELSE 0 END) as sales_amount,
    SUM(CASE WHEN t.type = 'purchase' THEN t.total_amount ELSE 0 END) as purchase_amount
FROM employees e
LEFT JOIN transactions t ON e.name = t.collector
WHERE e.status = 'active'
GROUP BY e.id, e.name, e.username
ORDER BY sales_amount DESC;

-- 插入成功提示
DO $$
BEGIN
    RAISE NOTICE '演示数据插入完成！';
    RAISE NOTICE '员工账户密码统一为: employee123';
    RAISE NOTICE '已添加 % 条交易记录', (SELECT COUNT(*) FROM transactions);
    RAISE NOTICE '已添加 % 个员工账户', (SELECT COUNT(*) FROM employees WHERE role = 'employee');
END $$;


