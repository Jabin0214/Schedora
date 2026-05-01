import React, { useMemo } from 'react';
import { Layout, Menu, ConfigProvider } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  SettingOutlined,
  EditOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';

import PropertiesPage from './pages/PropertiesPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import HistoryPage from './pages/HistoryPage';
import ConfigPage from './pages/ConfigPage';
import InspectPage from './pages/InspectPage';
import TemplatesPage from './pages/TemplatesPage';
import ErrorBoundary from './components/ErrorBoundary';

const { Header, Content, Footer, Sider } = Layout;

const AppContent: React.FC = () => {
  const location = useLocation();

  const selectedKey = useMemo(() => {
    if (location.pathname === '/tasks') return '2';
    if (location.pathname === '/inspect') return '6';
    if (location.pathname === '/templates') return '7';
    if (location.pathname === '/calendar') return '3';
    if (location.pathname === '/history') return '4';
    if (location.pathname === '/config') return '5';
    return '1';
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      {/* ── Sidebar ── */}
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        style={{ background: '#F7F7F5', borderRight: '1px solid #E9E9E7' }}
      >
        <div className="sidebar-logo">Schedora</div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ background: '#F7F7F5', borderRight: 'none', fontSize: '14px' }}
          items={[
            { key: '1', icon: <HomeOutlined />,         label: <Link to="/">Properties</Link> },
            { key: '2', icon: <UnorderedListOutlined />, label: <Link to="/tasks">Tasks</Link> },
            { key: '6', icon: <EditOutlined />,          label: <Link to="/inspect">Inspect</Link> },
            { key: '7', icon: <CopyOutlined />,          label: <Link to="/templates">Templates</Link> },
            { key: '3', icon: <CalendarOutlined />,      label: <Link to="/calendar">Calendar</Link> },
            { key: '4', icon: <FileTextOutlined />,      label: <Link to="/history">History</Link> },
            { key: '5', icon: <SettingOutlined />,       label: <Link to="/config">Config</Link> },
          ]}
        />
      </Sider>

      {/* ── Main Area ── */}
      <Layout style={{ background: '#FFFFFF' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#FFFFFF',
            borderBottom: '1px solid #E9E9E7',
            height: 45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{
            color: '#ACABA9',
            fontSize: '13px',
            fontWeight: 500,
          }}>
            Property Management System
          </span>
          <span style={{ color: '#E9E9E7', fontSize: '12px' }}>
            ●
          </span>
        </Header>

        <Content style={{ margin: '16px' }}>
          <div
            className="page-container"
            style={{
              padding: 24,
              minHeight: 360,
              background: '#FFFFFF',
              borderRadius: 6,
              border: '1px solid #E9E9E7',
              overflow: 'auto',
            }}
          >
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

        <Footer
          style={{
            textAlign: 'center',
            color: '#ACABA9',
            background: '#F7F7F5',
            borderTop: '1px solid #E9E9E7',
            padding: '8px 24px',
            fontSize: '12px',
          }}
        >
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
        <AppContent />
      </Router>
    </ConfigProvider>
  );
};

export default App;
