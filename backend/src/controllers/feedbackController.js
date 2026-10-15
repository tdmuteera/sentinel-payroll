const db = require("../database/db");

function getFeedback(req, res) {
  const { status, severity, issue_type } = req.query;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push("feedback.status = ?");
    params.push(status);
  }
  if (severity) {
    conditions.push("feedback.severity = ?");
    params.push(severity);
  }
  if (issue_type) {
    conditions.push("feedback.issue_type = ?");
    params.push(issue_type);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT feedback.*, employees.full_name
       FROM feedback
       LEFT JOIN employees ON feedback.employee_id = employees.id
       ${whereClause}
       ORDER BY feedback.created_at DESC`
    )
    .all(...params);

  return res.json(rows);
}

function createFeedback(req, res) {
  const { employee_id, issue_type, severity, description } = req.body;
  if (!employee_id || !issue_type || !severity || !description) {
    return res
      .status(400)
      .json({ message: "employee_id, issue_type, severity and description are required" });
  }

  const result = db
    .prepare(
      `INSERT INTO feedback (employee_id, issue_type, severity, description, status)
       VALUES (?, ?, ?, ?, 'Open')`
    )
    .run(employee_id, issue_type, severity, description);

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(
    req.user.id,
    "CREATE",
    "feedback",
    result.lastInsertRowid,
    `Created feedback issue (${issue_type}) with severity ${severity}`
  );

  return res.status(201).json({ id: result.lastInsertRowid });
}

function updateFeedback(req, res) {
  const { id } = req.params;
  const { status, resolution_notes } = req.body;
  const existing = db.prepare("SELECT id FROM feedback WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ message: "Feedback issue not found" });
  }

  db.prepare("UPDATE feedback SET status = ?, resolution_notes = ? WHERE id = ?").run(
    status || "In Progress",
    resolution_notes || "",
    id
  );

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(
    req.user.id,
    "UPDATE",
    "feedback",
    id,
    `Updated feedback issue ${id} to status ${status || "In Progress"}`
  );

  return res.json({ message: "Feedback updated" });
}

module.exports = { getFeedback, createFeedback, updateFeedback };
