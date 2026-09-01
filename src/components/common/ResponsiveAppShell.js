import React, { useState } from 'react';
import { Layout, Menu, Drawer, List } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { useIsMobile } from '../../hooks/useIsMobile';

const { Header, Sider, Content } = Layout;

/**
 * 响应式应用外壳：桌面端左侧 Sider，移动端底部 Tab + 可选「更多」抽屉
 */
const ResponsiveAppShell = ({
  brandTitle = '仓储记账系统',
  brandCollapsedTitle = '记账',
  headerTitle,
  headerSubtitle,
  headerBadge,
  headerExtra,
  menuItems,
  mobileMenuItems,
  moreMenuItems,
  selectedKey,
  onMenuClick,
  children,
  siderWidth = 240,
}) => {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const bottomItems = mobileMenuItems || menuItems;
  const moreItems = moreMenuItems || [];
  const showMoreTab = isMobile && moreItems.length > 0;

  const handleBottomClick = (key) => {
    if (key === '__more__') {
      setMoreOpen(true);
      return;
    }
    onMenuClick(key);
  };

  const handleMoreItemClick = (key) => {
    onMenuClick(key);
    setMoreOpen(false);
  };

  const isMoreSelected = moreItems.some((item) => item.key === selectedKey);

  return (
    <Layout className="app-shell" style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="dark"
          width={siderWidth}
          className="app-shell-sider"
        >
          <div className="app-shell-brand">
            {!collapsed ? brandTitle : brandCollapsedTitle}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={({ key }) => onMenuClick(key)}
            items={menuItems.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
            }))}
          />
        </Sider>
      )}

      <Layout className={`app-shell-main${isMobile ? ' app-shell-main--mobile' : ''}`}>
        <Header className="app-shell-header">
          <div className="app-shell-header-left">
            {isMobile ? (
              <>
                <div className="app-shell-mobile-title">{headerTitle}</div>
                {headerSubtitle && (
                  <div className="app-shell-mobile-subtitle">{headerSubtitle}</div>
                )}
              </>
            ) : (
              <h2 className="app-shell-desktop-title">{headerTitle}</h2>
            )}
            {headerBadge}
          </div>
          <div className="app-shell-header-extra">{headerExtra}</div>
        </Header>

        <Content className="app-shell-content">{children}</Content>

        {isMobile && (
          <nav className="app-shell-bottom-nav">
            {bottomItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`app-shell-bottom-nav-item${
                  selectedKey === item.key ? ' app-shell-bottom-nav-item--active' : ''
                }`}
                onClick={() => handleBottomClick(item.key)}
              >
                <span className="app-shell-bottom-nav-icon">{item.icon}</span>
                <span className="app-shell-bottom-nav-label">{item.mobileLabel || item.label}</span>
              </button>
            ))}
            {showMoreTab && (
              <button
                type="button"
                className={`app-shell-bottom-nav-item${
                  isMoreSelected ? ' app-shell-bottom-nav-item--active' : ''
                }`}
                onClick={() => handleBottomClick('__more__')}
              >
                <span className="app-shell-bottom-nav-icon"><MenuOutlined /></span>
                <span className="app-shell-bottom-nav-label">更多</span>
              </button>
            )}
          </nav>
        )}
      </Layout>

      {showMoreTab && (
        <Drawer
          title="更多功能"
          placement="bottom"
          height="auto"
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          className="app-shell-more-drawer"
        >
          <List
            dataSource={moreItems}
            renderItem={(item) => (
              <List.Item
                className={`app-shell-more-item${
                  selectedKey === item.key ? ' app-shell-more-item--active' : ''
                }`}
                onClick={() => handleMoreItemClick(item.key)}
              >
                <span className="app-shell-more-icon">{item.icon}</span>
                {item.label}
              </List.Item>
            )}
          />
        </Drawer>
      )}
    </Layout>
  );
};

export default ResponsiveAppShell;
