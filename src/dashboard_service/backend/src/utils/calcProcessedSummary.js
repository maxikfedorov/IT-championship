// backend/src/utils/calcProcessedSummary.js
export const calcProcessedSummary = (completeData) => {
  if (!completeData?.autoencoder?.results) return null;

  const windows = completeData.autoencoder.results;
  const totalWindows = windows.length;

  let anomalyWindows = 0;
  let totalError = 0;

  const components = ["bearing", "rotor", "stator", "eccentricity"];
  const compStats = {
    bearing: { confidenceSum: 0, anomalies: 0 },
    rotor: { confidenceSum: 0, anomalies: 0 },
    stator: { confidenceSum: 0, anomalies: 0 },
    eccentricity: { confidenceSum: 0, anomalies: 0 }
  };

  for (const w of windows) {
    if (w.overall.anomaly_count > 0) anomalyWindows++;
    totalError += w.overall.overall_reconstruction_error;

    for (const c of components) {
      const conf = w[c]?.confidence_score || 0;
      compStats[c].confidenceSum += conf;
      if (w[c]?.is_anomaly) compStats[c].anomalies++;
    }
  }

  const avgReconstructionError = totalError / totalWindows;

  const componentHealth = {};
  for (const c of components) {
    componentHealth[c] = {
      avg_confidence: (compStats[c].confidenceSum / totalWindows).toFixed(3),
      anomalies: compStats[c].anomalies
    };
  }

  return {
    total_windows: totalWindows,
    anomaly_windows: anomalyWindows,
    avg_reconstruction_error: parseFloat(avgReconstructionError.toFixed(3)),
    component_health: componentHealth
  };
};
