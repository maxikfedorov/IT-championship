// src/dashboard_service/frontend/src/pages/LoginPage.jsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Form, 
  Input, 
  Button, 
  Typography, 
  Space,
  Alert,
  Card,
  Divider
} from "antd";
import { 
  UserOutlined, 
  LockOutlined, 
  LoginOutlined,
  ThunderboltOutlined 
} from "@ant-design/icons";
import { useAuthContext } from "../api/AuthContext";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuthContext();

  const handleLogin = async (values) => {
    setLoading(true);
    setError(null);
    
    try {
      // Минимальная задержка для плавного UX
      const [user] = await Promise.all([
        login(values.username, values.password),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
      
      navigate(`/dashboard/${user.username}`);
    } catch (err) {
      setError("Invalid username or password. Please try again.");
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '32px',
          textAlign: 'center'
        }}
      >
        {/* Header */}
        <Space direction="vertical" size="large" style={{ width: '100%', marginBottom: '32px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-light))',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)'
          }}>
            <ThunderboltOutlined style={{ fontSize: '28px', color: 'white' }} />
          </div>
          
          <div>
            <Title level={2} className="text-gradient" style={{ margin: 0 }}>
              Welcome Back
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Sign in to your Engineering Dashboard
            </Text>
          </div>
        </Space>

        {/* Error Alert */}
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ 
              marginBottom: '24px',
              background: 'var(--glass-secondary)',
              border: '1px solid var(--accent-danger-light)',
              borderRadius: '8px'
            }}
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* Login Form */}
        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'var(--accent-primary)' }} />}
              placeholder="Username"
              style={{
                background: 'var(--glass-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                height: '48px'
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--accent-primary)' }} />}
              placeholder="Password"
              style={{
                background: 'var(--glass-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                height: '48px'
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: '16px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={loading ? null : <LoginOutlined />}
              style={{
                width: '100%',
                height: '48px',
                background: loading 
                  ? 'linear-gradient(135deg, var(--accent-primary-light), var(--accent-primary))'
                  : 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-light))',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: loading ? 'scale(0.98)' : 'scale(1)',
                boxShadow: loading 
                  ? 'inset 0 2px 4px rgba(0,0,0,0.2)' 
                  : '0 4px 15px rgba(99, 102, 241, 0.4)'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form.Item>
        </Form>

        {/* Footer */}
        <Divider style={{ margin: '24px 0' }} />
        <Text type="secondary">
          Don't have an account?{' '}
          <Link 
            to="/register" 
            style={{ 
              color: 'var(--accent-primary)',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            Create one here
          </Link>
        </Text>
      </Card>
    </div>
  );
}
