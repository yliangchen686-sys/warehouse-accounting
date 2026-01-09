# 版本 1.0.6 发布说明

## 更新内容

### 🎉 新增功能
- **客户数据上传与分配功能**
  - 商人端：支持批量上传客户手机号码（文本粘贴，自动去重）
  - 员工端：支持随机获取客户手机号码（弹窗显示，复制和再发一条）
  - 支持自动重置和打乱分配
  - 完整的统计信息显示

### 🐛 问题修复
- **修复检查更新无反应问题**
  - 添加了检查更新时的用户反馈提示
  - 已是最新版本时显示提示信息
  - 出错时显示详细的错误信息

### 🔧 优化改进
- 优化客户数据上传的去重机制（前端 + 数据库双重去重）
- 优化统计查询，支持超过 1000 条数据的准确统计
- 改进批量上传性能

## 数据库更新

⚠️ **重要**：需要手动在 Supabase 中执行以下 SQL 脚本：

1. **创建客户池表结构**（如果还没有执行）：
   - 执行 `customer-pool-database-v2.sql`

2. **修复随机分配功能**（推荐执行）：
   - 执行 `fix-customer-assignment-random.sql`

## 文件清单

### 需要上传到 GitHub Release 的文件

在 `release` 目录中，上传以下文件：

1. `warehouse-accounting-setup-1.0.6.exe` 或 `仓储记账系统 Setup 1.0.6.exe` - 安装程序
2. `仓储记账系统 Setup 1.0.6.exe.blockmap` - 增量更新文件
3. `latest.yml` - 更新配置文件

**注意**：根据 `latest.yml` 文件，安装程序文件名可能是 `warehouse-accounting-setup-1.0.6.exe`，请根据实际文件名上传。

## 发布步骤

### 1. 创建 GitHub Release

访问：https://github.com/yliangchen686-sys/warehouse-accounting/releases

点击 "Draft a new release"

### 2. 填写 Release 信息

- **Tag version**: `v1.0.6`（必须以 v 开头）
- **Release title**: `版本 1.0.6`
- **Description**: 复制以下内容

```markdown
## 更新内容

### 🎉 新增功能
- **客户数据上传与分配功能**
  - 商人端：支持批量上传客户手机号码（文本粘贴，自动去重）
  - 员工端：支持随机获取客户手机号码（弹窗显示，复制和再发一条）
  - 支持自动重置和打乱分配
  - 完整的统计信息显示

### 🐛 问题修复
- **修复检查更新无反应问题**
  - 添加了检查更新时的用户反馈提示
  - 已是最新版本时显示提示信息
  - 出错时显示详细的错误信息

### 🔧 优化改进
- 优化客户数据上传的去重机制（前端 + 数据库双重去重）
- 优化统计查询，支持超过 1000 条数据的准确统计
- 改进批量上传性能

## 数据库更新

⚠️ **重要**：需要手动在 Supabase 中执行以下 SQL 脚本：

1. **创建客户池表结构**（如果还没有执行）：
   - 执行 `customer-pool-database-v2.sql`

2. **修复随机分配功能**（推荐执行）：
   - 执行 `fix-customer-assignment-random.sql`

## 安装说明

1. 下载安装程序（`warehouse-accounting-setup-1.0.6.exe` 或 `仓储记账系统 Setup 1.0.6.exe`）
2. 运行安装程序
3. 按照提示完成安装
4. 旧版本用户可以通过"检查更新"功能自动更新
```

### 3. 上传文件

将 `release` 目录中的以下文件拖到上传区：
- `warehouse-accounting-setup-1.0.6.exe` 或 `仓储记账系统 Setup 1.0.6.exe`（根据实际文件名）
- `仓储记账系统 Setup 1.0.6.exe.blockmap`
- `latest.yml`

### 4. 发布

点击 "Publish release" 按钮

## 测试建议

1. **测试自动更新**：
   - 使用旧版本（v1.0.5）应用
   - 点击"窗口" -> "检查更新"
   - 应该能看到提示信息并检测到新版本

2. **测试客户数据功能**：
   - 商人端：上传客户手机号码
   - 员工端：获取客户数据
   - 验证随机分配功能

3. **测试数据库**：
   - 在 Supabase 中执行 SQL 脚本
   - 验证表结构和函数创建成功

## 已知问题

- 无

## 技术支持

如有问题，请查看：
- `UPDATE_CHECK_TROUBLESHOOTING.md` - 检查更新问题排查
- `CUSTOMER_DATA_IMPLEMENTATION_GUIDE.md` - 客户数据功能实施指南
