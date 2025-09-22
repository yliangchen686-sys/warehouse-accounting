import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Button,
  DatePicker,
  message,
  Statistic,
  Tag,
  Space,
  Tabs,
  Alert,
  Progress,
  Descriptions
} from 'antd';
import {
  GiftOutlined,
  ReloadOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { customerGiftService } from '../../services/customerGiftService';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const CustomerGiftManagement = () => {
  const [customerGiftData, setCustomerGiftData] = useState([]);
  const [giftHistory, setGiftHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(1, 'month').startOf('month'),
    dayjs().endOf('month')
  ]);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('current');

  useEffect(() => {
    loadGiftData();
    loadGiftHistory();
  }, [dateRange]);

  const loadGiftData = async () => {
    setLoading(true);
    try {
      const [giftData, summaryData] = await Promise.all([
        customerGiftService.getCustomerGiftData(),
        customerGiftService.getGiftSummary()
      ]);
      
      console.log('客户赠送数据:', giftData); // 调试信息
      setCustomerGiftData(giftData);
      setSummary(summaryData);
    } catch (error) {
      message.error('加载赠送数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadGiftHistory = async () => {
    try {
      const history = await customerGiftService.getGiftHistory();
      setGiftHistory(history);
    } catch (error) {
      console.error('加载赠送历史失败:', error);
    }
  };

  const handleGenerateGifts = async () => {
    try {
      setLoading(true);
      await customerGiftService.generateGiftRecords(customerGiftData);
      message.success('赠送记录已生成');
      loadGiftHistory();
    } catch (error) {
      message.error('生成赠送记录失败');
      console.error(error);
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

  const getCustomerNameStyle = (color) => {
    return {
      fontWeight: 'bold',
      color: color === 'red' ? '#f5222d' : color === 'blue' ? '#1890ff' : '#1f1f1f'
    };
  };

  const giftColumns = [
    {
      title: '客户名称',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name, record) => (
        <span style={getCustomerNameStyle(record.displayColor)}>
          {name}
        </span>
      ),
      width: 150
    },
    {
      title: '本月销售',
      dataIndex: 'currentMonthSales',
      key: 'currentMonthSales',
      render: (quantity, record) => (
        <div>
          <div style={{ fontWeight: 'bold', color: '#52c41a' }}>
            {Math.floor(quantity)} 件
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {formatCurrency(record.currentMonthAmount)}
          </div>
        </div>
      ),
      width: 100,
      sorter: (a, b) => a.currentMonthSales - b.currentMonthSales
    },
    {
      title: '上月销售',
      dataIndex: 'lastMonthSales',
      key: 'lastMonthSales',
      render: (quantity, record) => (
        <div>
          <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
            {Math.floor(quantity)} 件
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {formatCurrency(record.lastMonthAmount)}
          </div>
        </div>
      ),
      width: 100,
      sorter: (a, b) => a.lastMonthSales - b.lastMonthSales
    },
    {
      title: '每日赠送',
      dataIndex: 'dailyGiftQuantity',
      key: 'dailyGiftQuantity',
      render: (quantity, record) => (
        <Tag 
          color={record.displayColor} 
          style={{ fontWeight: 'bold', fontSize: 14 }}
        >
          {quantity} 件/天
        </Tag>
      ),
      width: 100,
      sorter: (a, b) => a.dailyGiftQuantity - b.dailyGiftQuantity
    },
    {
      title: '赠送来源',
      dataIndex: 'giftSource',
      key: 'giftSource',
      render: (source) => (
        <Tag color={source === '本月购买' ? 'green' : 'orange'}>
          {source}
        </Tag>
      ),
      width: 100
    },
    {
      title: '剩余天数',
      dataIndex: 'remainingDays',
      key: 'remainingDays',
      render: (days, record) => {
        let color = '#52c41a';
        if (days <= 3) color = '#f5222d';
        else if (days <= 7) color = '#faad14';
        
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', color, fontSize: 16 }}>
              {days}
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>
              天
            </div>
            {days <= 3 && (
              <div style={{ fontSize: 10, color: '#f5222d' }}>
                即将到期
              </div>
            )}
          </div>
        );
      },
      width: 100,
      sorter: (a, b) => a.remainingDays - b.remainingDays
    },
    {
      title: '到期日期',
      dataIndex: 'giftEndDate',
      key: 'giftEndDate',
      render: (date) => (
        <div style={{ fontSize: 12 }}>
          {dayjs(date).format('YYYY-MM-DD')}
        </div>
      ),
      width: 100
    }
  ];

  const historyColumns = [
    {
      title: '赠送日期',
      dataIndex: 'gift_date',
      key: 'gift_date',
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
      width: 120
    },
    {
      title: '客户名称',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 200
    },
    {
      title: '销售数量',
      dataIndex: 'sales_quantity',
      key: 'sales_quantity',
      render: (quantity) => `${Math.floor(quantity)} 件`,
      width: 100
    },
    {
      title: '销售金额',
      dataIndex: 'sales_amount',
      key: 'sales_amount',
      render: (amount) => formatCurrency(amount),
      width: 120
    },
    {
      title: '赠送数量',
      dataIndex: 'gift_quantity',
      key: 'gift_quantity',
      render: (quantity) => (
        <Tag color="green" style={{ fontWeight: 'bold' }}>
          {quantity} 件
        </Tag>
      ),
      width: 100
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
        <Row justify="space-between" align="middle">
          <Col>
            <h2 style={{ margin: 0 }}>客户每日赠送</h2>
          </Col>
          <Col>
            <Space>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
                allowClear={false}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={loadGiftData}
                loading={loading}
              >
                刷新数据
              </Button>
            </Space>
          </Col>
        </Row>

        <Alert
          message="每日赠送规则说明"
          description="客户本月购买≥300件，赠送到下月底；上月购买≥300件，赠送到本月底。赠送标准：300-999件每天1件(蓝色)，1000-4999件每天2件(蓝色)，≥5000件每天2件(红色VIP)。"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="当期赠送" key="current">
          {/* 统计卡片 */}
          {summary && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={6}>
                <Card size="small">
                  <Statistic
                    title="符合条件客户"
                    value={summary.totalCustomers}
                    prefix={<ShoppingOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                    suffix="个"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={6}>
                <Card size="small">
                  <Statistic
                    title="每日赠送总量"
                    value={summary.totalDailyGifts}
                    prefix={<GiftOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                    suffix="件/天"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={6}>
                <Card size="small">
                  <Statistic
                    title="本月销售总量"
                    value={Math.floor(summary.totalCurrentMonthSales)}
                    prefix={<TrophyOutlined />}
                    valueStyle={{ color: '#faad14' }}
                    suffix="件"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={6}>
                <Card size="small">
                  <Statistic
                    title="紧急客户"
                    value={summary.urgentCustomers}
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: '#f5222d' }}
                    suffix="个 (≤3天)"
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* 客户等级分布 */}
          {summary && (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={24}>
                <Card title="客户等级分布" size="small">
                  <Row gutter={16}>
                    <Col xs={24} sm={8}>
                      <Card size="small" style={{ background: '#e6f7ff' }}>
                        <Statistic
                          title="普通客户 (300-999件)"
                          value={summary.tierStats.tier1}
                          valueStyle={{ color: '#1890ff' }}
                          suffix="个"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card size="small" style={{ background: '#e6f7ff' }}>
                        <Statistic
                          title="优质客户 (1000-4999件)"
                          value={summary.tierStats.tier2}
                          valueStyle={{ color: '#1890ff' }}
                          suffix="个"
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card size="small" style={{ background: '#fff2e8' }}>
                        <Statistic
                          title="VIP客户 (≥5000件)"
                          value={summary.tierStats.tier3}
                          valueStyle={{ color: '#f5222d' }}
                          suffix="个"
                        />
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          )}

          {/* 客户赠送列表 */}
          <Card>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>客户赠送列表</h3>
              <Button
                type="primary"
                icon={<GiftOutlined />}
                onClick={handleGenerateGifts}
                disabled={customerGiftData.length === 0}
              >
                生成赠送记录
              </Button>
            </div>

            <Table
              columns={giftColumns}
              dataSource={customerGiftData}
              rowKey="customerName"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 个符合条件的客户`
              }}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab="赠送规则" key="rules">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Card title="赠送阶梯规则" size="small">
                <Table
                  dataSource={customerGiftService.GIFT_RULES.filter(rule => rule.display)}
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: '销售数量范围',
                      key: 'range',
                      render: (_, rule) => (
                        <span style={{ fontFamily: 'monospace' }}>
                          {rule.max === Infinity ? `≥ ${rule.min.toLocaleString()}` : `${rule.min.toLocaleString()} - ${rule.max.toLocaleString()}`}
                        </span>
                      )
                    },
                    {
                      title: '每日赠送',
                      dataIndex: 'dailyGiftQuantity',
                      key: 'dailyGiftQuantity',
                      render: (quantity) => (
                        <strong style={{ color: '#52c41a' }}>
                          {quantity} 件/天
                        </strong>
                      )
                    },
                    {
                      title: '显示效果',
                      key: 'display',
                      render: (_, rule) => (
                        <Tag color={rule.color}>
                          {rule.color === 'red' ? 'VIP客户 (红色)' : '普通客户 (蓝色)'}
                        </Tag>
                      )
                    }
                  ]}
                />
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="统计说明" size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="统计周期">
                    本月和上月的销售数据
                  </Descriptions.Item>
                  <Descriptions.Item label="统计类型">
                    只统计"销售"类型的交易记录
                  </Descriptions.Item>
                  <Descriptions.Item label="显示门槛">
                    销售数量 ≥ 300 件的客户
                  </Descriptions.Item>
                  <Descriptions.Item label="排序规则">
                    按销售数量降序排列
                  </Descriptions.Item>
                  <Descriptions.Item label="赠送原则">
                    基于客户忠诚度和购买量
                  </Descriptions.Item>
                </Descriptions>

                <Alert
                  message="注意事项"
                  description="赠送数量不计入销售统计和员工提成计算。VIP客户(≥5000件)享受最高赠送待遇。"
                  type="warning"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="赠送历史" key="history">
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadGiftHistory}
              >
                刷新历史
              </Button>
            </div>

            <Table
              columns={historyColumns}
              dataSource={giftHistory}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条赠送记录`
              }}
              size="small"
              summary={() => {
                const totalGifts = giftHistory.reduce((sum, gift) => sum + parseFloat(gift.gift_quantity), 0);
                const totalSales = giftHistory.reduce((sum, gift) => sum + parseFloat(gift.sales_amount), 0);
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}>
                        <strong>总计</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}></Table.Summary.Cell>
                      <Table.Summary.Cell index={2}></Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        <strong style={{ color: '#722ed1' }}>
                          {formatCurrency(totalSales)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <strong style={{ color: '#52c41a' }}>
                          {totalGifts} 件
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}></Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default CustomerGiftManagement;
