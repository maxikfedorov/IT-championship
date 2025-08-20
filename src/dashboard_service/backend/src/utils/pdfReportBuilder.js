// backend/src/utils/pdfReportBuilder.js
import PDFDocument from "pdfkit";

// утилиты для красоты
const formatDate = (d) => (d ? new Date(d).toLocaleString("ru-RU") : "N/A");
const formatNum = (n, digits = 3) =>
  n !== null && n !== undefined ? Number(n).toFixed(digits) : "—";

export function buildPDFReport(res, type, data) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${type}_${Date.now()}.pdf`
  );
  doc.pipe(res);

  doc.fontSize(20).text(`${type.toUpperCase()} REPORT`, { align: "center" });
  doc.fontSize(10).text(`Generated at: ${formatDate(Date.now())}`, { align: "right" });
  doc.moveDown(2);

  switch (type) {
    /** DASHBOARD REPORT **/
    case "dashboard_report":
      doc.fontSize(14).text(`User: ${data.user_id}`);
      doc.text(`Cached at: ${formatDate(data.cached_at)}`);
      doc.moveDown();
      doc.fontSize(12).text("Batches Summary:");
      data.batches.forEach((b) => {
        doc.text(
          `${b.batch_id} | Time: ${formatDate(b.timestamp)} | Health: ${b.health_status} | Anomalies: ${b.anomaly_count} | Score: ${b.health_score ?? "—"}`
        );
      });
      break;

    /** BATCH REPORT **/
    case "batch_report":
      doc.fontSize(14).text(`Batch: ${data.batch_id}`);
      doc.text(`User: ${data.user_id}`);
      doc.text(`Cached at: ${formatDate(data.cached_at)}`);
      doc.moveDown();

      const ps = data.processed_summary;
      doc.fontSize(12).text(
        `Windows: ${ps.total_windows}, Anomalous: ${ps.anomaly_windows}, AvgErr: ${formatNum(
          ps.avg_reconstruction_error
        )}`
      );
      doc.moveDown();

      // Component health table
      doc.text("Component Health:");
      Object.entries(ps.component_health).forEach(([comp, stats]) => {
        doc.text(
          `- ${comp}: Confidence=${stats.avg_confidence}, Anoms=${stats.anomalies}`
        );
      });

      doc.moveDown();
      doc.text("Timeline (first 10 windows):");
      data.timeline.slice(0, 10).forEach((t) =>
        doc.text(
          `Win ${t.window_index}: ${t.system_health_status} (anoms=${t.anomaly_count})`
        )
      );
      break;

    /** WINDOW REPORT **/
    case "window_report":
      doc
        .fontSize(14)
        .text(`Batch: ${data.batch_id} | Window: ${data.window_id}`);
      doc.moveDown();

      if (data.autoencoder) {
        doc.text(`System status: ${data.autoencoder.overall?.system_health_status}`);
        doc.text(
          `Total anomalies: ${data.autoencoder.overall?.anomaly_count ?? 0}`
        );
        doc.moveDown();
        doc.text("Components:");
        Object.entries(data.autoencoder.components).forEach(([comp, stats]) => {
          if (typeof stats === "object" && stats.reconstruction_error !== undefined) {
            doc.text(
              `- ${comp}: Err=${formatNum(stats.reconstruction_error)} | Conf=${formatNum(
                stats.confidence_score,
                2
              )} | Severe=${stats.anomaly_severity ?? 0}`
            );
            doc.text(`   Top-3: ${stats.top3_features}`);
          }
        });
      }

      if (data.attention) {
        doc.moveDown();
        doc.text(
          `Attention data present (components: ${Object.keys(data.attention).length})`
        );
      }

      if (data.lstm) {
        doc.moveDown();
        doc.text(
          `LSTM Predictions: steps=${data.lstm.steps?.length}, features=${data.lstm.features?.length}`
        );
      } else {
        doc.moveDown();
        doc.text("No LSTM predictions.");
      }
      break;
  }

  doc.end();
}
