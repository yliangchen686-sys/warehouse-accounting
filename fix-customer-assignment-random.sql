-- 修复客户分配函数，确保使用随机分配
-- 请在 Supabase SQL 编辑器中运行此脚本

-- 重新创建分配客户的数据库函数，确保使用随机分配
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
    -- 注意：ORDER BY RANDOM() 确保每次都是随机分配
    SELECT id, customer_phone
    INTO v_customer_id, v_customer_phone
    FROM customer_pool
    WHERE status = 'pending'
    ORDER BY RANDOM()  -- 随机排序，确保随机分配
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

-- 验证函数已创建
COMMENT ON FUNCTION assign_customer_to_employee(VARCHAR) IS '分配客户给员工，使用随机顺序分配（ORDER BY RANDOM()）';
