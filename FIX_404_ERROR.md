# 修复 404 错误 - 文件名不匹配问题

## 问题原因

下载更新时出现 404 错误，原因是：
- `latest.yml` 中期望的文件名是：`warehouse-accounting-setup-1.0.6.exe`
- 但实际打包的文件名可能是：`仓储记账系统 Setup 1.0.6.exe`（中文名）
- GitHub Release 中上传的文件名与 `latest.yml` 不匹配

## 已修复

✅ **已配置 electron-builder 使用英文文件名**：
- 在 `package.json` 的 `nsis` 配置中添加了 `artifactName`
- 现在打包的文件名是：`warehouse-accounting-setup-1.0.6.exe`
- 与 `latest.yml` 中的文件名完全一致

## 解决方案

### 方案 1：重新上传正确的文件（推荐）

1. **检查 release 目录**：
   - 确认有 `warehouse-accounting-setup-1.0.6.exe` 文件
   - 确认有 `warehouse-accounting-setup-1.0.6.exe.blockmap` 文件
   - 确认有 `latest.yml` 文件

2. **更新 GitHub Release**：
   - 访问：https://github.com/yliangchen686-sys/warehouse-accounting/releases
   - 找到 `v1.0.6` 的 Release
   - 点击 "Edit release"
   - 删除旧的文件（如果有）
   - 上传新的文件：
     - `warehouse-accounting-setup-1.0.6.exe`
     - `warehouse-accounting-setup-1.0.6.exe.blockmap`
     - `latest.yml`
   - 保存更改

3. **测试更新**：
   - 使用旧版本应用测试检查更新
   - 应该能正常下载

### 方案 2：如果 Release 还没有创建

1. **创建新的 GitHub Release**：
   - Tag: `v1.0.6`
   - Title: `版本 1.0.6`
   - Description: 复制 `RELEASE_V1.0.6.md` 中的内容

2. **上传文件**（从 `release` 目录）：
   - `warehouse-accounting-setup-1.0.6.exe`
   - `warehouse-accounting-setup-1.0.6.exe.blockmap`
   - `latest.yml`

3. **发布 Release**

## 文件位置

所有文件都在：`c:\Users\admin\Desktop\记账系统\release\`

## 验证步骤

1. **检查文件名**：
   - 打开 `release` 目录
   - 确认安装程序文件名是 `warehouse-accounting-setup-1.0.6.exe`
   - 确认 `latest.yml` 中的 `path` 字段也是 `warehouse-accounting-setup-1.0.6.exe`

2. **检查 GitHub Release**：
   - 访问 Release 页面
   - 确认文件列表中包含 `warehouse-accounting-setup-1.0.6.exe`
   - 确认文件名完全匹配（区分大小写）

3. **测试下载链接**：
   - 直接访问：https://github.com/yliangchen686-sys/warehouse-accounting/releases/download/v1.0.6/warehouse-accounting-setup-1.0.6.exe
   - 应该能下载文件，而不是 404 错误

## 注意事项

- 文件名必须与 `latest.yml` 中的 `path` 字段完全一致
- GitHub 文件名区分大小写
- 上传文件后，等待几分钟让 GitHub 处理
- 如果还是 404，检查 Release 的 Tag 是否正确（必须是 `v1.0.6`）
