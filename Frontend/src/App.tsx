import React, { useMemo } from 'react';
import { Layout, Menu, theme, ConfigProvider } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';

import PropertiesPage from './pages/PropertiesPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import HistoryPage from './pages/HistoryPage';
import ConfigPage from './pages/ConfigPage';
import ErrorBoundary from './components/ErrorBoundary';

const { Header, Content, Footer, Sider } = Layout;

const AppContent: React.FC = () => {
  const location = useLocation();

  const selectedKey = useMemo(() => {
    if (location.pathname === '/tasks') return '2';
    if (location.pathname === '/calendar') return '3';
    if (location.pathname === '/history') return '4';
    if (location.pathname === '/config') return '5';
    return '1';
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#0d1117' }}>
      {/* ── Sidebar ── */}
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        style={{ background: '#0a0e13', borderRight: '1px solid #30363d' }}
      >
        <div className="sidebar-logo">Schedora PMS</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ background: '#0a0e13', borderRight: 'none' }}
          items={[
            { key: '1', icon: <HomeOutlined />,          label: <Link to="/">Properties</Link> },
            { key: '2', icon: <UnorderedListOutlined />,  label: <Link to="/tasks">Tasks</Link> },
            { key: '3', icon: <CalendarOutlined />,       label: <Link to="/calendar">Calendar</Link> },
            { key: '4', icon: <FileTextOutlined />,       label: <Link to="/history">History</Link> },
            { key: '5', icon: <SettingOutlined />,        label: <Link to="/config">Config</Link> },
          ]}
        />
      </Sider>

      {/* ── Main Area ── */}
      <Layout style={{ background: '#0d1117' }}>
        <Header
          style={{
            padding: '0 20px',
            background: '#0a0e13',
            borderBottom: '1px solid #30363d',
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{
            color: '#484f58',
            fontSize: '10px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            PROPERTY MANAGEMENT SYSTEM
          </span>
          <span style={{ color: '#30363d', fontSize: '10px', letterSpacing: '1px' }}>
            SYS:ONLINE ■
          </span>
        </Header>

        <Content style={{ margin: '12px' }}>
          <div
            className="page-container"
            style={{
              padding: 20,
              minHeight: 360,
              background: '#161b22',
              borderRadius: 2,
              border: '1px solid #30363d',
              overflow: 'auto',
            }}
          >
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<PropertiesPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/config" element={<ConfigPage />} />
              </Routes>
            </ErrorBoundary>
          </div>
        </Content>

        <Footer
          style={{
            textAlign: 'center',
            color: '#484f58',
            background: '#0a0e13',
            borderTop: '1px solid #30363d',
            padding: '7px 20px',
            fontSize: '10px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          SCHEDORA PMS © 2026 — Created by Jabin
        </Footer>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary:      '#00d4ff',
          colorBgBase:       '#0d1117',
          colorBgContainer:  '#161b22',
          colorBgElevated:   '#1c2128',
          colorBorder:       '#30363d',
          colorText:         '#e6edf3',
          colorTextSecondary:'#8b949e',
          borderRadius:      2,
          borderRadiusLG:    4,
          colorSuccess:      '#22c55e',
          colorWarning:      '#f0a500',
          colorError:        '#ff4444',
          fontFamily:        "'JetBrains Mono', 'Consolas', 'SF Mono', ui-monospace, monospace",
        },
        components: {
          Layout: {
            siderBg:    '#0a0e13',
            headerBg:   '#0a0e13',

            footerBg:   '#0a0e13',
          },
          Menu: {
            darkItemBg:            '#0a0e13',
            darkItemSelectedBg:    'rgba(0, 212, 255, 0.08)',
            darkItemHoverBg:       'rgba(0, 212, 255, 0.04)',
            darkItemColor:         '#8b949e',
            darkItemSelectedColor: '#00d4ff',
            darkItemHoverColor:    '#c6cdd5',
          },
          Card: {
            headerBg: '#0d1117',
          },
          Table: {
            headerBg:   '#0d1117',
            rowHoverBg: '#1c2128',
          },
          Button: {
            defaultBg:              'transparent',
            defaultBorderColor:     '#30363d',
            defaultColor:           '#8b949e',
            defaultHoverBg:         'rgba(255,255,255,0.04)',
            defaultHoverBorderColor:'#444d56',
            defaultHoverColor:      '#e6edf3',
          },
          Modal: {
            contentBg: '#161b22',
            headerBg:  '#0d1117',
          },
          Select: {
            optionSelectedBg: 'rgba(0, 212, 255, 0.1)',
          },
          DatePicker: {
            cellHoverBg: 'rgba(0, 212, 255, 0.08)',
          },
        },
      }}
    >
      <Router>
        <AppContent />
      </Router>
    </ConfigProvider>
  );
};

export default App;
