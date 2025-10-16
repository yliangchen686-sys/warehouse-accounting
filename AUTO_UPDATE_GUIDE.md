# 桌面端自动更新配置指南

本文档说明如何通过 GitHub Releases 实现桌面应用的自动更新功能。

## 已完成的配置

### 1. 安装依赖
已安装 `electron-updater` 包用于处理自动更新。

### 2. package.json 配置
在 `package.json` 中添加了以下配置：

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "yliangchen686-sys",
        "repo": "warehouse-accounting",
        "releaseType": "release"
      }
    ]
  }
}
```

### 3. electron.js 自动更新逻辑
实现了完整的自动更新流程：
- ✅ 应用启动 3 秒后自动检查更新
- ✅ 发现新版本时弹窗询问是否下载
- ✅ 下载完成后询问是否立即安装
- ✅ 菜单栏添加"检查更新"选项
- ✅ 退出时自动安装更新

## 如何发布新版本

### 步骤 1：更新版本号

修改 `package.json` 中的版本号：

```json
{
  "version": "1.0.1"  // 从 1.0.0 升级到 1.0.1
}
```

### 步骤 2：构建应用

```bash
# 1. 构建 React 应用
npm run build

# 2. 打包 Electron 应用
npm run electron-pack
```

打包完成后，会在 `release` 目录生成以下文件：
- `仓储记账系统 Setup 1.0.1.exe` - 安装程序
- `仓储记账系统 Setup 1.0.1.exe.blockmap` - 增量更新文件
- `latest.yml` - 更新配置文件

### 步骤 3：创建 GitHub Release

#### 方式一：通过 GitHub 网页

1. 访问 https://github.com/yliangchen686-sys/warehouse-accounting/releases
2. 点击 "Draft a new release"
3. 填写以下信息：
   - **Tag version**: `v1.0.1`（必须以 v 开头）
   - **Release title**: `版本 1.0.1`
   - **Description**: 填写更新内容
   ```markdown
   ## 更新内容
   - 添加转账和提现记录删除功能
   - 修复员工收款统计 1000 条记录限制问题
   - 优化自动更新功能

   ## 已知问题
   - 无
   ```
4. 上传文件：将 `release` 目录下的以下文件拖到上传区：
   - `仓储记账系统 Setup 1.0.1.exe`
   - `仓储记账系统 Setup 1.0.1.exe.blockmap`
   - `latest.yml`
5. 点击 "Publish release"

#### 方式二：使用 electron-builder 自动发布

需要先配置 GitHub Token：

```bash
# Windows
set GH_TOKEN=你的_GitHub_Token
npm run electron-pack

# 或者在 package.json 中添加发布脚本
{
  "scripts": {
    "release": "electron-builder --publish always"
  }
}
```

**获取 GitHub Token：**
1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 生成并复制 token

### 步骤 4：验证更新

1. 安装旧版本应用（如 1.0.0）
2. 打开应用，等待 3 秒
3. 应该会弹出"发现新版本"对话框
4. 点击"下载"并等待下载完成
5. 点击"现在重启"应用会自动安装新版本

或者手动检查：
- 点击菜单栏 → 窗口 → 检查更新

## 更新流程说明

### 用户端体验

1. **启动检查**
   - 应用启动后 3 秒自动检查更新
   - 后台静默检查，不影响使用

2. **发现新版本**
   ```
   ┌─────────────────────────────┐
   │     发现新版本              │
   │                             │
   │ 发现新版本 1.0.1，是否现在  │
   │ 下载？                      │
   │                             │
   │ 当前版本: 1.0.0             │
   │                             │
   │   [下载]      [稍后]        │
   └─────────────────────────────┘
   ```

3. **下载更新**
   - 后台下载，不影响使用
   - 控制台显示下载进度

4. **下载完成**
   ```
   ┌─────────────────────────────┐
   │     更新已下载              │
   │                             │
   │ 新版本已下载完成，应用将在  │
   │ 退出后自动更新。是否现在重  │
   │ 启应用？                    │
   │                             │
   │   [现在重启]   [稍后]       │
   └─────────────────────────────┘
   ```

5. **安装更新**
   - 选择"现在重启"：立即安装并重启
   - 选择"稍后"：下次退出时自动安装

### 增量更新

electron-updater 支持增量更新（只下载变化的部分），大大减少下载时间：
- 使用 `.blockmap` 文件计算差异
- 只下载变更的文件块
- 显著提升更新速度

## 版本号规范

使用语义化版本号：`主版本号.次版本号.修订号`

- **主版本号 (Major)**：不兼容的 API 修改
  - 例如：1.0.0 → 2.0.0
- **次版本号 (Minor)**：向下兼容的功能新增
  - 例如：1.0.0 → 1.1.0
- **修订号 (Patch)**：向下兼容的问题修正
  - 例如：1.0.0 → 1.0.1

## 常见问题

### 1. 检查更新时提示错误

**可能原因：**
- GitHub Release 未正确发布
- 文件未上传完整
- 网络连接问题

**解决方法：**
- 检查 GitHub Release 是否公开
- 确认 `latest.yml` 文件已上传
- 检查网络连接

### 2. 更新下载失败

**可能原因：**
- 网络不稳定
- GitHub 访问受限

**解决方法：**
- 使用 VPN 或代理
- 手动下载安装包

### 3. 开发模式检查更新

开发模式下无法检查更新，这是正常的。只有打包后的生产环境才能使用自动更新功能。

## 最佳实践

1. **测试后发布**
   - 在测试环境充分测试后再发布

2. **清晰的更新日志**
   - 在 Release 描述中详细说明更新内容
   - 标注已知问题

3. **版本号递增**
   - 确保新版本号大于旧版本号

4. **保留历史版本**
   - 不要删除旧的 Release
   - 方便用户降级

5. **通知用户**
   - 重大更新时通知用户
   - 说明新功能和改进

## 自动更新工作流程图

```
应用启动
    ↓
启动 3 秒后检查更新
    ↓
查询 GitHub Releases
    ↓
    ├─→ 无新版本 → 继续使用
    │
    └─→ 发现新版本
            ↓
        询问是否下载
            ↓
        ├─→ 稍后 → 继续使用
        │
        └─→ 下载
                ↓
            后台下载更新
                ↓
            下载完成
                ↓
            询问是否重启
                ↓
            ├─→ 稍后 → 退出时安装
            │
            └─→ 现在重启
                    ↓
                安装并重启
                    ↓
                应用已更新
```

## 附录：electron-builder 配置

当前 `package.json` 中的完整 build 配置：

```json
{
  "build": {
    "appId": "com.warehouse.accounting",
    "productName": "仓储记账系统",
    "directories": {
      "output": "release",
      "buildResources": "build"
    },
    "files": [
      "build/**/*",
      "public/electron.js",
      "!node_modules/**/*"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "public/icon.png"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "perMachine": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "仓储记账系统"
    },
    "publish": [
      {
        "provider": "github",
        "owner": "yliangchen686-sys",
        "repo": "warehouse-accounting",
        "releaseType": "release"
      }
    ]
  }
}
```

## 技术支持

如有问题，请在 GitHub Issues 中提出：
https://github.com/yliangchen686-sys/warehouse-accounting/issues
