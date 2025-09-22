import React, { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Select,
  DatePicker,
  Card,
  Tag,
  Row,
  Col,
  Statistic,
  Alert,
  Button,
  Space
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  ShoppingOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { transactionService } from '../../services/transactionService';
import { employeePaymentService } from '../../services/employeePaymentService';
import { transactionTypes } from '../../config/supabase';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const EmployeeTransactionList = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    customerName: '',
    type: '',
    dateRange: null
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [stats, setStats] = useState(null);
  const [paymentStats, setPaymentStats] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadTransactions();
    loadStats();
    loadPaymentStats();

    // 设置自动刷新
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadTransactions();
        loadStats();
        loadPaymentStats();
      }, 30000); // 每30秒刷新一次
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [filters, pagination.current, pagination.pageSize, autoRefresh]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const filterParams = {
        customerName: filters.customerName,
        type: filters.type,
        startDate: filters.dateRange?.[0]?.toISOString(),
        endDate: filters.dateRange?.[1]?.toISOString()
      };

      const allData = await transactionService.getTransactions(filterParams);
      // 只显示该员工的交易记录
      const employeeTransactions = allData.filter(transaction => 
        transaction.collector === user.name
      );
      
      setTransactions(employeeTransactions);
      setPagination(prev => ({ ...prev, total: employeeTransactions.length }));
    } catch (error) {
      console.error('加载交易记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // 计算该员工本月的销售数量
      const currentMonth = dayjs();
      const startOfMonth = currentMonth.startOf('month').toISOString();
      const endOfMonth = currentMonth.endOf('month').toISOString();
      
      const allData = await transactionService.getTransactions({
        startDate: startOfMonth,
        endDate: endOfMonth
      });
      
      // 只统计该员工的本月销售数量
      const employeeSales = allData.filter(transaction => 
        transaction.collector === user.name && transaction.type === 'sale'
      );
      
      const monthlyStats = {
        monthlySalesQuantity: employeeSales.reduce((sum, t) => sum + (parseFloat(t.quantity) || 0), 0)
      };
      
      setStats(monthlyStats);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  const loadPaymentStats = async () => {
    try {
      // 获取该员工的收款统计
      const paymentData = await employeePaymentService.getEmployeePaymentStats(user.name);
      setPaymentStats(paymentData);
    } catch (error) {
      console.error('加载收款统计失败:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      customerName: '',
      type: '',
      dateRange: null
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const getTypeColor = (type) => {
    const colors = {
      purchase: 'blue',
      sale: 'green',
      return: 'orange',
      gift: 'red'
    };
    return colors[type] || 'default';
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
      width: 150,
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix()
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={getTypeColor(type)}>
          {transactionTypes[type]}
        </Tag>
      ),
      width: 80,
      filters: Object.entries(transactionTypes).map(([key, value]) => ({
        text: value,
        value: key
      })),
      onFilter: (value, record) => record.type === value
    },
    {
      title: '客户',
      dataIndex: 'customer_name',
      key: 'customer_name',
      ellipsis: true,
      width: 150
    },
    {
      title: '收款员工',
      dataIndex: 'collector',
      key: 'collector',
      ellipsis: true,
      width: 100
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity) => Math.floor(quantity),
      width: 80,
      align: 'right'
    },
    {
      title: '赠送数量',
      dataIndex: 'gift_quantity',
      key: 'gift_quantity',
      render: (quantity) => quantity > 0 ? Math.floor(quantity) : '-',
      width: 80,
      align: 'right'
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price) => formatCurrency(price),
      width: 100,
      align: 'right'
    },
    {
      title: '总金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          {formatCurrency(amount)}
        </span>
      ),
      width: 120,
      align: 'right',
      sorter: (a, b) => a.total_amount - b.total_amount
    }
  ];

  return (
    <div>
      <Alert
        message="实时同步"
        description={
          <div>
            交易记录会自动实时更新，无需手动刷新。
            {autoRefresh && <span style={{ color: '#52c41a' }}> ● 自动刷新已启用（每30秒）</span>}
          </div>
        }
        type="success"
        icon={<InfoCircleOutlined />}
        showIcon
        closable
        style={{ marginBottom: 16 }}
      />

      {/* 员工个人统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card size="small">
              <Row gutter={16}>
                <Col xs={24} sm={6}>
                  <Statistic
                    title="我的本月销售数量"
                    value={Math.floor(stats.monthlySalesQuantity)}
                    valueStyle={{ color: '#1890ff' }}
                    prefix={<ShoppingOutlined />}
                    suffix="件"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic
                    title="我的交易记录"
                    value={transactions.length}
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<EyeOutlined />}
                    suffix="笔"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic
                    title="我的收款余额"
                    value={paymentStats?.currentBalance || 0}
                    formatter={(value) => new Intl.NumberFormat('zh-CN', {
                      style: 'currency',
                      currency: 'CNY'
                    }).format(value)}
                    valueStyle={{ 
                      color: (paymentStats?.currentBalance || 0) >= 0 ? '#52c41a' : '#f5222d',
                      fontWeight: 'bold'
                    }}
                    prefix={<DollarOutlined />}
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                      当前员工
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#722ed1' }}>
                      {user.name}
                    </div>
                    {paymentStats && (
                      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                        已转账: {new Intl.NumberFormat('zh-CN', {
                          style: 'currency',
                          currency: 'CNY'
                        }).format(paymentStats.totalTransferred || 0)}
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* 筛选器 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="搜索客户名称"
              prefix={<SearchOutlined />}
              value={filters.customerName}
              onChange={(e) => handleFilterChange('customerName', e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="选择交易类型"
              value={filters.type}
              onChange={(value) => handleFilterChange('type', value)}
              allowClear
              style={{ width: '100%' }}
            >
              {Object.entries(transactionTypes).map(([key, value]) => (
                <Option key={key} value={key}>{value}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={8}>
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange('dateRange', dates)}
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={24} md={4}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadTransactions}
                loading={loading}
                title="手动刷新"
              >
                刷新
              </Button>
              <Button
                icon={<FilterOutlined />}
                onClick={clearFilters}
                title="清空筛选条件"
              >
                清空
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 交易记录表格 */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>交易记录列表</h3>
          <Button
            size="small"
            type={autoRefresh ? 'primary' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '关闭自动刷新' : '开启自动刷新'}
          </Button>
        </div>
        
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize: pageSize
              }));
            }
          }}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default EmployeeTransactionList;
