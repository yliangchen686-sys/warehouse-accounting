# 彻底清除应用数据指南

## 问题
重新安装应用后，旧的 localStorage 数据仍然存在。

## 原因
Electron 应用的数据存储在独立的文件夹中，卸载时不会自动删除。

## 解决方案

### 步骤 1：关闭应用
完全退出"仓储记账系统"应用。

### 步骤 2：删除应用数据文件夹

1. **按 Win + R**，打开"运行"对话框

2. **输入以下路径并按回车**：
   ```
   %APPDATA%
   ```

3. **找到并删除以下文件夹**：
   - `仓储记账系统`
   - 或 `warehouse-accounting`

4. **再次按 Win + R，输入**：
   ```
   %LOCALAPPDATA%
   ```

5. **找到并删除**：
   - `仓储记账系统`
   - 或 `warehouse-accounting`

### 步骤 3：重新打开应用

1. 打开"仓储记账系统"
2. 登录
3. 所有旧的 localStorage 记录应该已清除

---

## 如果找不到文件夹

可能的位置：
- `C:\Users\admin\AppData\Roaming\仓储记账系统`
- `C:\Users\admin\AppData\Roaming\warehouse-accounting`
- `C:\Users\admin\AppData\Local\仓储记账系统`
- `C:\Users\admin\AppData\Local\warehouse-accounting`

直接在文件资源管理器中搜索这些名称。

---

## 验证清除成功

打开应用后：
- 交易记录列表应该只显示 Supabase 数据库中的记录
- 不应该看到之前无法删除的旧记录
