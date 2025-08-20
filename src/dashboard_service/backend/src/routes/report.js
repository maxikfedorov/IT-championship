import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { generateDashboardReport, generateBatchReport, generateWindowReport } from "../services/reportService.js";

const router = express.Router();

// dashboard-level
router.get("/dashboard/:user_id", authMiddleware(), async (req, res) => {
  const { user_id } = req.params;
  const { format = "json" } = req.query;
  const report = await generateDashboardReport(user_id);

  if (format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=dashboard_report.pdf");
    return res.send(report);
  }
  res.json(report);
});

// batch-level
router.get("/batch/:batch_id", authMiddleware(), async (req, res) => {
  const { batch_id } = req.params;
  const { format = "json", user_id } = req.query;
  const report = await generateBatchReport(batch_id, user_id);

  if (format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=batch_${batch_id}.pdf`);
    return res.send(report);
  }
  res.json(report);
});

// window-level
router.get("/batch/:batch_id/window/:window_id", authMiddleware(), async (req, res) => {
  const { batch_id, window_id } = req.params;
  const { format = "json" } = req.query;
  const report = await generateWindowReport(batch_id, window_id);

  if (format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=window_${window_id}.pdf`);
    return res.send(report);
  }
  res.json(report);
});

export default router;
