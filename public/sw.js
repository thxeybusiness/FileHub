// Service worker minimal : rend l'app installable et sert une page hors ligne
// pour la coquille. On ne met pas en cache les réponses API (contenu privé).
const CACHE = "filehub-v1";
const SHELL = ["/", "/drive"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Jamais mettre en cache l'API ni les fichiers privés.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations : réseau d'abord, repli sur le cache si hors ligne.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r || caches.match("/drive"))),
    );
    return;
  }

  // Autres GET (assets) : cache d'abord puis réseau.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
