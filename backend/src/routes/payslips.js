const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const payslipController = require("../controllers/payslipController");

const router = express.Router();

router.use(verifyToken);
router.post("/generate/:payroll_id", requireRole("admin"), payslipController.generatePayslips);
router.get("/", payslipController.getPayslips);
router.get("/:id/pdf", payslipController.downloadPayslip);

module.exports = router;
