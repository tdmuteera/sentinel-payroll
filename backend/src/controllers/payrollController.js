const db = require("../database/db");
const { calculatePayroll } = require("../services/payrollService");

function runPayroll(req, res) {
  const { pay_period_start, pay_period_end, bonus_override } = req.body;
  if (!pay_period_start || !pay_period_end) {
    return res
      .status(400)
      .json({ message: "pay_period_start and pay_period_end are required" });
  }

  const activeEmployees = db
    .prepare("SELECT id FROM employees WHERE employment_status = 'Active'")
    .all();
  if (activeEmployees.length === 0) {
    return res.status(400).json({ message: "No active employees found" });
  }

  const insertPayrollStmt = db.prepare(
    `INSERT INTO payroll
     (pay_period_start, pay_period_end, employee_id, base_salary, bonus, overtime_pay,
      gross_pay, tax_deducted, other_deductions, net_pay, status, processed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?)`
  );
  const transaction = db.transaction((employeeRows) => {
    const created = [];
    for (const employee of employeeRows) {
      const calculated = calculatePayroll(
        employee.id,
        pay_period_start,
        pay_period_end,
        Number(bonus_override || 0)
      );
      const result = insertPayrollStmt.run(
        pay_period_start,
        pay_period_end,
        employee.id,
        calculated.base_salary,
        calculated.bonus,
        calculated.overtime_pay,
        calculated.gross_pay,
        calculated.tax_deducted,
        0,
        calculated.net_pay,
        req.user.id
      );
      created.push({ id: result.lastInsertRowid, ...calculated, status: "Draft" });
    }
    return created;
  });

  const createdPayroll = transaction(activeEmployees);

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, description) VALUES (?, ?, ?, ?)"
  ).run(
    req.user.id,
    "PROCESS",
    "payroll",
    `Payroll run for period ${pay_period_start} to ${pay_period_end}`
  );

  return res.status(201).json(createdPayroll);
}

function getPayroll(req, res) {
  const { pay_period_start, pay_period_end, status } = req.query;
  const conditions = [];
  const params = [];
  if (pay_period_start) {
    conditions.push("payroll.pay_period_start >= ?");
    params.push(pay_period_start);
  }
  if (pay_period_end) {
    conditions.push("payroll.pay_period_end <= ?");
    params.push(pay_period_end);
  }
  if (status) {
    conditions.push("payroll.status = ?");
    params.push(status);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT payroll.*, employees.full_name, employees.employee_code, departments.name AS department_name
       FROM payroll
       LEFT JOIN employees ON payroll.employee_id = employees.id
       LEFT JOIN departments ON employees.department_id = departments.id
       ${whereClause}
       ORDER BY payroll.created_at DESC, employees.full_name ASC`
    )
    .all(...params);

  return res.json(rows);
}

function getPayrollById(req, res) {
  const { id } = req.params;
  const row = db
    .prepare(
      `SELECT payroll.*, employees.full_name, employees.employee_code, employees.position,
              departments.name AS department_name
       FROM payroll
       LEFT JOIN employees ON payroll.employee_id = employees.id
       LEFT JOIN departments ON employees.department_id = departments.id
       WHERE payroll.id = ?`
    )
    .get(id);
  if (!row) {
    return res.status(404).json({ message: "Payroll record not found" });
  }
  return res.json(row);
}

function approvePayroll(req, res) {
  const { id } = req.params;
  const existing = db.prepare("SELECT id, status FROM payroll WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ message: "Payroll record not found" });
  }

  db.prepare("UPDATE payroll SET status = 'Approved' WHERE id = ?").run(id);
  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(req.user.id, "APPROVE", "payroll", id, `Approved payroll record ${id}`);

  return res.json({ message: "Payroll approved" });
}

function getPayrollStats(req, res) {
  const { pay_period_start, pay_period_end } = req.query;
  const conditions = [];
  const params = [];
  if (pay_period_start) {
    conditions.push("pay_period_start >= ?");
    params.push(pay_period_start);
  }
  if (pay_period_end) {
    conditions.push("pay_period_end <= ?");
    params.push(pay_period_end);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const stats = db
    .prepare(
      `SELECT
         COALESCE(SUM(gross_pay), 0) AS total_gross_pay,
         COALESCE(SUM(net_pay), 0) AS total_net_pay,
         COUNT(DISTINCT employee_id) AS total_employees_paid
       FROM payroll
       ${whereClause}`
    )
    .get(...params);
  return res.json(stats);
}

module.exports = {
  runPayroll,
  getPayroll,
  getPayrollById,
  approvePayroll,
  getPayrollStats,
};
