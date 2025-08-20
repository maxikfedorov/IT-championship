// src/dashboard_service/frontend/src/components/LSTMPredictionsChart.jsx

import { useState, useMemo } from "react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import {
	Typography,
	Space,
	Card,
	Select,
	Switch,
	Row,
	Col,
	Statistic,
	Tag,
	Empty,
	Tooltip as AntTooltip,
} from "antd";
import {
	LineChartOutlined,
	BarChartOutlined,
	InfoCircleOutlined,
	SettingOutlined,
	RiseOutlined,
	EyeOutlined,
} from "@ant-design/icons";
import { useSchema } from "../api/schemaContext";

const { Title, Text } = Typography;
const { Option } = Select;

export default function LSTMPredictionsChart({ lstm }) {
	const schema = useSchema();
	const [category, setCategory] = useState("common");
	const [normalize, setNormalize] = useState(true);
	const [selectedFeatures, setSelectedFeatures] = useState(new Set());

	// Мемоизированная обработка данных
	const processedData = useMemo(() => {
		if (!lstm || !schema) return null;

		const { values } = lstm;
		const categories = schema?.categorized_schema?.categories || {};
		const featureList = categories[category]?.features || [];
		const featureMapping = schema.feature_mapping || {};

		const nameToIndex = Object.fromEntries(
			Object.entries(featureMapping).map(([i, name]) => [
				name,
				parseInt(i),
			]),
		);

		// Подготавливаем сырые данные
		const rawData = values.map((stepValues, stepIdx) => {
			const obj = { step: stepIdx + 1 };
			featureList.forEach((feat) => {
				const idx = nameToIndex[feat];
				if (idx !== undefined && stepValues[idx] !== undefined) {
					obj[feat] = stepValues[idx];
				}
			});
			return obj;
		});

		// Нормализация
		const chartData = rawData.map((row) => ({ ...row }));
		if (normalize && featureList.length > 0) {
			featureList.forEach((feat) => {
				const allVals = rawData
					.map((r) => r[feat])
					.filter((v) => v !== undefined);
				if (allVals.length > 0) {
					const min = Math.min(...allVals);
					const max = Math.max(...allVals);
					const range = max - min || 1;
					chartData.forEach((r, i) => {
						if (r[feat] !== undefined) {
							// сохраняем и нормализованное, и raw
							r[`__raw_${feat}`] = r[feat];
							r[feat] = (r[feat] - min) / range;
						}
					});
				}
			});
		}

		return {
			chartData,
			rawData,
			featureList,
			categories: Object.keys(categories),
			stats: {
				steps: values.length,
				features: featureList.length,
				totalDataPoints: values.length * featureList.length,
			},
		};
	}, [lstm, schema, category, normalize]);

	if (!lstm || !schema) {
		return (
			<div style={{ textAlign: "center", padding: "40px" }}>
				<Empty
					description={
						<Text type="secondary">
							No LSTM predictions available
						</Text>
					}
				/>
			</div>
		);
	}

	if (!processedData || processedData.featureList.length === 0) {
		return (
			<div style={{ textAlign: "center", padding: "40px" }}>
				<Empty
					description={
						<Space direction="vertical">
							<Text type="secondary">
								No features found for category "{category}"
							</Text>
							<Text type="secondary" style={{ fontSize: "11px" }}>
								Try selecting a different category
							</Text>
						</Space>
					}
				/>
			</div>
		);
	}

	// Генерируем красивые цвета для линий в стиле приложения
	const generateColor = (index, total) => {
		const colors = [
			"var(--accent-primary)",
			"var(--accent-success)",
			"var(--accent-warning)",
			"var(--accent-danger)",
			"#8b5cf6", // purple
			"#06b6d4", // cyan
			"#84cc16", // lime
			"#f97316", // orange
			"#ec4899", // pink
			"#10b981", // emerald
		];

		if (index < colors.length) {
			return colors[index];
		}

		// Для большого количества фич генерируем цвета
		const hue = (index * 137.508) % 360; // golden angle
		return `hsl(${hue}, 70%, 55%)`;
	};

	// Кастомный Tooltip
	const CustomTooltip = ({ active, payload, label }) => {
		if (active && payload && payload.length) {
			return (
				<div
					className="glass-panel"
					style={{ padding: "12px", borderRadius: "8px" }}
				>
					<Title
						level={5}
						style={{ margin: "0 0 8px 0", fontSize: "13px" }}
					>
						Step {label}
					</Title>
					{payload.map((entry, index) => {
						const rawVal = entry.payload[`__raw_${entry.dataKey}`];
						return (
							<div key={index} style={{ marginBottom: "4px" }}>
								<Text style={{ fontSize: "11px" }}>
									<span
										style={{
											color: entry.color,
											fontWeight: 600,
											marginRight: "6px",
										}}
									>
										●
									</span>
									{entry.dataKey}:
									<Text
										strong
										style={{
											marginLeft: "4px",
											color: entry.color,
										}}
									>
										{rawVal !== undefined
											? Number(rawVal).toFixed(4) // показываем абсолютные
											: Number(entry.value).toFixed(4)}
									</Text>
								</Text>
							</div>
						);
					})}
				</div>
			);
		}
		return null;
	};

	return (
		<Space direction="vertical" size="large" style={{ width: "100%" }}>
			{/* Controls Header */}
			<Card className="glass-card" bodyStyle={{ padding: "16px" }}>
				<Row justify="space-between" align="middle" gutter={[16, 16]}>
					<Col xs={24} sm={12} md={8}>
						<Space
							direction="vertical"
							size="small"
							style={{ width: "100%" }}
						>
							<Text
								strong
								style={{
									fontSize: "12px",
									color: "var(--text-secondary)",
								}}
							>
								Feature Category
							</Text>
							<Select
								value={category}
								onChange={setCategory}
								style={{ width: "100%" }}
								size="middle"
							>
								{processedData.categories.map((cat) => (
									<Option key={cat} value={cat}>
										<Space align="center">
											<SettingOutlined
												style={{ fontSize: "12px" }}
											/>
											{cat.charAt(0).toUpperCase() +
												cat.slice(1)}
										</Space>
									</Option>
								))}
							</Select>
						</Space>
					</Col>

					<Col xs={24} sm={12} md={8}>
						<Space
							direction="vertical"
							size="small"
							style={{ width: "100%" }}
						>
							<Text
								strong
								style={{
									fontSize: "12px",
									color: "var(--text-secondary)",
								}}
							>
								Value Normalization
							</Text>
							<div
								className="glass-panel"
								style={{
									padding: "8px 12px",
									borderRadius: "6px",
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<Space align="center">
									<EyeOutlined
										style={{
											fontSize: "12px",
											color: normalize
												? "var(--accent-primary)"
												: "var(--text-muted)",
										}}
									/>
									<Text style={{ fontSize: "12px" }}>
										Normalize [0-1]
									</Text>
								</Space>
								<Switch
									checked={normalize}
									onChange={setNormalize}
									size="small"
								/>
							</div>
						</Space>
					</Col>

					<Col xs={24} md={8}>
						<Row gutter={[8, 8]}>
							<Col span={8}>
								<div
									className="glass-panel"
									style={{
										padding: "8px",
										textAlign: "center",
										borderRadius: "6px",
									}}
								>
									<Text
										style={{
											fontSize: "10px",
											color: "var(--text-secondary)",
										}}
									>
										Steps
									</Text>
									<div
										style={{
											color: "var(--accent-primary)",
											fontWeight: 600,
											fontSize: "14px",
										}}
									>
										{processedData.stats.steps}
									</div>
								</div>
							</Col>
							<Col span={8}>
								<div
									className="glass-panel"
									style={{
										padding: "8px",
										textAlign: "center",
										borderRadius: "6px",
									}}
								>
									<Text
										style={{
											fontSize: "10px",
											color: "var(--text-secondary)",
										}}
									>
										Features
									</Text>
									<div
										style={{
											color: "var(--accent-success)",
											fontWeight: 600,
											fontSize: "14px",
										}}
									>
										{processedData.stats.features}
									</div>
								</div>
							</Col>
							<Col span={8}>
								<div
									className="glass-panel"
									style={{
										padding: "8px",
										textAlign: "center",
										borderRadius: "6px",
									}}
								>
									<Text
										style={{
											fontSize: "10px",
											color: "var(--text-secondary)",
										}}
									>
										Points
									</Text>
									<div
										style={{
											color: "var(--accent-warning)",
											fontWeight: 600,
											fontSize: "14px",
										}}
									>
										{processedData.stats.totalDataPoints}
									</div>
								</div>
							</Col>
						</Row>
					</Col>
				</Row>
			</Card>

			{/* Main Chart */}
			<div
				className="glass-panel"
				style={{
					padding: "24px",
					borderRadius: "16px",
					background: "var(--glass-primary)",
					backdropFilter: "blur(16px)",
					border: "1px solid var(--border-light)",
					overflow: "hidden",
				}}
			>
				<div style={{ marginBottom: "20px", textAlign: "center" }}>
					<Title
						level={5}
						style={{
							margin: 0,
							color: "var(--text-primary)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
						}}
					>
						<RiseOutlined
							style={{ color: "var(--accent-primary)" }}
						/>{" "}
						{/* ← вместо TrendingUpOutlined */}
						LSTM Time Series Predictions
					</Title>
					<Space size="middle" style={{ marginTop: "8px" }}>
						<Tag color="blue" style={{ fontSize: "10px" }}>
							Category: {category}
						</Tag>
						<Tag
							color={normalize ? "green" : "orange"}
							style={{ fontSize: "10px" }}
						>
							{normalize ? "Normalized" : "Raw Values"}
						</Tag>
						<Tag color="purple" style={{ fontSize: "10px" }}>
							{processedData.featureList.length} Features
						</Tag>
					</Space>
				</div>

				<div
					style={{
						background: "rgba(248, 250, 252, 0.3)",
						borderRadius: "12px",
						padding: "16px",
						border: "1px solid var(--border-light)",
					}}
				>
					<ResponsiveContainer width="100%" height={450}>
						<LineChart
							data={processedData.chartData}
							margin={{
								top: 20,
								right: 30,
								left: 20,
								bottom: 20,
							}}
						>
							<CartesianGrid
								strokeDasharray="3 3"
								stroke="var(--border-light)"
								opacity={0.6}
							/>
							<XAxis
								dataKey="step"
								tick={{
									fill: "var(--text-secondary)",
									fontSize: 11,
								}}
								axisLine={{ stroke: "var(--border-medium)" }}
								tickLine={{ stroke: "var(--border-medium)" }}
								label={{
									value: "Time Steps",
									position: "insideBottom",
									offset: -10,
									style: {
										textAnchor: "middle",
										fill: "var(--text-secondary)",
										fontSize: "12px",
									},
								}}
							/>
							<YAxis
								domain={normalize ? [0, 1] : ["auto", "auto"]}
								tick={{
									fill: "var(--text-secondary)",
									fontSize: 11,
								}}
								axisLine={{ stroke: "var(--border-medium)" }}
								tickLine={{ stroke: "var(--border-medium)" }}
								label={{
									value: normalize
										? "Normalized Values"
										: "Feature Values",
									angle: -90,
									position: "insideLeft",
									style: {
										textAnchor: "middle",
										fill: "var(--text-secondary)",
										fontSize: "12px",
									},
								}}
							/>
							<Tooltip content={<CustomTooltip />} />
							<Legend
								wrapperStyle={{
									paddingTop: "20px",
									fontSize: "11px",
									color: "var(--text-secondary)",
								}}
								iconType="line"
							/>
							{processedData.featureList
								.slice(0, 10)
								.map((feat, idx) => (
									<Line
										key={feat}
										type="monotone"
										dataKey={feat}
										stroke={generateColor(
											idx,
											processedData.featureList.length,
										)}
										strokeWidth={2}
										dot={false}
										activeDot={{
											r: 4,
											stroke: generateColor(
												idx,
												processedData.featureList
													.length,
											),
											strokeWidth: 2,
											fill: "white",
										}}
										connectNulls={false}
									/>
								))}
						</LineChart>
					</ResponsiveContainer>
				</div>

				{processedData.featureList.length > 10 && (
					<div
						style={{
							marginTop: "16px",
							textAlign: "center",
							padding: "12px",
							background: "var(--glass-secondary)",
							borderRadius: "8px",
							border: "1px solid var(--border-light)",
						}}
					>
						<Space align="center">
							<InfoCircleOutlined
								style={{
									color: "var(--accent-warning)",
									fontSize: "12px",
								}}
							/>
							<Text type="secondary" style={{ fontSize: "11px" }}>
								Showing first 10 features of{" "}
								{processedData.featureList.length} total
								features
							</Text>
						</Space>
					</div>
				)}
			</div>

			{/* Feature List */}
			<Card
				className="glass-card"
				title={
					<Space align="center">
						<BarChartOutlined
							style={{ color: "var(--accent-success)" }}
						/>
						<span>Available Features</span>
					</Space>
				}
				bodyStyle={{ padding: "16px" }}
			>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "6px",
						maxHeight: "100px",
						overflowY: "auto",
					}}
				>
					{processedData.featureList.map((feat, idx) => (
						<AntTooltip key={feat} title={`Feature: ${feat}`}>
							<Tag
								style={{
									fontSize: "10px",
									color:
										idx < 10
											? generateColor(
													idx,
													processedData.featureList
														.length,
											  )
											: "var(--text-muted)",
									borderColor:
										idx < 10
											? generateColor(
													idx,
													processedData.featureList
														.length,
											  )
											: "var(--border-light)",
									cursor: "default",
								}}
							>
								{idx < 10 ? "●" : "○"}{" "}
								{feat.length > 20
									? feat.slice(0, 17) + "..."
									: feat}
							</Tag>
						</AntTooltip>
					))}
				</div>
			</Card>
		</Space>
	);
}
