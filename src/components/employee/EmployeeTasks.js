import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Progress,
  Statistic,
  Alert,
  Tag,
  Timeline,
  Calendar,
  Badge
} from 'antd';
import {
  CalendarOutlined,
  TrophyOutlined,
  AimOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined
} from '@ant-design/icons';
import { transactionService } from '../../services/transactionService';
import { customerService } from '../../services/customerService';
import dayjs from 'dayjs';

const EmployeeTasks = ({ user }) => {
  const [taskData, setTaskData] = useState({
    dailyRegistrations: 0,
    dailySales: 0,
    monthlyRegistrations: 0,
    monthlySales: 0
  });
  const [loading, setLoading] = useState(false);

  // 任务目标
  const DAILY_TARGETS = {
    registrations: 5, // 每日注册5个客户
    sales: 200 // 每日销售200件
  };

  const MONTHLY_TARGETS = {
    registrations: dayjs().daysInMonth() * DAILY_TARGETS.registrations, // 本月总注册目标
    sales: dayjs().daysInMonth() * DAILY_TARGETS.sales // 本月总销售目标
  };

  useEffect(() => {
    loadTaskData();
  }, []);

  const loadTaskData = async () => {
    setLoading(true);
    try {
      const today = dayjs();
      const startOfMonth = today.startOf('month');
      const startOfDay = today.startOf('day');
      const endOfDay = today.endOf('day');

      // 获取今日和本月的数据
      const [
        todayTransactions,
        monthlyTransactions,
        todayBindings,
        monthlyBindings
      ] = await Promise.all([
        // 今日交易记录
        transactionService.getTransactions({
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString()
        }),
        // 本月交易记录
        transactionService.getTransactions({
          startDate: startOfMonth.toISOString(),
          endDate: today.toISOString()
        }),
        // 今日客户绑定
        customerService.getAllCustomerBindings(),
        // 本月客户绑定
        customerService.getAllCustomerBindings()
      ]);

      // 筛选该员工的数据
      const employeeTodayTransactions = todayTransactions.filter(t => t.collector === user.name);
      const employeeMonthlyTransactions = monthlyTransactions.filter(t => t.collector === user.name);

      // 计算今日销售数量
      const dailySales = employeeTodayTransactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + (parseFloat(t.quantity) || 0), 0);

      // 计算本月销售数量
      const monthlySales = employeeMonthlyTransactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + (parseFloat(t.quantity) || 0), 0);

      // 计算今日客户注册（绑定）
      const todayBindingsCount = todayBindings.filter(b => 
        b.employee_name === user.name && 
        dayjs(b.created_at).isSame(today, 'day')
      ).length;

      // 计算本月客户注册（绑定）
      const monthlyBindingsCount = monthlyBindings.filter(b => 
        b.employee_name === user.name && 
        dayjs(b.created_at).isSame(today, 'month')
      ).length;

      setTaskData({
        dailyRegistrations: todayBindingsCount,
        dailySales: Math.floor(dailySales),
        monthlyRegistrations: monthlyBindingsCount,
        monthlySales: Math.floor(monthlySales)
      });
    } catch (error) {
      console.error('加载任务数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskStatus = (current, target) => {
    const percentage = (current / target) * 100;
    if (percentage >= 100) return { status: 'success', text: '已完成', color: '#52c41a' };
    if (percentage >= 80) return { status: 'active', text: '接近完成', color: '#1890ff' };
    if (percentage >= 50) return { status: 'normal', text: '进行中', color: '#faad14' };
    return { status: 'exception', text: '需努力', color: '#f5222d' };
  };

  const dailyRegStatus = getTaskStatus(taskData.dailyRegistrations, DAILY_TARGETS.registrations);
  const dailySalesStatus = getTaskStatus(taskData.dailySales, DAILY_TARGETS.sales);
  const monthlyRegStatus = getTaskStatus(taskData.monthlyRegistrations, MONTHLY_TARGETS.registrations);
  const monthlySalesStatus = getTaskStatus(taskData.monthlySales, MONTHLY_TARGETS.sales);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, marginBottom: 16 }}>
          {user.name} 的本月任务
        </h2>
        
        <Alert
          message="任务说明"
          description="每日任务：注册5个客户 + 销售200件商品。跟踪个人业绩表现和目标完成情况。"
          type="info"
          showIcon
        />
      </div>

      {/* 今日任务进度 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="今日任务进度" size="small">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Card size="small" style={{ background: '#f6ffed' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: 16 }}>
                      <AimOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                    </div>
                    <h3>客户注册任务</h3>
                    <Statistic
                      title="今日进度"
                      value={taskData.dailyRegistrations}
                      suffix={`/ ${DAILY_TARGETS.registrations}`}
                      valueStyle={{ color: dailyRegStatus.color, fontSize: 20 }}
                    />
                    <Progress
                      percent={(taskData.dailyRegistrations / DAILY_TARGETS.registrations) * 100}
                      status={dailyRegStatus.status}
                      strokeColor={dailyRegStatus.color}
                    />
                    <Tag color={dailyRegStatus.color} style={{ marginTop: 8 }}>
                      {dailyRegStatus.text}
                    </Tag>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} md={12}>
                <Card size="small" style={{ background: '#e6f7ff' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: 16 }}>
                      <TrophyOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                    </div>
                    <h3>销售数量任务</h3>
                    <Statistic
                      title="今日进度"
                      value={taskData.dailySales}
                      suffix={`/ ${DAILY_TARGETS.sales} 件`}
                      valueStyle={{ color: dailySalesStatus.color, fontSize: 20 }}
                    />
                    <Progress
                      percent={(taskData.dailySales / DAILY_TARGETS.sales) * 100}
                      status={dailySalesStatus.status}
                      strokeColor={dailySalesStatus.color}
                    />
                    <Tag color={dailySalesStatus.color} style={{ marginTop: 8 }}>
                      {dailySalesStatus.text}
                    </Tag>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 本月任务总览 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="本月任务总览" size="small">
            <Row gutter={16}>
              <Col xs={24} sm={6}>
                <Card size="small">
                  <Statistic
                    title="本月注册客户"
                    value={taskData.monthlyRegistrations}
                    suffix={`/ ${MONTHLY_TARGETS.registrations}`}
                    valueStyle={{ color: monthlyRegStatus.color }}
                    prefix={<AimOutlined />}
                  />
                  <Progress
                    percent={(taskData.monthlyRegistrations / MONTHLY_TARGETS.registrations) * 100}
                    size="small"
                    strokeColor={monthlyRegStatus.color}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={6}>
                <Card size="small">
                  <Statistic
                    title="本月销售数量"
                    value={taskData.monthlySales}
                    suffix={`/ ${MONTHLY_TARGETS.sales} 件`}
                    valueStyle={{ color: monthlySalesStatus.color }}
                    prefix={<TrophyOutlined />}
                  />
                  <Progress
                    percent={(taskData.monthlySales / MONTHLY_TARGETS.sales) * 100}
                    size="small"
                    strokeColor={monthlySalesStatus.color}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={6}>
                <Card size="small">
                  <Statistic
                    title="任务完成率"
                    value={((taskData.monthlyRegistrations / MONTHLY_TARGETS.registrations + taskData.monthlySales / MONTHLY_TARGETS.sales) / 2 * 100).toFixed(1)}
                    suffix="%"
                    valueStyle={{ 
                      color: ((taskData.monthlyRegistrations / MONTHLY_TARGETS.registrations + taskData.monthlySales / MONTHLY_TARGETS.sales) / 2) >= 0.8 ? '#52c41a' : '#faad14'
                    }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={6}>
                <Card size="small">
                  <Statistic
                    title="剩余天数"
                    value={dayjs().endOf('month').diff(dayjs(), 'day')}
                    suffix="天"
                    valueStyle={{ color: '#722ed1' }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

    </div>
  );
};

export default EmployeeTasks;
