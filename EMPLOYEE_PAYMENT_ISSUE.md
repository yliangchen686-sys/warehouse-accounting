# 员工收款"待转账余额"显示不正确问题诊断

## 🔴 问题描述

- **正确待转账余额**：约 80981
- **显示的待转账余额**：66277
- **差异**：约 14704

但是：
- **净利润显示正确**（接近 80981）

---

## 🔍 问题根源分析

### 位置：EmployeePaymentManagement.js 第 141-152 行

```javascript
const totalStats = employeesSummary.reduce((acc, emp) => {
  // 对于管理员，使用提现金额而不是转账金额
  const transferredAmount = (emp.employeeName === '管理员' || emp.employeeName === '商人' || emp.employeeName === '系统管理员')
    ? (emp.totalWithdrawn || 0)  // ❌ 商人只计算了提现金额
    : emp.totalTransferred;       // ✅ 员工正确计算转账金额

  return {
    totalCollected: acc.totalCollected + emp.totalAmount,
    totalTransferred: acc.totalTransferred + transferredAmount,  // ❌ 少计算了商人的转账金额
    totalBalance: acc.totalBalance + emp.currentBalance
  };
}, { totalCollected: 0, totalTransferred: 0, totalBalance: 0 });
```

---

## 🎯 问题详解

### 商人的资金流向：

```
商人收款 = 销售收款 - 回收金额

商人有两种支出：
1. 转账给员工（totalTransferred）← 14704 左右
2. 自己提现（totalWithdrawn）

当前余额 = 商人收款 - 转账给员工 - 自己提现
```

### 当前的错误计算：

```javascript
// "已转账/提现" 统计
transferredAmount = emp.totalWithdrawn  // ❌ 只计算了提现金额，漏掉了转账给员工的金额

// 导致结果
待转账余额 = 总收款 - 已转账/提现
           = 总收款 - totalWithdrawn  // ❌ 没有减去转账给员工的部分
           = 实际余额 + 14704        // 多算了 14704
```

### 正确的计算：

```javascript
// 商人的 "已转账/提现" 应该包括：
transferredAmount = emp.totalTransferred + emp.totalWithdrawn
                  = 转账给员工 + 自己提现
                  = 14704 + (已提现金额)
```

---

## 📊 数据验证

### 假设的数据结构：

| 角色 | 净收款 | 转账给员工 | 提现 | 当前余额 |
|------|--------|-----------|------|---------|
| 商人 | 100000 | 14704 | 5000 | 80296 |
| 员工A | 20000 | 10000 | 0 | 10000 |
| 员工B | 15000 | 8000 | 0 | 7000 |
| 管理员 | 50000 | 0 | 10000 | 40000 |

### 当前错误计算：

```
已转账/提现 = 5000 (商人提现) + 10000 (员工A转账) + 8000 (员工B转账) + 10000 (管理员提现)
           = 33000  ❌ 少了商人的 14704

待转账余额 = 100000 + 20000 + 15000 + 50000 - 33000
           = 152000  ❌ 错误

实际应该显示 = 185000 - 33000 - 14704 = 137296
```

### 正确计算：

```
已转账/提现 = 14704 (商人转账给员工) + 5000 (商人提现) + 10000 (员工A转账) + 8000 (员工B转账) + 10000 (管理员提现)
           = 47704  ✅ 完整

待转账余额 = 185000 - 47704
           = 137296  ✅ 正确
```

---

## ✅ 解决方案

修改 EmployeePaymentManagement.js 第 143-145 行：

```javascript
// 修改前 ❌
const transferredAmount = (emp.employeeName === '管理员' || emp.employeeName === '商人' || emp.employeeName === '系统管理员')
  ? (emp.totalWithdrawn || 0)  // 只计算提现
  : emp.totalTransferred;

// 修改后 ✅
const transferredAmount = (emp.employeeName === '管理员' || emp.employeeName === '系统管理员')
  ? (emp.totalWithdrawn || 0)  // 管理员只计算提现
  : (emp.employeeName === '商人' || emp.role === 'merchant')
    ? ((emp.totalTransferred || 0) + (emp.totalWithdrawn || 0))  // 商人：转账 + 提现
    : emp.totalTransferred;  // 员工：只计算转账
```

---

## 🧪 验证方法

修改后，在 Supabase 中运行以下查询验证：

```sql
-- 1. 查看所有员工的转账记录
SELECT
  employee_name,
  SUM(amount) as total_transferred
FROM employee_transfers
GROUP BY employee_name;

-- 2. 查看所有提现记录
SELECT
  merchant_name,
  SUM(amount) as total_withdrawn
FROM merchant_withdrawals
GROUP BY merchant_name;

-- 3. 计算总的"已转账/提现"金额
SELECT
  (SELECT COALESCE(SUM(amount), 0) FROM employee_transfers) +
  (SELECT COALESCE(SUM(amount), 0) FROM merchant_withdrawals)
  AS total_transferred_and_withdrawn;
```

然后对比前端显示的"已转账/提现"金额是否一致。

---

## 📋 修改文件

需要修改的文件：
- `src/components/merchant/EmployeePaymentManagement.js` (第 141-152 行)

---

## 🎯 预期结果

修改后：
- ✅ "待转账余额" 显示 ~80981（正确）
- ✅ "已转账/提现" 包含商人的转账金额
- ✅ 净利润显示保持不变（本来就是正确的）
