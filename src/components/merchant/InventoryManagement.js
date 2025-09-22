import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Input,
  Space,
  Tag,
  Tabs,
  Alert
} from 'antd';
import {
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import { inventoryService } from '../../services/inventoryService';
import dayjs from 'dayjs';

const { TabPane } = Tabs;

const InventoryManagement = () => {
  const [inventory, setInventory] = useState([]);
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');

  useEffect(() => {
    loadInventory();
    loadChanges();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getAllInventory();
      setInventory(data);
    } catch (error) {
      console.error('加载库存失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChanges = async () => {
    try {
      const data = await inventoryService.getInventoryChanges();
      setChanges(data);
    } catch (error) {
      console.error('加载库存变动记录失败:', error);
    }
  };

  const getStockStatus = (stock) => {
    if (stock <= 0) return { color: 'red', text: '缺货', icon: <WarningOutlined /> };
    if (stock <= 10) return { color: 'orange', text: '库存不足', icon: <WarningOutlined /> };
    return { color: 'green', text: '库存充足', icon: <CheckCircleOutlined /> };
  };

  const filteredInventory = inventory.filter(item =>
    item.product_name.toLowerCase().includes(searchText.toLowerCase())
  );

  const lowStockItems = inventory.filter(item => item.current_stock <= 10);
  const outOfStockItems = inventory.filter(item => item.current_stock <= 0);

  const inventoryColumns = [
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 200
    },
    {
      title: '当前库存',
      dataIndex: 'current_stock',
      key: 'current_stock',
      render: (stock) => (
        <span style={{ 
          fontWeight: 'bold', 
          color: getStockStatus(stock).color 
        }}>
          {stock}
        </span>
      ),
      width: 100,
      sorter: (a, b) => a.current_stock - b.current_stock
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        const status = getStockStatus(record.current_stock);
        return (
          <Tag color={status.color} icon={status.icon}>
            {status.text}
          </Tag>
        );
      },
      width: 120
    },
    {
      title: '最后更新',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
      width: 150
    }
  ];

  const changesColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => dayjs(text).format('MM-DD HH:mm:ss'),
      width: 120
    },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 150
    },
    {
      title: '变动类型',
      dataIndex: 'change_type',
      key: 'change_type',
      render: (type) => (
        <Tag color={type === 'increase' ? 'green' : 'red'}>
          {type === 'increase' ? '增加' : '减少'}
        </Tag>
      ),
      width: 100
    },
    {
      title: '变动数量',
      dataIndex: 'quantity_change',
      key: 'quantity_change',
      render: (quantity, record) => (
        <span style={{ 
          color: record.change_type === 'increase' ? '#52c41a' : '#f5222d',
          fontWeight: 'bold'
        }}>
          {record.change_type === 'increase' ? '+' : '-'}{quantity}
        </span>
      ),
      width: 100
    },
    {
      title: '变动前',
      dataIndex: 'stock_before',
      key: 'stock_before',
      width: 80
    },
    {
      title: '变动后',
      dataIndex: 'stock_after',
      key: 'stock_after',
      width: 80
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, marginBottom: 16 }}>库存管理</h2>
        
        {/* 库存警告 */}
        {outOfStockItems.length > 0 && (
          <Alert
            message={`有 ${outOfStockItems.length} 个商品缺货`}
            description={`缺货商品: ${outOfStockItems.map(item => item.product_name).join(', ')}`}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        {lowStockItems.length > 0 && outOfStockItems.length === 0 && (
          <Alert
            message={`有 ${lowStockItems.length} 个商品库存不足`}
            description={`库存不足商品: ${lowStockItems.map(item => `${item.product_name}(${item.current_stock})`).join(', ')}`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="商品总数"
                value={inventory.length}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="库存充足"
                value={inventory.filter(item => item.current_stock > 10).length}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="库存不足"
                value={lowStockItems.filter(item => item.current_stock > 0).length}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="缺货商品"
                value={outOfStockItems.length}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="库存列表" key="inventory">
          <Card>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Input
                placeholder="搜索商品名称"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={loadInventory}
                loading={loading}
              >
                刷新
              </Button>
            </div>

            <Table
              columns={inventoryColumns}
              dataSource={filteredInventory}
              rowKey="id"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                pageSize: 20
              }}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab="库存变动记录" key="changes">
          <Card>
            <div style={{ marginBottom: 16 }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadChanges}
              >
                刷新记录
              </Button>
            </div>

            <Table
              columns={changesColumns}
              dataSource={changes}
              rowKey="id"
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                pageSize: 20
              }}
              size="small"
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default InventoryManagement;


