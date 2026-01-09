# 客户数据功能完整方案

## 功能概述

在商人端和员工端的侧边栏添加"客户数据"功能：
- **商人端**：上传客户手机号码（文本粘贴，自动去重）
- **员工端**：获取客户手机号码（弹窗显示，复制和再发一条）

## 侧边栏菜单

### 商人端菜单项

在 `MerchantApp.js` 的侧边栏菜单中添加：

```javascript
<Menu.Item key="customerData" icon={<PhoneOutlined />}>
  客户数据
</Menu.Item>
```

**位置建议**：放在"客户绑定"之后，"客户赠送"之前

**图标**：使用 `PhoneOutlined`（需要从 `@ant-design/icons` 导入）

### 员工端菜单项

在 `EmployeeApp.js` 的侧边栏菜单中添加：

```javascript
<Menu.Item key="customerData" icon={<PhoneOutlined />}>
  客户数据
</Menu.Item>
```

**位置建议**：放在"本月任务"之后，"奖金池"之前

## 商人端：客户数据上传界面

### 界面设计

```
┌─────────────────────────────────────────┐
│  客户数据管理                            │
├─────────────────────────────────────────┤
│                                         │
│  上传方式：直接粘贴文本                  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 请在此粘贴手机号码（每行一个）    │   │
│  │                                 │   │
│  │ 13800138000                     │   │
│  │ 13900139000                     │   │
│  │ 15000150000                     │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [上传]  [清空]                         │
│                                         │
│  提示：系统会自动去重，重复的手机号码   │
│  不会被重复上传                         │
│                                         │
├─────────────────────────────────────────┤
│  客户池统计                              │
├─────────────────────────────────────────┤
│  待分配：50 条                          │
│  已分配：120 条                         │
│  总计：170 条                           │
│                                         │
│  [查看全部] [重置所有]                  │
└─────────────────────────────────────────┘
```

### 功能说明

1. **文本输入框**：
   - 多行文本输入框（TextArea）
   - 占位符提示："请在此粘贴手机号码（每行一个）"
   - 支持直接粘贴多行文本

2. **上传按钮**：
   - 点击后解析文本内容
   - 自动去重（去除重复的手机号码）
   - 批量插入到数据库
   - 显示上传结果（成功/失败数量）

3. **清空按钮**：
   - 清空文本输入框

4. **自动去重逻辑**：
   - 前端去重：解析文本时去除重复行
   - 数据库去重：利用 UNIQUE 约束，重复的手机号码会被数据库拒绝
   - 显示去重结果：告知用户有多少条重复数据被过滤

5. **统计信息**：
   - 显示待分配数量
   - 显示已分配数量
   - 显示总计数量
   - 提供"查看全部"和"重置所有"按钮

### 上传流程

1. **用户粘贴文本**：
   ```
   13800138000
   13900139000
   13800138000  (重复)
   15000150000
   ```

2. **解析文本**：
   - 按行分割
   - 去除空行
   - 去除前后空格
   - 前端去重

3. **验证格式**：
   - 检查是否为有效的手机号码格式（可选）
   - 过滤无效数据

4. **批量上传**：
   - 调用服务层方法
   - 批量插入到 `customer_pool` 表
   - 数据库自动去重（UNIQUE 约束）

5. **显示结果**：
   - 成功上传：X 条
   - 重复跳过：Y 条
   - 格式错误：Z 条

## 员工端：客户数据获取界面

### 界面设计

```
┌─────────────────────────────────────────┐
│  获取客户数据                            │
├─────────────────────────────────────────┤
│                                         │
│  当前待分配：50 条                      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         [获取数据]               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  说明：点击按钮获取一条客户手机号码     │
│                                         │
└─────────────────────────────────────────┘
```

### 功能说明

1. **获取数据按钮**：
   - 大按钮，居中显示
   - 点击后调用分配函数
   - 显示加载状态

2. **统计信息**：
   - 显示当前待分配数量
   - 实时更新

3. **弹窗显示**（点击获取数据后）：
   ```
   ┌─────────────────────────────┐
   │  联系电话                    │
   ├─────────────────────────────┤
   │                             │
   │        13800138000          │
   │                             │
   ├─────────────────────────────┤
   │  [复制]  [再发一条]          │
   └─────────────────────────────┘
   ```

4. **弹窗功能**：
   - **复制按钮**：复制手机号码到剪贴板
   - **再发一条按钮**：关闭当前弹窗，立即获取下一条

## 服务层设计

### 创建客户数据服务（customerDataService.js）

```javascript
class CustomerDataService {
  // 批量上传手机号码（自动去重）
  async uploadPhoneNumbers(phoneNumbers, uploadedBy) {
    // 1. 前端去重
    const uniquePhones = [...new Set(phoneNumbers)];
    
    // 2. 过滤空值和无效格式
    const validPhones = uniquePhones.filter(phone => {
      const trimmed = phone.trim();
      return trimmed.length > 0;
    });
    
    // 3. 批量插入（数据库会自动去重）
    const results = await Promise.allSettled(
      validPhones.map(phone => 
        supabase.from('customer_pool').insert({
          customer_phone: phone.trim(),
          uploaded_by: uploadedBy,
          status: 'pending'
        })
      )
    );
    
    // 4. 统计结果
    const success = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return { success, failed, total: validPhones.length };
  }
  
  // 获取客户数据（调用数据库函数）
  async getCustomerData(employeeName) {
    const { data, error } = await supabase.rpc('assign_customer_to_employee', {
      p_employee_name: employeeName
    });
    
    if (error) throw error;
    return data[0] || null;
  }
  
  // 获取客户池统计
  async getPoolStats() {
    const { data: pending } = await supabase
      .from('customer_pool')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');
      
    const { data: assigned } = await supabase
      .from('customer_pool')
      .select('id', { count: 'exact' })
      .eq('status', 'assigned');
    
    return {
      pending: pending?.length || 0,
      assigned: assigned?.length || 0,
      total: (pending?.length || 0) + (assigned?.length || 0)
    };
  }
  
  // 重置所有客户（可选）
  async resetAllCustomers() {
    const { data, error } = await supabase.rpc('reset_all_customers');
    if (error) throw error;
    return data;
  }
}
```

## 组件设计

### 商人端组件：CustomerDataManagement.js

**功能**：
1. 文本输入框（TextArea）
2. 上传按钮
3. 清空按钮
4. 统计信息显示
5. 上传结果提示

**状态管理**：
- `textContent`: 文本输入框内容
- `loading`: 上传加载状态
- `stats`: 客户池统计信息

### 员工端组件：CustomerData.js

**功能**：
1. 获取数据按钮
2. 统计信息显示
3. 客户信息弹窗
4. 复制和再发一条功能

**状态管理**：
- `loading`: 获取数据加载状态
- `modalVisible`: 弹窗显示状态
- `customerData`: 当前客户数据
- `stats`: 客户池统计信息

## 数据流程

### 商人端上传流程

```
用户粘贴文本
    ↓
解析文本（按行分割）
    ↓
前端去重
    ↓
验证格式（可选）
    ↓
批量插入数据库
    ↓
数据库自动去重（UNIQUE约束）
    ↓
返回上传结果
    ↓
更新统计信息
```

### 员工端获取流程

```
点击"获取数据"按钮
    ↓
调用 assign_customer_to_employee() 函数
    ↓
检查待分配数量
    ↓
如果为0，自动重置并打乱
    ↓
随机选择一条手机号码
    ↓
更新状态为已分配
    ↓
返回手机号码
    ↓
弹窗显示
    ↓
用户操作（复制/再发一条）
```

## 去重机制

### 前端去重

```javascript
// 解析文本
const lines = textContent.split('\n');

// 去除空行和空格
const phones = lines
  .map(line => line.trim())
  .filter(line => line.length > 0);

// 去重
const uniquePhones = [...new Set(phones)];
```

### 数据库去重

- 利用 `customer_phone` 字段的 UNIQUE 约束
- 重复插入会被数据库拒绝
- 使用 `ON CONFLICT DO NOTHING` 或捕获错误

## 界面交互细节

### 商人端上传

1. **文本输入框**：
   - 支持多行输入
   - 支持粘贴
   - 自动去除前后空格
   - 显示行数统计

2. **上传按钮**：
   - 点击后显示加载状态
   - 禁用输入框
   - 显示上传进度（可选）

3. **上传结果**：
   - 成功提示：已上传 X 条，跳过 Y 条重复数据
   - 错误提示：上传失败，请重试

4. **统计信息**：
   - 实时更新
   - 提供刷新按钮

### 员工端获取

1. **获取按钮**：
   - 大按钮，易于点击
   - 显示加载状态
   - 如果待分配为0，按钮禁用或提示

2. **弹窗**：
   - 居中显示
   - 大字体显示手机号码
   - 按钮清晰易用

3. **复制功能**：
   - 使用 Clipboard API
   - 成功提示："已复制到剪贴板"

4. **再发一条功能**：
   - 关闭当前弹窗
   - 立即获取下一条
   - 无缝切换

## 错误处理

### 上传错误

1. **网络错误**：提示"网络连接失败，请重试"
2. **格式错误**：提示"部分手机号码格式不正确，已跳过"
3. **数据库错误**：提示"上传失败，请检查数据格式"

### 获取错误

1. **无可用数据**：提示"暂无可用客户数据"
2. **网络错误**：提示"获取失败，请重试"
3. **函数调用错误**：提示"系统错误，请联系管理员"

## 性能优化

1. **批量上传**：使用批量插入，提高效率
2. **去重优化**：前端去重减少数据库压力
3. **统计缓存**：统计信息可以缓存，减少查询
4. **异步处理**：上传和获取都使用异步操作

## 实施检查清单

### 数据库
- [ ] 执行 `customer-pool-database-v2.sql` 脚本
- [ ] 验证表结构正确
- [ ] 验证函数正常工作

### 服务层
- [ ] 创建 `customerDataService.js`
- [ ] 实现上传方法（去重）
- [ ] 实现获取方法（调用函数）
- [ ] 实现统计方法

### 商人端
- [ ] 在侧边栏添加"客户数据"菜单项
- [ ] 创建 `CustomerDataManagement.js` 组件
- [ ] 实现文本粘贴上传
- [ ] 实现自动去重
- [ ] 实现统计显示
- [ ] 集成到 MerchantApp

### 员工端
- [ ] 在侧边栏添加"客户数据"菜单项
- [ ] 创建 `CustomerData.js` 组件
- [ ] 实现获取数据按钮
- [ ] 实现弹窗显示
- [ ] 实现复制功能
- [ ] 实现再发一条功能
- [ ] 集成到 EmployeeApp

### 测试
- [ ] 测试批量上传
- [ ] 测试自动去重
- [ ] 测试获取数据
- [ ] 测试弹窗交互
- [ ] 测试自动重置
- [ ] 测试并发场景
