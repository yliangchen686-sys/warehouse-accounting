# 📊 库存数据的计算来源分析

## ✅ 答案：库存是从交易记录实时计算出来的

---

## 🔍 完整的数据流程

### 1️⃣ **用户看到的库存显示位置**

在商人端 Dashboard（[Dashboard.js:142-150](src/components/merchant/Dashboard.js#L142-L150)）：

```javascript
<Statistic
  title="库存"
  value={stats?.currentStock || 0}  // ← 这里显示库存
  prefix={<ShoppingCartOutlined />}
  valueStyle={{
    color: (stats?.currentStock || 0) < 0 ? '#f5222d' :
           (stats?.currentStock || 0) < 10 ? '#faad14' : '#52c41a'
  }}
  suffix="件"
/>
```

---

### 2️⃣ **库存数据的来源**

`stats` 对象来自 `transactionService.getTransactionStats()` 方法（[Dashboard.js:35-39](src/components/merchant/Dashboard.js#L35-L39)）：

```javascript
const statsData = await transactionService.getTransactionStats({
  startDate: dateRange[0]?.toISOString(),
  endDate: dateRange[1]?.toISOString()
});
```

---

### 3️⃣ **库存的计算逻辑**

在 [transactionService.js:305-319](src/services/transactionService.js#L305-L319)：

```javascript
// 计算库存：进货+回收-销售-赠送
allTransactions.forEach(transaction => {
  const quantity = parseFloat(transaction.quantity) || 0;
  const giftQuantity = parseFloat(transaction.gift_quantity) || 0;

  switch (type) {
    case 'purchase': // 进货：增加库存
      stats.currentStock += quantity;
      break;
    case 'return':   // 回收：增加库存
      stats.currentStock += quantity;
      break;
    case 'sale':     // 销售：减少库存（数量+赠送数量）
      stats.currentStock -= (quantity + giftQuantity);
      break;
    case 'gift':     // 赠送：减少库存（数量+赠送数量）
      stats.currentStock -= (quantity + giftQuantity);
      break;
  }
});
```

---

## 📐 库存计算公式

```
当前库存 =
  所有进货数量之和
  + 所有回收数量之和
  - 所有销售数量之和
  - 所有销售赠送数量之和
  - 所有赠送数量之和
  - 所有赠送赠送数量之和
```

**简化公式**：
```
库存 = Σ(进货) + Σ(回收) - Σ(销售+销售赠送) - Σ(赠送+赠送赠送)
```

---

## 🎯 为什么显示 6000？

根据计算逻辑，库存 6000 是通过以下方式得出的：

### 可能的交易组合示例 1：
```
进货 10000 件
销售 3000 件 + 赠送 500 件
销售 500 件 + 赠送 0 件
-----------------------------------
库存 = 10000 - (3000+500) - (500+0) = 6000
```

### 可能的交易组合示例 2：
```
进货 8000 件
回收 2000 件
销售 4000 件
-----------------------------------
库存 = 8000 + 2000 - 4000 = 6000
```

---

## 🔍 如何验证实际的交易记录

在 Supabase SQL 编辑器中运行：

```sql
-- 查看所有交易记录及其对库存的影响
SELECT
  type,
  customer_name,
  quantity,
  gift_quantity,
  CASE
    WHEN type = 'purchase' THEN quantity
    WHEN type = 'return' THEN quantity
    WHEN type = 'sale' THEN -(quantity + gift_quantity)
    WHEN type = 'gift' THEN -(quantity + gift_quantity)
  END as stock_change,
  created_at
FROM transactions
ORDER BY created_at ASC;

-- 计算总库存（验证是否等于 6000）
SELECT
  SUM(CASE
    WHEN type = 'purchase' THEN quantity
    WHEN type = 'return' THEN quantity
    WHEN type = 'sale' THEN -(quantity + gift_quantity)
    WHEN type = 'gift' THEN -(quantity + gift_quantity)
    ELSE 0
  END) as calculated_stock
FROM transactions;
```

---

## 📊 按交易类型分组统计

```sql
-- 查看各类型交易的汇总
SELECT
  type,
  COUNT(*) as count,
  SUM(quantity) as total_quantity,
  SUM(gift_quantity) as total_gift,
  SUM(quantity + gift_quantity) as total_impact
FROM transactions
GROUP BY type;
```

**结果示例**：
| type | count | total_quantity | total_gift | total_impact |
|------|-------|---------------|------------|--------------|
| purchase | 2 | 10000 | 0 | 10000 |
| sale | 5 | 3500 | 500 | 4000 |
| return | 1 | 0 | 0 | 0 |
| gift | 0 | 0 | 0 | 0 |

**计算库存**：
```
库存 = 10000 (进货) + 0 (回收) - 4000 (销售+赠送) - 0 (赠送) = 6000 ✅
```

---

## 🎯 关键发现

### ✅ 库存不是存储在数据库中的
- **没有**独立的 `inventory` 表存储库存数据
- **没有**调用 `update_inventory_stock()` 函数更新库存
- **完全**通过交易记录实时计算

### ✅ 为什么显示 6000 而不是 9000？
1. **不是系统错误**，而是真实的交易数据计算结果
2. **可能原因**：
   - 实际创建了多笔交易（不止 1 笔）
   - 销售/赠送的数量比你记忆的多
   - 进货的数量比你记忆的少

### ✅ 如何找出"丢失"的 3000？
运行上述 SQL 查询，逐条检查交易记录：
- 查看每笔交易的 `quantity` 和 `gift_quantity`
- 确认每笔交易对库存的影响
- 找出哪些交易导致了额外的扣减

---

## 📋 时间范围的影响

**重要**：Dashboard 上的库存统计受日期范围影响！

在 [Dashboard.js:23-26](src/components/merchant/Dashboard.js#L23-L26)：
```javascript
const [dateRange, setDateRange] = useState([
  dayjs().subtract(30, 'day'),  // ← 默认最近 30 天
  dayjs()
]);
```

**这意味着**：
- 显示的库存是**最近 30 天**的交易统计
- 如果 30 天前有进货 10000 件，**不会计入当前统计**
- 如果最近 30 天只有销售，库存可能是负数

---

## 🔧 验证步骤

### 步骤 1：检查日期范围
在 Dashboard 右上角查看当前选择的日期范围。

### 步骤 2：查看完整历史
将日期范围改为"全部时间"，看库存是否变化。

### 步骤 3：运行 SQL 查询
在 Supabase 中运行上述 SQL，查看实际的交易记录。

### 步骤 4：对比计算
```sql
-- 查看最近 30 天的交易统计
SELECT
  SUM(CASE
    WHEN type IN ('purchase', 'return') THEN quantity
    WHEN type IN ('sale', 'gift') THEN -(quantity + gift_quantity)
  END) as stock_last_30_days
FROM transactions
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 查看所有时间的交易统计
SELECT
  SUM(CASE
    WHEN type IN ('purchase', 'return') THEN quantity
    WHEN type IN ('sale', 'gift') THEN -(quantity + gift_quantity)
  END) as stock_all_time
FROM transactions;
```

---

## 💡 总结

### 库存 6000 的真相：
1. ✅ **不是 Bug**，是真实交易数据的计算结果
2. ✅ **不是数据库错误**，是前端从交易记录统计出来的
3. ✅ **不是库存表数据**，因为根本没有 `inventory` 表

### 如何找到"丢失"的 3000：
1. 🔍 在 Dashboard 右上角调整日期范围为"全部时间"
2. 🔍 在 Supabase 中运行 SQL 查询，查看所有交易记录
3. 🔍 检查是否有意外创建的重复交易
4. 🔍 确认每笔销售/赠送的数量是否正确

### 根本区别：
| 特性 | 当前系统（实时计算） | 独立库存表 |
|------|-------------------|----------|
| 数据存储 | ❌ 无独立存储 | ✅ inventory 表 |
| 计算方式 | ✅ 从交易记录统计 | ✅ 直接读取 |
| 数据准确性 | ⚠️ 受日期范围影响 | ✅ 始终准确 |
| 历史追溯 | ✅ 完整历史 | ⚠️ 需要 changes 表 |

---

**建议：运行 SQL 查询，查看实际的交易记录，找出导致库存为 6000 的具体交易！** 🔍
