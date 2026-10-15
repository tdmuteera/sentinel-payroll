const express = require("express");
const { verifyToken, requireAnyRole } = require("../middleware/auth");
const employeeAccessController = require("../controllers/employeeAccessController");

const router = express.Router();
router.use(verifyToken, requireAnyRole("admin", "manager"));

router.get("/", employeeAccessController.listEmployeeAccess);
router.post("/", employeeAccessController.createOrResetAccess);
router.patch("/:employeeId", employeeAccessController.patchEmployeeAccess);

module.exports = router;
