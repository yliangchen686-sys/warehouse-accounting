const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

// 简化的开发环境检测，避免依赖 electron-is-dev
const isDev = process.env.NODE_ENV === 'development' || process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);

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
