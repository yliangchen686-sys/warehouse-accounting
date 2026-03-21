import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  message,
  Popconfirm,
  Tag
} from 'antd';
import { ReloadOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { transactionRequestService } from '../../services/transactionRequestService';
import { transactionTypes } from '../../config/supabase';
import dayjs from 'dayjs';

const PendingTransactionRequests = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

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
  }, [user]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await transactionRequestService.getPendingRequests();
      setRequests(data);
    } catch (error) {
      message.error('加载待审核申请失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await transactionRequestService.approveRequest(requestId, user.name);
      message.success('审核通过，已添加到交易记录');
      loadRequests();
    } catch (error) {
      message.error(error.message || '审核失败');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await transactionRequestService.rejectRequest(requestId, user.name);
      message.success('已拒绝该申请');
      loadRequests();
    } catch (error) {
      message.error(error.message || '拒绝失败');
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
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="确认通过该申请？"
            description="通过后，该申请将添加到交易记录中"
            onConfirm={() => handleApprove(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="primary"
              icon={<CheckOutlined />}
              size="small"
            >
              确认
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确认拒绝该申请？"
            description="拒绝后，该申请将标记为已拒绝"
            onConfirm={() => handleReject(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              danger
              icon={<CloseOutlined />}
              size="small"
            >
              拒绝
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card
      title="待审核交易"
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
      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
          暂无待审核的申请
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条待审核申请`
          }}
          scroll={{ x: 1200 }}
        />
      )}
    </Card>
  );
};

export default PendingTransactionRequests;
