const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { getAssignedReports, addProgressUpdate, markResolved, confirmResolution } = require("../controllers/stakeholder.controller");

router.get("/assigned", authenticate, authorize("RESPONSIBLE_STAKEHOLDER"), getAssignedReports);
router.post("/reports/:id/progress", authenticate, authorize("RESPONSIBLE_STAKEHOLDER"), addProgressUpdate);
router.patch("/reports/:id/resolve", authenticate, authorize("RESPONSIBLE_STAKEHOLDER"), markResolved);
router.post("/reports/:id/confirm", authenticate, confirmResolution);

module.exports = router;
