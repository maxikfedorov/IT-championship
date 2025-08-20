// src/dashboard_service/frontend/src/components/AttentionHeatmap.jsx

import { useState, useMemo } from "react";
import Plot from "react-plotly.js";
import { 
  Typography, 
  Space, 
  Spin, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Tooltip,
  Tag,
  Empty
} from "antd";
import { 
  HeatMapOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  BarChartOutlined
} from "@ant-design/icons";
import { useSchema } from "../api/schemaContext";

const { Title, Text } = Typography;

export default function AttentionHeatmap({ attention }) {
  const schema = useSchema();
  const [hoveredCell, setHoveredCell] = useState(null);

  // Статистика внимания
  const attentionStats = useMemo(() => {
    if (!attention) return null;
    
    const components = Object.keys(attention);
    const allWeights = components.flatMap(comp => attention[comp]);
    
    return {
      totalComponents: components.length,
      totalWeights: allWeights.length,
      maxWeight: Math.max(...allWeights),
      minWeight: Math.min(...allWeights),
      avgWeight: allWeights.reduce((sum, w) => sum + w, 0) / allWeights.length,
      highAttentionCount: allWeights.filter(w => w > 0.1).length
    };
  }, [attention]);

  if (!attention || !schema) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Space direction="vertical" size="large">
          <Spin size="large" />
          <div>
            <Title level={4} style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Loading Attention Data...
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Processing attention weights & schema
            </Text>
          </div>
        </Space>
      </div>
    );
  }

  if (Object.keys(attention).length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Empty 
          description={
            <Text type="secondary">No attention weights available</Text>
          }
        />
      </div>
    );
  }

  const components = Object.keys(attention);
  const zData = components.map((comp) => attention[comp]);
  
  const commonFeatures = schema.categorized_schema?.categories?.common?.features || [];
  const featureNames = commonFeatures.slice(0, zData[0]?.length || 0);

  const formatComponentName = (name) => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatFeatureName = (name) => {
    return name.length > 15 ? name.slice(0, 12) + '...' : name;
  };

  // Кастомная цветовая схема в стиле приложения
  const customColorScale = [
    [0, 'rgba(248, 250, 252, 0.1)'],      // Очень светлый
    [0.1, 'rgba(99, 102, 241, 0.1)'],     // Легкий primary
    [0.3, 'rgba(99, 102, 241, 0.3)'],     // Средний primary  
    [0.5, 'rgba(99, 102, 241, 0.6)'],     // Яркий primary
    [0.7, 'rgba(16, 185, 129, 0.7)'],     // Success
    [0.9, 'rgba(245, 158, 11, 0.8)'],     // Warning
    [1.0, 'rgba(239, 68, 68, 0.9)']       // Danger для максимума
  ];

  const plotData = [{
    z: zData,
    x: featureNames.map(formatFeatureName),
    y: components.map(formatComponentName),
    type: "heatmap",
    colorscale: customColorScale,
    hoverongaps: false,
    hovertemplate: `
      <b>%{y}</b><br>
      Feature: <b>%{x}</b><br>
      Attention: <b>%{z:.4f}</b><br>
      <extra></extra>
    `,
    colorbar: {
      title: {
        text: "Attention<br>Weight",
        font: { 
          color: 'rgba(30, 41, 59, 0.8)',
          size: 12 
        }
      },
      titleside: "right",
      thickness: 15,
      len: 0.8,
      bgcolor: 'rgba(248, 250, 252, 0.8)',
      bordercolor: 'rgba(148, 163, 184, 0.3)',
      borderwidth: 1,
      tickfont: { 
        color: 'rgba(30, 41, 59, 0.7)',
        size: 10 
      }
    }
  }];

  const plotLayout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(248, 250, 252, 0.05)',
    font: { 
      family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      color: 'rgba(30, 41, 59, 0.8)'
    },
    margin: { 
      l: 120, 
      r: 60, 
      b: 120, 
      t: 20,
      pad: 10
    },
    xaxis: {
      title: {
        text: "Features",
        font: { 
          size: 14,
          color: 'rgba(30, 41, 59, 0.8)',
          family: 'Inter, sans-serif'
        }
      },
      tickfont: { 
        size: 10,
        color: 'rgba(100, 116, 139, 0.8)'
      },
      tickangle: -45,
      gridcolor: 'rgba(148, 163, 184, 0.1)',
      linecolor: 'rgba(148, 163, 184, 0.3)',
      tickcolor: 'rgba(148, 163, 184, 0.3)'
    },
    yaxis: {
      title: {
        text: "Components",
        font: { 
          size: 14,
          color: 'rgba(30, 41, 59, 0.8)',
          family: 'Inter, sans-serif'
        }
      },
      tickfont: { 
        size: 11,
        color: 'rgba(100, 116, 139, 0.8)'
      },
      gridcolor: 'rgba(148, 163, 184, 0.1)',
      linecolor: 'rgba(148, 163, 184, 0.3)',
      tickcolor: 'rgba(148, 163, 184, 0.3)'
    },
    hoverlabel: {
      bgcolor: 'rgba(248, 250, 252, 0.95)',
      bordercolor: 'rgba(99, 102, 241, 0.3)',
      font: { 
        color: 'rgba(30, 41, 59, 0.9)',
        size: 11
      }
    }
  };

  const plotConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'],
    modeBarButtonsToAdd: [{
      name: 'Download as SVG',
      icon: {
        width: 857.1,
        height: 1000,
        path: 'm214 629c-16 0-32-6-44-18l-164-164c-24-24-24-64 0-88 24-24 64-24 88 0l120 120 302-302c24-24 64-24 88 0 24 24 24 64 0 88l-346 346c-12 12-28 18-44 18z'
      },
      click: () => {
        // Логика экспорта
      }
    }],
    toImageButtonOptions: {
      format: 'png',
      filename: `attention_heatmap_${Date.now()}`,
      height: 500,
      width: 900,
      scale: 2
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Stats Header */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <div 
            className="glass-panel"
            style={{ 
              padding: '12px', 
              textAlign: 'center',
              background: 'linear-gradient(135deg, var(--accent-primary)10, var(--accent-primary)05)'
            }}
          >
            <Statistic
              title={
                <Space align="center">
                  <HeatMapOutlined style={{ color: 'var(--accent-primary)', fontSize: '12px' }} />
                  <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Components
                  </Text>
                </Space>
              }
              value={attentionStats?.totalComponents || 0}
              valueStyle={{ 
                color: 'var(--accent-primary)', 
                fontSize: '16px',
                fontWeight: 600
              }}
            />
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div 
            className="glass-panel"
            style={{ 
              padding: '12px', 
              textAlign: 'center',
              background: 'linear-gradient(135deg, var(--accent-success)10, var(--accent-success)05)'
            }}
          >
            <Statistic
              title={
                <Space align="center">
                  <BarChartOutlined style={{ color: 'var(--accent-success)', fontSize: '12px' }} />
                  <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Avg Weight
                  </Text>
                </Space>
              }
              value={(attentionStats?.avgWeight || 0).toFixed(4)}
              valueStyle={{ 
                color: 'var(--accent-success)', 
                fontSize: '16px',
                fontWeight: 600
              }}
            />
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div 
            className="glass-panel"
            style={{ 
              padding: '12px', 
              textAlign: 'center',
              background: 'linear-gradient(135deg, var(--accent-warning)10, var(--accent-warning)05)'
            }}
          >
            <Statistic
              title={
                <Space align="center">
                  <EyeOutlined style={{ color: 'var(--accent-warning)', fontSize: '12px' }} />
                  <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Max Weight
                  </Text>
                </Space>
              }
              value={(attentionStats?.maxWeight || 0).toFixed(4)}
              valueStyle={{ 
                color: 'var(--accent-warning)', 
                fontSize: '16px',
                fontWeight: 600
              }}
            />
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div 
            className="glass-panel"
            style={{ 
              padding: '12px', 
              textAlign: 'center',
              background: 'linear-gradient(135deg, var(--accent-danger)10, var(--accent-danger)05)'
            }}
          >
            <Statistic
              title={
                <Space align="center">
                  <InfoCircleOutlined style={{ color: 'var(--accent-danger)', fontSize: '12px' }} />
                  <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    High Focus
                  </Text>
                </Space>
              }
              value={attentionStats?.highAttentionCount || 0}
              suffix={
                <Text style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  / {attentionStats?.totalWeights || 0}
                </Text>
              }
              valueStyle={{ 
                color: 'var(--accent-danger)', 
                fontSize: '16px',
                fontWeight: 600
              }}
            />
          </div>
        </Col>
      </Row>

      {/* Main Heatmap */}
      <div 
        className="glass-panel"
        style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'var(--glass-primary)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-light)',
          overflow: 'hidden'
        }}
      >
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <Title level={5} style={{ 
            margin: 0, 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <HeatMapOutlined style={{ color: 'var(--accent-warning)' }} />
            Feature Attention Weights
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Darker colors indicate higher attention • Hover for details
          </Text>
        </div>

        <div style={{ 
          background: 'rgba(248, 250, 252, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          border: '1px solid var(--border-light)'
        }}>
          <Plot
            data={plotData}
            layout={plotLayout}
            config={plotConfig}
            style={{ width: '100%', minHeight: '400px' }}
            useResizeHandler={true}
          />
        </div>
      </div>

      {/* Legend */}
      <div 
        className="glass-panel"
        style={{
          padding: '16px',
          background: 'var(--glass-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-light)'
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="middle" wrap>
              <Tag color="blue" style={{ fontSize: '10px' }}>
                Low Attention (0.0 - 0.3)
              </Tag>
              <Tag color="cyan" style={{ fontSize: '10px' }}>
                Medium Attention (0.3 - 0.6)
              </Tag>
              <Tag color="orange" style={{ fontSize: '10px' }}>
                High Attention (0.6 - 1.0)
              </Tag>
            </Space>
          </Col>
          <Col>
            <Tooltip title="Attention weights show which features the model focuses on for each component">
              <Space align="center">
                <InfoCircleOutlined style={{ color: 'var(--accent-primary)', fontSize: '12px' }} />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Hover heatmap for details
                </Text>
              </Space>
            </Tooltip>
          </Col>
        </Row>
      </div>
    </Space>
  );
}
