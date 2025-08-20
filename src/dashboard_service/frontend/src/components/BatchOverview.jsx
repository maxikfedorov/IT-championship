// src/dashboard_service/frontend/src/components/BatchOverview.jsx

import { 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  Space, 
  Typography, 
  Tag,
  Empty
} from "antd";
import { 
  DatabaseOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  SettingOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

export default function BatchOverview({ summary }) {
  if (!summary) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Empty 
          description={
            <Text type="secondary">No summary data available</Text>
          }
        />
      </div>
    );
  }

  const healthPercentage = summary.total_windows > 0 
    ? Math.round(((summary.total_windows - summary.anomaly_windows) / summary.total_windows) * 100)
    : 0;

  const getHealthColor = (percentage) => {
    if (percentage >= 80) return 'var(--accent-success)';
    if (percentage >= 40) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getAnomalyColor = (count) => {
    if (count === 0) return 'success';
    if (count <= 5) return 'warning';
    return 'error';
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8}>
          <div 
            className="glass-panel"
            style={{
              padding: '16px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, var(--accent-primary)10, var(--accent-primary)05)'
            }}
          >
            <Statistic
              title={
                <Space align="center">
                  <DatabaseOutlined style={{ color: 'var(--accent-primary)' }} />
                  <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Total Windows
                  </Text>
                </Space>
              }
              value={summary.total_windows}
              valueStyle={{ 
                color: 'var(--accent-primary)', 
                fontSize: '20px',
                fontWeight: 600
              }}
            />
          </div>
        </Col>

        <Col xs={12} sm={8}>
          <div 
            className="glass-panel"
            style={{
              padding: '16px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, var(--accent-danger)10, var(--accent-danger)05)'
            }}
          >
            <Statistic
              title={
                <Space align="center">
                  <ExclamationCircleOutlined style={{ color: 'var(--accent-danger)' }} />
                  <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Anomalies
                  </Text>
                </Space>
              }
              value={summary.anomaly_windows}
              valueStyle={{ 
                color: 'var(--accent-danger)', 
                fontSize: '20px',
                fontWeight: 600
              }}
            />
          </div>
        </Col>

        <Col xs={24} sm={8}>
          <div 
            className="glass-panel"
            style={{
              padding: '16px',
              textAlign: 'center',
              background: `linear-gradient(135deg, ${getHealthColor(healthPercentage)}10, ${getHealthColor(healthPercentage)}05)`
            }}
          >
            <Statistic
              title={
                <Space align="center">
                  <CheckCircleOutlined style={{ color: getHealthColor(healthPercentage) }} />
                  <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Health Score
                  </Text>
                </Space>
              }
              value={healthPercentage}
              suffix="%"
              valueStyle={{ 
                color: getHealthColor(healthPercentage), 
                fontSize: '20px',
                fontWeight: 600
              }}
            />
            <Progress 
              percent={healthPercentage} 
              strokeColor={getHealthColor(healthPercentage)}
              trailColor="var(--border-light)"
              showInfo={false}
              size="small"
              style={{ marginTop: '8px' }}
            />
          </div>
        </Col>
      </Row>

      {/* Component Health Details */}
      {summary.component_health && Object.keys(summary.component_health).length > 0 && (
        <>
          <div style={{ marginTop: '8px' }}>
            <Title level={5} style={{ 
              color: 'var(--text-primary)', 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <SettingOutlined style={{ color: 'var(--accent-warning)' }} />
              Component Health
            </Title>
          </div>

          <Row gutter={[12, 12]}>
            {Object.entries(summary.component_health).map(([comp, data]) => (
              <Col xs={24} sm={12} lg={8} key={comp}>
                <div 
                  className="glass-card"
                  style={{
                    padding: '12px',
                    background: `linear-gradient(135deg, ${getConfidenceColor(data.avg_confidence) === 'success' ? 'var(--accent-success)' : getConfidenceColor(data.avg_confidence) === 'warning' ? 'var(--accent-warning)' : 'var(--accent-danger)'}08, transparent)`
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong style={{ 
                      fontSize: '13px', 
                      color: 'var(--text-primary)',
                      textTransform: 'capitalize'
                    }}>
                      {comp.replace(/_/g, ' ')}
                    </Text>
                  </div>
                  
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Confidence
                      </Text>
                      <Tag 
                        color={getConfidenceColor(data.avg_confidence)} 
                        style={{ fontSize: '10px', margin: 0 }}
                      >
                        {(data.avg_confidence * 100).toFixed(1)}%
                      </Tag>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Anomalies
                      </Text>
                      <Tag 
                        color={getAnomalyColor(data.anomalies)} 
                        style={{ fontSize: '10px', margin: 0 }}
                      >
                        {data.anomalies}
                      </Tag>
                    </div>
                  </Space>
                </div>
              </Col>
            ))}
          </Row>
        </>
      )}
    </Space>
  );
}
