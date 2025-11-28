import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, message, notification } from 'antd';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  LogoutOutlined,
  UserOutlined,
  EyeOutlined,
  BellOutlined,
  DollarOutlined,
  CalendarOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { authService } from '../../services/authService';
import { transactionService } from '../../services/transactionService';
import EmployeeTransactionList from './EmployeeTransactionList';
import EmployeeSalary from './EmployeeSalary';
import EmployeeTasks from './EmployeeTasks';
import BonusPool from '../merchant/BonusPool';

const { Header, Sider, Content } = Layout;

const EmployeeApp = ({ user, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('transactions');
  const [realtimeSubscription, setRealtimeSubscription] = useState(null);
  const [newTransactionCount, setNewTransactionCount] = useState(0);

  useEffect(() => {
    // 订阅实时交易记录更新
    const subscription = transactionService.subscribeToTransactions((payload) => {
      if (payload.eventType === 'INSERT') {
        setNewTransactionCount(prev => prev + 1);
        
        // 显示新交易通知
        notification.success({
          message: '新交易记录',
          description: `有新的交易记录添加`,
          icon: <BellOutlined style={{ color: '#52c41a' }} />,
          placement: 'topRight',
          duration: 4
        });
      } else if (payload.eventType === 'UPDATE') {
        notification.info({
          message: '交易记录更新',
          description: '有交易记录被修改',
          icon: <BellOutlined style={{ color: '#1890ff' }} />,
          placement: 'topRight',
          duration: 3
        });
      } else if (payload.eventType === 'DELETE') {
        notification.warning({
          message: '交易记录删除',
          description: '有交易记录被删除',
          icon: <BellOutlined style={{ color: '#faad14' }} />,
          placement: 'topRight',
          duration: 3
        });
      }
    });

    setRealtimeSubscription(subscription);

    return () => {
      if (subscription) {
        transactionService.unsubscribeFromTransactions(subscription);
      }
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    message.success('已安全退出');
    onLogout();
  };

  const handleMenuClick = (key) => {
    setSelectedKey(key);
    
    // 如果点击交易记录，清除新交易提示
    if (key === 'transactions') {
      setNewTransactionCount(0);
    }
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        个人资料
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  const renderContent = () => {
    switch (selectedKey) {
      case 'transactions':
        return <EmployeeTransactionList user={user} />;
      case 'salary':
        return <EmployeeSalary user={user} />;
      case 'tasks':
        return <EmployeeTasks user={user} />;
      case 'bonusPool':
        return <BonusPool user={user} />;
      default:
        return <EmployeeTransactionList user={user} />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={240}
      >
        <div style={{
          height: 32,
          margin: 16,
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          {!collapsed ? '仓储记账系统' : '记账'}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => handleMenuClick(key)}
        >
          <Menu.Item key="transactions" icon={<ShoppingCartOutlined />}>
            我的交易记录
          </Menu.Item>
          <Menu.Item key="salary" icon={<DollarOutlined />}>
            本月工资
          </Menu.Item>
          <Menu.Item key="tasks" icon={<CalendarOutlined />}>
            本月任务
          </Menu.Item>
          <Menu.Item key="bonusPool" icon={<TrophyOutlined />}>
            奖金池
          </Menu.Item>
        </Menu>
      </Sider>

      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 style={{ margin: 0, color: '#1f1f1f' }}>
              员工端 - 查看中心
            </h2>
            <EyeOutlined style={{ fontSize: 16, color: '#666' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              padding: '4px 12px',
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 4,
              fontSize: 12,
              color: '#389e0d'
            }}>
              只读模式
            </div>

            <Dropdown overlay={userMenu} placement="bottomRight">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: 6,
                transition: 'background-color 0.3s'
              }}>
                <Avatar icon={<UserOutlined />} />
                <span style={{ fontWeight: 500 }}>{user.name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{
          margin: '24px',
          padding: '24px',
          background: '#fff',
          borderRadius: 8,
          minHeight: 'calc(100vh - 112px)'
        }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default EmployeeApp;
