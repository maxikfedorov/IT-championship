// frontend/src/components/LSTMPredictionsChart.jsx
import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { useSchema } from "../api/schemaContext";

export default function LSTMPredictionsChart({ lstm }) {
  const schema = useSchema();
  const [category, setCategory] = useState("common"); // default
  const [normalize, setNormalize] = useState(true);

  if (!lstm || !schema) return <div>No LSTM predictions</div>;

  const { values } = lstm;
  const categories = schema?.categorized_schema?.categories || {};
  const featureList = categories[category]?.features || [];

  const featureMapping = schema.feature_mapping || {};
  const nameToIndex = Object.fromEntries(
    Object.entries(featureMapping).map(([i, name]) => [name, parseInt(i)])
  );

  // готовим данные для графа
  const rawData = values.map((stepValues, stepIdx) => {
    const obj = { step: stepIdx + 1 };
    featureList.forEach((feat) => {
      const idx = nameToIndex[feat];
      if (idx !== undefined) {
        obj[feat] = stepValues[idx];
      }
    });
    return obj;
  });

  // если normalize = true → нормализуем каждую фичу отдельно
  const chartData = rawData.map((row) => ({ ...row })); // клонируем
  if (normalize && featureList.length > 0) {
    featureList.forEach((feat) => {
      const allVals = rawData.map((r) => r[feat]);
      const min = Math.min(...allVals);
      const max = Math.max(...allVals);
      const range = max - min || 1;
      chartData.forEach((r, i) => {
        chartData[i][feat] = (r[feat] - min) / range;
      });
    });
  }

  return (
    <div>
      <h4>LSTM Predictions</h4>

      <label>Select category: </label>
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        {Object.keys(categories).map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>

      <label style={{ marginLeft: "1rem" }}>
        <input
          type="checkbox"
          checked={normalize}
          onChange={(e) => setNormalize(e.target.checked)}
        />{" "}
        Normalize values [0–1]
      </label>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="step" />
          <YAxis domain={[0, normalize ? 1 : "auto"]} />
          <Tooltip />
          <Legend />
          {featureList.map((feat, idx) => (
            <Line
              key={feat}
              type="monotone"
              dataKey={feat}
              stroke={`hsl(${(idx * 60) % 360}, 70%, 50%)`}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
