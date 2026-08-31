import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, message } from 'antd';
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  LogoutOutlined,
  UserOutlined,
  PlusOutlined,
  WalletOutlined,
  LinkOutlined,
  DollarOutlined,
  GiftOutlined,
  TrophyOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined
} from '@ant-design/icons';
import { Tabs } from 'antd';
import { authService } from '../../services/authService';
import { transactionService } from '../../services/transactionService';
import { syncService } from '../../services/syncService';
import TransactionList from './TransactionList';
import TransactionForm from './TransactionForm';
import EmployeeManagement from './EmployeeManagement';
import EmployeePaymentManagement from './EmployeePaymentManagement';
import CustomerBindingManagement from './CustomerBindingManagement';
import CustomerGiftManagement from './CustomerGiftManagement';
import SalaryManagement from './SalaryManagement';
import BonusPool from './BonusPool';
import Dashboard from './Dashboard';
import CustomerDataManagement from './CustomerDataManagement';
import PendingTransactionRequests from './PendingTransactionRequests';
import TransactionRequestHistory from './TransactionRequestHistory';

const { Header, Sider, Content } = Layout;

const MerchantApp = ({ user, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('dashboard');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [realtimeSubscription, setRealtimeSubscription] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const refreshSyncStatus = () => {
    const status = syncService.getSyncStatus();
    setPendingSyncCount(status.pendingCount || 0);
    return status;
  };

  const runSync = async ({ silent = false } = {}) => {
    if (!syncService.canSync() || syncing) return null;

    const before = refreshSyncStatus();
    if (!before.needsSync) {
      if (!silent) {
        message.info('本地没有待同步数据');
      }
      return null;
    }

    setSyncing(true);
    const hide = silent ? null : message.loading('正在同步本地数据到云端...', 0);
    try {
      const result = await syncService.syncAll({ silent });
      refreshSyncStatus();

      if (result?.skipped) {
        return result;
      }

      if (result?.totalSynced > 0) {
        message.success(result.message || `已同步 ${result.totalSynced} 条数据`);
      } else if (result?.totalFailed > 0) {
        message.warning(result.message || '同步失败，请检查网络后重试');
      } else if (!silent) {
        message.info(result?.message || '没有需要上传的新数据');
      }

      return result;
    } catch (error) {
      console.error('同步失败:', error);
      if (!silent) {
        message.error(error.message || '同步失败');
      }
      return null;
    } finally {
      if (hide) hide();
      setSyncing(false);
      refreshSyncStatus();
    }
  };

  useEffect(() => {
    // 订阅实时交易记录更新
    const subscription = transactionService.subscribeToTransactions((payload) => {
      if (payload.eventType === 'INSERT') {
        message.success('新增交易记录');
      } else if (payload.eventType === 'UPDATE') {
        message.info('交易记录已更新');
      } else if (payload.eventType === 'DELETE') {
        message.warning('交易记录已删除');
      }
    });

    setRealtimeSubscription(subscription);

    return () => {
      if (subscription) {
        transactionService.unsubscribeFromTransactions(subscription);
      }
    };
  }, []);

  // 登录进入管理端后自动同步；网络恢复时再试一次
  useEffect(() => {
    refreshSyncStatus();
    runSync({ silent: true });

    const onOnline = () => {
      runSync({ silent: true });
    };
    window.addEventListener('online', onOnline);

    const timer = setInterval(() => {
      const status = refreshSyncStatus();
      if (status.needsSync && navigator.onLine) {
        runSync({ silent: true });
      }
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', onOnline);
      clearInterval(timer);
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    message.success('已安全退出');
    onLogout();
  };

  const handleManualSync = () => {
    runSync({ silent: false });
  };

  const handleMenuClick = (key) => {
    setSelectedKey(key);
    setShowTransactionForm(false);
  };

  const handleAddTransaction = () => {
    setShowTransactionForm(true);
    setSelectedKey('transactions');
  };

  const handleTransactionSubmit = () => {
    setShowTransactionForm(false);
    message.success('交易记录已保存');
    // 若刚才因网络失败落在本地，立刻尝试推上云
    runSync({ silent: true });
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
    if (showTransactionForm) {
      return (
        <TransactionForm
          onSubmit={handleTransactionSubmit}
          onCancel={() => setShowTransactionForm(false)}
        />
      );
    }

    switch (selectedKey) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <TransactionList />;
      case 'pendingRequests':
        return (
          <Tabs
            defaultActiveKey="pending"
            items={[
              {
                key: 'pending',
                label: '待审核',
                children: <PendingTransactionRequests user={user} />
              },
              {
                key: 'history',
                label: '审核历史',
                children: <TransactionRequestHistory user={user} />
              }
            ]}
          />
        );
      case 'payments':
        return <EmployeePaymentManagement user={user} />;
      case 'customers':
        return <CustomerBindingManagement />;
      case 'customerData':
        return <CustomerDataManagement user={user} />;
      case 'gifts':
        return <CustomerGiftManagement />;
      case 'salary':
        return <SalaryManagement />;
      case 'bonusPool':
        return <BonusPool user={user} />;
      case 'employees':
        return <EmployeeManagement />;
      default:
        return <Dashboard />;
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
          <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
            仪表板
          </Menu.Item>
          <Menu.Item key="transactions" icon={<ShoppingCartOutlined />}>
            交易记录
          </Menu.Item>
          <Menu.Item key="pendingRequests" icon={<CheckCircleOutlined />}>
            待审核交易
          </Menu.Item>
          <Menu.Item key="payments" icon={<WalletOutlined />}>
            员工收款
          </Menu.Item>
          <Menu.Item key="customers" icon={<LinkOutlined />}>
            客户绑定
          </Menu.Item>
          <Menu.Item key="customerData" icon={<PhoneOutlined />}>
            客户数据
          </Menu.Item>
          <Menu.Item key="gifts" icon={<GiftOutlined />}>
            客户赠送
          </Menu.Item>
          <Menu.Item key="salary" icon={<DollarOutlined />}>
            员工工资
          </Menu.Item>
          <Menu.Item key="bonusPool" icon={<TrophyOutlined />}>
            奖金池
          </Menu.Item>
          <Menu.Item key="employees" icon={<TeamOutlined />}>
            员工管理
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
              {user.role === 'admin' || user.role === 'manager' ? '管理员端' : '商人端'} - 管理中心
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              icon={<CloudSyncOutlined />}
              onClick={handleManualSync}
              loading={syncing}
              size="large"
            >
              {pendingSyncCount > 0 ? `同步云端(${pendingSyncCount})` : '同步云端'}
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddTransaction}
              size="large"
            >
              添加交易
            </Button>

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

export default MerchantApp;
