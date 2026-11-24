self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(self.registration.showNotification(payload.title || "WasteWise", {
    body: payload.body || "You have a new update about your report.",
    icon: "/favicon.svg",
    tag: payload.tag || "wastewise-update",
    data: { url: payload.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedDestination = new URL(event.notification.data?.url || "/", self.location.origin);
  const destination = requestedDestination.origin === self.location.origin
    ? requestedDestination.href
    : self.location.origin;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const appWindow = windows.find((window) => window.url.startsWith(self.location.origin));
    if (appWindow) {
      return appWindow.navigate(destination).then((navigatedWindow) => (
        navigatedWindow || appWindow
      ).focus());
    }
    return clients.openWindow(destination);
  }));
});
