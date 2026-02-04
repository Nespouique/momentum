// Service worker for Momentum
// Handles scheduled rest timer notifications and notification clicks

let scheduledTimer = null;
let scheduledResolve = null;

// Activate immediately — don't wait for old tabs to close
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Schedule a notification to fire at a specific timestamp
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SCHEDULE_NOTIFICATION") {
    // Clear any previous scheduled notification
    if (scheduledTimer) {
      clearTimeout(scheduledTimer);
      scheduledTimer = null;
      // Resolve previous waitUntil promise so it doesn't block
      if (scheduledResolve) {
        scheduledResolve();
        scheduledResolve = null;
      }
    }

    const delay = event.data.restEndAt - Date.now();
    if (delay <= 0) return;

    // waitUntil keeps the service worker alive until the notification fires
    event.waitUntil(
      new Promise((resolve) => {
        scheduledResolve = resolve;
        scheduledTimer = setTimeout(() => {
          scheduledTimer = null;
          scheduledResolve = null;
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
      if (scheduledResolve) {
        scheduledResolve();
        scheduledResolve = null;
      }
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow("/");
    })
  );
});
