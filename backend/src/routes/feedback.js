const express = require("express");
const { verifyToken } = require("../middleware/auth");
const feedbackController = require("../controllers/feedbackController");

const router = express.Router();

router.use(verifyToken);
router.get("/", feedbackController.getFeedback);
router.post("/", feedbackController.createFeedback);
router.put("/:id", feedbackController.updateFeedback);

module.exports = router;
