-- 客户数据上传与分配功能数据库脚本 V2（更新版）
-- 请在 Supabase SQL 编辑器中运行此脚本

-- 1. 创建客户池表（存储待分配的客户数据）
-- 注意：客户数据只包含手机号码，没有其他信息
CREATE TABLE IF NOT EXISTS customer_pool (
    id SERIAL PRIMARY KEY,
    customer_phone VARCHAR(50) NOT NULL UNIQUE,  -- 手机号码（唯一，作为主标识）
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned')),
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to VARCHAR(100),
    assigned_at TIMESTAMP WITH TIME ZONE,
    assignment_count INTEGER NOT NULL DEFAULT 0,  -- 记录被分配的次数
    last_assigned_at TIMESTAMP WITH TIME ZONE,     -- 最后一次分配时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建客户分配记录表（不绑定员工，只记录分配历史）
CREATE TABLE IF NOT EXISTS customer_assignment_log (
    id SERIAL PRIMARY KEY,
    customer_pool_id INTEGER NOT NULL REFERENCES customer_pool(id) ON DELETE CASCADE,
    customer_phone VARCHAR(50) NOT NULL,  -- 手机号码
    employee_name VARCHAR(100),  -- 可选，记录是哪个员工领取的（不绑定）
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action_type VARCHAR(20) DEFAULT 'assign' CHECK (action_type IN ('assign', 'reset')),  -- 分配或重置
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_customer_pool_status ON customer_pool(status);
CREATE INDEX IF NOT EXISTS idx_customer_pool_assigned_to ON customer_pool(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customer_pool_uploaded_at ON customer_pool(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_customer_pool_assignment_count ON customer_pool(assignment_count);
CREATE INDEX IF NOT EXISTS idx_customer_pool_customer_phone ON customer_pool(customer_phone);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_employee_name ON customer_assignment_log(employee_name);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_assigned_at ON customer_assignment_log(assigned_at);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_customer_pool_id ON customer_assignment_log(customer_pool_id);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_action_type ON customer_assignment_log(action_type);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_customer_phone ON customer_assignment_log(customer_phone);

-- 4. 启用 RLS
ALTER TABLE customer_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_assignment_log ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略
DROP POLICY IF EXISTS "customer_pool_all_access" ON customer_pool;
CREATE POLICY "customer_pool_all_access" ON customer_pool FOR ALL TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "customer_assignment_log_all_access" ON customer_assignment_log;
CREATE POLICY "customer_assignment_log_all_access" ON customer_assignment_log FOR ALL TO anon, authenticated USING (true);

-- 6. 创建分配客户的数据库函数（核心功能）
-- 功能：分配一条客户，如果没有待分配客户则自动重置并打乱
CREATE OR REPLACE FUNCTION assign_customer_to_employee(
    p_employee_name VARCHAR(100)
)
RETURNS TABLE (
    customer_id INTEGER,
    customer_phone VARCHAR(50),
    is_reset BOOLEAN  -- 是否触发了重置
) AS $$
DECLARE
    v_customer_id INTEGER;
    v_customer_phone VARCHAR(50);
    v_pending_count INTEGER;
    v_is_reset BOOLEAN := FALSE;
BEGIN
    -- 检查待分配客户数量
    SELECT COUNT(*) INTO v_pending_count
    FROM customer_pool
    WHERE status = 'pending';

    -- 如果没有待分配客户，执行重置操作
    IF v_pending_count = 0 THEN
        -- 重置所有客户状态为 pending，并清空分配信息
        UPDATE customer_pool
        SET 
            status = 'pending',
            assigned_to = NULL,
            assigned_at = NULL
        WHERE status = 'assigned';

        -- 记录重置操作（只记录一条代表重置事件）
        INSERT INTO customer_assignment_log (customer_pool_id, customer_phone, employee_name, action_type)
        VALUES (NULL, '系统重置', NULL, 'reset')
        ON CONFLICT DO NOTHING;

        v_is_reset := TRUE;
    END IF;

    -- 查询并锁定一条待分配的客户（使用随机顺序，实现打乱效果）
    SELECT id, customer_phone
    INTO v_customer_id, v_customer_phone
    FROM customer_pool
    WHERE status = 'pending'
    ORDER BY RANDOM()  -- 随机排序，实现打乱
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- 如果没有可分配的客户（理论上不应该发生），返回空
    IF v_customer_id IS NULL THEN
        RETURN;
    END IF;

    -- 更新客户状态为已分配
    UPDATE customer_pool
    SET 
        status = 'assigned',
        assigned_to = p_employee_name,
        assigned_at = NOW(),
        assignment_count = assignment_count + 1,
        last_assigned_at = NOW()
    WHERE id = v_customer_id;

    -- 插入分配记录（不绑定到 customer_bindings 表）
    INSERT INTO customer_assignment_log (customer_pool_id, customer_phone, employee_name, action_type)
    VALUES (v_customer_id, v_customer_phone, p_employee_name, 'assign');

    -- 返回客户信息（只返回手机号码，注意：不操作 customer_bindings 表）
    RETURN QUERY
    SELECT v_customer_id, v_customer_phone, v_is_reset;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建手动重置所有客户的函数（可选，供商人端使用）
CREATE OR REPLACE FUNCTION reset_all_customers()
RETURNS INTEGER AS $$
DECLARE
    v_reset_count INTEGER;
BEGIN
    -- 重置所有已分配客户为待分配状态
    UPDATE customer_pool
    SET 
        status = 'pending',
        assigned_to = NULL,
        assigned_at = NULL
    WHERE status = 'assigned';

    GET DIAGNOSTICS v_reset_count = ROW_COUNT;

        -- 记录重置操作
        INSERT INTO customer_assignment_log (customer_pool_id, customer_phone, employee_name, action_type)
        VALUES (NULL, '手动重置', NULL, 'reset');

    RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql;

-- 8. 添加表注释
COMMENT ON TABLE customer_pool IS '客户池表，存储待分配的客户数据（只包含手机号码）';
COMMENT ON TABLE customer_assignment_log IS '客户分配记录表，记录客户分配历史（不绑定员工）';
COMMENT ON COLUMN customer_pool.customer_phone IS '客户手机号码（唯一标识）';
COMMENT ON COLUMN customer_pool.status IS '客户状态：pending=待分配，assigned=已分配';
COMMENT ON COLUMN customer_pool.uploaded_by IS '上传人（商人用户名）';
COMMENT ON COLUMN customer_pool.assigned_to IS '分配给哪个员工（仅记录，不绑定）';
COMMENT ON COLUMN customer_pool.assignment_count IS '该客户被分配的次数';
COMMENT ON COLUMN customer_assignment_log.customer_phone IS '客户手机号码';
COMMENT ON COLUMN customer_assignment_log.employee_name IS '员工名称（仅记录，不绑定）';
COMMENT ON COLUMN customer_assignment_log.action_type IS '操作类型：assign=分配，reset=重置';

-- 9. 创建视图：客户池统计
CREATE OR REPLACE VIEW customer_pool_stats AS
SELECT 
    status,
    COUNT(*) as count,
    MIN(uploaded_at) as earliest_upload,
    MAX(uploaded_at) as latest_upload,
    AVG(assignment_count) as avg_assignment_count
FROM customer_pool
GROUP BY status;

-- 10. 创建视图：员工领取统计（不绑定，仅记录）
CREATE OR REPLACE VIEW employee_assignment_stats AS
SELECT 
    employee_name,
    COUNT(*) as assigned_count,
    MIN(assigned_at) as first_assignment,
    MAX(assigned_at) as last_assignment
FROM customer_assignment_log
WHERE action_type = 'assign' AND employee_name IS NOT NULL
GROUP BY employee_name
ORDER BY assigned_count DESC;

-- 11. 创建视图：客户分配频率统计
CREATE OR REPLACE VIEW customer_assignment_frequency AS
SELECT 
    customer_phone,
    assignment_count,
    last_assigned_at,
    uploaded_at,
    status
FROM customer_pool
ORDER BY assignment_count DESC, last_assigned_at DESC;
