const db = require("../database/db");
const {
  generatePassword,
  upsertEmployeeAccount,
  setEmployeeAccountActive,
} = require("../services/employeeAccountService");

function listEmployeeAccess(req, res) {
  const rows = db
    .prepare(
      `SELECT
         e.id AS employee_id,
         e.employee_code,
         e.full_name,
         e.employment_status,
         d.name AS department_name,
         CASE WHEN ea.employee_id IS NULL THEN 0 ELSE 1 END AS has_account,
         COALESCE(ea.is_active, 0) AS is_active
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN employee_accounts ea ON ea.employee_id = e.id
       ORDER BY e.full_name`
    )
    .all();
  return res.json(rows);
}

async function createOrResetAccess(req, res) {
  const {
    employee_id,
    password,
    generate_password,
    is_active,
  } = req.body;
  const empId = Number(employee_id);
  if (!empId) {
    return res.status(400).json({ message: "employee_id is required" });
  }

  const emp = db.prepare("SELECT id, full_name FROM employees WHERE id = ?").get(empId);
  if (!emp) {
    return res.status(404).json({ message: "Employee not found" });
  }

  let plain = password;
  let generated = false;
  if (generate_password) {
    plain = generatePassword();
    generated = true;
  }
  if (!plain || String(plain).length < 6) {
    return res.status(400).json({
      message: "Provide password (min 6 chars) or set generate_password to true",
    });
  }

  await upsertEmployeeAccount(empId, plain);
  if (typeof is_active === "boolean") {
    await setEmployeeAccountActive(empId, is_active);
  }

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(
    req.user.id,
    "UPDATE",
    "employee_access",
    empId,
    `Employee portal access ${generated ? "created with generated password" : "set"} for ${emp.full_name}`
  );

  return res.status(201).json({
    message: "Employee access saved",
    employee_id: empId,
    generated_password: generated ? plain : undefined,
  });
}

async function patchEmployeeAccess(req, res) {
  const empId = Number(req.params.employeeId);
  if (!empId) {
    return res.status(400).json({ message: "Invalid employee id" });
  }

  const existing = db.prepare("SELECT employee_id FROM employee_accounts WHERE employee_id = ?").get(empId);
  if (!existing) {
    return res.status(404).json({ message: "No portal account for this employee" });
  }

  const { password, generate_password, is_active } = req.body;

  if (typeof is_active === "boolean") {
    await setEmployeeAccountActive(empId, is_active);
  }

  let plain = password;
  let generated = false;
  if (generate_password) {
    plain = generatePassword();
    generated = true;
  }
  if (plain) {
    if (String(plain).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    await upsertEmployeeAccount(empId, plain);
  }

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(req.user.id, "UPDATE", "employee_access", empId, "Employee portal access updated");

  return res.json({
    message: "Updated",
    generated_password: generated ? plain : undefined,
  });
}

module.exports = { listEmployeeAccess, createOrResetAccess, patchEmployeeAccess };
