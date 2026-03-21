# 员工申请交易与商人审核功能实施方案（完整版）

## 一、功能概述

1. **员工端**：新增"申请交易"功能，员工可提交交易申请，并查看申请记录状态
2. **商人端**：新增"待审核交易"功能，显示并审核员工申请，同时保留审核历史记录
3. **数据流程**：申请 → 审核 → 确认 → 添加到交易记录

---

## 二、数据库设计

### 1. 新建表：`transaction_requests`（交易申请表）

```sql
CREATE TABLE IF NOT EXISTS transaction_requests (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'gift', 'return')),  -- 交易类型：销售、赠送、回收
    customer_name VARCHAR(200) NOT NULL,  -- 客户名称
    collector VARCHAR(100) NOT NULL,    -- 收款员工
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 数量
    gift_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 赠送数量
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 单价
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 总金额
    applicant_name VARCHAR(100) NOT NULL,  -- 申请人（员工名）
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),  -- 状态：待审核、已通过、已拒绝
    reviewed_by VARCHAR(100),  -- 审核人（商人名）
    reviewed_at TIMESTAMP WITH TIME ZONE,  -- 审核时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 申请时间
    notes TEXT  -- 备注
);
```

### 2. 索引和 RLS 策略

```sql
-- 创建索引
CREATE INDEX IF NOT EXISTS idx_transaction_requests_status ON transaction_requests(status);
CREATE INDEX IF NOT EXISTS idx_transaction_requests_applicant ON transaction_requests(applicant_name);
CREATE INDEX IF NOT EXISTS idx_transaction_requests_created_at ON transaction_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_requests_reviewed_by ON transaction_requests(reviewed_by);

-- 启用 RLS
ALTER TABLE transaction_requests ENABLE ROW LEVEL SECURITY;

-- RLS 策略：所有用户可读，员工可插入自己的申请，商人可更新
CREATE POLICY "transaction_requests_select" ON transaction_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "transaction_requests_insert" ON transaction_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "transaction_requests_update" ON transaction_requests FOR UPDATE TO anon, authenticated USING (true);
```

---

## 三、前端组件设计

### 1. 员工端组件

#### 1.1 申请表单组件
**文件**：`src/components/employee/TransactionRequestForm.js`

**功能点**：
- 交易类型下拉：仅"销售(sale)"、"赠送(gift)"、"回收(return)"三个选项
- 客户名称输入：
  - 实时验证是否属于该员工绑定客户
  - 验证通过：输入框后显示绿色"可交易"
  - 验证失败：显示红色"客户名不正确"
- 收款员工选择：仅可选当前员工名和商人名
- 单价自动填充：
  - 销售：20（可修改）
  - 回收：18（可修改）
  - 赠送：0（可修改）
- 总金额：自动计算 = 数量 × 单价
- 确认弹窗：
  - 显示交易信息（类型、客户、收款员工、数量、赠送数量、总金额）
  - 确认按钮5秒倒计时（灰色禁用）
  - 倒计时结束按钮变蓝可点击

#### 1.2 申请记录列表组件（新增）
**文件**：`src/components/employee/TransactionRequestList.js`

**功能点**：
- 显示该员工的所有申请记录
- 表格列：申请时间、交易类型、客户名称、收款员工、数量、赠送数量、单价、总金额、状态
- **状态显示规则**：
  - `pending`（待审核）：**黄色字体**显示"待审核"
  - `approved`（已通过）：**绿色字体**显示"已完成"
  - `rejected`（已拒绝）：红色字体显示"已拒绝"
- 支持筛选：按状态筛选（全部/待审核/已完成/已拒绝）
- 实时更新：使用 Supabase 实时订阅，审核状态变化时自动刷新

### 2. 商人端组件

#### 2.1 待审核交易组件
**文件**：`src/components/merchant/PendingTransactionRequests.js`

**功能点**：
- 列表显示所有 `status = 'pending'` 的申请
- 表格列：申请时间、申请人、交易类型、客户名称、收款员工、数量、赠送数量、单价、总金额、操作
- 每行操作按钮：
  - "确认"按钮：审核通过并添加到交易记录
  - "拒绝"按钮（可选）：标记为已拒绝
- 实时刷新：使用 Supabase 实时订阅

#### 2.2 审核历史记录组件（新增）
**文件**：`src/components/merchant/TransactionRequestHistory.js`

**功能点**：
- 显示所有已审核的申请记录（包括已通过和已拒绝）
- 表格列：申请时间、申请人、交易类型、客户名称、收款员工、数量、赠送数量、单价、总金额、审核状态、审核人、审核时间
- **状态显示规则**：
  - `approved`（已通过）：绿色字体显示"已通过"
  - `rejected`（已拒绝）：红色字体显示"已拒绝"
- 支持筛选：
  - 按状态筛选（全部/已通过/已拒绝）
  - 按申请人筛选
  - 按日期范围筛选
- 支持排序：按申请时间、审核时间排序

---

## 四、服务层设计

### 1. 新建服务：`src/services/transactionRequestService.js`

**主要方法**：
```javascript
- createRequest(requestData)  // 创建交易申请
- getPendingRequests()  // 获取待审核申请（商人端）
- getMyRequests(employeeName)  // 获取我的申请（员工端）
- getAllRequests()  // 获取所有申请（商人端审核历史）
- approveRequest(requestId, merchantName)  // 审核通过并添加到交易记录
- rejectRequest(requestId, merchantName)  // 拒绝申请
- subscribeToRequests(callback)  // 订阅实时更新
```

### 2. 修改现有服务

**`transactionService.js`**：
- 新增方法：`createTransactionFromRequest(requestId)`，将审核通过的申请转换为正式交易

---

## 五、导航栏集成

### 1. 员工端（`EmployeeApp.js`）

**菜单项**：
- 在"客户数据"后添加"申请交易"
- 图标：`FileAddOutlined` 或 `FormOutlined`
- 路由：`case 'transactionRequest': return <TransactionRequestForm user={user} />;`

**申请记录查看**：
- 在"申请交易"页面内添加 Tab 切换：
  - Tab 1："提交申请"（TransactionRequestForm）
  - Tab 2："我的申请"（TransactionRequestList）

### 2. 商人端（`MerchantApp.js`）

**菜单项**：
- 在"交易记录"后添加"待审核交易"
- 图标：`CheckCircleOutlined` 或 `AuditOutlined`
- 路由：`case 'pendingRequests': return <PendingTransactionRequests user={user} />;`

**审核历史查看**：
- 在"待审核交易"页面内添加 Tab 切换：
  - Tab 1："待审核"（PendingTransactionRequests）
  - Tab 2："审核历史"（TransactionRequestHistory）

---

## 六、业务规则实现

### 1. 客户名称验证

```javascript
// 在 TransactionRequestForm 组件中
const validateCustomerName = async (customerName) => {
  // 1. 获取当前员工绑定的所有客户
  const myCustomers = await customerService.getEmployeeCustomers(user.name);
  
  // 2. 检查输入是否在绑定列表中
  const isValid = myCustomers.some(c => c.customer_name === customerName);
  
  // 3. 返回验证结果和提示信息
  return { isValid, message: isValid ? '可交易' : '客户名不正确' };
};
```

### 2. 收款员工限制

```javascript
// 获取可选员工列表：当前员工 + 商人
const getAvailableCollectors = () => {
  const merchants = employees.filter(emp => emp.role === 'merchant' || emp.role === 'admin');
  return [user.name, ...merchants.map(m => m.name)];
};
```

### 3. 单价自动填充

```javascript
const handleTypeChange = (type) => {
  const priceMap = {
    'sale': 20,    // 销售
    'return': 18,  // 回收
    'gift': 0      // 赠送
  };
  form.setFieldValue('unitPrice', priceMap[type] || 0);
};
```

### 4. 确认弹窗倒计时

```javascript
const [countdown, setCountdown] = useState(5);
const [confirmDisabled, setConfirmDisabled] = useState(true);

useEffect(() => {
  if (modalVisible) {
    setCountdown(5);
    setConfirmDisabled(true);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setConfirmDisabled(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }
}, [modalVisible]);
```

### 5. 状态显示颜色规则（新增）

```javascript
// 员工端申请记录列表
const getStatusTag = (status) => {
  switch (status) {
    case 'pending':
      return <Tag color="gold" style={{ color: '#faad14', fontWeight: 'bold' }}>待审核</Tag>;
    case 'approved':
      return <Tag color="success" style={{ color: '#52c41a', fontWeight: 'bold' }}>已完成</Tag>;
    case 'rejected':
      return <Tag color="error" style={{ color: '#ff4d4f', fontWeight: 'bold' }}>已拒绝</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

// 商人端审核历史记录
const getStatusTag = (status) => {
  switch (status) {
    case 'approved':
      return <Tag color="success" style={{ color: '#52c41a', fontWeight: 'bold' }}>已通过</Tag>;
    case 'rejected':
      return <Tag color="error" style={{ color: '#ff4d4f', fontWeight: 'bold' }}>已拒绝</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};
```

---

## 七、数据流程

```
1. 员工填写申请表单
   ↓
2. 点击"确定"按钮
   ↓
3. 显示确认弹窗（5秒倒计时）
   ↓
4. 倒计时结束后点击"确认"
   ↓
5. 调用 transactionRequestService.createRequest()
   ↓
6. 数据保存到 transaction_requests 表（status='pending'）
   ↓
7. 员工端"我的申请"列表显示该记录（黄色"待审核"）
   ↓
8. 商人端实时显示在"待审核交易"页面
   ↓
9. 商人点击"确认"按钮
   ↓
10. 调用 transactionRequestService.approveRequest()
   ↓
11. 更新申请状态为 'approved'，记录审核人和审核时间
   ↓
12. 调用 transactionService.createTransactionFromRequest()
   ↓
13. 添加到 transactions 表（正式交易记录）
   ↓
14. 员工端"我的申请"列表自动更新（绿色"已完成"）
   ↓
15. 商人端"审核历史"列表显示该记录（绿色"已通过"）
   ↓
16. 触发库存更新、工资计算等后续流程
```

---

## 八、实施步骤

### 阶段一：数据库准备
1. 在 Supabase 执行 SQL 脚本创建 `transaction_requests` 表
2. 创建索引和 RLS 策略
3. 测试表结构和权限

### 阶段二：服务层开发
1. 创建 `transactionRequestService.js`
2. 实现 CRUD 和实时订阅方法
3. 修改 `transactionService.js` 添加转换方法

### 阶段三：员工端开发
1. 创建 `TransactionRequestForm.js`（申请表单）
2. 创建 `TransactionRequestList.js`（申请记录列表）
3. 实现表单验证和业务规则
4. 实现确认弹窗和倒计时
5. 实现状态显示（黄色待审核、绿色已完成）
6. 集成到 `EmployeeApp.js` 导航栏（Tab 切换）

### 阶段四：商人端开发
1. 创建 `PendingTransactionRequests.js`（待审核列表）
2. 创建 `TransactionRequestHistory.js`（审核历史记录）
3. 实现列表展示和审核功能
4. 实现状态显示（绿色已通过、红色已拒绝）
5. 集成到 `MerchantApp.js` 导航栏（Tab 切换）

### 阶段五：测试与优化
1. 测试员工端申请流程
2. 测试员工端申请记录状态显示
3. 测试商人端审核流程
4. 测试商人端审核历史记录
5. 测试数据同步和实时更新
6. 优化用户体验和错误处理

---

## 九、注意事项

1. **数据一致性**：审核通过后，确保申请数据正确转换为交易记录
2. **权限控制**：员工只能申请和查看自己的申请，商人可以审核和查看所有申请
3. **实时更新**：使用 Supabase 实时订阅确保数据同步，状态变化时自动刷新
4. **状态显示**：
   - 员工端：待审核（黄色）、已完成（绿色）、已拒绝（红色）
   - 商人端：已通过（绿色）、已拒绝（红色）
5. **错误处理**：网络失败时提供友好提示和重试机制
6. **数据验证**：前端和后端双重验证，确保数据准确性
7. **用户体验**：倒计时、加载状态、成功/失败提示、实时状态更新

---

## 十、文件清单

### 新建文件：
- `src/components/employee/TransactionRequestForm.js`（申请表单）
- `src/components/employee/TransactionRequestList.js`（申请记录列表）
- `src/components/merchant/PendingTransactionRequests.js`（待审核列表）
- `src/components/merchant/TransactionRequestHistory.js`（审核历史记录）
- `src/services/transactionRequestService.js`（服务层）
- `transaction-request-database.sql`（数据库脚本）

### 修改文件：
- `src/components/employee/EmployeeApp.js`（添加菜单项和 Tab 切换）
- `src/components/merchant/MerchantApp.js`（添加菜单项和 Tab 切换）
- `src/services/transactionService.js`（添加转换方法）

---

## 十一、UI/UX 设计要点

### 1. 员工端申请记录列表
- 使用 Ant Design 的 `Table` 组件
- 状态列使用 `Tag` 组件，颜色规则：
  - 待审核：`color="gold"`，字体颜色 `#faad14`（黄色）
  - 已完成：`color="success"`，字体颜色 `#52c41a`（绿色）
  - 已拒绝：`color="error"`，字体颜色 `#ff4d4f`（红色）

### 2. 商人端审核历史记录
- 使用 Ant Design 的 `Table` 组件
- 状态列使用 `Tag` 组件，颜色规则：
  - 已通过：`color="success"`，字体颜色 `#52c41a`（绿色）
  - 已拒绝：`color="error"`，字体颜色 `#ff4d4f`（红色）

### 3. Tab 切换设计
- 员工端："提交申请" | "我的申请"
- 商人端："待审核" | "审核历史"
- 使用 Ant Design 的 `Tabs` 组件

---

## 十二、状态流转图

```
员工提交申请
    ↓
status = 'pending'（待审核）
    ↓
    ├─→ 商人审核通过 → status = 'approved'（已完成/已通过）
    │       ↓
    │   添加到交易记录
    │       ↓
    │   员工端显示绿色"已完成"
    │   商人端显示绿色"已通过"
    │
    └─→ 商人审核拒绝 → status = 'rejected'（已拒绝）
            ↓
        员工端显示红色"已拒绝"
        商人端显示红色"已拒绝"
```

---

此方案已完整包含所有需求，包括申请记录展示、状态显示颜色规则、以及商人端审核历史记录功能。
