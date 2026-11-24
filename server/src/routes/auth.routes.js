const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/auth.controller");
const authRateLimit = require("../middleware/auth-rate-limit.middleware");

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);

module.exports = router;
