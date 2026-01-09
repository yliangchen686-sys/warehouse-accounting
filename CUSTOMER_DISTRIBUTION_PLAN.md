# 客户数据上传与分配功能方案

## 功能概述

- **商人端**：上传客户数据到 Supabase 数据库的客户池
- **员工端**：每次点击按钮，从客户池中领取一条未分配的客户数据，并自动绑定到该员工

## 数据库设计

### 1. 客户池表（customer_pool）

用于存储待分配的客户数据。

```sql
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
```

**字段说明**：
- `customer_name`: 客户名称（必填，唯一）
- `customer_phone`: 客户电话（可选）
- `customer_address`: 客户地址（可选）
- `customer_notes`: 客户备注（可选）
- `status`: 状态（'pending' 待分配，'assigned' 已分配）
- `uploaded_by`: 上传人（商人用户名）
- `uploaded_at`: 上传时间
- `assigned_to`: 分配给哪个员工
- `assigned_at`: 分配时间

### 2. 客户领取记录表（customer_assignment_log）

用于记录客户分配历史。

```sql
CREATE TABLE IF NOT EXISTS customer_assignment_log (
    id SERIAL PRIMARY KEY,
    customer_pool_id INTEGER NOT NULL REFERENCES customer_pool(id),
    customer_name VARCHAR(200) NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**字段说明**：
- `customer_pool_id`: 客户池记录ID（外键）
- `customer_name`: 客户名称
- `employee_name`: 员工名称
- `assigned_at`: 分配时间

### 3. 索引和约束

```sql
-- 创建索引
CREATE INDEX IF NOT EXISTS idx_customer_pool_status ON customer_pool(status);
CREATE INDEX IF NOT EXISTS idx_customer_pool_assigned_to ON customer_pool(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customer_pool_uploaded_at ON customer_pool(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_employee_name ON customer_assignment_log(employee_name);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_assigned_at ON customer_assignment_log(assigned_at);

-- 启用 RLS
ALTER TABLE customer_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_assignment_log ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "customer_pool_all_access" ON customer_pool FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "customer_assignment_log_all_access" ON customer_assignment_log FOR ALL TO anon, authenticated USING (true);
```

## 功能流程

### 商人端：上传客户数据

**步骤**：
1. 商人端提供上传界面（可以是批量导入或单个添加）
2. 上传客户数据到 `customer_pool` 表
3. 设置 `status = 'pending'`（待分配状态）
4. 记录 `uploaded_by` 为当前商人用户名

**数据格式示例**：
```json
{
  "customer_name": "客户A",
  "customer_phone": "13800138000",
  "customer_address": "北京市朝阳区",
  "customer_notes": "重要客户"
}
```

### 员工端：领取客户数据

**步骤**：
1. 员工点击"领取客户"按钮
2. 系统执行以下操作（使用数据库事务确保原子性）：
   - 查询一条 `status = 'pending'` 的记录（按 `uploaded_at` 升序，先上传的先分配）
   - 如果找到，更新该记录：
     - `status = 'assigned'`
     - `assigned_to = 当前员工名`
     - `assigned_at = NOW()`
   - 在 `customer_assignment_log` 表中插入一条记录
   - 在 `customer_bindings` 表中插入或更新绑定关系（`customer_name` -> `employee_name`）
3. 返回领取的客户信息给员工

**关键SQL逻辑**（使用事务和行锁防止并发问题）：

```sql
BEGIN;

-- 1. 查询并锁定一条待分配的客户（使用 SELECT FOR UPDATE SKIP LOCKED）
SELECT id, customer_name, customer_phone, customer_address, customer_notes
FROM customer_pool
WHERE status = 'pending'
ORDER BY uploaded_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- 2. 更新客户状态为已分配
UPDATE customer_pool
SET 
    status = 'assigned',
    assigned_to = '员工名',
    assigned_at = NOW()
WHERE id = ? AND status = 'pending';

-- 3. 插入分配记录
INSERT INTO customer_assignment_log (customer_pool_id, customer_name, employee_name)
VALUES (?, ?, ?);

-- 4. 插入或更新客户绑定关系
INSERT INTO customer_bindings (customer_name, employee_name)
VALUES (?, ?)
ON CONFLICT (customer_name) 
DO UPDATE SET employee_name = EXCLUDED.employee_name;

COMMIT;
```

## 数据库函数（可选优化）

可以创建一个数据库函数来简化领取逻辑：

```sql
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
    -- 查询并锁定一条待分配的客户
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

    -- 更新客户状态
    UPDATE customer_pool
    SET 
        status = 'assigned',
        assigned_to = p_employee_name,
        assigned_at = NOW()
    WHERE id = v_customer_id;

    -- 插入分配记录
    INSERT INTO customer_assignment_log (customer_pool_id, customer_name, employee_name)
    VALUES (v_customer_id, v_customer_name, p_employee_name);

    -- 插入或更新客户绑定关系
    INSERT INTO customer_bindings (customer_name, employee_name)
    VALUES (v_customer_name, p_employee_name)
    ON CONFLICT (customer_name) 
    DO UPDATE SET employee_name = EXCLUDED.employee_name;

    -- 返回客户信息
    RETURN QUERY
    SELECT v_customer_id, v_customer_name, v_customer_phone, v_customer_address, v_customer_notes;
END;
$$ LANGUAGE plpgsql;
```

**使用方式**：
```sql
SELECT * FROM assign_customer_to_employee('员工名');
```

## 界面设计建议

### 商人端界面

1. **客户池管理页面**：
   - 显示所有客户（待分配/已分配）
   - 批量导入功能（支持 CSV/Excel）
   - 单个添加客户
   - 查看分配统计

2. **上传方式**：
   - 手动添加：表单输入
   - 批量导入：上传 CSV/Excel 文件，解析后批量插入

### 员工端界面

1. **领取客户按钮**：
   - 显示"领取客户"按钮
   - 点击后显示领取的客户信息
   - 如果客户池为空，提示"暂无可用客户"

2. **我的客户列表**：
   - 显示已领取的客户
   - 可以查看客户详情

## 数据统计查询

### 查看待分配客户数量
```sql
SELECT COUNT(*) as pending_count
FROM customer_pool
WHERE status = 'pending';
```

### 查看员工领取统计
```sql
SELECT 
    employee_name,
    COUNT(*) as assigned_count
FROM customer_assignment_log
GROUP BY employee_name
ORDER BY assigned_count DESC;
```

### 查看客户池状态
```sql
SELECT 
    status,
    COUNT(*) as count
FROM customer_pool
GROUP BY status;
```

## 安全考虑

1. **权限控制**：
   - 只有商人可以上传客户数据
   - 只有员工可以领取客户数据
   - 使用 RLS 策略控制访问

2. **并发控制**：
   - 使用 `SELECT FOR UPDATE SKIP LOCKED` 防止多个员工同时领取同一条客户
   - 使用数据库事务确保操作的原子性

3. **数据完整性**：
   - 使用外键约束
   - 使用唯一约束防止重复客户名

## 扩展功能（可选）

1. **客户池管理**：
   - 删除未分配的客户
   - 重新分配已分配的客户
   - 客户池清空功能

2. **分配规则**：
   - 按员工工作量平均分配
   - 按客户类型分配
   - 手动指定分配

3. **通知功能**：
   - 客户池为空时通知商人
   - 员工领取客户后通知商人

## 实施步骤

1. **第一步**：在 Supabase 中执行数据库脚本，创建表和函数
2. **第二步**：在商人端添加上传客户数据的功能
3. **第三步**：在员工端添加领取客户的功能
4. **第四步**：测试并发场景，确保数据一致性
5. **第五步**：添加统计和监控功能

## 注意事项

1. **客户名称唯一性**：`customer_pool` 和 `customer_bindings` 都要求客户名唯一
2. **状态管理**：确保客户状态正确更新，避免重复分配
3. **性能优化**：如果客户池数据量大，考虑添加分页和索引优化
4. **数据备份**：定期备份客户池数据，防止数据丢失
