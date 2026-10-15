const express = require("express");
const { verifyToken } = require("../middleware/auth");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

router.get("/stats", verifyToken, dashboardController.getDashboardStats);

module.exports = router;
