const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticate } = require("../middleware/auth.middleware");
const { submitReport, getMyReports, getReportById } = require("../controllers/report.controller");

const upload = multer({ dest: "uploads/" });

router.post("/", authenticate, upload.single("photo"), submitReport);
router.get("/my", authenticate, getMyReports);
router.get("/:id", authenticate, getReportById);

module.exports = router;
