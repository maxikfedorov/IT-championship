// src/dashboard_service/frontend/src/components/ComponentHealthMatrix.jsx

import { 
  Table, 
  Tag, 
  Progress, 
  Typography, 
  Space,
  Tooltip,
  Empty
} from "antd";
import { 
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from "@ant-design/icons";

const { Text } = Typography;

export default function ComponentHealthMatrix({ components }) {
  if (!components || Object.keys(components).length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Empty 
          description={
            <Text type="secondary">No component data available</Text>
          }
        />
      </div>
    );
  }

  const formatComponentName = (name) => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getAnomalyConfig = (isAnomaly) => {
    if (isAnomaly) {
      return {
        color: 'error',
        icon: <CloseCircleOutlined />,
        text: 'Anomaly',
        bgColor: 'var(--accent-danger)'
      };
    }
    return {
      color: 'success',
      icon: <CheckCircleOutlined />,
      text: 'Normal',
      bgColor: 'var(--accent-success)'
    };
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'var(--accent-success)';
    if (confidence >= 0.6) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
  };

  const getErrorColor = (error) => {
    const errorValue = Number(error);
    if (errorValue <= 0.5) return 'var(--accent-success)';
    if (errorValue <= 1.0) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
  };

  const columns = [
    {
      title: (
        <Space align="center">
          <InfoCircleOutlined style={{ color: 'var(--accent-primary)' }} />
          <Text strong style={{ color: 'var(--text-primary)' }}>Component</Text>
        </Space>
      ),
      dataIndex: 'component',
      key: 'component',
      width: 160,
      render: (component) => (
        <Text strong style={{ 
          color: 'var(--text-primary)',
          fontSize: '13px'
        }}>
          {formatComponentName(component)}
        </Text>
      ),
    },
    {
      title: (
        <Space align="center">
          <WarningOutlined style={{ color: 'var(--accent-warning)' }} />
          <Text strong style={{ color: 'var(--text-primary)' }}>Recon. Error</Text>
        </Space>
      ),
      dataIndex: 'reconstruction_error',
      key: 'error',
      width: 120,
      render: (error) => {
        const errorValue = Number(error);
        return (
          <Tooltip title={`Reconstruction Error: ${errorValue.toFixed(4)}`}>
            <div style={{ textAlign: 'center' }}>
              <Text 
                strong 
                style={{ 
                  color: getErrorColor(errorValue),
                  fontSize: '12px'
                }}
              >
                {errorValue.toFixed(3)}
              </Text>
              <div style={{ marginTop: '4px' }}>
                <div 
                  style={{
                    width: '100%',
                    height: '4px',
                    background: 'var(--border-light)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}
                >
                  <div 
                    style={{
                      width: `${Math.min(errorValue * 50, 100)}%`,
                      height: '100%',
                      background: getErrorColor(errorValue),
                      borderRadius: '2px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            </div>
          </Tooltip>
        );
      },
      sorter: (a, b) => Number(a.reconstruction_error) - Number(b.reconstruction_error),
    },
    {
      title: (
        <Space align="center">
          <CloseCircleOutlined style={{ color: 'var(--accent-danger)' }} />
          <Text strong style={{ color: 'var(--text-primary)' }}>Anomaly</Text>
        </Space>
      ),
      dataIndex: 'is_anomaly',
      key: 'anomaly',
      width: 100,
      render: (isAnomaly) => {
        const config = getAnomalyConfig(isAnomaly);
        return (
          <div style={{ textAlign: 'center' }}>
            <Tag 
              color={config.color}
              icon={config.icon}
              style={{ 
                fontSize: '11px',
                border: 'none',
                fontWeight: 600
              }}
            >
              {config.text}
            </Tag>
          </div>
        );
      },
      filters: [
        { text: 'Normal', value: false },
        { text: 'Anomaly', value: true }
      ],
      onFilter: (value, record) => record.is_anomaly === value,
    },
    {
      title: (
        <Space align="center">
          <CheckCircleOutlined style={{ color: 'var(--accent-success)' }} />
          <Text strong style={{ color: 'var(--text-primary)' }}>Confidence</Text>
        </Space>
      ),
      dataIndex: 'confidence_score',
      key: 'confidence',
      width: 140,
      render: (confidence) => {
        const confidenceValue = Number(confidence);
        const percentage = Math.round(confidenceValue * 100);
        return (
          <div style={{ textAlign: 'center' }}>
            <Text 
              strong 
              style={{ 
                color: getConfidenceColor(confidenceValue),
                fontSize: '12px'
              }}
            >
              {percentage}%
            </Text>
            <Progress 
              percent={percentage}
              strokeColor={getConfidenceColor(confidenceValue)}
              trailColor="var(--border-light)"
              showInfo={false}
              size="small"
              strokeWidth={6}
              style={{ marginTop: '4px' }}
            />
          </div>
        );
      },
      sorter: (a, b) => Number(a.confidence_score) - Number(b.confidence_score),
    },
    {
      title: (
        <Space align="center">
          <EyeOutlined style={{ color: 'var(--accent-primary)' }} />
          <Text strong style={{ color: 'var(--text-primary)' }}>Attention</Text>
        </Space>
      ),
      dataIndex: 'attention_focus',
      key: 'attention',
      width: 120,
      render: (attention) => {
        if (!attention || attention === 'N/A') {
          return (
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                N/A
              </Text>
            </div>
          );
        }
        
        const attentionValue = Number(attention);
        if (isNaN(attentionValue)) {
          return (
            <Tooltip title={String(attention)}>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {String(attention).slice(0, 8)}...
                </Text>
              </div>
            </Tooltip>
          );
        }

        return (
          <div style={{ textAlign: 'center' }}>
            <Text 
              style={{ 
                color: 'var(--accent-primary)',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {attentionValue.toFixed(3)}
            </Text>
          </div>
        );
      },
    },
  ];

  const tableData = Object.entries(components).map(([comp, data]) => ({
    key: comp,
    component: comp,
    ...data
  }));

  return (
    <div 
      className="glass-panel"
      style={{
        padding: '0',
        borderRadius: '12px',
        overflow: 'hidden'
      }}
    >
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        size="small"
        scroll={{ x: 600 }}
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
                  borderBottom: '2px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  padding: '12px 8px'
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
                  padding: '12px 8px'
                }}
              />
            ),
          },
        }}
      />
      
      {/* Summary Footer */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--glass-secondary)',
        borderTop: '1px solid var(--border-light)',
        textAlign: 'center'
      }}>
        <Space size="large" wrap>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            <Text strong style={{ color: 'var(--accent-success)' }}>
              {Object.values(components).filter(c => !c.is_anomaly).length}
            </Text> Normal
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            <Text strong style={{ color: 'var(--accent-danger)' }}>
              {Object.values(components).filter(c => c.is_anomaly).length}
            </Text> Anomalies
          </Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Avg Confidence: <Text strong style={{ color: 'var(--accent-primary)' }}>
              {Math.round(Object.values(components).reduce((acc, c) => acc + Number(c.confidence_score), 0) / Object.keys(components).length * 100)}%
            </Text>
          </Text>
        </Space>
      </div>
    </div>
  );
}
