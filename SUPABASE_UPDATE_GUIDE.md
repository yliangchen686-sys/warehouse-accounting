# Supabase 数据库更新指南

## 修改内容说明

本次修改将员工提成计算逻辑从**按收款人统计**改为**按客户绑定人统计**。

## 需要执行的数据库更新

### 1. 检查表是否存在

首先确认 Supabase 中已经存在以下表：

- ✅ `customer_bindings` - 客户绑定关系表
- ✅ `transactions` - 交易记录表
- ✅ `salary_records` - 工资记录表

如果 `customer_bindings` 表不存在，请先执行：`customer-salary-database.sql`

### 2. 更新数据库函数（重要！）

**必须执行**以下 SQL 脚本来更新数据库中的工资计算函数：

```bash
文件：update-salary-calculation-function.sql
```

**执行步骤：**

1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击左侧菜单的 "SQL Editor"
4. 创建新查询
5. 复制 `update-salary-calculation-function.sql` 文件内容
6. 点击 "Run" 执行

### 3. 函数修改详情

#### 修改前（按收款人）：
```sql
FROM transactions
WHERE collector = p_employee_name
  AND type = 'sale'
```

#### 修改后（按客户绑定人）：
```sql
FROM transactions t
INNER JOIN customer_bindings cb ON t.customer_name = cb.customer_name
WHERE cb.employee_name = p_employee_name
  AND t.type = 'sale'
```

## 业务逻辑变化

### 新的计算规则：

1. **客户绑定关系优先**
   - 每个客户必须在 `customer_bindings` 表中绑定到一个员工
   - 该客户的所有销售交易都计入绑定员工的业绩

2. **提成归属规则**
   - ❌ 旧规则：提成归属于实际收款人（`collector`）
   - ✅ 新规则：提成归属于客户绑定的员工（`customer_bindings.employee_name`）

3. **未绑定客户的处理**
   - 如果客户没有绑定员工，该客户的交易不会计入任何员工的提成
   - 建议定期检查并绑定所有客户

## 数据验证建议

执行更新后，建议进行以下验证：

### 1. 检查客户绑定情况
```sql
-- 查看所有客户绑定
SELECT * FROM customer_bindings ORDER BY created_at DESC;

-- 查看未绑定的客户
SELECT DISTINCT t.customer_name
FROM transactions t
LEFT JOIN customer_bindings cb ON t.customer_name = cb.customer_name
WHERE cb.customer_name IS NULL;
```

### 2. 测试工资计算函数
```sql
-- 测试某个员工的工资计算（例如：2024年10月）
SELECT * FROM calculate_employee_salary('员工姓名', 2024, 10);
```

### 3. 对比新旧计算结果
```sql
-- 按收款人统计（旧逻辑）
SELECT
    collector,
    COUNT(*) as transaction_count,
    SUM(quantity) as total_quantity,
    SUM(total_amount) as total_amount
FROM transactions
WHERE type = 'sale'
  AND EXTRACT(YEAR FROM created_at) = 2024
  AND EXTRACT(MONTH FROM created_at) = 10
GROUP BY collector;

-- 按客户绑定人统计（新逻辑）
SELECT
    cb.employee_name,
    COUNT(*) as transaction_count,
    SUM(t.quantity) as total_quantity,
    SUM(t.total_amount) as total_amount
FROM transactions t
INNER JOIN customer_bindings cb ON t.customer_name = cb.customer_name
WHERE t.type = 'sale'
  AND EXTRACT(YEAR FROM t.created_at) = 2024
  AND EXTRACT(MONTH FROM t.created_at) = 10
GROUP BY cb.employee_name;
```

## 注意事项

1. **备份数据**
   - 在执行 SQL 脚本前，建议先备份数据库

2. **前端代码已更新**
   - `src/services/salaryService.js` - 工资计算服务
   - `src/services/employeePaymentService.js` - 员工收款统计服务

3. **数据一致性**
   - 确保所有活跃客户都已绑定到员工
   - 定期检查新增客户的绑定状态

4. **权限设置**
   - 确保 `customer_bindings` 表的 RLS 策略已正确配置
   - 函数执行权限已授予 `authenticated` 和 `anon` 角色

## 回滚方案

如果需要回滚到旧逻辑，请执行以下 SQL：

```sql
DROP FUNCTION IF EXISTS calculate_employee_salary(VARCHAR, INTEGER, INTEGER);

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
    -- 按收款人统计（旧逻辑）
    SELECT COALESCE(SUM(quantity), 0), COUNT(*)
    INTO sales_qty, trans_count
    FROM transactions
    WHERE collector = p_employee_name
      AND type = 'sale'
      AND EXTRACT(YEAR FROM created_at) = p_year
      AND EXTRACT(MONTH FROM created_at) = p_month;

    comm := FLOOR(sales_qty * 0.7);

    IF sales_qty > 20000 THEN bon := 10000;
    ELSIF sales_qty > 7000 THEN bon := 5000;
    ELSIF sales_qty > 5000 THEN bon := 2000;
    ELSIF sales_qty > 3000 THEN bon := 1000;
    ELSIF sales_qty > 1000 THEN bon := 500;
    ELSE bon := 0;
    END IF;

    RETURN QUERY SELECT base_sal, sales_qty, comm, bon, base_sal + comm + bon, trans_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION calculate_employee_salary TO authenticated, anon;
```

## 相关文件

- ✅ `update-salary-calculation-function.sql` - 数据库函数更新脚本
- ✅ `customer-salary-database.sql` - 完整的表结构定义
- ✅ `src/services/salaryService.js` - 前端工资计算服务
- ✅ `src/services/employeePaymentService.js` - 前端收款统计服务
