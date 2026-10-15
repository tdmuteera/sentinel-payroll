const express = require("express");
const { verifyToken } = require("../middleware/auth");
const auditController = require("../controllers/auditController");

const router = express.Router();

router.use(verifyToken);
router.get("/", auditController.getAuditLogs);

module.exports = router;
