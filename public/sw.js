self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  let data = {
    title: "AP Creative Dashboard",
    body: "You have a new dashboard notification.",
    url: "/",
  };

  if (event.data) {
    try {
      data = {
        ...data,
        ...event.data.json(),
      };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: {
        url: data.url || "/",
      },
    }),
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clients) {
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
