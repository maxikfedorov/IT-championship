// src/dashboard_service/frontend/src/components/WindowSelector.jsx

import { Link } from "react-router-dom";
import { Typography, Button, Space, Empty } from "antd";
import { EyeOutlined, RightOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function WindowSelector({ totalWindows, user_id, batch_id }) {
  const windows = Array.from({ length: totalWindows }, (_, i) => i + 1);

  if (!totalWindows || totalWindows === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Empty 
          description={
            <Text type="secondary">No windows available</Text>
          }
        />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <Title level={5} style={{ margin: 0, color: 'var(--text-primary)' }}>
          Analysis Windows
        </Title>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {totalWindows} windows available • Click to analyze
        </Text>
      </div>

      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
        gap: '8px',
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '8px',
        background: 'var(--glass-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border-light)'
      }}>
        {windows.map((windowNum) => (
          <Link
            key={windowNum}
            to={`/details/${user_id}/${batch_id}/${windowNum}`}
            style={{ textDecoration: 'none' }}
          >
            <Button
              className="glass-card"
              style={{
                width: '100%',
                height: '50px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-light)',
                background: 'var(--glass-primary)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--accent-primary)15, var(--accent-primary)08)';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.25)';
                e.currentTarget.style.color = 'var(--accent-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.background = 'var(--glass-primary)';
                e.currentTarget.style.borderColor = 'var(--border-light)';
                e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
            >
              <EyeOutlined style={{ fontSize: '14px', marginBottom: '2px' }} />
              #{windowNum}
            </Button>
          </Link>
        ))}
      </div>

      {totalWindows > 50 && (
        <div style={{ 
          textAlign: 'center',
          padding: '8px',
          background: 'var(--glass-secondary)',
          borderRadius: '6px',
          border: '1px solid var(--border-light)'
        }}>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            💡 Showing {totalWindows} windows • Scroll to see more
          </Text>
        </div>
      )}
    </Space>
  );
}
