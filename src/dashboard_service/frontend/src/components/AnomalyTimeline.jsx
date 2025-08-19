// frontend/src/components/AnomalyTimeline.jsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter
} from "recharts";

export default function AnomalyTimeline({ timeline }) {
  if (!timeline) return <div>No anomaly timeline</div>;

  // преобразуем статус в цвет
  const statusToColor = (status) => {
    switch (status) {
      case "Critical":
        return "red";
      case "Monitor":
        return "orange";
      case "Healthy":
        return "green";
      default:
        return "gray";
    }
  };

  const data = timeline.map((t) => ({
    ...t,
    color: statusToColor(t.system_health_status)
  }));

  return (
    <div>
      <h4>Anomaly Timeline</h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="window_index" label={{ value: "Window", position: "bottom" }} />
          <YAxis dataKey="anomaly_count" label={{ value: "Anomalies", angle: -90, position: "insideLeft" }} />
          <Tooltip
            // eslint-disable-next-line no-unused-vars
            formatter={(val, key, obj) => {
              if (key === "anomaly_count") {
                return [`${val}`, "Anomalies"];
              }
              return val;
            }}
            labelFormatter={(idx) => `Window ${idx}`}
          />
          <Line
            type="monotone"
            dataKey="anomaly_count"
            stroke="#8884d8"
            dot={{ stroke: "black", strokeWidth: 1, r: 5, fill: "white" }}
          />
          <Scatter
            data={data}
            shape={(props) => (
              <circle cx={props.cx} cy={props.cy} r={5} fill={props.payload.color} />
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
