const db = require("../database/db");
const { generatePayslipPDF } = require("../services/pdfService");

function formatPeriodLabel(start, end) {
  return `${start} to ${end}`;
}

function generatePayslips(req, res) {
  const { payroll_id } = req.params;
  const seedPayroll = db
    .prepare("SELECT id, pay_period_start, pay_period_end FROM payroll WHERE id = ?")
    .get(payroll_id);

  if (!seedPayroll) {
    return res.status(404).json({ message: "Payroll run seed record not found" });
  }

  const payrollRows = db
    .prepare(
      `SELECT *
       FROM payroll
       WHERE pay_period_start = ? AND pay_period_end = ?`
    )
    .all(seedPayroll.pay_period_start, seedPayroll.pay_period_end);

  if (payrollRows.length === 0) {
    return res.status(400).json({ message: "No payroll records found for selected run" });
  }

  const insertPayslip = db.prepare(
    `INSERT INTO payslips
     (payroll_id, employee_id, period_label, gross_pay, deductions, net_pay, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Generated')`
  );

  const createdPayslips = [];
  const transaction = db.transaction(() => {
    for (const row of payrollRows) {
      const existing = db
        .prepare("SELECT id FROM payslips WHERE payroll_id = ?")
        .get(row.id);
      if (existing) {
        createdPayslips.push({ id: existing.id, payroll_id: row.id, reused: true });
        continue;
      }

      const deductions = Number(row.tax_deducted || 0) + Number(row.other_deductions || 0);
      const result = insertPayslip.run(
        row.id,
        row.employee_id,
        formatPeriodLabel(row.pay_period_start, row.pay_period_end),
        row.gross_pay,
        deductions,
        row.net_pay
      );
      createdPayslips.push({ id: result.lastInsertRowid, payroll_id: row.id, reused: false });
    }
  });
  transaction();

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, description) VALUES (?, ?, ?, ?)"
  ).run(
    req.user.id,
    "GENERATE",
    "payslip",
    `Generated payslips for payroll period ${seedPayroll.pay_period_start} to ${seedPayroll.pay_period_end}`
  );

  return res.status(201).json(createdPayslips);
}

function getPayslips(req, res) {
  const { employee, period } = req.query;
  const conditions = [];
  const params = [];

  if (employee) {
    conditions.push("(employees.full_name LIKE ? OR employees.employee_code LIKE ?)");
    params.push(`%${employee}%`, `%${employee}%`);
  }
  if (period) {
    conditions.push("payslips.period_label LIKE ?");
    params.push(`%${period}%`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
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
       ${whereClause}
       ORDER BY payslips.generated_at DESC`
    )
    .all(...params);

  return res.json(rows);
}

function getPayslipPdfRow(id) {
  return db
    .prepare(
      `SELECT
         payslips.*,
         employees.full_name,
         employees.employee_code,
         employees.position,
         departments.name AS department_name,
         payroll.pay_period_start,
         payroll.pay_period_end,
         payroll.base_salary,
         payroll.overtime_pay,
         payroll.bonus,
         payroll.tax_deducted,
         payroll.other_deductions
       FROM payslips
       LEFT JOIN employees ON payslips.employee_id = employees.id
       LEFT JOIN payroll ON payslips.payroll_id = payroll.id
       LEFT JOIN departments ON employees.department_id = departments.id
       WHERE payslips.id = ?`
    )
    .get(id);
}

async function downloadPayslip(req, res) {
  const { id } = req.params;
  const row = getPayslipPdfRow(id);

  if (!row) {
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

module.exports = { generatePayslips, getPayslips, downloadPayslip, getPayslipPdfRow };
