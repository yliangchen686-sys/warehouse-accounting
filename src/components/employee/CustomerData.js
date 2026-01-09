import React, { useState, useEffect } from 'react';
import { Card, Button, message, Statistic, Modal, Space } from 'antd';
import { ReloadOutlined, CopyOutlined, RedoOutlined } from '@ant-design/icons';
import { customerDataService } from '../../services/customerDataService';

const CustomerData = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [stats, setStats] = useState({ pending: 0 });

  // 加载统计信息
  const loadStats = async () => {
    try {
      const statsData = await customerDataService.getPoolStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计信息失败:', error);
      const errorMessage = error.message || '加载统计信息失败';
      message.error(errorMessage);
      // 如果是表不存在的错误，显示更详细的提示
      if (errorMessage.includes('客户池表不存在')) {
        message.warning('请先在 Supabase SQL 编辑器中执行 customer-pool-database-v2.sql 脚本创建表结构', 5);
      }
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // 获取数据
  const handleGetData = async () => {
    setLoading(true);
    try {
      const data = await customerDataService.getCustomerData(user.name);
      if (data) {
        setCustomerData(data);
        setModalVisible(true);
        if (data.is_reset) {
          message.info('所有数据已分配完毕，已自动重置并打乱');
        }
        await loadStats(); // 更新统计
      } else {
        message.warning('暂无可用客户数据');
      }
    } catch (error) {
      console.error('获取失败:', error);
      message.error('获取失败：' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 复制功能
  const handleCopy = async () => {
    if (!customerData?.customer_phone) {
      message.warning('没有可复制的电话号码');
      return;
    }

    try {
      await navigator.clipboard.writeText(customerData.customer_phone);
      message.success('电话号码已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = customerData.customer_phone;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        message.success('电话号码已复制到剪贴板');
      } catch (err) {
        message.error('复制失败，请手动复制');
      }
      document.body.removeChild(textArea);
    }
  };

  // 再发一条
  const handleNext = async () => {
    setModalVisible(false);
    // 立即获取下一条
    await handleGetData();
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>获取客户数据</h2>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadStats}
        >
          刷新
        </Button>
      </div>

      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Statistic
            title="当前待分配数量"
            value={stats.pending}
            suffix="条"
            valueStyle={{ fontSize: 24, marginBottom: 32 }}
          />
          
          <div style={{ marginBottom: 24 }}>
            <Button
              type="primary"
              size="large"
              onClick={handleGetData}
              loading={loading}
              disabled={stats.pending === 0 && !loading}
              style={{
                height: 60,
                fontSize: 18,
                padding: '0 60px'
              }}
            >
              获取数据
            </Button>
          </div>

          <div style={{ color: '#666', fontSize: 14, marginTop: 24 }}>
            <div>说明：</div>
            <div style={{ marginTop: 8 }}>• 点击按钮获取一条客户手机号码</div>
            <div>• 已分配的数据不会重复分配</div>
            <div>• 所有数据分配完后会自动重置并打乱</div>
          </div>
        </div>
      </Card>

      <Modal
        title="联系电话"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={handleCopy}>
            复制
          </Button>,
          <Button key="next" type="primary" icon={<RedoOutlined />} onClick={handleNext}>
            再发一条
          </Button>
        ]}
        width={400}
      >
        <div style={{ textAlign: 'center', fontSize: 24, padding: '40px 0', fontWeight: 'bold' }}>
          {customerData?.customer_phone || '暂无联系电话'}
        </div>
      </Modal>
    </div>
  );
};

export default CustomerData;
