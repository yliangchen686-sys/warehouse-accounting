# 手动下载 Electron 打包指南

## 📥 手动下载步骤

### 1. 下载 Electron
- **下载地址**: https://github.com/electron/electron/releases/download/v22.3.27/electron-v22.3.27-win32-x64.zip
- **文件大小**: ~97MB
- **保存位置**: 下载到桌面或临时文件夹

### 2. 设置 Electron 缓存
```bash
# 创建缓存目录
mkdir %USERPROFILE%\AppData\Local\electron\Cache\22.3.27

# 复制下载的文件到缓存目录
copy electron-v22.3.27-win32-x64.zip %USERPROFILE%\AppData\Local\electron\Cache\22.3.27\
```

### 3. 重新打包
```bash
npm run electron-pack
```

## 🌐 替代方案：使用国内镜像

### 设置 Electron 镜像
```bash
# 设置环境变量
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_CUSTOM_DIR=22.3.27

# 重新安装 Electron
npm install electron --save-dev

# 打包
npm run electron-pack
```

## 📦 离线打包方案

如果网络问题持续，可以使用我们已经创建的便携版：

### 便携版优势
- ✅ 无需下载额外文件
- ✅ 可以直接分发
- ✅ 包含所有必要组件
- ✅ 双击即可运行

### 便携版使用
1. 将"仓储记账系统-便携版"文件夹打包成 ZIP
2. 发送给其他人
3. 解压后双击启动脚本即可使用

## 🎯 推荐方案

考虑到网络问题，建议使用便携版方案，这样可以：
- 避免网络下载问题
- 确保所有依赖都包含
- 方便分发和使用


