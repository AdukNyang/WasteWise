const { rateLimit } = require("express-rate-limit");

const createAuthRateLimit = ({ limit = 10, windowMs = 15 * 60 * 1000 } = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many sign-in or registration attempts. Try again in 15 minutes." },
  });

module.exports = createAuthRateLimit();
module.exports.createAuthRateLimit = createAuthRateLimit;
