import PDFDocument from "pdfkit";
import { PDFDesigner, PDF_THEME } from './pdfTheme.js';

const formatDate = (d) => (d ? new Date(d).toLocaleString("ru-RU") : "N/A");
const formatNum = (n, digits = 3) =>
  n !== null && n !== undefined ? Number(n).toFixed(digits) : "—";

export function buildPDFReport(res, type, data) {
  const doc = new PDFDocument({ margin: 40 });
  const designer = new PDFDesigner(doc, PDF_THEME);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${type}_${Date.now()}.pdf`
  );

  // подключаем PDF в response
  doc.pipe(res);

  // ловим ошибки потока — чтобы процесс не падал
  doc.on("error", (err) => {
    console.error("PDF build error:", err);
    if (!res.writableEnded) {
      res.end();
    }
  });

  // 🚀 рендер отчета
  try {
    designer.resetStyles();

    switch (type) {
      case "dashboard_report":
        buildDashboardReport(designer, data);
        break;
      case "batch_report":
        buildBatchReport(designer, data);
        break;
      case "window_report":
        buildWindowReport(designer, data);
        break;
    }

    doc.end(); // ✅ закрываем поток единожды
  } catch (err) {
    console.error("Error during PDF generation:", err);
    if (!res.writableEnded) {
      res.end("Ошибка при построении PDF");
    }
  }
}

// ---------- Dashboard
function buildDashboardReport(designer, data) {
  designer.renderHeader(
    "Engineering Dashboard Report",
    `AI Motor Monitoring System`,
    {
      User: data.user_id,
      Generated: formatDate(Date.now()),
      Batches: data.batches.length,
    }
  );

  const stats = [
    {
      label: "Total Batches",
      value: data.batches.length,
      color: PDF_THEME.colors.primary,
    },
    {
      label: "Healthy",
      value: data.batches.filter((b) => b.health_status === "Healthy").length,
      color: PDF_THEME.colors.success,
    },
    {
      label: "Critical",
      value: data.batches.filter((b) => b.health_status === "Critical").length,
      color: PDF_THEME.colors.danger,
    },
    {
      label: "Anomalies",
      value: data.batches.reduce(
        (sum, b) => sum + (b.anomaly_count || 0),
        0
      ),
      color: PDF_THEME.colors.warning,
    },
  ];

  designer.renderStatsCards(stats);
  designer.checkPageBreak(200);

  const columns = [
    {
      key: "batch_id",
      header: "Batch ID",
      formatter: (id) => {
        const clean = id.replace("batch_", "");
        if (clean.length <= 12) return clean;
        return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
      },
    },
    { key: "timestamp", header: "Time", formatter: formatDate },
    {
      key: "health_status",
      header: "Health",
      colorCondition: (status) => {
        switch (status) {
          case "Healthy":
            return PDF_THEME.colors.success;
          case "Critical":
            return PDF_THEME.colors.danger;
          default:
            return PDF_THEME.colors.warning;
        }
      },
    },
    { key: "anomaly_count", header: "Anomalies", align: "center" },
    {
      key: "health_score",
      header: "Score",
      formatter: (score) =>
        score ? `${(score * 100).toFixed(1)}%` : "—",
      align: "right",
    },
  ];

  designer.renderTable(data.batches, columns, "Batch Analysis Summary");
}

// ---------- Batch
function buildBatchReport(designer, data) {
  designer.renderHeader(
    "Batch Analysis Report",
    `${data.batch_id.replace("batch_", "Batch #")}`,
    {
      User: data.user_id,
      Generated: formatDate(Date.now()),
      Windows: data.processed_summary?.total_windows || 0,
    }
  );

  const ps = data.processed_summary;
  if (ps) {
    const stats = [
      {
        label: "Total Windows",
        value: ps.total_windows,
        color: PDF_THEME.colors.primary,
      },
      {
        label: "Anomalous",
        value: ps.anomaly_windows,
        color: PDF_THEME.colors.danger,
        subtitle: `${(
          (ps.anomaly_windows / ps.total_windows) *
          100
        ).toFixed(1)}%`,
      },
      {
        label: "Avg Error",
        value: formatNum(ps.avg_reconstruction_error, 3),
        color: PDF_THEME.colors.warning,
      },
      {
        label: "Components",
        value: Object.keys(ps.component_health || {}).length,
        color: PDF_THEME.colors.success,
      },
    ];

    designer.renderStatsCards(stats);
    designer.checkPageBreak(200);
    designer.renderDivider("Component Health Analysis");

    // ✅ фильтр только базовых признаков двигателя
    const allowed = ["bearing", "rotor", "stator", "eccentricity"];
    const compData = Object.entries(ps.component_health || {})
      .filter(([comp]) =>
        allowed.some((a) => comp.toLowerCase().includes(a))
      )
      .map(([comp, stats]) => ({
        component: comp
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        confidence: (stats.avg_confidence * 100).toFixed(1) + "%",
        anomalies: stats.anomalies,
        status: stats.anomalies > 0 ? "Critical" : "Healthy",
      }));

    const compColumns = [
      { key: "component", header: "Component" },
      { key: "confidence", header: "Confidence", align: "center" },
      { key: "anomalies", header: "Anomalies", align: "center" },
      {
        key: "status",
        header: "Status",
        colorCondition: (s) =>
          s === "Healthy"
            ? PDF_THEME.colors.success
            : PDF_THEME.colors.danger,
      },
    ];

    designer.renderTable(compData, compColumns);
  }
}

// ---------- Window
function buildWindowReport(designer, data) {
  designer.renderHeader(
    "Window Analysis Report",
    `${data.batch_id.replace("batch_", "Batch #")} • Window #${data.window_id}`,
    {
      Generated: formatDate(Date.now()),
      Status: data.autoencoder?.overall?.system_health_status || "Unknown",
    }
  );

  if (data.autoencoder) {
    const overall = data.autoencoder.overall;
    const components = data.autoencoder.components;

    // ✅ фильтр только основных признаков двигателя
    const allowed = ["bearing", "rotor", "stator", "eccentricity"];
    const filteredComponents = Object.entries(components || {})
      .filter(([comp]) =>
        allowed.some((a) => comp.toLowerCase().includes(a))
      );

    // ---- карточки наверху (считаем отфильтрованное количество)
    const stats = [
      {
        label: "System Status",
        value: overall?.system_health_status || "Unknown",
        color:
          overall?.system_health_status === "Healthy"
            ? PDF_THEME.colors.success
            : PDF_THEME.colors.danger,
      },
      {
        label: "Total Anomalies",
        value: overall?.anomaly_count || 0,
        color: PDF_THEME.colors.warning,
      },
      {
        label: "Components",
        value: filteredComponents.length, // ✅ теперь только реальные признаки
        color: PDF_THEME.colors.primary,
      },
    ];

    designer.renderStatsCards(stats);
    designer.checkPageBreak(250);
    designer.renderDivider("Component Analysis");

    // ---- таблица: те же отфильтрованные компоненты
    const compData = filteredComponents.map(([comp, stats]) => ({
      component: comp
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      error: formatNum(stats.reconstruction_error, 4),
      confidence: (stats.confidence_score * 100).toFixed(1) + "%",
      anomaly: stats.is_anomaly ? "Yes" : "No",
      severity: stats.anomaly_severity
        ? formatNum(stats.anomaly_severity, 2)
        : "—",
    }));

    const compColumns = [
      { key: "component", header: "Component" },
      { key: "error", header: "Recon. Error", align: "center" },
      { key: "confidence", header: "Confidence", align: "center" },
      {
        key: "anomaly",
        header: "Anomaly",
        align: "center",
        colorCondition: (val) =>
          val === "Yes"
            ? PDF_THEME.colors.danger
            : PDF_THEME.colors.success,
      },
      { key: "severity", header: "Severity", align: "center" },
    ];

    designer.renderTable(compData, compColumns);

    // ---- Доп. блоки
    if (data.attention || data.lstm) {
      designer.renderDivider("Additional Analysis");

      if (data.attention) {
        designer.resetStyles()
          .doc.fillColor(PDF_THEME.colors.success)
          .fontSize(11)
          .text(
            `✓ Attention weights available (${Object.keys(data.attention).length} components)`,
            60,
            designer.currentY
          );
        designer.currentY += 22;
      }

      if (data.lstm) {
        designer.resetStyles()
          .doc.fillColor(PDF_THEME.colors.success)
          .fontSize(11)
          .text(`✓ LSTM predictions available`, 60, designer.currentY);
        designer.currentY += 22;
      }
    }
  }
}
