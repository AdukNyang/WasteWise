const express = require("express");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const {
  getNotifications,
  getPushConfig,
  savePushSubscription,
  removePushSubscription,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notification.controller");

const router = express.Router();

router.use(authenticate, authorize("COMMUNITY_USER"));

router.get("/", getNotifications);
router.get("/push-config", getPushConfig);
router.post("/subscriptions", savePushSubscription);
router.delete("/subscriptions", removePushSubscription);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

module.exports = router;
