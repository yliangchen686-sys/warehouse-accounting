import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  message,
  Space,
  Divider,
  Modal
} from 'antd';
import { SaveOutlined, CalculatorOutlined } from '@ant-design/icons';
import { transactionRequestService } from '../../services/transactionRequestService';
import { authService } from '../../services/authService';
import { customerService } from '../../services/customerService';
import { transactionTypes } from '../../config/supabase';

const { Option } = Select;

const TransactionRequestForm = ({ user, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [customerValidation, setCustomerValidation] = useState({ isValid: null, message: '' });
  const [myCustomers, setMyCustomers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [confirmDisabled, setConfirmDisabled] = useState(true);

  useEffect(() => {
    loadEmployees();
    loadMyCustomers();
  }, [user]);

  useEffect(() => {
    if (modalVisible) {
      setCountdown(5);
      setConfirmDisabled(true);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setConfirmDisabled(false);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [modalVisible]);

  const loadEmployees = async () => {
    try {
      const data = await authService.getActiveEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('获取员工列表失败:', error);
    }
  };

  const loadMyCustomers = async () => {
    try {
      const customers = await customerService.getEmployeeCustomers(user.name);
      setMyCustomers(customers);
    } catch (error) {
      console.error('获取我的客户列表失败:', error);
    }
  };

  // 验证客户名称
  const validateCustomerName = async (customerName) => {
    if (!customerName) {
      setCustomerValidation({ isValid: null, message: '' });
      return;
    }

    const isValid = myCustomers.some(c => c.customer_name === customerName);
    setCustomerValidation({
      isValid,
      message: isValid ? '可交易' : '客户名不正确'
    });
  };

  // 获取可选收款员工（当前员工 + 商人）
  const getAvailableCollectors = () => {
    const merchants = employees.filter(emp => emp.role === 'merchant' || emp.role === 'admin');
    return [user.name, ...merchants.map(m => m.name)];
  };

  const calculateTotal = () => {
    const quantity = form.getFieldValue('quantity') || 0;
    const unitPrice = form.getFieldValue('unitPrice') || 0;
    const total = quantity * unitPrice;
    setTotalAmount(total);
    form.setFieldValue('totalAmount', total);
  };

  // 根据交易类型自动设置单价
  const handleTypeChange = (type) => {
    setSelectedType(type);
    
    const priceMap = {
      'sale': 20,    // 销售
      'return': 18,  // 回收
      'gift': 0      // 赠送
    };
    
    form.setFieldValue('unitPrice', priceMap[type] || 0);
    setTimeout(calculateTotal, 100);
  };

  const handleSubmit = async (values) => {
    // 验证客户名称
    if (!customerValidation.isValid) {
      message.error('客户名称不正确，请选择您绑定的客户');
      return;
    }

    // 验证收款员工
    const availableCollectors = getAvailableCollectors();
    if (!availableCollectors.includes(values.collector)) {
      message.error('收款员工只能选择您自己或商人');
      return;
    }

    // 显示确认弹窗
    setConfirmData(values);
    setModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    if (confirmDisabled) {
      return;
    }

    setLoading(true);
    try {
      await transactionRequestService.createRequest({
        type: confirmData.type,
        customerName: confirmData.customerName,
        collector: confirmData.collector,
        quantity: confirmData.quantity || 0,
        giftQuantity: confirmData.giftQuantity || 0,
        unitPrice: confirmData.unitPrice || 0,
        totalAmount: confirmData.totalAmount || 0,
        applicantName: user.name
      });

      message.success('交易申请已提交，等待审核');
      form.resetFields();
      setTotalAmount(0);
      setCustomerValidation({ isValid: null, message: '' });
      setModalVisible(false);
      setConfirmData(null);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      message.error(error.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const availableCollectors = getAvailableCollectors();

  return (
    <>
      <Card
        title={
          <Space>
            <SaveOutlined />
            申请交易
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          initialValues={{
            giftQuantity: 0,
            totalAmount: 0
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="type"
                label="交易类型"
                rules={[{ required: true, message: '请选择交易类型' }]}
              >
                <Select 
                  placeholder="请选择交易类型" 
                  size="large"
                  onChange={handleTypeChange}
                >
                  <Option value="sale">{transactionTypes.sale}</Option>
                  <Option value="gift">{transactionTypes.gift}</Option>
                  <Option value="return">{transactionTypes.return}</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="customerName"
                label="客户名称"
                rules={[
                  { required: true, message: '请输入客户名称' },
                  { max: 200, message: '客户名称不能超过200个字符' }
                ]}
              >
                <Input 
                  placeholder="请输入客户名称" 
                  size="large"
                  onChange={(e) => validateCustomerName(e.target.value)}
                />
              </Form.Item>
              {customerValidation.message && (
                <div style={{
                  color: customerValidation.isValid ? '#52c41a' : '#ff4d4f',
                  fontSize: 12,
                  marginTop: -16,
                  marginBottom: 16
                }}>
                  {customerValidation.message}
                </div>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="collector"
                label="收款员工"
                rules={[
                  { required: true, message: '请选择收款员工' }
                ]}
              >
                <Select 
                  placeholder="请选择收款员工" 
                  size="large"
                >
                  {availableCollectors.map(name => {
                    const employee = employees.find(emp => emp.name === name);
                    return (
                      <Option key={name} value={name}>
                        {name} {employee && (employee.role === 'merchant' || employee.role === 'admin') ? '(商人)' : ''}
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="quantity"
                label="数量"
                rules={[
                  { 
                    required: selectedType !== 'gift', 
                    message: '请输入数量' 
                  },
                  { type: 'number', min: 0, message: '数量不能为负数' }
                ]}
              >
                <InputNumber
                  placeholder={selectedType === 'gift' ? '赠送类型可不填' : '请输入数量'}
                  style={{ width: '100%' }}
                  size="large"
                  precision={0}
                  min={0}
                  onChange={calculateTotal}
                  suffix="件"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="giftQuantity"
                label="赠送数量"
                rules={[
                  { type: 'number', min: 0, message: '赠送数量不能为负数' }
                ]}
              >
                <InputNumber
                  placeholder="请输入赠送数量"
                  style={{ width: '100%' }}
                  size="large"
                  precision={0}
                  min={0}
                  suffix="件"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="unitPrice"
                label="单价"
                rules={[
                  { 
                    required: selectedType !== 'gift', 
                    message: '请输入单价' 
                  },
                  { type: 'number', min: 0, message: '单价不能为负数' }
                ]}
              >
                <InputNumber
                  placeholder="请输入单价"
                  style={{ width: '100%' }}
                  size="large"
                  precision={2}
                  min={0}
                  formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/¥\s?|(,*)/g, '')}
                  onChange={calculateTotal}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={16} align="middle">
            <Col xs={24} md={12}>
              <Form.Item
                name="totalAmount"
                label="总金额"
                rules={[
                  { required: true, message: '请输入总金额' },
                  { type: 'number', min: 0, message: '总金额不能为负数' }
                ]}
              >
                <InputNumber
                  placeholder="请输入总金额"
                  style={{ width: '100%' }}
                  size="large"
                  precision={2}
                  min={0}
                  formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/¥\s?|(,*)/g, '')}
                  value={totalAmount}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Button
                icon={<CalculatorOutlined />}
                onClick={calculateTotal}
                size="large"
                style={{ marginTop: 30 }}
              >
                自动计算总金额
              </Button>
            </Col>
          </Row>

          <Divider />

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              icon={<SaveOutlined />}
            >
              确定
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 确认弹窗 */}
      <Modal
        title="确认交易申请"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setConfirmData(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setModalVisible(false);
              setConfirmData(null);
            }}
          >
            取消
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={loading}
            disabled={confirmDisabled}
            onClick={handleConfirmSubmit}
            style={{
              backgroundColor: confirmDisabled ? '#d9d9d9' : '#1890ff',
              borderColor: confirmDisabled ? '#d9d9d9' : '#1890ff'
            }}
          >
            {confirmDisabled ? `确认 (${countdown}秒)` : '确认'}
          </Button>
        ]}
      >
        {confirmData && (
          <div style={{ padding: '20px 0' }}>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={8}><strong>交易类型：</strong></Col>
              <Col span={16}>{transactionTypes[confirmData.type]}</Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={8}><strong>客户名称：</strong></Col>
              <Col span={16}>{confirmData.customerName}</Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={8}><strong>收款员工：</strong></Col>
              <Col span={16}>{confirmData.collector}</Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={8}><strong>数量：</strong></Col>
              <Col span={16}>{confirmData.quantity || 0} 件</Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={8}><strong>赠送数量：</strong></Col>
              <Col span={16}>{confirmData.giftQuantity || 0} 件</Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><strong>总金额：</strong></Col>
              <Col span={16}>¥ {parseFloat(confirmData.totalAmount || 0).toFixed(2)}</Col>
            </Row>
          </div>
        )}
      </Modal>
    </>
  );
};

export default TransactionRequestForm;
