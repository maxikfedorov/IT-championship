// src/dashboard_service/frontend/src/pages/BatchDetailsPage.jsx

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
  Divider
} from "antd";
import { 
  DownloadOutlined, 
  FileTextOutlined,
  FilePdfOutlined,
  DatabaseOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import api from "../api/apiClient";

import BatchOverview from "../components/BatchOverview";
import WindowSelector from "../components/WindowSelector";
import AnomalyTimeline from "../components/AnomalyTimeline";
import Breadcrumbs from "../components/Breadcrumbs";

const { Title, Text } = Typography;

export default function BatchDetailsPage() {
  const { user_id, batch_id } = useParams();
  const [overview, setOverview] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const formatBatchId = (batch_id) => {
    const match = batch_id?.match(/batch_(\d+)$/);
    return match ? `Batch #${match[1]}` : batch_id;
  };

  const fetchTimeline = async () => {
    try {
      const res = await api.get(`/api/batch/${batch_id}/anomalies/timeline`);
      setTimeline(res.data.timeline || []);
      setPending(res.data.pending || false);
    } catch (err) {
      console.error("Timeline fetch error:", err);
      setTimeline(null);
      setPending(false);
    }
  };

  const downloadReport = async (format) => {
    setDownloadLoading(true);
    
    try {
      // Плавная задержка для UX
      const [response] = await Promise.all([
        api.get(`/report/batch/${batch_id}?format=${format}`, { responseType: "blob" }),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `batch_${batch_id}.${format}`);
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
        const [overviewRes] = await Promise.all([
          api.get(`/api/batch/${batch_id}/overview?user_id=${user_id}`),
          fetchTimeline()
        ]);
        
        setOverview(overviewRes.data.processed_summary);
      } catch (err) {
        console.error("Batch data fetch error:", err);
        setError("Failed to load batch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [batch_id, user_id]);

  useEffect(() => {
    if (pending) {
      const timer = setTimeout(fetchTimeline, 2000);
      return () => clearTimeout(timer);
    }
  }, [pending]);

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
            <Text type="secondary">Loading batch details...</Text>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '24px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        minHeight: '60vh'
      }}>
        <Breadcrumbs />
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginTop: '20px' }}
        />
      </div>
    );
  }

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

      {/* Header Section */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center" size="middle">
              <DatabaseOutlined 
                style={{ 
                  fontSize: '32px', 
                  color: 'var(--accent-primary)' 
                }} 
              />
              <div>
                <Title 
                  level={2} 
                  className="text-gradient"
                  style={{ margin: 0, fontSize: '28px' }}
                >
                  {formatBatchId(batch_id)}
                </Title>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  User: {user_id} • Batch Analysis & Reports
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
                  height: '40px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: downloadLoading ? 'scale(0.98)' : 'scale(1)',
                }}
              >
                JSON Report
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                loading={downloadLoading}
                onClick={() => downloadReport("pdf")}
                style={{
                  borderColor: 'var(--accent-primary)',
                  color: 'var(--accent-primary)',
                  borderRadius: '8px',
                  height: '40px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: downloadLoading ? 'scale(0.98)' : 'scale(1)',
                }}
              >
                PDF Report
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Main Content Grid */}
      <Row gutter={[24, 24]}>
        {/* Batch Overview */}
        <Col xs={24} xl={12}>
          <Card 
            className="glass-card"
            title={
              <Space align="center">
                <DatabaseOutlined style={{ color: 'var(--accent-primary)' }} />
                <span>Batch Overview</span>
              </Space>
            }
            style={{ height: '100%' }}
            bodyStyle={{ padding: '20px' }}
          >
            {overview && <BatchOverview summary={overview} />}
          </Card>
        </Col>

        {/* Window Selector */}
        <Col xs={24} xl={12}>
          <Card 
            className="glass-card"
            title={
              <Space align="center">
                <DatabaseOutlined style={{ color: 'var(--accent-warning)' }} />
                <span>Window Analysis</span>
              </Space>
            }
            style={{ height: '100%' }}
            bodyStyle={{ padding: '20px' }}
          >
            {overview && (
              <WindowSelector
                totalWindows={overview.total_windows}
                user_id={user_id}
                batch_id={batch_id}
              />
            )}
          </Card>
        </Col>

        {/* Anomaly Timeline */}
        {timeline && (
          <Col xs={24}>
            <Card 
              className="glass-card"
              title={
                <Space align="center">
                  <ReloadOutlined 
                    style={{ 
                      color: 'var(--accent-danger)',
                      animation: pending ? 'spin 1s linear infinite' : 'none'
                    }} 
                  />
                  <span>Anomaly Timeline</span>
                  {pending && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      • Updating...
                    </Text>
                  )}
                </Space>
              }
              extra={
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={fetchTimeline}
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Refresh
                </Button>
              }
              bodyStyle={{ padding: '20px' }}
            >
              <AnomalyTimeline
                timeline={timeline}
                pending={pending}
                onReload={fetchTimeline}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* CSS для анимации спиннера */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
