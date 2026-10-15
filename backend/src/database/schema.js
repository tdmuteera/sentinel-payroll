const db = require("./db");

function migrateSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_accounts (
      employee_id INTEGER PRIMARY KEY,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_employee_accounts_active ON employee_accounts(is_active);
  `);

  const attendanceCols = db.prepare("PRAGMA table_info(attendance)").all();
  const names = new Set(attendanceCols.map((c) => c.name));
  if (!names.has("check_in_at")) {
    db.exec("ALTER TABLE attendance ADD COLUMN check_in_at TEXT");
  }
  if (!names.has("check_out_at")) {
    db.exec("ALTER TABLE attendance ADD COLUMN check_out_at TEXT");
  }
}

function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'manager',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      manager_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manager_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_code TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      position TEXT,
      base_salary REAL NOT NULL,
      tax_rate REAL DEFAULT 0.20,
      employment_status TEXT DEFAULT 'Active',
      date_joined DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER REFERENCES employees(id),
      date DATE NOT NULL,
      status TEXT CHECK(status IN ('Present','Late','Absent','Leave')),
      hours_worked REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pay_period_start DATE NOT NULL,
      pay_period_end DATE NOT NULL,
      employee_id INTEGER REFERENCES employees(id),
      base_salary REAL NOT NULL,
      bonus REAL DEFAULT 0,
      overtime_pay REAL DEFAULT 0,
      gross_pay REAL NOT NULL,
      tax_deducted REAL NOT NULL,
      other_deductions REAL DEFAULT 0,
      net_pay REAL NOT NULL,
      status TEXT DEFAULT 'Draft',
      processed_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payslips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_id INTEGER REFERENCES payroll(id),
      employee_id INTEGER,
      period_label TEXT,
      gross_pay REAL,
      deductions REAL,
      net_pay REAL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'Generated'
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      issue_type TEXT,
      severity TEXT CHECK(severity IN ('Low','Medium','High','Critical')),
      description TEXT,
      status TEXT DEFAULT 'Open',
      resolution_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      description TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS whistleblower_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      description TEXT,
      status TEXT DEFAULT 'Pending',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );
  `);
  migrateSchema();
}

module.exports = { initializeSchema };
