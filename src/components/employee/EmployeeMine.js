import React from 'react';
import { Card, List, Tag } from 'antd';
import {
  FileAddOutlined,
  TrophyOutlined,
  LogoutOutlined,
  UserOutlined,
  EyeOutlined
} from '@ant-design/icons';

const EmployeeMine = ({ user, onNavigate, onLogout }) => {
  const items = [
    {
      key: 'transactionRequest',
      icon: <FileAddOutlined />,
      title: '申请交易',
      desc: '提交交易申请、查看我的申请',
    },
    {
      key: 'bonusPool',
      icon: <TrophyOutlined />,
      title: '奖金池',
      desc: '查看奖金池信息',
    },
  ];

  return (
    <div className="employee-mine">
      <Card className="employee-mine-profile" bordered={false}>
        <div className="employee-mine-avatar">
          <UserOutlined />
        </div>
        <div className="employee-mine-info">
          <div className="employee-mine-name">{user.name}</div>
          <Tag color="green" icon={<EyeOutlined />}>只读模式</Tag>
        </div>
      </Card>

      <List
        className="employee-mine-list"
        dataSource={items}
        renderItem={(item) => (
          <List.Item
            className="employee-mine-list-item"
            onClick={() => onNavigate(item.key)}
          >
            <List.Item.Meta
              avatar={<span className="employee-mine-list-icon">{item.icon}</span>}
              title={item.title}
              description={item.desc}
            />
          </List.Item>
        )}
      />

      <List className="employee-mine-list">
        <List.Item className="employee-mine-list-item employee-mine-logout" onClick={onLogout}>
          <List.Item.Meta
            avatar={<span className="employee-mine-list-icon"><LogoutOutlined /></span>}
            title="退出登录"
            description="安全退出当前账号"
          />
        </List.Item>
      </List>
    </div>
  );
};

export default EmployeeMine;
