import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  message,
  Statistic,
  Tag,
  Space,
  Tabs,
  Alert
} from 'antd';
import {
  DollarOutlined,
  SwapOutlined,
  HistoryOutlined,
  ReloadOutlined,
  PlusOutlined,
  BankOutlined
} from '@ant-design/icons';
import { employeePaymentService } from '../../services/employeePaymentService';
import { withdrawalService } from '../../services/withdrawalService';
import dayjs from 'dayjs';

const { TabPane } = Tabs;

const EmployeePaymentManagement = () => {
  const [employeesSummary, setEmployeesSummary] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [form] = Form.useForm();
  const [withdrawalForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summary, transferHistory, withdrawalHistory] = await Promise.all([
        employeePaymentService.getAllEmployeesSummary(),
        employeePaymentService.getEmployeeTransfers(),
        withdrawalService.getMerchantWithdrawals()
      ]);
      setEmployeesSummary(summary);
      setTransfers(transferHistory);
      setWithdrawals(withdrawalHistory);
    } catch (error) {
      message.error('加载数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = (employee) => {
    setSelectedEmployee(employee);
    form.setFieldsValue({
      employeeName: employee.employeeName,
      transferDate: dayjs(),
      amount: employee.currentBalance
    });
    setTransferModalVisible(true);
  };

  const handleWithdraw = (employee) => {
    setSelectedEmployee(employee);
    withdrawalForm.setFieldsValue({
      merchantName: employee.employeeName,
      withdrawalDate: dayjs(),
      amount: employee.currentBalance
    });
    setWithdrawalModalVisible(true);
  };

  const handleTransferSubmit = async (values) => {
    try {
      await employeePaymentService.transferToMerchant({
        employeeName: values.employeeName,
        amount: values.amount,
        transferDate: values.transferDate.toISOString(),
        note: values.note
      });
      
      message.success('转账记录已保存');
      setTransferModalVisible(false);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error('转账记录失败');
      console.error(error);
    }
  };

  const handleWithdrawalSubmit = async (values) => {
    try {
      await withdrawalService.merchantWithdraw({
        merchantName: values.merchantName,
        amount: values.amount,
        withdrawalDate: values.withdrawalDate.toISOString(),
        note: values.note
      });
      
      message.success('提现记录已保存');
      setWithdrawalModalVisible(false);
      withdrawalForm.resetFields();
      loadData();
    } catch (error) {
      message.error('提现记录失败');
      console.error(error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const getBalanceStatus = (balance) => {
    if (balance > 1000) return { color: 'red', text: '需转账' };
    if (balance > 0) return { color: 'orange', text: '有余额' };
    return { color: 'green', text: '已结清' };
  };

  // 计算总统计
  const totalStats = employeesSummary.reduce((acc, emp) => {
    // 对于商人，使用提现金额而不是转账金额
    const transferredAmount = (emp.employeeName === '商人' || emp.employeeName === '系统管理员') 
      ? (emp.totalWithdrawn || 0) 
      : emp.totalTransferred;
    
    return {
      totalCollected: acc.totalCollected + emp.totalAmount,
      totalTransferred: acc.totalTransferred + transferredAmount,
      totalBalance: acc.totalBalance + emp.currentBalance
    };
  }, { totalCollected: 0, totalTransferred: 0, totalBalance: 0 });

  const summaryColumns = [
    {
      title: '员工姓名',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 120
    },
    {
      title: '净收款',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => (
        <span style={{ 
          fontWeight: 'bold', 
          color: amount >= 0 ? '#52c41a' : '#f5222d' 
        }}>
          {formatCurrency(amount)}
        </span>
      ),
      width: 120,
      sorter: (a, b) => a.totalAmount - b.totalAmount
    },
    {
      title: '已转账/提现',
      dataIndex: 'totalTransferred',
      key: 'totalTransferred',
      render: (amount, record) => {
        // 商人显示提现金额
        if (record.employeeName === '商人' || record.employeeName === '系统管理员') {
          return (
            <span style={{ color: '#722ed1' }}>
              {formatCurrency(record.totalWithdrawn || 0)}
            </span>
          );
        }
        // 员工显示转账金额
        return (
          <span style={{ color: '#1890ff' }}>
            {formatCurrency(amount)}
          </span>
        );
      },
      width: 120,
      sorter: (a, b) => a.totalTransferred - b.totalTransferred
    },
    {
      title: '当前余额',
      dataIndex: 'currentBalance',
      key: 'currentBalance',
      render: (balance, record) => {
        // 商人显示总收入，员工显示待转账余额
        const title = record.employeeName === '商人' || record.employeeName === '系统管理员' ? '总收入' : '待转账';
        const status = getBalanceStatus(balance);
        return (
          <div>
            <span style={{ fontWeight: 'bold', color: status.color === 'red' ? '#f5222d' : status.color === 'orange' ? '#faad14' : '#52c41a' }}>
              {formatCurrency(balance)}
            </span>
            <div style={{ fontSize: 12, color: '#999' }}>
              {title}
            </div>
          </div>
        );
      },
      width: 120,
      sorter: (a, b) => a.currentBalance - b.currentBalance
    },
    {
      title: '交易笔数',
      dataIndex: 'transactionCount',
      key: 'transactionCount',
      width: 100,
      sorter: (a, b) => a.transactionCount - b.transactionCount
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        const status = getBalanceStatus(record.currentBalance);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
      width: 100
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => {
        // 商人显示提现按钮
        if (record.employeeName === '商人' || record.employeeName === '系统管理员') {
          return (
            <Button
              type="primary"
              size="small"
              icon={<BankOutlined />}
              onClick={() => handleWithdraw(record)}
              disabled={record.currentBalance <= 0}
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
            >
              提现
            </Button>
          );
        }
        
        // 员工显示转账按钮
        return (
          <Button
            type="primary"
            size="small"
            icon={<SwapOutlined />}
            onClick={() => handleTransfer(record)}
            disabled={record.currentBalance <= 0}
          >
            转账
          </Button>
        );
      },
      width: 80
    }
  ];

  const transferColumns = [
    {
      title: '转账时间',
      dataIndex: 'transfer_date',
      key: 'transfer_date',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      width: 150
    },
    {
      title: '员工姓名',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 120
    },
    {
      title: '转账金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          {formatCurrency(amount)}
        </span>
      ),
      width: 120,
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true
    },
    {
      title: '记录时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('MM-DD HH:mm'),
      width: 120
    }
  ];

  const withdrawalColumns = [
    {
      title: '提现时间',
      dataIndex: 'withdrawal_date',
      key: 'withdrawal_date',
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      width: 150
    },
    {
      title: '商人姓名',
      dataIndex: 'merchant_name',
      key: 'merchant_name',
      width: 120
    },
    {
      title: '提现金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: '#722ed1' }}>
          {formatCurrency(amount)}
        </span>
      ),
      width: 120,
      sorter: (a, b) => a.amount - b.amount
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true
    },
    {
      title: '记录时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('MM-DD HH:mm'),
      width: 120
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, marginBottom: 16 }}>员工收款管理</h2>
        
        <Alert
          message="收款计算说明"
          description="员工：净收款 = 销售收款 - 回收金额，待转账 = 净收款 - 已转账金额。商人：总收入 = 销售收款 + 员工转账收款 - 回收金额。进货和赠送不计入收款统计。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        {/* 总统计 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="净收款金额"
                value={totalStats.totalCollected}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ 
                  color: totalStats.totalCollected >= 0 ? '#52c41a' : '#f5222d' 
                }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="已转账/提现"
                value={totalStats.totalTransferred}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ color: '#722ed1' }}
                prefix={<SwapOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="待转账余额"
                value={totalStats.totalBalance}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ 
                  color: totalStats.totalBalance > 1000 ? '#f5222d' : 
                         totalStats.totalBalance > 0 ? '#faad14' : '#52c41a'
                }}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 余额警告 */}
        {totalStats.totalBalance > 1000 && (
          <Alert
            message="有员工余额较高，建议及时转账"
            description={`总待转账金额: ${formatCurrency(totalStats.totalBalance)}`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="员工收款汇总" key="summary">
          <Card>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>员工收款统计</h3>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadData}
                loading={loading}
              >
                刷新
              </Button>
            </div>

            <Table
              columns={summaryColumns}
              dataSource={employeesSummary}
              rowKey="employeeName"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 个员工`
              }}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab="转账记录" key="transfers">
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadData}
              >
                刷新记录
              </Button>
            </div>

            <Table
              columns={transferColumns}
              dataSource={transfers}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条转账记录`
              }}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab="提现记录" key="withdrawals">
          <Card>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>商人提现记录</h3>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadData}
              >
                刷新记录
              </Button>
            </div>

            <Table
              columns={withdrawalColumns}
              dataSource={withdrawals}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条提现记录`
              }}
              size="small"
              summary={() => {
                const totalWithdrawn = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0);
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}>
                        <strong>总计</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}></Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <strong style={{ color: '#722ed1', fontSize: 16 }}>
                          {formatCurrency(totalWithdrawn)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3}></Table.Summary.Cell>
                      <Table.Summary.Cell index={4}></Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />

            {withdrawals.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <BankOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>暂无提现记录</div>
              </div>
            )}
          </Card>
        </TabPane>
      </Tabs>

      {/* 转账模态框 */}
      <Modal
        title="员工转账给商人"
        open={transferModalVisible}
        onCancel={() => {
          setTransferModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleTransferSubmit}
        >
          <Form.Item
            name="employeeName"
            label="员工姓名"
          >
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="amount"
            label="转账金额"
            rules={[
              { required: true, message: '请输入转账金额' },
              { type: 'number', min: 0.01, message: '转账金额必须大于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              precision={2}
              min={0}
              formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/¥\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="transferDate"
            label="转账日期"
            rules={[{ required: true, message: '请选择转账日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder="选择转账日期"
            />
          </Form.Item>

          <Form.Item
            name="note"
            label="备注"
          >
            <Input.TextArea
              rows={3}
              placeholder="转账备注信息（可选）"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认转账
              </Button>
              <Button onClick={() => {
                setTransferModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 商人提现模态框 */}
      <Modal
        title="商人提现"
        open={withdrawalModalVisible}
        onCancel={() => {
          setWithdrawalModalVisible(false);
          withdrawalForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={withdrawalForm}
          layout="vertical"
          onFinish={handleWithdrawalSubmit}
        >
          <Form.Item
            name="merchantName"
            label="商人姓名"
          >
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="amount"
            label="提现金额"
            rules={[
              { required: true, message: '请输入提现金额' },
              { type: 'number', min: 0.01, message: '提现金额必须大于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              precision={2}
              min={0}
              formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/¥\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="withdrawalDate"
            label="提现日期"
            rules={[{ required: true, message: '请选择提现日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder="选择提现日期"
            />
          </Form.Item>

          <Form.Item
            name="note"
            label="备注"
          >
            <Input.TextArea
              rows={3}
              placeholder="提现备注信息（可选）"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认提现
              </Button>
              <Button onClick={() => {
                setWithdrawalModalVisible(false);
                withdrawalForm.resetFields();
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

export default EmployeePaymentManagement;
