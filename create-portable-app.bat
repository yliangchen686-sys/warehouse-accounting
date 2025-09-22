@echo off
chcp 65001 > nul
echo.
echo ========================================
echo   创建便携版仓储记账系统
echo ========================================
echo.

echo [1/4] 创建目录结构...
if exist "仓储记账系统-便携版" rmdir /s /q "仓储记账系统-便携版"
mkdir "仓储记账系统-便携版"
mkdir "仓储记账系统-便携版\resources"
mkdir "仓储记账系统-便携版\resources\app"

echo [2/4] 复制应用文件...
xcopy /E /I /Y build "仓储记账系统-便携版\resources\app\build\" > nul
copy public\electron.js "仓储记账系统-便携版\resources\app\" > nul
copy package.json "仓储记账系统-便携版\resources\app\" > nul

echo [3/4] 复制 Electron 运行时...
xcopy /E /I /Y node_modules\electron\dist\* "仓储记账系统-便携版\" > nul

echo [4/4] 创建启动脚本...
echo @echo off > "仓储记账系统-便携版\启动商人端.bat"
echo title 仓储记账系统 - 商人端 >> "仓储记账系统-便携版\启动商人端.bat"
echo electron.exe resources\app >> "仓储记账系统-便携版\启动商人端.bat"

echo @echo off > "仓储记账系统-便携版\启动员工端.bat"
echo title 仓储记账系统 - 员工端 >> "仓储记账系统-便携版\启动员工端.bat"
echo electron.exe resources\app >> "仓储记账系统-便携版\启动员工端.bat"

echo.
echo 创建说明文件...
echo 仓储记账系统 - 便携版 > "仓储记账系统-便携版\使用说明.txt"
echo. >> "仓储记账系统-便携版\使用说明.txt"
echo 使用方法： >> "仓储记账系统-便携版\使用说明.txt"
echo 1. 双击"启动商人端.bat"启动管理员界面 >> "仓储记账系统-便携版\使用说明.txt"
echo 2. 双击"启动员工端.bat"启动员工界面 >> "仓储记账系统-便携版\使用说明.txt"
echo. >> "仓储记账系统-便携版\使用说明.txt"
echo 默认账户： >> "仓储记账系统-便携版\使用说明.txt"
echo 商人账户: admin / admin123 >> "仓储记账系统-便携版\使用说明.txt"
echo 员工账户: xigua / xiguagua >> "仓储记账系统-便携版\使用说明.txt"
echo. >> "仓储记账系统-便携版\使用说明.txt"
echo 注意：首次使用需要配置 Supabase 数据库连接 >> "仓储记账系统-便携版\使用说明.txt"

echo.
echo ✅ 便携版创建完成！
echo 📁 输出目录: 仓储记账系统-便携版\
echo 📋 包含文件:
dir "仓储记账系统-便携版" /B
echo.
echo 您可以将整个"仓储记账系统-便携版"文件夹发送给其他人使用
echo.
pause


