const {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} = React;

// Bilan de charge : réservé à la version privée (v4). Le build public (v2/v3)
// passe EDT_BILAN=0 à extract.js qui remplace ce true par false (bouton masqué).
const BILAN_ENABLED = false;
// Suite 92 : « Synthèse personnelle » (Σ sur le favori enseignant, SUITE 108 multi-collègues) — v4 seule,
// le build public (v2/v3) passe EDT_PERSO=0 qui remplace ce true par false.
const PERSO_ENABLED = false;
const HELP_LONG = false; // SUITE 98 : long texte d'aide « Agendas empilables… » sous les favoris ; substitué à false pour la v2 au build (EDT_HELP=0 dans variant.js)
// SUITE 132 : mode KIOSK « /tv/ » — écran suspendu du département (1920×1080, sans souris
// ni clavier). KIOSK=true remplace TOUT le chrome applicatif par Kiosk132 (deux grilles
// ½ journée, colonnes = groupes FEUILLES, fusion des créneaux communs, halo horloge,
// masquage auto des promos absentes). Les variants applicatifs passent EDT_KIOSK=0.
const KIOSK = false;
// Suite 64 : proposeur de réorganisation (« ⇄ Déplacer ce créneau ») — v3/v4 uniquement
// (v2 publique inchangée : EDT_REPLAN=0 au build remplace par false).
const REPLAN_ENABLED = false;
// Suite 75d : le RSS enseignants/salles est RETIRÉ de toutes les versions — les agendas
// enseignants et salles vivent uniquement des flux ICS rechargés par « ↻ Rafr. ».

// Relais CORS des flux ICS ADE (Cloudflare Worker, cf. worker-proxy.js) :
// le navigateur ne peut pas lire planning.univ-st-etienne.fr directement (CORS) ;
// ce Worker le relaie en temps réel (cache Edge 60 s max), liste blanche stricte ADE /jsp/*.
const PROXY_URL = "https://edt-mp-proxy.guilhem-bordes.workers.dev/?url=";
// Les 9 flux ICS officiels du département (anonymes, fournis par ADE — cf. flux-ics-promos-2026-2027.md).
// Préconfigurés et non retirables : « ↻ Rafr. » les retélécharge via le proxy et RECONSTRUIT
// les créneaux de chaque promo (les suppressions/déplacements ADE sont propagés).
const KNOWN_FEEDS = [{
  name: "BUT1",
  promo: "MP-1A",
  url: "https://planning.univ-st-etienne.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?data=f249ced4b5a7cf132c85f1638794f7344592592d3b282f749c9a606b710f264fdc5c094f7d1a811b903031bde802c7f5b694fc02f6e8baba618938e0589365d27f69273da8b492dad624eb9be7f0b0a7166c54e36382c1aa3eb0ff5cb8980cdb,1"
}, {
  name: "BUT2",
  promo: "MP-2A",
  url: "https://planning.univ-st-etienne.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?data=3c77ccedf8fcd4744f2327b83e3ca6674592592d3b282f749c9a606b710f264fdc5c094f7d1a811b903031bde802c7f5b694fc02f6e8baba618938e0589365d27f69273da8b492dad624eb9be7f0b0a7166c54e36382c1aa3eb0ff5cb8980cdb,1"
}, {
  name: "BUT2 ALT",
  promo: "MP-2A-ALT",
  url: "https://planning.univ-st-etienne.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?data=29b5d7709fe46025cb3c5ce2e11c36a24592592d3b282f749c9a606b710f264fdc5c094f7d1a811b903031bde802c7f5b694fc02f6e8baba618938e0589365d27f69273da8b492dad624eb9be7f0b0a7166c54e36382c1aa3eb0ff5cb8980cdb,1"
}, {
  name: "BUT3 MAE",
  promo: "MP-3A-MAE",
  url: "https://planning.univ-st-etienne.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?data=5a9f21738659314538f37fa192104d174592592d3b282f749c9a606b710f264fdc5c094f7d1a811b903031bde802c7f5b694fc02f6e8baba618938e0589365d27f69273da8b492dad624eb9be7f0b0a7166c54e36382c1aa3eb0ff5cb8980cdb,1"
}, {
  name: "BUT3 AVTECH",
  promo: "MP-3A-AVTECH",
  url: "https://planning.univ-st-etienne.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?data=2a2a9d8998c9e29a3ef6d6ceb7fd829c4592592d3b282f749c9a606b710f264fdc5c094f7d1a811b903031bde802c7f5b694fc02f6e8baba618938e0589365d27f69273da8b492dad624eb9be7f0b0a7166c54e36382c1aa3eb0ff5cb8980cdb,1"
}, {
  name: "BUT3 TVM",
  promo: "MP-3A-TECHVIMAT",
  url: "https://planning.univ-st-etienne.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?data=b9fdb92ddd22d9ef5c340ee467b83d7c4592592d3b282f749c9a606b710f264fdc5c094f7d1a811b903031bde802c7f5b694fc02f6e8baba618938e0589365d27f69273da8b492dad624eb9be7f0b0a7166c54e36382c1aa3eb0ff5cb8980cdb,1"
}, {
  name: "CiTiSE 1",
  promo: "CiTiSE1-IUTD",
  url: "https://planning.univ-st-etienne.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?data=4abd817a71a28fddc1ebc8c0967eadfe4592592d3b282f749c9a606b710f264fdc5c094f7d1a811b903031bde802c7f5b694fc02f6e8baba618938e0589365d27f69273da8b492dad624eb9be7f0b0a7166c54e36382c1aa3eb0ff5cb8980cdb,1"
}, {
  name: "CiTiSE 2",
  promo: "CiTiSE2-IUTD",
  url: "https://planning.univ-st-etienne.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?data=9d928d6eb2b001105b49ef1be0cec4664592592d3b282f749c9a606b710f264fdc5c094f7d1a811b903031bde802c7f5b694fc02f6e8baba618938e0589365d27f69273da8b492dad624eb9be7f0b0a7166c54e36382c1aa3eb0ff5cb8980cdb,1"
},
// « Événements MP » : créneaux sans étudiants (soutenances, périodes d'alternance…) → enseignants seulement.
{
  name: "Événements MP",
  promo: null,
  url: "https://planning.univ-st-etienne.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?data=4a305eb6f3763e59119f798fe0e359e9292fa4c04d77640dd7ddb2dc00c8e1c4692613b21192e5f0e0b7c5a5601c933d35be67f46793f4734fa1410c05d8607c948e9dda38cfde1596c3ee1fba469211314d669fae9ca422200cb711a9b76537,1"
}];
// Flux officiels ÉDITABLES SANS REBUILD : le fichier publié « feeds-<année>.json » est relu
// à chaque chargement (?v= court-circuite le cache du service worker). SUITE 107 (cloison-
// nement par année) : l'année scolaire N commence le 1er août (anticipation de la rentrée).
// L'appli lit d'abord feeds-<N>.json (N = année courante) ; si l'année N n'est pas encore
// publiée (absent/cassé/invalide), elle se replie sur feeds-<DATA_YEAR>.json (année de la
// présente publication) avec un bandeau explicite dans l'onglet Flux ; en dernier recours le
// secours KNOWN_FEEDS embarqué reste en place, comme avant. En 2026-2027, SCHOOL_YEAR ===
// DATA_YEAR : un seul et même fichier, comportement strictement inchangé.
const DATA_YEAR = "2026-2027"; // année des flux secours embarqués (KNOWN_FEEDS) et de la base publiée
const schoolYearOf = d => {
  const y = d.getFullYear();
  return d.getMonth() >= 7 ? y + "-" + (y + 1) : y - 1 + "-" + y;
}; // getMonth() janvier=0 : août (7) → bascule sur l'année scolaire suivante
const SCHOOL_YEAR = schoolYearOf(new Date()); // année N (l'année change automatiquement le 1er août)
const feedsUrlOf = y => "https://gb42git.github.io/edt-mp/feeds-" + y + ".json";
const FEEDS_JSON_URL = feedsUrlOf(SCHOOL_YEAR); // année courante par défaut (suite 107)
const FEEDS_FALLBACK_URL = feedsUrlOf(DATA_YEAR); // repli si l'année N n'est pas encore publiée

// ---- SUITE 111 : clôture automatique d'année (premier chargement après le 1er août).
// Si le marqueur edt2-year (posé à chaque synchro) désigne l'année PRÉCÉDENTE, on fige
// un instantané complet dans edt2-archive-<année> (clé JAMAIS purgée, JAMAIS retouchée,
// idempotente : si elle existe déjà on ne fait rien) puis on purge les caches annuels
// reconstruisables — sinon le premier ↻ de l'année nouvelle afficherait un diff fantôme
// massif « créneaux supprimés » (les flux ont déjà basculé sur l'année suivante).
try {
  const prevYear111 = localStorage.getItem("edt2-year");
  if (prevYear111 && prevYear111 !== SCHOOL_YEAR && !localStorage.getItem("edt2-archive-" + prevYear111)) {
    const ARCH111 = ["edt2-slots", "edt2-teachers", "edt2-rooms", "edt2-virtf", "edt2-sources", "edt2-sync", "edt2-etag", "edt2-feederrs", "edt2-diff"];
    const snap111 = {
      year: prevYear111,
      closedAt: new Date().toISOString()
    };
    ARCH111.forEach(k => {
      const v = localStorage.getItem(k);
      if (v !== null) snap111[k] = v;
    });
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (typeof k === "string" && k.indexOf("edt2-events") === 0) snap111[k] = localStorage.getItem(k);
    }
    localStorage.setItem("edt2-archive-" + prevYear111, JSON.stringify(snap111));
    ARCH111.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    });
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (typeof k === "string" && k.indexOf("edt2-events") === 0) localStorage.removeItem(k);
    }
    localStorage.setItem("edt2-year", SCHOOL_YEAR);
  } else if (!prevYear111) {
    localStorage.setItem("edt2-year", SCHOOL_YEAR);
  }
} catch (e) {/* stockage indisponible : la suite 83 signalera dans l'onglet Flux */}

// ---------- Promotions du département Mesures Physiques ----------
const PROMOS = {
  "MP-1A": {
    label: "BUT1",
    short: "B1",
    tree: {
      "MP-1A": ["A", "B", "C", "D"],
      A: ["A1-6", "A7-12"],
      B: ["B1-6", "B7-12"],
      C: ["C1-6", "C7-12"],
      D: ["D1-6", "D7-12", "D13-18"]
    },
    chips: [{
      label: "TD",
      items: ["A", "B", "C", "D"]
    }, {
      label: "TP",
      items: ["A1-6", "A7-12", "B1-6", "B7-12", "C1-6", "C7-12", "D1-6", "D7-12", "D13-18"]
    }],
    tdRoots: ["A", "B", "C", "D"],
    optRoots: null,
    defaultCols: ["A", "B", "C", "D"]
  },
  "MP-2A": {
    label: "BUT2",
    short: "B2",
    // Arborescence ADE (capture 15/11) : TD MAE est le groupe de TD de l'option MAE, sous MCPC.
    // Une ressource posée sur un parent se propage aux enfants (ex. Devoir Matériaux MCPC → EA1).
    tree: {
      "MP-2A": ["TI", "MCPC", "MAE"],
      TI: ["TA"],
      MCPC: ["MA", "MB", "MAE"],
      MAE: ["EA"],
      TA: ["TA1"],
      MA: ["MA1", "MA2"],
      MB: ["MB3"],
      EA: ["EA1"]
    },
    chips: [{
      label: "Option",
      items: ["TI", "MAE", "MCPC"],
      gap: true
    }, {
      label: "TD",
      items: ["TA|EA", "MA", "MB"]
    }, {
      label: "TP",
      items: ["TA1", "EA1", "MA1", "MA2", "MB3"],
      row: true
    }],
    tdRoots: ["TA", "MA", "MB", "EA"],
    optRoots: ["TI", "MCPC", "MAE"],
    defaultCols: ["TA", "MA", "MB", "EA"]
  },
  "MP-2A-ALT": {
    label: "BUT2 ALT",
    short: "B2alt",
    tree: {
      "MP-2A-ALT": ["ALT1", "ALT2"]
    },
    chips: [{
      label: "TD",
      items: ["ALT1", "ALT2"]
    }],
    tdRoots: ["ALT1", "ALT2"],
    optRoots: null,
    defaultCols: ["ALT1", "ALT2"]
  },
  "MP-3A-MAE": {
    label: "BUT3 MAE",
    short: "B3mae",
    tree: {
      "MP-3A-MAE": ["INI", "ALT", "ALT1", "ALT2"]
    },
    chips: [{
      label: "TP",
      items: ["INI", "ALT1", "ALT2"]
    }],
    // suite 81 : MAE — INI/ALT1/ALT2 = groupes de TP (TD posés sur la promo entière, titre « (TD) »)
    tdRoots: ["INI", "ALT", "ALT1", "ALT2"],
    optRoots: null,
    defaultCols: ["INI", "ALT1", "ALT2"]
  },
  "MP-3A-TECHVIMAT": {
    label: "BUT3 TVM",
    short: "B3tvm",
    tree: {
      "MP-3A-TECHVIMAT": ["Groupe A", "Groupe B", "Gr 1", "Gr 2", "Gr 3"]
    },
    chips: [{
      label: "TP",
      items: ["Groupe A", "Groupe B", "Gr 1", "Gr 2", "Gr 3"]
    }],
    // suite 81 : TVM — les 5 groupes sont des groupes de TP ; suite 80 : sur une seule ligne
    tdRoots: ["Groupe A", "Groupe B"],
    optRoots: null,
    defaultCols: ["Groupe A", "Groupe B"]
  },
  "MP-3A-AVTECH": {
    label: "BUT3 AVTECH",
    short: "B3av",
    tree: {
      "MP-3A-AVTECH": ["A", "B"]
    },
    chips: [{
      label: "TP",
      items: ["A", "B"]
    }],
    // suite 81 : AVTECH — A/B = groupes de TP (promo petite, TD sur la promo entière via titre « (TD) »)
    tdRoots: ["A", "B"],
    optRoots: null,
    defaultCols: ["A", "B"]
  },
  "CiTiSE1-IUTD": {
    label: "CiTiSE1",
    short: "C1",
    tree: {
      "CiTiSE1-IUTD": ["IUTD1", "IUTD2"]
    },
    chips: [{
      label: "TP",
      items: ["IUTD1", "IUTD2"]
    }],
    // suite 81 : CiTiSE1 — IUTD1/2 = groupes de TP
    tdRoots: ["IUTD1", "IUTD2"],
    optRoots: null,
    defaultCols: ["IUTD1", "IUTD2"]
  },
  "CiTiSE2-IUTD": {
    label: "CiTiSE2",
    short: "C2",
    tree: {
      "CiTiSE2-IUTD": ["IUTD1"]
    },
    // suite 81 : IUTD2 retiré (groupe inexistant cette année, comme MB4/TA2)
    chips: [{
      label: "TP",
      items: ["IUTD1"]
    }],
    tdRoots: ["IUTD1"],
    optRoots: null,
    defaultCols: ["IUTD1"]
  }
};
const PROMO_KEYS = Object.keys(PROMOS);
const PROMO_DERIVED = {};
PROMO_KEYS.forEach(p => {
  const cfg = PROMOS[p];
  const parents = {};
  Object.keys(cfg.tree).forEach(k => cfg.tree[k].forEach(c => {
    (parents[c] = parents[c] || []).push(k);
  }));
  const order = [];
  const walk = nodes => nodes.forEach(n => {
    if (!order.includes(n)) {
      order.push(n);
      walk(cfg.tree[n] || []);
    }
  });
  walk([p]);
  PROMO_DERIVED[p] = {
    parents,
    order
  };
});
const TD_COLOR_CYCLE = ["bg-indigo-500/20 text-indigo-100 border-indigo-400/30", "bg-emerald-500/20 text-emerald-100 border-emerald-400/30", "bg-sky-500/20 text-sky-100 border-sky-400/30", "bg-amber-500/20 text-amber-100 border-amber-400/30", "bg-rose-500/20 text-rose-100 border-rose-400/30", "bg-teal-500/20 text-teal-100 border-teal-400/30"];
function colInfo(c, promo) {
  const cfg = PROMOS[promo],
    d = PROMO_DERIVED[promo];
  const td = cfg.tdRoots.includes(c) ? c : (d.parents[c] || []).find(x => cfg.tdRoots.includes(x)) || c;
  const opt = cfg.optRoots ? (d.parents[td] || []).find(x => cfg.optRoots.includes(x)) || "" : "";
  const tp = td === c ? (cfg.tree[td] || []).length ? (cfg.tree[td] || []).join(" · ") : "" : c;
  return {
    opt,
    td,
    tp
  };
}
// Suite 64 : WIDE = affichage « ordinateur » (≥ 1024 px, mis à jour au resize) : les libellés
// reprennent leur forme longue (BUT1, Aujourd'hui, A1-6, Groupe A, Rafraîchir…). Le harnais
// de test (pas de window) reste en affichage mobile compact.
let WIDE = false;
try {
  if (typeof window !== "undefined" && window.innerWidth >= 1024) WIDE = true;
} catch (e) {}
const dispG = g => WIDE || !/^[A-Za-z]+\d+-\d+$/.test(g) ? g : g.replace("-", "");
// Suite 58 : TVM — « Groupe A / Groupe B » résumés en « GrA / GrB » à l'affichage (chips + titres) ;
// les noms internes (matching ADE : « Groupe A », « Gr 1 »…) restent inchangés.
// Suite 64 : sur ordinateur, forme longue conservée (« Groupe A », « A1-6 »).
const grpDisp = (promo, g) => !WIDE && promo === "MP-3A-TECHVIMAT" ? g.replace(/^Groupe /, "Gr") : dispG(g);
const colColor = (c, promo) => {
  const i = PROMOS[promo].tdRoots.indexOf(colInfo(c, promo).td);
  return (i >= 0 ? TD_COLOR_CYCLE[i % TD_COLOR_CYCLE.length] : null) || "bg-violet-500/20 text-violet-100 border-violet-400/30";
};
function normLabel(s, promo) {
  // Suite 50 : les flux ICS ADE nomment les groupes « nus » (C, B, A1-6, Groupe A…) ou préfixés
  // (« TP TA1 », « Etud-MP-3A-DU AVTECH », « MP3 MAE INI »). On normalise par rapport à
  // l'ARBRESCENCE de la promo : tout libellé égal (casse ignorée) à un nœud de l'arbre est un
  // groupe ; sinon les règles historiques BUT2 (TA/MA/MB/EA…) ; sinon pas un groupe (null).
  const raw = String(s == null ? "" : s).trim();
  const pr = promo || "";
  let t = raw.replace(/^Etud-/i, "").trim();
  if (/^(TD|TP)\s+/i.test(t)) t = t.replace(/^(TD|TP)\s+/i, "").trim();
  const up0 = t.toUpperCase();
  if (pr && up0 === pr.toUpperCase()) return pr; // « Etud-MP-2A » → racine de la promo
  if (pr === "MP-3A-AVTECH" && up0 === "MP-3A-DU AVTECH") return pr;
  if (pr === "MP-3A-TECHVIMAT" && up0 === "MP-3A-DU TECHVIMAT") return pr;
  if (pr === "MP-3A-MAE") {
    const mm = t.match(/^MP3 MAE (INI|ALT1|ALT2)$/i);
    if (mm) return mm[1].toUpperCase();
  }
  if (pr === "CiTiSE1-IUTD" || pr === "CiTiSE2-IUTD") {
    const mm = t.match(/^CiTiSE[12]-IUTD([12])$/i);
    if (mm) return "IUTD" + mm[1];
  } // « CiTiSE1-IUTD1 » → IUTD1
  const m = up0.match(/^(TI|MCPC|MAE|TA|MA|MB|EA)(\d)?$/);
  if (m) return m[1] + (m[2] || "");
  if (up0 === "MP-2A") return "MP-2A"; // appel sans promo (gnrm) : comportement historique
  if (pr && PROMO_DERIVED[pr]) {
    const hit = PROMO_DERIVED[pr].order.find(n => String(n).toUpperCase() === up0);
    if (hit) return hit; // « C » pour BUT1, « B » pour AVTECH, « Groupe A » pour TVM, « ALT1 »…
    const root = pr.toUpperCase() + "-"; // « CiTiSE1-IUTD1 » → nœud « IUTD1 » de l'arbre CiTiSE1-IUTD
    if (up0.startsWith(root)) {
      const rest = up0.slice(root.length);
      const hit2 = PROMO_DERIVED[pr].order.find(n => String(n).toUpperCase() === rest);
      if (hit2) return hit2;
    }
  }
  return null;
}
const TEACHER_RE = /^[A-ZÀ-ÖØ-Ü][A-ZÀ-ÖØ-Ü'-]*( +[A-ZÀ-ÖØ-Ü][A-ZÀ-ÖØ-Ü'-]+)+$/;
// Étiquettes de RESSOURCES ADE (« TD MAE », « virtuel_MPH2 »...) : jamais des personnes.
// Un token contenant un mot ressource (TD, TP, CM, MAE, MCPC, TVM, VIRTUEL...) est écarté
// de la liste des enseignants ; « TD MAE » est le groupe de TD MAE (ressource ADE), pas un enseignant.
const RES_WORD_RE = /(^|\s|_)(TD|TP|CM|MAE|MCPC|TVM|AVTECH|TECHVIMAT|VIRTUEL|EVENEMENTS|AGENDA)(\s|$|_)/i;
function extractMeta(desc, promo) {
  const groups = [],
    teachers = [];
  let virtEns = false;
  for (const raw of (desc || "").split(/\n|·/)) {
    const s = raw.trim();
    if (!s || s.startsWith("(") || /^\d+$/.test(s)) continue;
    if (/^TD\s+MAE(\s|$)/i.test(s)) {
      if (!groups.includes("MAE")) groups.push("MAE");
      continue;
    } // groupe de TD MAE (ressource ADE)
    if (/^VIRTUEL[A-Z0-9_]*$/.test(s)) {
      virtEns = true;
      continue;
    } // enseignant virtuel ADE (jamais une salle ni un groupe)
    const g = normLabel(s, promo);
    if (g) {
      if (!groups.includes(g)) groups.push(g);
      continue;
    }
    if (TEACHER_RE.test(s) && !RES_WORD_RE.test(s) && !teachers.includes(s)) teachers.push(s);
  }
  groups.sort((a, b) => PROMO_DERIVED[promo || "MP-2A"].order.indexOf(a) - PROMO_DERIVED[promo || "MP-2A"].order.indexOf(b));
  return {
    groups,
    teacher: teachers.join(" / "),
    virtEns
  };
}
function groupClosure(g, promo) {
  // Suite 58 : promo peut être null (agenda enseignant/salle/cours ouvert via un favori) → neutre.
  const d = PROMO_DERIVED[promo] || {
      parents: {}
    },
    tree = PROMOS[promo] && PROMOS[promo].tree || {};
  const out = new Set([g]);
  let cur = [g];
  while (cur.length) {
    const next = [];
    for (const x of cur) for (const p of d.parents[x] || []) if (!out.has(p)) {
      out.add(p);
      next.push(p);
    }
    cur = next;
  }
  cur = [g];
  while (cur.length) {
    const next = [];
    for (const x of cur) for (const k of tree[x] || []) if (!out.has(k)) {
      out.add(k);
      next.push(k);
    }
    cur = next;
  }
  return out;
}
function groupAncestors(g, promo) {
  const d = PROMO_DERIVED[promo] || {
    parents: {}
  };
  const out = new Set();
  let cur = [g];
  while (cur.length) {
    const next = [];
    for (const x of cur) for (const p of d.parents[x] || []) if (!out.has(p)) {
      out.add(p);
      next.push(p);
    }
    cur = next;
  }
  return out;
}

// ---------- Parser ICS ----------
function unfoldIcs(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    if ((raw.startsWith(" ") || raw.startsWith("\t")) && out.length) out[out.length - 1] += raw.slice(1);else if (raw) out.push(raw);
  }
  return out;
}
function parseIcsDate(value, params) {
  const isDate = (params || "").includes("VALUE=DATE");
  let s = value;
  let utc = s.endsWith("Z");
  if (utc) s = s.slice(0, -1);
  const y = +s.slice(0, 4),
    mo = +s.slice(4, 6) - 1,
    d = +s.slice(6, 8);
  if (isDate) return {
    date: new Date(y, mo, d),
    allDay: true
  };
  const h = +s.slice(9, 11),
    mi = +s.slice(11, 13);
  return {
    date: utc ? new Date(Date.UTC(y, mo, d, h, mi)) : new Date(y, mo, d, h, mi),
    allDay: false
  };
}

// Suite 68 : ADE a changé le format des UID (15/11/2026) — le serveur préfixe désormais
// « 02 » + l'année universitaire (« 2026-2027 ») DANS la partie hex : UID = "ADE" + hex("02" +
// "2026-2027" + "ST-ETIENNE-<num>-<i>-<j>"). La base embarquée utilise l'id historique
// « ADE<num>-<i>-<j> » ; sans normalisation, TOUT créneau devenait « ajouté » au diff.
// On hex-décode et on ne garde que la queue après « ST-ETIENNE- » (gère aussi l'ancien
// format sans préfixe année ; les ids déjà décimaux « ADE…-… » passent tels quels).
const normUid = uid => {
  if (typeof uid !== "string" || !uid.startsWith("ADE") || !/^[0-9a-fA-F]+$/.test(uid.slice(3))) return uid;
  let h = "";
  for (let i = 3; i + 1 < uid.length; i += 2) h += String.fromCharCode(parseInt(uid.slice(i, i + 2), 16));
  const m = h.match(/ST-ETIENNE-(\d[\d-]*)$/);
  return m ? "ADE" + m[1] : uid;
};
function parseIcs(text, promo) {
  const events = [];
  let cur = null;
  for (const line of unfoldIcs(text)) {
    if (line.startsWith("BEGIN:VEVENT")) {
      cur = {};
      continue;
    }
    if (line.startsWith("END:VEVENT")) {
      if (cur && cur.DTSTART && cur.DTEND) {
        try {
          const s = parseIcsDate(cur.DTSTART, cur.DTSTART_PARAMS || "");
          const e = parseIcsDate(cur.DTEND, cur.DTEND_PARAMS || "");
          if (!s.allDay) {
            const desc = (cur.DESCRIPTION || "").replace(/\\n/g, "\n").replace(/\\,/g, ",");
            const meta = extractMeta(desc, promo);
            events.push({
              id: normUid(cur.UID || Math.random().toString(36).slice(2)),
              summary: (cur.SUMMARY || "Sans titre").replace(/\\,/g, ",").replace(/\\n/g, " "),
              start: s.date,
              end: e.date,
              location: (cur.LOCATION || "").replace(/\\,/g, ","),
              description: desc,
              groups: meta.groups,
              teacher: meta.teacher,
              // SUITE 131 : étiquette D'ORIGINE conservée — la promo du flux ADE (jamais devinée
              // depuis le groupe : « IUTD1 » est partagé par CiTiSE1 ET CiTiSE2, « A »/« B » par
              // BUT1 ET AVTECH, « ALT1 »/« ALT2 » par BUT2-ALT ET MAE). L'affichage reste inchangé.
              ...(promo ? {
                promoSrc: promo
              } : {})
            });
          }
        } catch (err) {/* événement mal formé : ignoré */}
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const head = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const semi = head.indexOf(";");
    const key = (semi < 0 ? head : head.slice(0, semi)).toUpperCase();
    const params = semi < 0 ? "" : head.slice(semi + 1);
    if (key === "DTSTART") {
      cur.DTSTART = value;
      cur.DTSTART_PARAMS = params;
    } else if (key === "DTEND") {
      cur.DTEND = value;
      cur.DTEND_PARAMS = params;
    } else if (key === "SUMMARY" || key === "LOCATION" || key === "DESCRIPTION" || key === "UID") cur[key] = value;
  }
  return events;
}

// ---------- Utilitaires ----------
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const fmtHM = d => d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
const fmtH = x => (Math.round(x * 4) / 4).toLocaleString("fr-FR") + " h"; // suite 74 : durées/heures (ex. « 1,5 h », « 3 h »)
const fmtDurH = h => {
  const m = Math.round(h * 60);
  if (m < 60) return m + " min";
  return Math.floor(m / 60) + "h" + (m % 60 ? String(m % 60).padStart(2, "0") : "");
}; // suite 78 : durée compacte des créneaux (« 1h », « 1h30 », « 45 min »)
// Suite 52 : cellule « Synchronisé depuis le » du tableau des flux (onglet Flux) —
// vert = synchronisé en direct récemment · ambre = données embarquées (secours) ou échec.
const syncCell = (busy, last, err, dataDate) => busy ? /*#__PURE__*/React.createElement("span", {
  className: "text-[10.5px] text-slate-400"
}, "synchronisation…") : err ? /*#__PURE__*/React.createElement("span", {
  className: "text-[10.5px] text-amber-300"
}, "échec de la dernière tentative") : last ? /*#__PURE__*/React.createElement("span", {
  className: "text-[10.5px] text-emerald-300 whitespace-nowrap"
}, last.toLocaleDateString("fr-FR"), " à ", fmtHM(last)) : /*#__PURE__*/React.createElement("span", {
  className: "text-[10.5px] text-amber-300 whitespace-nowrap"
}, dataDate ? dataDate + " (embarqué)" : "jamais synchronisé");
const startOfWeek = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const w = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - w);
  return x;
};
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const isoD = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); // suite 80 : date locale « yyyy-mm-dd » (sélecteur vue Journée)

// Code couleur : teinte = formation · hachures = alternance (BUT2 ALT, MAE ALT, TECHVIMAT, AVTECH) · tracé = type de cours · violet = évaluation
const FAM = {
  but1: {
    hue: "#10b981",
    dark: "#065f46",
    bg: "rgba(16,185,129,0.16)"
  },
  but2: {
    hue: "#3b82f6",
    dark: "#1d4ed8",
    bg: "rgba(59,130,246,0.16)"
  },
  but3: {
    hue: "#ef4444",
    dark: "#991b1b",
    bg: "rgba(239,68,68,0.14)"
  },
  citise: {
    hue: "#14b8a6",
    dark: "#0f766e",
    bg: "rgba(20,184,166,0.16)"
  },
  dept: {
    hue: "#64748b",
    dark: "#475569",
    bg: "rgba(100,116,139,0.16)"
  }
};
const HATCH = "repeating-linear-gradient(45deg, transparent 0 5px, var(--hatch) 5px 8px)";
// SUITE 136 : les couleurs des cases passent en TOKENS CSS (option A « tints pâles »).
// :root = valeurs HISTORIQUES (thème sombre strictement inchangé à l'octet de rendu près) ;
// html.light redéfinit chacun des tokens pour le clair (voir feuille LIGHT — palette
// construite pour fond blanc : tint solide pâle + teintes 600-700, hachures noires
// translucides, examen lila foncé). Le kiosk (tv, toujours sombre) embarque :root aussi
// via THEME_VARS_136 (sinon les cases colorFor perdraient leurs couleurs).
// SUITE 136b : + tokens --fam-*-txt (couleur du TITRE de case, émise par colorFor) —
// :root = #f1f5f9 (slate-100, identique à l'héritage historique : zéro drift sombre/tv) ;
// la feuille light les redéfinit en teintes foncées PAR FAMILLE (maquette option A).
const THEME_VARS_136 = [":root{--hatch:rgba(255,255,255,.10);--exam-line:#a78bfa;", "--fam-but1-hue:#10b981;--fam-but1-dark:#065f46;--fam-but1-bg:rgba(16,185,129,0.16);--fam-but1-cm:rgba(16,185,129,0.27);--fam-but1-txt:#f1f5f9;", "--fam-but2-hue:#3b82f6;--fam-but2-dark:#1d4ed8;--fam-but2-bg:rgba(59,130,246,0.16);--fam-but2-cm:rgba(59,130,246,0.27);--fam-but2-txt:#f1f5f9;", "--fam-but3-hue:#ef4444;--fam-but3-dark:#991b1b;--fam-but3-bg:rgba(239,68,68,0.14);--fam-but3-cm:rgba(239,68,68,0.27);--fam-but3-txt:#f1f5f9;", "--fam-citise-hue:#14b8a6;--fam-citise-dark:#0f766e;--fam-citise-bg:rgba(20,184,166,0.16);--fam-citise-cm:rgba(20,184,166,0.27);--fam-citise-txt:#f1f5f9;", "--fam-dept-hue:#64748b;--fam-dept-dark:#475569;--fam-dept-bg:rgba(100,116,139,0.16);--fam-dept-cm:rgba(100,116,139,0.27);--fam-dept-txt:#f1f5f9}"].join("");
const PROMO_FAMILY = {
  "MP-1A": "but1",
  "MP-2A": "but2",
  "MP-2A-ALT": "but2",
  "MP-3A-MAE": "but3",
  "MP-3A-AVTECH": "but3",
  "MP-3A-TECHVIMAT": "but3",
  "CiTiSE1-IUTD": "citise",
  "CiTiSE2-IUTD": "citise"
};
// Jetons de groupes/classes -> formation (vote) : les groupes « nus » (MA, MB3, A, B7-12...)
// arrivent dans location avec les salles, il faut donc tout analyser.
const TOK_FAM = {
  "MP-1A": "but1",
  "MPH1": "but1",
  "A": "but1",
  "B": "but1",
  "C": "but1",
  "D": "but1",
  "A1-6": "but1",
  "A7-12": "but1",
  "B1-6": "but1",
  "B7-12": "but1",
  "C1-6": "but1",
  "C7-12": "but1",
  "D1-6": "but1",
  "D7-12": "but1",
  "D13-18": "but1",
  "MP-2A": "but2",
  "MPH2": "but2",
  "MA": "but2",
  "MA1": "but2",
  "MA2": "but2",
  "MB": "but2",
  "MB3": "but2",
  "MB4": "but2",
  "TA": "but2",
  "TA1": "but2",
  "TA2": "but2",
  "TI": "but2",
  "MCPC": "but2",
  "EA": "but2",
  "EA1": "but2",
  "EA2": "but2",
  "MAE": "but2",
  "MP-3A": "but3",
  "MP3": "but3",
  "3A": "but3",
  "AVTECH": "but3",
  "TECHVIMAT": "but3",
  "TVM": "but3",
  "INI": "but3",
  "ALT": "but3",
  "ALT1": "but3",
  "ALT2": "but3"
};
function famOfGroups(gs, extra, sum) {
  const s = ((gs || []).join(" ") + " " + (extra || "") + " " + (sum || "")).toUpperCase();
  if (/CITISE/.test(s)) return "citise";
  if (/BUT ?3/.test(s)) return "but3";
  if (/BUT ?2/.test(s)) return "but2";
  if (/BUT ?1/.test(s)) return "but1";
  if (/MP-?3A|MP3 MAE|AVTECH|TECHVIMAT|TVM|3A MAE/.test(s)) return "but3";
  if (/MP-?2A|BUT MP 2|MPH2/.test(s)) return "but2";
  if (/MP-?1A|MPH1/.test(s)) return "but1";
  const votes = {};
  s.replace(/ETUD-|VIRTUEL_/g, " ").split(/[\s,]+/).forEach(t => {
    const f = TOK_FAM[t];
    if (f) votes[f] = (votes[f] || 0) + 1;
  });
  let best = null,
    n = 0;
  ["but1", "but2", "but3"].forEach(f => {
    if ((votes[f] || 0) > n) {
      n = votes[f];
      best = f;
    }
  });
  return best || "dept";
}
// Heuristique de type par le NOMMAGE des groupes (suite 22) : un titre sans TP/TD/CM ne dit
// pas le type de séance ; on se rabat sur le nommage du département — promo entière = CM,
// groupe de TD (A/B/C/D, TA/MA/MB, INI/ALT1/ALT2, Groupe A/B, IUTD1/2…) = TD, sous-groupe
// de TP (A1-6, A7-12, MA1, EA1, Gr 1…) = TP ; l'association TA+EA (souvent regroupés en TD)
// est tranchée TD dès qu'un groupe de TD est présent. EA seul = niveau TD (ses TP sont EA1/EA2).
// Ne s'applique QUE si le titre n'a rien dit (detectType = Autre) et si le créneau n'est pas
// un événement informatif (élections, infos, présentations…) : aucun impact ailleurs.
const GROUP_KIND = (() => {
  // Suite 81 : carte PAR PROMO + repli global — « A » de BUT1 = TD mais « A » d'AVTECH =
  // TP ; la clé globale seule (premier gagnant) écrasait les petits groupes homonymes.
  const all = {},
    byP = {};
  for (const p of Object.keys(PROMOS)) {
    byP[p] = {};
    for (const ch of PROMOS[p].chips || []) {
      const k = ch.label === "TD" ? "td" : ch.label === "TP" ? "tp" : null;
      if (k) for (const it of ch.items) {
        if (!(it in all)) all[it] = k;
        if (!(it in byP[p])) byP[p][it] = k;
      }
    }
  }
  all["EA"] = "td";
  if (byP["MP-2A"]) byP["MP-2A"]["EA"] = "td";
  return {
    all,
    byP
  };
})();
const groupKindOf = (g, p) => p && GROUP_KIND.byP[p] && GROUP_KIND.byP[p][g] || GROUP_KIND.all[g] || null;
const typeHintOf = (ev, promo) => {
  const gs = (ev.groups || []).map(g => {
    const s = String(g == null ? "" : g).trim();
    return /^Etud-/i.test(s) ? s.replace(/^Etud-/i, "") : s;
  }).filter(Boolean);
  if (!gs.length) return null;
  const p = promo ? promoOfGroup(gs[0], promo) || promo : promoSrcOf(ev) || promoOfGroup(gs[0], null) || promo; // SUITE 131 : sans promo de contexte, étiquette d'origine JAMAIS supposition
  if (p && PROMOS[p] && (gs.includes(p) || coversPromo(gs, p))) return "CM";
  const kinds = gs.map(g => groupKindOf(g, p)).filter(Boolean); // suite 81 : kinds par promo (repli global)
  if (!kinds.length) return null;
  // SUITE 134 : blindage « CM en amphi » — un créneau au titre muet, tenu dans un AMPHI
  // (I101/I002, « amphi … » : nommage du bâtiment) avec PLUSIEURS groupes de TD de la
  // même promo est un CM à liste de groupes incomplète (export ADE antérieur : le badge
  // « TD » parasite sur le CM promo-wide du 25/11). Vérifié sur la base complète du
  // 15/11 : AUCUN vrai TD multi-groupes en amphi (les 5 exceptions — infos/CEM/AVTECH —
  // sont déjà neutralisées par INFO_EV_RE chez l'appelant).
  const loc134 = String(ev && ev.location || "").trim();
  if ((/amphi/i.test(loc134) || /^i(00|10)\d/i.test(loc134)) && kinds.length >= 2 && kinds.includes("td")) return "CM";
  if (kinds.includes("td")) return "TD";
  if (kinds.every(k => k === "tp")) return "TP";
  return null;
};
function colorFor(ev, promo, kind) {
  let fam,
    alt = false;
  if (kind === "promo") {
    fam = PROMO_FAMILY[promo] || "dept";
    if (promo === "MP-2A-ALT") alt = true;
    if (promo === "MP-3A-MAE" && (ev.groups || []).some(g => /alt/i.test(g))) alt = true;
    if (promo === "MP-3A-TECHVIMAT" || promo === "MP-3A-AVTECH") alt = true;
  } else {
    fam = famOfGroups(ev.groups, ev.location, ev.summary);
    if (/alt|tvm|techvimat|avtech/i.test((ev.groups || []).join(" ") + " " + (ev.location || ""))) alt = true;
  }
  // SUITE 136 : famille normalisée en CLÉ (fk) pour nommer les tokens ; hex en dur
  // remplacés par var(--fam-*/--exam-line) — :root = valeurs historiques (sombre
  // identique), la feuille LIGHT redéfinit chaque token pour le clair (option A).
  const fk = FAM[fam] ? fam : "dept";
  const f = FAM[fk];
  // type : le titre d'abord ; sinon heuristique de nommage des groupes (suite 22), sauf
  // événements informatifs (élections, infos, présentations…) qui restent « Autre ».
  const tyRaw = detectType(ev);
  const ty = tyRaw !== "Autre" ? tyRaw : INFO_EV_RE.test(ev.summary || "") ? "Autre" : typeHintOf(ev, promo) || "Autre";
  const bi = alt ? HATCH : null;
  let style,
    badge = null;
  if (ty === "Examen") {
    style = {
      backgroundColor: "var(--fam-" + fk + "-bg)",
      border: "2.5px solid var(--exam-line)",
      borderLeft: "4px solid var(--exam-line)",
      backgroundImage: bi
    };
  } else if (ty === "TP") {
    style = {
      backgroundColor: "var(--fam-" + fk + "-bg)",
      border: "1.6px dashed var(--fam-" + fk + "-hue)",
      backgroundImage: bi
    };
    badge = "TP";
  } else if (ty === "TD") {
    style = {
      backgroundColor: "var(--fam-" + fk + "-bg)",
      border: "1px solid var(--fam-" + fk + "-dark)",
      borderLeft: "4px dotted var(--fam-" + fk + "-hue)",
      backgroundImage: bi
    };
    badge = "TD"; // Suite 69d/72 : pastille « TD » dès que le type TD est détecté, préfixe du titre ou pas
  } else {
    style = {
      backgroundColor: "var(--fam-" + fk + "-cm)",
      border: "1px solid var(--fam-" + fk + "-hue)",
      borderLeft: "4px solid var(--fam-" + fk + "-hue)",
      backgroundImage: bi
    };
  }
  // SUITE 136b : couleur du TITRE de case (héritée par lineTitre130g) par famille —
  // token :root slate-100 en sombre/tv (zéro drift), teintes foncées par famille en clair.
  style.color = "var(--fam-" + fk + "-txt)";
  return {
    style,
    badge
  };
}
function detectType(ev) {
  const s = ev.summary.toLowerCase();
  if (/examen|partiel|devoir|ctrl|interro|soutenance|1\/3\s*t/.test(s)) return "Examen";
  if (/^tp\b|\btp\b/.test(s)) return "TP";
  if (/^td\b|\btd\b/.test(s)) return "TD";
  if (/\bcm\b|amphi/.test(s)) return "CM";
  return "Autre";
}

// Événements sans compteur : évaluations (devoirs, examens, soutenances, « 1/3 temps ») et
// séances informatives (présentations, infos, élections, CEM, jurys, réunions).
const INFO_EV_RE = /pr[ée]sentation|élection|election|(^|\s)infos\b|^cem\b|jury|réunion|reunion/i; // suite 80 : PLURIEL uniquement — « Info Python/Labview/EXCEL VBA » sont des COURS, pas des événements informatifs (badge TP/TD + compteurs récupérés)
// Suite 72 : un « devoir » pour le bouton Devoirs = évaluation détectée au titre
// (devoir, examen, contrôle, interrogation, soutenance) MAIS PAS « 1/3 temps » :
// c'est une info pour la surveillante (temps majoré), pas un devoir supplémentaire.
// Le créneau reste affiché sur l'agenda, il n'apparaît juste pas dans la liste.
const isDevoir = e => {
  const s = (e.summary || "").toLowerCase();
  if (/1\/3\s*t/.test(s)) return false;
  if (/(^|\s)ds(\s|$)/.test(s)) return true;
  return detectType(e) === "Examen";
};
const noBadgeEv = e => !!e && (detectType(e) === "Examen" || INFO_EV_RE.test(e.summary || ""));
// Plusieurs enseignants (soutenances, jurys, réunions) : les séries n'ont pas à être comptées.
const multiTch = e => !!e && ((e.teacher || "").split(" / ").filter(Boolean).length > 1 || (e.co || []).filter(Boolean).length > 0);
// Suite 61 (suite 85 : suit la semaine AFFICHÉE) : compteurs d'un favori ENSEIGNANT —
// heures CM/TD/TP de la semaine passée en paramètre (lundi→dimanche, wsStart) et
// « x/y (année) » : x = heures faites depuis le début de l'année
// connue (données dès le 01/09) jusqu'au VENDREDI de la semaine affichée incluse,
// y = total septembre→juillet dans la base. Évaluations, événements informatifs
// et créneaux multi-enseignants (jurys, conseils) exclus, comme les compteurs y/7.
// Un TD fait devant 2 groupes (2 créneaux) compte 2 fois ; un créneau unique avec
// 2 groupes compte 1 fois (dédoublonné par créneau, pas par groupe).
const favHours = (t, teachers, wsStart) => {
  const evs = (teachers[t] || []).filter(e => /^(CM|TD|TP)$/.test(detectType(e)) && !noBadgeEv(e) && !multiTch(e));
  // Suite 85 : hSem sur la semaine AFFICHÉE (wsStart), plus de date réelle codée en dur —
  // semaines de vacances → 0h/sem, navigation dans le passé → cumul hAn plus court.
  const wkA = wsStart.getTime();
  const wkB = wkA + 7 * 864e5;
  const dAn = wsStart.getTime() + 5 * 864e5; // fin du VENDREDI de la semaine affichée (incluse)
  let hSem = 0,
    hAn = 0,
    hTot = 0;
  for (const e of evs) {
    const a = decDT(e.start).getTime(),
      b = decDT(e.end).getTime();
    const h = (b - a) / 36e5;
    if (!(h > 0) || h > 12) continue;
    if (a >= wkA && a < wkB) hSem += h;
    if (a < dAn) hAn += h;
    hTot += h;
  }
  return {
    hSem,
    hAn,
    hTot
  };
};
const fmtHrs = h => Math.floor(h) + "h" + String(Math.round((h - Math.floor(h)) * 60)).padStart(2, "0");
// Suite 79 : rattache un item du diff (persisté « edt2-diff » au dernier ↻) à un agenda
// favori — enseignant, salle, cours ou promo/groupes. Champs stockés au moment du ↻ :
// id, tc (enseignant, « A / B » si plusieurs), l (salle(s), «,»-séparées), g (groupes
// «,»-séparés), s (titre), p (promo). Un item d'un ANCIEN diff (stocké avant la suite 79,
// sans ces champs) ne remonte que pour un favori « promo » via p — aucun rattachement
// faux : split d'une chaîne vide donne [], includes renvoie false.
const diffMatch = (it, s) => {
  if (!it || !s) return false;
  if (s.kind === "teacher") {
    const parts = String(it.tc || "").split(" / ").map(x => x.trim());
    // Suite 86 : l'ANCIEN enseignant (otc) voit AUSSI le changement — un créneau
    // qui lui échappe (passé à un collègue) remonte désormais à son badge Δ.
    const oparts = String(it.otc || "").split(" / ").map(x => x.trim()).filter(Boolean);
    if (s.teacher === VIRT_ENS_LABEL) return parts.some(isVirtEnsKey) || oparts.some(isVirtEnsKey); // suite 80 : agrégat « Enseignant virtuel »
    const t = String(s.teacher || "").trim();
    return parts.includes(t) || oparts.includes(t);
  }
  if (s.kind === "room") {
    const parts = String(it.l || "").split(",").map(x => x.trim());
    // Suite 86 : l'ANCIENNE salle (ol) voit AUSSI le changement (créneau parti ailleurs).
    const oparts = String(it.ol || "").split(",").map(x => x.trim()).filter(Boolean);
    if (s.room === VIRT_ROOM_LABEL) return parts.some(isVirtRoomKey) || oparts.some(isVirtRoomKey); // suite 80 : agrégat « Salle virtuelle »
    const r = String(s.room || "").trim();
    return parts.includes(r) || oparts.includes(r);
  }
  if (s.kind === "cours") return norm(it.s || "") === norm(s.course || "");
  if (s.kind === "promo") {
    if (it.p !== s.promo) return false;
    if (!s.groups.length) return true;
    // Suite 80 : même fermeture de groupes que la grille promo (slotData/closureFor) —
    // un favori MA1 voit aussi les créneaux parents MA (CM/TD du groupe TD parent).
    const cl = new Set();
    for (const g of s.groups) groupClosure(g, s.promo).forEach(x => cl.add(x));
    return String(it.g || "").split(",").map(x => x.trim()).some(h => cl.has(gnrm(h)));
  }
  return false;
};
// Suite 86 : sous-type d'un item « mod » — 'room' : salle uniquement (regroupés,
// repliés par défaut) ; 'ens' : enseignant uniquement (badge « Δ ens. ») ;
// 'move' : déplacement/titre ; 'legacy' : item stocké AVANT la suite 86 (sans
// os/otc) → affiché à l'ancien format jusqu'au prochain ↻.
const diffModType = it => {
  if (!it || it.k !== "mod") return null;
  if (it.os === undefined || it.otc === undefined) return "legacy";
  const tCh = (it.ot || it.t) !== it.t;
  const sCh = (it.os || "") !== (it.s || "");
  const lCh = (it.ol || "") !== (it.l || "");
  const cCh = (it.otc || "") !== (it.tc || "");
  if (!tCh && !sCh && !cCh && lCh) return "room";
  if (!tCh && !sCh && !lCh && cCh) return "ens";
  return "move";
};
// Suite 86 : requalification du POINT DE VUE d'un agenda ENSEIGNANT ou SALLE —
// 'gain' : le créneau ARRIVE sur cet agenda (nouvel enseignant / nouvelle salle) ;
// 'loss' : il le QUITTE (ancien enseignant / ancienne salle) ; null : sans objet.
// Vue globale ou agenda promo/cours/groupe : toujours null (sémantique globale).
const diffGainLoss = (it, s) => {
  if (!it || !s || it.k !== "mod" || s.kind !== "teacher" && s.kind !== "room") return null;
  const key = String(s.kind === "teacher" ? s.teacher : s.room || "").trim();
  const sep = s.kind === "teacher" ? " / " : ",";
  const cur = String((s.kind === "teacher" ? it.tc : it.l) || "").split(sep).map(x => x.trim());
  const old = String((s.kind === "teacher" ? it.otc : it.ol) || "").split(sep).map(x => x.trim()).filter(Boolean);
  const inCur = cur.includes(key),
    inOld = old.includes(key);
  if (inCur && !inOld) return "gain";
  if (inOld && !inCur) return "loss";
  return null;
};
// Suite 87 : AVTECH (alternance en BLOCS de 3 semaines, agenda complètement vide entre
// les blocs = période en entreprise) — le badge n/N d'une série TP ne compte pas
// l'année entière : la liste triée des horodatages est scindée en SOUS-SÉRIES sur un
// écart > 21 jours entre deux séances consécutives du même cours×groupe. Marges
// larges : intra-bloc ≤ ~10 jours (2-3 TP/semaine en rev-cheval), inter-blocs
// plusieurs semaines ; TVM et les autres promos NUMÉROTATION ANNUELLE inchangée
// (décision du 19/11 : ne rien faire pour TVM).
const AV_TP_SPLIT_GAP = 21 * 864e5;
const splitByGap = (ts, gap) => {
  const out = [];
  let cur = null,
    prev = null;
  for (const t of ts) {
    if (cur === null || t - prev > gap) {
      cur = [];
      out.push(cur);
    }
    cur.push(t);
    prev = t;
  }
  return out;
};
// Suite 64 — Proposeur de réorganisation (REPLAN_ENABLED, v3+) : où déplacer un créneau ?
// Un créneau « touche » un groupe si ses propres groupes et lui se recouvrent dans
// l'arbre TD/TP (promo entière ⊃ TD ⊃ sous-groupes de TP) — cf. coveredColumns.
// Suite 64b : la base embarquée garde parfois `groups` en STRING ("A1-3,B2") —
// on normalise AVANT tout .some/.includes, sinon replanFind plante silencieusement.
const grpsOf = c => Array.isArray(c.groups) ? c.groups : typeof c.groups === "string" && c.groups ? c.groups.split(",") : [];
// Suite 66 : la base mélange étiquettes préfixées (« TP TA1 », « TD MAE ») et nues
// (« TA1 », « MAE ») — sans normalisation, la fermeture ignore ces créneaux et le
// proposeur offre des slots où les étudiants ont cours. normLabel fait le mapping.
const rgNrm = (g, promo) => normLabel(String(g == null ? "" : g), promo) || String(g == null ? "" : g).trim();
const touchesGroup = (c, g, promo) => {
  const gg = rgNrm(g, promo);
  const gc = groupClosure(gg, promo);
  return grpsOf(c).some(h => {
    const hh = rgNrm(h, promo);
    return gc.has(hh) || groupClosure(hh, promo).has(gg);
  });
};
// Suite 65 : résolution ROBUSTE de la promo d'un créneau. PIÈGE : slotPromo est
// « MP-2A » codé dur pour les agendas enseignant/salle/cours → si on s'y fie, la
// fermeture parent/enfant est calculée sur le MAUVAIS arbre et le proposeur
// « ne lit pas les groupes parents comme les groupes enfants » (créneaux impossibles).
// On cherche donc la promo dont l'arbre CONTIENT un des groupes du créneau (hint prioritaire).
const promoHasGroup = (g, p) => {
  g = rgNrm(g, p);
  if (!p || !PROMOS[p]) return false;
  if (g === p) return true;
  const tr = PROMOS[p].tree || {};
  if (g in tr) return true;
  for (const k of Object.keys(tr)) if ((tr[k] || []).indexOf(g) >= 0) return true;
  return !!(PROMO_DERIVED[p] && (PROMO_DERIVED[p].parents || {})[g]);
};
// Fenêtres candidates : semaines affichées ±3, lundi→vendredi, 8h→18h30 par pas de 15 min ;
// occupé = groupes du créneau ∪ enseignant(s) ∪ salle(s), vacances universitaires exclues ;
// pause méridienne PROTÉGÉE : il doit rester AU MOINS 1h libre entre 12h30 et 13h30
// (créneau proposé + cours existants des mêmes étudiants/enseignant/salle) ;
// coût = 3/jour d'écart + écart horaire → les propositions les plus proches de l'origine d'abord.
const REPLAN_LUNCH0 = 12.5 * 36e5,
  REPLAN_LUNCH1 = 13.5 * 36e5,
  REPLAN_LUNCH_MIN = 36e5;
// Suite 72 (règles suite 69) : salles ADAPTÉES par promo pour un CM, dans l'ordre de
// préférence. Petites promos sans contrainte (MAE, AVTECH, CiTiSE) : pas de liste →
// proposition d'heure seule. « F236_indigo » = acceptable MAIS signalé (⚠ indigo).
const REPLAN_ROOMS = {
  "MP-1A": ["I002_jaune", "I101_bleu", "F236_indigo"],
  "MP-2A": ["I002_jaune", "I101_bleu", "E151_blanc", "F236_indigo"],
  "MP-2A-ALT": ["I002_jaune", "I101_bleu", "E151_blanc", "F236_indigo"],
  "MP-3A-TECHVIMAT": ["I002_jaune", "E151_blanc", "I101_bleu", "B104"]
};
// type réel d'un créneau : le titre d'abord, sinon le nommage des groupes (même
// heuristique que l'affichage, colorFor/bilanType).
const evTypeOf = (ev, promo) => {
  const t = detectType(ev);
  return t !== "Autre" ? t : INFO_EV_RE.test(ev.summary || "") ? "Autre" : typeHintOf(ev, promo) || "Autre";
};
// une salle est-elle libre sur [a, b) pour l'ensemble des créneaux connus ?
const roomFreeAt = (evs, room, a, b) => !evs.some(c => {
  const cs = decDT(c.start).getTime(),
    ce = decDT(c.end).getTime();
  if (ce <= a || cs >= b) return false;
  return (c.location || "").split(",").map(x => x.trim()).includes(room);
});
const replanFind = (ev, promo, evs, nowMs) => {
  const st = decDT(ev.start).getTime(),
    en = decDT(ev.end).getTime();
  const dur = en - st;
  if (!(dur > 0) || dur > 8 * 36e5) return [];
  // Suite 67 : jamais de proposition dans le passé — un créneau déjà commencé ou
  // antérieur à « maintenant » est exclu (nowMs injectable pour les tests).
  const now = typeof nowMs === "number" ? nowMs : Date.now();
  if (st < now) return []; // événement passé : rien à proposer
  const gs = grpsOf(ev);
  // Suite 72 (règles suite 69) : la salle ne CONTRAINT la recherche que pour un TP
  // (salle imposée + dispo vérifiée). TD : dispo de salle IGNORÉE (aucune salle dans la
  // proposition). CM : une salle adaptée sera PROPOSÉE par créneau (libre si possible).
  const ty = evTypeOf(ev, promo);
  const rooms = ty === "TP" ? (ev.location || "").split(",").map(x => x.trim()).filter(Boolean) : [];
  const pref = ty === "CM" && REPLAN_ROOMS[promo] || null;
  const tch = (ev.teacher || "").split(" / ").map(x => x.trim()).filter(Boolean);
  const busy = evs || []; // le créneau d'origine RESTE occupé : une proposition ne peut pas chevaucher son propre intervalle
  const base = startOfWeek(new Date(st));
  const out = [];
  for (let wi = -3; wi <= 3; wi++) {
    const ws = new Date(base.getTime() + wi * 7 * 864e5);
    for (let di = 0; di < 5; di++) {
      const day = new Date(ws.getTime() + di * 864e5);
      day.setHours(0, 0, 0, 0);
      if (vacOf(day)) continue; // vacances : pas de cours programmé, pas de proposition
      const d0 = day.getTime(),
        d1 = d0 + 864e5;
      const ints = [];
      for (const c of busy) {
        const cs = decDT(c.start).getTime(),
          ce = decDT(c.end).getTime();
        if (ce <= d0 || cs >= d1) continue;
        const hit = gs.some(g => touchesGroup(c, g, promo)) || tch.some(t => (c.teacher || "").split(" / ").map(x => x.trim()).includes(t)) || rooms.some(r => (c.location || "").split(",").map(x => x.trim()).includes(r));
        if (hit) ints.push([Math.max(cs, d0), Math.min(ce, d1)]);
      }
      ints.sort((a, b) => a[0] - b[0]);
      for (let t = d0 + 8 * 36e5; t + dur <= d0 + 18.5 * 36e5; t += 9e5) {
        if (t < now) continue; // fenêtre passée : interdite (créneau futur ou du jour)
        if (Math.abs(t - st) < 9e5) continue; // slot identique à l'origine exclu (l'intervalle d'origine bloque déjà les chevauchements)
        if (ints.some(iv => t < iv[1] && iv[0] < t + dur)) continue;
        // pause méridienne : temps libre restant sur [12h30, 13h30] avec le créneau posé
        const lz0 = d0 + REPLAN_LUNCH0,
          lz1 = d0 + REPLAN_LUNCH1;
        let occL = Math.max(0, Math.min(lz1, t + dur) - Math.max(lz0, t));
        for (const iv of ints) occL += Math.max(0, Math.min(lz1, iv[1]) - Math.max(lz0, iv[0]));
        if (lz1 - lz0 - occL < REPLAN_LUNCH_MIN - 1e3) continue; // moins d'1h pour manger → pas de proposition (1h pile = OK)
        const dd = Math.round(Math.abs(t - st) / 864e5);
        const hd = Math.abs(t % 864e5 - st % 864e5) / 36e5;
        // Suite 72 : salle proposée selon le type — TP : salle d'origine conservée (dispo
        // déjà vérifiée via busy) ; CM : 1re salle adaptée LIBRE de la liste promo
        // (⚠ si indigo) sinon heure seule avec alerte ; TD / CM sans liste : pas de salle.
        let room = null,
          roomNone = false,
          roomAlert = false;
        if (ty === "TP") room = (ev.location || "").split(",").map(x => x.trim()).filter(Boolean).join(", ") || null;else if (pref) {
          const free = pref.find(r => roomFreeAt(busy, r, t, t + dur));
          if (free) {
            room = free;
            roomAlert = /indigo/i.test(free);
          } else roomNone = true; // le flux sans salle existe quand même : proposer quand même l'heure + alerte
        }
        out.push({
          t,
          end: t + dur,
          dd,
          score: dd * 3 + hd,
          room,
          roomNone,
          roomAlert
        });
      }
    }
  }
  out.sort((a, b) => a.score - b.score || a.t - b.t);
  return out.slice(0, 8);
};
// Salle virtuelle (virtuel_MPH1/MPH2, virtuel_ALT, Virtuel amphi, GMP_Virtuel_équipe...) et
// enseignant virtuel (ressource ADE posée sans enseignant) : pictogramme d'alerte en surimpression.
const virtTags = e => {
  const hasVirt = x => /virtuel/i.test(String(x || ""));
  const room = hasVirt(e.location) || (e.groups || []).some(hasVirt);
  // « virtEns » : enseignant virtuel ADE (ressource « VIRTUEL_MPH2 » en majuscules, embarquée
  // par le pipeline — distinct de la salle virtuelle « virtuel_MPH2 » en minuscules).
  const ens = !!e.virtEns || (e.teacher || "").split(" / ").some(hasVirt) || (e.groups || []).some(g => hasVirt(g) && /(ens|enseignant|prof)/i.test(String(g)));
  return {
    room,
    ens
  };
};
function store(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    LS_ERR = false;
    return true;
  } catch (e) {
    LS_ERR = true;
    return false;
  }
} // suite 83 : échec de stockage (quota, localStorage bloqué) ≠ silence — signalé dans l'onglet Flux
let LS_ERR = false; // vrai dès qu'une écriture a échoué depuis le chargement
function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (e) {
    return null;
  }
}

// SUITE 107 : SCHÉMA du stockage local (cloisonnement par année). Les clés ANNUELLES sont des
// données reconstruites depuis les flux (créneaux en cache, listes d'étiquettes, états de
// synchronisation) : quand le schéma change, elles sont JETÉES et se reconstruisent seules au
// prochain rafraîchissement. Les préférences et saisies UTILISATEUR (favoris edt2-favs,
// filtres edt2-mp-only/edt2-fit, réglages edt2-perso-*, edt2-serhist-*, edt2-feed-urls) ne
// sont JAMAIS jetées. Le marqueur edt2-schema identifie la génération des clés en place.
const LS_SCHEMA = 3; // SUITE 108 : bump 2→3 (déverrouillage multi-collègues ; seules les clés ANNUELLES reconstruisables sont purgées, les préférences/saisies ne le sont JAMAIS)
try {
  if (localStorage.getItem("edt2-schema") !== String(LS_SCHEMA)) {
    const LS_ANNUAL = ["edt2-sources", "edt2-sync", "edt2-etag", "edt2-feederrs", "edt2-diff", "edt2-slots", "edt2-virtf", "edt2-teachers", "edt2-rooms"]; // reconstruisables depuis les flux
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (typeof k === "string" && (LS_ANNUAL.includes(k) || k.indexOf("edt2-events") === 0)) localStorage.removeItem(k);
    }
    localStorage.setItem("edt2-schema", String(LS_SCHEMA));
  }
} catch (e) {/* stockage indisponible : ignoré (la suite 83 signalera dans l'onglet Flux) */}

// Colonnes de groupes couvertes par un créneau : un cours mutualisé (promo entière,
// option, TD commun) couvre toutes ses colonnes, un créneau de sous-groupe reste dans la sienne.
function coveredColumns(ev, cols, promo) {
  const gs = ev.groups || [];
  const idxs = [];
  cols.forEach((c, i) => {
    const cc = groupClosure(c, promo);
    if (gs.some(g => cc.has(g) || groupClosure(g, promo).has(c))) idxs.push(i);
  });
  return idxs.length ? idxs : cols.map((_, i) => i);
}

// Répartition des créneaux : colonnes de groupes + sous-colonnes anti-superposition.
// Les créneaux mutualisés occupent toute la largeur du jour (ou les colonnes qu'ils couvrent).
function layoutDay(evs, cols, promo) {
  const sorted = [...evs].sort((a, b) => a.start - b.start || b.end - a.end);
  const placed = [];
  let blocks = sorted.flatMap(ev => {
    const idxs = coveredColumns(ev, cols, promo);
    const runs = [];
    let i = 0;
    while (i < idxs.length) {
      let j = i;
      while (j + 1 < idxs.length && idxs[j + 1] === idxs[j] + 1) j++;
      runs.push({
        ev,
        c0: idxs[i],
        c1: idxs[j]
      });
      i = j + 1;
    }
    return runs;
  });
  // Un bloc multi-colonnes qui en croise un autre d'étendue différente est éclaté
  // colonne par colonne : un cours mutualisé ne s'étale que s'il ne gêne aucun créneau.
  let split = true;
  while (split) {
    split = false;
    const next = [];
    for (const b of blocks) {
      const clash = b.c1 > b.c0 && blocks.some(p => p !== b && (p.c0 !== b.c0 || p.c1 !== b.c1) && p.c0 <= b.c1 && b.c0 <= p.c1 && p.ev.end > b.ev.start && p.ev.start < b.ev.end);
      if (clash) {
        for (let c = b.c0; c <= b.c1; c++) next.push({
          ev: b.ev,
          c0: c,
          c1: c
        });
        split = true;
      } else next.push(b);
    }
    blocks = next;
  }
  // Passe 1 : voie anti-chevauchement (conflit = horaires ET colonnes qui se croisent)
  blocks.forEach(b => {
    const conflicts = placed.filter(p => p.c0 <= b.c1 && b.c0 <= p.c1 && p.ev.end > b.ev.start && p.ev.start < p.ev.end);
    let k = 0;
    while (conflicts.some(p => p.lane === k)) k++;
    b.lane = k;
    placed.push(b);
  });
  // Passe 2 : nombre de voies simultanées, recalculé sur tous les blocs en conflit
  blocks.forEach(b => {
    const all = blocks.filter(p => p !== b && p.c0 <= b.c1 && b.c0 <= p.c1 && p.ev.end > b.ev.start && p.ev.start < b.ev.end);
    b.nsub = 1 + Math.max(b.lane, ...all.map(p => p.lane));
  });
  return blocks;
}

// ---------- Données préchargées : capture du flux ADE (09/11/2026) ----------
// Suite 70 : SÉPARATION CODE/DONNÉES. La base embarquée (créneaux, enseignants, salles,
// date de MAJ) vit dans data/mp-base.json et est INJECTÉE ici à la construction par
// extract.js (remplace le marqueur ci-dessous). Le robot nocturne GitHub Actions ne
// régénère QUE data/mp-base.json à partir des flux ADE — il ne touche JAMAIS au code.
// ---------- Agendas enseignants : capture des flux ADE (09/11/2026) ----------
const EDT_DATA = {"schema":1,"date":"","events":{},"teachers":{},"rooms":{}};
// SUITE 131 : étiquette d'origine — chaque créneau de la base embarquée porte la promo de son
// flux ADE (promoSrc) ; les résolveurs (Synthèse, plannings, typage) la consultent AVANT toute
// supposition, pour qu'un groupe ambigu (« IUTD1 », « A », « ALT1 ») ne soit JAMAIS réattribué
// à la mauvaise promotion. L'affichage (cases, chips, suggestions) est inchangé.
const PRELOADED_EVENTS = {};
for (const pk of Object.keys(EDT_DATA.events || {})) PRELOADED_EVENTS[pk] = (EDT_DATA.events[pk] || []).map(e => e && !e.promoSrc ? {
  ...e,
  promoSrc: pk
} : e);
const PRELOADED_TEACHERS = EDT_DATA.teachers;
const PRELOADED_ROOMS = EDT_DATA.rooms;
const DATA_DATE = EDT_DATA.date;
// vacances universitaires IUT St-É 2026-2027 (calendrier pédagogique CFVU, jours inclus) ;
// un jour dedans → sa colonne/semaine est grisée et porte l'étiquette (suite 25).
const VACANCES = [["Toussaint", "2026-10-24", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-13", "2027-02-28"], ["Printemps", "2027-04-17", "2027-04-25"], ["Ascension", "2027-05-06", "2027-05-09"]];
const vacOf = d => {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  for (const [label, s, e] of VACANCES) if (t >= new Date(s).getTime() && t <= new Date(e + "T23:59:59").getTime()) return label;
  return null;
};
const TEACHER_NAMES = Object.keys(PRELOADED_TEACHERS);
// Décodage date compacte "YYMMDDHHMM" (Paris->UTC à la capture) ; accepte aussi ISO ou Date (imports ICS)
const decDT = z => z instanceof Date ? z : new Date(typeof z === "string" && z.length === 10 ? "20" + z.slice(0, 2) + "-" + z.slice(2, 4) + "-" + z.slice(4, 6) + "T" + z.slice(6, 8) + ":" + z.slice(8, 10) + ":00Z" : z);
// Étiquettes de branche / groupes ADE -> promotion (pour les pastilles cliquables)
const ETUD_PROMO = {
  "ETUD-MP-1A": "MP-1A",
  "MP-1A": "MP-1A",
  "ETUD-MP-2A": "MP-2A",
  "MP-2A": "MP-2A",
  "ETUD-MP-2A-ALT": "MP-2A-ALT",
  "MP-2A-ALT": "MP-2A-ALT",
  "ETUD-MP-3A": "MP-3A-MAE",
  "MP-3A-MAE": "MP-3A-MAE",
  "ETUD-MP-3A-DU TECHVIMAT": "MP-3A-TECHVIMAT",
  "MP-3A-TECHVIMAT": "MP-3A-TECHVIMAT",
  "ETUD-MP-3A-DU AVTECH": "MP-3A-AVTECH",
  "MP-3A-AVTECH": "MP-3A-AVTECH",
  "ETUD-CITISE1-IUTD": "CiTiSE1-IUTD",
  "ETUD-CITISE2-IUTD": "CiTiSE2-IUTD"
};
// SUITE 131 : promo D'ORIGINE d'un créneau (promoSrc = promo du flux ADE) ou null.
// ATTENTION : PROMOS[x] est l'OBJET de configuration — il sert ICI de simple test de validité,
// on renvoie TOUJOURS la CLÉ (chaîne) ; pousser l'objet dans une clé de série (« p + "|"… »)
// fabrique « [object Object]|… » et casse les badges/déficits (piège rencontré en 131).
const promoSrcOf = ev => ev && ev.promoSrc && PROMOS[ev.promoSrc] ? ev.promoSrc : null;
function promoOfGroup(g, preferred) {
  if (!g) return null;
  const ep = ETUD_PROMO[g.toUpperCase()];
  if (ep) return ep;
  if (preferred && PROMOS[preferred]) {
    const tr = PROMOS[preferred].tree;
    for (const k of Object.keys(tr)) if ((tr[k] || []).indexOf(g) >= 0) return preferred;
  }
  for (const p of PROMO_KEYS) {
    const tr = PROMOS[p].tree;
    for (const k of Object.keys(tr)) if ((tr[k] || []).indexOf(g) >= 0) return p;
  }
  return null;
}
const prettyName = n => (n || "").toLowerCase().replace(/(^|[\s'\-])([a-zà-öø-ÿ])/g, (m, p, c) => p + c.toUpperCase());
// nom d'affichage : prettyName pour une personne, libellé brut (VIRTUEL_MPH2) pour une ressource virtuelle
const dispName = n => /virtuel/i.test(String(n || "")) ? String(n) : prettyName(n);
const norm = s => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
// Agrégats virtuels : « Enseignant virtuel » / « Salle virtuelle » = ressources synthétiques qui
// fusionnent tous les créneaux des ressources virtuelles (enseignants VIRTUEL_*, salles contenant
// « virtuel »). Elles remontent en tête des suggestions « virtuel » (plus grave de manquer
// d'enseignant que de salle — une autre salle se trouve au dernier moment).
const VIRT_ENS_LABEL = "Enseignant virtuel";
const VIRT_ROOM_LABEL = "Salle virtuelle";
const isVirtEnsKey = t => /^VIRTUEL/i.test(String(t || ""));
// salle virtuelle = distanciel ; « équipement(s) virtuel(s) » = resource CAO posée par un
// collègue sur des TP bien présentiels (D103 CAO…) : PAS du distanciel, hors détection.
const isVirtRoomKey = r => {
  const s = String(r || "");
  return /virtuel/i.test(s) && !/equipement/i.test(s);
};
// compteur dédoublonné des créneaux d'un agrégat virtuel (clé = horodatage + titre)
const virtAggCount = (src, kind) => {
  const seen = new Set();
  if (kind === "ens") {
    for (const t of Object.keys(src)) if (isVirtEnsKey(t)) for (const e of src[t] || []) seen.add(decDT(e.start).getTime() + "|" + (e.summary || ""));
  } // suite 94 : clé decDT (compact ⊕ ISO)
  else {
    for (const r of Object.keys(src)) if (isVirtRoomKey(r)) for (const e of src[r] || []) seen.add(String(e[0]) + "|" + e[2]);
  }
  return seen.size;
};
// catégorie d'un créneau pour les boutons on/off des agendas virtuels : CM/TD/TP (le plus
// critique : un vrai enseignant est attendu), Devoirs/Examens (une surveillante suffit),
// Autres (ACD, infos, réunions, présentations : normal sans enseignant).
// ----------
// Suite 92 : moteur de calcul du « Bilan de service » (règle OSE prorata).
// Livré FIGÉ et testé par le chat « Bilan de service » (bilan-module/bilan-engine.js) :
// seule l'enveloppe UMD est remplacée par une IIFE (navigateur + harnais check8),
// LE CORPS DE FABRIQUE EST EMBARQUÉ OCTET PAR OCTET. Toute modification de la règle
// = suite dédiée + revalidation des références 2025-2026 (SUITE 114 : base prorata ENSEIGNEMENT SEUL → 559,91 éqTD / r = 83,52 %).
const BilanEngine = function () {
  "use strict";

  const SERVICE = 384; // h éqTD statutaires
  const TP_HC = 2 / 3; // part HC des TP payée en dehors du service

  // isoLocal : clé ISO depuis les composants LOCAUX de la date.
  // Piège connu : toISOString() décale d'un jour en heure d'été → interdit ici.
  function isoLocal(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // monday: lundi de la semaine contenant d (date locale).
  function monday(d) {
    const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    m.setDate(m.getDate() - (m.getDay() + 6) % 7);
    return m;
  }

  /* buildYear — fabrique une année de calcul.
   * cfg = { start:[a,m,j] lundi de la semaine 1, nw: nombre de semaines (≈45),
   *         weeks: { "YYYY-MM-DD(lundi)": {cm, td, tp, byPromo:{promo:h}} },
   *         refTotal: nombre | () => nombre   (référentiel, socle dès le 1ᵉʳ sept.) }
   * weeks peut être null/{} (année vide, ex. pré-rentrée). */
  function buildYear(cfg) {
    const START = new Date(cfg.start[0], cfg.start[1], cfg.start[2]);
    const NW = cfg.nw;
    const refAt = typeof cfg.refTotal === "function" ? cfg.refTotal : () => cfg.refTotal;
    // Suite 93 : service statutaire PARAMÉTRABLE (384 par défaut, inchangé ; ex. 192 pour un
    // collègue). La règle OSE elle-même (coefficients, prorata, part HC des TP ×2/3) est
    // INTACTE : seul le seuil de saturation change.
    const SERVICE_Y = cfg.service && cfg.service > 0 ? cfg.service : SERVICE;
    const WEEKS = [];
    for (let i = 0; i < NW; i++) {
      const d = new Date(START);
      d.setDate(START.getDate() + i * 7);
      const raw = cfg.weeks && cfg.weeks[isoLocal(d)] || {
        cm: 0,
        td: 0,
        tp: 0,
        byPromo: {}
      };
      const cm = raw.cm || 0,
        td = raw.td || 0,
        tp = raw.tp || 0;
      WEEKS.push({
        i,
        date: d,
        cm,
