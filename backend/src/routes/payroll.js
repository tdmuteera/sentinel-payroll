const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const payrollController = require("../controllers/payrollController");

const router = express.Router();

router.use(verifyToken);
router.post("/run", requireRole("admin"), payrollController.runPayroll);
router.get("/stats", payrollController.getPayrollStats);
router.get("/", payrollController.getPayroll);
router.get("/:id", payrollController.getPayrollById);
router.put("/:id/approve", requireRole("admin"), payrollController.approvePayroll);

module.exports = router;
