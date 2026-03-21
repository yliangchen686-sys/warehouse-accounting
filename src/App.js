import React, { useState, useEffect } from 'react';
import { ConfigProvider, Alert } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { authService } from './services/authService';
import { supabase } from './config/supabase';
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
  const [supabaseConnected, setSupabaseConnected] = useState(null); // null=检测中 true=已连接 false=未连接

  // 检测 Supabase 是否可连接
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { error } = await supabase.from('employees').select('id').limit(1);
        if (!cancelled) setSupabaseConnected(!error);
        if (error) console.warn('Supabase 连接检测失败:', error.message);
      } catch (e) {
        if (!cancelled) setSupabaseConnected(false);
        console.warn('Supabase 连接异常:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // 从 URL 参数获取角色
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    if (roleParam === 'employee' || roleParam === 'merchant') {
      setUserRole(roleParam);
    }

    // 一次性清除旧的 localStorage 数据（临时代码）
    const hasCleared = localStorage.getItem('_data_cleared_v1');
    if (!hasCleared) {
      console.log('检测到首次运行 v1.0.2，清除旧的 localStorage 数据...');
      localStorage.removeItem('localTransactions');
      localStorage.removeItem('localEmployeeTransfers');
      localStorage.removeItem('localMerchantWithdrawals');
      localStorage.setItem('_data_cleared_v1', 'true');
      console.log('旧数据已清除');
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
        {user && supabaseConnected === false && (
          <Alert
            type="warning"
            showIcon
            message="未连接到 Supabase"
            description="当前仅显示本地数据，列表可能为空。请检查网络、Supabase 项目是否暂停，或打开浏览器控制台(F12)查看具体错误。"
            style={{ marginBottom: 0, borderRadius: 0 }}
            closable
          />
        )}
        {!user ? (
          <Login onLogin={handleLogin} userRole={userRole} />
        ) : (
          <>
            {user.role === 'merchant' || user.role === 'admin' || user.role === 'manager' ? (
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


