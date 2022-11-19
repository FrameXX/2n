const static2nCache = "static2nCache";
const assets = ["/", "/index.html", "/manifest.json", "/audio/join.ogg", "/audio/stuck.ogg", "/audio/undo.ogg", "/fonts/Exo2-Italic.woff", "/fonts/Exo2-Italic.woff2", "/fonts/Exo2-Regular.woff", "/fonts/Exo2-Regular.woff2"];

self.addEventListener("install", installEvent => {
    installEvent.waitUntil(
      caches.open(static2nCache).then(cache => {
        cache.addAll(assets);
      })
    )
})

self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
      caches.match(fetchEvent.request).then(response => {
        return response || fetch(fetchEvent.request)
      })
    )
  })