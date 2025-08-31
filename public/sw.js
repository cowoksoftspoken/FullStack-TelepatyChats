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
  const url = new URL(event.request.url);

  if (url.origin === location.origin) {
    if (
      ASSETS_TO_CACHE.includes(url.pathname) ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".ico")
    ) {
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          return (
            cachedResponse ||
            fetch(event.request).then(async (networkResponse) => {
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            })
          );
        })
      );
    }
  }
});
