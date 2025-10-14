-- 更新工资计算函数：从按收款人改为按客户绑定人计算
-- 执行此脚本以更新 Supabase 数据库中的工资计算逻辑

-- 删除旧函数
DROP FUNCTION IF EXISTS calculate_employee_salary(VARCHAR, INTEGER, INTEGER);

-- 创建新函数：按客户绑定关系计算员工月工资
CREATE OR REPLACE FUNCTION calculate_employee_salary(
    p_employee_name VARCHAR(100),
    p_year INTEGER,
    p_month INTEGER
)
RETURNS TABLE(
    base_salary DECIMAL,
    sales_quantity DECIMAL,
    commission DECIMAL,
    bonus DECIMAL,
    total_salary DECIMAL,
    transaction_count BIGINT
) AS $$
DECLARE
    sales_qty DECIMAL := 0;
    comm DECIMAL := 0;
    bon DECIMAL := 0;
    base_sal DECIMAL := 3000;
    trans_count BIGINT := 0;
BEGIN
    -- 计算指定月份的销售数量（根据客户绑定关系，而不是收款人）
    -- 只统计该员工绑定客户的销售交易，不包括赠送数量
    SELECT COALESCE(SUM(t.quantity), 0), COUNT(*)
    INTO sales_qty, trans_count
    FROM transactions t
    INNER JOIN customer_bindings cb ON t.customer_name = cb.customer_name
    WHERE cb.employee_name = p_employee_name
      AND t.type = 'sale'
      AND EXTRACT(YEAR FROM t.created_at) = p_year
      AND EXTRACT(MONTH FROM t.created_at) = p_month;

    -- 计算提成：销售数量 × 0.7
    comm := FLOOR(sales_qty * 0.7);

    -- 计算奖金（按阶梯）
    IF sales_qty > 20000 THEN
        bon := 10000;
    ELSIF sales_qty > 7000 THEN
        bon := 5000;
    ELSIF sales_qty > 5000 THEN
        bon := 2000;
    ELSIF sales_qty > 3000 THEN
        bon := 1000;
    ELSIF sales_qty > 1000 THEN
        bon := 500;
    ELSE
        bon := 0;
    END IF;

    -- 返回结果
    RETURN QUERY SELECT
        base_sal,
        sales_qty,
        comm,
        bon,
        base_sal + comm + bon,
        trans_count;
END;
$$ LANGUAGE plpgsql;

-- 授予权限
GRANT EXECUTE ON FUNCTION calculate_employee_salary TO authenticated, anon;

-- 说明：
-- 1. 此函数现在根据客户绑定关系（customer_bindings 表）来统计销售数量
-- 2. 如果客户没有绑定到任何员工，该客户的交易不会计入任何员工的工资
-- 3. 提成计算：销售数量 × 0.7 元（向下取整）
-- 4. 奖金阶梯：
--    0-1000件: 0元
--    1001-3000件: 500元
--    3001-5000件: 1000元
--    5001-7000件: 2000元
--    7001-20000件: 5000元
--    20001件以上: 10000元
