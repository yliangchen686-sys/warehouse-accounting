# 清除 localStorage 中的旧交易记录

## 问题说明

之前在 v1.0.1 版本时（Supabase 无法同步），添加的交易记录只保存在 **localStorage** 中，不在数据库中。

现在修复后：
- ✅ 新记录可以正常同步到 Supabase
- ❌ 旧的 localStorage 记录无法删除

## 解决方案

### 方案 1：完全清除 localStorage（最简单）

**在浏览器控制台（F12 → Console）执行：**

```javascript
// 清除所有交易记录（包括 localStorage 中的旧记录）
localStorage.removeItem('localTransactions');

// 刷新页面
location.reload();
```

**注意**：这会删除所有只存在于本地的交易记录！

---

### 方案 2：查看并选择性删除

**步骤 1：查看 localStorage 中有哪些记录**

```javascript
// 查看 localStorage 中的交易记录
const localTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');
console.table(localTransactions);
console.log('LocalStorage 中有', localTransactions.length, '条记录');
```

**步骤 2：如果这些都是旧数据，不需要保留，执行删除**

```javascript
// 删除所有 localStorage 记录
localStorage.removeItem('localTransactions');
location.reload();
```

**步骤 3：如果需要保留某些记录，手动迁移到 Supabase**

```javascript
// 1. 获取 localStorage 记录
const localTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');

// 2. 导入 supabase
const { supabase } = await import('./config/supabase.js');

// 3. 逐条迁移到 Supabase
for (const transaction of localTransactions) {
  // 移除本地 ID（让数据库生成新 ID）
  const { id, ...transactionData } = transaction;

  const result = await supabase
    .from('transactions')
    .insert([transactionData])
    .select();

  console.log('迁移记录:', transactionData.customer_name, result);
}

// 4. 迁移完成后，清除 localStorage
localStorage.removeItem('localTransactions');
location.reload();
```

---

### 方案 3：在已安装的应用中清除

如果您在已安装的 v1.0.2 应用中：

1. **完全卸载应用**
2. **删除应用数据目录**（通常在）：
   - `%APPDATA%\仓储记账系统`
   - 或 `C:\Users\admin\AppData\Roaming\仓储记账系统`
3. **重新安装 v1.0.2**

---

## 推荐做法

如果旧的 localStorage 记录不重要，直接执行：

```javascript
localStorage.removeItem('localTransactions');
location.reload();
```

如果需要保留这些数据，使用方案 2 的步骤 3 迁移到 Supabase。

---

## 为什么会这样？

查看代码 [transactionService.js:155-240](src/services/transactionService.js#L155-L240)：

```javascript
async getTransactions(filters = {}) {
  // 从数据库获取
  const dbTransactions = await supabase.from('transactions').select('*');

  // 从 localStorage 获取
  const localTransactions = JSON.parse(localStorage.getItem('localTransactions') || '[]');

  // 合并两者
  transactions = [...dbTransactions, ...localTransactions];  // ← 问题在这里
}
```

**合并逻辑**：
- 显示的记录 = Supabase 记录 + localStorage 记录
- 删除时只删除 Supabase 中的记录
- localStorage 记录仍然存在，所以仍会显示

**长期解决方案**（需要修改代码）：
修改删除逻辑，同时删除 Supabase 和 localStorage 中的记录。

但既然现在 Supabase 已修复，最简单的做法是清空 localStorage。
