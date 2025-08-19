// frontend/src/components/AttentionHeatmap.jsx
import Plot from "react-plotly.js";
import { useSchema } from "../api/schemaContext";

export default function AttentionHeatmap({ attention }) {
  const schema = useSchema();
  if (!attention || !schema) return <div>Loading attention & schema...</div>;

  const components = Object.keys(attention);
  const zData = components.map((comp) => attention[comp]);

  // total features в схеме
  // eslint-disable-next-line no-unused-vars
  const featureMapping = schema.feature_mapping || {};
  // внимание: attention размеры обычно = только для common признаков (17 штук!), а не всех 119
  const commonFeatures = schema.categorized_schema?.categories?.common?.features || [];
  const featureNames = commonFeatures.slice(0, zData[0].length);

  return (
    <div>
      <h4>Attention Heatmap</h4>
      <Plot
        data={[
          {
            z: zData,
            x: featureNames,     // ✅ реальные имена признаков (common)
            y: components,
            type: "heatmap",
            colorscale: "Viridis",
            hoverongaps: false,
            hovertemplate: "Feature: %{x}<br>Component: %{y}<br>Weight: %{z:.3f}<extra></extra>"
          }
        ]}
        layout={{
          width: 800,
          height: 350,
          margin: { l: 100, r: 20, b: 100, t: 30 },
          xaxis: {
            title: "Features",
            tickfont: { size: 9 },
            tickangle: -45
          },
          yaxis: { title: "Components" }
        }}
        config={{ responsive: true }}
      />
    </div>
  );
}
