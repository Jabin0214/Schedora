import React, { Suspense, lazy } from 'react';
import { Layout, Menu, ConfigProvider, Button, Dropdown, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  SettingOutlined,
  EditOutlined,
  CopyOutlined,
  LogoutOutlined,
  ContactsOutlined,
  PartitionOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import './App.css';

import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import {
  allNavigationItems,
  mobileMoreItems,
  mobilePrimaryItems,
  selectedNavigationKey,
  type NavigationKey,
} from './navigation';

const { Header, Content, Footer, Sider } = Layout;

const PropertiesPage = lazy(() => import('./pages/PropertiesPage'));
const PropertyDetailsPage = lazy(() => import('./pages/PropertyDetailsPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const WorkflowsPage = lazy(() => import('./pages/WorkflowsPage'));
const InspectPage = lazy(() => import('./pages/InspectPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const TenantContactsPage = lazy(() => import('./pages/TenantContactsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

const PageLoader: React.FC = () => (
  <div style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Spin />
  </div>
);

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
  const navigate = useNavigate();
  const { username, logout } = useAuth();

  const selectedKey = selectedNavigationKey(location.pathname);
  const icons: Record<NavigationKey, React.ReactNode> = {
    properties: <HomeOutlined />,
    tasks: <UnorderedListOutlined />,
    workflows: <PartitionOutlined />,
    inspect: <EditOutlined />,
    templates: <CopyOutlined />,
    contacts: <ContactsOutlined />,
    calendar: <CalendarOutlined />,
    history: <FileTextOutlined />,
    config: <SettingOutlined />,
  };
  const navItems = allNavigationItems.map(item => ({
    key: item.key,
    icon: icons[item.key],
    label: <Link to={item.path}>{item.label}</Link>,
  }));
  const moreMenuItems: MenuProps['items'] = mobileMoreItems.map(item => ({
    key: item.key,
    icon: icons[item.key],
    label: item.label,
  }));
  const handleMoreNavigation: MenuProps['onClick'] = ({ key }) => {
    const destination = mobileMoreItems.find(item => item.key === key);
    if (destination) navigate(destination.path);
  };
  const isMoreSelected = mobileMoreItems.some(item => item.key === selectedKey);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Layout className="app-shell">
      {/* ── Sidebar ── */}
      <Sider
        breakpoint="md"
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
          {mobilePrimaryItems.map(item => (
            <Link
              key={item.key}
              className={`mobile-nav-item${selectedKey === item.key ? ' active' : ''}`}
              to={item.path}
              aria-current={selectedKey === item.key ? 'page' : undefined}
            >
              {icons[item.key]}
              <span>{item.label}</span>
            </Link>
          ))}
          <Dropdown
            menu={{ items: moreMenuItems, onClick: handleMoreNavigation, selectedKeys: [selectedKey] }}
            trigger={['click']}
            placement="bottomRight"
          >
            <button
              type="button"
              className={`mobile-nav-item mobile-nav-more${isMoreSelected ? ' active' : ''}`}
              aria-label="More navigation destinations"
            >
              <MoreOutlined />
              <span>More</span>
            </button>
          </Dropdown>
        </nav>

        <Content id="main-content" className="app-content" tabIndex={-1}>
          <div className="page-container">
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<PropertiesPage />} />
                  <Route path="/properties/:id" element={<PropertyDetailsPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/workflows" element={<WorkflowsPage />} />
                  <Route path="/inspect" element={<InspectPage />} />
                  <Route path="/templates" element={<TemplatesPage />} />
                  <Route path="/tenant-contacts" element={<TenantContactsPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/config" element={<ConfigPage />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </div>
        </Content>

        <Footer className="app-footer">
          Schedora PMS © 2026 — Created by Jabin
        </Footer>
      </Layout>
      </Layout>
    </>
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
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </AuthProvider>
      </Router>
    </ConfigProvider>
  );
};

export default App;
