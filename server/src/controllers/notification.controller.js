const { PrismaClient } = require("@prisma/client");
const { getPushConfiguration } = require("../services/push-notification.service");
const { isValidPushEndpoint } = require("../services/push-endpoint-validation.service");

const prisma = new PrismaClient();

const getNotifications = async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Could not load notifications", error: error.message });
  }
};

const getPushConfig = (req, res) => {
  res.json(getPushConfiguration());
};

const savePushSubscription = async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (
    typeof endpoint !== "string"
    || !endpoint.trim()
    || !isValidPushEndpoint(endpoint)
    || typeof keys?.p256dh !== "string"
    || !keys.p256dh
    || typeof keys?.auth !== "string"
    || !keys.auth
  ) {
    return res.status(400).json({ message: "A supported browser push subscription is required" });
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: req.user.id,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: req.user.id,
      },
    });
    res.status(201).json({ message: "Browser notifications enabled" });
  } catch (error) {
    res.status(500).json({ message: "Could not save browser notification settings", error: error.message });
  }
};

const removePushSubscription = async (req, res) => {
  const { endpoint } = req.body || {};
  if (typeof endpoint !== "string" || !endpoint.trim() || !isValidPushEndpoint(endpoint))
    return res.status(400).json({ message: "A supported browser push endpoint is required" });

  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: req.user.id },
    });
    res.json({ message: "Browser notifications disabled" });
  } catch (error) {
    res.status(500).json({ message: "Could not disable browser notifications", error: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    if (!result.count) {
      const notification = await prisma.notification.findFirst({
        where: { id: req.params.id, userId: req.user.id },
        select: { id: true },
      });
      if (!notification) return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Could not update notification", error: error.message });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ message: "Notifications marked as read", count: result.count });
  } catch (error) {
    res.status(500).json({ message: "Could not update notifications", error: error.message });
  }
};

module.exports = {
  getNotifications,
  getPushConfig,
  savePushSubscription,
  removePushSubscription,
  markNotificationRead,
  markAllNotificationsRead,
};
