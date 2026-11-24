const webPush = require("web-push");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
let configured = false;

const getPushConfiguration = () => ({
  enabled: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  publicKey: process.env.VAPID_PUBLIC_KEY || null,
});

const configureWebPush = () => {
  const { enabled } = getPushConfiguration();
  if (!enabled) return false;
  if (!configured) {
    webPush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:notifications@example.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
    configured = true;
  }
  return true;
};

const sendPushNotification = async (userId, payload) => {
  if (!configureWebPush()) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
      );
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await prisma.pushSubscription.deleteMany({ where: { endpoint: subscription.endpoint } });
        return;
      }
      console.error("Browser push delivery failed", {
        userId,
        statusCode: error.statusCode,
        message: error.message,
      });
    }
  }));
};

module.exports = { getPushConfiguration, sendPushNotification };
