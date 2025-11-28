import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  InputNumber,
  Modal,
  message,
  Descriptions,
  Tag,
  Divider,
  Alert
} from 'antd';
import {
  DollarOutlined,
  MinusCircleOutlined,
  TrophyOutlined,
  ShoppingCartOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { bonusPoolService } from '../../services/bonusPoolService';
import { authService } from '../../services/authService';
import dayjs from 'dayjs';

const BonusPool = ({ user }) => {
  const [bonusPoolData, setBonusPoolData] = useState(null);
  const [deductions, setDeductions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deductModalVisible, setDeductModalVisible] = useState(false);
  const [deductAmount, setDeductAmount] = useState(null);
  const [deducting, setDeducting] = useState(false);
  const isMerchant = authService.isMerchant() || authService.isAdmin();
  const isEmployee = authService.isEmployee();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const poolData = await bonusPoolService.calculateBonusPool();
      setBonusPoolData(poolData);
      
      // 获取所有扣款记录（不分年月，用于显示历史记录）
      const deductionRecords = await bonusPoolService.getAllDeductions();
      setDeductions(deductionRecords);
    } catch (error) {
      console.error('加载奖金池数据失败:', error);
      message.error('加载奖金池数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeduct = () => {
    // 直接打开Modal，让用户输入金额
    setDeductModalVisible(true);
    setDeductAmount(null); // 重置金额
  };

  const handleConfirmDeduct = async () => {
    if (!deductAmount || deductAmount <= 0) {
      message.warning('请输入有效的扣款金额');
      return;
    }

    setDeducting(true);
    try {
      const currentUser = authService.getCurrentUser();
      await bonusPoolService.deductBonus(
        deductAmount,
        currentUser.id || currentUser.name,
        currentUser.name
      );
      message.success('扣款成功');
      setDeductModalVisible(false);
      setDeductAmount(null);
      await loadData(); // 重新加载数据
    } catch (error) {
      console.error('扣款失败:', error);
      message.error(error.message || '扣款失败');
    } finally {
      setDeducting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss');
  };

  const deductionColumns = [
    {
      title: '扣款时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => formatDate(text),
      width: 180
    },
    {
      title: '扣除金额',
      dataIndex: 'deduction_amount',
      key: 'deduction_amount',
      render: (amount) => (
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
          -{formatCurrency(amount)}
        </span>
      ),
      align: 'right',
      width: 150
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      key: 'operator_name',
      width: 120
    },
    {
      title: '扣款后余额',
      dataIndex: 'remaining_balance',
      key: 'remaining_balance',
      render: (balance) => formatCurrency(balance),
      align: 'right',
      width: 150
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>
          <TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />
          奖金池管理
        </h2>
        <div>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
            loading={loading}
            style={{ marginRight: 8 }}
          >
            刷新
          </Button>
          {isMerchant && (
            <Button
              type="primary"
              icon={<MinusCircleOutlined />}
              onClick={handleDeduct}
              disabled={!bonusPoolData || bonusPoolData.currentBalance <= 0}
            >
              扣款
            </Button>
          )}
        </div>
      </div>

      {bonusPoolData && (
        <>
          {/* 员工端只显示余额 */}
          {isEmployee ? (
            <Card
              style={{
                background: bonusPoolData.currentBalance > 0 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              }}
            >
              <Statistic
                title={
                  <span style={{ color: 'white', fontSize: 18 }}>
                    当前奖金池余额
                  </span>
                }
                value={bonusPoolData.currentBalance}
                prefix={<TrophyOutlined style={{ color: 'white' }} />}
                formatter={(value) => (
                  <span style={{ color: 'white', fontSize: 36, fontWeight: 'bold' }}>
                    {formatCurrency(value)}
                  </span>
                )}
              />
            </Card>
          ) : (
            <>
              {/* 奖金池概览 */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="本月销售额"
                      value={bonusPoolData.salesAmount}
                      prefix={<ShoppingCartOutlined />}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{ color: '#3f8600' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="回收金额"
                      value={bonusPoolData.returnAmount}
                      prefix={<ArrowDownOutlined />}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{ color: '#cf1322' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="工资总额"
                      value={bonusPoolData.totalSalary}
                      prefix={<DollarOutlined />}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card>
                    <Statistic
                      title="固定成本"
                      value={bonusPoolData.fixedCost}
                      prefix={<DollarOutlined />}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 净利润和奖金池 */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12}>
                  <Card>
                    <Statistic
                      title="当月净利润"
                      value={bonusPoolData.netProfit}
                      prefix={<DollarOutlined />}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{
                        color: bonusPoolData.netProfit >= 0 ? '#3f8600' : '#cf1322',
                        fontSize: 24,
                        fontWeight: 'bold'
                      }}
                    />
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      销售额 - 回收金额 - 工资总额 - 固定成本
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card>
                    <Statistic
                      title="本月奖金池"
                      value={bonusPoolData.bonusPool}
                      prefix={<TrophyOutlined />}
                      formatter={(value) => formatCurrency(value)}
                      valueStyle={{
                        color: '#faad14',
                        fontSize: 24,
                        fontWeight: 'bold'
                      }}
                    />
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      净利润 × 1%
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* 当前余额 */}
              <Card
                style={{
                  marginBottom: 24,
                  background: bonusPoolData.currentBalance > 0 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                }}
              >
                <Statistic
                  title={
                    <span style={{ color: 'white', fontSize: 16 }}>
                      累计奖金池余额
                    </span>
                  }
                  value={bonusPoolData.currentBalance}
                  prefix={<TrophyOutlined style={{ color: 'white' }} />}
                  formatter={(value) => (
                    <span style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>
                      {formatCurrency(value)}
                    </span>
                  )}
                />
                {bonusPoolData.totalDeductions > 0 && (
                  <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                    累计已扣款：{formatCurrency(bonusPoolData.totalDeductions)}
                  </div>
                )}
              </Card>

              {/* 计算明细 */}
              <Card title="计算明细" style={{ marginBottom: 24 }}>
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="本月销售额">
                    {formatCurrency(bonusPoolData.salesAmount)}
                  </Descriptions.Item>
                  <Descriptions.Item label="回收金额">
                    <span style={{ color: '#cf1322' }}>
                      -{formatCurrency(bonusPoolData.returnAmount)}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="工资总额">
                    <span style={{ color: '#cf1322' }}>
                      -{formatCurrency(bonusPoolData.totalSalary)}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="固定成本">
                    <span style={{ color: '#cf1322' }}>
                      -{formatCurrency(bonusPoolData.fixedCost)}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="净利润">
                    <Tag color={bonusPoolData.netProfit >= 0 ? 'success' : 'error'} style={{ fontSize: 16 }}>
                      {formatCurrency(bonusPoolData.netProfit)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="本月奖金池（净利润 × 1%）">
                    <Tag color="gold" style={{ fontSize: 16 }}>
                      {formatCurrency(bonusPoolData.bonusPool)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="累计已扣款">
                    <span style={{ color: '#cf1322' }}>
                      -{formatCurrency(bonusPoolData.totalDeductions)}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="累计余额">
                    <Tag color={bonusPoolData.currentBalance > 0 ? 'success' : 'default'} style={{ fontSize: 18, fontWeight: 'bold' }}>
                      {formatCurrency(bonusPoolData.currentBalance)}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </>
          )}
        </>
      )}

      {/* 扣款记录 - 仅商人端显示 */}
      {!isEmployee && (
        <Card title="扣款记录">
          <Table
            columns={deductionColumns}
            dataSource={deductions}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
            locale={{
              emptyText: '暂无扣款记录'
            }}
          />
        </Card>
      )}

      {/* 扣款确认对话框 */}
      <Modal
        title="扣款确认"
        open={deductModalVisible}
        onOk={handleConfirmDeduct}
        onCancel={() => {
          setDeductModalVisible(false);
          setDeductAmount(null);
        }}
        confirmLoading={deducting}
        okText="确认扣款"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="扣款操作"
            description={`当前奖金池余额：${bonusPoolData ? formatCurrency(bonusPoolData.currentBalance) : '0.00'}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            扣款金额（元）
          </label>
          <InputNumber
            style={{ width: '100%' }}
            placeholder="请输入扣款金额"
            min={0.01}
            max={bonusPoolData ? bonusPoolData.currentBalance : undefined}
            precision={2}
            value={deductAmount}
            onChange={(value) => setDeductAmount(value)}
            prefix={<DollarOutlined />}
          />
          {bonusPoolData && deductAmount && deductAmount > bonusPoolData.currentBalance && (
            <div style={{ color: '#ff4d4f', marginTop: 8 }}>
              扣款金额不能超过当前余额
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default BonusPool;

