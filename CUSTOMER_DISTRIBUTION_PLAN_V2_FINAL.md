# 客户数据上传与分配功能方案 V2 - 最终版

## 核心特点

✅ **数据简化**：客户数据只包含手机号码，没有其他任何信息  
✅ **不绑定员工**：分配的数据只显示，不自动绑定  
✅ **弹窗简洁**：只显示手机号码  
✅ **复制功能**：只复制手机号码  
✅ **不重复分配**：已分配的不会再次分配  
✅ **自动重置**：分配完后自动打乱重新开始  

## 数据库表结构

### customer_pool 表（客户池）

```sql
CREATE TABLE customer_pool (
    id SERIAL PRIMARY KEY,
    customer_phone VARCHAR(50) NOT NULL UNIQUE,  -- 手机号码（唯一标识）
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to VARCHAR(100),
    assigned_at TIMESTAMP WITH TIME ZONE,
    assignment_count INTEGER NOT NULL DEFAULT 0,
    last_assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**关键点**：
- 只有 `customer_phone` 字段存储客户数据
- 没有客户名称、地址、备注等其他字段
- 手机号码必须唯一

### customer_assignment_log 表（分配记录）

```sql
CREATE TABLE customer_assignment_log (
    id SERIAL PRIMARY KEY,
    customer_pool_id INTEGER NOT NULL REFERENCES customer_pool(id),
    customer_phone VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action_type VARCHAR(20) DEFAULT 'assign',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 功能流程

### 1. 商人端上传

**上传数据格式**：
- 单个添加：输入手机号码
- 批量上传：文本文件，每行一个手机号码

**示例文件内容**：
```
13800138000
13900139000
15000150000
```

**数据库插入**：
```sql
INSERT INTO customer_pool (customer_phone, uploaded_by)
VALUES ('13800138000', '商人用户名');
```

### 2. 员工端领取

**调用函数**：
```sql
SELECT * FROM assign_customer_to_employee('员工名');
```

**返回结果**：
- `customer_id`: 客户ID
- `customer_phone`: 手机号码（唯一数据）
- `is_reset`: 是否触发了重置

### 3. 弹窗显示

**弹窗内容**：
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

**功能**：
- 只显示手机号码
- 复制按钮：只复制手机号码
- 再发一条：获取下一条手机号码

## 数据库函数

### assign_customer_to_employee()

**功能**：
1. 检查待分配客户数量
2. 如果为0，重置所有客户并打乱
3. 随机选择一条待分配的手机号码
4. 更新状态为已分配
5. 返回手机号码

**返回字段**：
- `customer_id`
- `customer_phone`（唯一数据）
- `is_reset`

## 数据示例

### 上传数据
```
13800138000
13900139000
15000150000
```

### 分配结果
```
第一次领取：13800138000
第二次领取：15000150000
第三次领取：13900139000
第四次领取：（重置后）13800138000（重新开始）
```

## 实施要点

1. **数据库脚本**：执行 `customer-pool-database-v2.sql`
2. **商人端**：上传界面只输入手机号码
3. **员工端**：弹窗只显示手机号码
4. **复制功能**：只复制 `customer_phone` 字段
5. **验证**：确保手机号码唯一性

## 注意事项

1. **数据简化**：客户数据只有手机号码，表结构已简化
2. **唯一性**：手机号码必须唯一，重复上传会被拒绝
3. **空值处理**：如果手机号码为空，显示"暂无联系电话"
4. **批量上传**：支持每行一个手机号码的文本文件
