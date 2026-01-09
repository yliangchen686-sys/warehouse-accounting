-- 客户数据上传与分配功能数据库脚本
-- 请在 Supabase SQL 编辑器中运行此脚本

-- 1. 创建客户池表（存储待分配的客户数据）
CREATE TABLE IF NOT EXISTS customer_pool (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(200) NOT NULL UNIQUE,
    customer_phone VARCHAR(50),
    customer_address TEXT,
    customer_notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned')),
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to VARCHAR(100),
    assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建客户分配记录表
CREATE TABLE IF NOT EXISTS customer_assignment_log (
    id SERIAL PRIMARY KEY,
    customer_pool_id INTEGER NOT NULL REFERENCES customer_pool(id) ON DELETE CASCADE,
    customer_name VARCHAR(200) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_customer_pool_status ON customer_pool(status);
CREATE INDEX IF NOT EXISTS idx_customer_pool_assigned_to ON customer_pool(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customer_pool_uploaded_at ON customer_pool(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_employee_name ON customer_assignment_log(employee_name);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_assigned_at ON customer_assignment_log(assigned_at);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_customer_pool_id ON customer_assignment_log(customer_pool_id);

-- 4. 启用 RLS
ALTER TABLE customer_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_assignment_log ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略
DROP POLICY IF EXISTS "customer_pool_all_access" ON customer_pool;
CREATE POLICY "customer_pool_all_access" ON customer_pool FOR ALL TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "customer_assignment_log_all_access" ON customer_assignment_log;
CREATE POLICY "customer_assignment_log_all_access" ON customer_assignment_log FOR ALL TO anon, authenticated USING (true);

-- 6. 创建分配客户的数据库函数（使用事务和行锁确保并发安全）
CREATE OR REPLACE FUNCTION assign_customer_to_employee(
    p_employee_name VARCHAR(100)
)
RETURNS TABLE (
    customer_id INTEGER,
    customer_name VARCHAR(200),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    customer_notes TEXT
) AS $$
DECLARE
    v_customer_id INTEGER;
    v_customer_name VARCHAR(200);
    v_customer_phone VARCHAR(50);
    v_customer_address TEXT;
    v_customer_notes TEXT;
BEGIN
    -- 查询并锁定一条待分配的客户（使用 FOR UPDATE SKIP LOCKED 防止并发冲突）
    SELECT id, customer_name, customer_phone, customer_address, customer_notes
    INTO v_customer_id, v_customer_name, v_customer_phone, v_customer_address, v_customer_notes
    FROM customer_pool
    WHERE status = 'pending'
    ORDER BY uploaded_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- 如果没有可分配的客户，返回空
    IF v_customer_id IS NULL THEN
        RETURN;
    END IF;

    -- 更新客户状态为已分配
    UPDATE customer_pool
    SET 
        status = 'assigned',
        assigned_to = p_employee_name,
        assigned_at = NOW()
    WHERE id = v_customer_id;

    -- 插入分配记录
    INSERT INTO customer_assignment_log (customer_pool_id, customer_name, employee_name)
    VALUES (v_customer_id, v_customer_name, p_employee_name);

    -- 插入或更新客户绑定关系（如果 customer_bindings 表存在）
    INSERT INTO customer_bindings (customer_name, employee_name)
    VALUES (v_customer_name, p_employee_name)
    ON CONFLICT (customer_name) 
    DO UPDATE SET employee_name = EXCLUDED.employee_name;

    -- 返回客户信息
    RETURN QUERY
    SELECT v_customer_id, v_customer_name, v_customer_phone, v_customer_address, v_customer_notes;
END;
$$ LANGUAGE plpgsql;

-- 7. 添加表注释
COMMENT ON TABLE customer_pool IS '客户池表，存储待分配的客户数据';
COMMENT ON TABLE customer_assignment_log IS '客户分配记录表，记录客户分配历史';
COMMENT ON COLUMN customer_pool.status IS '客户状态：pending=待分配，assigned=已分配';
COMMENT ON COLUMN customer_pool.uploaded_by IS '上传人（商人用户名）';
COMMENT ON COLUMN customer_pool.assigned_to IS '分配给哪个员工';

-- 8. 创建视图：客户池统计
CREATE OR REPLACE VIEW customer_pool_stats AS
SELECT 
    status,
    COUNT(*) as count,
    MIN(uploaded_at) as earliest_upload,
    MAX(uploaded_at) as latest_upload
FROM customer_pool
GROUP BY status;

-- 9. 创建视图：员工领取统计
CREATE OR REPLACE VIEW employee_assignment_stats AS
SELECT 
    employee_name,
    COUNT(*) as assigned_count,
    MIN(assigned_at) as first_assignment,
    MAX(assigned_at) as last_assignment
FROM customer_assignment_log
GROUP BY employee_name
ORDER BY assigned_count DESC;
