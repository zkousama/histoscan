const CACHE_NAME = "histoscan-cache-v3"
const urlsToCache = ["/", "/login", "/dashboard", "/history", "/upload", "/result"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache")
      // Don't try to cache icons that are failing
      return Promise.all(
        urlsToCache.map((url) => {
          return cache.add(url).catch((err) => {
            console.error("Failed to cache:", url, err)
            // Continue even if one URL fails
            return Promise.resolve()
          })
        }),
      )
    }),
  )
})

self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests, API calls, and supabase calls
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("supabase") ||
    event.request.url.includes("histoscan.onrender.com") ||
    event.request.url.includes("icons/icon-")
  ) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response
      }

      // Clone the request
      const fetchRequest = event.request.clone()

      return fetch(fetchRequest)
        .then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          caches
            .open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache)
            })
            .catch((err) => {
              console.error("Failed to cache response:", err)
            })

          return response
        })
        .catch((error) => {
          console.error("Fetch failed:", error)
          // Return any cached response or a fallback
          return (
            caches.match("/") ||
            new Response("Network error occurred", {
              status: 408,
              headers: { "Content-Type": "text/plain" },
            })
          )
        })
    }),
  )
})

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName)
          }
          return Promise.resolve()
        }),
      )
    }),
  )
})
