// src/dashboard_service/frontend/src/pages/DashboardPage.jsx

import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import {
	Typography,
	Button,
	Select,
	Space,
	Spin,
	Alert,
	Row,
	Col,
	Card,
	Divider,
} from "antd";
import {
	DownloadOutlined,
	FileTextOutlined,
	FilePdfOutlined,
	DashboardOutlined,
} from "@ant-design/icons";
import api from "../api/apiClient";
import BatchList from "../components/BatchList";
import SystemHealthPanel from "../components/SystemHealthPanel";
import ControlPanel from "../components/ControlPanel";
import { useAuthContext } from "../api/AuthContext";
import SystemControlPanel from "../components/SystemControlPanel";
import MotorHealthOverview from "../components/MotorHealthOverview";

const { Title, Text } = Typography;
const { Option } = Select;

export default function DashboardPage() {
	const { user_id } = useParams();
	const { user } = useAuthContext();

	const [batches, setBatches] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [batchCount, setBatchCount] = useState(10);
	const [downloadLoading, setDownloadLoading] = useState(false);

	const fetchBatches = () => {
		api.get(`/dashboard/${user_id}?count=${batchCount}&refresh=true`)
			.then((res) => {
				setBatches(res.data.batches || []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("Dashboard fetch error:", err);
				setError("Failed to load batches");
				setLoading(false);
			});
	};

	const downloadReport = async (format) => {
		setDownloadLoading(true);
		try {
			const res = await api.get(
				`/report/dashboard/${user_id}?format=${format}`,
				{
					responseType: "blob",
				},
			);

			const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
			const link = document.createElement("a");
			link.href = blobUrl;
			link.setAttribute("download", `dashboard_${user_id}.${format}`);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(blobUrl);
		} catch (err) {
			console.error("Report download failed", err);
		} finally {
			setDownloadLoading(false);
		}
	};

	useEffect(() => {
		fetchBatches();
		const interval = setInterval(fetchBatches, 60000);
		return () => clearInterval(interval);
	}, [user_id, batchCount]);

	if (!user || user.username !== user_id) {
		return <Navigate to={`/dashboard/${user?.username || ""}`} replace />;
	}

	if (loading) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					minHeight: "60vh",
				}}
			>
				<Spin size="large" />
			</div>
		);
	}

	if (error) {
		return (
			<Alert
				message="Error"
				description={error}
				type="error"
				showIcon
				style={{ margin: "20px" }}
			/>
		);
	}

	return (
		<div
			style={{
				padding: "24px",
				minHeight: "100vh",
				background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
			}}
		>
			{/* Header Section */}
			<div
				className="glass-panel"
				style={{ padding: "32px", marginBottom: "24px" }}
			>
				<Row justify="space-between" align="middle">
					<Col>
						<Space align="center" size="middle">
							<DashboardOutlined
								style={{
									fontSize: "32px",
									color: "var(--accent-primary)",
								}}
							/>
							<div>
								<Title
									level={2}
									className="text-gradient"
									style={{ margin: 0, fontSize: "28px" }}
								>
									Engineering Dashboard
								</Title>
								<Text
									type="secondary"
									style={{ fontSize: "16px" }}
								>
									{user_id} • AI Motor Monitoring System
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
									background:
										"linear-gradient(135deg, var(--accent-primary), var(--accent-primary-light))",
									border: "none",
									borderRadius: "8px",
								}}
							>
								JSON Report
							</Button>
							<Button
								icon={<FilePdfOutlined />}
								loading={downloadLoading}
								onClick={() => downloadReport("pdf")}
								style={{
									borderColor: "var(--accent-primary)",
									color: "var(--accent-primary)",
									borderRadius: "8px",
								}}
							>
								PDF Report
							</Button>
						</Space>
					</Col>
				</Row>
			</div>

			{/* System Control & Status Section */}
			<Row gutter={[24, 24]} style={{ marginBottom: "24px" }}>
				<Col xs={24} lg={12}>
					<SystemControlPanel user={user} />
				</Col>
				<Col xs={24} lg={12}>
					<MotorHealthOverview user={user} />{" "}
					{/* ✅ ЗАМЕНИТЬ заглушку */}
				</Col>
			</Row>

			{/* Batch Controls */}
			<Card
				className="glass-card"
				style={{ marginBottom: "24px" }}
				bodyStyle={{ padding: "20px" }}
			>
				<Row justify="space-between" align="middle">
					<Col>
						<Title
							level={4}
							style={{ margin: 0, color: "var(--text-primary)" }}
						>
							Recent Batches
						</Title>
						<Text type="secondary">
							{batches.length} batches loaded
						</Text>
					</Col>
					<Col>
						<Space align="center">
							<Text style={{ color: "var(--text-secondary)" }}>
								Show last:
							</Text>
							<Select
								value={batchCount}
								onChange={(value) => setBatchCount(value)}
								style={{ width: 80 }}
								size="middle"
							>
								<Option value={10}>10</Option>
								<Option value={50}>50</Option>
								<Option value={100}>100</Option>
							</Select>
							<Text style={{ color: "var(--text-secondary)" }}>
								batches
							</Text>
						</Space>
					</Col>
				</Row>
			</Card>

			{/* Batch List */}
			{batches.length > 0 ? (
				<BatchList batches={batches} user_id={user_id} />
			) : (
				<Card
					className="glass-card"
					style={{ textAlign: "center", padding: "40px" }}
				>
					<Title level={4} type="secondary">
						No batches found
					</Title>
					<Text type="secondary">
						No batches available for this user. Start the motor to
						generate data.
					</Text>
				</Card>
			)}
		</div>
	);
}
