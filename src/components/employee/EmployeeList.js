import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Tag,
  Row,
  Col,
  Alert,
  Button,
  Statistic,
  Avatar,
  Space
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
  ReloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { authService } from '../../services/authService';
import { employeeStatus, roles } from '../../config/supabase';
import dayjs from 'dayjs';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    merchants: 0
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await authService.getActiveEmployees();
      setEmployees(data);
      
      // 计算统计信息
      const newStats = {
        total: data.length,
        active: data.filter(emp => emp.status === 'active').length,
        inactive: data.filter(emp => emp.status === 'inactive').length,
        merchants: data.filter(emp => emp.role === 'merchant').length
      };
      setStats(newStats);
    } catch (error) {
      console.error('加载员工列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    return role === 'merchant' ? 'blue' : 'green';
  };

  const getRoleIcon = (role) => {
    return role === 'merchant' ? <CrownOutlined /> : <UserOutlined />;
  };

  const columns = [
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      render: (_, record) => (
        <Avatar 
          icon={getRoleIcon(record.role)}
          style={{ 
            backgroundColor: record.role === 'merchant' ? '#1890ff' : '#52c41a' 
          }}
        />
      ),
      width: 60
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>@{record.username}</div>
        </div>
      ),
      width: 150
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={getRoleColor(role)} icon={getRoleIcon(role)}>
          {roles[role]}
        </Tag>
      ),
      width: 100,
      filters: [
        { text: '商人', value: 'merchant' },
        { text: '员工', value: 'employee' }
      ],
      onFilter: (value, record) => record.role === value
    },
    {
      title: '入职时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => (
        <div>
          <div>{dayjs(text).format('YYYY-MM-DD')}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {dayjs(text).fromNow()}
          </div>
        </div>
      ),
      width: 120,
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix()
    },
    {
      title: '在职天数',
      key: 'workDays',
      render: (_, record) => {
        const days = dayjs().diff(dayjs(record.created_at), 'day');
        return (
          <Statistic
            value={days}
            suffix="天"
            valueStyle={{ fontSize: 14 }}
          />
        );
      },
      width: 100,
      sorter: (a, b) => {
        const daysA = dayjs().diff(dayjs(a.created_at), 'day');
        const daysB = dayjs().diff(dayjs(b.created_at), 'day');
        return daysA - daysB;
      }
    }
  ];

  return (
    <div>
      <Alert
        message="员工信息查看"
        description="您可以查看所有在职员工的基本信息，包括姓名、角色和入职时间等。"
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        closable
        style={{ marginBottom: 16 }}
      />

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="总员工数"
              value={stats.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="在职员工"
              value={stats.active}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="管理员"
              value={stats.merchants}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small">
            <Statistic
              title="普通员工"
              value={stats.total - stats.merchants}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 员工列表 */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>在职员工列表</h3>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadEmployees}
            loading={loading}
          >
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={employees}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            pageSize: 10
          }}
          size="small"
        />

        {employees.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <UserOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>暂无员工信息</div>
          </div>
        )}
      </Card>

      {/* 团队信息卡片 */}
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="团队成员" size="small">
            <Row gutter={[16, 16]}>
              {employees.map(employee => (
                <Col xs={24} sm={12} md={8} lg={6} key={employee.id}>
                  <Card
                    size="small"
                    style={{
                      background: employee.role === 'merchant' ? '#e6f7ff' : '#f6ffed',
                      border: `1px solid ${employee.role === 'merchant' ? '#91d5ff' : '#b7eb8f'}`
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <Avatar
                        size={48}
                        icon={getRoleIcon(employee.role)}
                        style={{
                          backgroundColor: employee.role === 'merchant' ? '#1890ff' : '#52c41a',
                          marginBottom: 8
                        }}
                      />
                      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                        {employee.name}
                      </div>
                      <Tag
                        color={getRoleColor(employee.role)}
                        icon={getRoleIcon(employee.role)}
                        style={{ marginBottom: 4 }}
                      >
                        {roles[employee.role]}
                      </Tag>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        入职: {dayjs(employee.created_at).format('YYYY-MM-DD')}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        已工作 {dayjs().diff(dayjs(employee.created_at), 'day')} 天
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EmployeeList;


