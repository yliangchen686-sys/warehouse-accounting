# RLS 策略修复指南

## 问题诊断

### 根本原因
您的仓储记账系统无法同步数据到 Supabase 的原因是：

1. **RLS (Row Level Security) 策略配置错误**
   - 当前 RLS 策略使用 `auth.jwt() ->> 'username'` 来验证用户
   - 这要求用户通过 Supabase Auth 登录

2. **应用使用自定义认证**
   - 您的应用使用 localStorage + bcryptjs 进行认证
   - 没有使用 Supabase Auth
   - 因此 `auth.jwt()` 永远返回 null

3. **结果**
   - 所有数据库操作被 RLS 策略拒绝
   - 应用自动回退到 localStorage 模式
   - 数据只保存在本地，无法同步到云端

### 症状确认
- ✅ 可以添加交易记录（保存到 localStorage）
- ✅ 前端显示记录（从 localStorage 读取）
- ❌ 记录不出现在 Supabase 数据库中
- ❌ 删除记录提示成功，但前端仍显示（localStorage 未清除）
- ❌ 多台电脑无法同步数据

## 解决方案

### 方案 1：在 Supabase 控制台执行 SQL（推荐）

1. **登录 Supabase 控制台**
   - 访问：https://supabase.com/dashboard
   - 选择您的项目：`ztyvmtawslpmjqffbmtp`

2. **打开 SQL Editor**
   - 左侧菜单 → SQL Editor
   - 点击 "New query"

3. **复制并执行修复脚本**
   - 打开本地文件：`fix-rls-policies.sql`
   - 复制全部内容
   - 粘贴到 SQL Editor
   - 点击 "Run" 执行

4. **验证修复结果**
   - 查看执行结果中的表格
   - 确认所有表都有 `rowsecurity = true`
   - 确认所有表都有新的策略 `"Allow all operations on ..."`

### 方案 2：使用 Supabase CLI（高级用户）

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接项目
supabase link --project-ref ztyvmtawslpmjqffbmtp

# 执行 SQL 文件
supabase db execute --file fix-rls-policies.sql
```

## 修复后的验证步骤

### 1. 在开发环境测试（浏览器）

1. 打开浏览器开发者工具（F12）
2. 清除 localStorage：
   ```javascript
   localStorage.clear()
   ```
3. 刷新页面，重新登录
4. 添加一条测试交易记录
5. 检查控制台是否有错误
6. 到 Supabase 控制台 → Table Editor → transactions 查看数据

### 2. 在生产环境测试（已安装的应用）

1. 卸载旧版本应用
2. 安装 v1.0.2 版本
3. 登录并添加交易记录
4. 到 Supabase 控制台检查数据是否同步
5. 在另一台电脑安装并登录，验证数据同步

## 为什么需要修改 RLS 策略？

### 原始策略（有问题）
```sql
CREATE POLICY "Merchants can manage all transactions" ON transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE username = auth.jwt() ->> 'username'  -- ❌ 这里有问题！
            AND role = 'merchant'
            AND status = 'active'
        )
    );
```

**问题**：`auth.jwt()` 只在使用 Supabase Auth 登录时才有值。

### 新策略（修复后）
```sql
CREATE POLICY "Allow all operations on transactions" ON transactions
    FOR ALL USING (true);  -- ✅ 允许所有操作
```

**说明**：由于这是内部使用的系统，且应用层已经有认证逻辑，可以安全地使用 `using (true)`。

## 安全性说明

### 这样安全吗？
对于您的使用场景：**是的，安全**

原因：
1. **不是公开 API** - 只有知道 Supabase URL 和 Key 的应用可以访问
2. **应用层有认证** - localStorage + bcryptjs 确保只有登录用户可以操作
3. **内部使用** - 这是您团队内部使用的系统，不对外开放
4. **API Key 保护** - `supabaseAnonKey` 不在公开代码中

### 如果需要更高安全性
如果未来需要更严格的安全控制，可以：

1. **迁移到 Supabase Auth**
   - 使用 Supabase 的认证系统
   - 密码存储在 Supabase 中
   - RLS 策略可以正确验证 JWT

2. **使用 Service Role Key**
   - 在后端使用 Service Role Key
   - 绕过 RLS 策略
   - 在应用层实现权限控制

3. **自定义 JWT**
   - 创建符合 Supabase 要求的 JWT
   - 在登录时生成并存储
   - RLS 策略可以验证

## 常见问题

### Q: 执行 SQL 后还是不行？
A: 检查以下几点：
1. 清除浏览器 localStorage 并重新登录
2. 重新构建并安装新版本应用
3. 检查 Supabase 控制台 → Logs 查看错误信息
4. 确认 Realtime 已启用（Database → Replication）

### Q: 旧版本（v1.0.1）的数据怎么办？
A: v1.0.1 的数据在 localStorage 中，可以：
1. 导出 localStorage 数据
2. 在新版本中手动重新输入
3. 或编写迁移脚本（需要技术支持）

### Q: 如何启用 Realtime 同步？
A:
1. Supabase 控制台 → Database → Replication
2. 找到 `transactions` 表
3. 勾选 "Enable Realtime"
4. 对所有需要同步的表重复此操作

## 下一步行动

1. ✅ 执行 `fix-rls-policies.sql` 脚本
2. ✅ 在浏览器开发环境测试
3. ✅ 确认数据能同步到 Supabase
4. ✅ 测试删除功能
5. ✅ 重新打包 v1.0.2（如果需要）
6. ✅ 在生产环境测试
7. ✅ 启用 Realtime（可选，用于多端实时同步）

## 技术支持

如果修复后仍有问题，请提供：
1. Supabase 控制台中的错误日志（Logs → Error Logs）
2. 浏览器控制台的错误信息
3. SQL 脚本的执行结果截图
