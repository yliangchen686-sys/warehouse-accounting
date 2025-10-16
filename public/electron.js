const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// 简化的开发环境检测，避免依赖 electron-is-dev
const isDev = process.env.NODE_ENV === 'development' || process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);

// 配置自动更新
autoUpdater.autoDownload = false; // 不自动下载，先询问用户
autoUpdater.autoInstallOnAppQuit = true; // 退出时自动安装

let merchantWindow = null;
let employeeWindow = null;

function createMerchantWindow() {
  merchantWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    title: '仓储记账系统 - 商人端',
    icon: path.join(__dirname, 'icon.png')
  });

  const startUrl = isDev 
    ? 'http://localhost:3000?role=merchant' 
    : `file://${path.join(__dirname, '../build/index.html')}?role=merchant`;
  
  // 防止在开发模式下自动打开浏览器
  if (isDev) {
    process.env.BROWSER = 'none';
  }
  
  merchantWindow.loadURL(startUrl);

  if (isDev) {
    merchantWindow.webContents.openDevTools();
  }

  merchantWindow.on('closed', () => {
    merchantWindow = null;
  });
}

function createEmployeeWindow() {
  employeeWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    title: '仓储记账系统 - 员工端',
    icon: path.join(__dirname, 'icon.png')
  });

  const startUrl = isDev 
    ? 'http://localhost:3000?role=employee' 
    : `file://${path.join(__dirname, '../build/index.html')}?role=employee`;
  
  employeeWindow.loadURL(startUrl);

  if (isDev) {
    employeeWindow.webContents.openDevTools();
  }

  employeeWindow.on('closed', () => {
    employeeWindow = null;
  });
}

// 自动更新事件处理
autoUpdater.on('checking-for-update', () => {
  console.log('正在检查更新...');
});

autoUpdater.on('update-available', (info) => {
  console.log('发现新版本:', info.version);
  dialog.showMessageBox({
    type: 'info',
    title: '发现新版本',
    message: `发现新版本 ${info.version}，是否现在下载？\n\n当前版本: ${app.getVersion()}`,
    buttons: ['下载', '稍后'],
    defaultId: 0,
    cancelId: 1
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('当前已是最新版本');
});

autoUpdater.on('download-progress', (progressObj) => {
  const message = `下载速度: ${progressObj.bytesPerSecond} - 已下载 ${progressObj.percent}%`;
  console.log(message);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('更新下载完成');
  dialog.showMessageBox({
    type: 'info',
    title: '更新已下载',
    message: '新版本已下载完成，应用将在退出后自动更新。是否现在重启应用？',
    buttons: ['现在重启', '稍后'],
    defaultId: 0,
    cancelId: 1
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('自动更新出错:', err);
});

app.whenReady().then(() => {
  // 创建菜单
  const template = [
    {
      label: '窗口',
      submenu: [
        {
          label: '商人端',
          click: () => {
            if (!merchantWindow) {
              createMerchantWindow();
            } else {
              merchantWindow.focus();
            }
          }
        },
        {
          label: '员工端',
          click: () => {
            if (!employeeWindow) {
              createEmployeeWindow();
            } else {
              employeeWindow.focus();
            }
          }
        },
        { type: 'separator' },
        {
          label: '检查更新',
          click: () => {
            if (!isDev) {
              autoUpdater.checkForUpdates();
            } else {
              dialog.showMessageBox({
                type: 'info',
                title: '开发模式',
                message: '当前处于开发模式，无法检查更新'
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // 默认打开商人端
  createMerchantWindow();

  // 非开发环境下，启动后 3 秒检查更新
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!merchantWindow && !employeeWindow) {
    createMerchantWindow();
  }
});

// IPC 通信处理
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
