const express = require("express");
const { verifyToken, requireRole, requireAnyRole } = require("../middleware/auth");
const employeeController = require("../controllers/employeeController");

const router = express.Router();

router.get("/employees", verifyToken, employeeController.getAllEmployees);
router.get("/employees/:id", verifyToken, employeeController.getEmployeeById);
router.post(
  "/employees",
  verifyToken,
  requireAnyRole("admin", "manager"),
  employeeController.createEmployee
);
router.put("/employees/:id", verifyToken, employeeController.updateEmployee);
router.delete(
  "/employees/:id",
  verifyToken,
  requireRole("admin"),
  employeeController.deleteEmployee
);
router.get("/departments", verifyToken, employeeController.getDepartments);

module.exports = router;
