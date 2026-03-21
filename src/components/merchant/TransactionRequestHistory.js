import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Tag,
  Select,
  Input,
  DatePicker,
  Button,
  Space,
  message
} from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { transactionRequestService } from '../../services/transactionRequestService';
import { transactionTypes } from '../../config/supabase';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const TransactionRequestHistory = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [applicantFilter, setApplicantFilter] = useState('');
  const [dateRange, setDateRange] = useState(null);

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
  }, [user, statusFilter, applicantFilter, dateRange]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await transactionRequestService.getAllRequests();
      
      // 应用筛选
      let filteredData = data;
      
      // 状态筛选
      if (statusFilter !== 'all') {
        filteredData = filteredData.filter(r => r.status === statusFilter);
      }
      
      // 申请人筛选
      if (applicantFilter) {
        filteredData = filteredData.filter(r => 
          r.applicant_name && r.applicant_name.includes(applicantFilter)
        );
      }
      
      // 日期范围筛选
      if (dateRange && dateRange.length === 2) {
        const startDate = dateRange[0].startOf('day');
        const endDate = dateRange[1].endOf('day');
        filteredData = filteredData.filter(r => {
          const reviewedAt = r.reviewed_at ? dayjs(r.reviewed_at) : dayjs(r.created_at);
          return reviewedAt.isAfter(startDate) && reviewedAt.isBefore(endDate) || 
                 reviewedAt.isSame(startDate, 'day') || 
                 reviewedAt.isSame(endDate, 'day');
        });
      }
      
      setRequests(filteredData);
    } catch (error) {
      message.error('加载审核历史失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 状态显示标签
  const getStatusTag = (status) => {
    switch (status) {
      case 'approved':
        return <Tag color="success" style={{ color: '#52c41a', fontWeight: 'bold' }}>已通过</Tag>;
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
      title: '申请人',
      dataIndex: 'applicant_name',
      key: 'applicant_name',
      width: 100
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
      title: '审核状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
      width: 100,
      filters: [
        { text: '已通过', value: 'approved' },
        { text: '已拒绝', value: 'rejected' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: '审核人',
      dataIndex: 'reviewed_by',
      key: 'reviewed_by',
      width: 100
    },
    {
      title: '审核时间',
      dataIndex: 'reviewed_at',
      key: 'reviewed_at',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
      width: 160,
      sorter: (a, b) => {
        const aTime = a.reviewed_at ? dayjs(a.reviewed_at).unix() : 0;
        const bTime = b.reviewed_at ? dayjs(b.reviewed_at).unix() : 0;
        return aTime - bTime;
      }
    }
  ];

  return (
    <Card
      title="审核历史记录"
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={loadRequests}
          loading={loading}
        >
          刷新
        </Button>
      }
    >
      <Space style={{ marginBottom: 16, width: '100%' }} wrap>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 120 }}
          placeholder="审核状态"
        >
          <Option value="all">全部</Option>
          <Option value="approved">已通过</Option>
          <Option value="rejected">已拒绝</Option>
        </Select>
        
        <Input
          placeholder="搜索申请人"
          value={applicantFilter}
          onChange={(e) => setApplicantFilter(e.target.value)}
          style={{ width: 150 }}
          allowClear
        />
        
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          format="YYYY-MM-DD"
        />
      </Space>

      <Table
        columns={columns}
        dataSource={requests}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条审核记录`
        }}
        scroll={{ x: 1400 }}
      />
    </Card>
  );
};

export default TransactionRequestHistory;
