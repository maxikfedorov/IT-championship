// src/dashboard_service/frontend/src/components/AutoencoderCard.jsx

import { 
  Card, 
  Typography, 
  Space, 
  Progress, 
  Tag, 
  Tooltip 
} from "antd";
import { 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function AutoencoderCard({ component, data }) {
  if (!data) return null;

  // Определяем конфигурацию статуса
  const getStatusConfig = () => {
    if (data.is_anomaly) {
      return {
        status: "Critical",
        color: 'var(--accent-danger)',
        bgColor: 'linear-gradient(135deg, var(--accent-danger)15, var(--accent-danger)08)',
        icon: <CloseCircleOutlined />,
        tag: 'error',
        borderColor: 'var(--accent-danger)'
      };
    } else if (data.confidence_score < 0.7 && data.confidence_score >= 0.3) {
      return {
        status: "Monitor",
        color: 'var(--accent-warning)',
        bgColor: 'linear-gradient(135deg, var(--accent-warning)15, var(--accent-warning)08)',
        icon: <ExclamationCircleOutlined />,
        tag: 'warning',
        borderColor: 'var(--accent-warning)'
      };
    } else if (data.confidence_score < 0.3) {
      return {
        status: "Low Confidence",
        color: 'var(--text-muted)',
        bgColor: 'var(--glass-secondary)',
        icon: <QuestionCircleOutlined />,
        tag: 'default',
        borderColor: 'var(--border-medium)'
      };
    } else {
      return {
        status: "Healthy",
        color: 'var(--accent-success)',
        bgColor: 'linear-gradient(135deg, var(--accent-success)15, var(--accent-success)08)',
        icon: <CheckCircleOutlined />,
        tag: 'success',
        borderColor: 'var(--accent-success)'
      };
    }
  };

  const statusConfig = getStatusConfig();
  const confidencePercentage = Math.round(data.confidence_score * 100);
  const errorValue = Number(data.reconstruction_error);
  const severityValue = data.anomaly_severity ? Number(data.anomaly_severity) : 0;

  // Нормализация severity для прогресс бара (предполагаем максимум 10)
  const severityPercentage = Math.min((severityValue / 10) * 100, 100);

  const formatComponentName = (name) => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatFeatures = (features) => {
    if (!features) return 'N/A';
    if (Array.isArray(features)) {
      return features.slice(0, 3).join(', ');
    }
    return String(features).slice(0, 50) + (String(features).length > 50 ? '...' : '');
  };

  return (
    <Card
      className="glass-card"
      style={{
        height: '100%',
        border: `2px solid ${statusConfig.borderColor}30`,
        borderRadius: '12px',
        background: statusConfig.bgColor,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default'
      }}
      bodyStyle={{ padding: '16px' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 25px ${statusConfig.color}25`;
        e.currentTarget.style.borderColor = `${statusConfig.borderColor}60`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
        e.currentTarget.style.borderColor = `${statusConfig.borderColor}30`;
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            color: statusConfig.color, 
            fontSize: '20px',
            marginBottom: '8px'
          }}>
            {statusConfig.icon}
          </div>
          <Title 
            level={5} 
            style={{ 
              margin: '0 0 4px 0', 
              color: 'var(--text-primary)',
              fontSize: '14px',
              lineHeight: '1.2'
            }}
          >
            {formatComponentName(component)}
          </Title>
          <Tag 
            color={statusConfig.tag}
            style={{ 
              fontSize: '11px',
              border: 'none',
              fontWeight: 600
            }}
          >
            {statusConfig.status}
          </Tag>
        </div>

        {/* Metrics */}
        <div className="glass-panel" style={{ padding: '12px', borderRadius: '8px' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {/* Reconstruction Error */}
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Recon. Error
                </Text>
                <Tooltip title="Lower is better">
                  <Text strong style={{ 
                    fontSize: '12px', 
                    color: errorValue > 1 ? 'var(--accent-danger)' : 'var(--accent-success)' 
                  }}>
                    {errorValue.toFixed(3)}
                  </Text>
                </Tooltip>
              </div>
            </div>

            {/* Confidence Score */}
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Confidence
                </Text>
                <Text strong style={{ fontSize: '12px', color: statusConfig.color }}>
                  {confidencePercentage}%
                </Text>
              </div>
              <Progress 
                percent={confidencePercentage}
                strokeColor={statusConfig.color}
                trailColor="var(--border-light)"
                showInfo={false}
                size="small"
                strokeWidth={4}
              />
            </div>

            {/* Severity */}
            {severityValue > 0 && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <Space align="center" size="small">
                    <WarningOutlined style={{ 
                      fontSize: '10px', 
                      color: 'var(--accent-danger)' 
                    }} />
                    <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Severity
                    </Text>
                  </Space>
                  <Text strong style={{ 
                    fontSize: '12px', 
                    color: 'var(--accent-danger)' 
                  }}>
                    {severityValue.toFixed(2)}
                  </Text>
                </div>
                <Progress 
                  percent={severityPercentage}
                  strokeColor="var(--accent-danger)"
                  trailColor="var(--border-light)"
                  showInfo={false}
                  size="small"
                  strokeWidth={4}
                />
              </div>
            )}
          </Space>
        </div>

        {/* Top Features */}
        {data.top3_features && (
          <div className="glass-panel" style={{ padding: '10px', borderRadius: '6px' }}>
            <div style={{ marginBottom: '6px' }}>
              <Space align="center" size="small">
                <InfoCircleOutlined style={{ 
                  fontSize: '10px', 
                  color: 'var(--accent-primary)' 
                }} />
                <Text style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-secondary)',
                  fontWeight: 600
                }}>
                  Key Features
                </Text>
              </Space>
            </div>
            <Tooltip title={data.top3_features}>
              <Text style={{ 
                fontSize: '10px', 
                color: 'var(--text-muted)',
                lineHeight: '1.3',
                display: 'block'
              }}>
                {formatFeatures(data.top3_features)}
              </Text>
            </Tooltip>
          </div>
        )}
      </Space>
    </Card>
  );
}
