import React, { useState, useEffect } from 'react';
import { Button, Avatar, Dropdown, message, Tabs } from 'antd';
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
import { authService } from '../../services/authService';
import { transactionService } from '../../services/transactionService';
import { syncService } from '../../services/syncService';
import ResponsiveAppShell from '../common/ResponsiveAppShell';
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
import { useIsMobile } from '../../hooks/useIsMobile';

const PAGE_TITLES = {
  dashboard: '仪表板',
  transactions: '交易记录',
  pendingRequests: '待审核交易',
  payments: '员工收款',
  customers: '客户绑定',
  customerData: '客户数据',
  gifts: '客户赠送',
  salary: '员工工资',
  bonusPool: '奖金池',
  employees: '员工管理',
};

const MerchantApp = ({ user, onLogout }) => {
  const isMobile = useIsMobile();
  const isAdmin = user.role === 'admin' || user.role === 'manager';
  const [selectedKey, setSelectedKey] = useState('dashboard');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const desktopMenu = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表板' },
    { key: 'transactions', icon: <ShoppingCartOutlined />, label: '交易记录' },
    { key: 'pendingRequests', icon: <CheckCircleOutlined />, label: '待审核交易' },
    { key: 'payments', icon: <WalletOutlined />, label: '员工收款' },
    { key: 'customers', icon: <LinkOutlined />, label: '客户绑定' },
    { key: 'customerData', icon: <PhoneOutlined />, label: '客户数据' },
    { key: 'gifts', icon: <GiftOutlined />, label: '客户赠送' },
    { key: 'salary', icon: <DollarOutlined />, label: '员工工资' },
    { key: 'bonusPool', icon: <TrophyOutlined />, label: '奖金池' },
    { key: 'employees', icon: <TeamOutlined />, label: '员工管理' },
  ];

  const mobileMenu = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: '首页', mobileLabel: '首页' },
    { key: 'transactions', icon: <ShoppingCartOutlined />, label: '交易', mobileLabel: '交易' },
    { key: 'pendingRequests', icon: <CheckCircleOutlined />, label: '审核', mobileLabel: '审核' },
    { key: 'payments', icon: <WalletOutlined />, label: '收款', mobileLabel: '收款' },
  ];

  const moreMenu = [
    { key: 'customers', icon: <LinkOutlined />, label: '客户绑定' },
    { key: 'customerData', icon: <PhoneOutlined />, label: '客户数据' },
    { key: 'gifts', icon: <GiftOutlined />, label: '客户赠送' },
    { key: 'salary', icon: <DollarOutlined />, label: '员工工资' },
    { key: 'bonusPool', icon: <TrophyOutlined />, label: '奖金池' },
    { key: 'employees', icon: <TeamOutlined />, label: '员工管理' },
  ];

  const refreshSyncStatus = () => {
    const status = syncService.getSyncStatus();
    setPendingSyncCount(status.pendingCount || 0);
    return status;
  };

  const runSync = async ({ silent = false } = {}) => {
    if (!syncService.canSync() || syncing) return null;
    const before = refreshSyncStatus();
    if (!before.needsSync) {
      if (!silent) message.info('本地没有待同步数据');
      return null;
    }
    setSyncing(true);
    const hide = silent ? null : message.loading('正在同步本地数据到云端...', 0);
    try {
      const result = await syncService.syncAll({ silent });
      refreshSyncStatus();
      if (result?.skipped) return result;
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
      if (!silent) message.error(error.message || '同步失败');
      return null;
    } finally {
      if (hide) hide();
      setSyncing(false);
      refreshSyncStatus();
    }
  };

  useEffect(() => {
    const subscription = transactionService.subscribeToTransactions((payload) => {
      if (payload.eventType === 'INSERT') message.success('新增交易记录');
      else if (payload.eventType === 'UPDATE') message.info('交易记录已更新');
      else if (payload.eventType === 'DELETE') message.warning('交易记录已删除');
    });
    return () => {
      if (subscription) transactionService.unsubscribeFromTransactions(subscription);
    };
  }, []);

  useEffect(() => {
    refreshSyncStatus();
    runSync({ silent: true });
    const onOnline = () => runSync({ silent: true });
    window.addEventListener('online', onOnline);
    const timer = setInterval(() => {
      const status = refreshSyncStatus();
      if (status.needsSync && navigator.onLine) runSync({ silent: true });
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
    runSync({ silent: true });
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人资料', disabled: true },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
    ],
  };

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
        return <Dashboard isMobile={isMobile} />;
      case 'transactions':
        return <TransactionList isMobile={isMobile} />;
      case 'pendingRequests':
        return (
          <Tabs
            defaultActiveKey="pending"
            items={[
              { key: 'pending', label: '待审核', children: <PendingTransactionRequests user={user} /> },
              { key: 'history', label: '审核历史', children: <TransactionRequestHistory user={user} /> },
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
        return <SalaryManagement user={user} />;
      case 'bonusPool':
        return <BonusPool user={user} />;
      case 'employees':
        return <EmployeeManagement />;
      default:
        return <Dashboard isMobile={isMobile} />;
    }
  };

  const roleLabel = isAdmin ? '管理员端' : '商人端';
  const mobileSubtitle = PAGE_TITLES[selectedKey] || roleLabel;

  return (
    <ResponsiveAppShell
      headerTitle={isMobile ? user.name : `${roleLabel} - 管理中心`}
      headerSubtitle={isMobile ? mobileSubtitle : undefined}
      headerExtra={
        <div className="merchant-header-actions">
          <Button
            icon={<CloudSyncOutlined />}
            onClick={() => runSync({ silent: false })}
            loading={syncing}
            size={isMobile ? 'middle' : 'large'}
          >
            {!isMobile && (pendingSyncCount > 0 ? `同步云端(${pendingSyncCount})` : '同步云端')}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddTransaction}
            size={isMobile ? 'middle' : 'large'}
          >
            {!isMobile && '添加交易'}
          </Button>
          <Dropdown menu={userMenu} placement="bottomRight">
            <div className="app-shell-user">
              <Avatar icon={<UserOutlined />} size={isMobile ? 'small' : 'default'} />
              {!isMobile && <span className="app-shell-user-name">{user.name}</span>}
            </div>
          </Dropdown>
        </div>
      }
      menuItems={desktopMenu}
      mobileMenuItems={mobileMenu}
      moreMenuItems={moreMenu}
      selectedKey={selectedKey}
      onMenuClick={handleMenuClick}
    >
      {renderContent()}
    </ResponsiveAppShell>
  );
};

export default MerchantApp;
