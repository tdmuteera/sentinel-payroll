const db = require("../database/db");

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getManagerDashboard(req, res) {
  const userId = req.user.id;
  const role = req.user.role;

  let department = db
    .prepare("SELECT id, name, description, manager_id FROM departments WHERE manager_id = ?")
    .get(userId);

  // Fallback to Management department when legacy seed data doesn't map manager_id.
  if (!department && role === "manager") {
    department = db
      .prepare("SELECT id, name, description, manager_id FROM departments WHERE name = 'Management'")
      .get();
  }

  if (!department && role === "admin") {
    department = db
      .prepare("SELECT id, name, description, manager_id FROM departments ORDER BY id LIMIT 1")
      .get();
  }

  if (!department) {
    return res.json({
      department: null,
      employees: [],
      attendanceSummary: [],
      payrollSummary: { totalNetPay: 0 },
    });
  }

  const monthStart = getMonthStart();
  const today = getToday();

  const employees = db
    .prepare(
      `SELECT id, employee_code, full_name, position, employment_status, date_joined
       FROM employees
       WHERE department_id = ?
       ORDER BY full_name`
    )
    .all(department.id);

  const attendanceSummary = db
    .prepare(
      `SELECT
         employees.id AS employee_id,
         employees.full_name,
         SUM(CASE WHEN attendance.status = 'Present' THEN 1 ELSE 0 END) AS present,
         SUM(CASE WHEN attendance.status = 'Late' THEN 1 ELSE 0 END) AS late,
         SUM(CASE WHEN attendance.status = 'Absent' THEN 1 ELSE 0 END) AS absent,
         SUM(CASE WHEN attendance.status = 'Leave' THEN 1 ELSE 0 END) AS leave_count,
         COUNT(attendance.id) AS total
       FROM employees
       LEFT JOIN attendance
         ON attendance.employee_id = employees.id
         AND attendance.date >= ?
         AND attendance.date <= ?
       WHERE employees.department_id = ?
       GROUP BY employees.id, employees.full_name
       ORDER BY employees.full_name`
    )
    .all(monthStart, today, department.id)
    .map((row) => ({
      employee_id: row.employee_id,
      full_name: row.full_name,
      present: Number(row.present || 0),
      late: Number(row.late || 0),
      absent: Number(row.absent || 0),
      leave: Number(row.leave_count || 0),
      total: Number(row.total || 0),
    }));

  const payrollSummaryRow = db
    .prepare(
      `SELECT COALESCE(SUM(payroll.net_pay), 0) AS totalNetPay
       FROM payroll
       LEFT JOIN employees ON employees.id = payroll.employee_id
       WHERE employees.department_id = ?
         AND payroll.pay_period_start >= ?
         AND payroll.pay_period_start <= ?`
    )
    .get(department.id, monthStart, today);

  return res.json({
    department,
    employees,
    attendanceSummary,
    payrollSummary: { totalNetPay: Number(payrollSummaryRow.totalNetPay || 0) },
  });
}

module.exports = { getManagerDashboard };
