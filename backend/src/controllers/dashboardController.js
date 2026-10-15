const db = require("../database/db");

function getDashboardStats(req, res) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const totalEmployees = db
    .prepare("SELECT COUNT(*) AS count FROM employees WHERE employment_status = 'Active'")
    .get().count;

  const totalMonthlyPayroll = db
    .prepare(
      `SELECT COALESCE(SUM(net_pay), 0) AS total
       FROM payroll
       WHERE pay_period_start >= ? AND pay_period_start <= ?`
    )
    .get(monthStart, today).total;

  const lastPayrollDate = db
    .prepare("SELECT MAX(created_at) AS last_date FROM payroll")
    .get().last_date;

  const openIssues = db
    .prepare("SELECT COUNT(*) AS count FROM feedback WHERE status = 'Open'")
    .get().count;

  const attendanceTodayRow = db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present,
         SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late,
         SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent,
         SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) AS leave_count,
         COUNT(*) AS total
       FROM attendance
       WHERE date = ?`
    )
    .get(today);

  const attendanceToday = {
    present: Number(attendanceTodayRow.present || 0),
    late: Number(attendanceTodayRow.late || 0),
    absent: Number(attendanceTodayRow.absent || 0),
    leave: Number(attendanceTodayRow.leave_count || 0),
    total: Number(attendanceTodayRow.total || 0),
  };

  const departmentStats = db
    .prepare(
      `SELECT
         departments.name,
         COUNT(employees.id) AS employee_count
       FROM departments
       LEFT JOIN employees
         ON employees.department_id = departments.id
         AND employees.employment_status = 'Active'
       GROUP BY departments.id, departments.name
       ORDER BY departments.name`
    )
    .all();

  const payrollTrend = db
    .prepare(
      `SELECT
         strftime('%Y-%m', pay_period_start) AS month_key,
         strftime('%m', pay_period_start) AS month_num,
         strftime('%Y', pay_period_start) AS year_num,
         COALESCE(SUM(net_pay), 0) AS totalNetPay,
         COALESCE(SUM(gross_pay), 0) AS totalGrossPay
       FROM payroll
       GROUP BY month_key
       ORDER BY month_key DESC
       LIMIT 6`
    )
    .all()
    .reverse()
    .map((row) => {
      const date = new Date(`${row.month_key}-01T00:00:00`);
      const month = date.toLocaleString("en-US", { month: "short", year: "numeric" });
      return {
        month,
        totalNetPay: Number(row.totalNetPay || 0),
        totalGrossPay: Number(row.totalGrossPay || 0),
      };
    });

  const attendanceTrend = db
    .prepare(
      `SELECT
         date,
         SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present,
         SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent,
         SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late
       FROM attendance
       WHERE date >= date('now', '-29 day')
       GROUP BY date
       ORDER BY date ASC`
    )
    .all()
    .map((row) => ({
      date: row.date,
      present: Number(row.present || 0),
      absent: Number(row.absent || 0),
      late: Number(row.late || 0),
    }));

  const recentActivity = db
    .prepare(
      `SELECT
         audit_logs.id,
         audit_logs.timestamp,
         audit_logs.action,
         audit_logs.entity,
         audit_logs.description,
         users.full_name
       FROM audit_logs
       LEFT JOIN users ON users.id = audit_logs.user_id
       ORDER BY audit_logs.timestamp DESC
       LIMIT 10`
    )
    .all();

  return res.json({
    totalEmployees: Number(totalEmployees || 0),
    totalMonthlyPayroll: Number(totalMonthlyPayroll || 0),
    lastPayrollDate: lastPayrollDate || null,
    openIssues: Number(openIssues || 0),
    attendanceToday,
    departmentStats: departmentStats.map((row) => ({
      name: row.name,
      employee_count: Number(row.employee_count || 0),
    })),
    payrollTrend,
    attendanceTrend,
    recentActivity,
  });
}

module.exports = { getDashboardStats };
