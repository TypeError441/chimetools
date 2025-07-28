const version = new URL(location).searchParams.get("version") || "dev";
const CACHE_NAME = `mp3-metadata-tagger-cache-${version}`;

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll([
                "/",
                "/mp3-metadata-tagger/index.html",
                "/mp3-metadata-tagger/styles.css",
                "/mp3-metadata-tagger/scripts.js",
                "/mp3-metadata-tagger/manifest.json",
                "/mp3-metadata-tagger/sw.js",
                "/mp3-metadata-tagger/lib/mp3tag.min.js",
                "/lib/jquery-3.7.1.slim.js",
            ])
        ).catch(err => {
            console.error("Service worker install failed to cache resources:", err);
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(resp => resp || fetch(event.request))
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
        Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
        )
    );
});