const express = require("express");
const { verifyToken, requireEmployee } = require("../middleware/auth");
const employeeSelfController = require("../controllers/employeeSelfController");

const router = express.Router();
router.use(verifyToken, requireEmployee);

router.get("/attendance/today", employeeSelfController.todayStatus);
router.post("/attendance/check-in", employeeSelfController.checkIn);
router.post("/attendance/check-out", employeeSelfController.checkOut);
router.get("/payslips", employeeSelfController.listMyPayslips);
router.get("/payslips/:id/pdf", employeeSelfController.downloadMyPayslip);

module.exports = router;
