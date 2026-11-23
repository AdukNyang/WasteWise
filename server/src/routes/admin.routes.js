const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth.middleware");
const {
  getAllReports,
  getStakeholders,
  verifyReport,
  groupDuplicates,
  assignReport,
  findDuplicates,
} = require("../controllers/admin.controller");

router.use(authenticate, authorize("ADMINISTRATOR"));

router.get("/reports", getAllReports);
router.get("/stakeholders", getStakeholders);
router.patch("/reports/:id/verify", verifyReport);
router.post("/reports/group-duplicates", groupDuplicates);
router.post("/reports/:id/assign", assignReport);
router.get("/reports/duplicates", findDuplicates);

module.exports = router;
