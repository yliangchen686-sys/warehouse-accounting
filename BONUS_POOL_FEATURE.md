# 奖金池功能说明

## 功能概述

奖金池功能已成功添加到系统中，员工端和商人端都可以查看奖金池金额，商人端还可以执行扣款操作。

## 计算逻辑

### 奖金池计算公式

```
当月净利润 = 当月销售金额 - 当月回收金额 - 当月工资总额 - 30000（固定成本）
奖金池 = 当月净利润 × 1%
当前余额 = 奖金池 - 已扣款总额
```

## 功能特性

### 1. 数据展示
- **本月销售额**：显示当月所有销售类型的交易金额总和
- **回收金额**：显示当月所有回收类型的交易金额总和
- **工资总额**：显示当月所有员工的工资总和
- **固定成本**：固定为 30,000 元
- **净利润**：根据公式自动计算
- **奖金池金额**：净利润 × 1%
- **当前余额**：奖金池金额 - 已扣款总额

### 2. 扣款功能（仅商人端）
- 商人端用户可以点击"扣款"按钮
- 可以自定义扣款金额（输入数字）
- 扣款后自动记录到 `bonus_deduction_log` 表
- 扣款记录包含：
  - 扣除金额
  - 操作人ID
  - 操作人姓名
  - 操作时间
  - 剩余奖金余额
  - 年份和月份

### 3. 扣款记录
- 显示所有扣款记录
- 按时间倒序排列
- 显示扣款金额、操作人、扣款后余额等信息

## 数据库表结构

### bonus_deduction_log 表

```sql
CREATE TABLE bonus_deduction_log (
    id SERIAL PRIMARY KEY,
    deduction_amount DECIMAL(12,2) NOT NULL,
    operator_id VARCHAR(100) NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    remaining_balance DECIMAL(12,2) NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 安装步骤

1. **执行数据库脚本**
   - 在 Supabase SQL 编辑器中运行 `bonus-pool-database.sql` 脚本
   - 这将创建 `bonus_deduction_log` 表和相关的索引、RLS 策略

2. **功能已集成**
   - 奖金池功能已添加到商人端和员工端的侧边栏
   - 点击"奖金池"菜单项即可查看

## 使用说明

### 查看奖金池（员工端 & 商人端）
1. 登录系统
2. 在侧边栏点击"奖金池"菜单项
3. 查看当前月份的奖金池数据

### 执行扣款（仅商人端）
1. 在奖金池页面，点击"扣款"按钮
2. 输入扣款金额
3. 确认扣款
4. 系统会自动更新奖金池余额并记录扣款日志

## 注意事项

1. **实时计算**：奖金池金额会根据当月数据实时计算
2. **余额检查**：扣款时会自动检查余额是否足够
3. **数据同步**：支持数据库和本地存储的双重备份
4. **权限控制**：只有商人端用户可以执行扣款操作

## 文件清单

- `src/services/bonusPoolService.js` - 奖金池服务
- `src/components/merchant/BonusPool.js` - 奖金池组件
- `bonus-pool-database.sql` - 数据库表创建脚本
- `src/components/merchant/MerchantApp.js` - 商人端主应用（已更新）
- `src/components/employee/EmployeeApp.js` - 员工端主应用（已更新）

