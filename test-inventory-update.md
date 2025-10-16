# 库存自动更新功能测试指南

## 修改内容总结

### 1. inventoryService.js 改动
- ✅ 移除所有本地存储逻辑（localInventory, localInventoryChanges）
- ✅ `getAllInventory()` - 只从数据库获取，失败时抛出异常
- ✅ `updateStock()` - 只调用数据库函数 `update_inventory_stock`，失败时抛出异常
- ✅ `handleTransactionStock()` - 添加 transactionId 参数支持
- ✅ `getInventoryChanges()` - 只从数据库获取
- ✅ 删除 `updateLocalStock()` 和 `recordLocalStockChange()` 方法

### 2. transactionService.js 改动
- ✅ 导入 `inventoryService`
- ✅ `createTransaction()` - 添加 `product_name` 字段到数据库记录
- ✅ `createTransaction()` - 成功后自动调用 `inventoryService.handleTransactionStock()`
- ✅ `updateTransaction()` - 添加 `product_name` 字段支持

## 测试步骤

### 前置条件
1. 确保已在 Supabase 中执行 `update-database.sql`
2. 确认数据库有以下表和函数：
   - ✅ `inventory` 表（包含 product_name, current_stock 等字段）
   - ✅ `inventory_changes` 表（记录库存变动历史）
   - ✅ `transactions` 表已添加 `product_name` 字段
   - ✅ `update_inventory_stock()` 函数

### 测试用例 1：进货（增加库存）
```javascript
// 创建进货交易
{
  type: 'purchase',
  productName: '测试商品A',
  customerName: '供应商A',
  collector: '收款人',
  quantity: 100,
  giftQuantity: 0,
  unitPrice: 10,
  totalAmount: 1000
}

// 预期结果：
// - transactions 表新增一条记录
// - inventory 表 '测试商品A' 库存 +100
// - inventory_changes 表记录：increase, +100
```

### 测试用例 2：销售（减少库存）
```javascript
// 创建销售交易
{
  type: 'sale',
  productName: '测试商品A',
  customerName: '客户A',
  collector: '收款人',
  quantity: 20,
  giftQuantity: 5,
  unitPrice: 15,
  totalAmount: 300
}

// 预期结果：
// - transactions 表新增一条记录
// - inventory 表 '测试商品A' 库存 -(20+5) = -25
// - inventory_changes 表记录：decrease, -25
// - 总库存变化：100 - 25 = 75
```

### 测试用例 3：回收（增加库存）
```javascript
// 创建回收交易
{
  type: 'return',
  productName: '测试商品A',
  customerName: '客户B',
  collector: '收款人',
  quantity: 10,
  giftQuantity: 0,
  unitPrice: 5,
  totalAmount: 50
}

// 预期结果：
// - inventory 表 '测试商品A' 库存 +10
// - inventory_changes 表记录：increase, +10
// - 总库存变化：75 + 10 = 85
```

### 测试用例 4：赠送（减少库存）
```javascript
// 创建赠送交易
{
  type: 'gift',
  productName: '测试商品A',
  customerName: '客户C',
  collector: '收款人',
  quantity: 5,
  giftQuantity: 2,
  unitPrice: 0,
  totalAmount: 0
}

// 预期结果：
// - inventory 表 '测试商品A' 库存 -(5+2) = -7
// - inventory_changes 表记录：decrease, -7
// - 总库存变化：85 - 7 = 78
```

### 测试用例 5：新商品自动创建
```javascript
// 创建新商品的交易
{
  type: 'purchase',
  productName: '新商品B',  // 不存在的商品
  customerName: '供应商B',
  collector: '收款人',
  quantity: 50,
  giftQuantity: 0,
  unitPrice: 20,
  totalAmount: 1000
}

// 预期结果：
// - inventory 表自动创建 '新商品B' 记录，库存为 50
// - 数据库函数会自动执行 INSERT ON CONFLICT
```

## 验证方法

### 1. 在前端测试
- 打开商人端应用
- 进入"交易记录" -> "添加交易"
- 填写表单（确保填写商品名称）
- 提交后检查：
  - 交易记录是否创建成功
  - 打开"库存管理"页面查看库存是否自动更新
  - 查看"库存变动记录"是否有对应记录

### 2. 在 Supabase 控制台验证
```sql
-- 查看库存
SELECT * FROM inventory WHERE product_name = '测试商品A';

-- 查看库存变动记录
SELECT * FROM inventory_changes
ORDER BY created_at DESC
LIMIT 10;

-- 查看交易记录
SELECT id, type, product_name, quantity, gift_quantity, created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;
```

### 3. 浏览器控制台检查
打开浏览器控制台，查看日志输出：
```
库存更新: 测试商品A +100, 库存: 0 → 100
库存更新: 测试商品A -25, 库存: 100 → 75
```

## 错误处理验证

### 测试场景：库存更新失败
1. 故意在 Supabase 中删除 `update_inventory_stock` 函数
2. 创建交易记录
3. 验证：
   - ✅ 交易记录仍然创建成功
   - ✅ 控制台输出："库存更新失败: ..."
   - ✅ 不影响用户操作

### 测试场景：没有商品名称
1. 创建交易时不填写 productName
2. 验证：
   - ✅ 交易记录创建成功
   - ✅ 控制台输出："没有商品名称，跳过库存更新"
   - ✅ 库存不变

## 注意事项
- ⚠️ 本次修改**移除了所有本地存储逻辑**，系统完全依赖数据库
- ⚠️ 如果数据库连接失败，库存功能将不可用（但交易记录仍会保存到本地存储）
- ⚠️ 确保数据库已执行 `update-database.sql` 创建相关表和函数
- ✅ 库存更新失败不会影响交易记录创建
- ✅ 库存变动会自动记录到 `inventory_changes` 表并关联交易 ID

## 库存计算规则
| 交易类型 | 库存变化 | 数量计算 |
|---------|---------|---------|
| purchase (进货) | ➕ 增加 | +quantity |
| return (回收) | ➕ 增加 | +quantity |
| sale (销售) | ➖ 减少 | -(quantity + giftQuantity) |
| gift (赠送) | ➖ 减少 | -(quantity + giftQuantity) |

## 下一步
- 在实际环境中测试所有用例
- 验证库存数据的准确性
- 检查并发场景下的数据一致性
- 考虑添加库存不足时的前端警告
