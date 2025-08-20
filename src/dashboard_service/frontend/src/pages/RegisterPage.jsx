// src/dashboard_service/frontend/src/pages/RegisterPage.jsx

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
  Select,
  Divider
} from "antd";
import { 
  UserOutlined, 
  LockOutlined, 
  UserAddOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined 
} from "@ant-design/icons";
import api from "../api/apiClient";

const { Title, Text } = Typography;
const { Option } = Select;

export default function RegisterPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (values) => {
    setLoading(true);
    setError(null);
    
    try {
      // Минимальная задержка для плавного UX
      await Promise.all([
        api.post("/auth/register", values),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
      
      setSuccess(true);
      
      // Редирект через 2 секунды
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      
    } catch (err) {
      const errorMessage = err.response?.data?.error      // <- изменили
        || err.response?.data?.message
        || "Registration failed. Please try again.";
      setError(errorMessage);
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  };

  if (success) {
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
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--accent-success), var(--accent-success-light))',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <UserAddOutlined style={{ fontSize: '28px', color: 'white' }} />
            </div>
            
            <div>
              <Title level={2} style={{ color: 'var(--accent-success)', margin: 0 }}>
                Registration Successful!
              </Title>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                Redirecting to login page...
              </Text>
            </div>
          </Space>
        </Card>
      </div>
    );
  }

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
              Create Account
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Join the Engineering Dashboard
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

        {/* Register Form */}
        <Form
          form={form}
          name="register"
          onFinish={handleRegister}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'Please enter a username' },
              { min: 3, message: 'Username must be at least 3 characters' }
            ]}
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
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
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

          <Form.Item
            name="role"
            rules={[{ required: true, message: 'Please select a role' }]}
            initialValue="engineer"
          >
            <Select
              placeholder="Select Role"
              style={{
                height: '48px'
              }}
              suffixIcon={<SafetyCertificateOutlined style={{ color: 'var(--accent-primary)' }} />}
            >
              <Option value="engineer">
                <Space>
                  <UserOutlined />
                  Engineer
                </Space>
              </Option>
              <Option value="admin">
                <Space>
                  <SafetyCertificateOutlined />
                  Admin
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: '16px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={loading ? null : <UserAddOutlined />}
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
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </Form.Item>
        </Form>

        {/* Footer */}
        <Divider style={{ margin: '24px 0' }} />
        <Text type="secondary">
          Already have an account?{' '}
          <Link 
            to="/login" 
            style={{ 
              color: 'var(--accent-primary)',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            Sign in here
          </Link>
        </Text>
      </Card>
    </div>
  );
}
