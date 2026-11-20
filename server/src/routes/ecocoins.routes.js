const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { getWallet, redeemCoins } = require("../controllers/ecocoins.controller");

router.get("/wallet", authenticate, authorize("COMMUNITY_USER"), getWallet);
router.post("/redeem", authenticate, authorize("COMMUNITY_USER"), redeemCoins);

module.exports = router;
