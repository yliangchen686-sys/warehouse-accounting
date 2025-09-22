import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons';
import { authService } from '../services/authService';

const { Title, Text } = Typography;

const Login = ({ onLogin, userRole }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const user = await authService.login(values.username, values.password);
      
      // 根据用户角色显示欢迎信息
      if (user.role === 'merchant') {
        message.success(`欢迎回来，${user.name}！进入商人端管理中心`);
      } else {
        message.success(`欢迎回来，${user.name}！进入员工端查看中心`);
      }
      
      onLogin(user);
    } catch (error) {
      message.error(error.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const roleInfo = {
    icon: <ShopOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
    title: '系统登录',
    description: '仓储记账系统'
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Space direction="vertical" size="large">
            {roleInfo.icon}
            <div>
              <Title level={2} style={{ margin: 0, color: '#1f1f1f' }}>
                仓储记账系统
              </Title>
              <Title level={4} style={{ margin: '8px 0', color: '#666' }}>
                {roleInfo.title}
              </Title>
              <Text type="secondary">{roleInfo.description}</Text>
            </div>
          </Space>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, message: '用户名至少2个字符' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 48,
                fontSize: 16,
                fontWeight: 'bold'
              }}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
        </Form>

      </Card>
    </div>
  );
};

export default Login;
