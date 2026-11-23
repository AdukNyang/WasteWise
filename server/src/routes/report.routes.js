const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth.middleware");
const createEvidenceUpload = require("../middleware/evidence-upload.middleware");
const {
  acceptFollowUp,
  getFollowUpStatus,
  submitReport,
  getMyReports,
  getReportById,
} = require("../controllers/report.controller");

const uploadReportEvidence = createEvidenceUpload("photo");

router.post("/", authenticate, uploadReportEvidence, submitReport);
router.get("/my", authenticate, getMyReports);
router.get("/:id/follow-up", authenticate, getFollowUpStatus);
router.post("/:id/follow-up/accept", authenticate, authorize("COMMUNITY_USER"), acceptFollowUp);
router.get("/:id", authenticate, getReportById);

module.exports = router;
