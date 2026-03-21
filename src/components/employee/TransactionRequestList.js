import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Tag,
  Select,
  Button,
  Space,
  message
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { transactionRequestService } from '../../services/transactionRequestService';
import { transactionTypes } from '../../config/supabase';
import dayjs from 'dayjs';

const { Option } = Select;

const TransactionRequestList = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadRequests();
    
    // 订阅实时更新
    const subscription = transactionRequestService.subscribeToRequests((payload) => {
      console.log('交易申请更新:', payload);
      loadRequests();
    });

    return () => {
      if (subscription) {
        transactionRequestService.unsubscribeFromRequests(subscription);
      }
    };
  }, [user, statusFilter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await transactionRequestService.getMyRequests(user.name);
      
      // 根据状态筛选
      let filteredData = data;
      if (statusFilter !== 'all') {
        filteredData = data.filter(r => r.status === statusFilter);
      }
      
      setRequests(filteredData);
    } catch (error) {
      message.error('加载申请记录失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 状态显示标签
  const getStatusTag = (status) => {
    switch (status) {
      case 'pending':
        return <Tag color="gold" style={{ color: '#faad14', fontWeight: 'bold' }}>待审核</Tag>;
      case 'approved':
        return <Tag color="success" style={{ color: '#52c41a', fontWeight: 'bold' }}>已完成</Tag>;
      case 'rejected':
        return <Tag color="error" style={{ color: '#ff4d4f', fontWeight: 'bold' }}>已拒绝</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
      width: 160,
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix()
    },
    {
      title: '交易类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => transactionTypes[type] || type,
      width: 100
    },
    {
      title: '客户名称',
      dataIndex: 'customer_name',
      key: 'customer_name',
      ellipsis: true,
      width: 150
    },
    {
      title: '收款员工',
      dataIndex: 'collector',
      key: 'collector',
      width: 100
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity) => Math.floor(quantity || 0),
      width: 80,
      align: 'right'
    },
    {
      title: '赠送数量',
      dataIndex: 'gift_quantity',
      key: 'gift_quantity',
      render: (quantity) => quantity > 0 ? Math.floor(quantity) : '-',
      width: 100,
      align: 'right'
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price) => price ? `¥ ${parseFloat(price).toFixed(2)}` : '-',
      width: 100,
      align: 'right'
    },
    {
      title: '总金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `¥ ${parseFloat(amount || 0).toFixed(2)}`,
      width: 120,
      align: 'right',
      sorter: (a, b) => parseFloat(a.total_amount || 0) - parseFloat(b.total_amount || 0)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
      width: 100,
      filters: [
        { text: '待审核', value: 'pending' },
        { text: '已完成', value: 'approved' },
        { text: '已拒绝', value: 'rejected' }
      ],
      onFilter: (value, record) => record.status === value
    }
  ];

  const filteredRequests = statusFilter === 'all' 
    ? requests 
    : requests.filter(r => r.status === statusFilter);

  return (
    <Card
      title="我的申请记录"
      extra={
        <Space>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
          >
            <Option value="all">全部</Option>
            <Option value="pending">待审核</Option>
            <Option value="approved">已完成</Option>
            <Option value="rejected">已拒绝</Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadRequests}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={filteredRequests}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`
        }}
        scroll={{ x: 1000 }}
      />
    </Card>
  );
};

export default TransactionRequestList;
