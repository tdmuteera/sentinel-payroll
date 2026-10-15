const express = require("express");
const { verifyToken } = require("../middleware/auth");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/login", authController.login);
router.get("/me", verifyToken, authController.getMe);

router.get("/employee/departments", authController.listDepartmentsForEmployeeLogin);
router.get("/employee/directory", authController.listEmployeesForEmployeeLogin);
router.post("/employee/login", authController.employeeLogin);

module.exports = router;
