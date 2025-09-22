# 仓储记账系统

一个基于 Electron + React + Supabase 的双端仓储记账软件，支持商人端管理和员工端查看，实现实时数据同步。

## 功能特性

### 商人端（管理员）
- ✅ 用户登录认证
- ✅ 添加、编辑、删除交易记录
- ✅ 查看交易记录，支持筛选和排序
- ✅ 员工管理（添加、编辑、离职/在职切换）
- ✅ 数据统计和仪表板
- ✅ 实时同步数据

### 员工端（只读）
- ✅ 用户登录认证
- ✅ 实时查看交易记录
- ✅ 支持筛选和搜索
- ✅ 查看员工列表
- ✅ 数据统计概览
- ✅ 实时通知新交易

### 技术特性
- ✅ Electron 桌面应用
- ✅ React + Ant Design UI
- ✅ Supabase 数据库 + 实时同步
- ✅ Row Level Security (RLS) 权限控制
- ✅ 密码加密存储
- ✅ 响应式设计

## 技术栈

- **前端框架**: React 18
- **UI 组件库**: Ant Design 5
- **桌面应用**: Electron 22
- **数据库**: Supabase PostgreSQL
- **实时同步**: Supabase Realtime
- **日期处理**: Day.js
- **密码加密**: bcryptjs

## 数据库设计

### employees 表（员工信息）
```sql
- id: 自增ID
- name: 员工姓名
- username: 登录账号
- password: 加密密码
- role: 角色（merchant/employee）
- status: 状态（active/inactive）
- created_at: 入职时间
- left_at: 离职时间
```

### transactions 表（交易记录）
```sql
- id: 自增ID
- type: 交易类型（purchase/sale/return/gift）
- customer_name: 客户或供应商名称
- collector: 收款人
- quantity: 数量
- gift_quantity: 赠送数量
- unit_price: 单价
- total_amount: 总金额
- created_at: 创建时间
```

## 安装和运行

### 1. 环境要求
- Node.js 16+
- npm 或 yarn
- Supabase 账户

### 2. 克隆项目
```bash
git clone <项目地址>
cd 记账系统
```

### 3. 安装依赖
```bash
npm install
```

### 4. 配置 Supabase
1. 在 [Supabase](https://supabase.com) 创建新项目
2. 在 SQL 编辑器中运行以下脚本创建表和策略：

```sql
-- 创建员工表
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('merchant', 'employee')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE
);

-- 创建交易记录表
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'sale', 'return', 'gift')),
    customer_name VARCHAR(200) NOT NULL,
    collector VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    gift_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 员工表的 RLS 策略
CREATE POLICY "Merchants can manage all employees" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE username = auth.jwt() ->> 'username' 
            AND role = 'merchant'
            AND status = 'active'
        )
    );

CREATE POLICY "Employees can view active employees" ON employees
    FOR SELECT USING (
        status = 'active' AND
        EXISTS (
            SELECT 1 FROM employees 
            WHERE username = auth.jwt() ->> 'username' 
            AND status = 'active'
        )
    );

-- 交易记录表的 RLS 策略
CREATE POLICY "Merchants can manage all transactions" ON transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE username = auth.jwt() ->> 'username' 
            AND role = 'merchant'
            AND status = 'active'
        )
    );

CREATE POLICY "Employees can view transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE username = auth.jwt() ->> 'username' 
            AND status = 'active'
        )
    );

-- 创建默认管理员账户（密码：admin123）
INSERT INTO employees (name, username, password, role, status) 
VALUES ('系统管理员', 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.5xCGwJzCG3.8l7iJzG5P3g8OYzJq1u', 'merchant', 'active')
ON CONFLICT (username) DO NOTHING;
```

3. 修改 `src/config/supabase.js` 文件，替换为您的 Supabase 配置：
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

### 5. 开发模式运行
```bash
# 启动 React 开发服务器
npm start

# 在另一个终端启动 Electron
npm run electron-dev
```

### 6. 生产构建
```bash
# 构建 React 应用
npm run build

# 打包 Electron 应用
npm run electron-pack
```

## 使用说明

### 默认账户
- **管理员账户**: admin / admin123
- **员工账户**: 需要管理员创建

### 商人端功能
1. **登录**: 使用管理员账户登录
2. **添加交易**: 点击右上角"添加交易"按钮
3. **管理交易**: 在交易记录页面可以编辑、删除记录
4. **员工管理**: 在员工管理页面添加、编辑员工信息
5. **数据统计**: 在仪表板查看各种统计数据

### 员工端功能
1. **登录**: 使用员工账户登录
2. **查看交易**: 实时查看所有交易记录
3. **筛选搜索**: 支持按日期、客户、类型筛选
4. **员工列表**: 查看在职同事信息
5. **实时通知**: 自动接收新交易通知

### 实时同步
- 商人端添加/修改/删除交易记录时，员工端会立即收到通知
- 员工端会自动刷新数据显示最新内容
- 支持多个客户端同时在线

## 项目结构

```
记账系统/
├── public/
│   ├── electron.js          # Electron 主进程
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Login.js         # 登录组件
│   │   ├── merchant/        # 商人端组件
│   │   │   ├── MerchantApp.js
│   │   │   ├── Dashboard.js
│   │   │   ├── TransactionForm.js
│   │   │   ├── TransactionList.js
│   │   │   └── EmployeeManagement.js
│   │   └── employee/        # 员工端组件
│   │       ├── EmployeeApp.js
│   │       ├── EmployeeDashboard.js
│   │       ├── EmployeeTransactionList.js
│   │       └── EmployeeList.js
│   ├── services/
│   │   ├── authService.js   # 认证服务
│   │   └── transactionService.js # 交易服务
│   ├── config/
│   │   └── supabase.js      # Supabase 配置
│   ├── App.js               # 主应用
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## 常见问题

### Q: 如何重置管理员密码？
A: 在 Supabase 数据库中直接修改 employees 表中的 password 字段，使用 bcrypt 加密新密码。

### Q: 如何添加新的交易类型？
A: 修改 `src/config/supabase.js` 中的 `transactionTypes` 对象，同时更新数据库表的 CHECK 约束。

### Q: 员工端看不到数据怎么办？
A: 检查员工账户状态是否为 'active'，以及 RLS 策略是否正确配置。

### Q: 如何备份数据？
A: 在 Supabase 控制台中导出数据库，或使用 pg_dump 工具。

## 开发计划

- [ ] 数据导出功能（Excel/PDF）
- [ ] 更多统计图表
- [ ] 移动端适配
- [ ] 离线模式支持
- [ ] 数据备份恢复
- [ ] 多语言支持

## 技术支持

如有问题请提交 Issue 或联系开发者。

## 许可证

MIT License


#   w a r e h o u s e - a c c o u n t i n g  
 