import React from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// ✅ 引入你刚才写好的页面
import PropertiesPage from './pages/PropertiesPage';

const { Header, Content, Footer, Sider } = Layout;

// 🚧 临时占位组件 (等你以后写好了其他页面再替换)
const TaskBoard = () => <h2 style={{textAlign:'center', marginTop: 50}}>🚧 任务计划开发中...</h2>;
const Reports = () => <h2 style={{textAlign:'center', marginTop: 50}}>🚧 报表功能开发中...</h2>;
const Sundry = () => <h2 style={{textAlign:'center', marginTop: 50}}>🚧 杂活记录开发中...</h2>;

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
              { key: '3', icon: <FileTextOutlined />, label: <Link to="/sundry">杂活记录</Link> },
              { key: '4', icon: <DollarOutlined />, label: <Link to="/reports">工资报表</Link> },
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
                
                {/* 其他页面暂时显示占位符 */}
                <Route path="/tasks" element={<TaskBoard />} />
                <Route path="/sundry" element={<Sundry />} />
                <Route path="/reports" element={<Reports />} />
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