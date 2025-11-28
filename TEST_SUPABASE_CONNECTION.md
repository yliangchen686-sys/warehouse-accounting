# 测试 Supabase 连接

## 方法 1：使用浏览器直接测试

打开浏览器，在控制台执行以下代码：

```javascript
// 1. 引入 Supabase 客户端
const { createClient } = require('@supabase/supabase-js');

// 2. 创建客户端
const supabase = createClient(
  'https://ztyvmtawslpmjqffbmtp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0eXZtdGF3c2xwbWpxZmZibXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTg0NjAsImV4cCI6MjA3NDAzNDQ2MH0.XY-fszdxHZFmMohKhP7q_pEBj1L7TRceldZ3-mu3Dl4'
);

// 3. 测试插入数据
async function testInsert() {
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      type: 'sale',
      customer_name: '测试客户',
      collector: '测试员工',
      quantity: 1,
      gift_quantity: 0,
      unit_price: 10,
      total_amount: 10
    }])
    .select();

  if (error) {
    console.error('❌ 插入失败:', error);
  } else {
    console.log('✅ 插入成功:', data);
  }
}

testInsert();
```

**预期结果**：
- 如果显示 "✅ 插入成功" → Supabase 连接正常，问题在应用代码
- 如果显示 "❌ 插入失败" → 查看错误信息

---

## 方法 2：使用 curl 测试（命令行）

```bash
curl -X POST "https://ztyvmtawslpmjqffbmtp.supabase.co/rest/v1/transactions" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0eXZtdGF3c2xwbWpxZmZibXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTg0NjAsImV4cCI6MjA3NDAzNDQ2MH0.XY-fszdxHZFmMohKhP7q_pEBj1L7TRceldZ3-mu3Dl4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0eXZtdGF3c2xwbWpxZmZibXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTg0NjAsImV4cCI6MjA3NDAzNDQ2MH0.XY-fszdxHZFmMohKhP7q_pEBj1L7TRceldZ3-mu3Dl4" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "type": "sale",
    "customer_name": "测试客户",
    "collector": "测试员工",
    "quantity": 1,
    "gift_quantity": 0,
    "unit_price": 10,
    "total_amount": 10
  }'
```

**预期结果**：
- 如果返回 JSON 数据 → 连接正常
- 如果返回错误 → 查看错误信息

---

## 方法 3：检查本地存储

在应用中按 `F12`（如果可以），或者：

1. 找到应用的用户数据目录
2. Windows: `C:\Users\你的用户名\AppData\Roaming\仓储记账系统\`
3. 查看是否有 localStorage 数据库文件

---

## 我的判断

基于您的描述，我认为问题是：

**v1.0.1 打包时，`@supabase/supabase-js` 或其依赖没有被正确包含**

我之前修改了 package.json：
```json
"files": [
  "build/**/*",
  "public/electron.js",
  "node_modules/electron-updater/**/*"  // 只包含了 electron-updater
]
```

**问题**：这个配置**排除了其他所有 node_modules**，包括 `@supabase/supabase-js`！

所以打包后的应用无法连接 Supabase，所有数据都存在 localStorage。
