// Service worker for Momentum
// Handles notifications (including scheduled rest timer notifications) and click events

let scheduledTimer = null;

// Schedule a notification to fire at a specific timestamp
// Uses event.waitUntil to keep the SW alive until the notification fires
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SCHEDULE_NOTIFICATION") {
    // Clear any previous scheduled notification
    if (scheduledTimer) {
      clearTimeout(scheduledTimer);
      scheduledTimer = null;
    }

    const delay = event.data.restEndAt - Date.now();
    if (delay <= 0) return;

    // waitUntil keeps the service worker alive until the promise resolves
    event.waitUntil(
      new Promise((resolve) => {
        scheduledTimer = setTimeout(() => {
          scheduledTimer = null;
          self.registration
            .showNotification(event.data.title || "Repos terminé !", {
              body: event.data.body || "C'est reparti !",
              tag: "momentum-timer",
              renotify: true,
              requireInteraction: false,
            })
            .then(resolve, resolve);
        }, delay);
      })
    );
  } else if (event.data && event.data.type === "CANCEL_NOTIFICATION") {
    if (scheduledTimer) {
      clearTimeout(scheduledTimer);
      scheduledTimer = null;
    }
  }
});

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
