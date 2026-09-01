import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Input,
  Select,
  DatePicker,
  Card,
  Tag,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  List,
  Pagination
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  ShoppingOutlined,
  DollarOutlined,
  UpOutlined
} from '@ant-design/icons';
import { transactionService } from '../../services/transactionService';
import { employeePaymentService } from '../../services/employeePaymentService';
import { customerService } from '../../services/customerService';
import { transactionTypes } from '../../config/supabase';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const formatCurrency = (amount) =>
  new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount || 0);

const formatRelativeTime = (dateStr) => {
  const d = dayjs(dateStr);
  const today = dayjs().startOf('day');
  const yesterday = today.subtract(1, 'day');
  const time = d.format('HH:mm');
  if (d.isAfter(today)) return `今天 ${time}`;
  if (d.isAfter(yesterday)) return `昨天 ${time}`;
  return d.format('MM-DD HH:mm');
};

const getTypeColor = (type) => {
  const colors = { purchase: 'blue', sale: 'green', return: 'orange', gift: 'red' };
  return colors[type] || 'default';
};

const EmployeeTransactionList = ({ user, isMobile = false }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ customerName: '', type: '', dateRange: null });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [stats, setStats] = useState(null);
  const [paymentStats, setPaymentStats] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [customerBindings, setCustomerBindings] = useState({});
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    loadTransactions();
    loadStats();
    loadPaymentStats();
    loadCustomerBindings();

    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadTransactions();
        loadStats();
        loadPaymentStats();
        loadCustomerBindings();
      }, 30000);
    }
    return () => interval && clearInterval(interval);
  }, [filters, pagination.current, pagination.pageSize, autoRefresh]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const filterParams = {
        customerName: filters.customerName,
        type: filters.type,
        startDate: filters.dateRange?.[0]?.toISOString(),
        endDate: filters.dateRange?.[1]?.toISOString(),
      };
      const allData = await transactionService.getTransactions(filterParams);
      const employeeCustomers = await customerService.getEmployeeCustomers(user.name);
      const customerNames = employeeCustomers.map((c) => c.customer_name);
      const employeeTransactions = allData.filter((t) =>
        customerNames.includes(t.customer_name)
      );
      setTransactions(employeeTransactions);
      setPagination((prev) => ({ ...prev, total: employeeTransactions.length }));
    } catch (error) {
      console.error('加载交易记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const currentMonth = dayjs();
      const allData = await transactionService.getTransactions({
        startDate: currentMonth.startOf('month').toISOString(),
        endDate: currentMonth.endOf('month').toISOString(),
      });
      const employeeCustomers = await customerService.getEmployeeCustomers(user.name);
      const customerNames = employeeCustomers.map((c) => c.customer_name);
      const employeeSales = allData.filter(
        (t) => customerNames.includes(t.customer_name) && t.type === 'sale'
      );
      setStats({
        monthlySalesQuantity: employeeSales.reduce(
          (sum, t) => sum + (parseFloat(t.quantity) || 0),
          0
        ),
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  const loadPaymentStats = async () => {
    try {
      const paymentData = await employeePaymentService.getEmployeePaymentStats(user.name);
      setPaymentStats(paymentData);
    } catch (error) {
      console.error('加载收款统计失败:', error);
    }
  };

  const loadCustomerBindings = async () => {
    try {
      const bindings = await customerService.getAllCustomerBindings();
      const bindingMap = {};
      bindings.forEach((b) => {
        bindingMap[b.customer_name] = b.employee_name;
      });
      setCustomerBindings(bindingMap);
    } catch (error) {
      console.error('加载客户绑定失败:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const clearFilters = () => {
    setFilters({ customerName: '', type: '', dateRange: null });
  };

  const paginatedTransactions = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    return transactions.slice(start, start + pagination.pageSize);
  }, [transactions, pagination.current, pagination.pageSize]);

  const balance = paymentStats?.currentBalance || 0;
  const balanceColor = balance >= 0 ? '#1677ff' : '#f5222d';

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
      width: 150,
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => <Tag color={getTypeColor(type)}>{transactionTypes[type]}</Tag>,
      width: 80,
    },
    {
      title: '客户',
      dataIndex: 'customer_name',
      key: 'customer_name',
      ellipsis: true,
      width: 150,
    },
    {
      title: '收款员工',
      dataIndex: 'collector',
      key: 'collector',
      ellipsis: true,
      width: 100,
    },
    {
      title: '绑定员工',
      dataIndex: 'customer_name',
      key: 'bound_employee',
      render: (customerName) => {
        const bound = customerBindings[customerName];
        return bound ? <Tag color="blue">{bound}</Tag> : <Tag>未绑定</Tag>;
      },
      width: 100,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (q) => Math.floor(q),
      width: 80,
      align: 'right',
    },
    {
      title: '赠送',
      dataIndex: 'gift_quantity',
      key: 'gift_quantity',
      render: (q) => (q > 0 ? Math.floor(q) : '-'),
      width: 80,
      align: 'right',
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (p) => formatCurrency(p),
      width: 100,
      align: 'right',
    },
    {
      title: '总金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: amount >= 0 ? '#52c41a' : '#f5222d' }}>
          {formatCurrency(amount)}
        </span>
      ),
      width: 120,
      align: 'right',
      sorter: (a, b) => a.total_amount - b.total_amount,
    },
  ];

  const renderBalanceHero = () => (
    <div className="txn-balance-hero">
      <div className="txn-balance-label">收款余额</div>
      <div className="txn-balance-amount" style={{ color: balanceColor }}>
        {formatCurrency(balance)}
      </div>
      <div className="txn-balance-tags">
        {stats && (
          <Tag className="txn-balance-tag">
            本月销售 {Math.floor(stats.monthlySalesQuantity)} 件
          </Tag>
        )}
        {paymentStats && (
          <Tag className="txn-balance-tag">
            已转账 {formatCurrency(paymentStats.totalTransferred || 0)}
          </Tag>
        )}
        {autoRefresh && (
          <Tag color="success" className="txn-balance-tag txn-balance-tag--sync">
            实时同步
          </Tag>
        )}
      </div>
    </div>
  );

  const renderDesktopStats = () =>
    stats && (
      <Row gutter={16} className="txn-desktop-stats">
        <Col xs={24} sm={6}>
          <Statistic
            title="我的本月销售数量"
            value={Math.floor(stats.monthlySalesQuantity)}
            valueStyle={{ color: '#1890ff' }}
            prefix={<ShoppingOutlined />}
            suffix="件"
          />
        </Col>
        <Col xs={24} sm={6}>
          <Statistic title="我的交易记录" value={transactions.length} suffix="笔" />
        </Col>
        <Col xs={24} sm={6}>
          <Statistic
            title="我的收款余额"
            value={balance}
            formatter={(v) => formatCurrency(v)}
            valueStyle={{ color: balanceColor, fontWeight: 'bold' }}
            prefix={<DollarOutlined />}
          />
        </Col>
        <Col xs={24} sm={6}>
          <Statistic
            title="已转账"
            value={paymentStats?.totalTransferred || 0}
            formatter={(v) => formatCurrency(v)}
          />
        </Col>
      </Row>
    );

  const renderFilters = () => (
    <div className="txn-filters">
      <div className="txn-filters-row">
        <Input
          placeholder="搜索客户"
          prefix={<SearchOutlined />}
          value={filters.customerName}
          onChange={(e) => handleFilterChange('customerName', e.target.value)}
          allowClear
          className="txn-filters-search"
        />
        {isMobile ? (
          <Button
            icon={filtersExpanded ? <UpOutlined /> : <FilterOutlined />}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            筛选
          </Button>
        ) : (
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadTransactions} loading={loading}>
              刷新
            </Button>
            <Button icon={<FilterOutlined />} onClick={clearFilters}>
              清空
            </Button>
          </Space>
        )}
      </div>

      {(filtersExpanded || !isMobile) && (
        <div className="txn-filters-expanded">
          <Select
            placeholder="交易类型"
            value={filters.type || undefined}
            onChange={(v) => handleFilterChange('type', v)}
            allowClear
            style={{ width: isMobile ? '100%' : 160 }}
          >
            {Object.entries(transactionTypes).map(([key, value]) => (
              <Option key={key} value={key}>{value}</Option>
            ))}
          </Select>
          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => handleFilterChange('dateRange', dates)}
            format="YYYY-MM-DD"
            style={{ width: isMobile ? '100%' : undefined }}
          />
          {isMobile && (
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadTransactions} loading={loading} block>
                刷新
              </Button>
              <Button icon={<FilterOutlined />} onClick={clearFilters} block>
                清空
              </Button>
            </Space>
          )}
        </div>
      )}
    </div>
  );

  const renderMobileCards = () => (
    <List
      className="txn-mobile-list"
      loading={loading}
      dataSource={paginatedTransactions}
      renderItem={(item) => {
        const isNegative = item.total_amount < 0;
        const giftText =
          item.gift_quantity > 0 ? ` · 赠送 ${Math.floor(item.gift_quantity)}` : '';
        return (
          <Card className="txn-mobile-card" size="small">
            <div className="txn-mobile-card-header">
              <span className="txn-mobile-card-title">
                {item.customer_name} · {transactionTypes[item.type]}
              </span>
              <span
                className="txn-mobile-card-amount"
                style={{ color: isNegative ? '#f5222d' : '#1677ff' }}
              >
                {formatCurrency(item.total_amount)}
              </span>
            </div>
            <div className="txn-mobile-card-meta">
              {formatRelativeTime(item.created_at)}
              {item.quantity ? ` · 数量 ${Math.floor(item.quantity)}${giftText}` : ''}
            </div>
          </Card>
        );
      }}
    />
  );

  const paginationNode = (
    <Pagination
      className="txn-pagination"
      current={pagination.current}
      pageSize={pagination.pageSize}
      total={pagination.total}
      showSizeChanger={!isMobile}
      showTotal={isMobile ? undefined : (total, range) =>
        `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
      }
      onChange={(page, pageSize) =>
        setPagination((prev) => ({ ...prev, current: page, pageSize }))
      }
      size={isMobile ? 'small' : 'default'}
      simple={isMobile}
    />
  );

  return (
    <div className="employee-transaction-list">
      {isMobile ? renderBalanceHero() : renderDesktopStats()}

      {renderFilters()}

      <div className="txn-list-header">
        <span className="txn-list-title">
          交易记录 {transactions.length > 0 && `(${transactions.length})`}
        </span>
        <Button
          size="small"
          type={autoRefresh ? 'primary' : 'default'}
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          {autoRefresh ? '自动刷新' : '手动刷新'}
        </Button>
      </div>

      {isMobile ? (
        <>
          {renderMobileCards()}
          {pagination.total > pagination.pageSize && paginationNode}
        </>
      ) : (
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, pageSize) =>
              setPagination((prev) => ({ ...prev, current: page, pageSize })),
          }}
          scroll={{ x: 1200 }}
          size="small"
        />
      )}
    </div>
  );
};

export default EmployeeTransactionList;
