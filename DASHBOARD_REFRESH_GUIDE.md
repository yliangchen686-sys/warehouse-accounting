# Dashboard 显示全部交易统计 - 刷新指南

## ✅ 代码已修改

[Dashboard.js](src/components/merchant/Dashboard.js) 已经修改为默认显示全部交易统计：

```javascript
// 修改前：
const [dateRange, setDateRange] = useState([
  dayjs().subtract(30, 'day'),  // 最近 30 天
  dayjs()
]);

// 修改后：
const [dateRange, setDateRange] = useState(null);  // 全部时间
```

---

## 🔄 如何使修改生效

### 方法 1：强制刷新浏览器（推荐）
1. 打开浏览器访问 http://localhost:3000
2. 登录到商人端
3. 进入 Dashboard 页面
4. **按 Ctrl + Shift + R**（或 Cmd + Shift + R）强制刷新
5. 或者按 **F12** 打开开发者工具，右键刷新按钮，选择"清空缓存并硬性重新加载"

### 方法 2：清除浏览器缓存
1. 按 **F12** 打开开发者工具
2. 在 Network 标签页，勾选 **Disable cache**
3. 刷新页面（F5）

### 方法 3：检查热重载是否工作
如果热重载正常工作，页面应该自动刷新。如果没有：
1. 检查终端是否显示 "Compiled successfully"
2. 检查浏览器控制台是否有错误
3. 尝试手动刷新（F5）

---

## 🔍 验证修改是否生效

### 检查 1：日期选择器
- **修改前**：显示具体日期（如 "2025-09-17 ~ 2025-10-17"）
- **修改后**：显示空白，带提示文字 "开始日期 ~ 结束日期"

### 检查 2：库存和净收入数值
如果之前 30 天外有交易记录，数值应该会变化：
- **库存**：应该增加（如果 30 天前有进货）
- **净收入**：应该增加（如果 30 天前有销售）

### 检查 3：打开浏览器控制台
按 **F12** 打开控制台，查看 Network 标签：
1. 刷新页面
2. 查找对 Supabase API 的请求
3. 检查请求参数中 `startDate` 和 `endDate` 是否为空

---

## 🐛 如果数据仍然没有变化

### 原因 1：数据库中只有最近 30 天的交易
**验证方法**：在 Supabase SQL 编辑器中运行：
```sql
-- 查看最早的交易记录时间
SELECT MIN(created_at) as earliest_transaction
FROM transactions;

-- 查看 30 天前是否有交易
SELECT COUNT(*) as transactions_before_30_days
FROM transactions
WHERE created_at < NOW() - INTERVAL '30 days';
```

**结果分析**：
- 如果 `transactions_before_30_days` 返回 0，说明确实只有最近 30 天的交易
- 这种情况下，数据不会有变化是正常的

### 原因 2：代码修改未生效
**验证方法**：
1. 打开浏览器开发者工具（F12）
2. 在 Console 中输入：
   ```javascript
   console.log('Check dateRange:', document.querySelector('.ant-picker-input input')?.placeholder);
   ```
3. 如果返回 "开始日期"，说明修改已生效
4. 如果返回空或其他值，说明代码未生效

### 原因 3：浏览器显示的是缓存数据
**解决方法**：
```javascript
// 在浏览器控制台运行，强制清除 React 状态
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

---

## 📊 对比测试

### 测试步骤：
1. **查看当前数据**（修改后，全部时间）
   - 记录：库存 = ?，净收入 = ?

2. **手动选择最近 30 天**
   - 在日期选择器中选择最近 30 天
   - 记录：库存 = ?，净收入 = ?

3. **对比差异**
   - 如果两次数据相同 → 说明 30 天前没有交易
   - 如果两次数据不同 → 说明修改已生效

---

## 🎯 SQL 诊断查询

如果数据仍然显示为 6000，运行这些查询找出原因：

### 查询 1：查看所有交易的库存影响
```sql
SELECT
  created_at::date as date,
  type,
  quantity,
  gift_quantity,
  CASE
    WHEN type IN ('purchase', 'return') THEN quantity
    WHEN type IN ('sale', 'gift') THEN -(quantity + gift_quantity)
  END as stock_change
FROM transactions
ORDER BY created_at ASC;
```

### 查询 2：计算总库存
```sql
SELECT
  SUM(CASE
    WHEN type IN ('purchase', 'return') THEN quantity
    WHEN type IN ('sale', 'gift') THEN -(quantity + gift_quantity)
  END) as total_stock
FROM transactions;
```

### 查询 3：按时间段对比
```sql
-- 30 天前的库存
SELECT
  SUM(CASE
    WHEN type IN ('purchase', 'return') THEN quantity
    WHEN type IN ('sale', 'gift') THEN -(quantity + gift_quantity)
  END) as stock_before_30_days
FROM transactions
WHERE created_at < NOW() - INTERVAL '30 days';

-- 最近 30 天的库存变化
SELECT
  SUM(CASE
    WHEN type IN ('purchase', 'return') THEN quantity
    WHEN type IN ('sale', 'gift') THEN -(quantity + gift_quantity)
  END) as stock_last_30_days
FROM transactions
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 总库存 = 30天前 + 最近30天
```

---

## 💡 总结

### 如果库存还是 6000
说明：
1. ✅ 这是真实的**全部交易**计算出的库存
2. ✅ 修改已经生效（显示全部时间）
3. ✅ 之前 30 天外可能没有交易，或者交易对库存的影响正好是 0

### 如果库存变化了
说明：
1. ✅ 修改成功生效
2. ✅ 之前确实只显示了最近 30 天的数据
3. ✅ 现在显示的是正确的总库存

---

**建议：按 Ctrl + Shift + R 强制刷新浏览器，然后查看日期选择器是否为空！**
