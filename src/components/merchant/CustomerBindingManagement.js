import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Select,
  Input,
  message,
  Space,
  Popconfirm,
  Alert,
  AutoComplete,
  Statistic
} from 'antd';
import {
  LinkOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UserOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { customerService } from '../../services/customerService';
import { authService } from '../../services/authService';
import dayjs from 'dayjs';

const { Option } = Select;

const CustomerBindingManagement = () => {
  const [bindings, setBindings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bindingsData, employeesData, customersData] = await Promise.all([
        customerService.getAllCustomerBindings(),
        authService.getActiveEmployees(),
        customerService.getAllCustomerNames()
      ]);
      
      console.log('客户绑定数据:', bindingsData); // 调试信息
      console.log('员工数据:', employeesData); // 调试信息
      console.log('客户数据:', customersData); // 调试信息
      
      setBindings(bindingsData);
      setEmployees(employeesData); // 显示所有员工
      setCustomers(customersData);
      
      if (employeesData.length === 0) {
        message.warning('没有找到在职员工，请先在员工管理中添加员工');
      }
      
      if (bindingsData.length === 0) {
        message.info('暂无客户绑定，点击"添加绑定"开始绑定客户到员工');
      }
    } catch (error) {
      message.error('加载数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      await customerService.bindCustomerToEmployee(values.customerName, values.employeeName);
      message.success('客户绑定成功');
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error(error.message || '绑定失败');
    }
  };

  const handleUnbind = async (customerName) => {
    try {
      await customerService.unbindCustomer(customerName);
      message.success('客户绑定已解除');
      loadData();
    } catch (error) {
      message.error('解除绑定失败');
    }
  };

  const columns = [
    {
      title: '客户名称',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 200
    },
    {
      title: '绑定员工',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 150,
      render: (name) => (
        <Space>
          <UserOutlined />
          {name}
        </Space>
      )
    },
    {
      title: '绑定时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      width: 150
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="确定要解除此客户绑定吗？"
          onConfirm={() => handleUnbind(record.customer_name)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            size="small"
          >
            解除绑定
          </Button>
        </Popconfirm>
      ),
      width: 120
    }
  ];

  // 统计信息
  const stats = {
    totalBindings: bindings.length,
    boundCustomers: bindings.length,
    employeesWithCustomers: [...new Set(bindings.map(b => b.employee_name))].length
  };

  // 计算员工绑定统计
  const getEmployeeBindingStats = () => {
    const currentMonth = dayjs().format('YYYY-MM');
    const employeeStats = {};

    // 只初始化员工的统计，不包括商人
    employees.forEach(employee => {
      if (employee.role === 'employee') { // 只统计员工，不包括商人
        employeeStats[employee.name] = {
          employeeName: employee.name,
          totalBindings: 0,
          monthlyBindings: 0,
          customers: []
        };
      }
    });

    // 统计每个员工的绑定情况
    bindings.forEach(binding => {
      const employeeName = binding.employee_name;
      const bindingMonth = dayjs(binding.created_at).format('YYYY-MM');

      if (employeeStats[employeeName]) {
        employeeStats[employeeName].totalBindings++;
        employeeStats[employeeName].customers.push(binding.customer_name);
        
        // 如果是本月绑定的客户
        if (bindingMonth === currentMonth) {
          employeeStats[employeeName].monthlyBindings++;
        }
      }
    });

    return Object.values(employeeStats).sort((a, b) => b.totalBindings - a.totalBindings);
  };

  const employeeBindingStats = getEmployeeBindingStats();

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, marginBottom: 16 }}>客户绑定管理</h2>
        
        <Alert
          message="客户绑定说明"
          description="将客户绑定到员工名下，添加交易时会自动显示客户对应的员工。这有助于跟踪员工的客户开发情况和业绩。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="绑定客户数"
                value={stats.boundCustomers}
                prefix={<LinkOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="有客户的员工"
                value={stats.employeesWithCustomers}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="平均每员工客户数"
                value={stats.employeesWithCustomers > 0 ? Math.round(stats.boundCustomers / stats.employeesWithCustomers * 10) / 10 : 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#faad14' }}
                suffix="个"
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>客户绑定列表</h3>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加绑定
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={bindings}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个客户绑定`
          }}
          size="small"
          locale={{
            emptyText: (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <LinkOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                <div style={{ color: '#999', marginBottom: 16 }}>暂无客户绑定</div>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                  添加第一个客户绑定
                </Button>
              </div>
            )
          }}
        />
      </Card>

      {/* 员工绑定统计栏 */}
      <Card title="员工绑定统计（不含商人）" size="small" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          {employeeBindingStats.map(stat => (
            <Col xs={24} sm={12} md={8} lg={6} key={stat.employeeName}>
              <Card 
                size="small" 
                style={{ 
                  background: stat.totalBindings > 0 ? '#f6ffed' : '#fafafa',
                  border: `1px solid ${stat.totalBindings > 0 ? '#b7eb8f' : '#d9d9d9'}`,
                  marginBottom: 8
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>
                    {stat.employeeName}
                  </div>
                  
                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic
                        title="本月新增"
                        value={stat.monthlyBindings}
                        valueStyle={{ 
                          fontSize: 16, 
                          color: stat.monthlyBindings > 0 ? '#52c41a' : '#999'
                        }}
                        suffix="个"
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="累计绑定"
                        value={stat.totalBindings}
                        valueStyle={{ 
                          fontSize: 16, 
                          color: stat.totalBindings > 0 ? '#1890ff' : '#999'
                        }}
                        suffix="个"
                      />
                    </Col>
                  </Row>

                  {/* 显示绑定的客户名称（最多显示3个） */}
                  {stat.customers.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      <div style={{ marginBottom: 4 }}>客户:</div>
                      <div style={{ 
                        maxHeight: 60, 
                        overflowY: 'auto',
                        textAlign: 'left',
                        lineHeight: 1.4
                      }}>
                        {stat.customers.slice(0, 5).map((customer, index) => (
                          <div key={index} style={{ 
                            padding: '2px 6px',
                            background: '#e6f7ff',
                            borderRadius: 4,
                            marginBottom: 2,
                            fontSize: 11
                          }}>
                            {customer}
                          </div>
                        ))}
                        {stat.customers.length > 5 && (
                          <div style={{ color: '#999', fontSize: 11, textAlign: 'center' }}>
                            还有 {stat.customers.length - 5} 个客户...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {stat.totalBindings === 0 && (
                    <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
                      暂无绑定客户
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 汇总统计 */}
        <div style={{ 
          marginTop: 16, 
          padding: 16, 
          background: '#f0f2f5', 
          borderRadius: 6,
          textAlign: 'center'
        }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title={`${dayjs().format('YYYY年MM月')} 新增绑定`}
                value={employeeBindingStats.reduce((sum, stat) => sum + stat.monthlyBindings, 0)}
                valueStyle={{ color: '#52c41a', fontSize: 18 }}
                suffix="个"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="总绑定客户数"
                value={stats.totalBindings}
                valueStyle={{ color: '#1890ff', fontSize: 18 }}
                suffix="个"
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="有客户员工数"
                value={employeeBindingStats.filter(stat => stat.totalBindings > 0).length}
                valueStyle={{ color: '#722ed1', fontSize: 18 }}
                suffix="人"
              />
            </Col>
          </Row>
        </div>
      </Card>

      {/* 添加绑定模态框 */}
      <Modal
        title="添加客户绑定"
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
        >
          <Form.Item
            name="customerName"
            label="客户名称"
            rules={[
              { required: true, message: '请输入客户名称' },
              { max: 200, message: '客户名称不能超过200个字符' }
            ]}
          >
            <AutoComplete
              placeholder="请输入或选择客户名称"
              options={customers.map(name => ({ value: name }))}
              filterOption={(inputValue, option) =>
                option.value.toLowerCase().includes(inputValue.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="employeeName"
            label="绑定员工"
            rules={[{ required: true, message: '请选择员工' }]}
          >
            <Select placeholder="请选择员工">
              {employees.map(employee => (
                <Option key={employee.id} value={employee.name}>
                  {employee.name} ({employee.username})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认绑定
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

export default CustomerBindingManagement;
