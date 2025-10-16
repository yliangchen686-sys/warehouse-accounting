# 🔴 库存异常问题的根本原因

## ❌ 核心问题

**数据库中没有执行 `update-database.sql` 脚本！**

错误信息：
```
ERROR: 42P01: relation "inventory_changes" does not exist
```

这意味着：
- ❌ `inventory` 表不存在
- ❌ `inventory_changes` 表不存在
- ❌ `update_inventory_stock()` 函数不存在
- ❌ `transactions` 表没有 `product_name` 字段

---

## 🎯 为什么库存会从 10000 变成 6000？

### **真相揭晓**：

由于数据库中**没有库存表和函数**，当你创建交易时：

```javascript
// transactionService.js 第 50-66 行
// 自动更新库存
if (data && data[0]) {
  try {
    await inventoryService.handleTransactionStock(...);
  } catch (inventoryError) {
    console.error('库存更新失败:', inventoryError);
    // 库存更新失败不影响交易记录创建 ← 错误被吞掉了！
  }
}
```

**流程**：
1. ✅ 交易记录创建成功
2. ❌ 调用 `inventoryService.handleTransactionStock()` 失败
3. ❌ 内部调用 `update_inventory_stock()` 函数时报错（函数不存在）
4. 🤐 错误被 `catch` 捕获，只打印到控制台
5. ✅ 用户看到"交易记录已创建"的成功提示

**所以库存根本没有被系统自动更新！**

---

## 🤔 那么库存 6000 是怎么来的？

既然系统无法自动更新库存，那么你看到的库存 6000 只可能来自：

### 可能性 1：手动在数据库中创建的测试数据
```sql
-- 如果你手动执行过类似的 SQL
INSERT INTO inventory (product_name, current_stock)
VALUES ('某商品', 6000);
```

### 可能性 2：在其他地方手动修改的
- 直接在 Supabase 控制台编辑了表数据
- 使用其他工具导入了数据

### 可能性 3：库存管理页面手动调整的
如果你在前端"库存管理"页面手动修改过库存。

### 可能性 4：实际上根本没有库存表
你看到的"库存 6000"可能是前端计算出来的：
- 从交易记录统计计算（`transactionService.getTransactionStats()`）
- 而不是从 `inventory` 表读取的

---

## 🔍 验证方法

请在 Supabase SQL 编辑器中依次运行：

### 1. 检查 inventory 表是否存在
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'inventory'
);
```
**预期结果**：`false`（表不存在）

---

### 2. 检查 transactions 表是否有 product_name 字段
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
```
**查看是否有 `product_name` 列**

---

### 3. 检查 update_inventory_stock 函数是否存在
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'update_inventory_stock';
```
**预期结果**：0 行（函数不存在）

---

### 4. 查看当前的交易统计（可能是库存的来源）
```sql
SELECT
  type,
  SUM(quantity) as total_quantity,
  SUM(gift_quantity) as total_gift,
  COUNT(*) as transaction_count
FROM transactions
GROUP BY type;
```

---

## ✅ 解决方案

### **必须执行的步骤**：在 Supabase SQL 编辑器中运行完整的 `update-database.sql` 脚本

文件位置：[update-database.sql](update-database.sql)

**脚本会创建**：
1. ✅ `inventory` 表（存储商品库存）
2. ✅ `inventory_changes` 表（记录库存变动历史）
3. ✅ `update_inventory_stock()` 函数（库存更新逻辑）
4. ✅ 给 `transactions` 表添加 `product_name` 字段
5. ✅ 设置 RLS 策略

---

## ⚠️ 执行脚本后的注意事项

### 1. 初始化库存数据
脚本会插入示例商品：
```sql
INSERT INTO inventory (product_name, current_stock, unit) VALUES
('商品A', 100, '件'),
('商品B', 50, '盒'),
('商品C', 200, '个');
```

**你需要**：
- 删除这些示例数据
- 根据实际情况初始化正确的库存

### 2. 历史交易不会自动更新库存
脚本执行前创建的交易记录**不会**影响库存，因为：
- 那时候还没有库存表
- 没有触发库存更新

**如果需要从历史交易重建库存**，需要手动计算或运行迁移脚本。

### 3. TransactionForm 仍然缺少商品名称字段
执行脚本后，数据库支持了 `product_name`，但前端表单仍然没有输入框。

**需要修改**：`src/components/merchant/TransactionForm.js`

---

## 📊 执行脚本的步骤

1. **打开 Supabase 控制台**
2. **进入 SQL 编辑器**
3. **复制 `update-database.sql` 的全部内容**
4. **粘贴并执行**
5. **检查执行结果**：
   ```sql
   -- 验证表已创建
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('inventory', 'inventory_changes');

   -- 验证函数已创建
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name = 'update_inventory_stock';
   ```

---

## 🎯 总结

### 问题的本质
- **不是**库存计算错误
- **不是**重复扣减
- **而是**数据库结构根本不存在！

### 你看到的库存 6000
- **不是**系统自动计算的
- **可能是**手动输入的测试数据
- **或者是**前端从交易记录统计得出的

### 解决步骤
1. ✅ 执行 `update-database.sql` 创建表和函数
2. ✅ 初始化正确的库存数据
3. ✅ （如需要）添加 `productName` 字段到前端表单
4. ✅ 测试创建交易，验证库存自动更新

---

**请先执行 SQL 脚本，然后告诉我结果！** 🚀
