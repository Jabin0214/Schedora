import React, { useMemo } from 'react';
import { Layout, Menu, ConfigProvider, Button, Spin } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  SettingOutlined,
  EditOutlined,
  CopyOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import './App.css';

import PropertiesPage from './pages/PropertiesPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import HistoryPage from './pages/HistoryPage';
import ConfigPage from './pages/ConfigPage';
import InspectPage from './pages/InspectPage';
import TemplatesPage from './pages/TemplatesPage';
import LoginPage from './pages/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const { Header, Content, Footer, Sider } = Layout;

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F5' }}>
        <Spin />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

const AppShell: React.FC = () => {
  const location = useLocation();
  const { username, logout } = useAuth();

  const selectedKey = useMemo(() => {
    if (location.pathname === '/tasks') return '2';
    if (location.pathname === '/inspect') return '6';
    if (location.pathname === '/templates') return '7';
    if (location.pathname === '/calendar') return '3';
    if (location.pathname === '/history') return '4';
    if (location.pathname === '/config') return '5';
    return '1';
  }, [location.pathname]);

  const navItems = [
    { key: '1', icon: <HomeOutlined />,          label: <Link to="/">Properties</Link> },
    { key: '2', icon: <UnorderedListOutlined />, label: <Link to="/tasks">Tasks</Link> },
    { key: '6', icon: <EditOutlined />,          label: <Link to="/inspect">Inspect</Link> },
    { key: '7', icon: <CopyOutlined />,          label: <Link to="/templates">Templates</Link> },
    { key: '3', icon: <CalendarOutlined />,      label: <Link to="/calendar">Calendar</Link> },
    { key: '4', icon: <FileTextOutlined />,      label: <Link to="/history">History</Link> },
    { key: '5', icon: <SettingOutlined />,       label: <Link to="/config">Config</Link> },
  ];

  return (
    <Layout className="app-shell">
      {/* ── Sidebar ── */}
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        className="app-sider"
        trigger={null}
      >
        <div className="sidebar-logo">Schedora</div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ background: '#F7F7F5', borderRight: 'none', fontSize: '14px' }}
          items={navItems}
        />
      </Sider>

      {/* ── Main Area ── */}
      <Layout style={{ background: '#FFFFFF' }}>
        <Header className="app-header">
          <span className="app-mobile-brand">Schedora</span>
          <span className="app-header-title">
            Property Management System
          </span>
          <div className="app-header-actions">
            {username && (
              <span className="app-username">{username}</span>
            )}
            <Button
              type="text"
              size="small"
              icon={<LogoutOutlined />}
              onClick={logout}
              style={{ color: '#787774' }}
            >
              Sign out
            </Button>
          </div>
        </Header>

        <nav className="mobile-nav" aria-label="Primary navigation">
          <Menu
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={navItems}
          />
        </nav>

        <Content className="app-content">
          <div className="page-container">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<PropertiesPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/inspect" element={<InspectPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/config" element={<ConfigPage />} />
              </Routes>
            </ErrorBoundary>
          </div>
        </Content>

        <Footer className="app-footer">
          Schedora PMS © 2026 — Created by Jabin
        </Footer>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary:       '#2383E2',
          colorBgBase:        '#FFFFFF',
          colorBgContainer:   '#FFFFFF',
          colorBgElevated:    '#FFFFFF',
          colorBorder:        '#E9E9E7',
          colorText:          '#37352F',
          colorTextSecondary: '#787774',
          borderRadius:       4,
          borderRadiusLG:     6,
          colorSuccess:       '#0F7B6C',
          colorWarning:       '#CB912F',
          colorError:         '#E03E3E',
          fontFamily:         '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          boxShadow:          'none',
          boxShadowSecondary: 'none',
        },
        components: {
          Layout: {
            siderBg:  '#F7F7F5',
            headerBg: '#FFFFFF',
            footerBg: '#F7F7F5',
          },
          Menu: {
            itemBg:            '#F7F7F5',
            itemSelectedBg:    '#E3E2E0',
            itemHoverBg:       '#EBEBEA',
            itemColor:         '#37352F',
            itemSelectedColor: '#37352F',
            itemHoverColor:    '#37352F',
            fontWeightStrong: 600,
          },
          Card: {
            headerBg: '#F7F7F5',
          },
          Table: {
            headerBg:   '#F7F7F5',
            rowHoverBg: '#EBEBEA',
          },
          Button: {
            defaultBg:               '#FFFFFF',
            defaultBorderColor:      '#E9E9E7',
            defaultColor:            '#37352F',
            defaultHoverBg:          '#EBEBEA',
            defaultHoverBorderColor: '#ACABA9',
            defaultHoverColor:       '#37352F',
            boxShadow:               'none',
            primaryShadow:           'none',
            dangerShadow:            'none',
          },
          Modal: {
            contentBg: '#FFFFFF',
            headerBg:  '#FFFFFF',
          },
          Select: {
            optionSelectedBg: '#EBEBEA',
          },
          DatePicker: {
            cellHoverBg: '#EBEBEA',
          },
        },
      }}
    >
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </Router>
    </ConfigProvider>
  );
};

export default App;
