import { createClient } from '@supabase/supabase-js';

// Supabase 项目配置
const supabaseUrl = 'https://ztyvmtawslpmjqffbmtp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0eXZtdGF3c2xwbWpxZmZibXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTg0NjAsImV4cCI6MjA3NDAzNDQ2MH0.XY-fszdxHZFmMohKhP7q_pEBj1L7TRceldZ3-mu3Dl4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 数据库表结构和 RLS 策略的 SQL 脚本
export const databaseSchema = `
-- 创建员工表
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('merchant', 'employee', 'admin', 'manager')),
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

-- 启用 RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 员工表的 RLS 策略
-- 商人可以查看和修改所有员工信息
CREATE POLICY "Merchants can manage all employees" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE username = auth.jwt() ->> 'username' 
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
            WHERE username = auth.jwt() ->> 'username' 
            AND status = 'active'
        )
    );

-- 交易记录表的 RLS 策略
-- 商人可以管理所有交易记录
CREATE POLICY "Merchants can manage all transactions" ON transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE username = auth.jwt() ->> 'username' 
            AND role = 'merchant'
            AND status = 'active'
        )
    );

-- 员工只能查看交易记录
CREATE POLICY "Employees can view transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE username = auth.jwt() ->> 'username' 
            AND status = 'active'
        )
    );

-- 创建默认管理员账户（密码：admin123）
INSERT INTO employees (name, username, password, role, status) 
VALUES ('管理员', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.5xCGwJzCG3.8l7iJzG5P3g8OYzJq1u', 'manager', 'active')
ON CONFLICT (username) DO NOTHING;
`;

// 交易类型映射
export const transactionTypes = {
  purchase: '进货',
  sale: '销售',
  return: '回收',
  gift: '赠送'
};

// 员工状态映射
export const employeeStatus = {
  active: '在职',
  inactive: '离职'
};

// 角色映射
export const roles = {
  merchant: '商人',
  employee: '员工',
  admin: '管理员',
  manager: '管理员'
};
