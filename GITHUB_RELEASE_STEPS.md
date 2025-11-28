# 创建 GitHub Release 详细步骤

## ✅ 已完成的准备工作

1. ✅ React 应用已构建（build 目录）
2. ✅ Electron 应用已打包（release 目录）
3. ✅ 生成了以下文件：
   - `仓储记账系统 Setup 1.0.0.exe` - 安装程序（约 95 MB）
   - `仓储记账系统 Setup 1.0.0.exe.blockmap` - 增量更新文件
   - `latest.yml` - 更新配置文件

## 📋 发布步骤

### 步骤 1：访问 GitHub Releases 页面

打开浏览器访问：
```
https://github.com/yliangchen686-sys/warehouse-accounting/releases
```

### 步骤 2：创建新 Release

1. 点击右上角的 **"Draft a new release"** 按钮（绿色）

### 步骤 3：填写 Release 信息

#### 3.1 设置 Tag 版本号

- **Choose a tag**: 输入 `v1.0.0`
  - ⚠️ 注意：必须以小写 `v` 开头
  - ⚠️ 版本号必须与 package.json 中一致（当前是 1.0.0）

- 点击 **"Create new tag: v1.0.0 on publish"**

#### 3.2 填写 Release 标题

- **Release title**: 输入 `版本 1.0.0 - 首次发布`

#### 3.3 编写更新说明

在 **Describe this release** 文本框中输入：

```markdown
## 🎉 仓储记账系统 v1.0.0 - 首次发布

### ✨ 主要功能

#### 商人端功能
- ✅ 交易记录管理（进货、销售、回收、赠送）
- ✅ 客户管理与员工绑定
- ✅ 库存实时统计
- ✅ 员工收款管理
- ✅ 转账和提现记录管理
- ✅ 数据统计与报表

#### 员工端功能
- ✅ 交易记录录入
- ✅ 个人收款查询
- ✅ 转账记录查看

#### 系统特性
- ✅ 桌面应用，无需联网即可使用
- ✅ 数据实时同步 Supabase 云端
- ✅ 支持离线模式（本地存储）
- ✅ 自动更新功能
- ✅ 商人端和员工端独立窗口

### 🔧 技术实现

- 基于 Electron + React 开发
- 使用 Ant Design 组件库
- Supabase 云端数据库
- electron-updater 自动更新

### 📥 安装说明

1. 下载下方的 `仓储记账系统 Setup 1.0.0.exe`
2. 双击运行安装程序
3. 按照向导完成安装
4. 桌面会自动创建快捷方式

### 🔄 自动更新

- 应用启动后会自动检查更新
- 发现新版本时会提示下载
- 支持增量更新，节省下载时间

### ⚠️ 系统要求

- 操作系统：Windows 10 / 11（64位）
- 内存：至少 4GB RAM
- 硬盘空间：至少 200MB

### 🐛 已知问题

- 暂无

### 📞 技术支持

如遇问题，请在 [Issues](https://github.com/yliangchen686-sys/warehouse-accounting/issues) 中反馈。

---

**下载文件说明：**
- `仓储记账系统 Setup 1.0.0.exe` - 安装程序（必须下载）
- `仓储记账系统 Setup 1.0.0.exe.blockmap` - 自动更新文件（会自动下载，无需手动）
- `latest.yml` - 更新配置文件（会自动下载，无需手动）

⚠️ **首次安装用户只需下载 `.exe` 安装程序即可！**
```

### 步骤 4：上传文件

在 **Attach binaries** 区域：

1. 点击 **"Attach binaries by dropping them here or selecting them."**
2. 或者直接将文件拖拽到这个区域

需要上传的文件（在 `release` 目录下）：

```
✅ 仓储记账系统 Setup 1.0.0.exe
✅ 仓储记账系统 Setup 1.0.0.exe.blockmap
✅ latest.yml
```

⚠️ **重要：这三个文件都必须上传，缺一不可！**

- `.exe` 文件：用户首次安装
- `.blockmap` 文件：自动更新时计算增量
- `latest.yml` 文件：electron-updater 检查更新的配置文件

### 步骤 5：选择发布选项

#### 5.1 Release 类型

- ✅ 选择 **"Set as the latest release"**（设置为最新版本）
- ⚠️ 不要勾选 "Set as a pre-release"（预发布版）

#### 5.2 讨论选项

- 可选：勾选 "Create a discussion for this release"（为此版本创建讨论）

### 步骤 6：发布

1. 检查所有信息是否正确：
   - ✅ Tag: `v1.0.0`
   - ✅ 标题: `版本 1.0.0 - 首次发布`
   - ✅ 描述: 已填写完整
   - ✅ 文件: 3 个文件已上传
   - ✅ Release 类型: Latest release

2. 点击 **"Publish release"** 按钮（绿色）

3. 等待发布完成（通常几秒钟）

## ✅ 验证发布成功

发布后，您应该看到：

1. **Release 页面**
   - 显示 `v1.0.0` 版本
   - 标签显示 "Latest"
   - 可以看到 3 个资产文件

2. **下载测试**
   - 点击 `.exe` 文件可以下载
   - 文件大小约 95 MB

3. **自动更新测试**
   - 安装旧版本应用（如果有）
   - 打开应用，等待 3 秒
   - 应该会弹出"发现新版本"对话框

## 📝 Release URL

发布成功后，您的 Release 地址为：
```
https://github.com/yliangchen686-sys/warehouse-accounting/releases/tag/v1.0.0
```

## 🎯 下次更新流程

当需要发布 v1.0.1 版本时：

1. 修改 `package.json` 版本号为 `1.0.1`
2. 运行 `npm run build`
3. 运行 `npm run electron-pack`
4. 创建新的 Release（Tag: `v1.0.1`）
5. 上传新生成的文件

用户端的应用会自动检测到新版本并提示更新！

## 🔍 常见问题

### Q1: 文件上传失败
**A:** 检查网络连接，或尝试刷新页面重新上传

### Q2: 用户端检测不到更新
**A:** 确认以下几点：
- ✅ Release 已发布（不是草稿）
- ✅ Tag 格式正确（`v1.0.0`）
- ✅ 三个文件都已上传
- ✅ 网络可以访问 GitHub

### Q3: 下载速度慢
**A:** 这是正常的，GitHub 在国内访问较慢。用户可以：
- 使用 VPN 加速
- 或通过国内镜像下载（如果配置了）

### Q4: 提示"Windows 已保护你的电脑"
**A:** 这是因为应用未签名。用户可以：
1. 点击"更多信息"
2. 点击"仍要运行"
3. （建议：后续版本可以购买代码签名证书）

## 📸 截图参考

### Release 创建页面示例

```
┌─────────────────────────────────────────────┐
│ Draft a new release                         │
├─────────────────────────────────────────────┤
│ Choose a tag                                │
│ [v1.0.0▼] Create new tag: v1.0.0 on publish│
│                                             │
│ Release title                               │
│ [版本 1.0.0 - 首次发布]                    │
│                                             │
│ Describe this release                       │
│ ┌─────────────────────────────────────────┐ │
│ │ ## 🎉 仓储记账系统 v1.0.0 - 首次发布  │ │
│ │ ...                                     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Attach binaries                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📎 仓储记账系统 Setup 1.0.0.exe        │ │
│ │ 📎 仓储记账系统 Setup 1.0.0.exe.blockmap│ │
│ │ 📎 latest.yml                           │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ☑ Set as the latest release                │
│ ☐ Set as a pre-release                     │
│                                             │
│          [Publish release]                  │
└─────────────────────────────────────────────┘
```

## 🎉 完成！

按照以上步骤操作后，您的应用就可以通过 GitHub 自动更新了！

用户安装应用后，每次打开都会自动检查更新，确保始终使用最新版本。
