const db = require("../database/db");
const { generatePayslipPDF } = require("../services/pdfService");
const { getPayslipPdfRow } = require("./payslipController");

const STANDARD_DAY_HOURS = 8;

function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hoursBetweenIso(startIso, endIso) {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) {
    return 0;
  }
  return (b - a) / (1000 * 60 * 60);
}

function closeStaleOpenDays(employeeId, todayStr) {
  const openRows = db
    .prepare(
      `SELECT id, date, check_in_at FROM attendance
       WHERE employee_id = ? AND date < ? AND check_in_at IS NOT NULL
         AND (check_out_at IS NULL OR check_out_at = '')`
    )
    .all(employeeId, todayStr);

  const updateStmt = db.prepare(
    `UPDATE attendance
     SET check_out_at = ?, hours_worked = ?, overtime_hours = ?, status = 'Present'
     WHERE id = ?`
  );

  for (const row of openRows) {
    const endIso = `${row.date}T23:59:59`;
    const hours = hoursBetweenIso(row.check_in_at, endIso);
    const ot = Math.max(0, hours - STANDARD_DAY_HOURS);
    updateStmt.run(endIso, hours, ot, row.id);
  }
}

function getTodayRow(employeeId, dateStr) {
  return db
    .prepare(
      `SELECT * FROM attendance WHERE employee_id = ? AND date = ? ORDER BY id DESC LIMIT 1`
    )
    .get(employeeId, dateStr);
}

function checkIn(req, res) {
  const employeeId = req.user.employeeId;
  const todayStr = localDateString();

  closeStaleOpenDays(employeeId, todayStr);

  const existing = getTodayRow(employeeId, todayStr);
  if (existing && existing.check_in_at && !existing.check_out_at) {
    return res.status(409).json({ message: "Already checked in. Check out first." });
  }
  if (existing && existing.check_in_at && existing.check_out_at) {
    return res
      .status(409)
      .json({ message: "Today's session is complete. Next check-in is available tomorrow." });
  }

  const nowIso = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO attendance (employee_id, date, status, hours_worked, overtime_hours, check_in_at, check_out_at)
       VALUES (?, ?, 'Present', 0, 0, ?, NULL)`
    )
    .run(employeeId, todayStr, nowIso);

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(null, "CHECK_IN", "attendance", result.lastInsertRowid, `Employee ${employeeId} check-in`);

  return res.status(201).json({
    id: result.lastInsertRowid,
    check_in_at: nowIso,
    date: todayStr,
  });
}

function checkOut(req, res) {
  const employeeId = req.user.employeeId;
  const todayStr = localDateString();

  const row = getTodayRow(employeeId, todayStr);
  if (!row || !row.check_in_at) {
    return res.status(400).json({ message: "No check-in found for today" });
  }
  if (row.check_out_at) {
    return res.status(409).json({ message: "Already checked out for today" });
  }

  const nowIso = new Date().toISOString();
  const hours = hoursBetweenIso(row.check_in_at, nowIso);
  const overtime = Math.max(0, hours - STANDARD_DAY_HOURS);

  db.prepare(
    `UPDATE attendance
     SET check_out_at = ?, hours_worked = ?, overtime_hours = ?, status = 'Present'
     WHERE id = ?`
  ).run(nowIso, hours, overtime, row.id);

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(null, "CHECK_OUT", "attendance", row.id, `Employee ${employeeId} check-out`);

  return res.json({
    check_out_at: nowIso,
    hours_worked: hours,
    overtime_hours: overtime,
    date: todayStr,
  });
}

function todayStatus(req, res) {
  const employeeId = req.user.employeeId;
  const todayStr = localDateString();
  const row = getTodayRow(employeeId, todayStr);

  let totalHoursToday = 0;
  if (row && row.check_in_at && row.check_out_at) {
    totalHoursToday = Number(row.hours_worked || 0);
  }

  return res.json({
    date: todayStr,
    server_time: new Date().toISOString(),
    today: row
      ? {
          id: row.id,
          check_in_at: row.check_in_at,
          check_out_at: row.check_out_at,
          hours_worked: row.hours_worked,
          overtime_hours: row.overtime_hours,
        }
      : null,
    total_hours_today: totalHoursToday,
  });
}

function listMyPayslips(req, res) {
  const employeeId = req.user.employeeId;
  const rows = db
    .prepare(
      `SELECT
         payslips.*,
         employees.full_name,
         employees.employee_code,
         employees.position,
         departments.name AS department_name,
         payroll.pay_period_start,
         payroll.pay_period_end
       FROM payslips
       LEFT JOIN employees ON payslips.employee_id = employees.id
       LEFT JOIN payroll ON payslips.payroll_id = payroll.id
       LEFT JOIN departments ON employees.department_id = departments.id
       WHERE payslips.employee_id = ?
       ORDER BY payslips.generated_at DESC`
    )
    .all(employeeId);
  return res.json(rows);
}

async function downloadMyPayslip(req, res) {
  const employeeId = req.user.employeeId;
  const { id } = req.params;
  const row = getPayslipPdfRow(id);
  if (!row || row.employee_id !== employeeId) {
    return res.status(404).json({ message: "Payslip not found" });
  }

  const pdfBuffer = await generatePayslipPDF(row);
  const payDate = new Date(row.pay_period_start);
  const monthYear = payDate.toLocaleString("en-US", { month: "short", year: "numeric" });
  const compactMonthYear = monthYear.replace(" ", "");
  const filename = `payslip_${row.employee_code}_${compactMonthYear}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(pdfBuffer);
}

module.exports = { checkIn, checkOut, todayStatus, listMyPayslips, downloadMyPayslip };
