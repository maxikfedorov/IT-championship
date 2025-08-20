// src/dashboard_service/frontend/src/components/ControlPanel.jsx

import { useState } from "react";
import { 
  Card, 
  Button, 
  Row, 
  Col, 
  Space, 
  Typography, 
  message,
  Divider,
  Spin
} from "antd";
import { 
  PlayCircleOutlined,
  StopOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  ControlOutlined,
  LoadingOutlined
} from "@ant-design/icons";
import api from "../api/apiClient";

const { Title, Text } = Typography;

export default function ControlPanel({ user }) {
  const [pipelineLoading, setPipelineLoading] = useState({ start: false, stop: false });
  const [motorLoading, setMotorLoading] = useState({ start: false, stop: false });

  const handlePipelineAction = async (action) => {
    const isStart = action === 'start';
    setPipelineLoading(prev => ({ ...prev, [action]: true }));
    
    // Показываем немедленную обратную связь
    message.loading({
      content: `${isStart ? 'Starting' : 'Stopping'} AI Pipeline...`,
      key: 'pipeline-action',
      duration: 0
    });
    
    try {
      // Запускаем запрос и минимальную задержку параллельно
      const [apiResponse] = await Promise.all([
        api.post(`/api/pipeline/${action}/${user.username}`),
        new Promise(resolve => setTimeout(resolve, 800)) // минимум 800ms для плавности
      ]);

      message.success({
        content: `Pipeline ${isStart ? 'started' : 'stopped'} successfully`,
        key: 'pipeline-action',
        icon: isStart ? <PlayCircleOutlined /> : <StopOutlined />
      });
    } catch (error) {
      // Даже при ошибке ждём минимальную задержку
      await new Promise(resolve => setTimeout(resolve, 500));
      message.error({
        content: `Failed to ${action} pipeline`,
        key: 'pipeline-action'
      });
      console.error(`Pipeline ${action} error:`, error);
    } finally {
      // Дополнительная небольшая задержка перед сбросом состояния
      setTimeout(() => {
        setPipelineLoading(prev => ({ ...prev, [action]: false }));
      }, 200);
    }
  };

  const handleMotorAction = async (action) => {
    const isStart = action === 'start';
    setMotorLoading(prev => ({ ...prev, [action]: true }));
    
    // Показываем немедленную обратную связь
    message.loading({
      content: `${isStart ? 'Starting' : 'Stopping'} Motor Generator...`,
      key: 'motor-action',
      duration: 0
    });
    
    try {
      // Запускаем запрос и минимальную задержку параллельно
      const [apiResponse] = await Promise.all([
        api.post(`/api/motor/${action}`),
        new Promise(resolve => setTimeout(resolve, 800)) // минимум 800ms для плавности
      ]);

      message.success({
        content: `Motor ${isStart ? 'started' : 'stopped'} successfully`,
        key: 'motor-action',
        icon: isStart ? <PlayCircleOutlined /> : <StopOutlined />
      });
    } catch (error) {
      // Даже при ошибке ждём минимальную задержку
      await new Promise(resolve => setTimeout(resolve, 500));
      message.error({
        content: `Failed to ${action} motor`,
        key: 'motor-action'
      });
      console.error(`Motor ${action} error:`, error);
    } finally {
      // Дополнительная небольшая задержка перед сбросом состояния
      setTimeout(() => {
        setMotorLoading(prev => ({ ...prev, [action]: false }));
      }, 200);
    }
  };

  // Стили для эффекта нажатия с более плавными переходами
  const getButtonStyle = (isLoading, type) => {
    const baseStyle = {
      flex: 1,
      border: 'none',
      borderRadius: '8px',
      height: '40px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // более плавная кривая
      transform: isLoading ? 'scale(0.98)' : 'scale(1)',
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

  return (
    <Card 
      className="glass-card"
      title={
        <Space align="center">
          <ControlOutlined style={{ color: 'var(--accent-primary)' }} />
          <span>Control Panel</span>
        </Space>
      }
      bodyStyle={{ padding: '20px' }}
    >
      <Row gutter={[24, 24]}>
        {/* AI Pipeline Controls */}
        <Col xs={24} sm={12}>
          <div 
            className="glass-panel" 
            style={{ 
              padding: '20px',
              background: 'linear-gradient(135deg, var(--accent-primary)10, var(--accent-primary)05)'
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <ThunderboltOutlined 
                  style={{ 
                    fontSize: '24px', 
                    color: 'var(--accent-primary)',
                    marginBottom: '8px'
                  }} 
                />
                <Title level={5} style={{ margin: 0, color: 'var(--text-primary)' }}>
                  AI Pipeline
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Data streaming & processing
                </Text>
              </div>
              
              <Space size="small" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  icon={pipelineLoading.start ? 
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} /> : 
                    <PlayCircleOutlined />
                  }
                  loading={false} // убираем встроенный loading, используем свой
                  onClick={() => handlePipelineAction('start')}
                  style={getButtonStyle(pipelineLoading.start, 'start')}
                  disabled={pipelineLoading.stop || pipelineLoading.start}
                >
                  {pipelineLoading.start ? 'Starting...' : 'Start'}
                </Button>
                <Button
                  icon={pipelineLoading.stop ? 
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} /> : 
                    <StopOutlined />
                  }
                  loading={false} // убираем встроенный loading, используем свой
                  onClick={() => handlePipelineAction('stop')}
                  style={getButtonStyle(pipelineLoading.stop, 'stop')}
                  disabled={pipelineLoading.start || pipelineLoading.stop}
                >
                  {pipelineLoading.stop ? 'Stopping...' : 'Stop'}
                </Button>
              </Space>
            </Space>
          </div>
        </Col>

        {/* Motor Generator Controls */}
        <Col xs={24} sm={12}>
          <div 
            className="glass-panel" 
            style={{ 
              padding: '20px',
              background: 'linear-gradient(135deg, var(--accent-warning)10, var(--accent-warning)05)'
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <SettingOutlined 
                  style={{ 
                    fontSize: '24px', 
                    color: 'var(--accent-warning)',
                    marginBottom: '8px'
                  }} 
                />
                <Title level={5} style={{ margin: 0, color: 'var(--text-primary)' }}>
                  Motor Generator
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  3-phase motor simulation
                </Text>
              </div>
              
              <Space size="small" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  icon={motorLoading.start ? 
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} /> : 
                    <PlayCircleOutlined />
                  }
                  loading={false}
                  onClick={() => handleMotorAction('start')}
                  style={getButtonStyle(motorLoading.start, 'start')}
                  disabled={motorLoading.stop || motorLoading.start}
                >
                  {motorLoading.start ? 'Starting...' : 'Start'}
                </Button>
                <Button
                  icon={motorLoading.stop ? 
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} /> : 
                    <StopOutlined />
                  }
                  loading={false}
                  onClick={() => handleMotorAction('stop')}
                  style={getButtonStyle(motorLoading.stop, 'stop')}
                  disabled={motorLoading.start || motorLoading.stop}
                >
                  {motorLoading.stop ? 'Stopping...' : 'Stop'}
                </Button>
              </Space>
            </Space>
          </div>
        </Col>
      </Row>

      {/* Safety Notice */}
      <Divider style={{ margin: '20px 0' }} />
      <div style={{ 
        textAlign: 'center',
        padding: '12px',
        background: 'var(--glass-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border-light)'
      }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          ⚠️ Always start the Motor before starting the AI Pipeline
        </Text>
      </div>
    </Card>
  );
}
