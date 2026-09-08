import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;

interface LocationState {
  from?: { pathname?: string };
}

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: { username: string; password: string }) => {
    setSubmitting(true);
    try {
      await login(values.username, values.password);
      const from = (location.state as LocationState | null)?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message ?? 'Login failed';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F7F7F5',
        padding: 16,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#FFFFFF',
          border: '1px solid #E9E9E7',
          borderRadius: 6,
          boxShadow: 'none',
        }}
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={3} style={{ margin: 0, color: '#37352F', fontWeight: 600 }}>
            Schedora
          </Title>
          <Text style={{ color: '#787774', fontSize: 13 }}>
            Sign in to your workspace
          </Text>
        </div>

        <Form
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmit}
          autoComplete="on"
        >
          <Form.Item
            label={<span style={{ color: '#37352F', fontSize: 13 }}>Username</span>}
            name="username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#ACABA9' }} />}
              placeholder="username"
              size="large"
              autoFocus
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ color: '#37352F', fontSize: 13 }}>Password</span>}
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#ACABA9' }} />}
              placeholder="password"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={submitting}
            >
              Sign in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
