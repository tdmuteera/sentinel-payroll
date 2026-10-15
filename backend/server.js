require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const { initializeSchema } = require("./src/database/schema");
const { seedDatabase } = require("./src/database/seed");

const authRoutes = require("./src/routes/auth");
const employeeRoutes = require("./src/routes/employees");
const attendanceRoutes = require("./src/routes/attendance");
const payrollRoutes = require("./src/routes/payroll");
const payslipRoutes = require("./src/routes/payslips");
const feedbackRoutes = require("./src/routes/feedback");
const auditRoutes = require("./src/routes/audit");
const whistleblowerRoutes = require("./src/routes/whistleblower");
const dashboardRoutes = require("./src/routes/dashboard");
const managerRoutes = require("./src/routes/manager");

const app = express();
const port = Number(process.env.PORT) || 5000;

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://localhost:4174",
  "http://localhost:5000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:4174",
  "http://127.0.0.1:5000",
];

const extraOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultOrigins, ...extraOrigins]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === "null" || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/payslips", payslipRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/whistleblower", whistleblowerRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/employee-self", require("./src/routes/employeeSelf"));
app.use("/api/employee-access", require("./src/routes/employeeAccess"));

const publicDir = path.join(__dirname, "public");
const indexHtml = path.join(publicDir, "index.html");
const hasFrontend = fs.existsSync(indexHtml);

// eslint-disable-next-line no-console
console.log(`Frontend bundle: dir=${publicDir} exists=${hasFrontend}`);

if (hasFrontend) {
  app.use(express.static(publicDir, { index: false }));

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(indexHtml);
  });
}

let httpServer = null;

async function bootstrap() {
  if (httpServer) {
    return;
  }
  initializeSchema();
  await seedDatabase();
  await new Promise((resolve, reject) => {
    try {
      httpServer = app.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`Sentinel Pay Roll backend running on port ${port}`);
        resolve();
      });
      httpServer.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
}

function shutdown() {
  if (!httpServer) {
    return;
  }
  try {
    httpServer.close();
  } catch {
    /* ignore */
  }
  httpServer = null;
}

module.exports = { app, bootstrap, shutdown };

if (require.main === module) {
  bootstrap().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Startup failed:", error);
    process.exit(1);
  });
}
