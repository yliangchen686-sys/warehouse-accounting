# 🔴 库存差异诊断报告

## 问题描述
- **实际库存**：9156 件
- **软件显示**：5988 件
- **差异**：-3168 件（少统计了 3168）

---

## 🔍 可能的原因分析

### 原因 1：日期范围过滤导致部分交易未统计（最可能）

虽然我们修改了代码默认显示全部交易，但可能：
1. 浏览器缓存未刷新，仍在使用旧的日期范围
2. 用户手动选择了日期范围，导致部分交易被过滤
3. 代码修改未生效

**验证方法**：
- 检查 Dashboard 右上角的日期选择器是否为空
- 如果显示有日期，说明正在使用日期过滤

---

### 原因 2：数据库和本地存储数据不一致

系统使用了混合存储策略：
- 部分交易在 **Supabase 数据库**
- 部分交易在 **localStorage**（离线时保存）

**可能的情况**：
```javascript
// transactionService.js 中的逻辑
const allTransactions = [...transactions, ...localTransactions];
```

如果：
- Supabase 有 100 笔交易
- localStorage 也有这 100 笔（未同步删除）
- 结果：重复计算，导致库存错误

或者相反：
- 部分交易只在 localStorage，未同步到数据库
- 前端统计时漏掉了这部分数据

---

### 原因 3：某些交易的数量字段为 NULL 或异常

如果数据库中某些交易记录的 `quantity` 或 `gift_quantity` 字段：
- 为 NULL
- 为空字符串
- 为非法值

则计算时会被 `parseFloat() || 0` 转换为 0，导致漏统计。

---

### 原因 4：交易类型判断错误

如果某些交易的 `type` 字段：
- 拼写错误（如 "Purchase" 而不是 "purchase"）
- 为 NULL 或其他非预期值
- 不在 switch 的 case 中

则这些交易不会被计入库存统计。

---

## 🔧 诊断步骤

### 步骤 1：检查前端日期范围
1. 打开 Dashboard
2. 查看右上角日期选择器
3. **如果有日期** → 点击清空按钮 ❌，让它变为空
4. 观察库存是否变为 9156

---

### 步骤 2：在 Supabase 中计算真实库存

在 Supabase SQL 编辑器中运行：

```sql
-- 计算所有交易的库存（应该等于 9156）
SELECT
  SUM(CASE
    WHEN type = 'purchase' THEN quantity
    WHEN type = 'return' THEN quantity
    WHEN type = 'sale' THEN -(quantity + COALESCE(gift_quantity, 0))
    WHEN type = 'gift' THEN -(quantity + COALESCE(gift_quantity, 0))
    ELSE 0
  END) as calculated_stock,
  COUNT(*) as total_transactions
FROM transactions;
```

**预期结果**：
- `calculated_stock` = 9156
- 如果不等于 9156，说明数据库中的数据本身就不对

---

### 步骤 3：检查是否有日期范围过滤

```sql
-- 查看最早和最晚的交易时间
SELECT
  MIN(created_at) as earliest,
  MAX(created_at) as latest,
  COUNT(*) as total
FROM transactions;

-- 如果前端使用了日期过滤，计算被过滤后的库存
-- 假设前端过滤了某个时间段，模拟计算
SELECT
  SUM(CASE
    WHEN type IN ('purchase', 'return') THEN quantity
    WHEN type IN ('sale', 'gift') THEN -(quantity + COALESCE(gift_quantity, 0))
  END) as stock_in_range
FROM transactions
WHERE created_at >= '2024-01-01'  -- 替换为实际的日期范围
  AND created_at <= NOW();
```

---

### 步骤 4：检查数据完整性

```sql
-- 检查是否有 quantity 为 NULL 的记录
SELECT COUNT(*) as null_quantity_count
FROM transactions
WHERE quantity IS NULL;

-- 检查是否有异常的 type 值
SELECT type, COUNT(*) as count
FROM transactions
GROUP BY type
ORDER BY type;

-- 预期结果：
-- purchase, sale, return, gift
-- 如果有其他值（如大写、拼写错误），说明这些交易未被统计
```

---

### 步骤 5：按交易类型分组统计

```sql
-- 详细统计各类型交易对库存的影响
SELECT
  type,
  COUNT(*) as transaction_count,
  SUM(quantity) as total_quantity,
  SUM(COALESCE(gift_quantity, 0)) as total_gift,
  SUM(CASE
    WHEN type IN ('purchase', 'return') THEN quantity
    WHEN type IN ('sale', 'gift') THEN -(quantity + COALESCE(gift_quantity, 0))
  END) as stock_impact
FROM transactions
GROUP BY type;
```

**示例结果**：
| type | transaction_count | total_quantity | total_gift | stock_impact |
|------|------------------|---------------|------------|--------------|
| purchase | 10 | 12000 | 0 | +12000 |
| sale | 50 | 2500 | 344 | -2844 |
| return | 0 | 0 | 0 | 0 |
| gift | 0 | 0 | 0 | 0 |

库存 = 12000 - 2844 = 9156 ✅

---

### 步骤 6：检查本地存储

在浏览器控制台（F12）中运行：

```javascript
// 查看本地存储的交易数据
const localTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
console.log('本地交易数量:', localTransactions.length);
console.log('本地交易详情:', localTransactions);

// 计算本地交易对库存的影响
let localStock = 0;
localTransactions.forEach(t => {
  const qty = parseFloat(t.quantity) || 0;
  const gift = parseFloat(t.gift_quantity) || 0;
  if (t.type === 'purchase' || t.type === 'return') {
    localStock += qty;
  } else if (t.type === 'sale' || t.type === 'gift') {
    localStock -= (qty + gift);
  }
});
console.log('本地交易库存影响:', localStock);
```

---

## 🎯 最可能的原因定位

### 情况 A：日期范围过滤（80% 可能性）

**症状**：
- Dashboard 右上角显示有日期范围
- 清空日期后，库存变为 9156

**解决方法**：
1. 点击日期选择器的清空按钮 ❌
2. 或者强制刷新浏览器（Ctrl + Shift + R）

---

### 情况 B：有 3168 件的交易未被统计（15% 可能性）

**可能原因**：
- 某笔进货 3168 件的交易
- 或多笔交易总计 3168 件
- 这些交易可能：
  - 在日期范围之外
  - type 字段有误
  - 在 localStorage 中未合并

**验证方法**：
```sql
-- 查找数量接近 3168 的交易
SELECT * FROM transactions
WHERE quantity BETWEEN 3000 AND 3200
   OR (quantity + gift_quantity) BETWEEN 3000 AND 3200;

-- 或者查找多笔交易的组合
SELECT
  created_at::date,
  COUNT(*) as count,
  SUM(CASE
    WHEN type IN ('purchase', 'return') THEN quantity
    WHEN type IN ('sale', 'gift') THEN -(quantity + COALESCE(gift_quantity, 0))
  END) as daily_stock_change
FROM transactions
GROUP BY created_at::date
ORDER BY created_at::date;
```

---

### 情况 C：计算逻辑错误（5% 可能性）

检查前端计算逻辑是否正确：
```javascript
// 在 transactionService.js 中
switch (type) {
  case 'purchase':
    stats.currentStock += quantity;  // ✅ 正确
    break;
  case 'return':
    stats.currentStock += quantity;  // ✅ 正确
    break;
  case 'sale':
    stats.currentStock -= (quantity + giftQuantity);  // ✅ 正确
    break;
  case 'gift':
    stats.currentStock -= (quantity + giftQuantity);  // ✅ 正确
    break;
}
```

逻辑看起来是正确的，但可能有边界情况：
- `quantity` 或 `giftQuantity` 为 `undefined`、`null`、`NaN`
- `type` 不匹配任何 case（大小写敏感）

---

## 📋 立即执行的诊断命令

请按顺序执行：

### 1. 检查前端日期范围
打开 Dashboard，查看右上角日期选择器是否为空。

### 2. 在 Supabase 运行总库存查询
```sql
SELECT
  SUM(CASE
    WHEN type IN ('purchase', 'return') THEN quantity
    WHEN type IN ('sale', 'gift') THEN -(quantity + COALESCE(gift_quantity, 0))
  END) as total_stock
FROM transactions;
```

**告诉我结果是多少** → 如果是 5988，说明数据库数据本身不全；如果是 9156，说明是前端统计问题。

### 3. 检查交易类型分布
```sql
SELECT type, COUNT(*) FROM transactions GROUP BY type;
```

### 4. 查找差异的 3168
```sql
-- 查找可能的 3168 来源
SELECT * FROM transactions
WHERE ABS(quantity - 3168) < 100
   OR ABS(quantity + COALESCE(gift_quantity, 0) - 3168) < 100;
```

---

## 💡 快速修复建议

1. **立即尝试**：清空 Dashboard 的日期范围，看库存是否变为 9156
2. **运行 SQL**：在 Supabase 中验证数据库计算的总库存
3. **清除缓存**：在浏览器控制台运行 `localStorage.clear()` 清除本地数据
4. **强制刷新**：Ctrl + Shift + R 刷新浏览器

---

**请先告诉我：Dashboard 右上角的日期选择器是显示日期，还是为空？** 📅
