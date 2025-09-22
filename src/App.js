import React, { useState, useEffect } from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { authService } from './services/authService';
import Login from './components/Login';
import MerchantApp from './components/merchant/MerchantApp';
import EmployeeApp from './components/employee/EmployeeApp';
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// 配置 dayjs
dayjs.locale('zh-cn');
dayjs.extend(relativeTime);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('merchant'); // 默认商人端

  useEffect(() => {
    // 从 URL 参数获取角色
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    if (roleParam === 'employee' || roleParam === 'merchant') {
      setUserRole(roleParam);
    }

    // 检查是否已登录
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: 18 }}>
          正在加载...
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider locale={zhCN}>
      <div className="App">
        {!user ? (
          <Login onLogin={handleLogin} userRole={userRole} />
        ) : (
          <>
            {user.role === 'merchant' ? (
              <MerchantApp user={user} onLogout={handleLogout} />
            ) : (
              <EmployeeApp user={user} onLogout={handleLogout} />
            )}
          </>
        )}
      </div>
    </ConfigProvider>
  );
}

export default App;


