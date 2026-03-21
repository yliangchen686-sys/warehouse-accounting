# 修复 SHA512 校验和不匹配问题

## 问题原因

下载到 100% 后出现 SHA512 checksum mismatch 错误，原因是：
- GitHub Release 中上传的 `latest.yml` 文件中的 SHA512 校验和
- 与实际上传的 `warehouse-accounting-setup-1.0.6.exe` 文件的校验和不匹配
- 可能是上传了不同批次生成的文件

## 当前状态

从最新的 `latest.yml` 文件（重新打包后）：
- 文件名：`warehouse-accounting-setup-1.0.6.exe`
- SHA512：`/Bcjh6lukR3qQVQLrmH7+s/BibaprIrzKDu6H9CqqzDqkMNtL3Rs/1qisqcLdcksYNwj9mH7kVvR4qTgpw01LA==`
- 文件大小：100853944 字节

## 解决方案

### 重要：必须同时上传匹配的文件

**关键点**：`latest.yml` 和安装程序文件必须是**同一批次打包生成**的，否则校验和不匹配。

### 步骤 1：确认本地文件

在 `c:\Users\admin\Desktop\记账系统\release\` 目录中，确认有以下文件（都是最新打包生成的）：

1. `warehouse-accounting-setup-1.0.6.exe`
2. `warehouse-accounting-setup-1.0.6.exe.blockmap`
3. `latest.yml`

### 步骤 2：更新 GitHub Release

1. **访问 GitHub Release**：
   - https://github.com/yliangchen686-sys/warehouse-accounting/releases
   - 找到 `v1.0.6` 的 Release
   - 点击 "Edit release"

2. **删除所有旧文件**：
   - 删除现有的 `warehouse-accounting-setup-1.0.6.exe`
   - 删除现有的 `warehouse-accounting-setup-1.0.6.exe.blockmap`
   - 删除现有的 `latest.yml`

3. **上传新的文件**（从本地 `release` 目录，必须是同一批次生成的）：
   - `warehouse-accounting-setup-1.0.6.exe`
   - `warehouse-accounting-setup-1.0.6.exe.blockmap`
   - `latest.yml`

4. **保存更改**

### 步骤 3：验证

上传后，检查 `latest.yml` 文件内容：
- 打开 GitHub Release 页面
- 点击 `latest.yml` 文件
- 确认 SHA512 值：`/Bcjh6lukR3qQVQLrmH7+s/BibaprIrzKDu6H9CqqzDqkMNtL3Rs/1qisqcLdcksYNwj9mH7kVvR4qTgpw01LA==`

## 当前 latest.yml 内容

```yaml
version: 1.0.6
files:
  - url: warehouse-accounting-setup-1.0.6.exe
    sha512: /Bcjh6lukR3qQVQLrmH7+s/BibaprIrzKDu6H9CqqzDqkMNtL3Rs/1qisqcLdcksYNwj9mH7kVvR4qTgpw01LA==
    size: 100853944
path: warehouse-accounting-setup-1.0.6.exe
sha512: /Bcjh6lukR3qQVQLrmH7+s/BibaprIrzKDu6H9CqqzDqkMNtL3Rs/1qisqcLdcksYNwj9mH7kVvR4qTgpw01LA==
releaseDate: '2026-01-09T11:21:34.694Z'
```

## 注意事项

1. **必须同时上传**：`latest.yml` 和安装程序文件必须是从同一批次打包中生成的
2. **不要混合使用**：不要使用旧版本的 `latest.yml` 配新版本的文件，反之亦然
3. **等待处理**：上传后等待几分钟让 GitHub 处理文件
4. **清除缓存**：如果还是失败，可能需要清除应用的更新缓存

## 如果问题仍然存在

如果重新上传后还是校验失败，可能需要：

1. **重新打包**：
   ```bash
   npm run build
   npm run electron-pack
   ```

2. **立即上传**：打包完成后立即上传，不要使用旧文件

3. **检查文件完整性**：确保文件在上传过程中没有被修改
