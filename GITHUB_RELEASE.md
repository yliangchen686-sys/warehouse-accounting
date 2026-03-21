# 将安装包发布到 GitHub Releases

项目已配置 `electron-builder` 的 `publish`（仓库：`yliangchen686-sys/warehouse-accounting`）。按下面步骤即可把 **Windows 安装包** 上传到 **GitHub Releases**。

## 1. 创建 GitHub Token

1. 打开 GitHub：**Settings → Developer settings → Personal access tokens**
2. 任选其一：
   - **Fine-grained token**：勾选该仓库，权限至少包含 **Contents: Read and write**、**Metadata: Read**，若需管理 Release 再勾选 **Releases** 相关写入权限（以页面说明为准）。
   - **Classic token**：勾选 **`repo`**（完整仓库权限，含 Release）。
3. 生成后 **复制 Token**（只显示一次），勿提交到代码仓库。

## 2. 在本机设置环境变量（不要写进 `.env` 并提交）

**PowerShell（当前窗口有效）：**

```powershell
$env:GH_TOKEN = "ghp_你的Token粘贴在这里"
```

**CMD：**

```cmd
set GH_TOKEN=ghp_你的Token粘贴在这里
```

> `electron-builder` 读取的是 **`GH_TOKEN`**（与部分文档中的 `GITHUB_TOKEN` 二选一即可，官方常用 `GH_TOKEN`）。

## 3. 确认版本号

发布使用的 **Tag / Release 名称** 与 `package.json` 里的 **`version`** 一致（例如 `1.0.6`）。  
发新版前请先修改 `package.json` 的 `version`，再执行下一步。

## 4. 构建并上传

在项目根目录执行：

```bash
npm run release:github
```

该命令会：

1. 执行 `npm run build`（生成 React 生产包到 `build/`）
2. 执行 `electron-builder --publish always`（打 Windows NSIS 安装包并上传到 GitHub Releases）

成功后可在仓库页面：**Releases** 中看到对应版本及附件（如 `warehouse-accounting-setup-1.0.6.exe`）。

## 5. 常见问题

| 现象 | 处理 |
|------|------|
| `401` / `Bad credentials` | Token 错误或过期，重新生成并设置 `GH_TOKEN` |
| `403` / 无权限 | Token 缺少 `repo` 或对该仓库的写入权限 |
| 同名版本已存在 | 提高 `package.json` 的 `version` 后再发布，或到 GitHub 删除/编辑旧 Release |
| 只想本地打包、不上传 | 使用 `npm run build` 后执行 `npm run electron-pack`（不设 `GH_TOKEN` 则不会发布） |

## 6. 产物位置

- 安装包目录：`release/`（已在 `.gitignore` 中，不会进 Git）

---

**安全提醒：** 切勿把 Token 写入代码、截图或提交到仓库。若 Token 泄露，请立刻在 GitHub 上撤销并新建。
