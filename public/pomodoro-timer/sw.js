const version = new URL(location).searchParams.get("version") || "dev";
const CACHE_NAME = `pomodoro-timer-cache-${version}`;

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll([
                "/",
                "/index.html",
                "/css/styles.css",
                "/js/404.js",
                "/js/idb-helper.js",
                "/js/scripts.js",
                "/manifest.json",
                "/lib/idb.js",
                "/pomodoro-timer/index.html",
                "/pomodoro-timer/styles.css",
                "/pomodoro-timer/scripts.js",
                "/pomodoro-timer/manifest.json",
                "/pomodoro-timer/sw.js",
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