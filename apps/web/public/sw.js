// Service worker for Momentum
// Handles scheduled rest timer notifications and notification clicks

let scheduledTimer = null;
let scheduledResolve = null;
let restEndAtTarget = null;

// Activate immediately — don't wait for old tabs to close
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function cancelScheduledTimer() {
  if (scheduledTimer) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }
  if (scheduledResolve) {
    scheduledResolve();
    scheduledResolve = null;
  }
  restEndAtTarget = null;
}

function formatTime(ms) {
  const totalSec = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m + ":" + String(s).padStart(2, "0");
}

// Schedule a notification to fire at a specific timestamp
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SCHEDULE_NOTIFICATION") {
    // Cancel any previous scheduled notification
    cancelScheduledTimer();

    const { restEndAt, title, body } = event.data;
    const delay = restEndAt - Date.now();
    if (delay <= 0) return;

    restEndAtTarget = restEndAt;

    // Show immediate "ongoing" notification (silent — no sound/vibration)
    // This ensures the user sees *something* even if Android freezes Chrome later
    self.registration.showNotification("Repos en cours", {
      body: formatTime(delay) + " restantes",
      tag: "momentum-timer",
      icon: "/icon-192.png",
      silent: true,
      requireInteraction: true,
    });

    // Keep-alive loop: check every few seconds instead of a single long setTimeout.
    // Short periodic timeouts keep the SW active and reduce the chance of Chrome
    // considering it idle and terminating it.
    event.waitUntil(
      new Promise((resolve) => {
        scheduledResolve = resolve;

        function check() {
          const remaining = restEndAtTarget - Date.now();

          if (remaining <= 0) {
            // Time's up — show completion notification with sound + vibration
            scheduledTimer = null;
            scheduledResolve = null;
            restEndAtTarget = null;
            self.registration
              .showNotification(title || "Repos terminé !", {
                body: body || "C'est reparti !",
                tag: "momentum-timer",
                icon: "/icon-192.png",
                renotify: true,
                requireInteraction: false,
                vibrate: [200, 100, 200, 100, 300],
              })
              .then(resolve, resolve);
            return;
          }

          // Check more frequently as we approach the target (1s for last 10s, 5s otherwise)
          const interval = remaining <= 10000 ? 1000 : 5000;
          scheduledTimer = setTimeout(check, Math.min(interval, remaining));
        }

        check();
      })
    );
  } else if (event.data && event.data.type === "CANCEL_NOTIFICATION") {
    cancelScheduledTimer();
    // Close any displayed notification with our tag
    self.registration
      .getNotifications({ tag: "momentum-timer" })
      .then((notifications) => {
        notifications.forEach((n) => n.close());
      });
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
