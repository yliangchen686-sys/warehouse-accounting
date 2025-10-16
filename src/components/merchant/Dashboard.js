import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, DatePicker, Select, Spin } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  TeamOutlined,
  RiseOutlined,
  GiftOutlined
} from '@ant-design/icons';
import { transactionService } from '../../services/transactionService';
import { authService } from '../../services/authService';
import { transactionTypes } from '../../config/supabase';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dateRange, setDateRange] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, transactionsData, employeesData] = await Promise.all([
        transactionService.getTransactionStats({
          startDate: dateRange?.[0]?.toISOString(),
          endDate: dateRange?.[1]?.toISOString()
        }),
        transactionService.getTransactions({ limit: 10 }),
        authService.getActiveEmployees()
      ]);

      setStats(statsData);
      setRecentTransactions(transactionsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const transactionColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => dayjs(text).format('MM-DD HH:mm'),
      width: 100
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <span style={{
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 12,
          background: getTypeColor(type),
          color: 'white'
        }}>
          {transactionTypes[type]}
        </span>
      ),
      width: 80
    },
    {
      title: '客户',
      dataIndex: 'customer_name',
      key: 'customer_name',
      ellipsis: true
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity) => `${quantity}`,
      width: 80
    },
    {
      title: '金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => formatCurrency(amount),
      width: 100
    }
  ];

  const getTypeColor = (type) => {
    const colors = {
      purchase: '#1890ff',
      sale: '#52c41a',
      return: '#faad14',
      gift: '#f5222d'
    };
    return colors[type] || '#666';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>数据概览</h2>
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          format="YYYY-MM-DD"
          placeholder={['开始日期', '结束日期']}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="库存"
              value={stats?.currentStock || 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ 
                color: (stats?.currentStock || 0) < 0 ? '#f5222d' : 
                       (stats?.currentStock || 0) < 10 ? '#faad14' : '#52c41a'
              }}
              suffix="件"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="净收入"
              value={stats?.totalAmount || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ 
                color: (stats?.totalAmount || 0) >= 0 ? '#52c41a' : '#f5222d' 
              }}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="销售数量"
              value={Math.floor(stats?.totalQuantity || 0)}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix="件"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="在职员工"
              value={employees?.length || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="交易类型统计" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[8, 8]}>
              {Object.entries(stats?.typeStats || {}).map(([type, data]) => (
                <Col span={12} key={type}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Statistic
                      title={transactionTypes[type]}
                      value={data.count}
                      suffix={`笔 / ${formatCurrency(data.amount)}`}
                      valueStyle={{ 
                        fontSize: 16,
                        color: getTypeColor(type)
                      }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* 在职员工列表 - 竖着展示在左边 */}
          <Card title="在职员工列表" size="small">
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {employees.map(employee => (
                <Card 
                  key={employee.id} 
                  size="small" 
                  style={{ 
                    background: employee.role === 'merchant' ? '#e6f7ff' : '#f6ffed',
                    border: `1px solid ${employee.role === 'merchant' ? '#91d5ff' : '#b7eb8f'}`,
                    marginBottom: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: 2 }}>
                        {employee.name}
                        {employee.role === 'merchant' && (
                          <span style={{ 
                            marginLeft: 4, 
                            fontSize: 10, 
                            background: '#1890ff', 
                            color: 'white',
                            padding: '1px 4px',
                            borderRadius: 2
                          }}>
                            管理员
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        @{employee.username}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        入职: {dayjs(employee.created_at).format('MM-DD')}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {dayjs().diff(dayjs(employee.created_at), 'day')} 天
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          {/* 最近交易记录 - 竖着展示在右边 */}
          <Card title="最近交易记录" size="small">
            <div style={{ maxHeight: 580, overflowY: 'auto' }}>
              {recentTransactions.map(transaction => (
                <Card 
                  key={transaction.id} 
                  size="small" 
                  style={{ 
                    background: '#fafafa',
                    border: `1px solid ${getTypeColor(transaction.type)}`,
                    marginBottom: 8
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 12,
                          background: getTypeColor(transaction.type),
                          color: 'white',
                          fontWeight: 'bold'
                        }}>
                          {transactionTypes[transaction.type]}
                        </span>
                        <span style={{ fontWeight: 'bold', color: '#1f1f1f' }}>
                          {transaction.customer_name}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
                        收款员工: {transaction.collector}
                      </div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {dayjs(transaction.created_at).format('MM-DD HH:mm')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: '#52c41a', fontSize: 14 }}>
                        {new Intl.NumberFormat('zh-CN', {
                          style: 'currency',
                          currency: 'CNY'
                        }).format(transaction.total_amount)}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {Math.floor(transaction.quantity)} 件
                        {transaction.gift_quantity > 0 && ` + ${Math.floor(transaction.gift_quantity)} 赠`}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {recentTransactions.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                  <div>暂无交易记录</div>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
