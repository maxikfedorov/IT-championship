// src/dashboard_service/frontend/src/components/SystemControlPanel.jsx

import { useEffect, useState } from "react";
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Space,
  Badge,
  Tooltip,
  message,
  Spin,
  Divider
} from "antd";
import { 
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  ControlOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from "@ant-design/icons";
import api from "../api/apiClient";

const { Title, Text } = Typography;

export default function SystemControlPanel({ user }) {
  // States для статусов
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [motorStatus, setMotorStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // States для управления
  const [pipelineLoading, setPipelineLoading] = useState({ start: false, stop: false });
  const [motorLoading, setMotorLoading] = useState({ start: false, stop: false });

  // Получение статусов
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

  // Автообновление
  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(() => fetchStatuses(), 5000);
    return () => clearInterval(interval);
  }, [user.username]);

  // Управление Pipeline
  const handlePipelineAction = async (action) => {
    const isStart = action === 'start';
    setPipelineLoading(prev => ({ ...prev, [action]: true }));
    
    message.loading({
      content: `${isStart ? 'Starting' : 'Stopping'} AI Pipeline...`,
      key: 'pipeline-action',
      duration: 0
    });
    
    try {
      const [apiResponse] = await Promise.all([
        api.post(`/api/pipeline/${action}/${user.username}`),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);

      message.success({
        content: `Pipeline ${isStart ? 'started' : 'stopped'} successfully`,
        key: 'pipeline-action',
        icon: isStart ? <PlayCircleOutlined /> : <StopOutlined />
      });
      
      // Обновляем статус после действия
      setTimeout(() => fetchStatuses(), 1000);
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 500));
      message.error({
        content: `Failed to ${action} pipeline`,
        key: 'pipeline-action'
      });
      console.error(`Pipeline ${action} error:`, error);
    } finally {
      setTimeout(() => {
        setPipelineLoading(prev => ({ ...prev, [action]: false }));
      }, 200);
    }
  };

  // Управление Motor
  const handleMotorAction = async (action) => {
    const isStart = action === 'start';
    setMotorLoading(prev => ({ ...prev, [action]: true }));
    
    message.loading({
      content: `${isStart ? 'Starting' : 'Stopping'} Motor Generator...`,
      key: 'motor-action',
      duration: 0
    });
    
    try {
      const [apiResponse] = await Promise.all([
        api.post(`/api/motor/${action}`),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);

      message.success({
        content: `Motor ${isStart ? 'started' : 'stopped'} successfully`,
        key: 'motor-action',
        icon: isStart ? <PlayCircleOutlined /> : <StopOutlined />
      });
      
      // Обновляем статус после действия
      setTimeout(() => fetchStatuses(), 1000);
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 500));
      message.error({
        content: `Failed to ${action} motor`,
        key: 'motor-action'
      });
      console.error(`Motor ${action} error:`, error);
    } finally {
      setTimeout(() => {
        setMotorLoading(prev => ({ ...prev, [action]: false }));
      }, 200);
    }
  };

  // Конфигурация статусов
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

  // Стили кнопок с анимацией
  const getButtonStyle = (isLoading, type, disabled = false) => {
    const baseStyle = {
      flex: 1,
      border: 'none',
      borderRadius: '8px',
      height: '40px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isLoading ? 'scale(0.98)' : 'scale(1)',
      opacity: disabled ? 0.6 : 1,
    };

    if (type === 'start') {
      return {
        ...baseStyle,
        background: isLoading 
          ? 'linear-gradient(135deg, var(--accent-success-light), var(--accent-success))' 
          : 'linear-gradient(135deg, var(--accent-success), var(--accent-success-light))',
        boxShadow: isLoading 
          ? 'inset 0 2px 4px rgba(0,0,0,0.2)' 
          : '0 2px 8px rgba(16, 185, 129, 0.3)',
      };
    } else {
      return {
        ...baseStyle,
        background: isLoading 
          ? 'linear-gradient(135deg, var(--accent-danger-light), var(--accent-danger))' 
          : 'linear-gradient(135deg, var(--accent-danger), var(--accent-danger-light))',
        color: 'white',
        boxShadow: isLoading 
          ? 'inset 0 2px 4px rgba(0,0,0,0.2)' 
          : '0 2px 8px rgba(239, 68, 68, 0.3)',
      };
    }
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
          <ControlOutlined style={{ color: 'var(--accent-primary)' }} />
          <span>System Control & Health</span>
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
      <Row gutter={[24, 24]}>
        {/* AI Pipeline Control & Status */}
        <Col xs={24} sm={12}>
          <div 
            className="glass-panel" 
            style={{ 
              padding: '20px',
              background: `linear-gradient(135deg, ${pipelineConfig.color}15, ${pipelineConfig.color}08)`
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Status Header */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', color: pipelineConfig.color, marginBottom: '8px' }}>
                  <ThunderboltOutlined />
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
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      User: {pipelineStatus.user_id}
                    </Text>
                  </div>
                )}
              </div>
              
              {/* Control Buttons */}
              <Space size="small" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  icon={pipelineLoading.start ? 
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} /> : 
                    <PlayCircleOutlined />
                  }
                  onClick={() => handlePipelineAction('start')}
                  style={getButtonStyle(
                    pipelineLoading.start, 
                    'start',
                    pipelineStatus?.pipeline_status === 'running' || pipelineStatus?.status === 'running'
                  )}
                  disabled={
                    pipelineLoading.stop || 
                    pipelineLoading.start || 
                    pipelineStatus?.pipeline_status === 'running' || 
                    pipelineStatus?.status === 'running'
                  }
                >
                  {pipelineLoading.start ? 'Starting...' : 'Start'}
                </Button>
                <Button
                  icon={pipelineLoading.stop ? 
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} /> : 
                    <StopOutlined />
                  }
                  onClick={() => handlePipelineAction('stop')}
                  style={getButtonStyle(
                    pipelineLoading.stop, 
                    'stop',
                    pipelineStatus?.pipeline_status === 'inactive' || pipelineStatus?.status === 'inactive'
                  )}
                  disabled={
                    pipelineLoading.start || 
                    pipelineLoading.stop || 
                    pipelineStatus?.pipeline_status === 'inactive' || 
                    pipelineStatus?.status === 'inactive'
                  }
                >
                  {pipelineLoading.stop ? 'Stopping...' : 'Stop'}
                </Button>
              </Space>
            </Space>
          </div>
        </Col>

        {/* Motor Generator Control & Status */}
        <Col xs={24} sm={12}>
          <div 
            className="glass-panel" 
            style={{ 
              padding: '20px',
              background: `linear-gradient(135deg, ${motorConfig.color}15, ${motorConfig.color}08)`
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Status Header */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', color: motorConfig.color, marginBottom: '8px' }}>
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
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {motorStatus.config.frequency}Hz • {motorStatus.config.sampling_rate} samples/s
                    </Text>
                  </div>
                )}
              </div>
              
              {/* Control Buttons */}
              <Space size="small" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  icon={motorLoading.start ? 
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} /> : 
                    <PlayCircleOutlined />
                  }
                  onClick={() => handleMotorAction('start')}
                  style={getButtonStyle(
                    motorLoading.start, 
                    'start',
                    motorStatus?.running
                  )}
                  disabled={motorLoading.stop || motorLoading.start || motorStatus?.running}
                >
                  {motorLoading.start ? 'Starting...' : 'Start'}
                </Button>
                <Button
                  icon={motorLoading.stop ? 
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} /> : 
                    <StopOutlined />
                  }
                  onClick={() => handleMotorAction('stop')}
                  style={getButtonStyle(
                    motorLoading.stop, 
                    'stop',
                    !motorStatus?.running
                  )}
                  disabled={motorLoading.start || motorLoading.stop || !motorStatus?.running}
                >
                  {motorLoading.stop ? 'Stopping...' : 'Stop'}
                </Button>
              </Space>
            </Space>
          </div>
        </Col>
      </Row>

      {/* System Info Footer */}
      <Divider style={{ margin: '20px 0 16px 0' }} />
      <Row justify="space-between" align="middle">
        <Col>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ⚠️ Start Motor before Pipeline
          </Text>
        </Col>
        <Col>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            🔄 Auto-refresh every 5 seconds
          </Text>
        </Col>
      </Row>
    </Card>
  );
}
