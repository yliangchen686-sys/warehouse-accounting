# 仓储记账系统 - Vercel 部署指南

## 🌐 完整部署步骤

### 第一步：创建 GitHub 仓库

1. **访问 GitHub**：https://github.com
2. **登录您的账户**（如果没有请先注册）
3. **创建新仓库**：
   - 点击右上角 "+" → "New repository"
   - 仓库名称：`warehouse-accounting` 或 `仓储记账系统`
   - 设为 Public（公开）
   - 不要勾选 "Add a README file"
   - 点击 "Create repository"

### 第二步：上传代码到 GitHub

在您的项目目录中运行以下命令：

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交代码
git commit -m "仓储记账系统初始版本"

# 连接到 GitHub 仓库（替换为您的用户名和仓库名）
git remote add origin https://github.com/您的用户名/warehouse-accounting.git

# 推送代码
git push -u origin main
```

### 第三步：部署到 Vercel

1. **访问 Vercel**：https://vercel.com
2. **登录**：点击 "Login" → 选择 "Continue with GitHub"
3. **导入项目**：
   - 点击 "New Project"
   - 找到您刚创建的 GitHub 仓库
   - 点击 "Import"
4. **配置项目**：
   - Project Name：保持默认或修改
   - Framework Preset：选择 "Create React App"
   - Root Directory：保持默认 "./"
   - 点击 "Deploy"

### 第四步：等待部署完成

- Vercel 会自动构建和部署
- 大约 2-3 分钟完成
- 完成后会显示您的网站地址，如：`https://warehouse-accounting.vercel.app`

### 第五步：测试网站

1. **访问生成的网址**
2. **测试登录功能**：
   - 商人账户：admin / admin123
   - 员工账户：xigua / xiguagua
3. **测试所有功能**

## 🎯 部署后的优势

- ✅ **全球访问** - 任何人都可以通过网址访问
- ✅ **自动 HTTPS** - 安全的 SSL 证书
- ✅ **免费托管** - Vercel 免费计划足够使用
- ✅ **自动更新** - 推送代码到 GitHub 会自动重新部署
- ✅ **高性能** - 全球 CDN 加速

## 📱 使用方式

部署后，其他人可以：
- 在电脑浏览器中访问
- 在手机浏览器中访问
- 添加到手机桌面（PWA）
- 多人同时在线使用

## 🔧 常见问题

**Q: 如果需要修改代码怎么办？**
A: 修改本地代码 → git push → Vercel 自动重新部署

**Q: 数据会丢失吗？**
A: 不会，数据存储在 Supabase 云数据库中

**Q: 可以自定义域名吗？**
A: 可以，在 Vercel 项目设置中添加自定义域名
