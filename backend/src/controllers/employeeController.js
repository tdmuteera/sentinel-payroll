const db = require("../database/db");
const {
  generatePassword,
  upsertEmployeeAccount,
  setEmployeeAccountActive,
} = require("../services/employeeAccountService");

function getAllEmployees(req, res) {
  const rows = db
    .prepare(
      `SELECT employees.*, departments.name AS department_name
       FROM employees
       LEFT JOIN departments ON employees.department_id = departments.id
       ORDER BY employees.full_name`
    )
    .all();

  return res.json(rows);
}

function getEmployeeById(req, res) {
  const { id } = req.params;
  const row = db
    .prepare(
      `SELECT employees.*, departments.name AS department_name
       FROM employees
       LEFT JOIN departments ON employees.department_id = departments.id
       WHERE employees.id = ?`
    )
    .get(id);

  if (!row) {
    return res.status(404).json({ message: "Employee not found" });
  }
  return res.json(row);
}

function nextEmployeeCode() {
  const codes = db.prepare("SELECT employee_code FROM employees").all();
  const maxNumber = codes.reduce((max, row) => {
    const match = String(row.employee_code || "").match(/(\d+)/);
    if (!match) {
      return max;
    }
    return Math.max(max, Number(match[1]));
  }, 0);
  return `EMP-${String(maxNumber + 1).padStart(3, "0")}`;
}

async function createEmployee(req, res) {
  const {
    full_name,
    department_id,
    position,
    base_salary,
    tax_rate,
    employment_status,
    date_joined,
    employee_password,
    generate_employee_password,
  } = req.body;

  if (!full_name || !department_id || !position || !base_salary || !date_joined) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const employeeCode = nextEmployeeCode();

  const result = db
    .prepare(
      `INSERT INTO employees
      (employee_code, full_name, department_id, position, base_salary, tax_rate, employment_status, date_joined)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      employeeCode,
      full_name,
      Number(department_id),
      position,
      Number(base_salary),
      Number(tax_rate ?? 0.2),
      employment_status || "Active",
      date_joined
    );

  const newId = result.lastInsertRowid;

  let portalPassword = employee_password;
  let generatedPortal = false;
  if (generate_employee_password) {
    portalPassword = generatePassword();
    generatedPortal = true;
  }
  if (!portalPassword || String(portalPassword).length < 6) {
    portalPassword = generatePassword();
    generatedPortal = true;
  }
  await upsertEmployeeAccount(newId, portalPassword);

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(
    req.user.id,
    "CREATE",
    "employee",
    newId,
    `Created employee ${employeeCode} - ${full_name}`
  );

  const created = db
    .prepare(
      `SELECT employees.*, departments.name AS department_name
       FROM employees
       LEFT JOIN departments ON employees.department_id = departments.id
       WHERE employees.id = ?`
    )
    .get(newId);

  return res.status(201).json({
    ...created,
    generated_employee_password: generatedPortal ? portalPassword : undefined,
  });
}

async function updateEmployee(req, res) {
  const { id } = req.params;
  const {
    full_name,
    department_id,
    position,
    base_salary,
    tax_rate,
    employment_status,
    date_joined,
  } = req.body;

  const existing = db.prepare("SELECT id, employee_code FROM employees WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ message: "Employee not found" });
  }

  db.prepare(
    `UPDATE employees
     SET full_name = ?, department_id = ?, position = ?, base_salary = ?, tax_rate = ?, employment_status = ?, date_joined = ?
     WHERE id = ?`
  ).run(
    full_name,
    Number(department_id),
    position,
    Number(base_salary),
    Number(tax_rate ?? 0.2),
    employment_status || "Active",
    date_joined,
    id
  );

  if (employment_status === "Terminated") {
    await setEmployeeAccountActive(id, false);
  }

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(req.user.id, "UPDATE", "employee", id, `Updated employee ${existing.employee_code}`);

  const updated = db
    .prepare(
      `SELECT employees.*, departments.name AS department_name
       FROM employees
       LEFT JOIN departments ON employees.department_id = departments.id
       WHERE employees.id = ?`
    )
    .get(id);

  return res.json(updated);
}

function deleteEmployee(req, res) {
  const { id } = req.params;
  const existing = db
    .prepare("SELECT id, employee_code, full_name FROM employees WHERE id = ?")
    .get(id);
  if (!existing) {
    return res.status(404).json({ message: "Employee not found" });
  }

  db.prepare("UPDATE employees SET employment_status = 'Terminated' WHERE id = ?").run(id);
  db.prepare("UPDATE employee_accounts SET is_active = 0, updated_at = datetime('now') WHERE employee_id = ?").run(
    id
  );

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(
    req.user.id,
    "DELETE",
    "employee",
    id,
    `Terminated employee ${existing.employee_code} - ${existing.full_name}`
  );

  return res.json({ message: "Employee terminated successfully" });
}

function getDepartments(req, res) {
  const rows = db
    .prepare("SELECT id, name, description FROM departments ORDER BY name")
    .all();
  return res.json(rows);
}

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
};
