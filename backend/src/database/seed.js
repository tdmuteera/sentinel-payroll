const bcrypt = require("bcryptjs");
const db = require("./db");
const { initializeSchema } = require("./schema");

const departments = [
  { name: "Operations", description: "Core operations and logistics" },
  { name: "Engineering", description: "Technical delivery and development" },
  { name: "HR", description: "People and culture management" },
  { name: "Management", description: "Leadership and strategy" },
  { name: "Marketing", description: "Brand and growth initiatives" },
  { name: "Finance", description: "Finance and compliance oversight" },
  { name: "Sales", description: "Revenue and client acquisition" },
];

const employees = [
  ["EMP001", "Tendai Moyo", "Operations", "Operations Officer", 850],
  ["EMP002", "Rumbidzai Chikore", "Engineering", "Software Engineer", 1600],
  ["EMP003", "Farai Ncube", "HR", "HR Specialist", 1100],
  ["EMP004", "Nyasha Dube", "Management", "General Manager", 2500],
  ["EMP005", "Tapiwa Gutu", "Marketing", "Marketing Executive", 1200],
  ["EMP006", "Kudakwashe Sibanda", "Finance", "Accountant", 1400],
  ["EMP007", "Blessing Chiwenga", "Sales", "Sales Representative", 1000],
  ["EMP008", "Tanaka Mlambo", "Operations", "Warehouse Supervisor", 950],
  ["EMP009", "Anesu Chirenje", "Engineering", "QA Analyst", 1300],
  ["EMP010", "Rutendo Hove", "Engineering", "DevOps Engineer", 1700],
  ["EMP011", "Tawanda Mutsvangwa", "HR", "Recruitment Officer", 1050],
  ["EMP012", "Vimbai Marufu", "Management", "Operations Manager", 2200],
  ["EMP013", "Tino Chikandiwa", "Marketing", "Digital Marketer", 1150],
  ["EMP014", "Memory Chisango", "Finance", "Payroll Officer", 1350],
  ["EMP015", "Simbarashe Madzima", "Sales", "Account Executive", 1250],
  ["EMP016", "Tsitsi Muponda", "Operations", "Procurement Officer", 980],
  ["EMP017", "Leonard Zinyama", "Engineering", "Backend Engineer", 1650],
  ["EMP018", "Shamiso Banya", "Finance", "Financial Analyst", 1500],
  ["EMP019", "Nomsa Hlatshwayo", "Sales", "Business Development Officer", 1180],
  ["EMP020", "Tatenda Chari", "HR", "HR Administrator", 980],
];

function dateOnly(d) {
  return d.toISOString().slice(0, 10);
}

function monthBounds(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return [dateOnly(start), dateOnly(end)];
}

async function seedDatabase() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const managerHash = await bcrypt.hash("manager123", 10);
  const existingAdmin = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("admin@sentinel.com");
  const existingManager = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("manager@sentinel.com");

  const insertUser = db.prepare(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)"
  );

  if (!existingAdmin) {
    insertUser.run("System Administrator", "admin@sentinel.com", adminHash, "admin");
  } else {
    db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run(
      adminHash,
      "admin@sentinel.com"
    );
  }

  if (!existingManager) {
    insertUser.run("Payroll Manager", "manager@sentinel.com", managerHash, "manager");
  } else {
    db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run(
      managerHash,
      "manager@sentinel.com"
    );
  }

  const departmentCount = db
    .prepare("SELECT COUNT(*) AS count FROM departments")
    .get().count;
  if (departmentCount === 0) {
    const insertDepartment = db.prepare(
      "INSERT INTO departments (name, description, manager_id) VALUES (?, ?, ?)"
    );
    for (const dept of departments) {
      insertDepartment.run(dept.name, dept.description, 2);
    }
  }

  const allDepartments = db.prepare("SELECT id, name FROM departments").all();
  const departmentMap = Object.fromEntries(allDepartments.map((d) => [d.name, d.id]));

  const employeeCount = db.prepare("SELECT COUNT(*) AS count FROM employees").get().count;
  if (employeeCount === 0) {
    const insertEmployee = db.prepare(
      `INSERT INTO employees
       (employee_code, full_name, department_id, position, base_salary, tax_rate, employment_status, date_joined)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (let i = 0; i < employees.length; i += 1) {
      const [code, fullName, departmentName, position, salary] = employees[i];
      const joinedDate = new Date();
      joinedDate.setMonth(joinedDate.getMonth() - (i + 2));
      joinedDate.setDate((i % 27) + 1);
      insertEmployee.run(
        code,
        fullName,
        departmentMap[departmentName],
        position,
        salary,
        0.2,
        "Active",
        dateOnly(joinedDate)
      );
    }
  }

  const employeeRows = db.prepare("SELECT id, base_salary, tax_rate FROM employees").all();

  const attendanceCount = db
    .prepare("SELECT COUNT(*) AS count FROM attendance")
    .get().count;
  if (attendanceCount === 0) {
    const insertAttendance = db.prepare(
      "INSERT INTO attendance (employee_id, date, status, hours_worked, overtime_hours) VALUES (?, ?, ?, ?, ?)"
    );
    const today = new Date();
    for (const employee of employeeRows) {
      for (let daysBack = 0; daysBack < 30; daysBack += 1) {
        const day = new Date(today);
        day.setDate(today.getDate() - daysBack);
        const weekday = day.getDay();

        let status = "Present";
        let hoursWorked = 8;
        let overtimeHours = 0;

        if (weekday === 0 || weekday === 6) {
          status = "Leave";
          hoursWorked = 0;
        } else if (daysBack % 10 === 0) {
          status = "Late";
          hoursWorked = 7;
          overtimeHours = 1;
        } else if (daysBack % 17 === 0) {
          status = "Absent";
          hoursWorked = 0;
        } else if (daysBack % 6 === 0) {
          overtimeHours = 2;
        }

        insertAttendance.run(
          employee.id,
          dateOnly(day),
          status,
          hoursWorked,
          overtimeHours
        );
      }
    }
  }

  const payrollCount = db.prepare("SELECT COUNT(*) AS count FROM payroll").get().count;
  if (payrollCount === 0) {
    const insertPayroll = db.prepare(
      `INSERT INTO payroll
       (pay_period_start, pay_period_end, employee_id, base_salary, bonus, overtime_pay,
        gross_pay, tax_deducted, other_deductions, net_pay, status, processed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periods = [monthBounds(previousMonth), monthBounds(currentMonth)];

    for (const [start, end] of periods) {
      for (const employee of employeeRows) {
        const bonus = 30 + (employee.id % 4) * 20;
        const overtimePay = (employee.id % 3) * 35;
        const grossPay = employee.base_salary + bonus + overtimePay;
        const taxDeducted = grossPay * employee.tax_rate;
        const otherDeductions = (employee.id % 2) * 15;
        const netPay = grossPay - taxDeducted - otherDeductions;
        insertPayroll.run(
          start,
          end,
          employee.id,
          employee.base_salary,
          bonus,
          overtimePay,
          grossPay,
          taxDeducted,
          otherDeductions,
          netPay,
          "Processed",
          2
        );
      }
    }
  }

  const payslipCount = db.prepare("SELECT COUNT(*) AS count FROM payslips").get().count;
  if (payslipCount === 0) {
    const payrollRows = db
      .prepare(
        "SELECT id, employee_id, pay_period_start, pay_period_end, gross_pay, tax_deducted, other_deductions, net_pay FROM payroll"
      )
      .all();
    const insertPayslip = db.prepare(
      `INSERT INTO payslips
       (payroll_id, employee_id, period_label, gross_pay, deductions, net_pay, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const row of payrollRows) {
      const periodLabel = `${row.pay_period_start} to ${row.pay_period_end}`;
      const deductions = row.tax_deducted + row.other_deductions;
      insertPayslip.run(
        row.id,
        row.employee_id,
        periodLabel,
        row.gross_pay,
        deductions,
        row.net_pay,
        "Generated"
      );
    }
  }

  const feedbackCount = db.prepare("SELECT COUNT(*) AS count FROM feedback").get().count;
  if (feedbackCount === 0) {
    const insertFeedback = db.prepare(
      "INSERT INTO feedback (employee_id, issue_type, severity, description, status, resolution_notes) VALUES (?, ?, ?, ?, ?, ?)"
    );
    insertFeedback.run(3, "Payroll Delay", "High", "Salary reflected two days late.", "Open", null);
    insertFeedback.run(
      9,
      "Attendance Correction",
      "Medium",
      "Missed clock-in needs correction for April 28.",
      "Resolved",
      "Attendance amended by HR."
    );
    insertFeedback.run(
      14,
      "Tax Query",
      "Low",
      "Need clarification on PAYE deduction.",
      "Open",
      null
    );
  }

  const auditCount = db.prepare("SELECT COUNT(*) AS count FROM audit_logs").get().count;
  if (auditCount === 0) {
    const insertAudit = db.prepare(
      "INSERT INTO audit_logs (user_id, action, entity, entity_id, description) VALUES (?, ?, ?, ?, ?)"
    );
    insertAudit.run(1, "CREATE", "user", 2, "Manager account created.");
    insertAudit.run(2, "UPDATE", "attendance", 9, "Corrected attendance record status.");
    insertAudit.run(2, "PROCESS", "payroll", 1, "Processed monthly payroll batch.");
  }

  const reportCount = db
    .prepare("SELECT COUNT(*) AS count FROM whistleblower_reports")
    .get().count;
  if (reportCount === 0) {
    const insertReport = db.prepare(
      "INSERT INTO whistleblower_reports (category, description, status, resolved_at) VALUES (?, ?, ?, ?)"
    );
    insertReport.run(
      "Fraud",
      "Suspicious overtime claims in Sales department.",
      "Pending",
      null
    );
    insertReport.run(
      "Harassment",
      "Anonymous complaint regarding workplace misconduct.",
      "Under Review",
      null
    );
    insertReport.run(
      "Compliance",
      "Possible breach in procurement approval process.",
      "Resolved",
      new Date().toISOString()
    );
  }

  const { upsertEmployeeAccount } = require("../services/employeeAccountService");
  const withoutPortal = db
    .prepare(
      `SELECT e.id FROM employees e
       LEFT JOIN employee_accounts ea ON ea.employee_id = e.id
       WHERE ea.employee_id IS NULL AND e.employment_status = 'Active'`
    )
    .all();
  for (const row of withoutPortal) {
    await upsertEmployeeAccount(row.id, "Employee123!");
  }
}

if (require.main === module) {
  initializeSchema();
  seedDatabase()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log("Database seed complete.");
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Seed failed:", error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
