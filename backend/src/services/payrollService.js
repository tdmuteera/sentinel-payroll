const db = require("../database/db");

function calculatePayroll(employeeId, periodStart, periodEnd, bonus = 0) {
  const employee = db
    .prepare("SELECT id, base_salary, tax_rate FROM employees WHERE id = ?")
    .get(employeeId);

  if (!employee) {
    throw new Error(`Employee not found: ${employeeId}`);
  }

  const overtimeResult = db
    .prepare(
      `SELECT COALESCE(SUM(overtime_hours), 0) AS total_overtime_hours
       FROM attendance
       WHERE employee_id = ? AND date >= ? AND date <= ?`
    )
    .get(employeeId, periodStart, periodEnd);

  const totalOvertimeHours = Number(overtimeResult.total_overtime_hours || 0);
  const hourlyRate = Number(employee.base_salary) / 160;
  const overtimePay = totalOvertimeHours * hourlyRate * 1.5;
  const grossPay = Number(employee.base_salary) + overtimePay + Number(bonus || 0);
  const taxDeducted = grossPay * Number(employee.tax_rate || 0);
  const netPay = grossPay - taxDeducted;

  return {
    employee_id: employee.id,
    base_salary: Number(employee.base_salary),
    tax_rate: Number(employee.tax_rate || 0),
    total_overtime_hours: totalOvertimeHours,
    hourly_rate: hourlyRate,
    bonus: Number(bonus || 0),
    overtime_pay: overtimePay,
    gross_pay: grossPay,
    tax_deducted: taxDeducted,
    net_pay: netPay,
    pay_period_start: periodStart,
    pay_period_end: periodEnd,
  };
}

module.exports = { calculatePayroll };
