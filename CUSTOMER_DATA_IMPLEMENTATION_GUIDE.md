# 客户数据功能实施指南

## 功能总览

在商人端和员工端的侧边栏添加"客户数据"功能：
- **商人端**：上传客户手机号码（文本粘贴，自动去重）
- **员工端**：获取客户手机号码（弹窗显示，复制和再发一条）

## 侧边栏菜单配置

### 商人端（MerchantApp.js）

**菜单项位置**：在"客户绑定"之后添加

```javascript
import { PhoneOutlined } from '@ant-design/icons';

// 在菜单中添加
<Menu.Item key="customerData" icon={<PhoneOutlined />}>
  客户数据
</Menu.Item>

// 在 renderContent 中添加
case 'customerData':
  return <CustomerDataManagement user={user} />;
```

### 员工端（EmployeeApp.js）

**菜单项位置**：在"本月任务"之后添加

```javascript
import { PhoneOutlined } from '@ant-design/icons';

// 在菜单中添加
<Menu.Item key="customerData" icon={<PhoneOutlined />}>
  客户数据
</Menu.Item>

// 在 renderContent 中添加
case 'customerData':
  return <CustomerData user={user} />;
```

## 商人端：客户数据管理组件

### 组件文件：CustomerDataManagement.js

**主要功能**：
1. 文本粘贴上传
2. 自动去重
3. 批量插入
4. 统计显示

**核心代码结构**：

```javascript
// 状态
const [textContent, setTextContent] = useState('');
const [uploading, setUploading] = useState(false);
const [stats, setStats] = useState({ pending: 0, assigned: 0, total: 0 });

// 上传处理
const handleUpload = async () => {
  // 1. 解析文本
  const lines = textContent.split('\n');
  const phones = lines.map(l => l.trim()).filter(l => l.length > 0);
  const uniquePhones = [...new Set(phones)];
  
  // 2. 批量上传
  setUploading(true);
  const result = await customerDataService.uploadPhoneNumbers(
    uniquePhones, 
    user.name
  );
  setUploading(false);
  
  // 3. 显示结果
  message.success(`上传成功：${result.success} 条`);
  
  // 4. 更新统计
  await loadStats();
};
```

**界面元素**：
- `TextArea`：文本输入框
- `Button`：上传按钮、清空按钮
- `Card`：统计信息卡片
- `Statistic`：统计数据展示

## 员工端：客户数据获取组件

### 组件文件：CustomerData.js

**主要功能**：
1. 获取数据按钮
2. 弹窗显示手机号码
3. 复制功能
4. 再发一条功能

**核心代码结构**：

```javascript
// 状态
const [loading, setLoading] = useState(false);
const [modalVisible, setModalVisible] = useState(false);
const [customerData, setCustomerData] = useState(null);
const [stats, setStats] = useState({ pending: 0 });

// 获取数据
const handleGetData = async () => {
  setLoading(true);
  try {
    const data = await customerDataService.getCustomerData(user.name);
    if (data) {
      setCustomerData(data);
      setModalVisible(true);
      await loadStats(); // 更新统计
    } else {
      message.warning('暂无可用客户数据');
    }
  } catch (error) {
    message.error('获取失败：' + error.message);
  } finally {
    setLoading(false);
  }
};

// 复制功能
const handleCopy = async () => {
  await navigator.clipboard.writeText(customerData.customer_phone);
  message.success('电话号码已复制');
};

// 再发一条
const handleNext = async () => {
  setModalVisible(false);
  await handleGetData(); // 立即获取下一条
};
```

**界面元素**：
- `Button`：获取数据按钮（大按钮）
- `Modal`：客户信息弹窗
- `Statistic`：待分配数量显示

## 服务层：customerDataService.js

### 文件位置：src/services/customerDataService.js

**主要方法**：

```javascript
class CustomerDataService {
  // 批量上传手机号码（自动去重）
  async uploadPhoneNumbers(phoneNumbers, uploadedBy) {
    // 前端去重
    const uniquePhones = [...new Set(phoneNumbers)];
    
    // 过滤空值
    const validPhones = uniquePhones
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    // 批量插入（使用 Promise.allSettled 处理错误）
    const results = await Promise.allSettled(
      validPhones.map(phone => 
        supabase.from('customer_pool').insert({
          customer_phone: phone,
          uploaded_by: uploadedBy,
          status: 'pending'
        })
      )
    );
    
    // 统计结果
    const success = results.filter(r => r.status === 'fulfilled').length;
    const duplicates = results.filter(r => 
      r.status === 'rejected' && 
      r.reason?.code === '23505' // PostgreSQL UNIQUE约束错误
    ).length;
    
    return { 
      success, 
      duplicates, 
      total: validPhones.length 
    };
  }
  
  // 获取客户数据
  async getCustomerData(employeeName) {
    const { data, error } = await supabase.rpc('assign_customer_to_employee', {
      p_employee_name: employeeName
    });
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  }
  
  // 获取客户池统计
  async getPoolStats() {
    const { data: all } = await supabase
      .from('customer_pool')
      .select('status');
    
    const pending = all?.filter(d => d.status === 'pending').length || 0;
    const assigned = all?.filter(d => d.status === 'assigned').length || 0;
    
    return {
      pending,
      assigned,
      total: pending + assigned
    };
  }
  
  // 重置所有客户（可选）
  async resetAllCustomers() {
    const { data, error } = await supabase.rpc('reset_all_customers');
    if (error) throw error;
    return data;
  }
}

export const customerDataService = new CustomerDataService();
```

## 数据库准备

### 执行脚本

在 Supabase SQL 编辑器中运行：
- `customer-pool-database-v2.sql`

### 验证

```sql
-- 验证表是否存在
SELECT * FROM customer_pool LIMIT 1;

-- 验证函数是否存在
SELECT * FROM assign_customer_to_employee('测试员工');
```

## 实施步骤

### 第一步：数据库准备
1. 在 Supabase 中执行 `customer-pool-database-v2.sql`
2. 验证表和函数创建成功

### 第二步：创建服务层
1. 创建 `src/services/customerDataService.js`
2. 实现所有方法
3. 测试服务方法

### 第三步：创建商人端组件
1. 创建 `src/components/merchant/CustomerDataManagement.js`
2. 实现文本上传功能
3. 实现自动去重
4. 实现统计显示

### 第四步：创建员工端组件
1. 创建 `src/components/employee/CustomerData.js`
2. 实现获取数据按钮
3. 实现弹窗显示
4. 实现复制和再发一条功能

### 第五步：集成到主应用
1. 在 `MerchantApp.js` 中添加菜单项和路由
2. 在 `EmployeeApp.js` 中添加菜单项和路由
3. 导入必要的图标和组件

### 第六步：测试
1. 测试商人端上传功能
2. 测试自动去重
3. 测试员工端获取功能
4. 测试弹窗交互
5. 测试自动重置机制
6. 测试并发场景

## 关键实现细节

### 文本解析和去重

```javascript
// 解析文本
const parsePhoneNumbers = (text) => {
  return text
    .split('\n')                    // 按行分割
    .map(line => line.trim())        // 去除前后空格
    .filter(line => line.length > 0) // 去除空行
    .filter((value, index, self) =>  // 去重
      self.indexOf(value) === index
    );
};
```

### 批量上传处理

```javascript
// 使用 Promise.allSettled 处理批量操作
const uploadResults = await Promise.allSettled(
  phoneNumbers.map(phone => 
    supabase.from('customer_pool').insert({
      customer_phone: phone,
      uploaded_by: uploadedBy,
      status: 'pending'
    })
  )
);

// 处理结果
const success = uploadResults.filter(r => r.status === 'fulfilled');
const failed = uploadResults.filter(r => r.status === 'rejected');
```

### 弹窗显示

```javascript
<Modal
  title="联系电话"
  open={modalVisible}
  onCancel={() => setModalVisible(false)}
  footer={[
    <Button key="copy" onClick={handleCopy}>复制</Button>,
    <Button key="next" type="primary" onClick={handleNext}>再发一条</Button>
  ]}
>
  <div style={{ textAlign: 'center', fontSize: 24, padding: '20px 0' }}>
    {customerData?.customer_phone || '暂无联系电话'}
  </div>
</Modal>
```

## 注意事项

1. **去重机制**：
   - 前端去重：减少数据库压力
   - 数据库去重：利用 UNIQUE 约束，确保数据唯一性

2. **错误处理**：
   - 网络错误：提示用户重试
   - 数据库错误：区分重复数据和其他错误

3. **用户体验**：
   - 上传时显示加载状态
   - 获取时显示加载状态
   - 操作成功后给出明确提示

4. **性能优化**：
   - 批量上传使用批量插入
   - 统计信息可以缓存
   - 避免频繁查询数据库

## 测试用例

### 商人端测试

1. **上传测试**：
   - 单个手机号码上传
   - 多个手机号码上传
   - 包含重复号码的上传
   - 包含空行的上传
   - 包含格式错误的号码

2. **去重测试**：
   - 前端去重是否生效
   - 数据库去重是否生效
   - 重复上传是否被拒绝

### 员工端测试

1. **获取测试**：
   - 正常获取数据
   - 无数据时的处理
   - 自动重置机制

2. **弹窗测试**：
   - 复制功能
   - 再发一条功能
   - 弹窗关闭

3. **并发测试**：
   - 多个员工同时获取
   - 确保不重复分配

## 文件清单

### 需要创建的文件

1. `src/services/customerDataService.js` - 服务层
2. `src/components/merchant/CustomerDataManagement.js` - 商人端组件
3. `src/components/employee/CustomerData.js` - 员工端组件

### 需要修改的文件

1. `src/components/merchant/MerchantApp.js` - 添加菜单项
2. `src/components/employee/EmployeeApp.js` - 添加菜单项

### 数据库脚本

1. `customer-pool-database-v2.sql` - 数据库表结构

### 文档

1. `CUSTOMER_DATA_FEATURE_PLAN.md` - 功能方案
2. `CUSTOMER_DATA_UI_DESIGN.md` - 界面设计
3. `CUSTOMER_DATA_IMPLEMENTATION_GUIDE.md` - 实施指南（本文档）
