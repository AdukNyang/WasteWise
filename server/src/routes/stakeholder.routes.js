const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth.middleware");
const createEvidenceUpload = require("../middleware/evidence-upload.middleware");
const { getAssignedReports, addProgressUpdate, markResolved, confirmResolution } = require("../controllers/stakeholder.controller");

const uploadResolutionEvidence = createEvidenceUpload("evidence");

router.get("/assigned", authenticate, authorize("RESPONSIBLE_STAKEHOLDER"), getAssignedReports);
router.post("/reports/:id/progress", authenticate, authorize("RESPONSIBLE_STAKEHOLDER"), addProgressUpdate);
router.patch(
  "/reports/:id/resolve",
  authenticate,
  authorize("RESPONSIBLE_STAKEHOLDER"),
  uploadResolutionEvidence,
  markResolved,
);
router.post("/reports/:id/confirm", authenticate, authorize("COMMUNITY_USER"), confirmResolution);

module.exports = router;
