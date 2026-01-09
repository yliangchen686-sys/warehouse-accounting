import React, { useState, useEffect } from 'react';
import { Card, Input, Button, message, Statistic, Row, Col, Space, Modal } from 'antd';
import { ReloadOutlined, UploadOutlined, ClearOutlined, RedoOutlined } from '@ant-design/icons';
import { customerDataService } from '../../services/customerDataService';

const { TextArea } = Input;

const CustomerDataManagement = ({ user }) => {
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ pending: 0, assigned: 0, total: 0 });

  // 加载统计信息
  const loadStats = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // 上传处理
  const handleUpload = async () => {
    if (!textContent.trim()) {
      message.warning('请输入手机号码');
      return;
    }

    // 解析文本
    const lines = textContent.split('\n');
    const phones = lines.map(l => l.trim()).filter(l => l.length > 0);
    const uniquePhones = [...new Set(phones)];

    if (uniquePhones.length === 0) {
      message.warning('没有有效的手机号码');
      return;
    }

    setUploading(true);
    try {
      const result = await customerDataService.uploadPhoneNumbers(
        uniquePhones,
        user.name
      );

      // 显示上传结果
      if (result.success > 0) {
        message.success(
          `上传成功：${result.success} 条${result.duplicates > 0 ? `，跳过重复：${result.duplicates} 条` : ''}`
        );
        setTextContent(''); // 清空输入框
      } else if (result.duplicates > 0) {
        message.warning(`所有手机号码都已存在，跳过 ${result.duplicates} 条`);
      } else {
        message.error('上传失败');
      }

      // 更新统计
      await loadStats();
    } catch (error) {
      console.error('上传失败:', error);
      message.error('上传失败：' + (error.message || '未知错误'));
    } finally {
      setUploading(false);
    }
  };

  // 清空输入框
  const handleClear = () => {
    setTextContent('');
  };

  // 重置所有客户
  const handleReset = () => {
    Modal.confirm({
      title: '确认重置',
      content: '确定要重置所有客户状态吗？这将把所有已分配的客户重置为待分配状态。',
      onOk: async () => {
        try {
          setLoading(true);
          await customerDataService.resetAllCustomers();
          message.success('重置成功');
          await loadStats();
        } catch (error) {
          console.error('重置失败:', error);
          message.error('重置失败：' + (error.message || '未知错误'));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>客户数据管理</h2>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadStats}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      <Card title="上传客户手机号码" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, color: '#666' }}>
            方式：直接粘贴文本（每行一个手机号码）
          </div>
          <TextArea
            rows={10}
            placeholder="请在此粘贴手机号码（每行一个）"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            disabled={uploading}
          />
        </div>
        <div style={{ marginBottom: 16, color: '#999', fontSize: 12 }}>
          提示：系统会自动去重，重复的手机号码不会被重复上传
        </div>
        <Space>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleUpload}
            loading={uploading}
          >
            上传
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={handleClear}
            disabled={uploading || !textContent.trim()}
          >
            清空
          </Button>
        </Space>
      </Card>

      <Card title="客户池统计">
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="待分配"
              value={stats.pending}
              suffix="条"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="已分配"
              value={stats.assigned}
              suffix="条"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="总计"
              value={stats.total}
              suffix="条"
            />
          </Col>
        </Row>
        <div style={{ marginTop: 16 }}>
          <Button
            icon={<RedoOutlined />}
            onClick={handleReset}
            loading={loading}
            danger
          >
            重置所有
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CustomerDataManagement;
