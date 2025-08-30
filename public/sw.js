const CACHE_NAME = "telepaty-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/favicon_dark.jpg",
  "/favicon_light.jpg",
  "/dark_icon/favicon.ico",
  "/dark_icon/android-chrome-512x512.png",
  "/dark_icon/android-chrome-192x192.png",
  "/dark_icon/apple-touch-icon.png",
  "/dark_icon/favicon-32x32.png",
  "/dark_icon/favicon-16x16.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching assets...");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Deleting old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
