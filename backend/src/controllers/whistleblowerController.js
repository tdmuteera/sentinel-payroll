const db = require("../database/db");

function submitReport(req, res) {
  const { category, description } = req.body;
  if (!category || !description) {
    return res.status(400).json({ message: "category and description are required" });
  }

  const result = db
    .prepare(
      `INSERT INTO whistleblower_reports (category, description, status)
       VALUES (?, ?, 'Pending')`
    )
    .run(category, description);

  return res.status(201).json({ reportId: result.lastInsertRowid });
}

function getReports(req, res) {
  const rows = db
    .prepare("SELECT * FROM whistleblower_reports ORDER BY submitted_at DESC")
    .all();
  return res.json(rows);
}

function updateReportStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ message: "status is required" });
  }

  const existing = db.prepare("SELECT id FROM whistleblower_reports WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ message: "Report not found" });
  }

  const resolvedAt = status === "Resolved" ? new Date().toISOString() : null;
  db.prepare(
    "UPDATE whistleblower_reports SET status = ?, resolved_at = ? WHERE id = ?"
  ).run(status, resolvedAt, id);

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(req.user.id, "UPDATE", "whistleblower_report", id, `Updated whistleblower report ${id} to ${status}`);

  return res.json({ message: "Report status updated" });
}

module.exports = { submitReport, getReports, updateReportStatus };
