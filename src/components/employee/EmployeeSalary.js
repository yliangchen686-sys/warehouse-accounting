import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Descriptions,
  Table,
  Tag
} from 'antd';
import {
  DollarOutlined,
  TrophyOutlined,
  GiftOutlined,
  CalculatorOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { salaryService } from '../../services/salaryService';
import { employeePaymentService } from '../../services/employeePaymentService';
import dayjs from 'dayjs';

const EmployeeSalary = ({ user }) => {
  const [salaryData, setSalaryData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSalaryData();
  }, []);

  const loadSalaryData = async () => {
    setLoading(true);
    try {
      const currentDate = dayjs();
      const year = currentDate.year();
      const month = currentDate.month() + 1;
      
      const [salaryResult, paymentResult] = await Promise.all([
        salaryService.calculateMonthlySalary(user.name, year, month),
        employeePaymentService.getEmployeePaymentStats(user.name)
      ]);
      
      setSalaryData(salaryResult);
      setPaymentData(paymentResult);
    } catch (error) {
      console.error('加载工资数据失败:', error);
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

  const getBonusProgress = (salesQuantity) => {
    const tiers = [
      { min: 0, max: 1000, bonus: 0 },
      { min: 1001, max: 3000, bonus: 500 },
      { min: 3001, max: 5000, bonus: 1000 },
      { min: 5001, max: 7000, bonus: 2000 },
      { min: 7001, max: 20000, bonus: 5000 },
      { min: 20001, max: Infinity, bonus: 10000 }
    ];

    let currentTier = tiers.find(tier => salesQuantity >= tier.min && salesQuantity <= tier.max);
    let nextTier = tiers.find(tier => tier.min > salesQuantity);

    if (!currentTier) currentTier = tiers[0];

    let progress = 0;
    if (nextTier) {
      progress = ((salesQuantity - currentTier.min) / (nextTier.min - currentTier.min)) * 100;
    } else {
      progress = 100; // 已达到最高等级
    }

    return {
      currentTier,
      nextTier,
      progress: Math.min(progress, 100)
    };
  };

  if (!salaryData) {
    return (
      <Card loading={loading}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          正在加载工资数据...
        </div>
      </Card>
    );
  }

  const bonusInfo = getBonusProgress(salaryData.totalSalesQuantity);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, marginBottom: 16 }}>
          {dayjs().format('YYYY年MM月')} 工资详情
        </h2>
        
        <Alert
          message={`${user.name} 的工资明细`}
          description={`工资 = 底薪(¥${salaryData.baseSalary.toLocaleString()}) + 提成(销售数量×¥0.7) + 奖金(按销售量阶梯)，赠送数量不计入工资计算。`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      </div>

      {/* 工资和收款总览 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={5}>
          <Card>
            <Statistic
              title="本月总工资"
              value={salaryData.totalSalary}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: '#f5222d', fontSize: 20 }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={5}>
          <Card>
            <Statistic
              title="底薪"
              value={salaryData.baseSalary}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={5}>
          <Card>
            <Statistic
              title="销售提成"
              value={salaryData.commission}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: '#52c41a' }}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={4}>
          <Card>
            <Statistic
              title="销售奖金"
              value={salaryData.bonus}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ color: '#722ed1' }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={5}>
          <Card style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
            <Statistic
              title="我的收款余额"
              value={paymentData?.currentBalance || 0}
              formatter={(value) => formatCurrency(value)}
              valueStyle={{ 
                color: (paymentData?.currentBalance || 0) >= 0 ? '#52c41a' : '#f5222d',
                fontWeight: 'bold',
                fontSize: 18
              }}
              prefix={<DollarOutlined />}
            />
            <div style={{ fontSize: 12, color: '#666', marginTop: 8, textAlign: 'center' }}>
              {paymentData && (
                <>
                  <div>总收款: {formatCurrency(paymentData.totalAmount || 0)}</div>
                  <div>已转账: {formatCurrency(paymentData.totalTransferred || 0)}</div>
                </>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 销售业绩和奖金进度 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="销售业绩" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="本月销售数量"
                  value={Math.floor(salaryData.totalSalesQuantity)}
                  valueStyle={{ color: '#1890ff', fontSize: 20 }}
                  suffix="件"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="交易笔数"
                  value={salaryData.transactionCount}
                  valueStyle={{ color: '#52c41a' }}
                  suffix="笔"
                />
              </Col>
            </Row>
            
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8 }}>
                提成计算: {Math.floor(salaryData.totalSalesQuantity)} × ¥0.7 = <strong style={{ color: '#52c41a' }}>{formatCurrency(salaryData.commission)}</strong>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="奖金进度" size="small">
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>当前等级奖金: <strong style={{ color: '#722ed1' }}>{formatCurrency(bonusInfo.currentTier.bonus)}</strong></span>
                {bonusInfo.nextTier && (
                  <span>下级奖金: <strong>{formatCurrency(bonusInfo.nextTier.bonus)}</strong></span>
                )}
              </div>
              
              {bonusInfo.nextTier ? (
                <>
                  <Progress
                    percent={bonusInfo.progress}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    format={() => `${bonusInfo.progress.toFixed(1)}%`}
                  />
                  <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                    还需销售 {bonusInfo.nextTier.min - salaryData.totalSalesQuantity} 件可获得下一级奖金
                  </div>
                </>
              ) : (
                <>
                  <Progress percent={100} strokeColor="#722ed1" />
                  <div style={{ fontSize: 12, color: '#722ed1', marginTop: 8 }}>
                    🎉 已达到最高奖金等级！
                  </div>
                </>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 工资明细表 */}
      <Card title="工资明细" size="small">
        <Table
          dataSource={[salaryData]}
          pagination={false}
          size="small"
          columns={[
            {
              title: '项目',
              key: 'item',
              render: () => '本月工资'
            },
            {
              title: '底薪',
              dataIndex: 'baseSalary',
              key: 'baseSalary',
              render: (amount) => formatCurrency(amount)
            },
            {
              title: '销售数量',
              dataIndex: 'totalSalesQuantity',
              key: 'totalSalesQuantity',
              render: (quantity) => `${Math.floor(quantity)} 件`
            },
            {
              title: '提成',
              dataIndex: 'commission',
              key: 'commission',
              render: (amount) => (
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                  {formatCurrency(amount)}
                </span>
              )
            },
            {
              title: '奖金',
              dataIndex: 'bonus',
              key: 'bonus',
              render: (amount) => (
                <span style={{ color: '#722ed1', fontWeight: 'bold' }}>
                  {formatCurrency(amount)}
                </span>
              )
            },
            {
              title: '总工资',
              dataIndex: 'totalSalary',
              key: 'totalSalary',
              render: (amount) => (
                <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 16 }}>
                  {formatCurrency(amount)}
                </span>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default EmployeeSalary;
