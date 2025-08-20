// src/dashboard_service/frontend/src/components/SystemHealthPanel.jsx

import { useEffect, useState } from "react";
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Badge, 
  Space,
  Tooltip,
  Spin
} from "antd";
import { 
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  SettingOutlined
} from "@ant-design/icons";
import api from "../api/apiClient";

const { Title, Text } = Typography;

export default function SystemHealthPanel({ user }) {
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [motorStatus, setMotorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatuses = async (manual = false) => {
    if (manual) setRefreshing(true);
    
    try {
      const [pipelineRes, motorRes] = await Promise.allSettled([
        api.get(`/api/pipeline/status/${user.username}`),
        api.get("/api/motor/status")
      ]);

      setPipelineStatus(
        pipelineRes.status === 'fulfilled' 
          ? pipelineRes.value.data 
          : { status: "error", error: "Connection failed" }
      );
      
      setMotorStatus(
        motorRes.status === 'fulfilled' 
          ? motorRes.value.data 
          : { status: "error", error: "Connection failed" }
      );
    } catch (error) {
      console.error("Status fetch error:", error);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(() => fetchStatuses(), 5000);
    return () => clearInterval(interval);
  }, [user.username]);

  const getStatusConfig = (status, isRunning = false) => {
    if (status === "error") {
      return {
        color: 'var(--accent-danger)',
        icon: <CloseCircleOutlined />,
        text: 'Error',
        badge: 'error'
      };
    }
    
    if (status === "running" || isRunning) {
      return {
        color: 'var(--accent-success)',
        icon: <CheckCircleOutlined />,
        text: 'Running',
        badge: 'success'
      };
    }
    
    return {
      color: 'var(--accent-warning)',
      icon: <ExclamationCircleOutlined />,
      text: 'Inactive',
      badge: 'warning'
    };
  };

  const pipelineConfig = getStatusConfig(
    pipelineStatus?.pipeline_status || pipelineStatus?.status
  );
  
  const motorConfig = getStatusConfig(
    motorStatus?.status, 
    motorStatus?.running
  );

  if (loading) {
    return (
      <Card className="glass-card" style={{ textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '12px' }}>
          <Text type="secondary">Loading system status...</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="glass-card"
      title={
        <Space align="center">
          <ThunderboltOutlined style={{ color: 'var(--accent-primary)' }} />
          <span>System Health</span>
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
            onClick={() => fetchStatuses(true)}
            style={{
              color: 'var(--accent-primary)',
              border: 'none'
            }}
          />
        </Tooltip>
      }
      bodyStyle={{ padding: '20px' }}
    >
      <Row gutter={[16, 16]}>
        {/* Pipeline Status */}
        <Col xs={24} sm={12}>
          <div 
            className="glass-panel" 
            style={{ 
              padding: '16px', 
              textAlign: 'center',
              background: `linear-gradient(135deg, ${pipelineConfig.color}15, ${pipelineConfig.color}08)`
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ fontSize: '24px', color: pipelineConfig.color }}>
                {pipelineConfig.icon}
              </div>
              <Title level={5} style={{ margin: 0, color: 'var(--text-primary)' }}>
                AI Pipeline
              </Title>
              <Badge 
                status={pipelineConfig.badge} 
                text={
                  <Text style={{ color: 'var(--text-secondary)' }}>
                    {pipelineConfig.text}
                  </Text>
                } 
              />
              {pipelineStatus?.user_id && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  User: {pipelineStatus.user_id}
                </Text>
              )}
            </Space>
          </div>
        </Col>

        {/* Motor Status */}
        <Col xs={24} sm={12}>
          <div 
            className="glass-panel" 
            style={{ 
              padding: '16px', 
              textAlign: 'center',
              background: `linear-gradient(135deg, ${motorConfig.color}15, ${motorConfig.color}08)`
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ fontSize: '24px', color: motorConfig.color }}>
                <SettingOutlined />
              </div>
              <Title level={5} style={{ margin: 0, color: 'var(--text-primary)' }}>
                Motor Generator
              </Title>
              <Badge 
                status={motorConfig.badge} 
                text={
                  <Text style={{ color: 'var(--text-secondary)' }}>
                    {motorConfig.text}
                  </Text>
                } 
              />
              {motorStatus?.config?.frequency && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {motorStatus.config.frequency}Hz • {motorStatus.config.sampling_rate} samples/s
                </Text>
              )}
            </Space>
          </div>
        </Col>
      </Row>

      {/* Auto-refresh indicator */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '16px',
        padding: '8px',
        background: 'var(--glass-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border-light)'
      }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          🔄 Auto-refresh every 5 seconds
        </Text>
      </div>
    </Card>
  );
}
