-- 仓储记账系统 - 快速数据库设置脚本
-- 复制以下内容到 Supabase SQL 编辑器中执行

-- 1. 创建员工表
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

-- 2. 创建交易记录表
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

-- 3. 启用 RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. 创建 RLS 策略
CREATE POLICY "Allow all for authenticated users" ON employees FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON transactions FOR ALL TO authenticated USING (true);

-- 5. 创建默认管理员账户 (admin / admin123)
INSERT INTO employees (name, username, password, role, status) 
VALUES ('商人', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.5xCGwJzCG3.8l7iJzG5P3g8OYzJq1u', 'merchant', 'active')
ON CONFLICT (username) DO NOTHING;
