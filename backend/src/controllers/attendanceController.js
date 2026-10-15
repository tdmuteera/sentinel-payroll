const db = require("../database/db");

function getAttendance(req, res) {
  const { employee_id, date_from, date_to, status } = req.query;
  const conditions = [];
  const params = [];

  if (employee_id) {
    conditions.push("attendance.employee_id = ?");
    params.push(Number(employee_id));
  }
  if (date_from) {
    conditions.push("attendance.date >= ?");
    params.push(date_from);
  }
  if (date_to) {
    conditions.push("attendance.date <= ?");
    params.push(date_to);
  }
  if (status) {
    conditions.push("attendance.status = ?");
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT attendance.*, employees.full_name, employees.employee_code, departments.name AS department_name
       FROM attendance
       LEFT JOIN employees ON attendance.employee_id = employees.id
       LEFT JOIN departments ON employees.department_id = departments.id
       ${whereClause}
       ORDER BY attendance.date DESC, employees.full_name ASC`
    )
    .all(...params);

  return res.json(rows);
}

function createAttendance(req, res) {
  const { employee_id, date, status, hours_worked, overtime_hours } = req.body;
  if (!employee_id || !date || !status) {
    return res
      .status(400)
      .json({ message: "employee_id, date and status are required" });
  }

  const result = db
    .prepare(
      `INSERT INTO attendance (employee_id, date, status, hours_worked, overtime_hours)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      Number(employee_id),
      date,
      status,
      Number(hours_worked ?? 0),
      Number(overtime_hours ?? 0)
    );

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(
    req.user.id,
    "CREATE",
    "attendance",
    result.lastInsertRowid,
    `Created attendance for employee ${employee_id} on ${date}`
  );

  return res.status(201).json({ id: result.lastInsertRowid });
}

function bulkAttendance(req, res) {
  const records = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: "Provide a non-empty attendance array" });
  }

  const insertStmt = db.prepare(
    `INSERT INTO attendance (employee_id, date, status, hours_worked, overtime_hours)
     VALUES (?, ?, ?, ?, ?)`
  );
  const auditStmt = db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  );

  const transaction = db.transaction((items) => {
    let inserted = 0;
    for (const item of items) {
      if (!item.employee_id || !item.date || !item.status) {
        throw new Error("Each record requires employee_id, date, and status");
      }
      const result = insertStmt.run(
        Number(item.employee_id),
        item.date,
        item.status,
        Number(item.hours_worked ?? 0),
        Number(item.overtime_hours ?? 0)
      );
      auditStmt.run(
        req.user.id,
        "CREATE",
        "attendance",
        result.lastInsertRowid,
        `Bulk attendance created for employee ${item.employee_id} on ${item.date}`
      );
      inserted += 1;
    }
    return inserted;
  });

  try {
    const insertedCount = transaction(records);
    return res.status(201).json({ inserted: insertedCount });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

function updateAttendance(req, res) {
  const { id } = req.params;
  const { status, hours_worked, overtime_hours } = req.body;

  const existing = db.prepare("SELECT id FROM attendance WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ message: "Attendance record not found" });
  }

  db.prepare(
    `UPDATE attendance
     SET status = ?, hours_worked = ?, overtime_hours = ?
     WHERE id = ?`
  ).run(status, Number(hours_worked ?? 0), Number(overtime_hours ?? 0), id);

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(req.user.id, "UPDATE", "attendance", id, `Updated attendance record ${id}`);

  return res.json({ message: "Attendance updated" });
}

function getAttendanceSummary(req, res) {
  const { date_from, date_to } = req.query;
  const params = [];
  let whereClause = "";
  if (date_from && date_to) {
    whereClause = "WHERE attendance.date >= ? AND attendance.date <= ?";
    params.push(date_from, date_to);
  } else if (date_from) {
    whereClause = "WHERE attendance.date >= ?";
    params.push(date_from);
  } else if (date_to) {
    whereClause = "WHERE attendance.date <= ?";
    params.push(date_to);
  }

  const rows = db
    .prepare(
      `SELECT
         attendance.employee_id,
         employees.full_name,
         SUM(CASE WHEN attendance.status = 'Present' THEN 1 ELSE 0 END) AS present_count,
         SUM(CASE WHEN attendance.status = 'Late' THEN 1 ELSE 0 END) AS late_count,
         SUM(CASE WHEN attendance.status = 'Absent' THEN 1 ELSE 0 END) AS absent_count,
         SUM(CASE WHEN attendance.status = 'Leave' THEN 1 ELSE 0 END) AS leave_count,
         SUM(attendance.hours_worked) AS total_hours
       FROM attendance
       LEFT JOIN employees ON attendance.employee_id = employees.id
       ${whereClause}
       GROUP BY attendance.employee_id, employees.full_name
       ORDER BY employees.full_name`
    )
    .all(...params);

  return res.json(rows);
}

module.exports = {
  getAttendance,
  createAttendance,
  bulkAttendance,
  updateAttendance,
  getAttendanceSummary,
};
