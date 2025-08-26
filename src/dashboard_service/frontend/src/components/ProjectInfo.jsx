import { useState } from "react";
import { Modal, Typography, Space, Divider, Tag, Row, Col } from "antd";
import { 
    InfoCircleOutlined, 
    MonitorOutlined,
    ApiOutlined, 
    DatabaseOutlined 
} from "@ant-design/icons";
import { PROJECT_INFO } from "../config/projectInfo";

const { Title, Text, Paragraph } = Typography;

// Функция для получения иконки по названию
const getIcon = (iconName, props = {}) => {
    const iconMap = {
        api: <ApiOutlined {...props} />,
        database: <DatabaseOutlined {...props} />,
        monitor: <MonitorOutlined {...props} />
    };
    return iconMap[iconName] || <ApiOutlined {...props} />;
};

export default function ProjectInfo() {
    const [isModalVisible, setIsModalVisible] = useState(false);

    const showModal = () => setIsModalVisible(true);
    const handleClose = () => setIsModalVisible(false);

    return (
        <>
            {/* Красивая кнопка-иконка */}
            <div
                onClick={showModal}
                style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                    e.currentTarget.style.color = 'var(--accent-primary)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                }}
            >
                <InfoCircleOutlined style={{ fontSize: '14px' }} />
                <Text style={{ fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
                    {PROJECT_INFO.version}
                </Text>
            </div>

            {/* Модальное окно с информацией */}
            <Modal
                title={
                    <Space align="center">
                        <ApiOutlined style={{ color: 'var(--accent-primary)' }} />
                        <span>{PROJECT_INFO.name}</span>
                    </Space>
                }
                open={isModalVisible}
                onCancel={handleClose}
                footer={null}
                width={600}
                centered
            >
                <div style={{ padding: '10px 0' }}>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        
                        {/* Основная информация */}
                        <div>
                            <Title level={5} style={{ margin: '0 0 8px 0', color: 'var(--accent-primary)' }}>
                                Описание системы
                            </Title>
                            <Paragraph style={{ margin: 0, color: 'var(--text-primary)' }}>
                                {PROJECT_INFO.description}
                            </Paragraph>
                        </div>

                        <Divider style={{ margin: '16px 0' }} />

                        {/* Технологии */}
                        <div>
                            <Title level={5} style={{ margin: '0 0 12px 0', color: 'var(--accent-primary)' }}>
                                Технологический стек
                            </Title>
                            <Row gutter={[8, 8]}>
                                {PROJECT_INFO.technologies.map((tech, index) => (
                                    <Col key={index}>
                                        <Tag 
                                            color={tech.color} 
                                            icon={tech.icon ? getIcon(tech.icon) : null}
                                        >
                                            {tech.name}
                                        </Tag>
                                    </Col>
                                ))}
                            </Row>
                        </div>

                        <Divider style={{ margin: '16px 0' }} />

                        {/* Архитектура */}
                        <div>
                            <Title level={5} style={{ margin: '0 0 8px 0', color: 'var(--accent-primary)' }}>
                                Архитектура системы
                            </Title>
                            <Row gutter={[16, 12]}>
                                {PROJECT_INFO.services.map((service, index) => (
                                    <Col span={8} key={index}>
                                        <div style={{ 
                                            padding: '12px', 
                                            border: '1px solid var(--border-color)', 
                                            borderRadius: '6px',
                                            textAlign: 'center'
                                        }}>
                                            {getIcon(service.icon, { 
                                                style: { fontSize: '18px', color: service.color } 
                                            })}
                                            <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                                <strong>{service.name}</strong><br />
                                                <Text type="secondary">:{service.port}</Text>
                                            </div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </div>

                        <Divider style={{ margin: '16px 0' }} />

                        {/* Модели ИИ */}
                        <div>
                            <Title level={5} style={{ margin: '0 0 8px 0', color: 'var(--accent-primary)' }}>
                                ИИ-модели
                            </Title>
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                {PROJECT_INFO.aiModels.map((model, index) => (
                                    <div 
                                        key={index}
                                        style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center' 
                                        }}
                                    >
                                        <Text>
                                            <strong>{model.name}</strong> - {model.description}
                                        </Text>
                                        <Tag color={model.status}>{model.statusText}</Tag>
                                    </div>
                                ))}
                            </Space>
                        </div>

                        {/* Версия и дата */}
                        <div style={{ 
                            marginTop: '20px', 
                            padding: '12px', 
                            background: 'var(--bg-secondary)', 
                            borderRadius: '6px',
                            textAlign: 'center'
                        }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                Версия <strong style={{ fontStyle: 'italic' }}>{PROJECT_INFO.version}</strong> • {PROJECT_INFO.footer.event} • {PROJECT_INFO.footer.purpose}
                            </Text>
                        </div>
                    </Space>
                </div>
            </Modal>
        </>
    );
}
