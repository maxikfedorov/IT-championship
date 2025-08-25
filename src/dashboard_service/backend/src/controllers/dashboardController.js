// backend/src/controllers/dashboardController.js
import UserBatchesCache from "../models/UserBatchesCache.js";
import { refreshUserBatchesCache } from "../services/cacheService.js";
import BatchCache from "../models/BatchCache.js";

// ✅ КОНСТАНТЫ И ФУНКЦИИ В НАЧАЛЕ ФАЙЛА
const HEALTH_THRESHOLDS = {
  // Пороги времени работы (в процентах health score) - РАЗУМНЫЕ
  CRITICAL_TIME: 30,     // критично при < 30%
  HOURS_TIME: 50,        // часы при < 50%
  DAYS_TIME: 70,         // дни при < 70%  
  MONTHS_TIME: 85,       // месяцы при < 85%
  // 85%+ = Years

  // Пороги для компонентов - СБАЛАНСИРОВАННЫЕ
  COMPONENT_CRITICAL_CONFIDENCE: 0.3,   // критично при confidence < 30%
  COMPONENT_WARNING_CONFIDENCE: 0.5,    // предупреждение при < 50%
  
  COMPONENT_CRITICAL_ANOMALY_RATE: 0.5,   // критично при 50%+ аномалий
  COMPONENT_WARNING_ANOMALY_RATE: 0.3,    // предупреждение при 30%+ аномалий

  // Минимальное количество критических компонентов - РАЗУМНЫЕ
  MIN_CRITICAL_COMPONENTS_FOR_HOURS: 1,     // 1 критический компонент = часы
  MIN_CRITICAL_COMPONENTS_FOR_CRITICAL: 2   // 2+ критических = критично
};


function calculateRobustAverage(values) {
  if (values.length === 0) return 0;
  if (values.length <= 2) return values.reduce((a, b) => a + b, 0) / values.length;
  
  const sorted = [...values].sort((a, b) => a - b);
  const excludeCount = Math.floor(values.length * 0.1);
  const filtered = sorted.slice(excludeCount, sorted.length - excludeCount);
  
  return filtered.length === 0 
    ? calculateMedian(values)
    : filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

function calculateMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getRiskLevel(confidence, anomalies, totalBatches) {
  const anomalyRate = anomalies / totalBatches;
  if (confidence < HEALTH_THRESHOLDS.COMPONENT_CRITICAL_CONFIDENCE || 
      anomalyRate > HEALTH_THRESHOLDS.COMPONENT_CRITICAL_ANOMALY_RATE) return 'critical';
  if (confidence < HEALTH_THRESHOLDS.COMPONENT_WARNING_CONFIDENCE || 
      anomalyRate > HEALTH_THRESHOLDS.COMPONENT_WARNING_ANOMALY_RATE) return 'warning';
  return 'good';
}

function calculateTimeToFailure(healthPercentage, components, totalBatches) {
  const criticalIssues = ['bearing', 'rotor'].reduce((count, comp) => 
    count + (components[comp]?.risk_level === 'critical' ? 1 : 0), 0);

  if (healthPercentage < HEALTH_THRESHOLDS.CRITICAL_TIME || 
      criticalIssues >= HEALTH_THRESHOLDS.MIN_CRITICAL_COMPONENTS_FOR_CRITICAL) {
    return { period: 'CRITICAL', color: 'var(--accent-danger)', text: 'Immediate attention required' };
  }
  if (healthPercentage < HEALTH_THRESHOLDS.HOURS_TIME || 
      criticalIssues >= HEALTH_THRESHOLDS.MIN_CRITICAL_COMPONENTS_FOR_HOURS) {
    return { period: 'Hours', color: 'var(--accent-danger)', text: 'Monitor closely' };
  }
  if (healthPercentage < HEALTH_THRESHOLDS.DAYS_TIME) {
    return { period: 'Days', color: 'var(--accent-warning)', text: 'Schedule maintenance' };
  }
  if (healthPercentage < HEALTH_THRESHOLDS.MONTHS_TIME) {
    return { period: 'Months', color: 'var(--accent-warning)', text: 'Plan preventive maintenance' };
  }
  return { period: 'Years', color: 'var(--accent-success)', text: 'Excellent condition' };
}

function calculateTrend(recentBatches) {
  const scores = recentBatches
    .filter(b => b.summary?.health_score !== null)
    .map(b => b.summary.health_score)
    .slice(0, 20);
    
  if (scores.length < 6) return { direction: 'stable', text: 'Insufficient data' };
  
  const halfPoint = Math.floor(scores.length / 2);
  const recentAvg = calculateRobustAverage(scores.slice(0, halfPoint));
  const olderAvg = calculateRobustAverage(scores.slice(halfPoint));
  const diff = recentAvg - olderAvg;
  
  if (diff > 0.08) return { direction: 'improving', text: 'Improving', color: 'var(--accent-success)' };
  if (diff < -0.08) return { direction: 'declining', text: 'Declining', color: 'var(--accent-danger)' };
  return { direction: 'stable', text: '→ Stable', color: 'var(--accent-warning)' };
}



export const getDashboard = async (req, res) => {
  const { user_id } = req.params;
  const { count = 10, refresh = "false" } = req.query;

  try {
    let cached = await UserBatchesCache.findOne({ user_id });

    if (!cached || refresh === "true") {
      cached = await refreshUserBatchesCache(user_id, count);
    }

    // если так и не появилось — возвращаем пустой список
if (!cached || !cached.batches_summary) {
  return res.json({
    user_id,
    batches: [],
    cached_at: null
  });
}


    res.json({
      user_id,
      batches: cached.batches_summary || [],
      cached_at: cached.cached_at || null
    });
  } catch (err) {
    console.error("[DASHBOARD] Error", err);
    res.status(500).json({ error: "Dashboard fetch failed" });
  }
};


export const getMotorHealthOverview = async (req, res) => {
  const { user_id } = req.params;
  const { count = 100 } = req.query;

  try {
    let cached = await UserBatchesCache.findOne({ user_id });
    
    if (!cached) {
      cached = await refreshUserBatchesCache(user_id, count);
    }

    const batches = cached?.batches_summary || [];
    
    if (batches.length === 0) {
      return res.json({
        user_id,
        overview: null,
        message: "No batches available for analysis"
      });
    }

    let healthScores = [];
    let totalAnomalies = 0;
    let totalWindows = 0;
    const componentStats = {
      bearing: { confidences: [], anomalies: [] },
      rotor: { confidences: [], anomalies: [] },
      stator: { confidences: [], anomalies: [] },
      eccentricity: { confidences: [], anomalies: [] }
    };

    for (const batch of batches.slice(0, count)) {
      const batchData = await BatchCache.findOne({ batch_id: batch.batch_id });
      if (batchData?.processed_summary) {
        const summary = batchData.processed_summary;
        const batchHealthScore = summary.total_windows > 0 
          ? ((summary.total_windows - summary.anomaly_windows) / summary.total_windows) : 0;
        
        healthScores.push(batchHealthScore);
        totalAnomalies += summary.anomaly_windows || 0;
        totalWindows += summary.total_windows || 0;

        if (summary.component_health) {
          Object.keys(componentStats).forEach(comp => {
            if (summary.component_health[comp]) {
              const compData = summary.component_health[comp];
              componentStats[comp].confidences.push(parseFloat(compData.avg_confidence || 0));
              componentStats[comp].anomalies.push(compData.anomalies || 0);
            }
          });
        }
      }
    }

    if (healthScores.length === 0) {
      return res.json({ user_id, overview: null, message: "No valid batch data for analysis" });
    }

    const avgHealthScore = calculateRobustAverage(healthScores);
    const avgHealthPercentage = Math.round(avgHealthScore * 100);

    const components = {};
    Object.keys(componentStats).forEach(comp => {
      const stats = componentStats[comp];
      if (stats.confidences.length > 0) {
        const robustConfidence = calculateMedian(stats.confidences);
        const robustAnomalies = Math.round(calculateRobustAverage(stats.anomalies));
        components[comp] = {
          avg_confidence: robustConfidence,
          total_anomalies: robustAnomalies,
          risk_level: getRiskLevel(robustConfidence, robustAnomalies, healthScores.length)
        };
      }
    });

    // ✅ ИСПРАВЛЕНО: validBatches → healthScores.length
    const timeToFailure = calculateTimeToFailure(avgHealthPercentage, components, healthScores.length);
    
    const overview = {
      total_batches_analyzed: healthScores.length, // ✅ ИСПРАВЛЕНО
      avg_health_score: avgHealthScore,
      avg_health_percentage: avgHealthPercentage,
      total_anomalies: totalAnomalies,
      total_windows: totalWindows,
      anomaly_rate: totalWindows > 0 ? (totalAnomalies / totalWindows * 100).toFixed(2) : 0,
      components,
      time_to_failure: timeToFailure,
      trend: calculateTrend(batches.slice(0, Math.min(20, healthScores.length))) // ✅ ИСПРАВЛЕНО
    };

    res.json({
      user_id,
      cached_at: cached.cached_at,
      overview
    });

  } catch (err) {
    console.error("[MOTOR HEALTH] Error", err);
    res.status(500).json({ error: "Motor health analysis failed" });
  }
};