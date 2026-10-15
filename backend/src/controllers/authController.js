const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database/db");
const { verifyEmployeePassword } = require("../services/employeeAccountService");

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = db
    .prepare(
      "SELECT id, full_name, email, password_hash, role, created_at FROM users WHERE email = ?"
    )
    .get(email);

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(user.id, "LOGIN", "auth", user.id, `Successful login for ${user.email}`);

  return res.json({
    token,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
    },
  });
}

function listDepartmentsForEmployeeLogin(req, res) {
  const rows = db.prepare("SELECT id, name FROM departments ORDER BY name").all();
  return res.json(rows);
}

function listEmployeesForEmployeeLogin(req, res) {
  const departmentId = Number(req.query.department_id);
  if (!departmentId) {
    return res.status(400).json({ message: "department_id is required" });
  }
  const rows = db
    .prepare(
      `SELECT e.id, e.full_name, e.employee_code
       FROM employees e
       INNER JOIN employee_accounts ea ON ea.employee_id = e.id AND ea.is_active = 1
       WHERE e.department_id = ? AND e.employment_status = 'Active'
       ORDER BY e.full_name`
    )
    .all(departmentId);
  return res.json(rows);
}

async function employeeLogin(req, res) {
  const { department_id, employee_id, password } = req.body;
  const deptId = Number(department_id);
  const empId = Number(employee_id);

  if (!deptId || !empId || !password) {
    return res
      .status(400)
      .json({ message: "department_id, employee_id, and password are required" });
  }

  const employee = db
    .prepare(
      `SELECT e.id, e.full_name, e.department_id, e.employment_status
       FROM employees e
       INNER JOIN employee_accounts ea ON ea.employee_id = e.id AND ea.is_active = 1
       WHERE e.id = ?`
    )
    .get(empId);

  if (!employee || employee.department_id !== deptId) {
    return res.status(401).json({ message: "Invalid department or employee" });
  }

  if (employee.employment_status !== "Active") {
    return res.status(403).json({ message: "Employee access is not active" });
  }

  const ok = await verifyEmployeePassword(empId, password);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const payload = {
    role: "employee",
    employeeId: employee.id,
    id: employee.id,
    fullName: employee.full_name,
    email: null,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });

  db.prepare(
    "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
  ).run(null, "LOGIN", "employee_auth", employee.id, `Employee self-service login id=${employee.id}`);

  return res.json({
    token,
    user: {
      id: employee.id,
      employeeId: employee.id,
      fullName: employee.full_name,
      role: "employee",
      email: null,
    },
  });
}

function getMe(req, res) {
  return res.json({ user: req.user });
}

module.exports = { login, getMe, listDepartmentsForEmployeeLogin, listEmployeesForEmployeeLogin, employeeLogin };
