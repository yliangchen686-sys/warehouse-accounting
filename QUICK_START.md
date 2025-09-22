# 快速启动指南

## 🚀 5分钟快速运行

### 1. 准备环境
确保已安装 Node.js 16+ 版本：
```bash
node --version  # 应该显示 v16.x.x 或更高版本
```

### 2. 安装依赖
```bash
# Windows 用户
install.bat

# Mac/Linux 用户
chmod +x install.sh
./install.sh

# 或者手动安装
npm install
```

### 3. 配置 Supabase
1. 访问 [Supabase](https://supabase.com) 创建新项目
2. 在项目设置中找到 API 配置信息
3. 复制 `src/config/database.sql` 内容到 Supabase SQL 编辑器执行
4. 修改 `src/config/supabase.js`：

```javascript
// 替换这两行
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'your-anon-key';
```

### 4. 启动应用

#### 开发模式（推荐）
```bash
# 方式1：一键启动
npm run electron-dev

# 方式2：分别启动
npm start          # 启动 React 开发服务器
npm run electron   # 启动 Electron 应用
```

#### 生产模式
```bash
npm run build
npm run electron-pack
```

### 5. 登录测试

#### 商人端（管理员）
- 用户名：`admin`
- 密码：`admin123`
- 功能：完整管理权限

#### 员工端
1. 先用管理员账户登录
2. 在"员工管理"中创建员工账户
3. 使用员工账户登录查看只读界面

## 📱 应用界面

### 商人端功能
- ✅ 仪表板：数据统计概览
- ✅ 交易记录：添加、编辑、删除、筛选
- ✅ 员工管理：添加、编辑员工信息
- ✅ 实时同步：数据自动更新

### 员工端功能  
- ✅ 数据概览：只读统计信息
- ✅ 交易记录：实时查看、筛选搜索
- ✅ 员工列表：查看同事信息
- ✅ 实时通知：新交易自动提醒

## 🛠️ 常见问题

### Q: 启动后显示白屏？
A: 检查 Supabase 配置是否正确，打开开发者工具查看控制台错误

### Q: 登录失败？
A: 确保数据库脚本已执行，默认账户已创建

### Q: 员工端看不到数据？
A: 检查员工账户状态是否为 'active'

### Q: 实时同步不工作？
A: 确保 Supabase Realtime 功能已启用

## 📞 技术支持

遇到问题？
1. 查看完整的 `README.md` 文档
2. 检查浏览器控制台错误信息
3. 提交 GitHub Issue

---

🎉 **恭喜！您的仓储记账系统已准备就绪！**


