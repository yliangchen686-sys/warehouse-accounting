# 🔍 库存异常诊断报告

## 问题描述
- **预期情况**：库存从 10000 减少到 9000（减少 1000）
- **实际情况**：库存变成了 6000（减少了 4000）
- **异常差值**：多减少了 3000

---

## 🚨 已发现的问题

### ❌ **问题 1：TransactionForm 缺少 `productName` 字段**

**位置**：`src/components/merchant/TransactionForm.js`

**问题**：表单中没有 `productName`（商品名称）输入框！

**影响**：
- 用户创建交易时**无法填写商品名称**
- `transactionData.productName` 为 `undefined` 或 `null`
- 导致 `inventoryService.handleTransactionStock()` 中的检查生效：
  ```javascript
  if (!productName) {
    console.warn('没有商品名称，跳过库存更新');
    return null;
  }
  ```
- **结果**：库存根本不会更新！

**但是**：这与你的问题不符 - 如果跳过更新，库存应该还是 10000，而不是变成 6000。

---

### 🔍 **可能的问题 2：同一商品被多次扣减**

#### 场景 A：多次触发创建交易
```javascript
// 可能的原因：
1. 用户快速双击"保存"按钮
2. 表单提交事件被触发多次
3. 网络延迟导致重复提交
```

#### 场景 B：数据库中有多个同名但不同 ID 的商品
```sql
-- 检查是否有重复商品
SELECT product_name, COUNT(*) as count
FROM inventory
GROUP BY product_name
HAVING COUNT(*) > 1;
```

#### 场景 C：同一交易对应多条库存变动记录
```sql
-- 检查是否一个交易ID对应多条库存变动
SELECT transaction_id, COUNT(*) as change_count
FROM inventory_changes
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id
HAVING COUNT(*) > 1;
```

---

### 🔍 **可能的问题 3：历史遗留的库存计算问题**

如果之前使用过本地存储模式，可能存在：
- 本地存储中有未同步的库存扣减记录
- 多个浏览器/设备的本地存储不一致
- 旧代码多次调用了库存更新

---

## 🔧 诊断步骤

### 步骤 1：检查数据库中的库存变动记录

在 Supabase SQL 编辑器中运行：

```sql
-- 查看最近的库存变动记录
SELECT
  ic.id,
  ic.product_name,
  ic.transaction_id,
  ic.change_type,
  ic.quantity_change,
  ic.stock_before,
  ic.stock_after,
  ic.created_at,
  t.type as transaction_type,
  t.customer_name,
  t.quantity as transaction_quantity,
  t.gift_quantity as transaction_gift
FROM inventory_changes ic
LEFT JOIN transactions t ON ic.transaction_id = t.id
ORDER BY ic.created_at DESC
LIMIT 20;
```

**查看要点**：
- 是否有多条记录对应同一个 `transaction_id`？
- `quantity_change` 是否正确（应该 = 交易数量 + 赠送数量）？
- `stock_before` 和 `stock_after` 的差值是否等于 `quantity_change`？
- 是否有异常的大量扣减？

---

### 步骤 2：检查是否有重复的商品记录

```sql
-- 检查 inventory 表中是否有重复商品
SELECT
  product_name,
  COUNT(*) as count,
  STRING_AGG(CAST(current_stock AS TEXT), ', ') as stocks
FROM inventory
GROUP BY product_name
HAVING COUNT(*) > 1;
```

**预期结果**：应该返回 0 行（因为 `product_name` 有 UNIQUE 约束）

---

### 步骤 3：检查当前库存与变动记录是否一致

```sql
-- 计算某商品的理论库存（从变动记录推算）
WITH product_changes AS (
  SELECT
    product_name,
    SUM(CASE
      WHEN change_type = 'increase' THEN quantity_change
      WHEN change_type = 'decrease' THEN -quantity_change
    END) as total_change
  FROM inventory_changes
  WHERE product_name = '你的商品名称'  -- 替换为实际商品名称
  GROUP BY product_name
)
SELECT
  i.product_name,
  i.current_stock as actual_stock,
  COALESCE(pc.total_change, 0) as calculated_change,
  i.current_stock - COALESCE(pc.total_change, 0) as initial_stock
FROM inventory i
LEFT JOIN product_changes pc ON i.product_name = pc.product_name
WHERE i.product_name = '你的商品名称';  -- 替换为实际商品名称
```

---

### 步骤 4：检查最近创建的交易记录

```sql
-- 查看最近的交易记录及其商品名称
SELECT
  id,
  type,
  customer_name,
  product_name,  -- 关键字段
  quantity,
  gift_quantity,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;
```

**查看要点**：
- `product_name` 字段是否有值？
- 是否有重复的交易记录（时间相近、内容相同）？

---

## 🎯 最可能的原因分析

根据你的描述（10000 → 预期 9000 → 实际 6000），最可能的情况是：

### 原因 A：创建了 3 次交易，每次扣减 1000
```
交易1：10000 - 1000 = 9000
交易2：9000 - 1000 = 8000  ← 意外的
交易3：8000 - 1000 = 7000  ← 意外的
...或者其他组合
```

### 原因 B：一次交易触发了多次库存更新
```javascript
// 可能的代码问题：
handleSubmit() {
  await transactionService.createTransaction(values);  // 这里会触发库存更新
  await inventoryService.handleTransactionStock(...);   // 如果这里又被调用了，就重复了
}
```

### 原因 C：数量计算错误
```javascript
// 例如：销售 100 件 + 赠送 200 件
// 预期扣减：100 + 200 = 300
// 如果代码写错了，可能扣减了：100 + 200 + 100 = 400
```

---

## 📋 验证清单

请按以下步骤验证：

- [ ] **步骤 1**：在 Supabase 中运行 SQL 诊断脚本，检查 `inventory_changes` 表
- [ ] **步骤 2**：查看浏览器控制台日志，查找 "库存更新: ..." 的输出
- [ ] **步骤 3**：确认是否有多条库存变动记录对应同一个交易 ID
- [ ] **步骤 4**：检查 `transactions` 表的 `product_name` 字段是否为空
- [ ] **步骤 5**：尝试创建一笔新交易，观察控制台输出和库存变化

---

## 💡 临时解决方案

在找到根本原因之前，可以：

1. **手动修正库存**：
   ```sql
   UPDATE inventory
   SET current_stock = 9000
   WHERE product_name = '你的商品名称';
   ```

2. **查看并清理重复的变动记录**：
   ```sql
   -- 查看是否有重复记录
   SELECT * FROM inventory_changes
   WHERE transaction_id = (你的交易ID);

   -- 如果确认是重复的，可以删除
   DELETE FROM inventory_changes
   WHERE id IN (重复记录的ID);
   ```

---

## 🚀 下一步行动

1. **立即执行**：运行上述 SQL 诊断脚本，找出具体原因
2. **报告结果**：将 SQL 查询结果告诉我，我可以帮你进一步分析
3. **如需修复代码**：找到问题后，我会提供针对性的修复方案

---

## ⚠️ 补充说明

由于 `TransactionForm.js` 中**没有商品名称字段**，当前系统实际上**无法正常更新库存**（会跳过更新）。

这意味着：
- 如果库存确实减少了 4000，**一定不是通过正常的交易创建流程**
- 可能是直接在数据库中操作的
- 或者之前有其他代码路径调用了库存更新

**建议**：先运行诊断 SQL，查看 `inventory_changes` 表的实际记录！
