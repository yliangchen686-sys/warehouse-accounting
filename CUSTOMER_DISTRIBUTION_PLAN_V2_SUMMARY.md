# 客户数据上传与分配功能方案 V2 - 简化版总结

## 核心功能

### 商人端
- 上传客户数据到 `customer_pool` 表
- 客户数据只包含：手机号码（customer_phone）
- 没有客户名称、地址、备注等其他信息
- 上传后状态为 `pending`（待分配）

### 员工端
- 点击"领取客户"按钮
- 弹窗显示：**仅显示联系电话**（customer_phone）
- 两个按钮：
  - **复制**：只复制电话号码到剪贴板
  - **再发一条**：关闭当前弹窗，立即获取下一条电话号码

## 弹窗设计

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

**关键点**：
- ✅ 只显示电话号码，不显示客户名称、地址、备注
- ✅ 复制按钮只复制电话号码
- ✅ 简洁明了，便于快速操作

## 数据流程

1. **商人上传** → `customer_pool` 表（status = 'pending'）
2. **员工领取** → 调用 `assign_customer_to_employee()` 函数
3. **函数返回** → 返回客户数据（包含 customer_phone）
4. **弹窗显示** → 只显示 `customer_phone` 字段
5. **复制操作** → 只复制 `customer_phone` 到剪贴板

## 数据库函数

```sql
-- 调用方式
SELECT * FROM assign_customer_to_employee('员工名');

-- 返回字段
- customer_id
- customer_phone (仅显示此字段，也是唯一的数据)
- is_reset (是否触发了重置)
```

## 前端实现要点

### 弹窗显示
```javascript
// 从函数返回的数据中，只使用 customer_phone（这是唯一的数据）
const phoneNumber = result.customer_phone;

// 弹窗内容（只显示手机号码）
<div>
  <h3>联系电话</h3>
  <div style="font-size: 24px; text-align: center;">
    {phoneNumber || '暂无联系电话'}
  </div>
  <div>
    <button onClick={handleCopy}>复制</button>
    <button onClick={handleNext}>再发一条</button>
  </div>
</div>
```

### 复制功能
```javascript
const handleCopy = async () => {
  // 只复制电话号码
  await navigator.clipboard.writeText(customerData.customer_phone);
  message.success('电话号码已复制');
};
```

### 再发一条功能
```javascript
const handleNext = async () => {
  // 关闭当前弹窗
  setModalVisible(false);
  
  // 立即调用分配函数
  const nextCustomer = await assignCustomer();
  
  // 显示新的弹窗（只显示电话号码）
  setCustomerData(nextCustomer);
  setModalVisible(true);
};
```

## 注意事项

1. **数据简化**：客户数据只包含手机号码，没有其他信息
2. **复制内容**：确保只复制 `customer_phone` 字段
3. **空值处理**：如果 `customer_phone` 为空，弹窗应显示提示信息（如"暂无联系电话"）
4. **格式显示**：电话号码可以格式化显示（如：138-0013-8000），但复制时复制原始值
5. **唯一性约束**：手机号码必须唯一，重复上传会被数据库拒绝
6. **批量上传**：支持批量上传，每行一个手机号码

## 实施检查清单

- [ ] 数据库脚本已执行（customer-pool-database-v2.sql）
- [ ] 商人端上传功能已实现
- [ ] 员工端领取按钮已添加
- [ ] 弹窗组件已创建（只显示电话号码）
- [ ] 复制功能已实现（只复制电话号码）
- [ ] 再发一条功能已实现
- [ ] 自动重置机制已测试
- [ ] 并发场景已测试
