import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Card,
  Space,
  message,
  Popconfirm,
  Tag,
  Row,
  Col
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { authService } from '../../services/authService';
import { employeeStatus, roles } from '../../config/supabase';
import dayjs from 'dayjs';

const { Option } = Select;

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await authService.getAllEmployees();
      console.log('加载的员工数据:', data); // 调试信息
      setEmployees(data);
      
      if (data && data.length > 0) {
        console.log('员工角色信息:', data.map(emp => ({ name: emp.name, role: emp.role }))); // 调试角色信息
      }
    } catch (error) {
      message.error('加载员工列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    form.resetFields();
    form.setFieldsValue({ role: 'employee', status: 'active' });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingEmployee(record);
    form.setFieldsValue({
      name: record.name,
      username: record.username,
      role: record.role,
      status: record.status
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      console.log('提交的表单数据:', values); // 调试信息
      
      if (editingEmployee) {
        // 更新员工
        const updateData = {
          name: values.name,
          role: values.role, // 添加角色字段
          status: values.status
        };
        
        // 如果修改了密码，包含密码字段
        if (values.password) {
          updateData.password = values.password;
        }

        // 如果状态改为离职，设置离职时间
        if (values.status === 'inactive' && editingEmployee.status === 'active') {
          updateData.left_at = new Date().toISOString();
        }

        // 如果状态改为在职，清除离职时间
        if (values.status === 'active' && editingEmployee.status === 'inactive') {
          updateData.left_at = null;
        }

        console.log('更新数据:', updateData); // 调试信息
        const result = await authService.updateEmployee(editingEmployee.id, updateData);
        console.log('更新结果:', result); // 调试信息
        message.success('员工信息已更新');
      } else {
        // 创建新员工
        console.log('创建员工数据:', values); // 调试信息
        const result = await authService.createEmployee(values);
        console.log('创建结果:', result); // 调试信息
        message.success('员工已创建');
      }

      setModalVisible(false);
      form.resetFields();
      loadEmployees();
    } catch (error) {
      console.error('操作失败:', error); // 调试信息
      message.error(error.message || '操作失败');
    }
  };

  const handleStatusChange = async (employee, newStatus) => {
    try {
      const updateData = {
        status: newStatus
      };

      if (newStatus === 'inactive') {
        updateData.left_at = new Date().toISOString();
      } else {
        updateData.left_at = null;
      }

      await authService.updateEmployee(employee.id, updateData);
      message.success(`员工已${newStatus === 'active' ? '恢复在职' : '设为离职'}`);
      loadEmployees();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'green' : 'red';
  };

  const getRoleColor = (role) => {
    return role === 'merchant' ? 'blue' : 'orange';
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={getRoleColor(role)}>
          {roles[role]}
        </Tag>
      ),
      width: 80
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {employeeStatus[status]}
        </Tag>
      ),
      width: 80
    },
    {
      title: '入职时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => dayjs(text).format('YYYY-MM-DD'),
      width: 100
    },
    {
      title: '离职时间',
      dataIndex: 'left_at',
      key: 'left_at',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD') : '-',
      width: 100
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            编辑
          </Button>
          
          {record.role !== 'merchant' && (
            <>
              {record.status === 'active' ? (
                <Popconfirm
                  title="确定要将此员工设为离职吗？"
                  onConfirm={() => handleStatusChange(record, 'inactive')}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="link"
                    icon={<StopOutlined />}
                    size="small"
                    danger
                  >
                    离职
                  </Button>
                </Popconfirm>
              ) : (
                <Popconfirm
                  title="确定要恢复此员工的在职状态吗？"
                  onConfirm={() => handleStatusChange(record, 'active')}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="link"
                    icon={<CheckCircleOutlined />}
                    size="small"
                  >
                    恢复
                  </Button>
                </Popconfirm>
              )}
            </>
          )}
        </Space>
      ),
      width: 150,
      fixed: 'right'
    }
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h2 style={{ margin: 0 }}>员工管理</h2>
        </Col>
        <Col>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加员工
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadEmployees}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={employees}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal
        title={editingEmployee ? '编辑员工' : '添加员工'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[
              { required: true, message: '请输入员工姓名' },
              { max: 100, message: '姓名不能超过100个字符' }
            ]}
          >
            <Input placeholder="请输入员工姓名" />
          </Form.Item>

          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, max: 50, message: '用户名长度为2-50个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
            ]}
          >
            <Input 
              placeholder="请输入用户名" 
              disabled={!!editingEmployee}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingEmployee ? '新密码（留空则不修改）' : '密码'}
            rules={[
              !editingEmployee && { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ].filter(Boolean)}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="employee">员工</Option>
              <Option value="merchant">商人</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value="active">在职</Option>
              <Option value="inactive">离职</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingEmployee ? '更新' : '创建'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeeManagement;
