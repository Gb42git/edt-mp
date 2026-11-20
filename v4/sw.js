// Service worker EDT MP v3 — network-first AVEC TIMEOUT (suite 64) :
// - réseau normal : le serveur prime (version fraîche), comme avant ;
// - réseau lent : après 3 s d'attente, le cache est servi (affichage immédiat) et le
//   réseau continue en arrière-plan pour mettre le cache à jour (MAJ préparée) ;
// - hors ligne : rejet réseau immédiat → cache.
// Les données sont publiées la nuit : la version en cache reste de toute façon exploitable.
const CACHE = 'edt-mp-v4-20261120-2305';
const NET_TIMEOUT = 3000;
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cacheFallback = async () => (await caches.match(e.request)) || new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    const netP = fetch(e.request).then((res) => {
      // Suite 88 : les réponses OPQUES (scripts cross-origin comme le CDN Tailwind,
      // status 0, res.ok=false) sont mises en cache aussi — sinon le mode avion
      // laissait le CSS de côté : page texte brut non stylée.
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => null);
    const timerP = new Promise((res) => setTimeout(() => res('timeout'), NET_TIMEOUT));
    const w = await Promise.race([netP, timerP]);
    if (w === 'timeout') {
      // on sert le cache sans attendre ; le réseau (netP) met le cache à jour en arrière-plan
      return await cacheFallback();
    }
    return w || await cacheFallback();
  })());
});
