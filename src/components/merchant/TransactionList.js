import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Card,
  Popconfirm,
  message,
  Tag,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { transactionService } from '../../services/transactionService';
import { transactionTypes } from '../../config/supabase';
import TransactionForm from './TransactionForm';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showForm, setShowForm] = useState(false);
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

  useEffect(() => {
    loadTransactions();
    loadStats();
  }, [filters, pagination.current, pagination.pageSize]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const filterParams = {
        customerName: filters.customerName,
        type: filters.type,
        startDate: filters.dateRange?.[0]?.toISOString(),
        endDate: filters.dateRange?.[1]?.toISOString()
      };

      const data = await transactionService.getTransactions(filterParams);
      setTransactions(data);
      setPagination(prev => ({ ...prev, total: data.length }));
    } catch (error) {
      message.error('加载交易记录失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const filterParams = {
        startDate: filters.dateRange?.[0]?.toISOString(),
        endDate: filters.dateRange?.[1]?.toISOString()
      };
      const statsData = await transactionService.getTransactionStats(filterParams);
      setStats(statsData);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await transactionService.deleteTransaction(id);
      message.success('删除成功');
      loadTransactions();
      loadStats();
    } catch (error) {
      message.error('删除失败');
      console.error(error);
    }
  };

  const handleEdit = (record) => {
    setEditingTransaction(record);
    setShowForm(true);
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingTransaction(null);
    loadTransactions();
    loadStats();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTransaction(null);
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
          <Popconfirm
            title="确定要删除这条记录吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
      width: 120,
      fixed: 'right'
    }
  ];

  if (showForm) {
    return (
      <TransactionForm
        transaction={editingTransaction}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div>
      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="库存"
                value={stats.currentStock}
                valueStyle={{ 
                  color: stats.currentStock < 0 ? '#f5222d' : 
                         stats.currentStock < 10 ? '#faad14' : '#52c41a'
                }}
                suffix="件"
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="净收入"
                value={stats.totalAmount}
                formatter={(value) => formatCurrency(value)}
                valueStyle={{ 
                  color: stats.totalAmount >= 0 ? '#52c41a' : '#f5222d' 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="销售数量"
                value={Math.floor(stats.totalQuantity)}
                valueStyle={{ color: '#faad14' }}
                suffix="件"
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="赠送数量"
                value={Math.floor(stats.totalGiftQuantity)}
                valueStyle={{ color: '#f5222d' }}
                suffix="件"
              />
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
              >
                刷新
              </Button>
              <Button
                icon={<FilterOutlined />}
                onClick={clearFilters}
              >
                清空筛选
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 交易记录表格 */}
      <Card>
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

export default TransactionList;
