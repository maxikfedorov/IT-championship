// src/dashboard_service/frontend/src/components/AnomalyTimeline.jsx

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter
} from "recharts";
import { useNavigate, useParams } from "react-router-dom";
import { Typography, Space, Tag, Button, Empty, Spin } from "antd";
import { ReloadOutlined, InfoCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function AnomalyTimeline({ timeline, pending, onReload }) {
  const navigate = useNavigate();
  const { user_id, batch_id } = useParams();
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const statusToColor = (status) => {
    switch (status) {
      case "Critical": return "#ff4d4f";
      case "Monitor": return "#faad14";
      case "Healthy": return "#52c41a";
      default: return "#d9d9d9";
    }
  };

  const statusConfig = {
    "Critical": { color: "#ff4d4f", count: 0 },
    "Monitor": { color: "#faad14", count: 0 },
    "Healthy": { color: "#52c41a", count: 0 }
  };

  // Пустое состояние или загрузка
  if (!timeline || timeline.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        {pending ? (
          <Space direction="vertical" size="large">
            <Spin size="large" />
            <div>
              <Title level={4} style={{ color: 'var(--text-secondary)' }}>
                Loading Timeline Data...
              </Title>
              <Text type="secondary">
                Processing anomaly detection results
              </Text>
            </div>
          </Space>
        ) : (
          <Empty 
            description={
              <Space direction="vertical" size="small">
                <Text type="secondary">No timeline data available</Text>
                <Button 
                  type="link" 
                  icon={<ReloadOutlined />}
                  onClick={onReload}
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Retry Loading
                </Button>
              </Space>
            }
          />
        )}
      </div>
    );
  }

  const data = timeline.map((t, i) => {
    const status = t.system_health_status || "Healthy";
    statusConfig[status] = statusConfig[status] || { color: "#d9d9d9", count: 0 };
    statusConfig[status].count++;
    
    return {
      ...t,
      color: statusToColor(status),
      key: `${t.window_index || i}`,
      status: status
    };
  });

  const handleDotClick = (point) => {
    if (point && point.window_index != null) {
      navigate(`/details/${user_id}/${batch_id}/${point.window_index}`);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div 
          className="glass-panel"
          style={{
            padding: '12px',
            background: 'var(--glass-primary)',
            backdropFilter: 'blur(12px)',
            borderRadius: '8px',
            border: '1px solid var(--border-light)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <Title level={5} style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
            Window #{label}
          </Title>
          <Space direction="vertical" size="small">
            <div>
              <Text strong style={{ fontSize: '12px' }}>Status: </Text>
              <Tag color={statusToColor(data.status)} style={{ fontSize: '11px' }}>
                {data.status}
              </Tag>
            </div>
            <div>
              <Text style={{ fontSize: '12px' }}>
                Anomalies: <Text strong>{data.anomaly_count}</Text>
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              Click to view details
            </Text>
          </Space>
        </div>
      );
    }
    return null;
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Header with Legend */}
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <Title level={5} style={{ margin: 0, color: 'var(--text-primary)' }}>
              Anomaly Timeline
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {timeline.length} windows • Click points to navigate
            </Text>
          </div>
          
          {pending && (
            <Tag color="processing" style={{ fontSize: '11px' }}>
              <Spin size="small" style={{ marginRight: '4px' }} />
              Updating...
            </Tag>
          )}
        </div>

        {/* Status Legend */}
        <Space size="middle" wrap>
          {Object.entries(statusConfig).map(([status, config]) => 
            config.count > 0 && (
              <div key={status} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                padding: '4px 8px',
                background: 'var(--glass-secondary)',
                borderRadius: '4px',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: config.color
                }} />
                <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {status} ({config.count})
                </Text>
              </div>
            )
          )}
        </Space>
      </div>

      {/* Chart */}
      <div 
        className="glass-panel"
        style={{
          padding: '20px',
          background: 'var(--glass-primary)',
          borderRadius: '12px',
          border: '1px solid var(--border-light)'
        }}
      >
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border-light)" 
              opacity={0.5}
            />
            <XAxis 
              dataKey="window_index" 
              label={{ 
                value: "Window Index", 
                position: "insideBottom", 
                offset: -10,
                style: { textAnchor: 'middle', fill: 'var(--text-secondary)', fontSize: '12px' }
              }}
              tick={{ fill: 'var(--text-secondary)', fontSize: '11px' }}
              stroke="var(--border-medium)"
            />
            <YAxis 
              dataKey="anomaly_count" 
              label={{ 
                value: "Anomaly Count", 
                angle: -90, 
                position: "insideLeft",
                style: { textAnchor: 'middle', fill: 'var(--text-secondary)', fontSize: '12px' }
              }}
              tick={{ fill: 'var(--text-secondary)', fontSize: '11px' }}
              stroke="var(--border-medium)"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="anomaly_count"
              stroke="var(--accent-primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, stroke: 'var(--accent-primary)', strokeWidth: 2, fill: 'white' }}
            />
            <Scatter
              data={data}
              shape={(props) => {
                const { cx, cy, payload } = props;
                if (!payload) return null;
                
                return (
                  <circle
                    key={`scatter-${payload.window_index}`}
                    cx={cx}
                    cy={cy}
                    r={hoveredPoint === payload.window_index ? 8 : 6}
                    fill={payload.color}
                    stroke="white"
                    strokeWidth={2}
                    style={{ 
                      cursor: "pointer",
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleDotClick(payload)}
                    onMouseEnter={() => setHoveredPoint(payload.window_index)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Help text */}
      <div style={{ 
        textAlign: 'center',
        padding: '8px 12px',
        background: 'var(--glass-secondary)',
        borderRadius: '6px',
        border: '1px solid var(--border-light)'
      }}>
        <Space align="center">
          <InfoCircleOutlined style={{ color: 'var(--accent-primary)', fontSize: '12px' }} />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Click on any point to view detailed window analysis
          </Text>
        </Space>
      </div>
    </Space>
  );
}
