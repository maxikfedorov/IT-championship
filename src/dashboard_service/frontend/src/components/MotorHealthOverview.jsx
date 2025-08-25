// src/dashboard_service/frontend/src/components/MotorHealthOverview.jsx

import { useEffect, useState } from "react";
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Progress, 
  Space, 
  Tag, 
  Badge,
  Alert,
  Spin,
  Tooltip,
  Button
} from "antd";
import { 
  HeartOutlined,
  // TrendingUpOutlined,      // ❌ УДАЛИТЬ
  // TrendingDownOutlined,    // ❌ УДАЛИТЬ
  RiseOutlined,              // ✅ ДОБАВИТЬ вместо TrendingUpOutlined
  FallOutlined,              // ✅ ДОБАВИТЬ вместо TrendingDownOutlined
  RightOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  ClockCircleOutlined
} from "@ant-design/icons";
import api from "../api/apiClient";

const { Title, Text } = Typography;

export default function MotorHealthOverview({ user }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchOverview = async (manual = false) => {
    if (manual) setRefreshing(true);
    
    try {
      const res = await api.get(`/dashboard/${user.username}/motor-health`);
      setOverview(res.data.overview);
      setError(null);
    } catch (err) {
      console.error("Motor health fetch error:", err);
      setError("Failed to load motor health data");
      setOverview(null);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(() => fetchOverview(), 30000); // обновление каждые 30 сек
    return () => clearInterval(interval);
  }, [user.username]);

  // Конфигурация цветов для health score
  const getHealthColor = (percentage) => {
    if (percentage >= 80) return 'var(--accent-success)';
    if (percentage >= 60) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
  };

// Иконка тренда
const getTrendIcon = (trend) => {
  switch (trend?.direction) {
    case 'improving': return <RiseOutlined style={{ color: 'var(--accent-success)' }} />;      // ✅ 
    case 'declining': return <FallOutlined style={{ color: 'var(--accent-danger)' }} />;       // ✅ 
    default: return <RightOutlined style={{ color: 'var(--accent-warning)' }} />;
  }
};


  // Иконка компонента по уровню риска
  const getComponentIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'good': return <CheckCircleOutlined style={{ color: 'var(--accent-success)' }} />;
      case 'warning': return <ExclamationCircleOutlined style={{ color: 'var(--accent-warning)' }} />;
      case 'critical': return <CloseCircleOutlined style={{ color: 'var(--accent-danger)' }} />;
      default: return <SettingOutlined style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  // Цвет тега для рекомендаций
  const getRecommendationColor = (type) => {
    switch (type) {
      case 'urgent': return 'red';
      case 'maintenance': return 'orange';
      case 'info': return 'blue';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Card className="glass-card" style={{ textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '12px' }}>
          <Text type="secondary">Analyzing motor health...</Text>
        </div>
      </Card>
    );
  }

  if (error || !overview) {
    return (
      <Card 
        className="glass-card"
        title={
          <Space align="center">
            <HeartOutlined style={{ color: 'var(--accent-primary)' }} />
            <span>Motor Health Overview</span>
          </Space>
        }
        extra={
          <Button
            type="text"
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={() => fetchOverview(true)}
            style={{ color: 'var(--accent-primary)' }}
          />
        }
      >
        <Alert
          message={error || "No health data available"}
          description="Start the motor to begin health monitoring"
          type="info"
          showIcon
          style={{ textAlign: 'center' }}
        />
      </Card>
    );
  }

  return (
    <Card 
      className="glass-card"
      title={
        <Space align="center">
          <HeartOutlined style={{ color: 'var(--accent-primary)' }} />
          <span>Motor Health Overview</span>
          <Badge 
            count={refreshing ? <Spin size="small" /> : null}
            offset={[8, 0]}
          />
        </Space>
      }
      extra={
        <Tooltip title="Manual refresh">
          <Button
            type="text"
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={() => fetchOverview(true)}
            style={{ color: 'var(--accent-primary)' }}
          />
        </Tooltip>
      }
      bodyStyle={{ padding: '20px' }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Main Health Metrics */}
        <Row gutter={[16, 16]}>
          {/* Overall Health Score */}
          <Col xs={24} sm={12}>
            <div 
              className="glass-panel"
              style={{
                padding: '20px',
                textAlign: 'center',
                background: `linear-gradient(135deg, ${getHealthColor(overview.avg_health_percentage)}15, ${getHealthColor(overview.avg_health_percentage)}08)`
              }}
            >
              <div style={{ fontSize: '32px', color: getHealthColor(overview.avg_health_percentage), marginBottom: '8px' }}>
                <HeartOutlined />
              </div>
              <Title level={3} style={{ margin: 0, color: 'var(--text-primary)', fontSize: '28px' }}>
                {overview.avg_health_percentage}%
              </Title>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                Overall Health Score
              </Text>
              <div style={{ marginTop: '12px' }}>
                <Progress 
                  percent={overview.avg_health_percentage} 
                  strokeColor={getHealthColor(overview.avg_health_percentage)}
                  trailColor="var(--border-light)"
                  showInfo={false}
                  strokeWidth={8}
                />
              </div>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Based on {overview.total_batches_analyzed} batches
                </Text>
                <Space align="center" size={4}>
                  {getTrendIcon(overview.trend)}
                  <Text style={{ fontSize: '12px', color: overview.trend?.color }}>
                    {overview.trend?.text}
                  </Text>
                </Space>
              </div>
            </div>
          </Col>

          {/* Time to Failure Prediction */}
          <Col xs={24} sm={12}>
            <div 
              className="glass-panel"
              style={{
                padding: '20px',
                textAlign: 'center',
                background: `linear-gradient(135deg, ${overview.time_to_failure?.color}15, ${overview.time_to_failure?.color}08)`
              }}
            >
              <div style={{ fontSize: '32px', color: overview.time_to_failure?.color, marginBottom: '8px' }}>
                <ClockCircleOutlined />
              </div>
              <Title level={3} style={{ margin: 0, color: 'var(--text-primary)', fontSize: '28px' }}>
                {overview.time_to_failure?.period}
              </Title>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                Estimated Operating Time
              </Text>
              <div style={{ marginTop: '12px' }}>
                <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {overview.time_to_failure?.text}
                </Text>
              </div>
            </div>
          </Col>
        </Row>

        {/* Component Health Status */}
        <div>
          <Title level={5} style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
            <Space align="center">
              <SettingOutlined style={{ color: 'var(--accent-warning)' }} />
              Component Health Status
            </Space>
          </Title>
          <Row gutter={[12, 12]}>
            {Object.entries(overview.components || {}).map(([component, data]) => (
              <Col xs={12} sm={6} key={component}>
                <div 
                  className="glass-panel"
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    background: data.risk_level === 'good' 
                      ? 'linear-gradient(135deg, var(--accent-success)10, var(--accent-success)05)'
                      : data.risk_level === 'warning'
                      ? 'linear-gradient(135deg, var(--accent-warning)10, var(--accent-warning)05)'
                      : 'linear-gradient(135deg, var(--accent-danger)10, var(--accent-danger)05)'
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>
                    {getComponentIcon(data.risk_level)}
                  </div>
                  <Text strong style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-primary)',
                    textTransform: 'capitalize',
                    display: 'block',
                    marginBottom: '4px'
                  }}>
                    {component}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    Conf: {(data.avg_confidence * 100).toFixed(0)}%
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    Issues: {data.total_anomalies}
                  </Text>
                </div>
              </Col>
            ))}
          </Row>
        </div>

        {/* Statistics Summary */}
        <div 
          className="glass-panel"
          style={{ padding: '16px', background: 'var(--glass-secondary)' }}
        >
          <Row gutter={[16, 8]}>
            <Col xs={12} sm={6}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Total Windows:</Text>
              <br />
              <Text strong style={{ color: 'var(--accent-primary)' }}>
                {overview.total_windows?.toLocaleString()}
              </Text>
            </Col>
            <Col xs={12} sm={6}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Anomalies:</Text>
              <br />
              <Text strong style={{ color: 'var(--accent-danger)' }}>
                {overview.total_anomalies?.toLocaleString()}
              </Text>
            </Col>
            <Col xs={12} sm={6}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Anomaly Rate:</Text>
              <br />
              <Text strong style={{ color: 'var(--accent-warning)' }}>
                {overview.anomaly_rate}%
              </Text>
            </Col>
            <Col xs={12} sm={6}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Batches:</Text>
              <br />
              <Text strong style={{ color: 'var(--accent-primary)' }}>
                {overview.total_batches_analyzed}
              </Text>
            </Col>
          </Row>
        </div>

        {/* Auto-update indicator */}
        <div style={{ 
          textAlign: 'center',
          padding: '8px',
          background: 'var(--glass-primary)',
          borderRadius: '8px',
          border: '1px solid var(--border-light)'
        }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            🔄 Auto-refresh every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
          </Text>
        </div>
      </Space>
    </Card>
  );
}
