// Minimal service worker for Momentum
// Purpose: enable ServiceWorkerRegistration.showNotification() on mobile Chrome

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Focus or open the app when notification is clicked
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow("/");
    })
  );
});
