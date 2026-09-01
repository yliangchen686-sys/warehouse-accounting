import React, { useState, useEffect } from 'react';
import { Avatar, Dropdown, message, notification, Tag, Tabs } from 'antd';
import {
  ShoppingCartOutlined,
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  DollarOutlined,
  CalendarOutlined,
  PhoneOutlined,
  FileAddOutlined,
  TrophyOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { authService } from '../../services/authService';
import { transactionService } from '../../services/transactionService';
import ResponsiveAppShell from '../common/ResponsiveAppShell';
import EmployeeTransactionList from './EmployeeTransactionList';
import EmployeeSalary from './EmployeeSalary';
import EmployeeTasks from './EmployeeTasks';
import BonusPool from '../merchant/BonusPool';
import CustomerData from './CustomerData';
import TransactionRequestForm from './TransactionRequestForm';
import TransactionRequestList from './TransactionRequestList';
import EmployeeMine from './EmployeeMine';
import { useIsMobile } from '../../hooks/useIsMobile';

const DESKTOP_MENU = [
  { key: 'transactions', icon: <ShoppingCartOutlined />, label: '我的交易记录' },
  { key: 'salary', icon: <DollarOutlined />, label: '本月工资' },
  { key: 'tasks', icon: <CalendarOutlined />, label: '本月任务' },
  { key: 'customerData', icon: <PhoneOutlined />, label: '客户数据' },
  { key: 'transactionRequest', icon: <FileAddOutlined />, label: '申请交易' },
  { key: 'bonusPool', icon: <TrophyOutlined />, label: '奖金池' },
];

const MOBILE_MENU = [
  { key: 'transactions', icon: <ShoppingCartOutlined />, label: '交易', mobileLabel: '交易' },
  { key: 'salary', icon: <DollarOutlined />, label: '工资', mobileLabel: '工资' },
  { key: 'tasks', icon: <CalendarOutlined />, label: '任务', mobileLabel: '任务' },
  { key: 'customerData', icon: <PhoneOutlined />, label: '客户', mobileLabel: '客户' },
  { key: 'mine', icon: <UserOutlined />, label: '我的', mobileLabel: '我的' },
];

const PAGE_TITLES = {
  transactions: '我的交易记录',
  salary: '本月工资',
  tasks: '本月任务',
  customerData: '客户数据',
  transactionRequest: '申请交易',
  bonusPool: '奖金池',
  mine: '我的',
};

const EmployeeApp = ({ user, onLogout }) => {
  const isMobile = useIsMobile();
  const [selectedKey, setSelectedKey] = useState('transactions');
  const [newTransactionCount, setNewTransactionCount] = useState(0);

  useEffect(() => {
    const subscription = transactionService.subscribeToTransactions((payload) => {
      if (payload.eventType === 'INSERT') {
        setNewTransactionCount((prev) => prev + 1);
        notification.success({
          message: '新交易记录',
          description: '有新的交易记录添加',
          icon: <BellOutlined style={{ color: '#52c41a' }} />,
          placement: 'topRight',
          duration: 4,
        });
      } else if (payload.eventType === 'UPDATE') {
        notification.info({
          message: '交易记录更新',
          description: '有交易记录被修改',
          icon: <BellOutlined style={{ color: '#1890ff' }} />,
          placement: 'topRight',
          duration: 3,
        });
      } else if (payload.eventType === 'DELETE') {
        notification.warning({
          message: '交易记录删除',
          description: '有交易记录被删除',
          icon: <BellOutlined style={{ color: '#faad14' }} />,
          placement: 'topRight',
          duration: 3,
        });
      }
    });

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
    if (key === 'transactions') {
      setNewTransactionCount(0);
    }
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人资料', disabled: true },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
    ],
  };

  const renderContent = () => {
    switch (selectedKey) {
      case 'transactions':
        return <EmployeeTransactionList user={user} isMobile={isMobile} />;
      case 'salary':
        return <EmployeeSalary user={user} />;
      case 'tasks':
        return <EmployeeTasks user={user} />;
      case 'customerData':
        return <CustomerData user={user} />;
      case 'mine':
        return (
          <EmployeeMine
            user={user}
            onNavigate={handleMenuClick}
            onLogout={handleLogout}
          />
        );
      case 'transactionRequest':
        return (
          <Tabs
            defaultActiveKey="form"
            items={[
              {
                key: 'form',
                label: '提交申请',
                children: <TransactionRequestForm user={user} onSuccess={() => {}} />,
              },
              {
                key: 'list',
                label: '我的申请',
                children: <TransactionRequestList user={user} />,
              },
            ]}
          />
        );
      case 'bonusPool':
        return <BonusPool user={user} />;
      default:
        return <EmployeeTransactionList user={user} isMobile={isMobile} />;
    }
  };

  const mobileSubtitle =
    selectedKey === 'transactions'
      ? '我的交易 · 实时同步中'
      : PAGE_TITLES[selectedKey] || '员工端';

  const headerBadge = !isMobile ? (
    <Tag color="success" icon={<EyeOutlined />} className="app-shell-readonly-badge">
      只读模式
    </Tag>
  ) : selectedKey === 'transactions' ? (
    <Tag color="blue" className="app-shell-readonly-badge">只读</Tag>
  ) : null;

  return (
    <ResponsiveAppShell
      headerTitle={isMobile ? user.name : '员工端 - 查看中心'}
      headerSubtitle={isMobile ? mobileSubtitle : undefined}
      headerBadge={headerBadge}
      headerExtra={
        <Dropdown menu={userMenu} placement="bottomRight">
          <div className="app-shell-user">
            <Avatar icon={<UserOutlined />} size={isMobile ? 'small' : 'default'} />
            {!isMobile && <span className="app-shell-user-name">{user.name}</span>}
          </div>
        </Dropdown>
      }
      menuItems={DESKTOP_MENU}
      mobileMenuItems={MOBILE_MENU}
      selectedKey={selectedKey}
      onMenuClick={handleMenuClick}
    >
      {renderContent()}
    </ResponsiveAppShell>
  );
};

export default EmployeeApp;
