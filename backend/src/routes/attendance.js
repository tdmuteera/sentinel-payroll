const express = require("express");
const { verifyToken } = require("../middleware/auth");
const attendanceController = require("../controllers/attendanceController");

const router = express.Router();

router.use(verifyToken);

router.get("/", attendanceController.getAttendance);
router.post("/", attendanceController.createAttendance);
router.post("/bulk", attendanceController.bulkAttendance);
router.put("/:id", attendanceController.updateAttendance);
router.get("/summary", attendanceController.getAttendanceSummary);

module.exports = router;
