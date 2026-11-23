// Service worker EDT MP v3 — network-first AVEC TIMEOUT (suite 64) :
// - réseau normal : le serveur prime (version fraîche), comme avant ;
// - réseau lent : après 3 s d'attente, le cache est servi (affichage immédiat) et le
//   réseau continue en arrière-plan pour mettre le cache à jour (MAJ préparée) ;
// - hors ligne : rejet réseau immédiat → cache.
// Les données sont publiées la nuit : la version en cache reste de toute façon exploitable.
const CACHE = 'edt-mp-v3-20261123-1849';
const NET_TIMEOUT = 3000;
// SUITE 128 : page hors ligne lisible (mode avion avec cache vide — REMPLACE le texte brut
// « Hors ligne » sur fond noir). Uniquement pour les navigations ; la gate et les assets
// pré-cachés (install) rendent ce cas rare : plus souvent il survient juste après une mise
// à jour du SW, avant le premier rechargement en ligne de la page.
const OFFLINE_HTML = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hors ligne</title><style>html,body{height:100%}body{background:#0f172a;color:#cbd5e1;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;margin:0;text-align:center}div{max-width:30em;padding:1.2em;line-height:1.5}.h{font-size:1.15em;color:#f1f5f9;margin-bottom:.5em}a{color:#93c5fd}</style></head><body><div><div class="h">✈ Hors ligne</div>Aucune version de l application n est encore en cache sur cet appareil.<br>Reconnectez-vous au réseau puis rechargez la page : l application reprendra alors ses données synchronisées.</div></body></html>';
self.addEventListener('install', (e) => e.waitUntil((async () => {
  // SUITE 128 : PRÉ-REMPLISSAGE du cache dès l installation — la publication SW arrive
  // pendant une visite EN LIGNE, donc le téléchargement de la gate et des assets réussit ;
  // ensuite le mode avion recharge la page depuis ce cache, même avant tout autre
  // rechargement en ligne. Chaque entrée est indépendante (un échec n'annule pas les autres,
  // contrairement à cache.addAll) et n'écrase jamais une entrée déjà fraîche.
  try {
    const c = await caches.open(CACHE);
    const PRELOAD = ['./', './manifest.json', './icon-192.png', './icon-512.png', './icon-m-192.png', './icon-m-512.png'];
    await Promise.all(PRELOAD.map(async (u) => {
      if (await c.match(u)) return;
      try {
        const r = await fetch(new Request(u, { credentials: 'same-origin' }));
        if (r && (r.ok || r.type === 'opaque')) await c.put(u, r.clone());
      } catch (err) { /* hors ligne à l install : la page OFFLINE_HTML prend le relais */ }
    }));
  } catch (err) { /* le SW reste fonctionnel même si le pré-remplissage échoue */ }
  self.skipWaiting();
})()));
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  // Suite 106 : purge des ANCIENNES estampilles de la même variante (v4 estampillé à chaque
  // publication). Sans ça, caches.match() trouve l'ancienne gate d'abord (ordre de création)
  // et le repli hors ligne/réseau lent servait la publication PRÉCÉDENTE ; et un cache de
  // ~2,2 Mo s'accumulait par publication. Filtre sur le préfixe de la variante : les caches
  // v2/v3 (noms constants) et des autres variantes ne sont JAMAIS touchés.
  const PREFIX = String(CACHE).replace(/-\d{8}-\d+$/, '');
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k !== CACHE && k.startsWith(PREFIX)).map((k) => caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    // SUITE 128 : repli double — page hors ligne stylée pour une NAVIGATION sans cache
    // (mode avion avant première visite en ligne du nouveau SW), texte brut 503 sinon.
    const cacheFallback = async () => {
      const hit = await caches.match(e.request);
      if (hit) return hit;
      if (e.request.mode === 'navigate') return new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      return new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    };
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
