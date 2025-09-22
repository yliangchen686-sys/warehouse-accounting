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
  Descriptions,
  Progress,
  Select
} from 'antd';
import {
  DollarOutlined,
  CalculatorOutlined,
  TrophyOutlined,
  ReloadOutlined,
  GiftOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { salaryService } from '../../services/salaryService';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Option } = Select;

const SalaryManagement = () => {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [monthOptions, setMonthOptions] = useState([]);
  const [bonusTiers, setBonusTiers] = useState([]);
  const [activeTab, setActiveTab] = useState('current');

  useEffect(() => {
    loadSalaries();
    setBonusTiers(salaryService.getBonusTiers());
    generateMonthOptions();
  }, [selectedDate]);

  const generateMonthOptions = () => {
    const options = [];
    for (let i = 0; i < 3; i++) {
      const date = dayjs().subtract(i, 'month');
      options.push({
        value: date.format('YYYY-MM'),
        label: date.format('YYYY年MM月')
      });
    }
    setMonthOptions(options);
  };

  const loadSalaries = async () => {
    setLoading(true);
    try {
      const year = selectedDate.year();
      const month = selectedDate.month() + 1;
      const data = await salaryService.getAllEmployeesMonthlySalary(year, month);
      setSalaries(data);
    } catch (error) {
      message.error('加载工资数据失败');
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

  const getBonusColor = (salesQuantity) => {
    if (salesQuantity >= 20001) return '#722ed1';
    if (salesQuantity >= 7001) return '#f5222d';
    if (salesQuantity >= 5001) return '#fa8c16';
    if (salesQuantity >= 3001) return '#faad14';
    if (salesQuantity >= 1001) return '#52c41a';
    return '#d9d9d9';
  };

  const getSalaryLevel = (totalSalary) => {
    if (totalSalary >= 15000) return { level: '优秀', color: '#722ed1' };
    if (totalSalary >= 10000) return { level: '良好', color: '#52c41a' };
    if (totalSalary >= 8000) return { level: '一般', color: '#faad14' };
    return { level: '需提升', color: '#f5222d' };
  };

  // 计算总统计
  const totalStats = salaries.reduce((acc, salary) => ({
    totalSalary: acc.totalSalary + salary.totalSalary,
    totalCommission: acc.totalCommission + salary.commission,
    totalBonus: acc.totalBonus + salary.bonus,
    totalSalesQuantity: acc.totalSalesQuantity + salary.totalSalesQuantity
  }), { totalSalary: 0, totalCommission: 0, totalBonus: 0, totalSalesQuantity: 0 });

  const columns = [
    {
      title: '员工姓名',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 120
    },
    {
      title: '销售数量',
      dataIndex: 'totalSalesQuantity',
      key: 'totalSalesQuantity',
      render: (quantity) => (
        <span style={{ fontWeight: 'bold' }}>
          {quantity} 件
        </span>
      ),
      width: 100,
      sorter: (a, b) => a.totalSalesQuantity - b.totalSalesQuantity
    },
    {
      title: '底薪',
      dataIndex: 'baseSalary',
      key: 'baseSalary',
      render: (amount) => formatCurrency(amount),
      width: 100
    },
    {
      title: '提成',
      dataIndex: 'commission',
      key: 'commission',
      render: (amount, record) => (
        <div>
          <div style={{ fontWeight: 'bold', color: '#52c41a' }}>
            {formatCurrency(amount)}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {record.totalSalesQuantity} × ¥0.7
          </div>
        </div>
      ),
      width: 120,
      sorter: (a, b) => a.commission - b.commission
    },
    {
      title: '奖金',
      dataIndex: 'bonus',
      key: 'bonus',
      render: (amount, record) => (
        <div>
          <div style={{ 
            fontWeight: 'bold', 
            color: getBonusColor(record.totalSalesQuantity) 
          }}>
            {formatCurrency(amount)}
          </div>
          {amount > 0 && (
            <Progress
              percent={Math.min((record.totalSalesQuantity / 20000) * 100, 100)}
              size="small"
              strokeColor={getBonusColor(record.totalSalesQuantity)}
              showInfo={false}
            />
          )}
        </div>
      ),
      width: 120,
      sorter: (a, b) => a.bonus - b.bonus
    },
    {
      title: '总工资',
      dataIndex: 'totalSalary',
      key: 'totalSalary',
      render: (amount) => {
        const level = getSalaryLevel(amount);
        return (
          <div>
            <div style={{ fontWeight: 'bold', color: level.color, fontSize: 16 }}>
              {formatCurrency(amount)}
            </div>
            <Tag color={level.color} size="small">
              {level.level}
            </Tag>
          </div>
        );
      },
      width: 150,
      sorter: (a, b) => a.totalSalary - b.totalSalary
    },
    {
      title: '交易笔数',
      dataIndex: 'transactionCount',
      key: 'transactionCount',
      width: 100,
      sorter: (a, b) => a.transactionCount - b.transactionCount
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <h2 style={{ margin: 0 }}>员工工资管理</h2>
          </Col>
          <Col>
            <Space>
              <Select
                value={selectedDate.format('YYYY-MM')}
                onChange={(value) => setSelectedDate(dayjs(value))}
                style={{ width: 150 }}
                placeholder="选择月份"
              >
                {monthOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadSalaries}
                loading={loading}
              >
                重新计算
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="工资统计" key="current">
          {/* 总统计 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="总工资支出"
                  value={totalStats.totalSalary}
                  formatter={(value) => formatCurrency(value)}
                  valueStyle={{ color: '#f5222d' }}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="总提成"
                  value={totalStats.totalCommission}
                  formatter={(value) => formatCurrency(value)}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<RiseOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="总奖金"
                  value={totalStats.totalBonus}
                  formatter={(value) => formatCurrency(value)}
                  valueStyle={{ color: '#722ed1' }}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={6}>
              <Card size="small">
                <Statistic
                  title="总销售量"
                  value={totalStats.totalSalesQuantity}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<GiftOutlined />}
                  suffix="件"
                />
              </Card>
            </Col>
          </Row>

          <Card>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>
                {selectedDate.format('YYYY年MM月')} 工资明细
              </h3>
            </div>

            <Table
              columns={columns}
              dataSource={salaries}
              rowKey="employeeName"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 个员工`
              }}
              size="small"
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <strong>合计</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong>{totalStats.totalSalesQuantity} 件</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <strong>{formatCurrency(salaries.length * salaryService.BASE_SALARY)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3}>
                      <strong style={{ color: '#52c41a' }}>
                        {formatCurrency(totalStats.totalCommission)}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4}>
                      <strong style={{ color: '#722ed1' }}>
                        {formatCurrency(totalStats.totalBonus)}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5}>
                      <strong style={{ color: '#f5222d', fontSize: 16 }}>
                        {formatCurrency(totalStats.totalSalary)}
                      </strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6}>
                      <strong>{salaries.reduce((sum, s) => sum + s.transactionCount, 0)} 笔</strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </TabPane>

        <TabPane tab="工资规则" key="rules">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Card title="工资组成" size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="底薪">
                    <strong style={{ color: '#1890ff' }}>¥3,000</strong>
                    <span style={{ color: '#999', marginLeft: 8 }}>固定底薪</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="提成">
                    <strong style={{ color: '#52c41a' }}>销售数量 × ¥0.7</strong>
                    <span style={{ color: '#999', marginLeft: 8 }}>每件0.7元</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="奖金">
                    <strong style={{ color: '#722ed1' }}>按销售量阶梯</strong>
                    <span style={{ color: '#999', marginLeft: 8 }}>见右侧奖金表</span>
                  </Descriptions.Item>
                </Descriptions>
                
                <Alert
                  message="注意"
                  description="赠送数量不计算提成和奖金，只有实际销售数量才计入工资计算。"
                  type="warning"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="奖金阶梯表" size="small">
                <Table
                  dataSource={bonusTiers}
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: '销售量范围',
                      dataIndex: 'range',
                      key: 'range',
                      render: (range) => (
                        <span style={{ fontFamily: 'monospace' }}>{range}</span>
                      )
                    },
                    {
                      title: '奖金',
                      dataIndex: 'bonus',
                      key: 'bonus',
                      render: (bonus) => (
                        <strong style={{ 
                          color: bonus > 0 ? '#722ed1' : '#d9d9d9' 
                        }}>
                          {formatCurrency(bonus)}
                        </strong>
                      )
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="工资计算示例" size="small">
                <div style={{ background: '#fafafa', padding: 16, borderRadius: 6 }}>
                  <h4>示例：员工张三本月销售了 5,500 件商品</h4>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="底薪">
                      ¥3,000
                    </Descriptions.Item>
                    <Descriptions.Item label="提成">
                      5,500 × ¥0.7 = <strong style={{ color: '#52c41a' }}>¥3,850</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="奖金">
                      销售量 5,500 件，属于 5,001-7,000 范围 = <strong style={{ color: '#722ed1' }}>¥2,000</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="总工资">
                      ¥3,000 + ¥3,850 + ¥2,000 = <strong style={{ color: '#f5222d', fontSize: 16 }}>¥8,850</strong>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SalaryManagement;
