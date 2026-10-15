const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const whistleblowerController = require("../controllers/whistleblowerController");

const router = express.Router();

router.post("/", whistleblowerController.submitReport);
router.get("/", verifyToken, requireRole("admin"), whistleblowerController.getReports);
router.put(
  "/:id/status",
  verifyToken,
  requireRole("admin"),
  whistleblowerController.updateReportStatus
);

module.exports = router;
