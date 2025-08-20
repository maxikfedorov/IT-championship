// src/dashboard_service/frontend/src/pages/WindowDetailsPage.jsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { 
  Typography, 
  Button, 
  Space, 
  Row, 
  Col,
  Spin,
  Alert,
  Card,
  Tag
} from "antd";
import { 
  DownloadOutlined, 
  FileTextOutlined,
  FilePdfOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  RobotOutlined,
  HeatMapOutlined,
  LineChartOutlined,
  AppstoreOutlined
} from "@ant-design/icons";
import api from "../api/apiClient";

import AutoencoderCard from "../components/AutoencoderCard";
import AttentionHeatmap from "../components/AttentionHeatmap";
import LSTMPredictionsChart from "../components/LSTMPredictionsChart";
import ComponentHealthMatrix from "../components/ComponentHealthMatrix";
import Breadcrumbs from "../components/Breadcrumbs";

const { Title, Text } = Typography;

export default function WindowDetailsPage() {
  const { batch_id, window_id } = useParams();
  const [autoencoder, setAutoencoder] = useState(null);
  const [attention, setAttention] = useState(null);
  const [lstm, setLstm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const formatBatchId = (batch_id) => {
    const match = batch_id?.match(/batch_(\d+)$/);
    return match ? `Batch #${match[1]}` : batch_id;
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return {
          color: 'success',
          icon: <CheckCircleOutlined />,
          text: 'Healthy'
        };
      case 'monitor':
        return {
          color: 'warning', 
          icon: <ExclamationCircleOutlined />,
          text: 'Monitor'
        };
      case 'critical':
        return {
          color: 'error',
          icon: <CloseCircleOutlined />,
          text: 'Critical'
        };
      default:
        return {
          color: 'default',
          icon: <ExclamationCircleOutlined />,
          text: status || 'Unknown'
        };
    }
  };

  const downloadReport = async (format) => {
    setDownloadLoading(true);
    
    try {
      const [response] = await Promise.all([
        api.get(`/report/batch/${batch_id}/window/${window_id}?format=${format}`, { 
          responseType: "blob" 
        }),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `batch_${batch_id}_window_${window_id}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Report download failed", err);
      setError("Failed to download report");
    } finally {
      setTimeout(() => setDownloadLoading(false), 200);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [autoencoderRes, attentionRes, lstmRes] = await Promise.allSettled([
          api.get(`/api/batch/${batch_id}/window/${window_id}/autoencoder`),
          api.get(`/api/batch/${batch_id}/window/${window_id}/attention`),
          api.get(`/api/batch/${batch_id}/window/${window_id}/lstm`)
        ]);

        setAutoencoder(
          autoencoderRes.status === 'fulfilled' ? autoencoderRes.value.data : null
        );
        setAttention(
          attentionRes.status === 'fulfilled' ? attentionRes.value.data.attention_weights : null
        );
        setLstm(
          lstmRes.status === 'fulfilled' ? lstmRes.value.data : null
        );
      } catch (err) {
        console.error("Window data fetch error:", err);
        setError("Failed to load window data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [batch_id, window_id]);

  if (loading) {
    return (
      <div style={{ 
        padding: '24px',
        minHeight: '60vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">Loading window analysis...</Text>
          </div>
        </div>
      </div>
    );
  }

  if (error || !autoencoder) {
    return (
      <div style={{ 
        padding: '24px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        minHeight: '60vh'
      }}>
        <Breadcrumbs />
        <Alert
          message="Error"
          description={error || "Failed to load window data"}
          type="error"
          showIcon
          style={{ marginTop: '20px' }}
        />
      </div>
    );
  }

  const statusConfig = getStatusConfig(autoencoder.overall?.system_health_status);

  return (
    <div style={{ 
      padding: '24px',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
    }}>
      {/* Breadcrumbs */}
      <div style={{ marginBottom: '24px' }}>
        <Breadcrumbs />
      </div>

      {/* Compact Header */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center" size="middle">
              <EyeOutlined 
                style={{ 
                  fontSize: '28px', 
                  color: 'var(--accent-primary)' 
                }} 
              />
              <div>
                <Space align="center" size="middle">
                  <Title 
                    level={2} 
                    className="text-gradient"
                    style={{ margin: 0, fontSize: '24px' }}
                  >
                    Window #{window_id}
                  </Title>
                  <Tag 
                    color={statusConfig.color}
                    icon={statusConfig.icon}
                    style={{ 
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '4px 8px'
                    }}
                  >
                    {statusConfig.text}
                  </Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  {formatBatchId(batch_id)} • Detailed Analysis
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                loading={downloadLoading}
                onClick={() => downloadReport("json")}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-light))',
                  border: 'none',
                  borderRadius: '8px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: downloadLoading ? 'scale(0.98)' : 'scale(1)',
                }}
              >
                JSON
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                loading={downloadLoading}
                onClick={() => downloadReport("pdf")}
                style={{
                  borderColor: 'var(--accent-primary)',
                  color: 'var(--accent-primary)',
                  borderRadius: '8px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: downloadLoading ? 'scale(0.98)' : 'scale(1)',
                }}
              >
                PDF
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Main Analysis Grid */}
      <Row gutter={[24, 24]}>
        {/* Component Health Matrix - MAIN TABLE */}
        <Col xs={24}>
          <Card 
            className="glass-card"
            title={
              <Space align="center">
                <AppstoreOutlined style={{ color: 'var(--accent-success)' }} />
                <span>Component Health Overview</span>
              </Space>
            }
            bodyStyle={{ padding: '16px' }}
          >
            <ComponentHealthMatrix components={autoencoder.components || {}} />
          </Card>
        </Col>

        {/* Autoencoder Components - COMPACT */}
        <Col xs={24}>
          <Card 
            className="glass-card"
            title={
              <Space align="center">
                <RobotOutlined style={{ color: 'var(--accent-primary)' }} />
                <span>Autoencoder Analysis</span>
              </Space>
            }
            bodyStyle={{ padding: '16px' }}
          >
            <Row gutter={[12, 12]}>
              {Object.entries(autoencoder.components || {}).map(([comp, data]) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={comp}>
                  <AutoencoderCard component={comp} data={data} compact={true} />
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* Attention Heatmap */}
        {attention ? (
          <Col xs={24} xl={12}>
            <Card 
              className="glass-card"
              title={
                <Space align="center">
                  <HeatMapOutlined style={{ color: 'var(--accent-warning)' }} />
                  <span>Attention Heatmap</span>
                </Space>
              }
              style={{ height: '100%' }}
              bodyStyle={{ padding: '16px' }}
            >
              <AttentionHeatmap attention={attention} />
            </Card>
          </Col>
        ) : (
          <Col xs={24} xl={12}>
            <Card 
              className="glass-card"
              title={
                <Space align="center">
                  <HeatMapOutlined style={{ color: 'var(--text-muted)' }} />
                  <span>Attention Heatmap</span>
                </Space>
              }
              style={{ height: '100%' }}
              bodyStyle={{ padding: '40px', textAlign: 'center' }}
            >
              <Text type="secondary">No attention weights available</Text>
            </Card>
          </Col>
        )}

        {/* LSTM Predictions */}
        {lstm ? (
          <Col xs={24} xl={12}>
            <Card 
              className="glass-card"
              title={
                <Space align="center">
                  <LineChartOutlined style={{ color: 'var(--accent-danger)' }} />
                  <span>LSTM Predictions</span>
                </Space>
              }
              style={{ height: '100%' }}
              bodyStyle={{ padding: '16px' }}
            >
              <LSTMPredictionsChart lstm={lstm} />
            </Card>
          </Col>
        ) : (
          <Col xs={24} xl={12}>
            <Card 
              className="glass-card"
              title={
                <Space align="center">
                  <LineChartOutlined style={{ color: 'var(--text-muted)' }} />
                  <span>LSTM Predictions</span>
                </Space>
              }
              style={{ height: '100%' }}
              bodyStyle={{ padding: '40px', textAlign: 'center' }}
            >
              <Text type="secondary">No LSTM predictions available</Text>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}
