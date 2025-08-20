// src/dashboard_service/frontend/src/components/UserProfile.jsx

import { useState } from "react";
import { 
  Card, 
  Avatar, 
  Typography, 
  Button, 
  Space, 
  Popconfirm,
  Badge,
  Tooltip
} from "antd";
import { 
  UserOutlined, 
  LogoutOutlined, 
  SafetyCertificateOutlined,
  SettingOutlined
} from "@ant-design/icons";

const { Text } = Typography;

export default function UserProfile({ user, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    
    // Плавная задержка для UX
    await new Promise(resolve => setTimeout(resolve, 600));
    
    onLogout();
    setTimeout(() => setLoading(false), 200);
  };

  const getRoleConfig = (role) => {
    switch (role) {
      case 'admin':
        return {
          color: 'var(--accent-danger)',
          icon: <SafetyCertificateOutlined />,
          text: 'Admin'
        };
      case 'engineer':
        return {
          color: 'var(--accent-primary)',
          icon: <SettingOutlined />,
          text: 'Engineer'
        };
      default:
        return {
          color: 'var(--text-secondary)',
          icon: <UserOutlined />,
          text: role
        };
    }
  };

  const roleConfig = getRoleConfig(user.role);

  if (collapsed) {
    return (
      <div
        className="glass-panel"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          padding: '12px',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={() => setCollapsed(false)}
      >
        <Tooltip title={`${user.username} (${roleConfig.text})`} placement="left">
          <Badge dot color={roleConfig.color}>
            <Avatar 
              icon={<UserOutlined />} 
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white'
              }}
            />
          </Badge>
        </Tooltip>
      </div>
    );
  }

  return (
    <Card
      className="glass-panel"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        minWidth: '200px',
        boxShadow: '0 8px 32px rgba(31, 38, 135, 0.25)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '12px'
      }}>
        <Space align="center">
          <Badge dot color={roleConfig.color}>
            <Avatar 
              icon={<UserOutlined />} 
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white'
              }}
            />
          </Badge>
          <div>
            <Text strong style={{ 
              color: 'var(--text-primary)', 
              fontSize: '14px',
              display: 'block'
            }}>
              {user.username}
            </Text>
            <Space align="center" size="small">
              <div style={{ color: roleConfig.color, fontSize: '12px' }}>
                {roleConfig.icon}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {roleConfig.text}
              </Text>
            </Space>
          </div>
        </Space>
        <Button
          type="text"
          size="small"
          icon={<UserOutlined style={{ fontSize: '10px' }} />}
          onClick={() => setCollapsed(true)}
          style={{
            color: 'var(--text-muted)',
            padding: '2px 4px',
            height: 'auto',
            minWidth: 'auto'
          }}
        />
      </div>

      <Popconfirm
        title="Sign Out"
        description="Are you sure you want to sign out?"
        onConfirm={handleLogout}
        okText="Sign Out"
        cancelText="Cancel"
        okButtonProps={{
          loading: loading,
          style: {
            background: 'var(--accent-danger)',
            borderColor: 'var(--accent-danger)'
          }
        }}
        placement="topRight"
      >
        <Button
          type="primary"
          danger
          icon={loading ? null : <LogoutOutlined />}
          loading={loading}
          style={{
            width: '100%',
            background: loading 
              ? 'linear-gradient(135deg, var(--accent-danger-light), var(--accent-danger))'
              : 'linear-gradient(135deg, var(--accent-danger), var(--accent-danger-light))',
            border: 'none',
            borderRadius: '6px',
            height: '36px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: loading ? 'scale(0.98)' : 'scale(1)',
            boxShadow: loading 
              ? 'inset 0 2px 4px rgba(0,0,0,0.2)' 
              : '0 2px 8px rgba(239, 68, 68, 0.3)'
          }}
        >
          {loading ? 'Signing out...' : 'Sign Out'}
        </Button>
      </Popconfirm>

      {/* Online indicator */}
      <div style={{ 
        textAlign: 'center',
        marginTop: '8px',
        padding: '4px',
        background: 'var(--glass-secondary)',
        borderRadius: '4px'
      }}>
        <Text type="secondary" style={{ fontSize: '10px' }}>
          🟢 Online • Dashboard Active
        </Text>
      </div>
    </Card>
  );
}
