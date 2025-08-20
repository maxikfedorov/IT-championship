// src/dashboard_service/frontend/src/components/BatchList.jsx

import { Link } from "react-router-dom";
import { 
  Table, 
  Typography, 
  Badge, 
  Space,
  Tooltip,
  Tag
} from "antd";
import { 
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  RightOutlined
} from "@ant-design/icons";

const { Text } = Typography;

export default function BatchList({ batches, user_id }) {
  const formatBatchId = (batch_id) => {
    const match = batch_id.match(/batch_(\d+)$/);
    return match ? `#${match[1]}` : batch_id;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleString('ru-RU', { 
      day: '2-digit',
      month: '2-digit', 
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getHealthTag = (score) => {
    if (score === undefined || score === null) {
      return <Tag icon={<ClockCircleOutlined />} color="default">Pending</Tag>;
    }
    if (score >= 0.8) {
      return <Tag icon={<CheckCircleOutlined />} color="success">Healthy</Tag>;
    }
    if (score >= 0.4) {
      return <Tag icon={<ExclamationCircleOutlined />} color="warning">Monitor</Tag>;
    }
    return <Tag icon={<CloseCircleOutlined />} color="error">Critical</Tag>;
  };

  const columns = [
    {
      title: 'Batch',
      dataIndex: 'batch_id',
      key: 'batch_id',
      width: 100,
      render: (batch_id) => (
        <Text strong style={{ color: 'var(--accent-primary)' }}>
          {formatBatchId(batch_id)}
        </Text>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (timestamp) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {formatDate(timestamp)}
        </Text>
      ),
    },
    {
      title: 'Health',
      key: 'health',
      width: 120,
      render: (_, record) => getHealthTag(record.summary?.health_score),
    },
    {
      title: 'Score',
      key: 'score',
      width: 80,
      render: (_, record) => {
        const score = record.summary?.health_score;
        if (score === undefined || score === null) return '-';
        
        const percentage = (score * 100).toFixed(0);
        const color = score >= 0.8 ? 'var(--accent-success)' : 
                     score >= 0.4 ? 'var(--accent-warning)' : 'var(--accent-danger)';
        
        return (
          <Text style={{ color, fontWeight: 600, fontSize: '12px' }}>
            {percentage}%
          </Text>
        );
      },
    },
    {
      title: 'Anomalies',
      key: 'anomalies',
      width: 100,
      render: (_, record) => {
        const count = record.summary?.anomaly_count ?? 0;
        return (
          <Badge 
            count={count}
            style={{ 
              backgroundColor: count > 0 ? 'var(--accent-danger)' : 'var(--accent-success)',
              fontSize: '11px'
            }}
            overflowCount={999}
            showZero
          />
        );
      },
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Link to={`/details/${user_id}/${record.batch_id}`}>
          <RightOutlined style={{ 
            color: 'var(--accent-primary)', 
            fontSize: '12px',
            opacity: 0.7
          }} />
        </Link>
      ),
    }
  ];

  const tableData = batches.map(batch => ({
    key: batch.batch_id,
    ...batch
  }));

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        size="small"
        style={{ 
          background: 'transparent',
        }}
        components={{
          header: {
            cell: (props) => (
              <th
                {...props}
                style={{
                  ...props.style,
                  background: 'var(--glass-primary)',
                  backdropFilter: 'blur(8px)',
                  borderBottom: '1px solid var(--border-light)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              />
            ),
          },
          body: {
            row: (props) => (
              <tr
                {...props}
                style={{
                  ...props.style,
                  background: 'transparent',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--glass-secondary)';
                  e.currentTarget.style.backdropFilter = 'blur(8px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.backdropFilter = 'none';
                }}
              />
            ),
            cell: (props) => (
              <td
                {...props}
                style={{
                  ...props.style,
                  borderBottom: '1px solid var(--border-light)',
                  padding: '8px 16px'
                }}
              />
            ),
          },
        }}
      />
    </div>
  );
}
