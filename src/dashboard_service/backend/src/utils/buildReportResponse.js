// backend/src/utils/buildReportResponse.js
import { buildPDFReport } from "./pdfReportBuilder.js";

export function buildReportResponse(req, res, type, data) {
  const format = req.query.format || "json";

  if (format === "pdf") {
    return buildPDFReport(res, type, data);
  }

  // по умолчанию JSON
  res.json(data);
}
