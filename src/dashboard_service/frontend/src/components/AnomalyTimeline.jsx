// frontend/src/components/AnomalyTimeline.jsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter
} from "recharts";
import { useNavigate, useParams } from "react-router-dom";

export default function AnomalyTimeline({ timeline, pending, onReload }) {
  const navigate = useNavigate();
  const { user_id, batch_id } = useParams();

  // Заглушка при пустых данных
  if (!timeline || timeline.length === 0) {
    return (
      <div style={{ color: "gray" }}>
        ⏳ Загружаются данные для таймлайна...
        {pending && <p>()</p>}
      </div>
    );
  }

  const statusToColor = (status) => {
    switch (status) {
      case "Critical": return "red";
      case "Monitor": return "orange";
      case "Healthy": return "green";
      default: return "gray";
    }
  };

  const data = timeline.map((t, i) => ({
    ...t,
    color: statusToColor(t.system_health_status),
    key: `${t.window_index || i}`
  }));

  const handleDotClick = (point) => {
    if (point && point.window_index != null) {
      navigate(`/details/${user_id}/${batch_id}/${point.window_index}`);
    }
  };

  return (
    <div>
      <h4>Anomaly Timeline</h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="window_index" label={{ value: "Window", position: "bottom" }} />
          <YAxis dataKey="anomaly_count" label={{ value: "Anomalies", angle: -90, position: "insideLeft" }} />
          <Tooltip
            formatter={(val, key) => (key === "anomaly_count" ? [`${val}`, "Anomalies"] : val)}
            labelFormatter={(idx) => `Window ${idx}`}
          />
          <Line
            type="monotone"
            dataKey="anomaly_count"
            stroke="#8884d8"
            dot={(props) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  key={`dot-${payload.window_index}`}
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill="white"
                  stroke="black"
                  strokeWidth={1}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleDotClick(payload)}
                />
              );
            }}
          />
          <Scatter
            data={data}
            shape={(props) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  key={`scatter-${payload.window_index}`}
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={payload.color}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleDotClick(payload)}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      <small>💡 Кликни по точке, чтобы перейти к окну</small>
    </div>
  );
}
