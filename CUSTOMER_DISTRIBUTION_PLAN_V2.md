# 客户数据上传与分配功能方案 V2（更新版）

## 功能概述

- **商人端**：上传客户数据到 Supabase 数据库的客户池
- **员工端**：每次点击按钮，从客户池中领取一条未分配的客户数据，以弹窗形式显示
- **弹窗功能**：显示客户信息，提供"复制"和"再发一条"两个按钮
- **自动重置**：当所有客户都分配完后，自动打乱并重置所有客户状态，重新开始分配

## 核心需求

1. ✅ **不自动绑定员工**：分配的数据只显示，不自动绑定到 `customer_bindings` 表
2. ✅ **弹窗交互**：弹窗只显示联系电话，提供"复制"和"再发一条"按钮
3. ✅ **复制功能**：点击复制按钮，只复制电话号码到剪贴板，不复制其他信息
4. ✅ **不重复分配**：已分配的客户不会再次分配
5. ✅ **自动重置**：所有客户分配完后，自动打乱并重置状态，重新开始分配

## 数据库设计

### 1. 客户池表（customer_pool）

用于存储待分配的客户数据（只包含手机号码）。

```sql
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
```

**字段说明**：
- `customer_phone`: 客户手机号码（唯一标识，必填）
- `assignment_count`: 记录该客户被分配的次数（用于统计和重置判断）
- `last_assigned_at`: 最后一次分配的时间
- **注意**：客户数据只包含手机号码，没有客户名称、地址、备注等其他信息

### 2. 客户分配记录表（customer_assignment_log）

用于记录每次分配的历史（不绑定员工，只记录分配记录）。

```sql
CREATE TABLE IF NOT EXISTS customer_assignment_log (
    id SERIAL PRIMARY KEY,
    customer_pool_id INTEGER NOT NULL REFERENCES customer_pool(id) ON DELETE CASCADE,
    customer_phone VARCHAR(50) NOT NULL,  -- 手机号码
    employee_name VARCHAR(100),  -- 可选，记录是哪个员工领取的（不绑定）
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action_type VARCHAR(20) DEFAULT 'assign' CHECK (action_type IN ('assign', 'reset')),  -- 分配或重置
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**字段说明**：
- `customer_phone`: 客户手机号码
- `employee_name`: 可选字段，记录领取员工（但不绑定）
- `action_type`: 操作类型（'assign' 分配，'reset' 重置）

### 3. 索引和约束

```sql
-- 创建索引
CREATE INDEX IF NOT EXISTS idx_customer_pool_status ON customer_pool(status);
CREATE INDEX IF NOT EXISTS idx_customer_pool_assigned_to ON customer_pool(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customer_pool_uploaded_at ON customer_pool(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_customer_pool_assignment_count ON customer_pool(assignment_count);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_employee_name ON customer_assignment_log(employee_name);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_assigned_at ON customer_assignment_log(assigned_at);
CREATE INDEX IF NOT EXISTS idx_customer_assignment_log_customer_pool_id ON customer_assignment_log(customer_pool_id);
```

## 功能流程

### 商人端：上传客户数据

**步骤**：
1. 商人端提供上传界面（批量导入或单个添加）
2. 上传客户数据到 `customer_pool` 表（只上传手机号码）
3. 设置 `status = 'pending'`（待分配状态）
4. 记录 `uploaded_by` 为当前商人用户名
5. `assignment_count = 0`（初始分配次数为0）

**数据格式示例**：
```json
{
  "customer_phone": "13800138000"
}
```

**批量上传格式**（CSV/文本）：
```
13800138000
13900139000
15000150000
```

**注意事项**：
- 只包含手机号码，没有其他信息
- 手机号码必须唯一，重复上传会被数据库拒绝（唯一约束）
- 支持批量上传：每行一个手机号码

### 员工端：领取客户数据

**步骤**：
1. 员工点击"领取客户"按钮
2. 系统执行以下操作：
   - **检查是否有待分配客户**：
     ```sql
     SELECT COUNT(*) FROM customer_pool WHERE status = 'pending';
     ```
   - **如果没有待分配客户（所有客户都已分配）**：
     - 执行重置操作：将所有客户状态重置为 `pending`
     - 打乱客户顺序（随机排序）
   - **分配一条客户**：
     - 查询一条 `status = 'pending'` 的记录（按随机顺序或上传时间）
     - 更新该记录：
       - `status = 'assigned'`
       - `assigned_to = 当前员工名`（仅记录，不绑定）
       - `assigned_at = NOW()`
       - `assignment_count = assignment_count + 1`
       - `last_assigned_at = NOW()`
     - 在 `customer_assignment_log` 表中插入一条记录
3. 返回客户信息，以弹窗形式显示（仅显示联系电话）

### 弹窗功能

**显示内容**：
- **仅显示客户联系电话**（customer_phone）
- 不显示客户名称、地址、备注等其他信息
- 弹窗简洁，只展示电话号码

**按钮功能**：
1. **复制按钮**：
   - 仅复制客户联系电话（customer_phone）到剪贴板
   - 不复制其他任何信息
   - 提示"已复制到剪贴板"或"电话号码已复制"

2. **再发一条按钮**：
   - 关闭当前弹窗
   - 立即再次调用分配函数，获取下一条客户
   - 显示新的客户联系电话弹窗

## 数据库函数设计

### 1. 分配客户函数（核心函数）

```sql
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
        -- 重置所有客户状态为 pending，并打乱顺序
        UPDATE customer_pool
        SET 
            status = 'pending',
            assigned_to = NULL,
            assigned_at = NULL
        WHERE status = 'assigned';

        -- 记录重置操作
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

    -- 插入分配记录
    INSERT INTO customer_assignment_log (customer_pool_id, customer_phone, employee_name, action_type)
    VALUES (v_customer_id, v_customer_phone, p_employee_name, 'assign');

    -- 返回客户信息（只返回手机号码，不绑定到 customer_bindings 表）
    RETURN QUERY
    SELECT v_customer_id, v_customer_phone, v_is_reset;
END;
$$ LANGUAGE plpgsql;
```

### 2. 重置所有客户函数（可选，手动重置）

```sql
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
    INSERT INTO customer_assignment_log (customer_pool_id, customer_name, employee_name, action_type)
    SELECT id, customer_name, NULL, 'reset'
    FROM customer_pool
    WHERE status = 'pending'
    LIMIT 1;

    RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql;
```

## 界面设计

### 员工端界面

1. **领取客户按钮**：
   - 显示"领取客户"按钮
   - 点击后调用分配函数

2. **客户联系电话弹窗**：
   ```
   ┌─────────────────────────────┐
   │  联系电话                    │
   ├─────────────────────────────┤
   │                             │
   │        13800138000          │
   │                             │
   ├─────────────────────────────┤
   │  [复制]  [再发一条]          │
   └─────────────────────────────┘
   ```
   
   **说明**：
   - 弹窗标题：可显示"联系电话"或"客户电话"
   - 主要内容：大字体显示电话号码
   - 不显示客户名称、地址、备注等其他信息

3. **按钮功能**：
   - **复制按钮**：仅复制电话号码到剪贴板（只复制 `customer_phone` 字段）
   - **再发一条按钮**：关闭当前弹窗，立即获取下一条客户的电话号码

### 商人端界面

1. **客户池管理页面**：
   - 显示所有客户（待分配/已分配）
   - 显示每个客户的分配次数
   - 批量导入功能
   - 单个添加客户
   - 手动重置功能（可选）

## 数据统计查询

### 查看待分配客户数量
```sql
SELECT COUNT(*) as pending_count
FROM customer_pool
WHERE status = 'pending';
```

### 查看已分配客户数量
```sql
SELECT COUNT(*) as assigned_count
FROM customer_pool
WHERE status = 'assigned';
```

### 查看客户分配次数统计
```sql
SELECT 
    customer_phone,
    assignment_count,
    last_assigned_at,
    uploaded_at
FROM customer_pool
ORDER BY assignment_count DESC, last_assigned_at DESC;
```

### 查看员工领取统计（不绑定，仅记录）
```sql
SELECT 
    employee_name,
    COUNT(*) as assigned_count
FROM customer_assignment_log
WHERE action_type = 'assign'
GROUP BY employee_name
ORDER BY assigned_count DESC;
```

### 查看重置记录
```sql
SELECT 
    COUNT(*) as reset_count,
    MAX(assigned_at) as last_reset_time
FROM customer_assignment_log
WHERE action_type = 'reset';
```

## 关键逻辑说明

### 1. 不重复分配机制

- 使用 `status` 字段区分待分配/已分配
- 只分配 `status = 'pending'` 的客户
- 分配后立即更新为 `status = 'assigned'`
- 使用 `FOR UPDATE SKIP LOCKED` 防止并发冲突

### 2. 自动重置机制

- 每次分配前检查待分配客户数量
- 如果 `pending_count = 0`，执行重置：
  - 将所有 `status = 'assigned'` 的客户重置为 `status = 'pending'`
  - 清空 `assigned_to` 和 `assigned_at`（但保留 `assignment_count`）
  - 使用 `ORDER BY RANDOM()` 实现随机打乱
  - 记录重置操作到日志表

### 3. 不绑定员工机制

- 分配函数不操作 `customer_bindings` 表
- `assigned_to` 字段仅用于记录，不影响业务逻辑
- 员工可以多次领取，每次都是独立的分配记录

### 4. 弹窗交互机制

- **复制功能**：使用浏览器 Clipboard API，仅复制电话号码
  ```javascript
  // 只复制 customer_phone 字段
  navigator.clipboard.writeText(customerData.customer_phone);
  // 提示：已复制到剪贴板
  ```
- **再发一条功能**：关闭当前弹窗，立即调用分配函数，显示新的电话号码弹窗
- **弹窗显示**：只显示 `customer_phone` 字段，不显示其他客户信息

## 安全考虑

1. **并发控制**：
   - 使用 `SELECT FOR UPDATE SKIP LOCKED` 防止多个员工同时领取同一条客户
   - 使用数据库事务确保操作的原子性

2. **数据完整性**：
   - 使用外键约束
   - 使用唯一约束防止重复客户名
   - 使用 CHECK 约束限制状态值

3. **性能优化**：
   - 使用索引优化查询
   - 随机排序可能影响性能，如果数据量大，考虑使用其他打乱方式

## 实施步骤

1. **第一步**：在 Supabase 中执行更新后的数据库脚本
2. **第二步**：在商人端添加上传客户数据的功能
3. **第三步**：在员工端添加领取客户的功能和弹窗
4. **第四步**：实现复制和再发一条功能
5. **第五步**：测试自动重置机制
6. **第六步**：测试并发场景，确保数据一致性

## 注意事项

1. **随机打乱性能**：`ORDER BY RANDOM()` 在数据量大时可能较慢，可以考虑：
   - 使用预生成的随机序列
   - 使用哈希函数生成随机顺序
   - 限制每次重置的数量

2. **分配次数统计**：`assignment_count` 会一直累加，用于统计每个客户被分配的频率

3. **重置时机**：重置发生在所有客户都分配完后，确保每个客户至少被分配一次后才重置

4. **不绑定机制**：客户分配后不会自动绑定到员工，如果需要绑定，需要员工手动操作

5. **数据备份**：定期备份客户池数据，防止数据丢失

## 扩展功能（可选）

1. **分配规则配置**：
   - 配置重置条件（如：分配次数达到阈值才重置）
   - 配置打乱方式（随机/按时间/按分配次数）

2. **统计功能**：
   - 显示每个客户的分配频率
   - 显示重置次数
   - 显示员工领取统计

3. **通知功能**：
   - 客户池为空时通知商人
   - 重置发生时通知商人

4. **批量操作**：
   - 批量删除客户
   - 批量重置客户状态
   - 批量导入客户
