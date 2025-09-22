@echo off
chcp 65001 > nul
echo.
echo ========================================
echo   仓储记账系统 - 便携版打包
echo ========================================
echo.

echo [1/3] 构建 React 应用...
call npm run build
if errorlevel 1 (
    echo ❌ React 构建失败
    pause
    exit /b 1
)
echo ✅ React 构建完成

echo.
echo [2/3] 创建便携版目录...
if not exist "portable" mkdir portable
if not exist "portable\resources" mkdir portable\resources
if not exist "portable\resources\app" mkdir portable\resources\app

echo 复制文件...
xcopy /E /I /Y build portable\resources\app\build\ > nul
copy public\electron.js portable\resources\app\ > nul
copy package.json portable\resources\app\ > nul

echo.
echo [3/3] 复制 Node.js 和 Electron...
echo 注意：需要手动复制以下文件到 portable 目录：
echo 1. node.exe (从 Node.js 安装目录)
echo 2. electron.exe (从 node_modules\electron\dist)
echo 3. 相关 DLL 文件

echo.
echo ✅ 便携版文件准备完成！
echo 📁 输出目录: portable\
echo.
echo 手动完成步骤：
echo 1. 复制 node.exe 到 portable\
echo 2. 复制 electron 相关文件
echo 3. 创建启动脚本
echo.
pause


