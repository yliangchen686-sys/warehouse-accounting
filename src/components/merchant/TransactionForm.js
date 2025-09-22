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
  Alert
} from 'antd';
import { SaveOutlined, CloseOutlined, CalculatorOutlined } from '@ant-design/icons';
import { transactionService } from '../../services/transactionService';
import { authService } from '../../services/authService';
import { customerService } from '../../services/customerService';
import { transactionTypes } from '../../config/supabase';

const { Option } = Select;
const { TextArea } = Input;

const TransactionForm = ({ onSubmit, onCancel, transaction = null }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [boundEmployee, setBoundEmployee] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    loadEmployees();
    if (transaction) {
      form.setFieldsValue({
        type: transaction.type,
        customerName: transaction.customer_name,
        collector: transaction.collector,
        quantity: transaction.quantity,
        giftQuantity: transaction.gift_quantity,
        unitPrice: transaction.unit_price,
        totalAmount: transaction.total_amount
      });
      setTotalAmount(transaction.total_amount);
    }
  }, [transaction, form]);

  const loadEmployees = async () => {
    try {
      const data = await authService.getActiveEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('获取员工列表失败:', error);
    }
  };

  // 当客户名称改变时，自动查找绑定的员工
  const handleCustomerChange = async (customerName) => {
    if (customerName) {
      try {
        const employeeName = await customerService.getCustomerEmployee(customerName);
        if (employeeName) {
          setBoundEmployee(employeeName);
          form.setFieldValue('collector', employeeName);
          message.success(`已自动选择绑定员工：${employeeName}`);
        } else {
          setBoundEmployee(null);
        }
      } catch (error) {
        console.error('获取客户绑定员工失败:', error);
        setBoundEmployee(null);
      }
    } else {
      setBoundEmployee(null);
    }
  };

  const calculateTotal = () => {
    const quantity = form.getFieldValue('quantity') || 0;
    const unitPrice = form.getFieldValue('unitPrice') || 0;
    const total = quantity * unitPrice;
    setTotalAmount(total);
    form.setFieldValue('totalAmount', total);
  };

  // 根据交易类型自动设置单价和数量
  const handleTypeChange = (type) => {
    setSelectedType(type);
    
    switch (type) {
      case 'sale': // 销售
        form.setFieldValue('unitPrice', 20);
        break;
      case 'return': // 回收
        form.setFieldValue('unitPrice', 18);
        break;
      case 'purchase': // 进货
        form.setFieldValue('unitPrice', 0);
        break;
      case 'gift': // 赠送
        form.setFieldValue('quantity', null);
        form.setFieldValue('unitPrice', null);
        form.setFieldValue('totalAmount', 0);
        setTotalAmount(0);
        // 赠送类型不清空赠送数量，让用户填写
        break;
      default:
        break;
    }
    // 重新计算总金额
    setTimeout(calculateTotal, 100);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (transaction) {
        // 更新现有交易
        await transactionService.updateTransaction(transaction.id, values);
        message.success('交易记录已更新');
      } else {
        // 创建新交易
        await transactionService.createTransaction(values);
        message.success('交易记录已创建');
      }
      
      form.resetFields();
      setTotalAmount(0);
      onSubmit();
    } catch (error) {
      message.error(error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setTotalAmount(0);
    onCancel();
  };

  return (
    <Card
      title={
        <Space>
          <SaveOutlined />
          {transaction ? '编辑交易记录' : '添加交易记录'}
        </Space>
      }
      extra={
        <Button icon={<CloseOutlined />} onClick={handleCancel}>
          取消
        </Button>
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
                {Object.entries(transactionTypes).map(([key, value]) => (
                  <Option key={key} value={key}>
                    {value}
                  </Option>
                ))}
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
                onChange={(e) => handleCustomerChange(e.target.value)}
              />
            </Form.Item>
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
              extra={boundEmployee ? `客户绑定员工：${boundEmployee}` : ''}
            >
              <Select 
                placeholder="请选择收款员工" 
                size="large"
                style={{
                  borderColor: boundEmployee ? '#52c41a' : undefined
                }}
              >
                {employees.map(employee => (
                  <Option key={employee.id} value={employee.name}>
                    {employee.name} ({employee.role === 'merchant' ? '商人' : '员工'})
                    {boundEmployee === employee.name && ' ✓ 绑定客户'}
                  </Option>
                ))}
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
                { 
                  required: selectedType === 'gift', 
                  message: '赠送类型必须输入赠送数量' 
                },
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
                placeholder={selectedType === 'gift' ? '赠送类型可不填' : '请输入单价'}
                style={{ width: '100%' }}
                size="large"
                precision={2}
                min={0}
                formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/¥\s?|(,*)/g, '')}
                onChange={calculateTotal}
                disabled={selectedType === 'purchase'}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        {selectedType === 'gift' && (
          <Alert
            message="赠送类型填写说明"
            description="赠送类型时，数量和单价可以不填（系统会自动设为0），但必须填写赠送数量。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

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
          <Space size="large">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              icon={<SaveOutlined />}
            >
              {loading ? '保存中...' : (transaction ? '更新' : '保存')}
            </Button>
            
            <Button
              size="large"
              onClick={handleCancel}
              icon={<CloseOutlined />}
            >
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TransactionForm;
