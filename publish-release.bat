@echo off
chcp 65001 >nul
echo ====================================
echo 自动发布 GitHub Release
echo ====================================
echo.

REM 获取版本号
set VERSION=v1.0.2
set RELEASE_TITLE=v1.0.2 - 修复 Supabase 同步问题

echo 版本: %VERSION%
echo 标题: %RELEASE_TITLE%
echo.

REM 检查是否安装了 gh 命令
where gh >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 GitHub CLI (gh)
    echo.
    echo 请先安装 GitHub CLI:
    echo 1. 访问: https://cli.github.com/
    echo 2. 下载并安装 GitHub CLI
    echo 3. 运行: gh auth login
    echo.
    pause
    exit /b 1
)

REM 检查是否已登录
gh auth status >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未登录 GitHub
    echo.
    echo 请先登录:
    echo   gh auth login
    echo.
    pause
    exit /b 1
)

REM 检查发布文件是否存在
if not exist "release\仓储记账系统 Setup 1.0.2.exe" (
    echo [错误] 未找到安装包文件
    echo.
    echo 请先运行:
    echo   npm run build
    echo   npm run electron-pack
    echo.
    pause
    exit /b 1
)

echo ====================================
echo 准备发布...
echo ====================================
echo.

REM 创建 Release 说明文件
(
echo ## 🐛 重要修复
echo.
echo - 修复无法同步数据到 Supabase 的严重问题
echo - 自动清除旧的 localStorage 数据
echo - 添加缺失的 product_name 数据库字段
echo.
echo ## ⚠️ 重要说明
echo.
echo **安装前必须先在 Supabase 执行 SQL 脚本！**
echo.
echo 1. 登录 Supabase 控制台
echo 2. SQL Editor → New query
echo 3. 依次执行以下脚本（在仓库根目录）：
echo    - `simple-fix.sql`
echo    - `add-product-name-column.sql`
echo    - `fix-all-tables.sql`
echo.
echo ## 📦 安装说明
echo.
echo 1. 卸载旧版本（如果有）
echo 2. 下载 `仓储记账系统 Setup 1.0.2.exe`
echo 3. 运行安装程序
echo 4. 首次启动会自动清除旧数据
echo 5. 所有数据会从 Supabase 同步
echo.
echo ## ✨ 新功能
echo.
echo - ✅ 数据可靠同步到 Supabase
echo - ✅ 删除功能正常工作
echo - ✅ 自动清除旧的本地缓存数据
echo - ✅ 多端数据实时同步
echo.
echo ## 📝 SQL 脚本说明
echo.
echo ### simple-fix.sql
echo - 修复角色约束（支持 merchant, employee, admin, manager）
echo - 为核心表创建 RLS 策略
echo - 确保 admin 账户状态正常
echo.
echo ### add-product-name-column.sql
echo - 为 transactions 表添加 product_name 列
echo - 验证表结构
echo.
echo ### fix-all-tables.sql
echo - 为所有表创建统一的 RLS 策略
echo - 确保所有操作都被允许
echo.
echo ## 🔧 技术细节
echo.
echo ### 问题根源
echo 1. RLS 策略使用 `auth.jwt()` 验证，但应用使用 localStorage 认证
echo 2. `transactions` 表缺少 `product_name` 列导致插入失败（400 错误）
echo 3. 旧的 localStorage 数据干扰新数据显示和删除
echo.
echo ### 修复方案
echo 1. 将所有表的 RLS 策略改为 `using (true)` 允许所有操作
echo 2. 添加缺失的数据库字段
echo 3. 在应用启动时自动检测并清除旧的 localStorage 数据
echo.
echo ## 📋 完整更新日志
echo.
echo - 修复 RLS 策略配置错误
echo - 添加 transactions.product_name 列
echo - 自动清除旧的本地缓存数据
echo - 更新版本号至 1.0.2
echo - 包含完整的 SQL 修复脚本
echo.
echo ---
echo.
echo 🤖 Generated with [Claude Code](https://claude.com/claude-code^)
) > release_notes.txt

echo [1/3] 创建 Release...
gh release create %VERSION% ^
    --title "%RELEASE_TITLE%" ^
    --notes-file release_notes.txt ^
    "release\仓储记账系统 Setup 1.0.2.exe#仓储记账系统 Setup 1.0.2.exe" ^
    "release\仓储记账系统 Setup 1.0.2.exe.blockmap" ^
    "release\latest.yml" ^
    "simple-fix.sql" ^
    "add-product-name-column.sql" ^
    "fix-all-tables.sql"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [错误] 创建 Release 失败
    echo.
    pause
    exit /b 1
)

echo.
echo ====================================
echo ✅ Release 创建成功！
echo ====================================
echo.
echo 版本: %VERSION%
echo 查看: https://github.com/yliangchen686-sys/warehouse-accounting/releases/tag/%VERSION%
echo.

REM 清理临时文件
del release_notes.txt

echo 按任意键退出...
pause >nul
