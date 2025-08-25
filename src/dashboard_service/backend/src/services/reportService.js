import axios from "axios";
import PDFDocument from "pdfkit";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:8010";

export async function generateDashboardReport(user_id) {
  const r = await axios.get(`${DASHBOARD_URL}/dashboard/${user_id}?count=50`);
  return {
    user_id,
    timestamp: new Date().toISOString(),
    batches: r.data.batches
  };
}

export async function generateBatchReport(batch_id, user_id) {
  const overview = await axios.get(`${DASHBOARD_URL}/api/batch/${batch_id}/overview?user_id=${user_id}`);
  const timeline = await axios.get(`${DASHBOARD_URL}/api/batch/${batch_id}/anomalies/timeline`);
  return {
    batch_id,
    user_id,
    timestamp: new Date().toISOString(),
    overview: overview.data,
    anomaly_timeline: timeline.data
  };
}

export async function generateWindowReport(batch_id, window_id) {
  const auto = await axios.get(`${DASHBOARD_URL}/api/batch/${batch_id}/window/${window_id}/autoencoder`);
  const attn = await axios.get(`${DASHBOARD_URL}/api/batch/${batch_id}/window/${window_id}/attention`);
  const lstm = await axios.get(`${DASHBOARD_URL}/api/batch/${batch_id}/window/${window_id}/lstm`);
  return {
    batch_id,
    window_id,
    timestamp: new Date().toISOString(),
    autoencoder: auto.data,
    attention: attn.data,
    lstm: lstm.data
  };
}

export async function generateBatchReportPDF(batch_id, user_id) {
  const data = await generateBatchReport(batch_id, user_id);

  const doc = new PDFDocument();
  let buffers = [];
  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {});

  doc.fontSize(18).text(`Batch Report: ${batch_id}`);
  doc.moveDown();
  doc.fontSize(12).text(`User: ${user_id}`);
  doc.text(`Timestamp: ${data.timestamp}`);

  doc.moveDown();
  doc.text("Overview:");
  doc.text(JSON.stringify(data.overview, null, 2));

  doc.moveDown();
  doc.text("Anomaly timeline:");
  doc.text(JSON.stringify(data.anomaly_timeline, null, 2));

  doc.end();
  return Buffer.concat(buffers);
}
