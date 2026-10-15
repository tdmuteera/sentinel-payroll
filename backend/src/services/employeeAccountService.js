const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../database/db");

function generatePassword() {
  return crypto.randomBytes(5).toString("hex");
}

async function upsertEmployeeAccount(employeeId, plainPassword) {
  const hash = await bcrypt.hash(plainPassword, 10);
  db.prepare(
    `INSERT INTO employee_accounts (employee_id, password_hash, is_active, updated_at)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(employee_id) DO UPDATE SET
       password_hash = excluded.password_hash,
       is_active = 1,
       updated_at = datetime('now')`
  ).run(employeeId, hash);
}

async function setEmployeeAccountActive(employeeId, isActive) {
  db.prepare(
    `UPDATE employee_accounts SET is_active = ?, updated_at = datetime('now') WHERE employee_id = ?`
  ).run(isActive ? 1 : 0, employeeId);
}

async function verifyEmployeePassword(employeeId, plainPassword) {
  const row = db
    .prepare(
      `SELECT ea.password_hash, ea.is_active
       FROM employee_accounts ea
       JOIN employees e ON e.id = ea.employee_id
       WHERE ea.employee_id = ?`
    )
    .get(employeeId);
  if (!row || !row.is_active) {
    return false;
  }
  return bcrypt.compare(plainPassword, row.password_hash);
}

module.exports = {
  generatePassword,
  upsertEmployeeAccount,
  setEmployeeAccountActive,
  verifyEmployeePassword,
};
