const static2nCache = "static2nCache";
const assets = [
  "/2n/", 
  "/2n/index.html", 
  "/2n/manifest.json", 
  "/2n/audio/join.ogg", 
  "/2n/audio/stuck.ogg", 
  "/2n/audio/undo.ogg", 
  "/2n/fonts/Exo2-Italic.woff", 
  "/2n/fonts/Exo2-Italic.woff2", 
  "/2n/fonts/Exo2-Regular.woff", 
  "/2n/fonts/Exo2-Regular.woff2"
];

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