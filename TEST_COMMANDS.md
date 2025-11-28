# Supabase 连接测试命令

请按顺序在浏览器控制台（F12 → Console）执行以下命令：

## 第1步：检查 localStorage
```javascript
console.log('LocalStorage 交易记录:', localStorage.getItem('localTransactions'));
```

## 第2步：测试 Supabase 读取
```javascript
// 导入 supabase 客户端
const { supabase } = await import('./config/supabase.js');

// 测试读取 employees 表
const testRead = await supabase.from('employees').select('*').limit(5);
console.log('读取 employees 表结果:', testRead);
```

## 第3步：测试 Supabase 插入
```javascript
// 测试插入一条交易记录
const testInsert = await supabase.from('transactions').insert([{
  type: 'sale',
  customer_name: '测试客户',
  product_name: '测试产品',
  collector: '管理员',
  quantity: 1,
  gift_quantity: 0,
  unit_price: 100,
  total_amount: 100
}]).select();
console.log('插入测试结果:', testInsert);
```

## 第4步：查看是否插入成功
```javascript
// 查看最新的交易记录
const checkInsert = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(1);
console.log('最新交易记录:', checkInsert);
```

## 第5步：测试删除
```javascript
// 获取刚才插入的记录ID（从第4步结果中获取）
const recordId = checkInsert.data[0].id;

// 删除测试记录
const testDelete = await supabase.from('transactions').delete().eq('id', recordId);
console.log('删除测试结果:', testDelete);
```

---

## 如果测试失败，请提供：
1. 每一步的完整错误信息
2. 截图
3. 哪一步出现问题

## 如果测试成功：
说明 Supabase 连接正常，问题在代码逻辑。
