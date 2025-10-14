# Vercel 部署指南

## 📦 项目已准备就绪

代码已推送到 GitHub：
- 仓库地址：https://github.com/yliangchen686-sys/warehouse-accounting
- 分支：main
- 最新提交：修改提成计算逻辑

## 🚀 部署到 Vercel

### 方法一：通过 Vercel Dashboard（推荐）

1. **访问 Vercel**
   - 打开 https://vercel.com
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "Add New..." → "Project"
   - 选择 "Import Git Repository"
   - 找到 `yliangchen686-sys/warehouse-accounting` 仓库
   - 点击 "Import"

3. **配置项目**

   **项目名称：**
   ```
   warehouse-accounting
   ```

   **Framework Preset：**
   ```
   Create React App
   ```

   **构建命令：**
   ```
   npm run build
   ```

   **输出目录：**
   ```
   build
   ```

   **安装命令：**
   ```
   npm install
   ```

4. **配置环境变量**

   在 "Environment Variables" 部分添加 Supabase 配置：

   ```
   REACT_APP_SUPABASE_URL=你的Supabase项目URL
   REACT_APP_SUPABASE_ANON_KEY=你的Supabase匿名密钥
   ```

   > ⚠️ **重要**：请从 Supabase Dashboard 获取这些值
   > 路径：Project Settings → API

5. **部署**
   - 点击 "Deploy" 按钮
   - 等待构建和部署完成（约 2-3 分钟）
   - 部署成功后会显示预览链接

### 方法二：使用 Vercel CLI

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录 Vercel
vercel login

# 3. 在项目目录中运行部署
cd "c:\Users\admin\Desktop\记账系统"
vercel

# 4. 按照提示操作
# - 选择 "Continue with GitHub"
# - 确认项目设置
# - 等待部署完成

# 5. 部署到生产环境
vercel --prod
```

## ⚙️ 环境变量配置

### 从 Supabase 获取配置

1. 登录 Supabase Dashboard
2. 选择你的项目
3. 点击左侧 "Project Settings" → "API"
4. 复制以下信息：
   - Project URL（用于 `REACT_APP_SUPABASE_URL`）
   - anon public key（用于 `REACT_APP_SUPABASE_ANON_KEY`）

### 在 Vercel 中设置环境变量

1. 在 Vercel Dashboard 中打开项目
2. 进入 "Settings" → "Environment Variables"
3. 添加变量：
   ```
   REACT_APP_SUPABASE_URL
   REACT_APP_SUPABASE_ANON_KEY
   ```
4. 点击 "Save"
5. 重新部署项目以应用环境变量

## 🔄 自动部署

配置完成后，每次推送代码到 GitHub main 分支时，Vercel 会自动：
1. 检测到代码变更
2. 触发新的构建
3. 运行测试（如果有）
4. 部署到生产环境

## 📋 部署清单

- [x] 代码已推送到 GitHub
- [x] 创建 vercel.json 配置文件
- [x] 更新 .gitignore 文件
- [ ] 在 Vercel 中导入项目
- [ ] 配置环境变量
- [ ] 完成首次部署
- [ ] 验证应用功能

## 🔍 部署后验证

部署成功后，请测试以下功能：

### 1. 基本功能
- [ ] 页面是否正常加载
- [ ] 路由跳转是否正常
- [ ] 样式是否显示正确

### 2. 登录功能
- [ ] 管理员登录
- [ ] 商人登录
- [ ] 员工登录

### 3. 核心功能
- [ ] 交易记录创建
- [ ] 工资计算（按客户绑定人）
- [ ] 员工收款统计
- [ ] 客户绑定管理

### 4. Supabase 连接
- [ ] 数据库读取正常
- [ ] 数据库写入正常
- [ ] 实时更新功能正常

## 🐛 常见问题

### 问题 1：构建失败
**原因**：依赖安装失败或构建命令错误

**解决方案**：
- 检查 package.json 中的依赖版本
- 确认构建命令为 `npm run build`
- 查看构建日志找出具体错误

### 问题 2：环境变量未生效
**原因**：环境变量配置错误或未重新部署

**解决方案**：
- 确认变量名称正确（必须以 `REACT_APP_` 开头）
- 保存后重新部署项目
- 在代码中使用 `process.env.REACT_APP_SUPABASE_URL` 访问

### 问题 3：路由 404 错误
**原因**：React Router 的 SPA 路由未正确配置

**解决方案**：
- 确认 vercel.json 中的路由配置正确
- 检查是否有重定向规则

### 问题 4：Supabase 连接失败
**原因**：环境变量未设置或 Supabase URL/密钥错误

**解决方案**：
- 检查 Supabase Dashboard 中的 API 配置
- 确认环境变量已正确设置
- 检查 Supabase RLS 策略是否允许访问

## 📊 性能优化建议

1. **启用 Vercel Analytics**
   - 在项目设置中启用
   - 监控页面性能和用户体验

2. **配置缓存策略**
   - 静态资源自动缓存
   - API 响应可配置缓存时间

3. **优化构建大小**
   ```bash
   # 分析打包大小
   npm run build

   # 查看 build 文件夹大小
   ```

4. **启用压缩**
   - Vercel 自动启用 Gzip/Brotli 压缩
   - 无需额外配置

## 🔒 安全建议

1. **保护敏感信息**
   - 不要在代码中硬编码 API 密钥
   - 使用环境变量存储敏感信息
   - 不要将 .env 文件提交到 Git

2. **配置 CORS**
   - 在 Supabase 中配置允许的域名
   - 限制 API 访问来源

3. **启用 RLS**
   - 确保 Supabase 的行级安全（RLS）已启用
   - 配置适当的访问策略

## 📱 域名配置（可选）

如果要使用自定义域名：

1. 在 Vercel 项目设置中进入 "Domains"
2. 点击 "Add Domain"
3. 输入你的域名
4. 按照提示配置 DNS 记录
5. 等待 DNS 传播（通常 24-48 小时）

## 🎉 部署完成

部署成功后，你会获得：
- 生产环境 URL：`https://warehouse-accounting.vercel.app`
- 预览环境 URL：每次 PR 都会生成独立的预览链接
- 自动 HTTPS
- 全球 CDN 加速

## 📚 相关资源

- [Vercel 文档](https://vercel.com/docs)
- [Create React App 部署指南](https://create-react-app.dev/docs/deployment/)
- [Supabase 文档](https://supabase.com/docs)

---

如有问题，请查看 Vercel Dashboard 中的部署日志或联系支持团队。
