import React from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// ✅ 引入页面
import PropertiesPage from './pages/PropertiesPage';
import TasksPage from './pages/TasksPage';
import HistoryPage from './pages/HistoryPage';

const { Header, Content, Footer, Sider } = Layout;

const App: React.FC = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        {/* 左侧菜单栏 */}
        <Sider breakpoint="lg" collapsedWidth="0">
          <div className="sidebar-logo">
             PMS 管理系统
          </div>
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={['1']}
            items={[
              { key: '1', icon: <HomeOutlined />, label: <Link to="/">物业档案</Link> },
              { key: '2', icon: <CalendarOutlined />, label: <Link to="/tasks">任务计划</Link> },
              { key: '3', icon: <FileTextOutlined />, label: <Link to="/history">历史记录</Link> },
            ]}
          />
        </Sider>

        {/* 右侧主体内容 */}
        <Layout>
          <Header style={{ padding: 0, background: colorBgContainer }} />
          <Content style={{ margin: '16px 16px' }}>
            <div
              className="page-container"
              style={{
                padding: 24,
                minHeight: 360,
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
                overflow: 'auto' // 防止表格太宽撑破
              }}
            >
              {/* 路由配置：决定点击菜单后显示哪个组件 */}
              <Routes>
                {/* 首页显示 物业列表 */}
                <Route path="/" element={<PropertiesPage />} />
                
                {/* 其他页面 */}
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/history" element={<HistoryPage />} />
              </Routes>
            </div>
          </Content>
          <Footer style={{ textAlign: 'center', color: '#888' }}>
            Property Management System ©2026 Created by Jabin
          </Footer>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;