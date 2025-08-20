// src/dashboard_service/frontend/src/components/Breadcrumbs.jsx

import { Link, useParams } from "react-router-dom";
import { Breadcrumb, Typography } from "antd";
import { 
  HomeOutlined, 
  DatabaseOutlined, 
  EyeOutlined,
  RightOutlined
} from "@ant-design/icons";

const { Text } = Typography;

export default function Breadcrumbs() {
  const { user_id, batch_id, window_id } = useParams();

  const formatBatchId = (batch_id) => {
    const match = batch_id?.match(/batch_(\d+)$/);
    return match ? `Batch #${match[1]}` : batch_id;
  };

  const formatWindowId = (window_id) => {
    return `Window #${window_id}`;
  };

  const breadcrumbItems = [
    {
      key: 'dashboard',
      title: (
        <Link 
          to={`/dashboard/${user_id}`}
          style={{
            color: 'var(--accent-primary)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.color = 'var(--accent-primary-light)';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.color = 'var(--accent-primary)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <HomeOutlined />
          Dashboard
        </Link>
      )
    }
  ];

  if (batch_id) {
    breadcrumbItems.push({
      key: 'batch',
      title: window_id ? (
        <Link 
          to={`/details/${user_id}/${batch_id}`}
          style={{
            color: 'var(--accent-primary)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.color = 'var(--accent-primary-light)';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.color = 'var(--accent-primary)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <DatabaseOutlined />
          {formatBatchId(batch_id)}
        </Link>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: 500
        }}>
          <DatabaseOutlined />
          {formatBatchId(batch_id)}
        </div>
      )
    });
  }

  if (window_id) {
    breadcrumbItems.push({
      key: 'window',
      title: (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: 500
        }}>
          <EyeOutlined />
          {formatWindowId(window_id)}
        </div>
      )
    });
  }

  return (
    <div 
      className="glass-panel"
      style={{
        padding: '12px 20px',
        background: 'var(--glass-primary)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        border: '1px solid var(--border-light)',
      }}
    >
      <Breadcrumb
        separator={
          <RightOutlined 
            style={{ 
              color: 'var(--text-muted)', 
              fontSize: '10px',
              margin: '0 8px'
            }} 
          />
        }
        items={breadcrumbItems}
        style={{
          margin: 0,
          fontSize: '13px'
        }}
      />
      
      {/* Current page indicator */}
      <div style={{
        marginTop: '4px',
        height: '2px',
        background: 'linear-gradient(90deg, var(--accent-primary), transparent)',
        borderRadius: '1px',
        opacity: 0.6
      }} />
    </div>
  );
}
