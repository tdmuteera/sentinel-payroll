const express = require("express");
const { verifyToken } = require("../middleware/auth");
const managerController = require("../controllers/managerController");

const router = express.Router();

function requireManagerOrAdmin(req, res, next) {
  const role = req.user?.role;
  if (role === "manager" || role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden" });
}

router.get("/dashboard", verifyToken, requireManagerOrAdmin, managerController.getManagerDashboard);

module.exports = router;
