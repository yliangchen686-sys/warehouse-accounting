@echo off
chcp 65001 >nul
echo ====================================
echo 查找并清除仓储记账系统数据
echo ====================================
echo.

echo 正在查找应用数据文件夹...
echo.

set FOUND=0

echo [1] 检查 AppData\Roaming...
if exist "%APPDATA%\仓储记账系统" (
    echo    找到: %APPDATA%\仓储记账系统
    set FOUND=1
)
if exist "%APPDATA%\warehouse-accounting" (
    echo    找到: %APPDATA%\warehouse-accounting
    set FOUND=1
)

echo.
echo [2] 检查 AppData\Local...
if exist "%LOCALAPPDATA%\仓储记账系统" (
    echo    找到: %LOCALAPPDATA%\仓储记账系统
    set FOUND=1
)
if exist "%LOCALAPPDATA%\warehouse-accounting" (
    echo    找到: %LOCALAPPDATA%\warehouse-accounting
    set FOUND=1
)

echo.
echo [3] 检查 Electron 缓存...
if exist "%APPDATA%\Electron" (
    echo    找到: %APPDATA%\Electron
    set FOUND=1
)

echo.
echo ====================================
echo 即将删除以下数据
echo ====================================
echo.

if %FOUND%==0 (
    echo 未找到应用数据文件夹
    pause
    exit
)

echo 请先完全关闭"仓储记账系统"应用！
echo.
pause

echo.
echo 正在删除数据...
echo.

if exist "%APPDATA%\仓储记账系统" (
    rd /s /q "%APPDATA%\仓储记账系统"
    echo [√] 已删除 %APPDATA%\仓储记账系统
)

if exist "%APPDATA%\warehouse-accounting" (
    rd /s /q "%APPDATA%\warehouse-accounting"
    echo [√] 已删除 %APPDATA%\warehouse-accounting
)

if exist "%LOCALAPPDATA%\仓储记账系统" (
    rd /s /q "%LOCALAPPDATA%\仓储记账系统"
    echo [√] 已删除 %LOCALAPPDATA%\仓储记账系统
)

if exist "%LOCALAPPDATA%\warehouse-accounting" (
    rd /s /q "%LOCALAPPDATA%\warehouse-accounting"
    echo [√] 已删除 %LOCALAPPDATA%\warehouse-accounting
)

echo.
echo ====================================
echo 清除完成！
echo ====================================
echo.
echo 现在您可以重新打开应用，旧的 localStorage 数据应该已被清除。
echo.
pause
