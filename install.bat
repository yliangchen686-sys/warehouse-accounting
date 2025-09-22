@echo off
chcp 65001 > nul
echo.
echo ========================================
echo   仓储记账系统 - 自动安装脚本
echo ========================================
echo.

:: 检查 Node.js 是否安装
echo [1/5] 检查 Node.js 环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装，请先安装 Node.js 16+ 版本
    echo    下载地址: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js 环境检查通过
)

:: 检查 npm 是否可用
echo.
echo [2/5] 检查 npm 包管理器...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm 不可用
    pause
    exit /b 1
) else (
    echo ✅ npm 可用
)

:: 安装项目依赖
echo.
echo [3/5] 安装项目依赖...
echo 这可能需要几分钟时间，请耐心等待...
npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
) else (
    echo ✅ 依赖安装成功
)

:: 检查 electron 是否需要额外安装
echo.
echo [4/5] 检查 Electron...
if not exist "node_modules\electron" (
    echo 正在安装 Electron...
    npm install electron --save-dev
)
echo ✅ Electron 准备就绪

:: 提示配置 Supabase
echo.
echo [5/5] 配置提醒...
echo.
echo ⚠️  重要提醒：
echo    1. 请在 Supabase 创建新项目
echo    2. 在 SQL 编辑器中运行 database-setup.sql 脚本
echo    3. 修改 src/config/supabase.js 中的配置信息
echo    4. 替换 YOUR_SUPABASE_URL 和 YOUR_SUPABASE_ANON_KEY
echo.

:: 创建启动脚本
echo.
echo 创建启动脚本...
echo @echo off > start-dev.bat
echo echo 启动开发模式... >> start-dev.bat
echo start "React Dev Server" cmd /c "npm start" >> start-dev.bat
echo timeout /t 10 >> start-dev.bat
echo start "Electron App" cmd /c "npm run electron" >> start-dev.bat
echo echo 应用已启动，请在浏览器和 Electron 窗口中查看 >> start-dev.bat

echo @echo off > start-merchant.bat
echo echo 启动商人端... >> start-merchant.bat
echo start "Merchant App" cmd /c "npm run electron-dev" >> start-merchant.bat

echo @echo off > start-employee.bat
echo echo 启动员工端... >> start-employee.bat
echo set REACT_APP_ROLE=employee >> start-employee.bat
echo start "Employee App" cmd /c "npm run electron-dev" >> start-employee.bat

echo ✅ 启动脚本已创建

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 📋 下一步操作：
echo    1. 配置 Supabase（详见 README.md）
echo    2. 运行 start-dev.bat 启动开发模式
echo    3. 或运行 npm run electron-dev 启动应用
echo.
echo 📖 详细说明请查看 README.md 文件
echo 🔑 默认管理员账户: admin / admin123
echo.
echo 按任意键退出...
pause > nul


