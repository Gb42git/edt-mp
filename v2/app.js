const {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} = React;

// Bilan de charge : rÃ©servÃ© Ã  la version privÃ©e (v4). Le build public (v2/v3)
// passe EDT_BILAN=0 Ã  extract.js qui remplace ce true par false (bouton masquÃ©).
const BILAN_ENABLED = false;
// Suite 92 : Â« SynthÃ¨se personnelle Â» (Î£ sur le favori enseignant, SUITE 108 multi-collÃ¨gues) â v4 seule,
// le build public (v2/v3) passe EDT_PERSO=0 qui remplace ce true par false.
const PERSO_ENABLED = false;
const HELP_LONG = false; // SUITE 98 : long texte d'aide Â« Agendas empilablesâ¦ Â» sous les favoris ; substituÃ© Ã  false pour la v2 au build (EDT_HELP=0 dans variant.js)
// SUITE 132 : mode KIOSK Â« /tv/ Â» â Ã©cran suspendu du dÃ©partement (1920Ã1080, sans souris
// ni clavier). KIOSK=true remplace TOUT le chrome applicatif par Kiosk132 (deux grilles
// Â½ journÃ©e, colonnes = groupes FEUILLES, fusion des crÃ©neaux communs, halo horloge,
// masquage auto des promos absentes). Les variants applicatifs passent EDT_KIOSK=0.
const KIOSK = false;
// Suite 64 : proposeur de rÃ©organisation (Â« â DÃ©placer ce crÃ©neau Â») â v3/v4 uniquement
// (v2 publique inchangÃ©e : EDT_REPLAN=0 au build remplace par false).
const REPLAN_ENABLED = false;
// Suite 75d : le RSS enseignants/salles est RETIRÃ de toutes les versions â les agendas
// enseignants et salles vivent uniquement des flux ICS rechargÃ©s par Â« â» Rafr. Â».

// Relais CORS des flux ICS ADE (Cloudflare Worker, cf. worker-proxy.js) :
// le navigateur ne peut pas lire planning.univ-st-etienne.fr directement (CORS) ;
// ce Worker le relaie en temps rÃ©el (cache Edge 60 s max), liste blanche stricte ADE /jsp/*.
const PROXY_URL = "https://edt-mp-proxy.guilhem-bordes.workers.dev/?url=";
// Les 9 flux ICS officiels du dÃ©partement (anonymes, fournis par ADE â cf. flux-ics-promos-2026-2027.md).
// PrÃ©configurÃ©s et non retirables : Â« â» Rafr. Â» les retÃ©lÃ©charge via le proxy et RECONSTRUIT
// les crÃ©neaux de chaque promo (les suppressions/dÃ©placements ADE sont propagÃ©s).
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
// Â« ÃvÃ©nements MP Â» : crÃ©neaux sans Ã©tudiants (soutenances, pÃ©riodes d'alternanceâ¦) â enseignants seulement.
{
  name: "ÃvÃ©nements MP",
  promo: null,
  url: "https://planning.univ-st-etienne.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?data=4a305eb6f3763e59119f798fe0e359e9292fa4c04d77640dd7ddb2dc00c8e1c4692613b21192e5f0e0b7c5a5601c933d35be67f46793f4734fa1410c05d8607c948e9dda38cfde1596c3ee1fba469211314d669fae9ca422200cb711a9b76537,1"
}];
// Flux officiels ÃDITABLES SANS REBUILD : le fichier publiÃ© Â« feeds-<annÃ©e>.json Â» est relu
// Ã  chaque chargement (?v= court-circuite le cache du service worker). SUITE 107 (cloison-
// nement par annÃ©e) : l'annÃ©e scolaire N commence le 1er aoÃ»t (anticipation de la rentrÃ©e).
// L'appli lit d'abord feeds-<N>.json (N = annÃ©e courante) ; si l'annÃ©e N n'est pas encore
// publiÃ©e (absent/cassÃ©/invalide), elle se replie sur feeds-<DATA_YEAR>.json (annÃ©e de la
// prÃ©sente publication) avec un bandeau explicite dans l'onglet Flux ; en dernier recours le
// secours KNOWN_FEEDS embarquÃ© reste en place, comme avant. En 2026-2027, SCHOOL_YEAR ===
// DATA_YEAR : un seul et mÃªme fichier, comportement strictement inchangÃ©.
const DATA_YEAR = "2026-2027"; // annÃ©e des flux secours embarquÃ©s (KNOWN_FEEDS) et de la base publiÃ©e
const schoolYearOf = d => {
  const y = d.getFullYear();
  return d.getMonth() >= 7 ? y + "-" + (y + 1) : y - 1 + "-" + y;
}; // getMonth() janvier=0 : aoÃ»t (7) â bascule sur l'annÃ©e scolaire suivante
const SCHOOL_YEAR = schoolYearOf(new Date()); // annÃ©e N (l'annÃ©e change automatiquement le 1er aoÃ»t)
const feedsUrlOf = y => "https://gb42git.github.io/edt-mp/feeds-" + y + ".json";
const FEEDS_JSON_URL = feedsUrlOf(SCHOOL_YEAR); // annÃ©e courante par dÃ©faut (suite 107)
const FEEDS_FALLBACK_URL = feedsUrlOf(DATA_YEAR); // repli si l'annÃ©e N n'est pas encore publiÃ©e

// ---- SUITE 111 : clÃ´ture automatique d'annÃ©e (premier chargement aprÃ¨s le 1er aoÃ»t).
// Si le marqueur edt2-year (posÃ© Ã  chaque synchro) dÃ©signe l'annÃ©e PRÃCÃDENTE, on fige
// un instantanÃ© complet dans edt2-archive-<annÃ©e> (clÃ© JAMAIS purgÃ©e, JAMAIS retouchÃ©e,
// idempotente : si elle existe dÃ©jÃ  on ne fait rien) puis on purge les caches annuels
// reconstruisables â sinon le premier â» de l'annÃ©e nouvelle afficherait un diff fantÃ´me
// massif Â« crÃ©neaux supprimÃ©s Â» (les flux ont dÃ©jÃ  basculÃ© sur l'annÃ©e suivante).
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

// ---------- Promotions du dÃ©partement Mesures Physiques ----------
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
    // Une ressource posÃ©e sur un parent se propage aux enfants (ex. Devoir MatÃ©riaux MCPC â EA1).
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
    // suite 81 : MAE â INI/ALT1/ALT2 = groupes de TP (TD posÃ©s sur la promo entiÃ¨re, titre Â« (TD) Â»)
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
    // suite 81 : TVM â les 5 groupes sont des groupes de TP ; suite 80 : sur une seule ligne
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
    // suite 81 : AVTECH â A/B = groupes de TP (promo petite, TD sur la promo entiÃ¨re via titre Â« (TD) Â»)
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
    // suite 81 : CiTiSE1 â IUTD1/2 = groupes de TP
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
    // suite 81 : IUTD2 retirÃ© (groupe inexistant cette annÃ©e, comme MB4/TA2)
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
  const tp = td === c ? (cfg.tree[td] || []).length ? (cfg.tree[td] || []).join(" Â· ") : "" : c;
  return {
    opt,
    td,
    tp
  };
}
// Suite 64 : WIDE = affichage Â« ordinateur Â» (â¥ 1024 px, mis Ã  jour au resize) : les libellÃ©s
// reprennent leur forme longue (BUT1, Aujourd'hui, A1-6, Groupe A, RafraÃ®chirâ¦). Le harnais
// de test (pas de window) reste en affichage mobile compact.
let WIDE = false;
try {
  if (typeof window !== "undefined" && window.innerWidth >= 1024) WIDE = true;
} catch (e) {}
const dispG = g => WIDE || !/^[A-Za-z]+\d+-\d+$/.test(g) ? g : g.replace("-", "");
// Suite 58 : TVM â Â« Groupe A / Groupe B Â» rÃ©sumÃ©s en Â« GrA / GrB Â» Ã  l'affichage (chips + titres) ;
// les noms internes (matching ADE : Â« Groupe A Â», Â« Gr 1 Â»â¦) restent inchangÃ©s.
// Suite 64 : sur ordinateur, forme longue conservÃ©e (Â« Groupe A Â», Â« A1-6 Â»).
const grpDisp = (promo, g) => !WIDE && promo === "MP-3A-TECHVIMAT" ? g.replace(/^Groupe /, "Gr") : dispG(g);
const colColor = (c, promo) => {
  const i = PROMOS[promo].tdRoots.indexOf(colInfo(c, promo).td);
  return (i >= 0 ? TD_COLOR_CYCLE[i % TD_COLOR_CYCLE.length] : null) || "bg-violet-500/20 text-violet-100 border-violet-400/30";
};
function normLabel(s, promo) {
  // Suite 50 : les flux ICS ADE nomment les groupes Â« nus Â» (C, B, A1-6, Groupe Aâ¦) ou prÃ©fixÃ©s
  // (Â« TP TA1 Â», Â« Etud-MP-3A-DU AVTECH Â», Â« MP3 MAE INI Â»). On normalise par rapport Ã 
  // l'ARBRESCENCE de la promo : tout libellÃ© Ã©gal (casse ignorÃ©e) Ã  un nÅud de l'arbre est un
  // groupe ; sinon les rÃ¨gles historiques BUT2 (TA/MA/MB/EAâ¦) ; sinon pas un groupe (null).
  const raw = String(s == null ? "" : s).trim();
  const pr = promo || "";
  let t = raw.replace(/^Etud-/i, "").trim();
  if (/^(TD|TP)\s+/i.test(t)) t = t.replace(/^(TD|TP)\s+/i, "").trim();
  const up0 = t.toUpperCase();
  if (pr && up0 === pr.toUpperCase()) return pr; // Â« Etud-MP-2A Â» â racine de la promo
  if (pr === "MP-3A-AVTECH" && up0 === "MP-3A-DU AVTECH") return pr;
  if (pr === "MP-3A-TECHVIMAT" && up0 === "MP-3A-DU TECHVIMAT") return pr;
  if (pr === "MP-3A-MAE") {
    const mm = t.match(/^MP3 MAE (INI|ALT1|ALT2)$/i);
    if (mm) return mm[1].toUpperCase();
  }
  if (pr === "CiTiSE1-IUTD" || pr === "CiTiSE2-IUTD") {
    const mm = t.match(/^CiTiSE[12]-IUTD([12])$/i);
    if (mm) return "IUTD" + mm[1];
  } // Â« CiTiSE1-IUTD1 Â» â IUTD1
  const m = up0.match(/^(TI|MCPC|MAE|TA|MA|MB|EA)(\d)?$/);
  if (m) return m[1] + (m[2] || "");
  if (up0 === "MP-2A") return "MP-2A"; // appel sans promo (gnrm) : comportement historique
  if (pr && PROMO_DERIVED[pr]) {
    const hit = PROMO_DERIVED[pr].order.find(n => String(n).toUpperCase() === up0);
    if (hit) return hit; // Â« C Â» pour BUT1, Â« B Â» pour AVTECH, Â« Groupe A Â» pour TVM, Â« ALT1 Â»â¦
    const root = pr.toUpperCase() + "-"; // Â« CiTiSE1-IUTD1 Â» â nÅud Â« IUTD1 Â» de l'arbre CiTiSE1-IUTD
    if (up0.startsWith(root)) {
      const rest = up0.slice(root.length);
      const hit2 = PROMO_DERIVED[pr].order.find(n => String(n).toUpperCase() === rest);
      if (hit2) return hit2;
    }
  }
  return null;
}
const TEACHER_RE = /^[A-ZÃ-ÃÃ-Ã][A-ZÃ-ÃÃ-Ã'-]*( +[A-ZÃ-ÃÃ-Ã][A-ZÃ-ÃÃ-Ã'-]+)+$/;
// Ãtiquettes de RESSOURCES ADE (Â« TD MAE Â», Â« virtuel_MPH2 Â»...) : jamais des personnes.
// Un token contenant un mot ressource (TD, TP, CM, MAE, MCPC, TVM, VIRTUEL...) est Ã©cartÃ©
// de la liste des enseignants ; Â« TD MAE Â» est le groupe de TD MAE (ressource ADE), pas un enseignant.
const RES_WORD_RE = /(^|\s|_)(TD|TP|CM|MAE|MCPC|TVM|AVTECH|TECHVIMAT|VIRTUEL|EVENEMENTS|AGENDA)(\s|$|_)/i;
function extractMeta(desc, promo) {
  const groups = [],
    teachers = [];
  let virtEns = false;
  for (const raw of (desc || "").split(/\n|Â·/)) {
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
  // Suite 58 : promo peut Ãªtre null (agenda enseignant/salle/cours ouvert via un favori) â neutre.
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

// Suite 68 : ADE a changÃ© le format des UID (15/11/2026) â le serveur prÃ©fixe dÃ©sormais
// Â« 02 Â» + l'annÃ©e universitaire (Â« 2026-2027 Â») DANS la partie hex : UID = "ADE" + hex("02" +
// "2026-2027" + "ST-ETIENNE-<num>-<i>-<j>"). La base embarquÃ©e utilise l'id historique
// Â« ADE<num>-<i>-<j> Â» ; sans normalisation, TOUT crÃ©neau devenait Â« ajoutÃ© Â» au diff.
// On hex-dÃ©code et on ne garde que la queue aprÃ¨s Â« ST-ETIENNE- Â» (gÃ¨re aussi l'ancien
// format sans prÃ©fixe annÃ©e ; les ids dÃ©jÃ  dÃ©cimaux Â« ADEâ¦-â¦ Â» passent tels quels).
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
              // SUITE 131 : Ã©tiquette D'ORIGINE conservÃ©e â la promo du flux ADE (jamais devinÃ©e
              // depuis le groupe : Â« IUTD1 Â» est partagÃ© par CiTiSE1 ET CiTiSE2, Â« A Â»/Â« B Â» par
              // BUT1 ET AVTECH, Â« ALT1 Â»/Â« ALT2 Â» par BUT2-ALT ET MAE). L'affichage reste inchangÃ©.
              ...(promo ? {
                promoSrc: promo
              } : {})
            });
          }
        } catch (err) {/* Ã©vÃ©nement mal formÃ© : ignorÃ© */}
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
const fmtH = x => (Math.round(x * 4) / 4).toLocaleString("fr-FR") + " h"; // suite 74 : durÃ©es/heures (ex. Â« 1,5 h Â», Â« 3 h Â»)
const fmtDurH = h => {
  const m = Math.round(h * 60);
  if (m < 60) return m + " min";
  return Math.floor(m / 60) + "h" + (m % 60 ? String(m % 60).padStart(2, "0") : "");
}; // suite 78 : durÃ©e compacte des crÃ©neaux (Â« 1h Â», Â« 1h30 Â», Â« 45 min Â»)
// Suite 52 : cellule Â« SynchronisÃ© depuis le Â» du tableau des flux (onglet Flux) â
// vert = synchronisÃ© en direct rÃ©cemment Â· ambre = donnÃ©es embarquÃ©es (secours) ou Ã©chec.
const syncCell = (busy, last, err, dataDate) => busy ? /*#__PURE__*/React.createElement("span", {
  className: "text-[10.5px] text-slate-400"
}, "synchronisationâ¦") : err ? /*#__PURE__*/React.createElement("span", {
  className: "text-[10.5px] text-amber-300"
}, "Ã©chec de la derniÃ¨re tentative") : last ? /*#__PURE__*/React.createElement("span", {
  className: "text-[10.5px] text-emerald-300 whitespace-nowrap"
}, last.toLocaleDateString("fr-FR"), " Ã  ", fmtHM(last)) : /*#__PURE__*/React.createElement("span", {
  className: "text-[10.5px] text-amber-300 whitespace-nowrap"
}, dataDate ? dataDate + " (embarquÃ©)" : "jamais synchronisÃ©");
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
const isoD = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); // suite 80 : date locale Â« yyyy-mm-dd Â» (sÃ©lecteur vue JournÃ©e)

// Code couleur : teinte = formation Â· hachures = alternance (BUT2 ALT, MAE ALT, TECHVIMAT, AVTECH) Â· tracÃ© = type de cours Â· violet = Ã©valuation
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
// SUITE 136 : les couleurs des cases passent en TOKENS CSS (option A Â« tints pÃ¢les Â»).
// :root = valeurs HISTORIQUES (thÃ¨me sombre strictement inchangÃ© Ã  l'octet de rendu prÃ¨s) ;
// html.light redÃ©finit chacun des tokens pour le clair (voir feuille LIGHT â palette
// construite pour fond blanc : tint solide pÃ¢le + teintes 600-700, hachures noires
// translucides, examen lila foncÃ©). Le kiosk (tv, toujours sombre) embarque :root aussi
// via THEME_VARS_136 (sinon les cases colorFor perdraient leurs couleurs).
// SUITE 136b : + tokens --fam-*-txt (couleur du TITRE de case, Ã©mise par colorFor) â
// :root = #f1f5f9 (slate-100, identique Ã  l'hÃ©ritage historique : zÃ©ro drift sombre/tv) ;
// la feuille light les redÃ©finit en teintes foncÃ©es PAR FAMILLE (maquette option A).
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
// Jetons de groupes/classes -> formation (vote) : les groupes Â« nus Â» (MA, MB3, A, B7-12...)
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
// pas le type de sÃ©ance ; on se rabat sur le nommage du dÃ©partement â promo entiÃ¨re = CM,
// groupe de TD (A/B/C/D, TA/MA/MB, INI/ALT1/ALT2, Groupe A/B, IUTD1/2â¦) = TD, sous-groupe
// de TP (A1-6, A7-12, MA1, EA1, Gr 1â¦) = TP ; l'association TA+EA (souvent regroupÃ©s en TD)
// est tranchÃ©e TD dÃ¨s qu'un groupe de TD est prÃ©sent. EA seul = niveau TD (ses TP sont EA1/EA2).
// Ne s'applique QUE si le titre n'a rien dit (detectType = Autre) et si le crÃ©neau n'est pas
// un Ã©vÃ©nement informatif (Ã©lections, infos, prÃ©sentationsâ¦) : aucun impact ailleurs.
const GROUP_KIND = (() => {
  // Suite 81 : carte PAR PROMO + repli global â Â« A Â» de BUT1 = TD mais Â« A Â» d'AVTECH =
  // TP ; la clÃ© globale seule (premier gagnant) Ã©crasait les petits groupes homonymes.
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
  const p = promo ? promoOfGroup(gs[0], promo) || promo : promoSrcOf(ev) || promoOfGroup(gs[0], null) || promo; // SUITE 131 : sans promo de contexte, Ã©tiquette d'origine JAMAIS supposition
  if (p && PROMOS[p] && (gs.includes(p) || coversPromo(gs, p))) return "CM";
  const kinds = gs.map(g => groupKindOf(g, p)).filter(Boolean); // suite 81 : kinds par promo (repli global)
  if (!kinds.length) return null;
  // SUITE 134 : blindage Â« CM en amphi Â» â un crÃ©neau au titre muet, tenu dans un AMPHI
  // (I101/I002, Â« amphi â¦ Â» : nommage du bÃ¢timent) avec PLUSIEURS groupes de TD de la
  // mÃªme promo est un CM Ã  liste de groupes incomplÃ¨te (export ADE antÃ©rieur : le badge
  // Â« TD Â» parasite sur le CM promo-wide du 25/11). VÃ©rifiÃ© sur la base complÃ¨te du
  // 15/11 : AUCUN vrai TD multi-groupes en amphi (les 5 exceptions â infos/CEM/AVTECH â
  // sont dÃ©jÃ  neutralisÃ©es par INFO_EV_RE chez l'appelant).
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
  // SUITE 136 : famille normalisÃ©e en CLÃ (fk) pour nommer les tokens ; hex en dur
  // remplacÃ©s par var(--fam-*/--exam-line) â :root = valeurs historiques (sombre
  // identique), la feuille LIGHT redÃ©finit chaque token pour le clair (option A).
  const fk = FAM[fam] ? fam : "dept";
  const f = FAM[fk];
  // type : le titre d'abord ; sinon heuristique de nommage des groupes (suite 22), sauf
  // Ã©vÃ©nements informatifs (Ã©lections, infos, prÃ©sentationsâ¦) qui restent Â« Autre Â».
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
    badge = "TD"; // Suite 69d/72 : pastille Â« TD Â» dÃ¨s que le type TD est dÃ©tectÃ©, prÃ©fixe du titre ou pas
  } else {
    style = {
      backgroundColor: "var(--fam-" + fk + "-cm)",
      border: "1px solid var(--fam-" + fk + "-hue)",
      borderLeft: "4px solid var(--fam-" + fk + "-hue)",
      backgroundImage: bi
    };
  }
  // SUITE 136b : couleur du TITRE de case (hÃ©ritÃ©e par lineTitre130g) par famille â
  // token :root slate-100 en sombre/tv (zÃ©ro drift), teintes foncÃ©es par famille en clair.
  style.color = "var(--fam-" + fk + "-txt)";
  return {
    style,
    badge
  };
}
function detectType(ev) {
  const s = ev.summary.toLowerCase();
  if (/examen|partiel|devoir|contr[oÃ´]le|ctrl|interro|soutenance|1\/3\s*t/.test(s)) return "Examen";
  if (/^tp\b|\btp\b/.test(s)) return "TP";
  if (/^td\b|\btd\b/.test(s)) return "TD";
  if (/\bcm\b|amphi/.test(s)) return "CM";
  return "Autre";
}

// ÃvÃ©nements sans compteur : Ã©valuations (devoirs, examens, soutenances, Â« 1/3 temps Â») et
// sÃ©ances informatives (prÃ©sentations, infos, Ã©lections, CEM, jurys, rÃ©unions).
const INFO_EV_RE = /pr[Ã©e]sentation|Ã©lection|election|(^|\s)infos\b|^cem\b|jury|rÃ©union|reunion/i; // suite 80 : PLURIEL uniquement â Â« Info Python/Labview/EXCEL VBA Â» sont des COURS, pas des Ã©vÃ©nements informatifs (badge TP/TD + compteurs rÃ©cupÃ©rÃ©s)
// Suite 72 : un Â« devoir Â» pour le bouton Devoirs = Ã©valuation dÃ©tectÃ©e au titre
// (devoir, examen, contrÃ´le, interrogation, soutenance) MAIS PAS Â« 1/3 temps Â» :
// c'est une info pour la surveillante (temps majorÃ©), pas un devoir supplÃ©mentaire.
// Le crÃ©neau reste affichÃ© sur l'agenda, il n'apparaÃ®t juste pas dans la liste.
// SUITE 146 : le mot-clÃ© d'Ã©valuation PRIME sur la mention 1/3 temps. CÃ´tÃ© MP Â« 1/3 temps Â»
// est un crÃ©neau DÃDIÃ (titre seul, info pour la surveillante : toujours exclu), mais cÃ´tÃ©
// CiTiSE la mention vit DANS le titre du devoir (Â« Devoir Chimie (dont 1/3 temps) Â») :
// l'exclusion aveugle vidait la liste des devoirs CiTiSE. Un titre avec mot-clÃ© = devoir,
// mÃªme 1/3 ; la mention SEULE (sans mot-clÃ©) reste exclue (surveillance, pas un devoir).
const DEVOIR_KW_146 = /(examen|partiel|devoir|contr[oÃ´]le|ctrl|interro|soutenance|(^|\s)ds(\s|$))/;
const isDevoir = e => {
  const s = (e.summary || "").toLowerCase();
  if (/1\/3\s*t/.test(s) && !DEVOIR_KW_146.test(s)) return false;
  return /(^|\s)ds(\s|$)/.test(s) || detectType(e) === "Examen";
};
const noBadgeEv = e => !!e && (detectType(e) === "Examen" || INFO_EV_RE.test(e.summary || ""));
// Plusieurs enseignants (soutenances, jurys, rÃ©unions) : les sÃ©ries n'ont pas Ã  Ãªtre comptÃ©es.
const multiTch = e => !!e && ((e.teacher || "").split(" / ").filter(Boolean).length > 1 || (e.co || []).filter(Boolean).length > 0);
// Suite 61 (suite 85 : suit la semaine AFFICHÃE) : compteurs d'un favori ENSEIGNANT â
// heures CM/TD/TP de la semaine passÃ©e en paramÃ¨tre (lundiâdimanche, wsStart) et
// Â« x/y (annÃ©e) Â» : x = heures faites depuis le dÃ©but de l'annÃ©e
// connue (donnÃ©es dÃ¨s le 01/09) jusqu'au VENDREDI de la semaine affichÃ©e incluse,
// y = total septembreâjuillet dans la base. Ãvaluations, Ã©vÃ©nements informatifs
// et crÃ©neaux multi-enseignants (jurys, conseils) exclus, comme les compteurs y/7.
// Un TD fait devant 2 groupes (2 crÃ©neaux) compte 2 fois ; un crÃ©neau unique avec
// 2 groupes compte 1 fois (dÃ©doublonnÃ© par crÃ©neau, pas par groupe).
const favHours = (t, teachers, wsStart) => {
  const evs = (teachers[t] || []).filter(e => /^(CM|TD|TP)$/.test(detectType(e)) && !noBadgeEv(e) && !multiTch(e));
  // Suite 85 : hSem sur la semaine AFFICHÃE (wsStart), plus de date rÃ©elle codÃ©e en dur â
  // semaines de vacances â 0h/sem, navigation dans le passÃ© â cumul hAn plus court.
  const wkA = wsStart.getTime();
  const wkB = wkA + 7 * 864e5;
  const dAn = wsStart.getTime() + 5 * 864e5; // fin du VENDREDI de la semaine affichÃ©e (incluse)
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
// Suite 79 : rattache un item du diff (persistÃ© Â« edt2-diff Â» au dernier â») Ã  un agenda
// favori â enseignant, salle, cours ou promo/groupes. Champs stockÃ©s au moment du â» :
// id, tc (enseignant, Â« A / B Â» si plusieurs), l (salle(s), Â«,Â»-sÃ©parÃ©es), g (groupes
// Â«,Â»-sÃ©parÃ©s), s (titre), p (promo). Un item d'un ANCIEN diff (stockÃ© avant la suite 79,
// sans ces champs) ne remonte que pour un favori Â« promo Â» via p â aucun rattachement
// faux : split d'une chaÃ®ne vide donne [], includes renvoie false.
const diffMatch = (it, s) => {
  if (!it || !s) return false;
  if (s.kind === "teacher") {
    const parts = String(it.tc || "").split(" / ").map(x => x.trim());
    // Suite 86 : l'ANCIEN enseignant (otc) voit AUSSI le changement â un crÃ©neau
    // qui lui Ã©chappe (passÃ© Ã  un collÃ¨gue) remonte dÃ©sormais Ã  son badge Î.
    const oparts = String(it.otc || "").split(" / ").map(x => x.trim()).filter(Boolean);
    if (s.teacher === VIRT_ENS_LABEL) return parts.some(isVirtEnsKey) || oparts.some(isVirtEnsKey); // suite 80 : agrÃ©gat Â« Enseignant virtuel Â»
    const t = String(s.teacher || "").trim();
    return parts.includes(t) || oparts.includes(t);
  }
  if (s.kind === "room") {
    const parts = String(it.l || "").split(",").map(x => x.trim());
    // Suite 86 : l'ANCIENNE salle (ol) voit AUSSI le changement (crÃ©neau parti ailleurs).
    const oparts = String(it.ol || "").split(",").map(x => x.trim()).filter(Boolean);
    if (s.room === VIRT_ROOM_LABEL) return parts.some(isVirtRoomKey) || oparts.some(isVirtRoomKey); // suite 80 : agrÃ©gat Â« Salle virtuelle Â»
    const r = String(s.room || "").trim();
    return parts.includes(r) || oparts.includes(r);
  }
  if (s.kind === "cours") return norm(it.s || "") === norm(s.course || "");
  if (s.kind === "promo") {
    if (it.p !== s.promo) return false;
    if (!s.groups.length) return true;
    // Suite 80 : mÃªme fermeture de groupes que la grille promo (slotData/closureFor) â
    // un favori MA1 voit aussi les crÃ©neaux parents MA (CM/TD du groupe TD parent).
    const cl = new Set();
    for (const g of s.groups) groupClosure(g, s.promo).forEach(x => cl.add(x));
    return String(it.g || "").split(",").map(x => x.trim()).some(h => cl.has(gnrm(h)));
  }
  return false;
};
// SUITE 144 : LCA du diff â nÅud d'affichage NON REDONDANT d'un item : l'ancÃªtre
// commun le plus BAS des groupes touchÃ©s dans l'arbre de la promo. Un item sur
// A1-6 seul vit sur A1-6 (jamais sur A ni BUT1) ; un item touchant tout A vit sur
// A (jamais sur ses enfants) ; un crÃ©neau promo entiÃ¨re (sans groupes) vit sur le
// NÅUD PROMO (retour null). Les pastilles În par nÅud n'affichent donc JAMAIS deux
// fois le mÃªme changement, et un frÃ¨re non touchÃ© ne porte rien.
const diffLcaNode144 = (p, gStr) => {
  try {
    const gs = String(gStr || "").split(",").map(x => x.trim()).filter(Boolean);
    if (!gs.length) return null; // promo entiÃ¨re â nÅud promo
    const tree = (PROMOS[p] || {}).tree || {};
    const kidsOf = n => tree[n] || [];
    // SUITE 144 : le LCA porte sur les NÅUDS-GROUPES (pas leurs feuilles) â un Â« TD
    // MAE Â» vit sur la chip MAE, un Â« TP EA1 Â» sur la chip EA1 (le nÅud que l'Ã©tudiant
    // reconnaÃ®t), un groupe hors arbre (Ã©tiquette libre) est IGNORÃ.
    const aff = gs.filter((g, i) => gs.indexOf(g) === i);
    const pathOf = (leaf, n, acc) => {
      if (n === leaf) return acc.concat([n]);
      for (const c of kidsOf(n)) {
        const r = pathOf(leaf, c, acc.concat([n]));
        if (r) return r;
      }
      return null;
    };
    const paths = aff.map(l => pathOf(l, p, [])).filter(Boolean);
    if (!paths.length) return null; // tous les groupes hors arbre â nÅud promo
    if (!paths.length) return null;
    let depth = 0;
    outer: while (paths[0][depth] !== undefined) {
      const at = paths[0][depth];
      for (const pa of paths) if (pa[depth] !== at) break outer;
      depth++;
    }
    const r = paths[0][depth - 1];
    return !r || r === p ? null : r; // LCA = racine â nÅud promo
  } catch (e) {
    return null;
  }
};
// Suite 86 : sous-type d'un item Â« mod Â» â 'room' : salle uniquement (regroupÃ©s,
// repliÃ©s par dÃ©faut) ; 'ens' : enseignant uniquement (badge Â« Î ens. Â») ;
// 'move' : dÃ©placement/titre ; 'legacy' : item stockÃ© AVANT la suite 86 (sans
// os/otc) â affichÃ© Ã  l'ancien format jusqu'au prochain â».
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
// Suite 86 : requalification du POINT DE VUE d'un agenda ENSEIGNANT ou SALLE â
// 'gain' : le crÃ©neau ARRIVE sur cet agenda (nouvel enseignant / nouvelle salle) ;
// 'loss' : il le QUITTE (ancien enseignant / ancienne salle) ; null : sans objet.
// Vue globale ou agenda promo/cours/groupe : toujours null (sÃ©mantique globale).
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
// Suite 87 : AVTECH (alternance en BLOCS de 3 semaines, agenda complÃ¨tement vide entre
// les blocs = pÃ©riode en entreprise) â le badge n/N d'une sÃ©rie TP ne compte pas
// l'annÃ©e entiÃ¨re : la liste triÃ©e des horodatages est scindÃ©e en SOUS-SÃRIES sur un
// Ã©cart > 21 jours entre deux sÃ©ances consÃ©cutives du mÃªme coursÃgroupe. Marges
// larges : intra-bloc â¤ ~10 jours (2-3 TP/semaine en rev-cheval), inter-blocs
// plusieurs semaines ; TVM et les autres promos NUMÃROTATION ANNUELLE inchangÃ©e
// (dÃ©cision du 19/11 : ne rien faire pour TVM).
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
// Suite 64 â Proposeur de rÃ©organisation (REPLAN_ENABLED, v3+) : oÃ¹ dÃ©placer un crÃ©neau ?
// Un crÃ©neau Â« touche Â» un groupe si ses propres groupes et lui se recouvrent dans
// l'arbre TD/TP (promo entiÃ¨re â TD â sous-groupes de TP) â cf. coveredColumns.
// Suite 64b : la base embarquÃ©e garde parfois `groups` en STRING ("A1-3,B2") â
// on normalise AVANT tout .some/.includes, sinon replanFind plante silencieusement.
const grpsOf = c => Array.isArray(c.groups) ? c.groups : typeof c.groups === "string" && c.groups ? c.groups.split(",") : [];
// Suite 66 : la base mÃ©lange Ã©tiquettes prÃ©fixÃ©es (Â« TP TA1 Â», Â« TD MAE Â») et nues
// (Â« TA1 Â», Â« MAE Â») â sans normalisation, la fermeture ignore ces crÃ©neaux et le
// proposeur offre des slots oÃ¹ les Ã©tudiants ont cours. normLabel fait le mapping.
const rgNrm = (g, promo) => normLabel(String(g == null ? "" : g), promo) || String(g == null ? "" : g).trim();
const touchesGroup = (c, g, promo) => {
  const gg = rgNrm(g, promo);
  const gc = groupClosure(gg,g" && (k === "edt2-favs" || k === "edt2-sources" || k === "edt2-feed-urls" || k === "edt2-fit" || k === "edt2-mp-only" || k === "edt2-perso-ref" || k === "edt2-perso-ref-lines" || k === "edt2-perso-service" || k.indexOf("edt2-perso-") === 0 || k.indexOf("edt2-serhist") === 0 || k.indexOf("edt2-archive-") === 0);
const persoLoad108 = (t, k) => {
  const v = load(persoKeyOf(t, k));
  if (v === null && PERSO_LEGACY_KEYS[k]) return load(PERSO_LEGACY_KEYS[k]); // SUITE 137 : migration NEUTRE â les clÃ©s non prÃ©fixÃ©es (suites 92-107) n ont existÃ© que sur l appareil du titulaire qui les a Ã©crites (versions mono-compte) : elles servent ici de repli pour cet enseignant, sans aucun nom codÃ© en dur
  return v;
};
// ---- SUITE 137 : archive d'annÃ©e IMPORTABLE (gÃ©nÃ©rique â tout collÃ¨gue avec SON archive) ----
// L annÃ©e figÃ©e 2025-2026 n est PLUS embarquÃ©e dans le code : chaque enseignant importe le
// JSON de son archive (schÃ©ma edt-mp-archive-1 : enseignant, annee, weeks{cm,td,tp,byPromo},
// refItems?, refTotal?, rapprochementOSE?), persistÃ© PAR ENSEIGNANT dans le pÃ©rimÃ¨tre des
// prÃ©fÃ©rences (prÃ©fixe edt2-perso-*, jamais purgÃ©, inclus dans l export/import complet 110).
const ARCHIVE_YEAR_137 = "2025-2026";
const archKeyOf = t => persoKeyOf(t, "archive-" + ARCHIVE_YEAR_137);
const archValid137 = a => {
  if (!a || typeof a !== "object" || !a.weeks || typeof a.weeks !== "object") return false;
  let n = 0;
  for (const k of Object.keys(a.weeks)) {
    const w = a.weeks[k];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !w || typeof w.cm !== "number" || typeof w.td !== "number" || typeof w.tp !== "number") return false;
    n++;
  }
  return n > 0;
};
const archLoad137 = t => {
  const v = load(archKeyOf(t));
  return archValid137(v) ? v : null;
}; // load() parse dÃ©jÃ  ; pas d archive = null (jamais de weeks devinÃ©es)
const archSave137 = (t, a) => {
  if (!archValid137(a)) return false;
  store(archKeyOf(t), a);
  return true;
};
const archRefTotal137 = a => !a ? null : typeof a.refTotal === "number" && isFinite(a.refTotal) && a.refTotal >= 0 ? a.refTotal : Math.round((Array.isArray(a.refItems) ? a.refItems : []).reduce((x, r) => x + (r && typeof r.h === "number" && r.h >= 0 ? r.h : 0), 0) * 100) / 100;
// Parseur OSE â page Â« Validation des enseignements prÃ©visionnels Â» (2 pages distinctes
// derriÃ¨re le CAS). Port calibrÃ© du proto parse-ose.js (33/33 lignes, totaux exacts sur le
// collÃ© rÃ©el) : cellules TAB, dÃ©cimaux virgule, formations Ã  rallonge (Enseignement
// mutualisÃ©\nâ¦), en-tÃªtes/menus ignorÃ©s, AUTO-CONTRÃLE vs totaux officiels de la page.
const OSE_NUM108 = s => {
  if (!s) return 0;
  const v = parseFloat(String(s).replace(/\u00a0/g, " ").replace(/\s/g, "").replace(",", "."));
  return isFinite(v) ? v : 0;
};
function parseOSEnseignements108(text) {
  // SUITE 108 : page OSE Â« enseignements Â» â lignes de service CM/TD/TP
  const lines = String(text || "").split("\n");
  const rows = [];
  const official = {};
  let curForm = "";
  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    const mTot = line.match(/Totaux par type d'intervention\s*:\s*([\d,\s]+)$/i) || line.match(/Total des heures de service\s*:\s*([\d,\s]+)/i);
    if (mTot) {
      const c = mTot[1].split(/\t|\s{2,}/).map(x => OSE_NUM108(x)).filter(x => x > 0);
      if (/Totaux par type/i.test(line)) {
        official.cm = c[0];
        official.td = c[1];
        official.tp = c[2];
      } else official.service = c[0];
      continue;
    }
    const cells = line.split("\t").map(c => c.replace(/\u00a0/g, " ").trim());
    if (cells.length < 6) continue;
    const nums = [];
    let i = cells.length - 1;
    while (i >= 0 && cells[i] === "") i--; // tabulations finales vides
    for (let k = 0; k < 3; k++) {
      const c = cells[i - k] || "";
      if (/^[0-9]+([.,][0-9]+)?$/.test(c)) nums.unshift(OSE_NUM108(c));else break;
    }
    if (nums.length !== 3) continue; // pas une ligne CM/TD/TP
    const enseignement = cells[i - 3] || "";
    const periode = cells[i - 4] || "";
    let formation = (cells[i - 5] || "").replace(/\s+/g, " ").trim();
    if (formation === "" || formation.startsWith("Enseignement mutualisÃ©")) formation = curForm; // formation Ã  rallonge : le vrai nom Ã©tait sur la ligne prÃ©cÃ©dente
    else if (formation.length > 3) curForm = formation;
    if (!enseignement) continue; // en-tÃªte Â« Composanteâ¦ CM TD TP Â»
    if (/^(Composante d'enseignement|Formation|PÃ©riode|Enseignement|CM)$/i.test(enseignement)) continue; // anti-faux-positifs
    if (nums[0] + nums[1] + nums[2] === 0) continue;
    rows.push({
      formation,
      periode: /S[12]/.test(periode) ? periode : "",
      lib: enseignement.replace(/\s+/g, " "),
      cm: nums[0],
      td: nums[1],
      tp: nums[2]
    });
  }
  const tot = rows.reduce((a, r) => ({
    cm: a.cm + r.cm,
    td: a.td + r.td,
    tp: a.tp + r.tp
  }), {
    cm: 0,
    td: 0,
    tp: 0
  });
  tot.h = Math.round((tot.cm + tot.td + tot.tp) * 100) / 100;
  let check = "absent";
  if (official.cm !== undefined) check = Math.abs(official.cm - tot.cm) < 0.005 && Math.abs(official.td - tot.td) < 0.005 && Math.abs(official.tp - tot.tp) < 0.005 ? "OK" : "ÃCHEC";
  return {
    rows,
    tot,
    official,
    check
  };
}
function parseOSEReferentiel108(text) {
  // SUITE 108 : page OSE Â« rÃ©fÃ©rentiel prÃ©visionnel Â» â 1 nombre en fin de ligne, plafonds par fonction
  const lines = String(text || "").split("\n");
  const rows = [];
  const plafonds = [];
  const official = {};
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].replace(/\r$/, "");
    const mTot = line.match(/Total des heures de r[Ã©e]f[Ã©e]rentiel\s*:\s*([\d,\s]+)/i);
    if (mTot) {
      official.ref = OSE_NUM108(mTot[1].replace(/\t/g, " ").trim());
      continue;
    }
    const mPl = line.match(/^(\d+)\s*h pour\s*(\d+)\s*h max\./i);
    if (mPl) {
      const fn = (lines[li + 1] || "").replace(/^Heures max\. de r[Ã©e]f[Ã©e]rentiel par intervenant pour\s*/i, "").replace(/\s*nÂ°\s*\d+\s*$/i, "").trim();
      plafonds.push({
        plafond: OSE_NUM108(mPl[1]),
        maxParInterv: OSE_NUM108(mPl[2]),
        fn
      });
      continue;
    } // Â« 46 h pour 24 h max Â» = plafond TOTAL de la fonction 46 h, plafond par intervenant 24 h
    const cells = line.split("\t").map(c => c.replace(/\u00a0/g, " ").trim());
    if (cells.length < 5) continue;
    let i = cells.length - 1;
    while (i >= 0 && cells[i] === "") i--;
    const h = cells[i] || "";
    if (!/^[0-9]+([.,][0-9]+)?$/.test(h)) continue;
    const fonction = cells[i - 3] || "";
    const commentaires = cells[i - 2] || "";
    if (!fonction || /^(Fonction|Structure)$/i.test(fonction)) continue;
    if (/h pour|h max/i.test(line)) continue;
    rows.push({
      fonction,
      commentaires: commentaires.replace(/\s+/g, " "),
      h: OSE_NUM108(h)
    });
  }
  const byFn108 = {}; // SUITE 108 : fusion PAR FONCTION (les lignes OSE rÃ©fÃ©rentiel se rÃ©pÃ¨tent) â sert de lignes Ã©ditables
  for (const r of rows) byFn108[r.fonction] = Math.round(((byFn108[r.fonction] || 0) + r.h) * 100) / 100;
  const tot = Math.round(rows.reduce((a, r) => a + r.h, 0) * 100) / 100;
  // plafonds : rapprochement par nom de fonction normalisÃ© (espaces/parenthÃ¨ses variables dans la page)
  const byFnPl = {};
  for (const fn of Object.keys(byFn108)) {
    const nq = fn.replace(/\s+/g, "").toLowerCase();
    const pl = plafonds.find(p => p.fn.replace(/\s+/g, "").toLowerCase().indexOf(nq) >= 0 || nq.indexOf(p.fn.replace(/\s+/g, "").toLowerCase()) >= 0);
    byFnPl[fn] = pl ? {
      plafond: pl.plafond,
      plafondMax: pl.maxParInterv
    } : null;
  }
  let check = "absent";
  if (official.ref !== undefined) check = Math.abs(official.ref - tot) < 0.005 ? "OK" : "ÃCHEC";
  return {
    rows,
    byFn108,
    byFnPl,
    tot,
    official,
    check
  };
}
const oseDetect108 = text => {
  // SUITE 108 : auto-dÃ©tection du type de page par en-tÃªte (les DEUX pages sont distinctes derriÃ¨re le CAS)
  const t = String(text || "");
  if (/r[Ã©e]f[Ã©e]rentiel pr[Ã©e]visionnel/i.test(t) && (/Structure/.test(t) || /Total des heures de r[Ã©e]f[Ã©e]rentiel/i.test(t))) return "ref";
  if (/enseignements pr[Ã©e]visionnels/i.test(t) || /Composante d'enseignement/.test(t)) return "ens";
  return null;
};
const oseComplete108 = text => {
  // SUITE 108 : garde-fou complÃ©tude â marqueurs de dÃ©but et de FIN du tableau (totaux officiels)
  const t = String(text || "");
  const debut = /Composante d'enseignement|Structure\s*\t?\s*Fonction/i.test(t);
  const fin = /Totaux par type d'intervention|Total des heures de (?:service|r[Ã©e]f[Ã©e]rentiel)/i.test(t);
  return {
    debut,
    fin,
    full: debut && fin
  }; // full = pastille Â« sÃ©lection complÃ¨te Â»
};
const evCat = e => {
  const t = detectType(e);
  return t === "Examen" ? "dev" : t === "TD" || t === "TP" || t === "CM" ? "cours" : "autre";
};
// PrÃ©fixe TP/TD stylÃ© dans le titre (suite 21) : Â« TP Optique Â» affiche Â« TP Â» comme un mini
// badge noir sur blanc en tÃªte du titre ; le badge isolÃ© en fin de titre disparaÃ®t (redondant
// avec le titre). Garde-fou : type TP/TD dÃ©tectÃ© mais titre sans prÃ©fixe â l'ancien badge reste.
const TYPE_PREFIX_RE = /^(T[PD])\b/i;
const typeTitle = (summary, fallbackBadge, above) => {
  const s = String(summary || "");
  const m = s.match(TYPE_PREFIX_RE);
  // Suite 80 : above = badge sur sa PROPRE LIGNE au-dessus du titre (toute la largeur
  // pour le nom du cours). Le badge lui-mÃªme est rendu par l'APPELANT (div sÃ©parÃ©e) ;
  // ici on ne renvoie que le titre, prÃ©fixe retirÃ©.
  if (above) return m ? s.slice(m[0].length) : s;
  if (m) return /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-baseline"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[8.5px] font-bold text-slate-900 bg-slate-100 rounded px-1 mr-0.5"
  }, m[0].toUpperCase()), s.slice(m[0].length));
  // Suite 78 : le badge type va TOUJOURS AVANT le titre â mÃªme en repli fallback (ex. TD
  // Â« Machines Thermiques Â» : le badge TD se collait APRÃS le titre).
  return fallbackBadge ? /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-baseline"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[8.5px] font-bold text-slate-900 bg-slate-100 rounded px-1 mr-0.5"
  }, fallbackBadge), s) : s;
};
// Suite 80 : badge Ã  afficher au-dessus du titre (prÃ©fixe TP/TD du titre, sinon fallback).
const badgeOf = (summary, fallback) => {
  const m = String(summary || "").match(TYPE_PREFIX_RE);
  return m ? m[0].toUpperCase() : fallback || null;
};
// clÃ© de sÃ©rie de groupe : les flux RSS enseignant/salle nomment les promos Â« Etud-XXX Â» (ADE),
// les flux ICS par promo les nomment Â« XXX Â» â on normalise pour partager la mÃªme sÃ©rie de badges n/N.
const gk = g => {
  const s = String(g == null ? "" : g).trim();
  return /^Etud-/i.test(s) ? s.replace(/^Etud-/i, "") : s;
};
// Normalisation FILTRAGE des groupes d'Ã©vÃ©nements prÃ©chargÃ©s (bruts ADE) : Â« TP TA1 Â» â TA1,
// Â« TD MAE Â» â MAE, Â« Etud-MP-2A Â» â MP-2A ; les autres (salles de groupes BUT1, etc.) inchangÃ©s.
const gnrm = g => normLabel(String(g == null ? "" : g)) || gk(g);
// promo entiÃ¨re : les groupes listÃ©s couvrent toutes les feuilles de l'arbre de la promo,
// directement ou via leurs parents (ex. CM BUT1 Â« A,B7-12,C,D,B1-6 Â» = toute la promo).
// Suite 75a/75c/75d : PURGE des agendas enseignants. Seule une capture COMPLÃTE remplace :
// cutoff = null â remplacement intÃ©gral par enseignant (flux promos TOUS rÃ©ussis) ;
// Infinity â COMPLÃMENT : aucune purge, dedup-add seul (Â« ÃvÃ©nements MP Â» : crÃ©neaux sans
// Ã©tudiants ; flux promos partiels â le bug 75a vidait les agendas car ce flux ne contient
// pas les TD/CM). Enseignants absents de la capture : intouchÃ©s (capture partielle).
// Plus aucune purge de fenÃªtre : le RSS est retirÃ© (suite 75d). Purge (module, testable).
const purgeTeachers = (prev, add, cutoffMs) => {
  const nt = {
    ...prev
  };
  for (const t of Object.keys(nt)) if (t.includes(" / ")) delete nt[t]; // suite 59 : clÃ©s composites
  for (const t of Object.keys(add)) {
    const arr = [];
    const seen = new Set();
    for (const e of prev[t] || []) {
      const st = decDT(e.start);
      if (cutoffMs === null) continue; // remplacement intÃ©gral : la capture dÃ©cide de tout (Infinity = complÃ©ment : rien n'est purgÃ©)
      const k = st.getTime() + "|" + e.summary;
      if (!seen.has(k)) {
        seen.add(k);
        arr.push(e);
      }
    }
    for (const ev of add[t]) {
      const st = ev.start instanceof Date ? ev.start : decDT(ev.start);
      const k = st.getTime() + "|" + ev.summary;
      if (!seen.has(k)) {
        seen.add(k);
        arr.push({
          ...ev,
          start: (ev.start instanceof Date ? ev.start : decDT(ev.start)).toISOString(),
          end: (ev.end instanceof Date ? ev.end : decDT(ev.end)).toISOString()
        });
      }
    }
    arr.sort((a, b) => decDT(a.start) - decDT(b.start));
    nt[t] = arr;
  }
  return nt;
};
const coversPromo = (groups, p) => {
  if (!PROMOS[p] || !PROMO_DERIVED[p]) return false;
  const S = new Set((groups || []).map(gnrm));
  if (S.has(p)) return true;
  const tree = PROMOS[p].tree;
  const leaves = PROMO_DERIVED[p].order.filter(n => n !== p && !(tree[n] || []).length);
  if (!leaves.length) return false;
  const has = leaf => {
    if (S.has(leaf)) return true;
    const seen = new Set([leaf]);
    let cur = [leaf];
    while (cur.length) {
      const nxt = [];
      for (const x of cur) for (const par of PROMO_DERIVED[p].parents[x] || []) {
        if (S.has(par)) return true;
        if (!seen.has(par)) {
          seen.add(par);
          nxt.push(par);
        }
      }
      cur = nxt;
    }
    return false;
  };
  return leaves.every(has);
};
// clÃ© de sÃ©rie des badges n/N : promo entiÃ¨re â groupe parent (ex. Â« MP-1A Â», comme les sÃ©ances
// qu'ADE nomme directement avec le parent) ; regroupement partiel â combinaison triÃ©e des groupes.
const serKey = (e, p) => {
  const grps = e.groups || [];
  if (!grps.length) return "";
  if (grps.length === 1) return gk(grps[0]);
  const pp = p || promoSrcOf(e) || promoOfGroup(grps[0] || ""); // SUITE 131 : Ã©tiquette d'origine avant supposition
  return pp && coversPromo(grps, pp) ? pp : grps.map(gk).sort().join("+");
};
// libellÃ© du groupe parent : style Â« Etud-XXX Â» (ADE) pour les agendas enseignant/salle,
// clÃ© de promo (ex. Â« MP-1A Â») pour les agendas promo/cours.
const parentLabelOf = (p, useEtud) => {
  if (useEtud && p) {
    const k = Object.keys(ETUD_PROMO).find(kk => /^ETUD-/.test(kk) && ETUD_PROMO[kk] === p);
    if (k) return "Etud-" + k.slice(5);
  }
  return p || "";
};
// groupes AFFICHÃS d'un crÃ©neau : promo entiÃ¨re â seul le groupe parent est montrÃ©
const dispGroups = (e, p, useEtud) => {
  const grps = e.groups || [];
  if (grps.length > 1) {
    const pp = p || promoSrcOf(e) || promoOfGroup(grps[0] || ""); // SUITE 131
    if (pp && coversPromo(grps, pp)) return [parentLabelOf(pp, useEtud)];
  }
  return grps;
};
// suggestions d'autocomplÃ©tion : kinds = sous-ensemble de ["salle","enseignant","cours","groupe"]
// Suite 71 : rIdx = index des salles reconstruit depuis les crÃ©neaux ICS (allEvents) â
// la v2/v3 n'a plus de base embarquÃ©e, les salles viennent donc des flux synchronisÃ©s.
const suggFor = (qq, kinds, tch, cIdx, gIdx, rIdx) => {
  const out = [];
  if (kinds.includes("salle")) {
    const seenR = new Set();
    const allRooms = Object.keys(PRELOADED_ROOMS).concat(rIdx ? Object.keys(rIdx) : []);
    for (const r of allRooms) {
      if (seenR.has(r)) continue;
      seenR.add(r);
      if (/virtuel/i.test(r) && !isVirtRoomKey(r)) continue;
      const n = rIdx && rIdx[r] ? rIdx[r].n : (PRELOADED_ROOMS[r] || []).length;
      if (!n) continue;
      if (norm(r).includes(qq)) out.push({
        kind: "salle",
        label: r,
        txt: r,
        hint: n + " crÃ©neaux",
        w: norm(r).startsWith(qq) ? 0 : 1
      });
    }
  }
  if (kinds.includes("enseignant")) for (const t of Object.keys(tch)) if (norm(t).includes(qq) || norm(prettyName(t)).includes(qq)) out.push({
    kind: "enseignant",
    label: t,
    txt: dispName(t),
    hint: (tch[t] || []).length + " crÃ©neaux",
    w: norm(prettyName(t)).startsWith(qq) || norm(t).startsWith(qq) ? 0 : 1
  });
  if (kinds.includes("cours")) for (const k of Object.keys(cIdx)) if (k.includes(qq)) out.push({
    kind: "cours",
    label: cIdx[k].label,
    txt: cIdx[k].label,
    hint: cIdx[k].n + " crÃ©neaux",
    w: k.startsWith(qq) ? 0 : 1
  });
  if (kinds.includes("groupe")) for (const k of Object.keys(gIdx)) if (k.includes(qq)) out.push({
    kind: "groupe",
    label: gIdx[k].label,
    txt: gIdx[k].label,
    promo: gIdx[k].promo,
    hint: gIdx[k].n + " crÃ©neaux",
    w: k.startsWith(qq) ? 0 : 1
  });
  // Recherche Â« v-i-r-tâ¦ Â» (prÃ©fixe de Â« virtuel Â» suffit : Â« vi Â», Â« vir Â», Â« virt Â»â¦, aussi
  // Â« virt Â» contenu : Â« salle virtuelle Â») : l'agrÃ©gat Â« Enseignant virtuel Â» arrive en tÃªte,
  // puis chaque enseignant virtuel, puis l'agrÃ©gat Â« Salle virtuelle Â», puis chaque salle virtuelle.
  // Les ressources virtuelles individuelles remontant dÃ¨s Â« vi Â», les agrÃ©gats DOIVENT y Ãªtre
  // aussi, et avant. Â« vid Â» (TD Vide), Â« vib Â»â¦ ne dÃ©clenchent plus rien dÃ¨s la 3e lettre.
  const virtQ = "virtuel".startsWith(qq) || /virt/.test(qq);
  if (virtQ) {
    for (const o of out) {
      if (o.kind === "enseignant" && isVirtEnsKey(o.label)) o.w -= 3;else if (o.kind === "salle" && isVirtRoomKey(o.label)) o.w -= 1;
    }
    if (kinds.includes("enseignant")) out.push({
      kind: "enseignant",
      label: VIRT_ENS_LABEL,
      txt: VIRT_ENS_LABEL,
      hint: virtAggCount(tch, "ens") + " crÃ©neaux",
      w: -4
    });
    if (kinds.includes("salle")) out.push({
      kind: "salle",
      label: VIRT_ROOM_LABEL,
      txt: VIRT_ROOM_LABEL,
      hint: (rIdx ? Object.keys(rIdx).filter(isVirtRoomKey).reduce((a, k) => a + (rIdx[k] ? rIdx[k].n : 0), 0) : virtAggCount(PRELOADED_ROOMS, "room")) + " crÃ©neaux",
      w: -2
    }); // suite 74b : compte aussi le live (v2 : base vide)
  }
  out.sort((a, b) => a.w - b.w);
  // recherche Â« virtâ¦ Â» : on montre tout (2 agrÃ©gats + enseignants virtuels + 9 salles ; Â« Ã©quipements virtuels Â» exclus, ce sont des TP CAO prÃ©sentiels)
  return out.slice(0, virtQ ? 18 : 10);
};

// Flux ICS utilisÃ©s par le pipeline de publication (retÃ©lÃ©chargÃ©s Ã  chaque reconstruction,
// donnÃ©es embarquÃ©es dans la page). Ãtiquettes : Â« groupe Â» (flux promo/Ã©tudiants),
// Â« evt Â» (Ã©vÃ©nements dÃ©partement sans Ã©tudiants), Â« ens Â» (agenda enseignant),
// Â« salle Â» (agenda salle) â pas encore de flux ens/salle : un ajout apparaÃ®tra ici avec
// son Ã©tiquette pour que l'on sache ce qui alimente la publication.
const BUILD_FEEDS = [
// [tag, label, sous-Ã©tiquette] â titres courts (suite 56 : le tableau doit tenir sur mobile)
["groupe", "BUT1 MP"], ["groupe", "BUT2 MP", "(FI)"], ["groupe", "BUT2 MP", "(alt)"], ["groupe", "BUT3 MAE", "(alt)"], ["groupe", "BUT3 MAE/TI", "Avtech"], ["groupe", "BUT3 MCPC", "Techvimat"], ["groupe", "Citise 1"], ["groupe", "Citise 2"], ["evt", "ÃvÃ©nements"]];

// Suite 77 : libellÃ©s du bloc fusionnÃ© Â« Flux ADE officiels Â», INDEXÃS PAR NOM de flux
// (feeds.json ou secours â le tableau liste les flux rÃ©els, plus les libellÃ©s de build) :
// [tag, label, sous-Ã©tiquette]. Repli : nom du flux tel quel.
const FEED_META = {
  "BUT1": ["groupe", "BUT1 MP"],
  "BUT2": ["groupe", "BUT2 MP", "(FI)"],
  "BUT2 ALT": ["groupe", "BUT2 MP", "(alt)"],
  "BUT3 MAE": ["groupe", "BUT3 MAE", "(alt)"],
  "BUT3 AVTECH": ["groupe", "BUT3 MAE/TI", "Avtech"],
  "BUT3 TVM": ["groupe", "BUT3 MCPC", "Techvimat"],
  "CiTiSE 1": ["groupe", "Citise 1"],
  "CiTiSE 2": ["groupe", "Citise 2"],
  "ÃvÃ©nements MP": ["evt", "ÃvÃ©nements MP"]
};

// ---------- Bilan de charge (suites 24 & 26 ; SUITE 137 : config IMPORTABLE, neutre) ----------
// PrÃ©visionnel Â« pÃ´le physique Â» : PLUS AUCUNE donnÃ©e dans le code (SUITE 137 â retrait des
// 27 modules et de leurs notes nominatives, sauvegardÃ©es dans /confidentiel/ du dÃ©pÃ´t privÃ©).
// La config vit dans localStorage (clÃ© edt2-bilan-config, pÃ©rimÃ¨tre export/import complet
// suite 110) au format du fichier d'export edt-mp-bilan-config-1 : { titre, BILAN_WIN,
// rows:[{ block, win, promos, code, titre, prevu:{cm,td,tp}|null, note, allod?, rx:[{re,flags}] }] }.
// Import : bouton Â« ð Importer la config Â» de la vue Bilan ; export : Â« â© Exporter Â».
// Semantique inchangÃ©e cÃ´tÃ© consommation : prÃ©vu = heures TOUTES sÃ©ries confondues,
// rÃ©alisÃ© = somme des durÃ©es ADE des titres matchÃ©s (Ã©valuations et Ã©vÃ©nements
// informatifs exclus), fenÃªtres BILAN_WIN par ligne.
const BILAN_CFG_KEY_137 = "edt2-bilan-config";
const bilanRxParse137 = r => {
  // accepte {re, flags} (fichier d'export) ou "source" (regex sÃ©rialisÃ©e brute)
  try {
    const src = typeof r === "string" ? r : r && typeof r.re === "string" ? r.re : null;
    if (!src) return null;
    const fl = r && typeof r === "object" && typeof r.flags === "string" ? r.flags : "";
    return new RegExp(src, fl);
  } catch (x) {
    return null;
  }
};
const bilanParseCfg137 = j => {
  // valide le JSON importÃ© â config consommable | null (jamais de rÃ©fÃ©rentiel bÃ¢clÃ©)
  if (!j || typeof j !== "object" || !Array.isArray(j.rows)) return null;
  const rows = [];
  for (const L of j.rows) {
    if (!L || typeof L !== "object" || typeof L.code !== "string" || typeof L.titre !== "string" || !Array.isArray(L.promos) || typeof L.win !== "string") continue;
    const rx = (Array.isArray(L.rx) ? L.rx : []).map(bilanRxParse137).filter(Boolean);
    if (!rx.length) continue; // ligne sans regex utilisable : ignorÃ©e (garde-fou)
    const prevu = L.prevu && typeof L.prevu === "object" && [L.prevu.cm, L.prevu.td, L.prevu.tp].every(x => typeof x === "number" && isFinite(x) && x >= 0) ? {
      cm: L.prevu.cm,
      td: L.prevu.td,
      tp: L.prevu.tp
    } : null;
    rows.push({
      block: String(L.block || "Sans bloc"),
      win: L.win,
      promos: L.promos,
      code: L.code,
      titre: L.titre,
      prevu,
      note: typeof L.note === "string" ? L.note : "",
      allod: !!L.allod,
      rx
    });
  }
  const BILAN_WIN = j.BILAN_WIN && typeof j.BILAN_WIN === "object" ? j.BILAN_WIN : {};
  if (!rows.length) return null;
  return {
    titre: typeof j.titre === "string" && j.titre || "Bilan de charge",
    BILAN_WIN,
    rows
  };
};
const bilanLoadCfg137 = () => bilanParseCfg137(load(BILAN_CFG_KEY_137)); // load() parse dÃ©jÃ  : l'objet stockÃ© revient tel quel
const bilanSaveCfg137 = j => {
  if (!bilanParseCfg137(j)) return false;
  store(BILAN_CFG_KEY_137, j);
  return true;
}; // SUITE 137 : stockage OBJET (store stringifie ; l'export restitue les donnÃ©es d'origine)
// ---------- SUITE 132 : mode KIOSK Â« /tv/ Â» â Ã©cran suspendu du dÃ©partement ----------
// Spec actÃ©e (recette 24-25/11/2026) : affichage pour Ã©cran mural 30" en
// 1920Ã1080 paysage, sans souris ni clavier (mini-PC, navigateur plein Ã©cran au dÃ©marrage).
// Rendu DÃRIVÃ de la vue JournÃ©e existante (fusion layoutDay, couleurs colorFor/FAM,
// hachures alternants, seuils de lisibilitÃ©) â aucune donnÃ©e nouvelle :
//   - une page unique = la Â½ journÃ©e courante (bascule automatique sur l'horloge Ã 
//     12h45 ; si la Â½ courante est vide mais pas l'autre, on montre l'autre ; si le
//     jour est vide, on montre le prochain jour AVEC crÃ©neaux â l'IUT fermÃ© n'a pas
//     besoin d'Ã©cran) ;
//   - l'Ã©cran est COUPÃ EN DEUX horizontalement : chaque moitiÃ© est une grille PLEINE
//     LARGEUR portant une partie des promos â paires insÃ©parables BUT1+CiTiSE1 (haut)
//     et BUT2+CiTiSE2 (bas), puis les autres promos prÃ©sentes rÃ©parties vers la moitiÃ©
//     la moins chargÃ©e (Ã©quilibrage glouton par nombre de colonnes) ;
//   - colonnes = GROUPES FEUILLES de l'arbre ADE uniquement (A1-6, A7-12, TA1, MA1â¦,
//     jamais un parent ET ses enfants) ; les crÃ©neaux communs (CM/TD promo) restent
//     FUSIONNÃS sur les colonnes couvertes (layoutDay) ;
//   - promos sans crÃ©neau sur la Â½ journÃ©e : MASQUÃES (les autres s'Ã©largissent) ;
//   - HALO sur les crÃ©neaux EN COURS (recalculÃ© sur l'horloge toutes les 30 s) ;
//   - abrÃ©viations FR des intitulÃ©s (tvAbbr) pour que le titre tienne dans la case ;
//   - ?fit=1 : scÃ¨ne fixe 1920Ã1080 mise Ã  l'Ã©chelle (transform scale) pour simuler
//     l'Ã©cran rÃ©el depuis un tÃ©lÃ©phone â SANS ?fit=1 la scÃ¨ne rend Ã  l'Ã©chelle native.
// Auto-refresh ICS au DÃMARRAGE puis toutes les 15 min via onRefresh (App kiosk =
// refreshIcs silent) ; la cascade existante (firstSync â reconstruction Â« full Â»)
// prÃ©pare les donnÃ©es au premier lancement, le prÃ©-cache SW (suite 128) garde
// l'Ã©cran lisible hors ligne.
const TV_ABBR = [["Thermodynamique", "Thermo"], ["thermodynamique", "thermo"], ["Machines thermiques", "Mach. therm."], ["MÃ©canique vibratoire", "MÃ©ca. vib."], ["MÃ©canique", "MÃ©ca."], ["Vibrations", "Vib."], ["Vibratoire", "Vib."], ["Optique ondulatoire", "Opt. ondul."], ["Optique", "Opt."], ["Transferts thermiques", "Transf. therm."], ["Transferts", "Transf."], ["ChaÃ®ne de mesure", "ChaÃ®ne mes."], ["Instrumentation", "Instru."], ["MÃ©trologie", "MÃ©trol."], ["MatÃ©riaux", "MatÃ©r."], ["MathÃ©matiques", "Maths"], ["Physique", "Phys."], ["Chimie", "Chim."], ["Ãlectronique", "Ãlectron."], ["ÃlectricitÃ©", "Ãlec."], ["Informatique", "Info."], ["Programmation", "Prog."], ["ProbabilitÃ©s", "Proba."], ["Statistiques", "Stats."], ["BÃ¢timent", "BÃ¢t."], ["Environnement", "Envi."], ["Industrielle", "Indus."], ["expÃ©rimentale", "expÃ©."], ["ExpÃ©rimentale", "ExpÃ©."], ["La Fresque du climat", "Fresque climat"], ["RÃ©vision", "RÃ©v."], ["Acoustique", "Acou."], ["Application", "Appli."], ["Analyse", "Anal."], ["ModÃ©lisation", "ModÃ©l."], ["Capteurs", "Capt."], ["Quantique", "Quan."]];
const ADAPT_CSS_141C = [
// SUITE 141c : police ADAPTATIVE par container queries â chaque case (cq-case)
// devient un conteneur CSS ; le texte grossit avec la place rÃ©elle, EN TEMPS RÃEL
// (fenÃªtre/rotation/split), planchers = tailles historiques (une case d'1 h ne
// change JAMAIS), plafonds bornÃ©s (titre 18 px, horaire 13, secondaires 12).
// cqh/cqw = % du conteneur ; min() borne aussi par la LARGEUR (une case Ã©troite
// et haute ne gonfle pas). En clair, le titre passe en graisse 700.
".cq-case{container-type:size}", ".cq-case .cq-titre{font-size:clamp(11px,min(14cqh,6cqw),18px)!important}", ".cq-case .cq-hor{font-size:clamp(10px,min(10cqh,5cqw),13px)!important}", ".cq-case .cq-sub{font-size:clamp(10px,min(9cqh,4.5cqw),12px)!important}", "html.light .cq-titre{font-weight:700}",
// SUITE 141e : infos multicolonnes des cases XL (GO maquette-141e) â alignees a
// GAUCHE, N colonnes calculees par le navigateur (3-2-1 au redimensionnement,
// temps reel, zero JS), remplissage hauteur d'abord, trop-plein rogne au bord
// sans ellipsis, chaque ligne insÃ©cable (break-inside:avoid).
".cq-case .infos141e{columns:88px auto;column-fill:auto;column-gap:12px;text-align:left}", ".cq-case .infos141e>div{break-inside:avoid}"].join("\n");
function tvAbbr(s) {
  // SUITE 132 : abrÃ©viation FR des intitulÃ©s ADE â rÃ¨gles connues, puis repli (mot > 11 lettres â coupÃ© avec point)
  if (!s) return s;
  let r = String(s);
  for (const [a, b] of TV_ABBR) r = r.split(a).join(b);
  return r.replace(/[A-Za-zÃ-Ã¿]{12,}/g, m => m.slice(0, 10) + ".");
}
function tvLeaves(p) {
  // SUITE 132 : colonnes kiosk = FEUILLES de l'arbre â mÃªmes colonnes que la vue journÃ©e Â« Tous Â» (colsFor([]) : defaultCols Ã©tendus aux feuilles, DÃDUPLIQUÃS â MAE ne montre jamais Â« ALT Â» Ã  cÃ´tÃ© de ALT1/ALT2, et MP-2A ne duplique pas EA1 car MAE apparaÃ®t sous MCPC ET Ã  la racine)
  const cfg = PROMOS[p] || {};
  const tree = cfg.tree || {};
  const kids = g => {
    const k = tree[g] || [];
    return k.length ? k.flatMap(kids) : [g];
  };
  let out = (cfg.defaultCols && cfg.defaultCols.length ? cfg.defaultCols : tree[p] || []).flatMap(kids).filter((g, i, arr) => arr.indexOf(g) === i);
  if (out.length && PROMO_DERIVED[p] && (PROMO_DERIVED[p].order || []).length) out = out.slice().sort((a, b) => PROMO_DERIVED[p].order.indexOf(a) - PROMO_DERIVED[p].order.indexOf(b));
  return out.length ? out : [p];
}
const TV_SPLIT = 765; // 12h45 en minutes : bascule matin â aprÃ¨s-midi sur l'horloge
const tvIsoW = d => {
  // SUITE 132f : numÃ©ro de semaine ISO affichÃ© en tÃªte (repÃ¨re universel ADE/logistique)
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dn + 3);
  const f = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t - f) / 864e5 - 3 + (f.getUTCDay() + 6) % 7) / 7);
};
// SUITE 143 : DIFF TV â tampon Â« â MODIFIÃ Â» contre la baseline du VENDREDI 12h00.
// Design actÃ© (maquette maquette-tvdiff-142.html, option A validÃ©e en recette) :
// UN SEUL badge pour AJOUTÃ / MODIFIÃ / DÃPLACÃ (l'Ã©tudiant compare avec ce qu'il a
// vu vendredi en sortant de l'IUT) ; un crÃ©neau SUPPRIMÃ n'a plus de case â case
// FANTÃME (fond vide, pas de contour) + le mÃªme tampon Ã  l'ancien emplacement.
// Baseline capturÃ©e au PREMIER rendu tombÃ© dans la fenÃªtre vendredi 12h00-24h00
// (garde â¥ 100 crÃ©neaux : jamais de baseline sur une base vide/Ã  moitiÃ© syncÃ©e) ;
// TV Ã©teinte pendant toute la fenÃªtre = PAS de diff cette semaine (perte acceptÃ©e,
// retour au vendredi suivant â la base court de ven 12h Ã  ven 12h). IdentitÃ© d'un
// crÃ©neau : promo|intitulÃ©|groupes|enseignant, INDÃPENDANTE de l'horaire (un crÃ©neau
// dÃ©placÃ© reste le mÃªme crÃ©neau : badge au nouvel emplacement, PAS de fantÃ´me) ;
// Â« modifiÃ© Â» = horaire ou salle changÃ©e. Le tampon vit hors flux du texte (141c
// intouchÃ©es) et ne couvre jamais la salle (coin haut-droit inclinÃ©).
const TVDIFF_KEY = "edt2-tvdiff-base";
const tvDiffKey143 = (e, p) => [p, String(e.summary || "").replace(/\s+/g, " ").trim(), (e.groups || []).join("+"), e.teacher || ""].join("|");
const tvGhostLeaves143 = (gs, leaves) => {
  // SUITE 143 : colonnes couvertes par un fantÃ´me (feuilles touchÃ©es par les groupes)
  const hit = leaves.filter(l => (gs || []).some(g => l === g || l.startsWith(g + "-") || g === "Tous"));
  return hit.length ? hit : leaves;
};
function tvDiff143(allEvents, nowT) {
  // SUITE 143 : â { on, flags:Map(eventâtrue), ghosts:[{p,gs,start,end}] }
  const out = {
    on: false,
    flags: new Map(),
    ghosts: []
  };
  try {
    // vendredi de rÃ©fÃ©rence : le plus rÃ©cent vendredi 12h00 dÃ©jÃ  atteint (un vendredi
    // avant midi â celui de la semaine passÃ©e : la fenÃªtre n'est pas encore ouverte).
    const expected = (() => {
      const d = new Date(nowT);
      if (d.getDay() === 5 && d.getHours() < 12) d.setDate(d.getDate() - 1);
      d.setDate(d.getDate() - (d.getDay() + 2) % 7);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    })();
    let base = null;
    try {
      base = JSON.parse(localStorage.getItem(TVDIFF_KEY) || "null");
    } catch (e2) {}
    const tot143 = Object.keys(allEvents || {}).reduce((s, p) => s + (allEvents[p] || []).length, 0);
    if (nowT.getDay() === 5 && nowT.getHours() >= 12 && (!base || base.friday !== expected) && tot143 >= 100) {
      // fenÃªtre ven 12h-24h + garde anti base vide
      const ser = {};
      for (const p of Object.keys(allEvents)) ser[p] = (allEvents[p] || []).filter(e => e.summary !== "Vide").map(e => ({
        k: tvDiffKey143(e, p),
        t: e.start.getTime(),
        u: e.end.getTime(),
        l: e.location || ""
      }));
      try {
        localStorage.setItem(TVDIFF_KEY, JSON.stringify({
          friday: expected,
          evs: ser
        }));
      } catch (e2) {}
      base = {
        friday: expected,
        evs: ser
      };
    }
    if (!base || base.friday !== expected || !base.evs) return out; // pas de baseline cette semaine â AUCUN badge
    out.on = true;
    for (const p of Object.keys(allEvents)) {
      const byK = {};
      for (const r of base.evs[p] || []) (byK[r.k] = byK[r.k] || []).push(r);
      for (const g of Object.keys(byK)) byK[g].sort((a, b) => a.t - b.t);
      const used = {};
      for (const e of (allEvents[p] || []).filter(x => x.summary !== "Vide")) {
        const k = tvDiffKey143(e, p);
        const grp = byK[k] || [];
        let bi = -1,
          bd = Infinity; // appariement au START le plus proche (un dÃ©placÃ© reste le mÃªme crÃ©neau)
        for (let i = 0; i < grp.length; i++) {
          if (used[k + "#" + i]) continue;
          const d2 = Math.abs(grp[i].t - e.start.getTime());
          if (d2 < bd) {
            bd = d2;
            bi = i;
          }
        }
        if (bi < 0) {
          out.flags.set(e, true);
          continue;
        } // AJOUTÃ (aucune contrepartie dans la base)
        used[k + "#" + bi] = true;
        const r = grp[bi];
        if (e.start.getTime() + "|" + e.end.getTime() + "|" + (e.location || "") !== r.t + "|" + r.u + "|" + r.l) out.flags.set(e, true); // MODIFIÃ / DÃPLACÃ
      }
      for (const g of Object.keys(byK)) byK[g].forEach((r, i) => {
        if (!used[g + "#" + i]) out.ghosts.push({
          p,
          gs: (g.split("|")[2] || "").split("+").filter(Boolean),
          start: new Date(r.t),
          end: new Date(r.u)
        });
      }); // SUPPRIMÃ â fantÃ´me
    }
  } catch (e3) {}
  return out;
}
function Kiosk132({
  allEvents,
  lastSync,
  syncState,
  busy,
  feedErrs,
  onRefresh,
  now
}) {
  // Horloge live (re-render toutes les 30 s â halo & bascule). `now` (tests uniquement) fige l'heure.
  const [tick, setTick] = useState(now || new Date());
  useEffect(() => {
    if (now) return undefined;
    const t = setInterval(() => setTick(new Date()), 30000);
    return () => clearInterval(t);
  }, [now]);
  const nowT = now || tick;
  // SUITE 132g : NAVIGATION MANUELLE en Â½-JOURNÃES (â¹ âº, recette : tester les APRÃS-MIDI
  // sans attendre la bascule 12h45 de l'horloge). `nav` dÃ©cale TOUTE la logique de l'Ã©cran
  // (jour, Â½ journÃ©e, halo, trait Â« maintenant Â») de `nav` DEMI-JOURNÃES ; l'HORLOGE en
  // tÃªte reste Ã  l'heure rÃ©elle. La Â½ naviguÃ©e est forcÃ©e Ã  9 h (matin) / 14 h (aprÃ¨s-midi)
  // pour ne pas rebasculer Ã  12h45. En production l'Ã©cran reste sans interaction : laissÃ©
  // naviguÃ©, il revient SEUL Ã  l'heure rÃ©elle aprÃ¨s 3 min (132e, inchangÃ©).
  const [nav, setNav] = useState(0);
  const baseHalf132g = nowT.getHours() * 60 + nowT.getMinutes() >= TV_SPLIT ? 1 : 0; // Â½ rÃ©elle courante (0 = matin)
  const refT = (() => {
    if (!nav) return nowT;
    const idx = baseHalf132g + nav; // Â½-journÃ©es depuis la Â½ rÃ©elle courante (peut Ãªtre nÃ©gatif)
    const pm = (idx % 2 + 2) % 2 === 1;
    const d = new Date(nowT);
    d.setDate(d.getDate() + Math.floor(idx / 2));
    d.setHours(pm ? 14 : 9, 0, 0, 0);
    return d;
  })();
  // SUITE 132g : pastille semaine ISO ÃDITABLE (recette â saisir un numÃ©ro 1-53 pour sauter
  // Ã  cette semaine, mÃªme jour/Â½-journÃ©e affichÃ©s ; EntrÃ©e valide, Ãchap/clic dehors annule).
  const [wkEdit, setWkEdit] = useState(null);
  useEffect(() => {
    if (now || !nav) return undefined;
    const t = setTimeout(() => setNav(0), 180000);
    return () => clearTimeout(t);
  }, [now, nav]);
  // Auto-refresh ICS au DÃMARRAGE puis toutes les 15 min (kiosk : personne n'appuie sur â»).
  // Via un ref : `onRefresh` (refreshIcs, non mÃ©moÃ¯sÃ©) change d'identitÃ© Ã  CHAQUE rendu de
  // l'App â un effet qui en dÃ©pend rÃ©abonnerait et RÃINITIALISERAIT le timer Ã  chaque
  // changement d'Ã©tat (sync, 30 sâ¦) : la pÃ©riode ne serait jamais atteinte. Le ref fige
  // l'identitÃ©, l'effet ne dÃ©pend QUE de `now` : le timer file quoi qu'il arrive.
  const refreshRef = useRef(null);
  refreshRef.current = onRefresh || null;
  useEffect(() => {
    if (now) return undefined;
    const run = () => {
      const f = refreshRef.current;
      if (f) {
        try {
          f({
            silent: true
          });
        } catch (e) {}
      }
    };
    // DÃ©marrage : petit dÃ©lai (1,5 s) pour laisser la cascade firstSync â refreshIcs
    // dÃ©marrer la premiÃ¨re ; si elle est dÃ©jÃ  en cours, refreshIcs no-oppe (garde busySync),
    // sinon (base embarquÃ©e, sync jamais faite : la cascade ne fait RIEN) c'est CE run qui
    // rafraÃ®chit. Ensuite, pÃ©riode 15 min, indÃ©pendante des rendus.
    const t0 = setTimeout(run, 1500);
    const t = setInterval(run, 15 * 60000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [now]);
  // SUITE 134 : ZOOM AUTO BIDIRECTIONNEL â la scÃ¨ne 1920Ã1080 est TOUJOURS mise Ã 
  // l'Ã©chelle au viewport : scale = min(w/1920, h/1080), y compris au-delÃ  de 1
  // (plein Ã©cran d'un grand Ã©cran bureau : tout grandit proportionnellement, la
  // grille et les hauteurs de rangÃ©es ne changent pas). TV 1920Ã1080 = Ã©chelle 1,
  // identique Ã  avant ; petit Ã©cran/tÃ©lÃ©phone = tout rÃ©duit (l'ancien ?fit=1 devient
  // le comportement par dÃ©faut, l'URL reste acceptÃ©e sans effet).
  const [vp, setVp] = useState(() => {
    try {
      return {
        w: typeof window !== "undefined" && window.innerWidth || 1920,
        h: typeof window !== "undefined" && window.innerHeight || 1080
      };
    } catch (e) {
      return {
        w: 1920,
        h: 1080
      };
    }
  });
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return undefined;
    const on = () => setVp({
      w: window.innerWidth,
      h: window.innerHeight
    });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const k132 = useMemo(() => {
    // donnÃ©es de l'Ã©cran : jour, Â½ journÃ©e, promos prÃ©sentes, zones, bornes horaires (SUITE 132e : sur refT = heure naviguÃ©e)
    const halfPm = refT.getHours() * 60 + refT.getMinutes() >= TV_SPLIT;
    const inWin = (e, pm) => {
      const m = e.start.getHours() * 60 + e.start.getMinutes();
      return pm ? m >= TV_SPLIT : m < TV_SPLIT;
    };
    const evsOf = (d, pm) => {
      const m = {};
      for (const p of PROMO_KEYS) m[p] = (allEvents[p] || []).filter(e => e.summary !== "Vide" && sameDay(e.start, d) && inWin(e, pm));
      return m;
    };
    const total = m => PROMO_KEYS.reduce((s, p) => s + m[p].length, 0);
    let d0 = new Date(refT);
    d0.setHours(0, 0, 0, 0);
    let day = null,
      pm = halfPm,
      evs = null,
      other = false;
    for (let i = 0; i < 8 && !day; i++) {
      const d = addDays(d0, i);
      const cur = evsOf(d, halfPm);
      if (total(cur)) {
        day = d;
        pm = halfPm;
        evs = cur;
        break;
      }
      const alt = evsOf(d, !halfPm);
      if (total(alt)) {
        day = d;
        pm = !halfPm;
        evs = alt;
        other = true;
        break;
      }
      // jour vide des deux cÃ´tÃ©s â jour suivant (l'IUT fermÃ© n'a pas besoin d'Ã©cran)
    }
    if (!day) return {
      empty: true
    };
    // Promos prÃ©sentes (les ABSENTES sont masquÃ©es) puis zones haut/bas : paires
    // insÃ©parables BUT1+CiTiSE1 (haut) / BUT2+CiTiSE2 (bas), le reste vers la moitiÃ©
    // la moins chargÃ©e (Ã©quilibre des colonnes, tie â haut).
    const present = PROMO_KEYS.filter(p => evs[p].length);
    const PAIRS = [["MP-1A", "CiTiSE1-IUTD"], ["MP-2A", "CiTiSE2-IUTD"]];
    const zones = [[], []];
    for (let z = 0; z < 2; z++) for (const p of PAIRS[z]) if (present.includes(p)) zones[z].push(p);
    const rest = present.filter(p => !PAIRS[0].includes(p) && !PAIRS[1].includes(p));
    const wOf = p => tvLeaves(p).length;
    rest.slice().sort((a, b) => wOf(b) - wOf(a)).forEach(p => {
      const wa = zones[0].reduce((s, x) => s + wOf(x), 0),
        wb = zones[1].reduce((s, x) => s + wOf(x), 0);
      zones[wa <= wb ? 0 : 1].push(p);
    });
    const zonesData = zones.map(z => {
      const promos = z.map(p => {
        const leaves = tvLeaves(p);
        return {
          p,
          leaves,
          evs: evs[p]
        };
      });
      let mn = 24,
        mx = 0;
      for (const q of promos) for (const e of q.evs) {
        mn = Math.min(mn, e.start.getHours());
        mx = Math.max(mx, e.end.getHours() + (e.end.getMinutes() ? 1 : 0));
      }
      // SUITE 134 : l'axe est BORNÃ Ã LA Â½-JOURNÃE â matin 8h00-13h00, aprÃ¨s-midi
      // 13h00-18h30 (derniÃ¨re rangÃ©e 18h-19h : un crÃ©neau finissant 18h30 tient dedans).
      // Avant : le minimum Ã©tait TOUJOURS Ã©crasÃ© vers 8h â la vue PM affichait l'axe 8hâfin
      // (10 rangÃ©es), cases 1 h de ~39 px et textes coupÃ©s. Bornes fixes, Ã©tendues
      // UNIQUEMENT si un crÃ©neau dÃ©borde rÃ©ellement (arrivÃ©e avant 8h/13h, fin aprÃ¨s
      // 13h/19h).
      const vmn34 = pm ? 13 : 8,
        vmx34 = pm ? 19 : 13;
      const min = promos.length ? Math.min(vmn34, mn) : vmn34;
      const max = promos.length ? Math.max(vmx34, Math.max(min + 1, mx)) : vmx34;
      return {
        promos,
        min,
        max
      };
    });
    return {
      empty: false,
      day,
      pm,
      other,
      zones: zonesData,
      isToday: sameDay(day, new Date(refT))
    };
  }, [allEvents, refT]);
  // SUITE 143 : diff vs baseline vendredi 12h â les FLAGS sont indexÃ©s par OBJET
  // Ã©vÃ©nement de allEvents (capturÃ©s au mÃªme rendu, identitÃ© garantie).
  const tvdiff143 = useMemo(() => tvDiff143(allEvents, nowT), [allEvents, nowT]);

  // ---- gÃ©omÃ©trie de la scÃ¨ne (1920Ã1080, SUITE 134 : scale AUTO bidirectionnel) ----
  const scale = Math.min(vp.w / 1920, vp.h / 1080);
  const stageWrap = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: "#020617"
  };
  const stageStyle = {
    width: 1920,
    height: 1080,
    flex: "none",
    transform: "scale(" + scale + ")",
    transformOrigin: "center center"
  };

  // SUITE 148d : numÃ©rotation de sÃ©ance Â« n/N Â» â MÃMES RÃGLES QUE L'APP :
  // clÃ© promo|norm(summary)|serKey triÃ©e par start, badge masquÃ© si occurrence
  // unique ou Ã©valuation (noBadgeEv). Index bÃ¢ti sur TOUTE la semaine (allEvents),
  // pas seulement la Â½ journÃ©e affichÃ©e : l'Ã©tudiant retrouve son numÃ©ro de sÃ©ance.
  const occ148 = useMemo(() => {
    const m = {};
    for (const p of Object.keys(allEvents || {})) for (const e of allEvents[p] || []) {
      if (!e || !e.summary) continue;
      const k = p + "|" + norm(e.summary) + "|" + serKey(e, p);
      if (!m[k]) m[k] = [];
      m[k].push(e.start.getTime());
    }
    const out = {};
    for (const k of Object.keys(m)) {
      const a = m[k].slice().sort((x, y) => x - y);
      for (let i = 0; i < a.length; i++) out[k + "@" + a[i]] = {
        n: i + 1,
        N: a.length
      };
    }
    return out;
  }, [allEvents]);
  const tvBadge148 = (e, p) => {
    if (noBadgeEv(e)) return null;
    const o = occ148[p + "|" + norm(e.summary) + "|" + serKey(e, p) + "@" + e.start.getTime()];
    return o && o.N > 1 ? o : null;
  };

  // SUITE 148c2 : ADE accole la salle VIRTUELLE Ã  la salle physique (Â« D302,virtuel_MPH2 Â»)
  // â sur l'Ã©cran TV, seuls les segments rÃ©els sont montrÃ©s ; une salle multiple
  // rÃ©elle (Â« B104,C101 Â») reste intacte. TV uniquement, app v2/v3/v4 inchangÃ©e.
  const tvLoc148 = l => (l || "").split(",").map(s => s.trim()).filter(s => s && !/^virtuel[_-]/i.test(s)).join(" ");
  const zoneBlocks = z => {
    // une moitiÃ© : grille pleine largeur, colonnes = feuilles des promos de la zone
    if (!z.promos.length) return null;
    const hrs = z.max - z.min;
    const HEAD = 78; // chips promo + ligne des groupes
    const bodyPx = 178 + Math.min(214, 46 * hrs); // zone â 470 px : corps bornÃ© 178-392 px
    const rowH = Math.max(18, Math.min(96, bodyPx / hrs));
    const bodyH = Math.round(hrs * rowH);
    const totalLeaves = z.promos.reduce((s, q) => s + q.leaves.length, 0);
    const nowMin = refT.getHours() * 60 + refT.getMinutes();
    return /*#__PURE__*/React.createElement("div", {
      className: "flex-1 rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden flex flex-col",
      style: {
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("style", null, THEME_VARS_136, ADAPT_CSS_141C), /*#__PURE__*/React.createElement("div", {
      className: "flex border-b-2",
      style: {
        height: HEAD - 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 58,
        flex: "none"
      }
    }), z.promos.map(q => {
      const fk = FAM[PROMO_FAMILY[q.p] || "dept"] ? PROMO_FAMILY[q.p] || "dept" : "dept";
      const f = FAM[fk];
      const altP = q.p === "MP-2A-ALT" || q.p === "MP-3A-AVTECH" || q.p === "MP-3A-TECHVIMAT" || q.p === "MP-3A-MAE" && q.evs.some(e => (e.groups || []).some(g => /alt/i.test(g)));
      return /*#__PURE__*/React.createElement("div", {
        key: q.p,
        className: "h-full flex flex-col",
        style: {
          flexGrow: q.leaves.length,
          flexBasis: 0,
          minWidth: 0,
          borderRight: "1px solid rgba(30,41,59,.9)"
        }
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-center gap-1 leading-none",
        style: {
          height: 30,
          background: "var(--fam-" + fk + "-bg)",
          color: "var(--fam-" + fk + "-hue)",
          borderBoload("edt2-light") === "light");
  const toggleLight134 = () => setLight134(l => {
    store("edt2-light", l ? "dark" : "light");
    return !l;
  });
  useEffect(() => {
    try {
      if (typeof document !== "undefined" && document.documentElement) document.documentElement.classList.toggle("light", !!light134);
    } catch (e) {}
    // SUITE 139 : le meta theme-color est pilotÃ© par l'APP (indÃ©pendant du rÃ©glage du
    // tÃ©lÃ©phone) â #0f172a par dÃ©faut (Ã©cran d'accÃ¨s), #eef2f7 quand le clair est actif.
    try {
      let tc139 = typeof document !== "undefined" && document.querySelector ? document.querySelector('meta[name="theme-color"]') : null;
      if (tc139) tc139.setAttribute("content", light134 ? "#eef2f7" : "#0f172a");
    } catch (e) {}
  }, [light134]);
  // Filtres des agendas virtuels : par dÃ©faut seuls les CM/TD/TP (le plus critique sans
  // enseignant rÃ©el) sont affichÃ©s ; Devoirs et Autres se rallument d'un clic.
  const [virtF, setVirtF] = useState(() => {
    const v = load("edt2-virtf");
    return {
      cours: true,
      dev: false,
      autre: false,
      ...(v && typeof v === "object" ? v : {})
    };
  });
  const toggleVirtF = k => setVirtF(f => {
    const n = {
      ...f,
      [k]: !f[k]
    };
    store("edt2-virtf", n);
    return n;
  });
  // SUITE 145 : bandeau des groupes (boutons promo + chips) prÃ©sent sur TOUS les agendas,
  // mÃªme enseignant/salle/cours â le bouton Â« Ãtudiant Â» de la barre de recherche devient
  // sa commande de repli. Ãtat persistÃ© edt2-grp-open, DÃPLIÃ par dÃ©faut ; cliquer une
  // promo ou un groupe depuis un agenda non-Ãtudiant le convertit en agenda Ãtudiant.
  const [grpOpen145, setGrpOpen145] = useState(() => load("edt2-grp-open") !== 0);
  const toggleGrp145 = () => {
    setGrpOpen145(v => !v);
    store("edt2-grp-open", grpOpen145 ? 0 : 1);
  };
  // SÃ©lecteur de groupes (Ãtudiant) : panneau repliable, une seule ligne en repliÃ©.
  // (plus de repli Â« Choisir des groupes Â» : pastilles toujours visibles, une rangÃ©e compacte)
  // Suite 81 : plus AUCUN dÃ©filement automatique au changement de vue (l'utilisateur
  // regarde dÃ©jÃ  la zone ; l'ancrage faisait perdre l'en-tÃªte et forÃ§ait Ã  remonter).
  // firstGridRef reste utilisÃ© pour la mesure de hauteur disponible (avail).
  const firstGridRef = useRef(null);
  const [roomsExt, setRoomsExt] = useState(() => load("edt2-rooms") || {});
  const fmtD = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const [pStart, setPStart] = useState(() => fmtD(startOfWeek(new Date())));
  const [PEnd, setPEnd] = useState(() => fmtD(addDays(startOfWeek(new Date()), 13)));
  const pStartD = () => {
    const p = (pStart || "").split("-");
    const d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? startOfWeek(new Date()) : d;
  };
  const pEndD = () => {
    const p = (PEnd || pStart || "").split("-");
    const d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? addDays(startOfWeek(new Date()), 13) : d;
  };
  const pDayCount = () => {
    let n = 0;
    const a = pStartD();
    const b = pEndD();
    for (let d = new Date(a); d <= b; d = addDays(d, 1)) {
      const w = d.getDay();
      if (w !== 0 && w !== 6) n++;
    }
    return n;
  };
  const fileRef = useRef(null);
  const nid = useRef(2);

  // ---- Favoris (suite 58) : Ã©toile par agenda ; Ã  l'ouverture, les agendas favoris
  // remplacent le dernier Ã©tat (si un favori existe). Liste de rappel cliquable
  // sous Â« + Ajouter un agenda Â» : clic sur la ligne = ouvrir l'agenda, clic sur
  // l'Ã©toile = retirer le favori. IdentitÃ© : (kind, promo, groupes, ressource).
  const [favs, setFavs] = useState(() => {
    const f = load("edt2-favs");
    return Array.isArray(f) ? f : [];
  });
  const favKeyOf = s => JSON.stringify([s.kind, s.promo || null, (s.groups || []).slice().sort(), s.teacher || null, s.room || null, s.course || null]);
  const isFav = s => favs.some(f => f.k === favKeyOf(s));
  const toggleFav = s => {
    const k = favKeyOf(s);
    const next = favs.some(f => f.k === k) ? favs.filter(f => f.k !== k) : favs.concat([{
      k,
      s: {
        kind: s.kind,
        promo: s.promo || null,
        groups: (s.groups || []).slice(),
        teacher: s.teacher || null,
        room: s.room || null,
        course: s.course || null
      }
    }]);
    setFavs(next);
    store("edt2-favs", next);
  };
  const favLabel = s => s.kind === "promo" ? (PROMOS[s.promo] || {
    label: s.promo
  }).label + (s.groups && s.groups.length ? " Â· " + s.groups.map(g => grpDisp(s.promo, g)).join(", ") : " Â· Tous") : s.kind === "teacher" ? dispName(s.teacher || "") : s.kind === "room" ? s.room || "" : "Cours Â· " + (s.course || "");
  const openFav = f => setSlots(ls => ls.concat([{
    id: nid.current++,
    collapsed: false,
    groups: [],
    teacher: null,
    room: null,
    course: null,
    ...f.s
  }]));
  // Suite 60 : Â« uniquement les favoris Â» â ferme les autres agendas et revient Ã 
  // l'Ã©tat d'ouverture de l'App (les favoris). next calculÃ© AVANT setSlots (mocks).
  const showFavsOnly = () => {
    if (!favs.length) return;
    const next = favs.map(f => ({
      id: nid.current++,
      collapsed: false,
      groups: [],
      teacher: null,
      room: null,
      course: null,
      ...f.s
    }));
    setSlots(next);
  };
  // Suite 61 : lien de partage â URL Â« #a=<base64 de la pile d'agendas> Â» copiÃ©e dans
  // le presse-papier. Ã l'ouverture, la pile partagÃ©e PRIME sur favoris/dernier Ã©tat.
  const shareLink = () => {
    const payload = slots.map(s => ({
      kind: s.kind,
      promo: s.promo || null,
      groups: (s.groups || []).slice(),
      teacher: s.teacher || null,
      room: s.room || null,
      course: s.course || null
    }));
    const url = (typeof location !== "undefined" && location && location.href ? location.href.split("#")[0] : "https://gb42git.github.io/edt-mp/v2/") + "#a=" + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url);
    } catch (e) {}
    setShareDone(true);
    setTimeout(() => setShareDone(false), 2500);
  };

  // ---- Agendas empilables ----
  const [slots, setSlots] = useState(() => {
    // Suite 61 : lien de partage Â« #a= Â» (base64 de la pile d'agendas) â s'il est
    // prÃ©sent dans l'URL, il PRIME sur les favoris et le dernier Ã©tat enregistrÃ©.
    try {
      if (typeof location !== "undefined" && location && location.hash && location.hash.indexOf("#a=") === 0) {
        const arr = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(3)))));
        if (Array.isArray(arr) && arr.length && arr.every(x => x && typeof x.kind === "string")) {
          return arr.map((s, i) => ({
            id: i + 1,
            collapsed: false,
            groups: [],
            teacher: null,
            room: null,
            course: null,
            ...s
          }));
        }
      }
    } catch (e) {}
    if (favs.length) return favs.map((f, i) => ({
      id: i + 1,
      collapsed: false,
      groups: [],
      teacher: null,
      room: null,
      course: null,
      ...f.s
    }));
    const saved = load("edt2-slots");
    if (saved && Array.isArray(saved) && saved.length) {
      return saved.map(s => ({
        collapsed: false,
        groups: [],
        teacher: null,
        room: null,
        course: null,
        promo: "MP-2A",
        ...s
      }));
    }
    return [{
      id: 1,
      kind: "promo",
      promo: "MP-2A",
      groups: ["MA1"],
      teacher: null,
      room: null,
      collapsed: false
    }];
  });
  useEffect(() => {
    store("edt2-slots", slots);
  }, [slots]);
  useEffect(() => {
    nid.current = Math.max(2, ...slots.map(x => x.id + 1));
  }, []);
  // Â« JournÃ©e ajustÃ©e Â» : hauteur d'heure basÃ©e sur l'espace RÃELLEMENT disponible
  // (on mesure le sommet de la premiÃ¨re grille) au lieu du forfait vh-360 qui
  // faisait dÃ©border le bas de la journÃ©e sur mobile plein Ã©cran.
  const [avail, setAvail] = useState(0);
  useLayoutEffect(() => {
    const el = firstGridRef.current;
    if (!el || typeof el.getBoundingClientRect !== "function") return;
    const top = el.getBoundingClientRect().top;
    if (typeof window === "undefined" || !window.innerHeight) return;
    setAvail(Math.max(220, window.innerHeight - top - 12));
  }, [vh, viewMode, slots.length, fitDay]);

  // ---- ÃvÃ©nements de toutes les promos (localStorage sinon capture RSS) ----
  const [allEvents, setAllEvents] = useState(() => {
    const m = {};
    for (const p of PROMO_KEYS) {
      const saved = load("edt2-events:" + p);
      const pre = PRELOADED_EVENTS[p] || [];
      // Marqueur Â« full Â» (posÃ© par â» ICS) : les donnÃ©es sauvegardÃ©es sont une
      // RECONSTRUCTION complÃ¨te du flux ICS officiel â elles REMPLACENT la base embarquÃ©e
      // (sinon une sÃ©ance supprimÃ©e cÃ´tÃ© ADE rÃ©apparaÃ®trait au rechargement).
      const full = load("edt2-events-full:" + p) === 2; // v2 (suite 50) : les reconstructions v1 (groupes vides, bug normLabel) sont ignorÃ©es
      const raw = full && saved && Array.isArray(saved) && saved.length ? saved : saved && Array.isArray(saved) && saved.length ? function () {
        const seen = new Set(pre.map(e => new Date(e.start).getTime() + "|" + e.summary));
        return pre.concat(saved.filter(e => !seen.has(new Date(e.start).getTime() + "|" + e.summary)));
      }() : pre;
      m[p] = raw.map(e => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end)
      }));
    }
    return m;
  });

  // ---- Bilan de charge (suites 24 & 26) : rÃ©alisÃ© ADE agrÃ©gÃ© par module ScoDoc ----
  const [bilanOpen, setBilanOpen] = useState(null);
  // type d'un crÃ©neau pour le bilan : titre d'abord, sinon nommage des groupes (CM si promo
  // entiÃ¨re), sinon Â« Autre Â» ; les Ã©valuations et Ã©vÃ©nements informatifs ne comptent pas.
  const bilanType = (e, p) => {
    const t = detectType(e);
    if (t !== "Autre") return t;
    if (INFO_EV_RE.test(e.summary || "")) return "Autre";
    return typeHintOf(e, p) || "Autre";
  };
  const fmtBilanH = x => String(Math.round((x || 0) * 2) / 2).replace(".", ",");
  // SUITE 137 : CONFIG BILAN IMPORTABLE â plus aucun module embarquÃ© : la vue Bilan
  // s appuie sur la config persistÃ©e (localStorage edt2-bilan-config, import/export
  // JSON depuis la vue Bilan). Sans config : vue explicative + import.
  const [bilanCfg137, setBilanCfg137] = useState(bilanLoadCfg137);
  const bilanRows = useMemo(() => {
    return (bilanCfg137 ? bilanCfg137.rows : []).map(L => {
      const w = (bilanCfg137 && bilanCfg137.BILAN_WIN || {})[L.win] || ["2000-01-01", "2999-01-01"];
      const a = new Date(w[0] + "T00:00:00"),
        b = new Date(w[1] + "T00:00:00");
      const re = {
        cm: 0,
        td: 0,
        tp: 0
      };
      let n = 0;
      const byGrp = {},
        byTch = {};
      for (const p of L.promos) for (const e of allEvents[p] || []) {
        if (!(e.start >= a && e.start < b)) continue;
        const s = String(e.summary || "").replace(/\s+/g, " ").trim();
        if (!(L.rx || []).some(r => r.test(s))) continue;
        const ty = bilanType(e, p);
        if (ty !== "CM" && ty !== "TD" && ty !== "TP") continue;
        const h = (e.end - e.start) / 36e5;
        const k = ty.toLowerCase();
        re[k] += h;
        n++;
        const g = (e.groups || []).join(", ") || "â";
        if (!byGrp[g]) byGrp[g] = {
          cm: 0,
          td: 0,
          tp: 0,
          n: 0
        };
        byGrp[g][k] += h;
        byGrp[g].n++;
        const t = (e.teacher || "").trim();
        if (t && !/virtuel/i.test(t)) {
          if (!byTch[t]) byTch[t] = {
            cm: 0,
            td: 0,
            tp: 0
          };
          byTch[t][k] += h;
        }
      }
      return {
        L,
        re,
        n,
        grps: Object.entries(byGrp).map(([g, o]) => ({
          g,
          ...o
        })).sort((x, y) => y.cm + y.td + y.tp - (x.cm + x.td + x.tp)),
        tchs: Object.entries(byTch).map(([t, o]) => ({
          t,
          ...o
        })).sort((x, y) => y.cm + y.td + y.tp - (x.cm + x.td + x.tp))
      };
    });
  }, [allEvents, bilanCfg137]);
  // pastille d'Ã©cart d'un module : vert â¤ 5 %, ambre â¤ 15 %, rouge au-delÃ  ; gris si
  // aucun prÃ©vu (rÃ©alisÃ© seul) ou EDT pas encore saisi (fenÃªtre sans aucun crÃ©neau).
  const bilanDot = row => {
    const P = row.L.prevu;
    if (!P) return {
      cls: "text-slate-500",
      txt: "rÃ©alisÃ© seul"
    };
    if (row.re.cm + row.re.td + row.re.tp === 0) return {
      cls: "text-slate-500",
      txt: "non saisi"
    };
    let worst = 0;
    for (const k of ["cm", "td", "tp"]) if (P[k]) worst = Math.max(worst, Math.abs(row.re[k] / P[k] - 1));
    if (worst <= 0.05) return {
      cls: "text-emerald-400",
      txt: "â¤ 5 %"
    };
    if (worst <= 0.15) return {
      cls: "text-amber-400",
      txt: "â¤ 15 %"
    };
    return {
      cls: "text-red-400",
      txt: Math.round(worst * 100) + " %"
    };
  };
  const importTarget = () => (slots.find(s => s.kind === "promo") || {
    promo: "MP-2A"
  }).promo;
  const saveEvents = (evs, target) => {
    const p = target || importTarget();
    setAllEvents(m => ({
      ...m,
      [p]: evs
    }));
    store("edt2-events:" + p, evs.map(e => ({
      ...e,
      start: e.start.toISOString(),
      end: e.end.toISOString()
    })));
    store("edt2-events-full:" + p, null); // import manuel/sync additive : la base embarquÃ©e reprend ses droits
  };

  // Â« â» Rafr. Â» (suite 52 : rapide, ICS uniquement) : tÃ©lÃ©charge en direct les 9 flux
  // ICS officiels (via le proxy) et RECONSTRUIT les crÃ©neaux de chaque promo (remplacement :
  // suppressions et dÃ©placements ADE propagÃ©s). Suite 75c : les flux promos reconstruisent
  // AUSSI les agendas enseignants (remplacement intÃ©gral si tous rÃ©ussissent) ; le flux
  // Â« ÃvÃ©nements MP Â» reste un complÃ©ment. Ne touche pas aux donnÃ©es des promos dont le
  // flux a Ã©chouÃ©.
  const refreshIcs = async opts => {
    const silent = !!(opts && opts.silent);
    if (busySync) return;
    setBusySync(true);
    setSyncState("loading");
    // Suite 71 : le diff compare le NOUVEAU flux aux donnÃ©es que l'utilisateur VOYAIT
    // (cache navigateur, ou base embarquÃ©e v4 au tout premier â») â plus Ã  la publication.
    // Premier lancement sans aucune donnÃ©e : rien Ã  comparer â pas de modal de diff.
    const prevCache = {};
    let hasCache = false;
    for (const p of PROMO_KEYS) {
      const c = allEvents[p] || [];
      if (c.length) {
        prevCache[p] = c;
        hasCache = true;
      }
    }
    try {
      // Suite 76 : les URL remplacÃ©es par l'utilisateur (onglet Flux) priment sur feeds.json/secours.
      const effFeeds = feeds.map(f => feedOverrides[f.name] ? {
        ...f,
        url: feedOverrides[f.name]
      } : f);
      const results = await Promise.allSettled(effFeeds.map(async f => {
        const res = await fetch(PROXY_URL + encodeURIComponent(f.url));
        if (!res.ok) throw new Error("HTTP " + res.status);
        const text = await res.text();
        if (!text.toUpperCase().includes("BEGIN:VCALENDAR")) throw new Error("Page invalide (lien mort ?)");
        const evs = parseIcs(text, f.promo).filter(e => e.summary !== "Vide");
        if (!evs.length) throw new Error("Flux vide");
        return {
          f,
          evs
        };
      }));
      let okFeeds = 0;
      const suspectFeeds = [];
      const newErrs = []; // suite 76 : { name, msg, suspect? } â banniÃ¨re + Ã©tat par flux
      const byPromo = {};
      const promoT = {}; // suite 75c : agrÃ©gat enseignantâcrÃ©neaux depuis les flux promos
      const compT = {}; // suite 75d : complÃ©ment Â« ÃvÃ©nements MP Â», appliquÃ© APRÃS le remplacement promo
      const nPromoFeeds = effFeeds.filter(f => f.promo).length; // suite 75c : capture complÃ¨te ?
      let okPromo = 0; // suite 75c : flux promo rÃ©ussis (hors suspects)
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const f = effFeeds[i];
        if (r.status !== "fulfilled") {
          newErrs.push({
            name: f.name,
            msg: r.reason && r.reason.message || "erreur rÃ©seau"
          });
          continue;
        } // suite 76
        const {
          evs
        } = r.value;
        if (f.promo) {
          const seen = new Set();
          const arr = [];
          for (const e of evs.sort((a, b) => a.start - b.start)) {
            const k = e.id + "@" + e.start.getTime();
            if (!seen.has(k)) {
              seen.add(k);
              arr.push(e);
            }
          }
          // Suite 63 : garde maintenance ADE â un flux ICS qui rÃ©pond mais quasi vide
          // (maintenance ADE, serveur dÃ©gÃ©nÃ©rÃ©, fenÃªtre rÃ©duite) ne doit JAMAIS Ã©craser
          // la base existante (locale ou embarquÃ©e). Seuil : < 25 % de la base actuelle.
          const ref = Math.max((allEvents[f.promo] || []).length, (PRELOADED_EVENTS[f.promo] || []).length, 1);
          if (arr.length < 0.25 * ref) {
            suspectFeeds.push(f.promo);
            newErrs.push({
              name: f.name,
              msg: "quasi vide (garde maintenance)",
              suspect: true
            });
            continue;
          } // suite 76 : suspect signalÃ© dans l'onglet Flux
          byPromo[f.promo] = arr;
          okFeeds++;
          okPromo++; // suite 75c
          // Suite 75c : les flux promos contiennent aussi les donnÃ©es enseignants â
          // agrÃ©gation enseignantâcrÃ©neaux (source officielle rafraÃ®chie par l'utilisateur ;
          // mÃªme split Â« / Â» que le complÃ©ment ci-dessous).
          for (const e of arr) for (const t of (e.teacher || "").split(" / ").map(x => x.trim()).filter(Boolean)) (promoT[t] = promoT[t] || []).push(e);
        } else {
          // Â« ÃvÃ©nements MP Â» : crÃ©neaux sans Ã©tudiants â agendas enseignants (complÃ©ment).
          // Suite 59 : les crÃ©neaux multi-enseignants (conseils, commissions, jurys : teacher
          // Â« A / B / C Â») sont SPLITTÃS en clÃ©s individuelles â sinon des clÃ©s composites
          // polluent l'autocomplÃ©tion (Â« abc Â» â plusieurs homonymes partiels) ; chaque
          // enseignant voit le conseil dans SON agenda (cohÃ©rent avec le RSS).
          // Suite 75d : le complÃ©ment est COLLECTÃ ici puis appliquÃ© APRÃS le remplacement
          // promo (sinon l'intÃ©gral l'Ã©craserait â conseil de dÃ©partement perdu du 19/11).
          for (const e of evs) for (const t of (e.teacher || "").split(" / ").map(x => x.trim()).filter(Boolean)) (compT[t] = compT[t] || []).push(e);
          okFeeds++;
        }
      }
      // Suite 75c : agendas enseignants reconstruits depuis les flux promos (toutes versions,
      // ni base embarquÃ©e ni RSS dans ce flux de donnÃ©es). Remplacement intÃ©gral par enseignant
      // UNIQUEMENT si TOUS les flux promo ont rÃ©ussi (capture complÃ¨te) ; sinon complÃ©ment
      // sans purge â on ne purge jamais sur une capture partielle (risque du bug 75a).
      if (Object.keys(promoT).length) applyTeachers(promoT, okPromo === nPromoFeeds && !suspectFeeds.length ? null : Infinity);
      // Suite 75d : le complÃ©ment Â« ÃvÃ©nements MP Â» est appliquÃ© EN DERNIER â les crÃ©neaux
      // sans Ã©tudiants (conseils, commissions, jurys, soutenances) survivent au remplacement.
      if (Object.keys(compT).length) applyTeachers(compT, Infinity);
      await reloadEnsFluxs(); // SUITE 94 : le flux Â« ens Â» perso reprend la main (rÃ©fÃ©rence enseignant)
      for (const p of Object.keys(byPromo)) {
        saveEvents(byPromo[p], p);
        store("edt2-events-full:" + p, 2); // reconstruction officielle v2 : remplace la base embarquÃ©e (2 = groupes normalisÃ©s par promo)
      }
      // Suite 71 : diff vs DONNÃES AFFICHÃES AVANT LE â» (cache navigateur ; base embarquÃ©e
      // v4 au premier lancement) â par promo et par id de crÃ©neau : ajoutÃ© (id inconnu),
      // supprimÃ© (id disparu), modifiÃ©/dÃ©placÃ© (date-heure, titre ou salle diffÃ©rents).
      // Synchro silencieuse (1er lancement / > 48 h) : le diff n'est PAS recalculÃ©.
      if (!silent) {
        const items = [];
        if (hasCache) for (const p of Object.keys(byPromo)) {
          const old = new Map((prevCache[p] || []).map(e => [e.id, e]));
          const newIds = new Set();
          for (const e of byPromo[p]) {
            newIds.add(e.id);
            const o = old.get(e.id);
            if (!o) items.push({
              p,
              k: "add",
              s: e.summary || "",
              t: e.start.getTime(),
              e: e.end.getTime(),
              l: e.location || "",
              id: e.id,
              tc: e.teacher || "",
              g: (e.groups || []).join(",")
            }); // suite 79 : id/tc/l/g pour le badge Î par agenda favori ; suite 86 : e = fin de crÃ©neau (horaire compact Â« 8:30â10:00 Â»)
            else if (decDT(o.start).getTime() !== e.start.getTime() || (o.summary || "") !== (e.summary || "") || (o.location || "") !== (e.location || "") || (o.teacher || "") !== (e.teacher || "")) items.push({
              p,
              k: "mod",
              s: e.summary || o.summary || "",
              t: e.start.getTime(),
              ot: decDT(o.start).getTime(),
              e: e.end.getTime(),
              oe: decDT(o.end).getTime(),
              l: e.location || "",
              ol: o.location || "",
              id: e.id,
              tc: e.teacher || "",
              otc: o.teacher || "",
              os: o.summary || "",
              g: (e.groups || []).join(",")
            }); // suite 79 + suite 80 : ol = ANCIENNE salle (modal Â« B102 â B103 Â») ; SUITE 86 : l'ENSEIGNANT est dÃ©sormais COMPARÃ (avant, un changement d'enseignant seul Ã©tait invisible dans le Î) ; otc = ancien enseignant, os = ancien titre, e/oe = fins de crÃ©neau
          }
          for (const o of old.values()) if (!newIds.has(o.id)) items.push({
            p,
            k: "del",
            s: o.summary || "",
            t: decDT(o.start).getTime(),
            e: decDT(o.end).getTime(),
            l: o.location || "",
            id: o.id,
            tc: o.teacher || "",
            g: (o.groups || []).join(",")
          }); // suite 79 : l'ancien crÃ©neau n'est plus dans le cache â champs portÃ©s par l'item ; suite 86 : e = fin
        }
        // Suite 68 : compteurs calculÃ©s sur le tableau COMPLET (avant slice(0,400)) â
        // avant, le diff massif Â« tout ajoutÃ© Â» tronquait les Â« del Â» et affichait 400/0/0.
        if (items.length) {
          const nA = items.filter(x => x.k === "add").length;
          const nM = items.filter(x => x.k === "mod").length;
          const nD = items.filter(x => x.k === "del").length;
          setDiff({
            at: new Date().toISOString(),
            counts: {
              add: nA,
              mod: nM,
              del: nD
            },
            items: items.slice(0, 400)
          });
          store("edt2-diff", {
            at: new Date().toISOString(),
            counts: {
              add: nA,
              mod: nM,
              del: nD
            },
            items: items.slice(0, 400)
          });
        } else {
          setDiff(null);
          store("edt2-diff", null);
        }
      }
      const now = new Date().toISOString();
      setLastSync(new Date(now));
      store("edt2-sync", now);
      try {
        localStorage.setItem("edt2-year", SCHOOL_YEAR);
      } catch (e) {} // SUITE 111 : marqueur d'annÃ©e pour la clÃ´ture automatique
      setSyncState(okFeeds === 0 ? "blocked" : okFeeds < effFeeds.length ? "partial" : "ok");
      // Suite 76 : Ã©tat par flux persistÃ© â banniÃ¨re Â« lien mort Â» tant qu'un flux Ã©choue.
      setFeedErrs(newErrs);
      store("edt2-feederrs", newErrs);
    } catch (e) {
      setSyncState("error");
    } finally {
      setBusySync(false);
    }
  };

  // SUITE 94 : recharge des flux Â« ens Â» personnels (RÃFÃRENCES enseignant). AppelÃ© Ã 
  // l'ouverture (syncSources) ET en fin de Â« â» Â» : le flux perso remplace l'agrÃ©gat
  // reconstruit pour l'enseignant reconnu â le â» rafraÃ®chit les liens promos ET les liens
  // perso, mais ne fait JAMAIS revenir un flux perso au profit des flux promos.
  const reloadEnsFluxs = async () => {
    const list = (sources || []).filter(x => x && x.type === "ens" && typeof x.url === "string");
    if (!list.length) return;
    const results = await Promise.allSettled(list.map(async x => {
      const res = await fetch(PROXY_URL + encodeURIComponent(x.url));
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      if (!text.toUpperCase().includes("BEGIN:VCALENDAR")) throw new Error("Pas un flux ICS");
      return {
        x,
        evs: parseIcs(text).filter(e => e.summary !== "Vide")
      };
    }));
    const tAdd = {};
    for (const r of results) if (r.status === "fulfilled" && r.value.evs.length) {
      const k = ensKeyOf(r.value.evs, r.value.x.name);
      (tAdd[k] = tAdd[k] || []).push(...r.value.evs);
    }
    const keys = Object.keys(tAdd);
    if (!keys.length) return;
    setTeachers(t => {
      const n = {
        ...t
      };
      for (const k of keys) {
        const seen = new Set();
        n[k] = tAdd[k].filter(e => {
          const kk = e.start.getTime() + "|" + (e.summary || "");
          if (seen.has(kk)) return false;
          seen.add(kk);
          return true;
        }).sort((a, b) => a.start - b.start).map(e => ({
          ...e,
          start: e.start.toISOString(),
          end: e.end.toISOString()
        }));
      }
      if (!store("edt2-teachers", n)) setLsErr(true);
      return n;
    });
  };

  // Suite 75a : voir purgeTeachers (niveau module) â encapsulation avec Ã©tat + persistance.
  const applyTeachers = (add, cutoffMs) => {
    if (!add || !Object.keys(add).length) return;
    setTeachers(prev => {
      const nt = purgeTeachers(prev, add, cutoffMs);
      store("edt2-teachers", nt);
      return nt;
    });
  };
  useEffect(() => {
    const srcs = load("edt2-sources");
    if (Array.isArray(srcs) && srcs.length) setSources(srcs);
    const savedTeachers = load("edt2-teachers");
    if (savedTeachers && typeof savedTeachers === "object") setTeachers(t => {
      const m = {
        ...t
      };
      for (const k of Object.keys(savedTeachers)) {
        if (k.includes(" / ")) continue; // Suite 59 : purge des clÃ©s composites hÃ©ritÃ©es (conseils Â« A / B Â»)
        const pre = t[k] || [];
        // SUITE 94 (bug heures doublÃ©es de la SynthÃ¨se) : la base embarque des dates COMPACTES
        // (Â« 2609011000 Â») et le localStorage des ISO (Â« 2026-09-01T08:00:00.000Z Â») â la clÃ©
        // texte ne matchait JAMAIS : chaque rÃ©ouverture rÃ©ajoutait tout l'agrÃ©gat sauvegardÃ©
        // par-dessus la base (153 crÃ©neaux doublÃ©s : Â« 384 h de cours Â» au 23/11 au lieu de ~201).
        // ClÃ© robuste via decDT, identique Ã  purgeTeachers.
        const mpk = e => decDT(e.start).getTime() + "|" + (e.summary || "");
        const seen = new Set(pre.map(mpk));
        m[k] = pre.concat((savedTeachers[k] || []).filter(e => !seen.has(mpk(e))));
      }
      for (const k of Object.keys(m)) if (k.includes(" / ")) delete m[k];
      store("edt2-teachers", m);
      return m;
    });
    const sync = load("edt2-sync");
    if (sync) setLastSync(new Date(sync));
  }, []);

  // Suite 71 : cascade de synchronisation automatique (silencieuse, SANS diff).
  // - Aucune donnÃ©e au premier lancement (v2/v3 sans base embarquÃ©e) â synchro auto
  //   immÃ©diate (bandeau Â« PremiÃ¨re synchronisation en coursâ¦ Â»).
  // - DerniÃ¨re synchro > 48 h â resynchro silencieuse au prochain lancement (l'emploi
  //   du temps est construit d'un mois sur l'autre : mieux vaut du frais silencieux).
  // - v4 avec base embarquÃ©e et JAMAIS synchronisÃ©e : pas d'auto-synchro (la base
  //   embarquÃ©e suffit, on n'interroge ADE que sur â» manuel).
  useEffect(() => {
    const empty = PROMO_KEYS.every(p => (allEvents[p] || []).length === 0);
    const last = load("edt2-sync");
    if (empty) {
      setFirstSync(true);
      refreshIcs({
        silent: true
      }).then(() => setFirstSync(false));
    } else if (last) {
      const age = Date.now() - new Date(last).getTime();
      if (age > 48 * 36e5) refreshIcs({
        silent: true
      });
    }
  }, []);
  useEffect(() => {
    // Suite 83 (bug dormant corrigÃ©) : cet effet tournait avec l'ANCIENNE valeur de
    // `sources` (tableau vide de la 1re renderÃ©e, la restauration du localStorage Ã©tant
    // faite dans un autre effet du MÃME commit) â le Â« rechargement automatique des flux
    // perso Ã  chaque ouverture Â» ne se dÃ©clenchait jamais. On relit le stockage directement.
    const srcs = load("edt2-sources");
    if (Array.isArray(srcs) && srcs.length) syncSources(srcs);
    // Suite 83 : canary anti-perte â si le localStorage refuse la moindre Ã©criture
    // (quota dÃ©passÃ©, stockage bloquÃ©), la banniÃ¨re de l'onglet Flux s'allume dÃ¨s l'ouverture.
    if (!store("edt2-canary", 1)) setLsErr(true);
  }, []);

  // feeds-<annÃ©e>.json publiÃ© (Ã©ditable chaque rentrÃ©e directement sur GitHub, sans rebuild) :
  // validation stricte avant remplacement du secours (URL ADE, promo connu ou null, â¥ 8 flux).
  // SUITE 107 : feeds-<SCHOOL_YEAR>.json d'abord ; si l'annÃ©e N n'est pas encore publiÃ©e,
  // repli sur feeds-<DATA_YEAR>.json + bandeau explicite. Sinon le secours embarquÃ© reste.
  useEffect(() => {
    const validFeedsOf = j => !j || !Array.isArray(j.flux) ? null : j.flux.filter(f => f && typeof f.url === "string" && /^https:\/\/planning\.univ-st-etienne\.fr\/jsp\//.test(f.url) && (f.promo === null || typeof f.promo === "string"));
    const grab = url => fetch(url + "?v=" + Date.now()).then(r => r.ok ? r.json() : null).catch(() => null);
    grab(FEEDS_JSON_URL).then(j => {
      const ok = validFeedsOf(j);
      if (ok && ok.length >= 8) {
        setFeeds(ok);
        setFeedsSrc("json");
        setFeedsYear(SCHOOL_YEAR);
        return;
      }
      grab(FEEDS_FALLBACK_URL).then(j2 => {
        const ok2 = validFeedsOf(j2);
        if (ok2 && ok2.length >= 8) {
          setFeeds(ok2);
          setFeedsSrc("json");
          setFeedsYear(DATA_YEAR);
          setFeedsPending(SCHOOL_YEAR);
        } // bandeau : annÃ©e N pas encore publiÃ©e
      });
    });
  }, []);
  const syncSources = async list => {
    if (!list || !list.length) return;
    setSyncState("loading");
    const target = importTarget();
    const results = await Promise.allSettled(list.map(async s => {
      // Relais CORS (Cloudflare Worker) : ADE interdit la lecture directe au navigateur ;
      // le proxy relaie planning.univ-st-etienne.fr/jsp/* en ajoutant les en-tÃªtes CORS.
      const res = await fetch(PROXY_URL + encodeURIComponent(s.url));
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      if (!text.toUpperCase().includes("BEGIN:VCALENDAR")) throw new Error("Pas un flux ICS");
      // Suite 83 : flux Â« ens Â» (personnel enseignant) analysÃ© SANS promo cible â
      // il nourrira l'agenda enseignant du flux, pas les crÃ©neaux d'une promo.
      return {
        s,
        evs: parseIcs(text, s.type === "ens" ? null : target)
      };
    }));
    // Suite 83 : rÃ©partition par type. Â« ens Â» â agrÃ©gat enseignant (clÃ© = nom du flux,
    // majuscules comme les clÃ©s teachers) + OUVERTURE de l'agenda enseignant ;
    // promo (dÃ©faut) â fusion/dÃ©doublonnage dans la promo cible (comportement historique).
    const merged = [];
    const seen = new Set();
    const tAdd = {};
    let okCount = 0;
    results.forEach(r => {
      if (r.status !== "fulfilled") return;
      okCount++;
      const {
        s,
        evs
      } = r.value;
      if (s.type === "ens") {
        // SUITE 94 : le flux Â« ens Â» personnel est la RÃFÃRENCE de l'agenda de l'enseignant
        // RECONNU (clÃ© = enseignant dominant â¥ 70 %, sinon nom du flux) â il remplace, jamais
        // ne s'ajoute par-dessus l'agrÃ©gat des flux promos.
        const k = ensKeyOf(evs, s.name);
        if (k && evs.length) (tAdd[k] = tAdd[k] || []).push(...evs);
      } else {
        for (const ev of evs) {
          const key = ev.id + "@" + ev.start.getTime();
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(ev);
          }
        }
      }
    });
    const tKeys = Object.keys(tAdd);
    if (tKeys.length) {
      setTeachers(t => {
        const n = {
          ...t
        };
        // SUITE 94 : dÃ©doublonnage getTime|summary â deux flux ens du mÃªme enseignant (ou un
        // flux rechargÃ©) ne doivent JAMAIS dupliquer un crÃ©neau (heures SynthÃ¨se au double).
        for (const k of tKeys) {
          const seen = new Set();
          n[k] = tAdd[k].filter(e => {
            const kk = e.start.getTime() + "|" + (e.summary || "");
            if (seen.has(kk)) return false;
            seen.add(kk);
            return true;
          }).sort((a, b) => a.start - b.start);
        }
        if (!store("edt2-teachers", Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v.map(e => ({
          ...e,
          start: e.start.toISOString(),
          end: e.end.toISOString()
        }))])))) setLsErr(true);
        return n;
      });
      for (const k of tKeys) addTeacherSlot(k);
    }
    if (okCount === 0) {
      setSyncState("blocked");
      return;
    }
    if (!merged.length) {
      if (!tKeys.length) {
        setSyncState("error");
        return;
      }
    }
    if (merged.length) {
      // suite 83 : flux Â« ens Â» seuls â on ne vide JAMAIS la promo cible
      merged.sort((a, b) => a.start - b.start);
      saveEvents(merged, target);
    }
    const now = new Date().toISOString();
    setLastSync(new Date(now));
    store("edt2-sync", now);
    setSyncState(okCount === list.length ? "ok" : "partial");
    setShowImport(false);
  };
  const addSource = () => {
    const url = urlDraft.trim();
    if (!url) return;
    // Suite 83 : un flux personnel a un TYPE â Â« promo Â» (comportement historique : fusion
    // dans la promo ouverte) ou Â« ens Â» (lien ICS enseignant ADE : alimente l'agenda
    // enseignant du NOM donnÃ©, sans toucher aux crÃ©neaux des promos).
    const next = [...sources, {
      id: Math.random().toString(36).slice(2),
      name: nameDraft.trim() || "Flux " + (sources.length + 1),
      url,
      type: srcTypeDraft
    }];
    setSources(next);
    if (!store("edt2-sources", next)) setLsErr(true); // suite 83 : Ã©chec de sauvegarde SIGNALÃ (anti-perte)
    setNameDraft("");
    setUrlDraft("");
    syncSources(next);
  };
  const removeSource = id => {
    const next = sources.filter(s => s.id !== id);
    setSources(next);
    if (!store("edt2-sources", next)) setLsErr(true); // suite 83 : anti-perte
    if (next.length === 0) {
      setSyncState("idle");
      store("edt2-sync", null);
      setLastSync(null);
    } else syncSources(next);
  };

  // Suite 76 : remplacement d'URL d'un flux officiel (lien ADE rÃ©gÃ©nÃ©rÃ©). PersistÃ© en
  // localStorage (edt2-feed-urls), prime sur feeds.json et sur le secours embarquÃ©.
  const saveFeedOverride = (name, url) => {
    const n = {
      ...feedOverrides
    };
    if (url && url.trim()) n[name] = url.trim();else delete n[name];
    setFeedOverrides(n);
    if (!store("edt2-feed-urls", n)) setLsErr(true); // suite 83 : anti-perte
    setEditFeed(null);
    setEditFeedUrl("");
  };

  // Suite 83 : EXPORT/IMPORT des rÃ©glages (flux personnels, favoris, remplacements â) â
  // le localStorage est dÃ©truit Ã  la rÃ©installation de l'appli ou Ã  la purge des donnÃ©es
  // du site ; ce petit JSON permet de tout restaurer en deux clics. Clipboard si dispo,
  // sinon le JSON s'affiche pour copie manuelle.
  const exportSettings = () => {
    // SUITE 110 : payload v2 â clÃ©s UTILISATEUR brutes (LS_USER_SCAN110), annÃ©e incluse.
    // Le format v1 (suite 83) reste importable telle quelle (arriÃ¨re-garde ci-dessous).
    const keys110 = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (LS_USER_SCAN110(k)) keys110[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    const payload = {
      v: 2,
      app: "edt-mp",
      at: new Date().toISOString(),
      year: SCHOOL_YEAR,
      keys: keys110,
      sources: load("edt2-sources") || [],
      favs: load("edt2-favs") || [],
      feedUrls: load("edt2-feed-urls") || {}
    }; // champs v1 conservÃ©s pour arriÃ¨re-garde
    const txt = JSON.stringify(payload);
    // SUITE 110 : tÃ©lÃ©chargement d'un fichier .json en PLUS du presse-papier â les rÃ©glages
    // ne tiennent pas dans un presse-papier volatile et une sauvegarde digne de ce nom se garde.
    try {
      const blob110 = new Blob([txt], {
        type: "application/json"
      });
      const a110 = document.createElement("a");
      a110.href = URL.createObjectURL(blob110);
      a110.download = "edt-mp-mes-donnees-" + SCHOOL_YEAR + "-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a110);
      a110.click();
      setTimeout(() => {
        try {
          URL.revokeObjectURL(a110.href);
          a110.remove();
        } catch (e) {}
      }, 2000);
    } catch (e) {}
    const done = ok => {
      if (!ok) setSettingsDraft(txt);
      setSettingsDone(ok ? "copied" : "shown");
      setTimeout(() => setSettingsDone(null), 2500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => done(true)).catch(() => done(false));else done(false);
  };
  const importSettings = () => {
    try {
      const j = JSON.parse(settingsDraft);
      if (!j || typeof j !== "object") throw new Error("pas un objet");
      // SUITE 110 : payload v2 = sauvegarde COMPLÃTE. Import REMPLAÃANT : pas de fusion
      // (spÃ©c) â d'abord une modale d'avertissement, puis au Â« Go Â» : effacement des clÃ©s
      // utilisateur du pÃ©rimÃ¨tre (LS_USER_SCAN110) et restauration des valeurs brutes.
      if (j.v === 2 && j.keys && typeof j.keys === "object" && !Array.isArray(j.keys)) {
        setImportPending110(j);
        setSettingsDone(null);
        return;
      }
      if (Array.isArray(j.sources)) {
        setSources(j.sources);
        if (!store("edt2-sources", j.sources)) throw new Error("Ã©criture impossible");
      }
      if (Array.isArray(j.favs)) {
        setFavs(j.favs);
        if (!store("edt2-favs", j.favs)) throw new Error("Ã©criture impossible");
      }
      if (j.feedUrls && typeof j.feedUrls === "object" && !Array.isArray(j.feedUrls)) {
        setFeedOverrides(j.feedUrls);
        if (!store("edt2-feed-urls", j.feedUrls)) throw new Error("Ã©criture impossible");
      }
      setSettingsDone("ok");
      setTimeout(() => setSettingsDone(null), 2500);
    } catch (e) {
      setSettingsDone("err");
      setTimeout(() => setSettingsDone(null), 3500);
    }
  };

  // SUITE 110 : confirmation de l'import v2 â REMPLACE toutes les donnÃ©es utilisateur.
  const importConfirm110 = () => {
    const j = importPending110;
    setImportPending110(null);
    if (!j || !j.keys) return;
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (LS_USER_SCAN110(k)) localStorage.removeItem(k);
      }
      Object.keys(j.keys).forEach(k => {
        if (LS_USER_SCAN110(k) && typeof j.keys[k] === "string") localStorage.setItem(k, j.keys[k]);
      });
      // Le rechargement applique tout Proprement : sources, favoris, saisies Î£, archivesâ¦
      setTimeout(() => {
        try {
          location.reload();
        } catch (e) {
          setSettingsDone("ok");
        }
      }, 400);
      setSettingsDone("ok");
    } catch (e) {
      setSettingsDone("err");
      setTimeout(() => setSettingsDone(null), 3500);
    }
  };
  // SUITE 110 : lecture du fichier .json choisi â prÃ©-remplit la zone, import immÃ©diat.
  const importFile110 = ev => {
    const f = ev && ev.target && ev.target.files && ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        setSettingsDraft(String(r.result || ""));
      } catch (e) {}
    };
    r.readAsText(f);
  };
  const addTeacherSlot = name => {
    if (slots.some(s => s.kind === "teacher" && s.teacher === name)) return;
    setSlots(ls => ls.concat([{
      id: nid.current++,
      kind: "teacher",
      promo: "MP-2A",
      groups: [],
      teacher: name,
      room: null,
      collapsed: false
    }]));
  };
  const importIcs = text => {
    const evs = parseIcs(text);
    if (!evs.length) {
      setSyncState("error");
      return;
    }
    // DÃ©tection : agenda d'un enseignant si le mÃªme enseignant apparaÃ®t dans â¥ 70 % des crÃ©neaux
    const cnt = {};
    evs.forEach(e => (e.teacher || "").split(" / ").forEach(t => {
      if (t) cnt[t] = (cnt[t] || 0) + 1;
    }));
    const main = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    if (main && cnt[main] >= evs.length * 0.7) {
      const next = {
        ...teachers,
        [main]: evs
      };
      setTeachers(next);
      store("edt2-teachers", Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v.map(e => ({
        ...e,
        start: e.start.toISOString(),
        end: e.end.toISOString()
      }))])));
      addTeacherSlot(main);
    } else {
      saveEvents(evs);
    }
    setSyncState("idle");
    setShowImport(false);
  };
  const onFile = async file => {
    if (!file) return;
    importIcs(await file.text());
  };

  // SUITE 112 : le bouton dâEXEMPLE FACTICE (loadDemo : 8 crÃ©neaux de dÃ©monstration posÃ©s sur la semaine
  // courante, confondables avec de vrais crÃ©neaux) a Ã©tÃ© RETIRÃ sur dÃ©cision du mainteneur du 22/11 â un navigateur
  // neuf se sert par Â« â» Rafr. Â» ou l'import ICS, jamais par des donnÃ©es factices.

  // ---- manipulation des agendas ----
  const updSlot = (id, patch) => setSlots(ls => ls.map(s => s.id === id ? {
    ...s,
    ...patch
  } : s));
  // SUITE 149 : VIDAGE RÃEL des groupes rÃ©siduels d'un agenda NON-Ãtudiant â un
  // favori enseignant/salle/cours ne doit jamais garder des groupes posÃ©s mais
  // ignorÃ©s (boutons du bandeau enfoncÃ©s Ã  tort, vu en recette). La promo n'est
  // volontairement PAS vidÃ©e : le bandeau (145) et le compteur (116) s'appuient
  // dessus ; son bouton s'affiche simplement non-enfoncÃ© (type diffÃ©rent).
  useEffect(() => {
    for (const s of slots) if (s.kind !== "promo" && (s.groups || []).length) updSlot(s.id, {
      groups: []
    });
  }, [slots]);
  // Swipe mobile (vue semaine) : balayage horizontal â¹ semaine prÃ©cÃ©dente / âº semaine suivante.
  // Seuil ~50 px et dÃ©placement horizontal dominant pour ne pas gÃªner le dÃ©filement vertical.
  const touchRef = useRef(null);
  const addSlot = () => setSlots(ls => {
    const last = ls[ls.length - 1] || {
      kind: "promo",
      promo: "MP-2A"
    };
    return ls.concat([{
      id: nid.current++,
      kind: last.kind,
      promo: last.kind === "promo" ? last.promo : "MP-2A",
      groups: [],
      teacher: null,
      room: null,
      course: null,
      collapsed: false
    }]);
  });
  const removeSlot = id => setSlots(ls => ls.length > 1 ? ls.filter(s => s.id !== id) : ls);
  // applique une suggestion de la barre d'un agenda : remplit/change CET agenda
  const applyPick = (slotId, s) => {
    const slot = slots.find(x => x.id === slotId);
    if (slot) {
      if (s.kind === "salle") updSlot(slotId, {
        kind: "room",
        room: s.label,
        collapsed: false
      });else if (s.kind === "enseignant") updSlot(slotId, {
        kind: "teacher",
        teacher: s.label,
        collapsed: false
      });else if (s.kind === "cours") updSlot(slotId, {
        kind: "cours",
        course: s.label,
        collapsed: false
      });else if (s.kind === "groupe") {
        const p = s.promo || slot.promo || "MP-2A";
        if (slot.kind === "promo" && slot.promo === p) {
          if (!slot.groups.includes(s.label)) updSlot(slotId, {
            groups: slot.groups.concat([s.label])
          });
        } else updSlot(slotId, {
          kind: "promo",
          promo: p,
          groups: [s.label],
          collapsed: false
        });
      }
    }
    setSlotQ(m => ({
      ...m,
      [slotId]: ""
    }));
    setSlotQOpen(m => ({
      ...m,
      [slotId]: false
    }));
  };
  const barPh = () => "Cours, salle, enseignant, groupeâ¦";
  const suggForSlot = slot => {
    const qq = norm(slotQ[slot.id] || "");
    if (qq.length < 2) return [];
    // TOUTES les ressources sont proposÃ©es dans chaque barre (cours, enseignant, salle, groupe)
    return suggFor(qq, ["salle", "enseignant", "cours", "groupe"], teachers, courseIndex, groupIndex, roomIndex);
  };

  // ---- calculs d'affichage ----
  const slotWeekStart = slot => addDays(weekStart, (slot.wk || 0) * 7);
  // Suite 80 : jour affichÃ© d'un agenda = ancre globale + dÃ©calage dy, week-end sautÃ©
  // (samedi â vendredi prÃ©cÃ©dent si on recule, dimanche â lundi si on avance).
  const jourAnchorD = () => {
    const v = jourSel || isoD(new Date());
    const p = String(v).split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  };
  const snapDy = n => {
    let k = n;
    let d = addDays(jourAnchorD(), k);
    while (dng-none pt-px",
      style: {
        height: rowH + "px"
      }
    }, h, "h"))), [...Array(nd).keys()].map(dayIdx => {
      const date = addDays(anchor, dayIdx);
      const laid = layoutDay(shown.filter(e => sameDay(e.start, date)), cols, slot.promo);
      return /*#__PURE__*/React.createElement("div", {
        key: dayIdx,
        className: "relative border-l border-slate-800 " + (sameDay(date, today) ? "bg-indigo-500/[0.04]" : "") + (vacOf(date) ? " bg-slate-700/30" : "")
      }, hours.map(h => /*#__PURE__*/React.createElement("div", {
        key: h,
        className: "border-b border-slate-800/50",
        style: {
          height: rowH + "px"
        }
      })), isPromo && cols.length > 1 && cols.slice(1).map((g, i) => /*#__PURE__*/React.createElement("div", {
        key: "sep" + g,
        className: "absolute top-0 bottom-0 border-l border-slate-800/40 pointer-events-none",
        style: {
          left: 100 * (i + 1) / cols.length + "%"
        }
      })), laid.map((p, bi) => {
        const e = p.ev;
        const top = (e.start.getHours() + e.start.getMinutes() / 60 - bounds.min) * rowH;
        const hgt = (e.end - e.start) / 36e5 * rowH;
        const c = colorFor(e, slot.promo, slot.kind);
        if (PERSO_ENABLED && slot.kind === "teacher" && e.mp === false && e.mpCours === true) Object.assign(c.style, {
          backgroundColor: "rgba(244,114,182,0.16)",
          border: "1.6px solid rgb(244,114,182)",
          borderLeft: "4px solid rgb(244,114,182)"
        }); // SUITE 94 : crÃ©neau HORS dÃ©partement MP (flux ens personnel) = rose
        const evPromo = slot.kind === "promo" ? slot.promo : e.promo || null;
        const al = alertFor(e, evPromo); // suite 73 : sÃ©rie TD/TP incomplÃ¨te de ce groupe
        let w, left;
        if (isPromo) {
          const unit = 100 / cols.length;
          w = unit * (p.c1 - p.c0 + 1) / p.nsub;
          left = unit * p.c0 + w * p.lane;
        } else {
          w = 100 / p.nsub;
          left = w * p.lane;
        }
        // SUITE 130 : palier Â« case XL Â» â largeur ESTIMÃE de cette case (w est en % de la colonne-jour), puis seuils dÃ©tendus faÃ§on vue JournÃ©e pour les cases larges.
        const caseWp130 = estDayPx130 * w / 100;
        const xl130 = caseWp130 >= 230; // SUITE 141d : seuil relevÃ© 150â230 (154 px n'est pas Â« large Â» : pile verticale pleine largeur)
        const xThT130 = xl130 ? Math.min(thT, Math.round(45 * sc)) : thT;
        const xThE130 = xl130 ? Math.min(thE, Math.round(30 * sc)) : thE;
        // SUITE 132g : disposition HORIZONTALE des cases XL â retour recette : Â« hauteur
        // faible, largeur grande : utilise la largeur de la cellule Â». Les lignes
        // existantes (suites 78/81/83/130, textes et badges INCHANGÃS) sont
        // factorisÃ©es en variables puis : en XL, le titre occupe la GAUCHE et les
        // infos (horaireÂ·salle, groupes, enseignant) s'empilent ALIGNÃES Ã DROITE ;
        // hors XL, la pile historique est restituÃ©e Ã L'IDENTIQUE via un tableau
        // (pas de div ni de fragment d'emballage : l'ordre du vdom et le contenu des
        // strings des tests des suites 78/81/83/130 sont prÃ©servÃ©s).
        const lineBadge130g = (() => {
          const ab = c.badge === "TP" && e.end - e.start >= 2 * 36e5;
          const bb = badgeOf(e.summary, c.badge);
          return ab && bb ? /*#__PURE__*/React.createElement("div", {
            className: "w-fit text-[8.5px] font-bold text-slate-900 bg-slate-100 rounded px-1 leading-tight"
          }, bb) : null;
        })();
        const lineTitre130g = /*#__PURE__*/React.createElement("div", {
          className: "text-[11px] font-semibold leading-tight cq-titre " + (xl130 ? "min-w-0 line-clamp-3" : "line-clamp-2")
        }, typeTitle(e.summary, c.badge === "TP" && e.end - e.start >= 2 * 36e5 ? null : c.badge, c.badge === "TP" && e.end - e.start >= 2 * 36e5));
        const lineHoraire130g = (() => {
          const showTime = hgt >= xThT130;
          const loc = slot.kind === "room" ? "" : e.location || "";
          return showTime || loc ? /*#__PURE__*/React.createElement("div", {
            className: "text-[10px] opacity-80 truncate cq-hor"
          }, showTime ? fmtHM(e.start) + "â" + fmtHM(e.end) + (loc ? " Â· " + loc : "") : loc) : null;
        })();
        const lineEnsPC130g = (slot.kind === "promo" || slot.kind === "cours") && hgt >= xThE130 && e.teacher && (() => {
          const ot = !multiTch(e) && !noBadgeEv(e) ? occOf(e, evPromo, "t") : null;
          const zk = xl130 && !multiTch(e) && !noBadgeEv(e) ? occOf(e, evPromo, "k") : null;
          return /*#__PURE__*/React.createElement("div", {
            className: "text-[10px] opacity-60 leading-tight cq-sub " + (xl130 || hgt >= 48 ? "line-clamp-2" : "truncate")
          }, e.teacher, ot ? /*#__PURE__*/React.createElement("span", {
            className: "ml-1 text-[8.5px] font-bold text-slate-900 bg-slate-100 rounded px-0.5"
          }, ot.n, "/", ot.N) : null, zk ? /*#__PURE__*/React.createElement("span", {
            className: "ml-0.5 text-[8.5px] font-bold text-slate-700 bg-slate-300 rounded px-0.5",
            title: "Ses sÃ©ances du mÃªme type (CM/TD/TP) pour ce cours, tous groupes confondus"
          }, "Î£ ", zk.n, "/", zk.N) : null, ot && ot.anN ? /*#__PURE__*/React.createElement("span", {
            className: "ml-0.5 text-[8.5px] font-bold text-slate-500",
            title: "Position de la sÃ©ance dans l'annÃ©e (sÃ©rie TP AVTECH comptÃ©e par blocs de 3 semaines)"
          }, "an ", ot.anK, "/", ot.anN) : null);
        })();
        const lineGrp130g = hgt >= th36 && (() => {
          const dgs = dispGroups(e, evPromo, slot.kind === "teacher" || slot.kind === "room");
          return dgs.length > 0 ? /*#__PURE__*/React.createElement("div", {
            className: "text-[10px] opacity-70 leading-tight cq-sub " + (xl130 || hgt >= 48 ? "line-clamp-2" : "truncate")
          }, dgs.map((g, gi) => {
            const og = noBadgeEv(e) ? null : occOf(e, evPromo, "g", g);
            return /*#__PURE__*/React.createElement("span", {
              key: gi
            }, gi > 0 ? " Â· " : "", g, og && (og.N > 1 || al) ? /*#__PURE__*/React.createElement("span", {
              className: "ml-0.5 text-[8.5px] font-bold text-slate-900 bg-slate-100 rounded px-0.5"
            }, og.n, "/", al ? al.ref : og.N) : null);
          })) : null;
        })();
        const lineEnsTR130g = !(slot.kind === "promo" || slot.kind === "cours") && hgt >= xThE130 && e.teacher && (() => {
          const ot = !multiTch(e) && !noBadgeEv(e) ? occOf(e, evPromo, "t") : null;
          const zk = xl130 && !multiTch(e) && !noBadgeEv(e) ? occOf(e, evPromo, "k") : null;
          return /*#__PURE__*/React.createElement("div", {
            className: "text-[10px] opacity-60 leading-tight cq-sub " + (xl130 || hgt >= 48 ? "line-clamp-2" : "truncate")
          }, e.teacher, ot ? /*#__PURE__*/React.createElement("span", {
            className: "ml-1 text-[8.5px] font-bold text-slate-900 bg-slate-100 rounded px-0.5"
          }, ot.n, "/", ot.N) : null, zk ? /*#__PURE__*/React.createElement("span", {
            className: "ml-0.5 text-[8.5px] font-bold text-slate-700 bg-slate-300 rounded px-0.5",
            title: "Ses sÃ©ances du mÃªme type (CM/TD/TP) pour ce cours, tous groupes confondus"
          }, "Î£ ", zk.n, "/", zk.N) : null, ot && ot.anN ? /*#__PURE__*/React.createElement("span", {
            className: "ml-0.5 text-[8.5px] font-bold text-slate-500",
            title: "Position de la sÃ©ance dans l'annÃ©e (sÃ©rie TP AVTECH comptÃ©e par blocs de 3 semaines)"
          }, "an ", ot.anK, "/", ot.anN) : null);
        })();
        const lineSalleRoom130g = slot.kind === "room" && (e.location || "") && /*#__PURE__*/React.createElement("div", {
          className: "text-[10px] opacity-80 truncate cq-hor"
        }, e.location);
        return /*#__PURE__*/React.createElement("button", {
          key: e.id + "@" + e.start.getTime() + "#" + bi,
          onClick: () => setSelected({
            ...e,
            slotId: slot.id,
            slotPromo: slot.promo,
            slotKind: slot.kind
          }),
          className: "absolute rounded-lg text-left overflow-hidden cq-case hover:z-10 hover:scale-[1.02] transition shadow " + (xl130 ? "flex gap-3 items-start justify-start " : "") + (hgt >= thE ? "p-1.5" : "p-1"),
          style: {
            ...c.style,
            top: top + 2 + "px",
            height: Math.max(hgt - 4, 20) + "px",
            left: "calc(" + left + "% + 2px)",
            width: "calc(" + w + "% - 4px)"
          }
        }, (() => {
          return al ? /*#__PURE__*/React.createElement("span", {
            className: "absolute top-0 left-0 z-10 flex flex-col items-start gap-px",
            title: "â  " + fmtH(al.missingH) + " non placÃ©es pour ce groupe (" + (al.color === "jaune" ? "annulation non remplacÃ©e" : "jamais placÃ©e sur ADE") + ") â comptage : " + fmtH(al.h) + "/" + fmtH(al.refH) + " (" + al.n + " sÃ©ances)"
          }, /*#__PURE__*/React.createElement("span", {
            className: (al.color === "jaune" ? "bg-amber-400 " : "bg-red-500 ") + "text-slate-900 rounded-br px-0.5 leading-none"
          }, /*#__PURE__*/React.createElement("svg", {
            viewBox: "0 0 24 24",
            width: "9",
            height: "9",
            fill: "currentColor",
            fillRule: "evenodd"
          }, /*#__PURE__*/React.createElement("path", {
            d: "M7 2v2h10V2h2v2h3v18H2V4h3V2h2zM8 13h8v2H8v-2z"
          })))) : null;
        })(), (() => {
          const vt = virtTags(e);
          return vt.room || vt.ens ? /*#__PURE__*/React.createElement("span", {
            className: "absolute top-0 right-0 z-10 flex flex-col items-end gap-px",
            title: vt.room && vt.ens ? "â  Distanciel : salle et enseignant virtuels" : vt.room ? "â  Salle virtuelle" : "â  Enseignant virtuel"
          }, vt.room && /*#__PURE__*/React.createElement("span", {
            className: "bg-amber-400 text-slate-900 rounded-bl px-0.5 leading-none"
          }, /*#__PURE__*/React.createElement("svg", {
            viewBox: "0 0 24 24",
            width: "9",
            height: "9",
            fill: "currentColor"
          }, /*#__PURE__*/React.createElement("path", {
            d: "M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 3.5V7l-4 3.5z"
          }))), vt.ens && /*#__PURE__*/React.createElement("span", {
            className: "bg-sky-400 text-slate-900 rounded-bl px-0.5 leading-none"
          }, /*#__PURE__*/React.createElement("svg", {
            viewBox: "0 0 24 24",
            width: "9",
            height: "9",
            fill: "currentColor"
          }, /*#__PURE__*/React.createElement("path", {
            d: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-8 1.7-8 5v2h16v-2c0-3.3-4.7-5-8-5z"
          })))) : null;
        })(), xl130 ? /*#__PURE__*/React.createElement("div", {
          className: "flex flex-col min-w-0",
          style: {
            flex: "0 0 auto",
            minWidth: 0,
            maxWidth: "38%"
          }
        }, lineBadge130g, lineTitre130g) : [lineBadge130g, lineTitre130g], xl130 ? /*#__PURE__*/React.createElement("div", {
          className: "infos141e min-w-0",
          style: {
            flex: "1 1 auto",
            minWidth: 0,
            height: "100%"
          }
        }, lineHoraire130g, lineEnsPC130g, lineGrp130g, lineEnsTR130g, lineSalleRoom130g) : [lineHoraire130g, lineEnsPC130g, lineGrp130g, lineEnsTR130g, lineSalleRoom130g], hgt >= th36 && /*#__PURE__*/React.createElement("span", {
          className: "absolute bottom-0 right-0 z-[5] leading-none pr-0.5 pl-0.5 text-[9px] text-slate-500/90 bg-slate-900/50 rounded-tl"
        }, fmtDurH((e.end - e.start) / 36e5)));
      }));
    })));
  };
  const periodListFor = (slot, shown) => {
    if (slot.kind !== "promo" && !slot.teacher && !slot.room && !slot.course) return /*#__PURE__*/React.createElement("div", {
      className: "p-6 text-center text-xs text-slate-500"
    }, "Agenda vide â tapez un cours, une salle, un enseignant ou un groupe dans la barre ci-dessus.");
    let a = pStartD();
    let b = pEndD();
    if (b - a > 120 * 864e5) b = addDays(a, 120);
    const byDay = {};
    for (const e of shown) {
      const k = e.start.getFullYear() + "-" + e.start.getMonth() + "-" + e.start.getDate();
      (byDay[k] = byDay[k] || []).push(e);
    }
    const days = [];
    for (let d = new Date(a); d <= b; d = addDays(d, 1)) {
      const w = d.getDay();
      if (w !== 0 && w !== 6) days.push(new Date(d));
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "max-h-[70vh] overflow-y-auto"
    }, shown.length === 0 && /*#__PURE__*/React.createElement("div", {
      className: "p-4 text-center text-xs text-slate-500"
    }, "Aucun crÃ©neau sur cette pÃ©riode."), days.map(d => {
      const k = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
      const list = (byDay[k] || []).slice().sort((x, y) => x.start - y.start);
      return /*#__PURE__*/React.createElement("div", {
        key: k,
        className: "border-b border-slate-800/60 last:border-b-0 " + (sameDay(d, today) ? "bg-indigo-500/[0.04]" : "")
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-2 px-3 py-1.5 sticky top-0 bg-slate-900 border-b border-slate-800/60"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-[11px] font-semibold capitalize"
      }, d.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long"
      })), vacOf(d) && /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] text-amber-300 font-semibold"
      }, "â ", vacOf(d)), /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] text-slate-500 ml-auto"
      }, list.length ? list.length + " crÃ©neaux" : "libre")), list.map(e => {
        const c = colorFor(e, slot.promo, slot.kind);
        if (PERSO_ENABLED && slot.kind === "teacher" && e.mp === false && e.mpCours === true) Object.assign(c.style, {
          backgroundColor: "rgba(244,114,182,0.16)",
          border: "1.6px solid rgb(244,114,182)",
          borderLeft: "4px solid rgb(244,114,182)"
        }); // SUITE 94 : crÃ©neau HORS dÃ©partement MP (flux ens personnel) = rose
        const evPromo = slot.kind === "promo" ? slot.promo : e.promo || null;
        const dgs = dispGroups(e, evPromo, slot.kind === "teacher" || slot.kind === "room");
        const al = alertFor(e, evPromo); // suite 73 : sÃ©rie incomplÃ¨te
        return /*#__PURE__*/React.createElement("button", {
          key: e.id + "@" + e.start.getTime(),
          onClick: () => setSelected({
            ...e,
            slotId: slot.id,
            slotPromo: slot.promo,
            slotKind: slot.kind
          }),
          className: "w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-800/60"
        }, /*#__PURE__*/React.createElement("span", {
          className: "w-1.5 h-8 rounded-full flex-none",
          style: {
            backgroundColor: c.style.borderLeftColor || c.style.borderColor || c.style.backgroundColor
          }
        }), /*#__PURE__*/React.createElement("span", {
          className: "text-[11px] text-slate-400 font-mono w-[86px] flex-none"
        }, fmtHM(e.start), "â", fmtHM(e.end)), al ? /*#__PURE__*/React.createElement("span", {
          className: (al.color === "jaune" ? "text-amber-400" : "text-red-400") + " text-[10px] flex-none",
          title: "â  " + fmtH(al.missingH) + " non placÃ©es pour ce groupe â comptage : " + fmtH(al.h) + "/" + fmtH(al.refH) + " (" + al.n + " sÃ©ances)"
        }, "â ") : null, /*#__PURE__*/React.createElement("span", {
          className: "text-xs font-medium text-slate-100 truncate"
        }, typeTitle(e.summary, c.badge)), /*#__PURE__*/React.createElement("span", {
          className: "text-[10px] text-slate-500 truncate ml-auto inline-flex items-center gap-x-1.5 flex-wrap justify-end"
        }, e.location ? /*#__PURE__*/React.createElement("span", {
          className: "truncate"
        }, e.location) : null, dgs.map((g, gi) => {
          const og = noBadgeEv(e) ? null : occOf(e, evPromo, "g", g);
          return /*#__PURE__*/React.createElement("span", {
            key: gi,
            className: "inline-flex items-center whitespace-nowrap"
          }, g, og && (og.N > 1 || al) ? /*#__PURE__*/React.createElement("span", {
            className: "ml-0.5 text-[8.5px] font-bold text-slate-900 bg-slate-100 rounded px-0.5"
          }, og.n, "/", al ? al.ref : og.N) : null);
        }), e.teacher ? (() => {
          const ot = !multiTch(e) && !noBadgeEv(e) ? occOf(e, evPromo, "t") : null;
          return /*#__PURE__*/React.createElement("span", {
            className: "inline-flex items-center whitespace-nowrap"
          }, prettyName(e.teacher), ot ? /*#__PURE__*/React.createElement("span", {
            className: "ml-0.5 text-[8.5px] font-bold text-slate-900 bg-slate-100 rounded px-0.5"
          }, ot.n, "/", ot.N) : null, ot && ot.anN ? /*#__PURE__*/React.createElement("span", {
            className: "ml-0.5 text-[8.5px] font-bold text-slate-500",
            title: "Position de la sÃ©ance dans l'annÃ©e (sÃ©rie TP AVTECH comptÃ©e par blocs de 3 semaines)"
          }, "an ", ot.anK, "/", ot.anN) : null);
        })() : null));
      }));
    }));
  };

  // ---- Suite 61 : lien de partage (feedback â), diff vs donnÃ©es embarquÃ©es ----
  // (dÃ©clarÃ©s ici, aprÃ¨s les autres Ã©tats null, pour ne pas dÃ©caler les presets du harnais)
  const [shareDone, setShareDone] = useState(false);
  const [diff, setDiff] = useState(() => {
    const d = load("edt2-diff");
    return d && Array.isArray(d.items) ? d : null;
  });
  const [showDiff, setShowDiff] = useState(false);
  // Suite 79 : badge Î par agenda favori (liste des favoris) + modal filtrÃ© sur un agenda.
  // diffFilter = null â modal global (badge Î de l'entÃªte, comportement suite 71 inchangÃ©).
  const [diffFilter, setDiffFilter] = useState(null);
  const [diffRoomOpen, setDiffRoomOpen] = useState(false); // suite 86 : groupe Â« changements de salle Â» du modal Î, repliÃ© par dÃ©faut

  // Suite 92 : modal Â« SynthÃ¨se personnelle Â» (Î£ sur un favori enseignant, v4 seule).
  const [persoOpen, setPersoOpen] = useState(false);
  const [persoTab, setPersoTab] = useState("dyn"); // "fig" = 2025-2026 figÃ©e Â· "dyn" = annÃ©e en cours
  const [persoWk, setPersoWk] = useState(44); // semaine AU CURSEUR de la frise (0-44)
  const [persoRef, setPersoRef] = useState(() => {
    const v = load("edt2-perso-ref");
    return typeof v === "number" && isFinite(v) && v >= 0 ? v : null;
  }); // rÃ©fÃ©rentiel de l onglet FIGÃ 25-26, Ã©ditable, persistÃ© â SUITE 137 : PLUS DE DÃFAUT 114 embarquÃ©, la valeur vient de l ARCHIVE importÃ©e de l enseignant (archRefTotal137) rechargÃ©e Ã  l ouverture
  // SUITE 94 : toggle MP/Tout (persistÃ©, dÃ©faut = TOUT : aucun filtrage silencieux) â agenda
  // enseignant + SynthÃ¨se (v4 seule). + masque Â« crÃ©neau appartient au dÃ©partement MP Â».
  const [mpOnly, setMpOnly] = useState(() => load("edt2-mp-only") === 1);
  const mpMask = useMemo(() => mpMaskOf(allEvents), [allEvents]);
  // Suite 93 : service statutaire paramÃ©trable (384 par dÃ©faut ; 192 ou libre pour les collÃ¨gues,
  // la rÃ¨gle HC Ã2/3 Ã©tant la mÃªme pour tous). PersistÃ© par appareil.
  const [persoService, setPersoService] = useState(() => {
    const v = load("edt2-perso-service");
    return typeof v === "number" && isFinite(v) && v >= 1 ? v : 384;
  });
  const [persoSvcCustom, setPersoSvcCustom] = useState(false); // Â« Autreâ¦ Â» choisi â champ libre
  // SUITE 99 : dÃ©tail du rÃ©fÃ©rentiel â dÃ©pli des lignes OSE + lignes ÃDITABLES sur l'annÃ©e en
  // cours uniquement (l'onglet 25-26 figÃ© affiche les refItems DE L'ARCHIVE importÃ©e, en lecture seule).
  const [persoRefOpen, setPersoRefOpen] = useState(false); // â¾ = lignes OSE visibles
  const [persoPromoOpen, setPersoPromoOpen] = useState(null); // SUITE 105 : ligne dÃ©pliÃ©e de l onglet Promos (clÃ© promo, ou "ref" pour le rÃ©fÃ©rentiel global)
  const [persoRefApprox112, setPersoRefApprox112] = useState(0); // SUITE 112 : valeur APPROCHÃE du rÃ©fÃ©rentiel (h Ã©qTD) â utilisÃ©e tant qu'aucune ligne OSE n'est saisie ni importÃ©e (prioritÃ© lignes > approchÃ©e) ; persistÃ©e PAR ENSEIGNANT edt2-perso-<ens>-refapprox
  const [persoRefLines, setPersoRefLines] = useState(() => {
    // {lib, h}[] â total = rÃ©fÃ©rentiel de l'annÃ©e EN COURS
    try {
      const v = JSON.parse(load("edt2-perso-ref-lines") || "null");
      if (Array.isArray(v) && v.every(l => l && typeof l.lib === "string" && typeof l.h === "number" && l.h >= 0)) return v;
    } catch (x) {}
    return []; // SUITE 137 : dÃ©faut NEUTRE â lignes de l'annÃ©e en cours = archive de l'enseignant ou saisie, rechargÃ©es Ã  l'ouverture (plus de lignes embarquÃ©es)
  });
  // SUITE 108 : multi-collÃ¨gues â l'enseignant de la SynthÃ¨se ouverte = N'IMPORTE QUEL
  // favori enseignant (SUITE 137 : plus aucun verrou d'enseignement codÃ© en dur). Toutes les saisies perso sont rechargÃ©es PAR
  // ENSEIGNANT (clÃ©s prÃ©fixÃ©es edt2-perso-<ens>-*, repli ancienne clÃ© pour l enseignant historique).
  const [persoT108, setPersoT108] = useState(null); // SUITE 108b : VIDE au dÃ©part â rempli au clic sur Î£, vidÃ© Ã  la fermeture (closePerso108). Garantit un CHANGEMENT de valeur Ã  chaque ouverture : le rechargement part toujours, mÃªme pour l'enseignant initial (bugs de rechargement historiques).
  const [persoTLoading108, setPersoTLoading108] = useState(false); // SUITE 108 : true entre l'ouverture pour un collÃ¨gue et la fin du (re)chargement de SES saisies â Ã©vite un rendu intermÃ©diaire avec des valeurs d'un autre enseignant
  const [persoOseOpen108, setPersoOseOpen108] = useState(false); // panneau Â« Import OSE Â» (surimpression, mÃªme mÃ©canique que les lignes)
  const [oseBuf108, setOseBuf108] = useState(""); // texte collÃ© en cours (jamais persistÃ©)
  const [oseRes108, setOseRes108] = useState(null); // rÃ©sultat du parse du collÃ© courant : {type, res, complete}
  const [persoOseEns, setPersoOseEns] = useState(null); // {rows, stamp} â prÃ©visionnel ENSEIGNEMENT_OSE importÃ© (onglet annÃ©e en cours)
  const [persoOseFig, setPersoOseFig] = useState(null); // {type:'ens'|'ref', rows|byFn, stamp} â bilan FIGÃ-PAR-OSE (collÃ¨gues, annÃ©es sans ADE)
  const closePerso108 = () => {
    setPersoOpen(false);
    setPersoT108(null);
    setPersoTLoading108(false);
  }; // SUITE 108b : fermeture UNIQUE de la SynthÃ¨se â fenÃªtre refermÃ©e + enseignant vidÃ© + Ã©cran d'attente baissÃ©. TOUT point de fermeture passe par ici (garde-fou check8 : aucune fermeture directe ailleurs).
  // SUITE 137 : import gÃ©nÃ©rique d'ARCHIVE D'ANNÃE (JSON) â tout collÃ¨gue avec son fichier
  // retrouve l'onglet Â« 2025-2026 Â· figÃ©e Â» Ã  l'identique (frise, E, payÃ©, refItems, Promos).
  const [archBuf137, setArchBuf137] = useState(""); // JSON collÃ© en cours (jamais persistÃ© tant que non validÃ©)
  const [archMsg137, setArchMsg137] = useState(null); // {ok:bool, txt} message d'Ã©tat de l'import
  const archUse137 = text => {
    let a = null;
    try {
      a = JSON.parse(String(text || ""));
    } catch (x) {}
    if (!archValid137(a)) {
      setArchMsg137({
        ok: false,
        txt: "Archive invalide : JSON illisible ou sans Â« weeks Â» au schÃ©ma edt-mp-archive-1 (une ligne par semaine : {cm, td, tp, byPromo})."
      });
      return;
    }
    if (!archSave137(persoT108, a)) {
      setArchMsg137({
        ok: false,
        txt: "Enregistrement impossible (localStorage indisponible)."
      });
      return;
    }
    const archRefT137 = archRefTotal137(a);
    if (typeof archRefT137 === "number") setPersoRef(archRefT137); // rÃ©fÃ©rence de l onglet figÃ© = archive (tant que rien n est saisi Ã  la main)
    let keepLines = null;
    try {
      const v = JSON.parse(persoLoad108(persoT108, "ref-lines") || "null");
      if (Array.isArray(v) && v.every(l => l && typeof l.lib === "string" && typeof l.h === "number" && l.h >= 0)) keepLines = v;
    } catch (x) {}
    setPersoRefLines(keepLines || (Array.isArray(a.refItems) ? a.refItems.filter(r => r && typeof r.lib === "string" && typeof r.h === "number" && r.h >= 0).map(r => ({
      lib: r.lib,
      h: r.h
    })) : [])); // lignes de l annÃ©e en cours : saisie personnelle PRIORITAIRE, sinon copie des refItems de l archive
    setArchBuf137("");
    setArchMsg137({
      ok: true,
      txt: "Archive " + (a.annee || ARCHIVE_YEAR_137) + " importÃ©e pour " + persoT108 + " â l onglet Â« 2025-2026 Â· figÃ©e Â» est restaurÃ©" + (a.validePaye ? " (donnÃ©es validÃ©es paye)" : "") + "."
    });
  };
  useEffect(() => {
    // SUITE 108 : (re)chargement des saisies de l'enseignant courant Ã  chaque ouverture/changement
    if (!persoT108) return;
    const archOpen137 = archLoad137(persoT108); // SUITE 137 : ARCHIVE importÃ©e de CET enseignant (plus de donnÃ©es embarquÃ©es) â rÃ©fÃ©rence les sous-fonds figÃ©/Promos/rappels
    const archRefT137 = archRefTotal137(archOpen137);
    const r108 = persoLoad108(persoT108, "ref");
    setPersoRef(typeof r108 === "number" && isFinite(r108) && r108 >= 0 ? r108 : archRefT137); // SUITE 137 : saisi > archive > absent (jamais zÃ©ro par dÃ©faut trompeur)
    const a112 = persoLoad108(persoT108, "refapprox"); // SUITE 112 : approchÃ© rechargÃ© par enseignant (0 si absent)
    setPersoRefApprox112(typeof a112 === "number" && isFinite(a112) && a112 >= 0 ? a112 : 0);
    const s108 = persoLoad108(persoT108, "service");
    setPersoService(typeof s108 === "number" && isFinite(s108) && s108 >= 1 ? s108 : 384);
    setPersoSvcCustom(false);
    let lines108 = null;
    try {
      const v = JSON.parse(persoLoad108(persoT108, "ref-lines") || "null");
      if (Array.isArray(v) && v.every(l => l && typeof l.lib === "string" && typeof l.h === "number" && l.h >= 0)) lines108 = v;
    } catch (x) {}
    setPersoRefLines(lines108 || (archOpen137 && Array.isArray(archOpen137.refItems) ? archOpen137.refItems.filter(r => r && typeof r.lib === "string" && typeof r.h === "number" && r.h >= 0).map(r => ({
      lib: r.lib,
      h: r.h
    })) : [])); // SUITE 137 : dÃ©faut = lignes de l ARCHIVE de cet enseignant ; sans archive ni saisie : AUCUNE ligne (rÃ©fÃ©rentiel absent)
    let ose108 = null;
    try {
      const v = JSON.parse(persoLoad108(persoT108, "ose-ens") || "null");
      if (v && Array.isArray(v.rows) && typeof v.stamp === "number") ose108 = v;
    } catch (x) {}
    setPersoOseEns(ose108);
    let fig108 = null;
    try {
      const v = JSON.parse(persoLoad108(persoT108, "ose-fig") || "null");
      if (v && (v.type === "ens" || v.type === "ref") && typeof v.stamp === "number") fig108 = v;
    } catch (x) {}
    setPersoOseFig(fig108);
    setPersoRefOpen(false);
    setPersoOseOpen108(false);
    setOseRes108(null);
    setOseBuf108("");
    setPersoPromoOpen(null); // panneaux refermÃ©s Ã  chaque changement d'enseignant
    setPersoTLoading108(false); // SUITE 108 : saisies de l'enseignant courant chargÃ©es â le rendu de la SynthÃ¨se peut reprendre
  }, [persoT108]);
  const oseStoreEns108 = rows => {
    const v = {
      rows,
      stamp: Date.now()
    };
    setPersoOseEns(v);
    store(persoKeyOf(persoT108, "ose-ens"), JSON.stringify(v));
  }; // Ã©critures prÃ©fixÃ©es SUITE 108
  const oseStoreFig108 = (type, payload) => {
    const v = {
      type,
      ...payload,
      stamp: Date.now()
    };
    setPersoOseFig(v);
    store(persoKeyOf(persoT108, "ose-fig"), JSON.stringify(v));
  };
  const diffCountFor = s => !diff || !Array.isArray(diff.items) || !s ? 0 : diff.items.filter(it => diffMatch(it, s)).length;
  // SUITE 144 : pastilles În NON REDONDANTES par nÅud LCA (promo â groupe â
  // sous-groupe). Chaque item de diff vit Ã  UN SEUL nÅud (l'ancÃªtre commun le plus
  // bas de ses groupes ; promo entiÃ¨re â nÅud promo) : A1-6 seul ne marque QUE
  // A1-6, tout-A marque QUE A, le parent et les frÃ¨res non touchÃ©s ne portent
  // RIEN â zÃ©ro surcharge, le nombre total de pastilles = nombre de changements.
  // SUITE 147 : les pastilles vivent AUSSI LONGTEMPS que le badge Î global (suite 71),
  // c'est-Ã -dire jusqu'au prochain â» â plus d'Ã©tat Â« vu Â» : consulter un nÅud (clic
  // pastille â modal filtrÃ©, comportement 79/86 rÃ©utilisÃ©) ne fait plus disparaÃ®tre SA
  // pastille (sinon on oublie ce qu'on vient de voir) ; l'ancien mÃ©canisme Â« consultÃ©
  // = cachÃ© Â» de la 144 (clÃ© localStorage dÃ©diÃ©e) est retirÃ©, clÃ© ignorÃ©e si prÃ©sente.
  const diffNodes144 = useMemo(() => {
    const m = {};
    if (diff && Array.isArray(diff.items)) for (const it of diff.items) {
      const node = diffLcaNode144(it.p, it.g);
      const k = it.p + "|" + (node || "");
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [diff]);
  const diffNodeBadge144 = (p, g) => diffNodes144[p + "|" + (g || "")] || 0;
  // compteurs CM/TD/TP affichÃ©s dans la ligne d'un favori enseignant
  const favStatsEl = s => {
    if (!s || s.kind !== "teacher" || !s.teacher) return null;
    // SUITE 116 (retour recette) : le compteur d'un favori enseignant suit la semaine
    // RÃELLEMENT AFFICHÃE de SON agenda s'il est ouvert (offset wk par agenda â un swipe
    // ou â¹ âº en vue Semaine dÃ©place CET agenda-ci), sinon repli suite 85 : la semaine du
    // sÃ©lecteur de date (jourSel) â favori consultÃ© sans agenda ouvert, mÃªme ancre qu'avant.
    const slotT = slots.find(x => x.kind === "teacher" && x.teacher === s.teacher);
    const anchor116 = slotT ? startOfWeek(addDays(weekStart, (slotT.wk || 0) * 7)) : startOfWeek(jourAnchorD());
    const h = favHours(s.teacher, teachers, anchor116);
    return /*#__PURE__*/React.createElement("span", {
      title: "Heures de cours (CM/TD/TP uniquement, Ã©valuations et conseils exclus) : semaine affichÃ©e (celle de son agenda ouvert, sinon du sÃ©lecteur de date) Â· heures faites jusqu'au vendredi de la semaine affichÃ©e / total de l'annÃ©e dans la base (septembreâjuillet)",
      className: "text-[10px] text-slate-500 whitespace-nowrap"
    }, fmtHrs(h.hSem), WIDE ? " / semaine Â· " : " / sem Â· ", fmtHrs(h.hAn), WIDE ? " sur " : "/", fmtHrs(h.hTot), " (annÃ©e)");
  };
  const fdt = t => {
    const d = new Date(t);
    return d.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "numeric"
    }) + " " + fmtHM(d);
  };
  // ---- Suite 64 : bandeau Â« MAJ disponible Â» (dÃ©tection silencieuse en arriÃ¨re-plan) ----
  const [majAvail, setMajAvail] = useState(false);
  useEffect(() => {
    // Silencieux et jamais bloquant : on relit l'ETag de notre propre page ; s'il a changÃ©
    // depuis la derniÃ¨re visite, une publication est sortie â bandeau cliquable.
    if (typeof location === "undefined" || !location || !location.href) return;
    try {
      fetch(location.href.split("#")[0].split("?")[0], {
        cache: "no-store"
      }).then(r => {
        const et = r.headers && (r.headers.get("etag") || r.headers.get("last-modified")) || null;
        if (!et) return;
        const prev = load("edt2-etag");
        if (prev !== null && prev !== et) setMajAvail(true);
        store("edt2-etag", et);
      }).catch(() => {});
    } catch (e) {}
  }, []);
  // ---- Suite 64 : proposeur de rÃ©organisation (v3+, REPLAN_ENABLED) ----
  const [replan, setReplan] = useState(null);
  // Suite 72 : bouton Â« Devoirs Â» â menu des promotions puis liste des devoirs de l'annÃ©e.
  const [devoirsMenu, setDevoirsMenu] = useState(false);
  const [devoirsPromo, setDevoirsPromo] = useState(null);
  const devoirsCount = useMemo(() => {
    const m = {};
    for (const p of PROMO_KEYS) {
      const dv = (allEvents[p] || []).filter(isDevoir);
      // suite 83 : une SÃQUENCE de soutenances (mÃªme titre, â¥ 2 crÃ©neaux) compte pour 1
      // dans le compteur du menu Devoirs â les autres devoirs individuellement.
      const soutTitles = new Set();
      let nSout = 0;
      for (const e of dv) {
        if (/soutenance/i.test(e.summary || "")) {
          const k = (e.summary || "").trim().toLowerCase();
          if (soutTitles.has(k)) continue;
          soutTitles.add(k);
          nSout++;
        }
      }
      m[p] = dv.length - (dv.filter(e => /soutenance/i.test(e.summary || "")).length - nSout);
    }
    return m;
  }, [allEvents]);
  const devoirsList = useMemo(() => !devoirsPromo ? [] : (allEvents[devoirsPromo] || []).filter(isDevoir).slice().sort((a, b) => a.start - b.start), [devoirsPromo, allEvents]);
  // Suite 83 : soutenances REPLIABLES â les crÃ©neaux Â« soutenance Â» de mÃªme titre (â¥ 2)
  // forment une sÃ©quence : repliÃ©e = plage de dates + nb de sÃ©ances ; dÃ©pliÃ©e = une ligne
  // par JOUR (amplitude 1reâderniÃ¨re sÃ©ance) si le jour est homogÃ¨ne (mÃªme salle/groupes,
  // crÃ©neaux contigus), sinon le dÃ©tail par crÃ©neau (heureâheure Â· salle Â· groupe), ex. PTUT.
  const [soutOpen, setSoutOpen] = useState({}); // { titreMin : true } â sÃ©quences dÃ©pliÃ©es
  const devoirsRows = useMemo(() => {
    const rows = [];
    const seqs = {};
    const seen = new Set();
    for (const e of devoirsList) {
      if (!/soutenance/i.test(e.summary || "")) {
        rows.push({
          t: "ev",
          e
        });
        continue;
      }
      const k = (e.summary || "").trim().toLowerCase();
      if (!seqs[k]) {
        seqs[k] = {
          t: "seq",
          key: k,
          title: e.summary,
          evs: []
        };
      }
      seqs[k].evs.push(e);
      seen.add(e);
    }
    const seqVals = Object.values(seqs).filter(s => s.evs.length >= 2).map(s => {
      s.evs.sort((a, b) => a.start - b.start);
      return s;
    });
    const soloSout = Object.values(seqs).filter(s => s.evs.length === 1).map(s => ({
      t: "ev",
      e: s.evs[0]
    }));
    // lignes fusionnÃ©es : Ã©vÃ©nements seuls + sÃ©quences + soutenances isolÃ©es, tri global par 1re date
    const all = rows.concat(seqVals).concat(soloSout);
    all.sort((a, b) => (a.t === "seq" ? a.evs[0].start : a.e.start) - (b.t === "seq" ? b.evs[0].start : b.e.start));
    return all;
  }, [devoirsList]);
  // ---------- SUITE 129 (spec recette 24/11) : Â« Devoirs de la semaine Â» â vue TOUS PROMOS
  // de la semaine en cours, premiÃ¨re entrÃ©e du menu Â« Devoirs â¸ Â», flÃ¨ches â¹ âº pour naviguer
  // entre semaines. PÃ©rimÃ¨tre identique aux listes annuelles : isDevoir (Â« 1/3 temps Â» exclu),
  // soutenances en sÃ©quences repliables (mÃªme convention que suite 83 : mÃªme titre â¥ 2 crÃ©neaux
  // = 1 ligne), Ã©coulÃ©s grisÃ©s. Les listes annuelles par promo sont INCHANGÃES.
  const [devoirsWkRef, setDevoirsWkRef] = useState(null); // null = fermÃ©e ; sinon Date = lundi de la semaine affichÃ©e
  const devoirsWkChip129 = {
    "MP-1A": "text-emerald-300",
    "MP-2A": "text-sky-300",
    "MP-2A-ALT": "text-sky-300",
    "MP-3A-MAE": "text-red-300",
    "MP-3A-TECHVIMAT": "text-red-300",
    "MP-3A-AVTECH": "text-red-300"
  }; // code couleur de l'appli : vert B1 Â· bleu B2 Â· rouge B3 Â· turquoise CiTiSE (repli) Â· gris autre
  const devoirsWkLabel129 = p => PROMOS[p] ? PROMOS[p].label + (PROMOS[p].sub ? " " + PROMOS[p].sub : "") : p;
  const devoirsWkSeqKey129 = (p, e) => p + "@129@" + (e.summary || "").trim().toLowerCase(); // suffixe @129 : jamais de collision avec les clÃ©s de sÃ©quences du modal annuel
  const devoirsWkTiles129 = t0 => {
    // crÃ©neaux devoir de la fenÃªtre [lundi, +7 j), toutes promos
    const out = [];
    for (const p of PROMO_KEYS) for (const e of allEvents[p] || []) {
      if (!isDevoir(e)) continue;
      const ts = e.start.getTime();
      if (ts < t0 || ts >= t0 + 7 * 864e5) continue;
      out.push({
        p,
        e
      });
    }
    return out;
  };
  const devoirsWeekCount = useMemo(() => {
    // compte de l'entrÃ©e du menu (semaine EN COURS ; une sÃ©quence de soutenances = 1, comme le compteur par promo du menu)
    const tiles = devoirsWkTiles129(startOfWeek(new Date()).getTime());
    const seq = new Set();
    let n = 0;
    for (const x of tiles) {
      if (/soutenance/i.test(x.e.summary || "")) {
        const k = devoirsWkSeqKey129(x.p, x.e);
        if (seq.has(k)) continue;
        seq.add(k);
      }
      n++;
    }
    return n;
  }, [allEvents]);
  const devoirsWeekRows = useMemo(() => {
    // lignes du modal semaine : Ã©vÃ©nements simples + sÃ©quences de soutenances repliÃ©es, tri global par 1re date
    if (!devoirsWkRef) return [];
    const tiles = devoirsWkTiles129(devoirsWkRef.getTime());
    const rows = [];
    const seqs = {};
    for (const x of tiles) {
      if (!/soutenance/i.test(x.e.summary || "")) {
        rows.push({
          t: "ev",
          p: x.p,
          e: x.e
        });
        continue;
      }
      const k = devoirsWkSeqKey129(x.p, x.e);
      if (!seqs[k]) seqs[k] = {
        t: "seq",
        key: k,
        p: x.p,
        title: x.e.summary,
        evs: []
      };
      seqs[k].evs.push(x.e);
    }
    const seqVals = Object.values(seqs);
    const out = rows.concat(seqVals.filter(s => s.evs.length >= 2));
    for (const s of seqVals) if (s.evs.length === 1) out.push({
      t: "ev",
      p: s.p,
      e: s.evs[0]
    }); // soutenance isolÃ©e = ligne simple, comme le modal annuel
    out.sort((a, b) => (a.t === "seq" ? a.evs[0].start : a.e.start) - (b.t === "seq" ? b.evs[0].start : b.e.start));
    return out;
  }, [devoirsWkRef, allEvents]);
  // une sÃ©quence est Â« hÃ©tÃ©rogÃ¨ne Â» sur un jour si salles/groupes differents ou crÃ©neaux non contigus
  const [replanCopied, setReplanCopied] = useState(null);
  const runReplan = (ev, promoHint) => {
    if (!REPLAN_ENABLED || !ev || !ev.start) return;
    if (decDT(ev.start).getTime() < Date.now()) return; // crÃ©neau passÃ© : rien Ã  proposer (bouton masquÃ©)
    const hint = promoHint || ev.promo || ev.slotPromo;
    // promos candidates = celles dont l'arbre contient un groupe du crÃ©neau (hint prioritaire).
    // Si l'Ã©tiquette est ambiguÃ« (ex. Â« A Â»/Â« B Â» en MP-1A ET MP-3A-AVTECH), on prend
    // l'UNION de toutes les promos candidates pour la liste des crÃ©neaux occupÃ©s :
    // trop bloquer est sÃ»r (proposition manquÃ©e), pas assez bloquer propose l'impossible.
    const gsEv = grpsOf(ev);
    let promos = PROMO_KEYS.filter(p => gsEv.some(g => promoHasGroup(g, p)));
    if (hint && PROMOS[hint] && gsEv.some(g => promoHasGroup(g, hint))) promos = [hint].concat(promos.filter(p => p !== hint));
    const p = promos[0] || (hint && PROMOS[hint] ? hint : null);
    const tchs = (ev.teacher || "").split(" / ").map(x => x.trim()).filter(Boolean);
    let evs = (promos.length ? promos : PROMO_KEYS).flatMap(k => allEvents[k] || []).slice();
    for (const t of tchs) evs = evs.concat(teachers[t] || []);
    setReplan({
      sel: ev,
      promo: p,
      items: replanFind(ev, p, evs)
    });
  };
  const replanTy = replan ? evTypeOf(replan.sel, replan.promo) : null;
  const replanTxt = it => {
    const s = replan && replan.sel;
    if (!s) return "";
    // Suite 72 : TD â aucune salle dans la proposition ; CM sans salle libre â Â« salle Ã  prÃ©ciser Â».
    const salle = replanTy === "TD" ? "" : it.room ? it.room : "salle Ã  prÃ©ciser";
    return "Proposition (EDT MP IUT St-Ãtienne) : dÃ©placer Â« " + s.summary + " Â» du " + fdt(decDT(s.start).getTime()) + " (" + (s.location || "salle Ã  prÃ©ciser") + ") au " + fdt(it.t) + (salle ? " (" + salle + ")" : "") + ", " + fmtHM(new Date(it.t)) + " â " + fmtHM(new Date(it.end)) + " â groupes et enseignant vÃ©rifiÃ©s libres sur l'EDT" + (replanTy === "TP" ? ", salle conservÃ©e" : "") + ".";
  };
  const copyReplan = i => {
    const txt = replan ? replanTxt(replan.items[i]) : "";
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
    } catch (e) {}
    setReplanCopied(i);
    setTimeout(() => setReplanCopied(null), 2500);
  };
  // SUITE 132 : mode KIOSK (Â« /tv/ Â») â TOUT le chrome applicatif est remplacÃ© par
  // l'Ã©cran suspendu (deux grilles Â½ journÃ©e, fusion, halo, bascule horloge). Le retour
  // anticipÃ© est placÃ© APRÃS tous les hooks de l'App (aucun hook conditionnel) : les
  // donnÃ©es continuent d'Ãªtre reconstruites par la cascade existante (firstSync â â»).
  if (KIOSK) return /*#__PURE__*/React.createElement(Kiosk132, {
    allEvents: allEvents,
    lastSync: lastSync,
    syncState: syncState,
    busy: busySync,
    feedErrs: feedErrs,
    onRefresh: refreshIcs
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-slate-950 text-slate-100 p-3 md:p-6 font-sans"
  }, /*#__PURE__*/React.createElement("style", null, THEME_VARS_136, LIGHT_CSS_134, ADAPT_CSS_141C, TODAY_CSS_146), /*#__PURE__*/React.createElement("div", {
    className: "max-w-[1700px] mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-sm md:text-base font-bold tracking-tight"
  }, "Dpt MP IUT ", /*#__PURE__*/React.createElement("span", {
    className: "text-indigo-400"
  }, "St-Ãtienne"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-normal text-slate-400"
  }, lastSync ? " Â· sync " + fmtHM(lastSync) : DATA_DATE ? " Â· MAJ " + DATA_DATE : ""), diff && diff.items.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setDiffFilter(null);
      setShowDiff(true);
    },
    title: "Changements dÃ©tectÃ©s dans ADE depuis ta derniÃ¨re synchro : ajoutÃ©s, supprimÃ©s, dÃ©placÃ©s, changements de salle ou d'enseignant â clic pour le dÃ©tail",
    className: "ml-1 align-middle text-[10px] font-medium text-amber-300 bg-amber-400/10 border border-amber-400/40 hover:border-amber-300 rounded-full px-1.5 py-0.5 transition"
  }, "Î ", diff.counts ? diff.counts.add + diff.counts.mod + diff.counts.del : diff.items.length, WIDE ? " changements" : ""), /*#__PURE__*/React.createElement("button", {
    onClick: () => refreshIcs(),
    disabled: busySync,
    title: "RafraÃ®chir : tÃ©lÃ©charge en direct les flux ICS ADE (promotions + complÃ©ment enseignants) via le proxy et reconstruit les crÃ©neaux et les agendas (suppressions et dÃ©placements ADE pris en compte).",
    className: (busySync ? "bg-emerald-700 " : "bg-emerald-500 hover:bg-emerald-400 ") + "ml-1 align-middle text-[10px] font-semibold text-slate-900 border border-emerald-400 transition rounded-lg px-2.5 py-1 whitespace-nowrap"
  }, busySync ? "â» â¦" : WIDE ? "â» RafraÃ®chir" : "â» Rafr."), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowImport(true),
    title: "Options â flux & sources : Ã©tat des 9 flux ADE, remplacement de lien (â), secours intÃ©grÃ©, thÃ¨me clair/sombre",
    className: "ml-1 align-middle text-[10px] font-medium bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200 transition rounded-lg px-2 py-1"
  }, "Options"), favs.length > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: showFavsOnly,
    title: "Afficher uniquement les favoris : fermer les autres agendas et rouvrir l'Ã©tat d'ouverture de l'App",
    className: "ml-1 align-middle text-[10px] font-medium bg-slate-900 text-amber-300 border border-amber-400/40 hover:border-amber-300 transition rounded-lg px-2 py-1 whitespace-nowrap"
  }, "â Aff. Favoris")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewMode("semaine"),
    className: "text-[11px] font-medium rounded-lg px-2.5 py-1 border transition " + (viewMode === "semaine" ? "bg-slate-100 text-slate-900 border-slate-100" : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500")
  }, "Semaine"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewMode("jour"),
    title: "Vue JournÃ©e : une seule journÃ©e, chaque groupe a toute la largeur (promos complÃ¨tes lisibles) ; â¹ âº ou balayage = jour prÃ©cÃ©dent/suivant",
    className: "text-[11px] font-medium rounded-lg px-2.5 py-1 border transition " + (viewMode === "jour" ? "bg-slate-100 text-slate-900 border-slate-100" : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500")
  }, "JournÃ©e"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewMode("periode"),
    className: "text-[11px] font-medium rounded-lg px-2.5 py-1 border transition " + (viewMode === "periode" ? "bg-slate-100 text-slate-900 border-slate-100" : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500")
  }, "PÃ©riode"), viewMode === "periode" && /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: pStart,
    onChange: e => setPStart(e.target.value),
    className: "bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px]",
    style: {
      colorScheme: "dark"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-500 text-[11px]"
  }, "â"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: PEnd,
    onChange: e => setPEnd(e.target.value),
    className: "bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200",
    style: {
      colorScheme: "dark"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-500"
  }, pDayCount(), " j. ouvrÃ©s")), /*#__PURE__*ionne comme avant. */
        React.createElement("span", {
          key: g,
          className: "flex items-center gap-0.5"
        }, /*#__PURE__*/React.createElement("button", {
          onClick: () => updSlot(slot.id, {
            kind: "promo",
            groups: on ? slot.groups.filter(x => !gs.includes(x)) : [...new Set([...slot.groups, ...gs])]
          }),
          className: "font-medium rounded-lg px-1.5 py-1 border transition text-[11px] " + (on ? "bg-indigo-400 text-slate-900 border-indigo-400" : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500")
        }, gs.length > 1 ? gs.join("/") : grpDisp(slot.promo, g)), n144 > 0 && /*#__PURE__*/React.createElement("button", {
          onClick: () => {
            setDiffFilter({
              kind: "promo",
              promo: slot.promo,
              groups: gs
            });
            setShowDiff(true);
          },
          title: "Changements ADE de ce groupe depuis la derniÃ¨re synchro (" + n144 + ") â clic pour le dÃ©tail",
          className: "text-[10px] font-medium text-amber-300 bg-amber-400/10 border border-amber-400/40 hover:border-amber-300 rounded-full px-1.5 py-0.5 transition shrink-0"
        }, "Î ", n144))
      );
    }))))), viewMode === "periode" ? periodListFor(slot, data.shown) : shownCount === 0 && slot.kind !== "promo" && !slot.teacher && !slot.room && !slot.course ? /*#__PURE__*/React.createElement("div", {
      className: "p-6 text-center text-xs text-slate-500"
    }, "Agenda vide â tapez un cours, une salle, un enseignant ou un groupe dans la barre ci-dessus.") : shownCount === 0 ? (() => {
      const wv = viewMode === "jour" ? vacOf(slotDayStart()) : [0, 1, 2, 3, 4].map(i => vacOf(addDays(slotWeekStart(slot), i))).find(Boolean);
      return /*#__PURE__*/React.createElement("div", {
        className: "relative"
      }, gridFor(slot, data.shown, data.cols, bounds), /*#__PURE__*/React.createElement("div", {
        className: "absolute inset-0 flex items-center justify-center pointer-events-none"
      }, /*#__PURE__*/React.createElement("div", {
        className: "px-3 py-1.5 rounded bg-slate-900/80 text-xs text-slate-500"
      }, wv ? /*#__PURE__*/React.createElement("span", {
        className: "text-amber-300 font-semibold"
      }, "â Vacances â ", wv) : viewMode === "jour" ? "Aucun crÃ©neau ce jour." : "Aucun crÃ©neau cette semaine.")));
    })() : gridFor(slot, data.shown, data.cols, bounds)));
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addSlot,
    className: "self-start text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 transition rounded-xl px-4 py-2.5"
  }, "+ Ajouter un agenda"), favs.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] uppercase tracking-wide text-slate-500 font-semibold"
  }, "Favoris"), /*#__PURE__*/React.createElement("button", {
    onClick: showFavsOnly,
    title: "Fermer les autres agendas et afficher uniquement les favoris (Ã©tat d'ouverture de l'App)",
    className: "text-[10px] font-medium bg-slate-900 text-amber-300 border border-amber-400/40 hover:border-amber-300 transition rounded-lg px-2 py-0.5"
  }, "â Afficher uniquement les favoris")), favs.map(f => /*#__PURE__*/React.createElement("span", {
    key: f.k,
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => toggleFav(f.s),
    title: "Retirer des favoris",
    className: "text-amber-300 hover:text-amber-200 text-base leading-none px-0.5 transition"
  }, "â"), /*#__PURE__*/React.createElement("button", {
    onClick: () => openFav(f),
    title: "Ouvrir cet agenda favori",
    className: "text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 transition rounded-xl px-3 py-1.5 text-left"
  }, favLabel(f.s)), favStatsEl(f.s), PERSO_ENABLED && f.s.kind === "teacher" && f.s.teacher && !isVirtEnsKey(f.s.teacher) &&
  /*#__PURE__*/
  // SUITE 108 : dÃ©verrouillage gÃ©nÃ©rÃ© â tout favori enseignant non virtuel (ancien verrou nominatif retirÃ© ; les donnÃ©es sont restaurables via l archive d annÃ©e importÃ©e (SUITE 137))
  React.createElement("button", {
    onClick: () => {
      setPersoT108(f.s.teacher);
      setPersoTLoading108(true);
      setPersoTab("dyn");
      setPersoWk(Math.max(0, Math.min(44, Math.round((startOfWeek(new Date()).getTime() - new Date(2026, 7, 24).getTime()) / 6.048e8))));
      setPersoOpen(true);
    },
    title: "SynthÃ¨se personnelle de " + f.s.teacher + " : heures CM/TD/TP, Ã©qTD OSE, rÃ©fÃ©rentiel et service statutaire rÃ©glables, payÃ© estimÃ© et saturation (annÃ©e en cours, recalculÃ©e Ã  chaque â») â les annÃ©es prÃ©cÃ©dentes s'appuient sur ses archives OSE",
    className: "text-[10px] font-medium text-emerald-300 bg-emerald-400/10 border border-emerald-400/40 hover:border-emerald-300 rounded-full px-1.5 py-0.5 transition"
  }, "Î£ SynthÃ¨se"), diff && diff.items.length > 0 && diffCountFor(f.s) > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setDiffFilter(f.s);
      setShowDiff(true);
    },
    title: "Changements ADE depuis ta derniÃ¨re synchro qui concernent cet agenda favori (" + diffCountFor(f.s) + ") â clic pour le dÃ©tail filtrÃ© sur l'agenda",
    className: "text-[10px] font-medium text-amber-300 bg-amber-400/10 border border-amber-400/40 hover:border-amber-300 rounded-full px-1.5 py-0.5 transition"
  }, "Î ", diffCountFor(f.s)))))), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-[11px] text-slate-500"
  }, sources.length ? "Rechargement automatique des " + sources.length + " flux ADE Ã  chaque ouverture" + (lastSync ? " (derniÃ¨re synchro : " + fmtHM(lastSync) + ")" : "") + ". " : "DonnÃ©es : flux ICS ADE du dÃ©partement (promotions + Ã©vÃ©nements, annÃ©e universitaire 2026-2027, y compris les crÃ©neaux passÃ©s)" + (DATA_DATE ? " â MAJ " + DATA_DATE + ". " : " (sans base embarquÃ©e : tout se tÃ©lÃ©charge au premier lancement via Â« â» Â»). "), HELP_LONG && /*#__PURE__*/React.createElement("span", null, "Agendas empilables : chaque agenda (Ã©tudiant, enseignant, salle, cours) se rÃ©duit avec â¾, se retire avec â, se crÃ©e avec Â« + Ajouter un agenda Â» puis se remplit ou se change via sa propre barre de recherche, qui propose toutes les ressources : cours, salle, enseignant ou groupe (option, TD, TP) ; l'onglet Ãtudiant affiche les groupes bien lisibles et cochables. Ãtoile â Ã  droite du titre : met cet agenda en favori â les agendas favoris s'ouvrent automatiquement Ã  l'ouverture de l'App (Ã  la place du dernier Ã©tat) et la liste de rappel sous Â« + Ajouter un agenda Â» permet de les rouvrir en un clic ; les groupes de TP d'une mÃªme promotion peuvent Ãªtre rangÃ©s sur leur propre ligne (ex. TVM : GrA/GrB en TD, Gr 1-3 en TP). FlÃ¨ches â¹ âº : semaine propre Ã  chaque agenda (sur mobile : balayer horizontalement la grille), le bouton Â« Aujourd'hui Â» ramÃ¨ne chaque agenda Ã  la semaine en cours. Â« PÃ©riode Â» : liste date Ã  date, lundiâvendredi. Badge n/N : position de la sÃ©ance dans la sÃ©rie du mÃªme cours pour ce groupe (masquÃ© si occurrence unique) ; Ã  cÃ´tÃ© de l'enseignant, p/q = sa position parmi SES sÃ©ances pour CE groupe (affichÃ© mÃªme en 1/1 : un enseignant qui ne fait qu'une sÃ©ance de la sÃ©rie le voit) et Â« total : z/T Â» = ses sÃ©ances du mÃªme type (TD/TP/CM) pour ce cours, tous groupes confondus. Compteurs masquÃ©s sur les Ã©valuations (devoirs, examens, soutenances), prÃ©sentations/infos/Ã©lections et sÃ©ances Ã  plusieurs enseignants (jurys, rÃ©unions). Badge Î dans l'entÃªte d'un agenda : changements ADE depuis la derniÃ¨re synchro qui le concernent, clic = dÃ©tail filtrÃ© (badges aussi sur le titre global et la liste des favoris). Dans la case, la ressource principale de l'agenda est en bas (groupes sur promo/cours, salle sur agenda salle). Pictogramme â  en surimpression dans le coin d'une case : salle virtuelle (ambre) ou enseignant virtuel (bleu, ressource ADE Â« VIRTUEL_MPH2 Â» posÃ©e sans personne) ; les deux = distanciel. Ãtudiant : cliquez plusieurs pastilles pour cumuler les groupes Â· un sous-groupe (ex. MA1) affiche aussi ses crÃ©neaux parents. Â« JournÃ©e Â» : ajuste la journÃ©e entiÃ¨re Ã  l'Ã©cran (mobile) ; Â« â» Rafr. Â» : tÃ©lÃ©charge en direct les flux ICS ADE, reconstruit les crÃ©neaux et les agendas enseignants (suppressions et dÃ©placements ADE pris en compte). Onglet Â« Flux Â» : bouton Â« Devoirs â¾ Â» par promotion, soutenances regroupÃ©es en sÃ©quences repliables (jours avec amplitude horaire). Flux personnels (type promo ou enseignant, votre lien ADE individuel admis), rechargÃ©s Ã  chaque ouverture ; rÃ©glages exportables/importables (flux, favoris, liens modifiÃ©s) pour les restaurer aprÃ¨s une rÃ©installation. Dans les suggestions, Â« â  Â» signale une ressource virtuelle (salle ambre, enseignant bleu) ; Â« Enseignant virtuel Â» et Â« Salle virtuelle Â» sont des agrÃ©gats qui listent d'un coup tous les crÃ©neaux des ressources virtuelles (recherche : Â« virtuel Â»), chaque ressource restant cliquable individuellement ; Â« Ã©quipement(s) virtuel(s) Â» en est exclu (CAO en prÃ©sentiel, pas du distanciel) et les salles n'affichent que les crÃ©neaux des groupes MP/CiTiSE. Boutons CM/TD/TP Â· Devoirs Â· Autres (dans la barre de l'agenda virtuel, Ã  cÃ´tÃ© du titre) : filtrent ces agendas â par dÃ©faut seuls les CM/TD/TP sont affichÃ©s (les plus critiques sans enseignant rÃ©el). Semaines de vacances universitaires (Toussaint, NoÃ«l, Hiver, Printemps, Ascension) : colonnes grisÃ©es + Ã©tiquette â ambrÃ©e. ", BILAN_ENABLED ? "Onglet Â« Bilan Â» : rÃ©alisÃ© ADE vs prÃ©visionnel pÃ´le physique par module ScoDoc (barres CM/TD/TP en heures, pastille d'Ã©cart vert â¤ 5 %, ambre â¤ 15 %, rouge au-delÃ , gris = rÃ©alisÃ© seul ou EDT non saisi ; clic = dÃ©tail par groupe et enseignant, info sans alerte ; Ã©valuations exclues ; CiTiSE Ã  part, prÃ©pa intÃ©grÃ©e). " : "", PERSO_ENABLED ? "Î£ SynthÃ¨se (favori enseignant, v4) : bilan personnel OSE â heures CM/TD/TP par semaine, rÃ©fÃ©rentiel et service statutaire rÃ©glables (384/192/libre), prorata, payÃ© estimÃ© et saturation, frise au curseur dÃ©plaÃ§able et cumul croissant, sur 2025-2026 (figÃ©e, validÃ©e paye) et l'annÃ©e en cours (recalculÃ©e Ã  chaque â»). Flux personnel Â« ens Â» (onglet Flux) : reconnu par son enseignant dominant, il devient la rÃ©fÃ©rence de son agenda et de sa SynthÃ¨se (rafraÃ®chi Ã  chaque ouverture et Ã  chaque â») ; ses crÃ©neaux hors dÃ©partement MP restent visibles (cases roses) et comptent dans la SynthÃ¨se, avec mention distincte et bouton Tout/MP pour les Ã©carter du calcul ou les rÃ©intÃ©grer (persistÃ©). " : "", REPLAN_ENABLED ? "Popup d'un crÃ©neau : Â« â Proposer un dÃ©placement Â» liste les fenÃªtres oÃ¹ groupes, enseignant et salle sont tous libres, au plus prÃ¨s du crÃ©neau d'origine (Â± 3 semaines, hors vacances, 8h00â18h30, au moins 1h de pause mÃ©ridienne prÃ©servÃ©e, jamais dans le passÃ©) â pour prÃ©parer un Ã©change entre collÃ¨gues (bouton copier la proposition ; indicative, la saisie officielle reste dans ADE). " : "", " Code couleur : vert = BUT1 Â· bleu = BUT2 Â· rouge = BUT3 Â· turquoise = CiTiSE Â· gris = autre/dÃ©partement Â· hachures = alternance (BUT2 ALT, BUT3 MAE alternants, TECHVIMAT, AVTECH) Â· liserÃ© plein = CM Â· liserÃ© gauche pointillÃ© = TD Â· contour en tiretÃ©s = TP Â· bordure violette = Ã©valuation (devoirs, examens, contrÃ´les, Â« 1/3 temps Â») Â· rose = crÃ©neau de COURS hors dÃ©partement MP (rÃ©unions, Ã©valuations et contraintes restent grises, jamais comptÃ©es). Titre sans TP/TD/CM : le type est dÃ©duit du nommage des groupes (promo entiÃ¨re = CM, groupe de TD = TD, sous-groupe de TP = TP), sauf Ã©vÃ©nements informatifs. Dans le dÃ©tail d'un crÃ©neau (clic), le titre du cours, la salle, le groupe ou l'enseignant sont cliquables pour ouvrir l'agenda correspondant : remplacer l'agenda courant ou celui du dessous, insÃ©rer dessous, ou ajouter Ã  la fin.")), replan && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]",
    onClick: () => setReplan(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-4",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-slate-100"
  }, "â DÃ©placer ce crÃ©neau"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setReplan(null),
    className: "text-slate-500 hover:text-slate-200 text-lg leading-none px-1"
  }, "â")), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-2"
  }, replan.sel.summary, replan.sel.location ? " Â· " + replan.sel.location : "", " â actuellement le ", fdt(decDT(replan.sel.start).getTime()), ". Propositions oÃ¹ les groupes et l'enseignant sont libres", replanTy === "TP" ? ", salle imposÃ©e conservÃ©e (dispo vÃ©rifiÃ©e)" : replanTy === "TD" ? " (salle non contrainte : Ã  voir au moment de la saisie)" : replanTy === "CM" && REPLAN_ROOMS[replan.promo] ? " ; une salle adaptÃ©e est proposÃ©e quand elle est libre (â  = indigo, Ã  confirmer)" : "", " (Â± 3 semaines, hors vacances, entre 8h00 et 18h30, avec au moins 1h de pause mÃ©ridienne prÃ©servÃ©e), les plus proches d'abord. La proposition est indicative : la saisie officielle reste dans ADE."), replan.items.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-amber-300"
  }, "Aucune fenÃªtre libre trouvÃ©e Ã  Â± 3 semaines pour ce crÃ©neau."), replan.items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: it.t,
    className: "flex items-center gap-1.5 py-1 border-t border-slate-800 first:border-t-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-200 flex-1 leading-snug"
  }, fdt(it.t), " â ", fmtHM(new Date(it.end)), it.room && /*#__PURE__*/React.createElement("span", {
    className: "text-slate-300"
  }, " Â· ", it.room, it.roomAlert && /*#__PURE__*/React.createElement("span", {
    className: "text-amber-300"
  }, " (â  indigo)")), it.roomNone && /*#__PURE__*/React.createElement("span", {
    className: "text-amber-300"
  }, " Â· heure seule : aucune salle adaptÃ©e libre"), replanTy === "TP" && replan.sel.location && /*#__PURE__*/React.createElement("span", {
    className: "text-slate-300"
  }, " Â· ", replan.sel.location), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-500"
  }, " Â· ", it.dd === 0 ? "mÃªme semaine" : (it.dd <= 7 ? "+" : "-") + it.dd + " j", it.score < 2 ? " Â· au plus prÃ¨s" : "")), /*#__PURE__*/React.createElement("button", {
    onClick: () => copyReplan(i),
    className: (replanCopied === i ? "text-emerald-300 " : "text-slate-400 hover:text-slate-200 ") + "text-[11px] font-medium bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg px-2 py-1 transition shrink-0"
  }, replanCopied === i ? "â copiÃ©" : "â§ copier"))))), devoirsWkRef && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]",
    onClick: () => setDevoirsWkRef(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-4",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 mb-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDevoirsWkRef(new Date(devoirsWkRef.getTime() - 7 * 864e5)),
    title: "Semaine prÃ©cÃ©dente",
    className: "text-slate-400 hover:text-slate-100 text-base leading-none px-1.5 py-0.5 hover:bg-slate-800 rounded transition"
  }, "â¹"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-slate-100 whitespace-nowrap"
  }, "Devoirs Â· sem. du ", devoirsWkRef.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short"
  }), " au ", new Date(devoirsWkRef.getTime() + 6 * 864e5).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDevoirsWkRef(new Date(devoirsWkRef.getTime() + 7 * 864e5)),
    title: "Semaine suivante",
    className: "text-slate-400 hover:text-slate-100 text-base leading-none px-1.5 py-0.5 hover:bg-slate-800 rounded transition"
  }, "âº"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-500 tabular-nums"
  }, devoirsWeekRows.length)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDevoirsWkRef(null),
    className: "text-slate-500 hover:text-slate-200 text-lg leading-none px-1"
  }, "â")), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-2"
  }, "Toutes promos confondues, regroupÃ©es par jour. Ãvaluations dÃ©tectÃ©es au titre (devoir, examen, contrÃ´le, interrogation, soutenance) ; Â« 1/3 temps Â» exclu. ÃcoulÃ©s en gris. Soutenances en sÃ©quence repliable (â¸). FlÃ¨ches â¹ âº : semaines voisines."), devoirsWeekRows.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500"
  }, "Aucune Ã©valuation cette semaine."), (() => {
    const wkByDay = {}; // regroupement par jour local â sous-entÃªte par jour, lignes dans l'ordre
    for (const r of devoirsWeekRows) {
      const d = r.t === "seq" ? r.evs[0].start : r.e.start;
      const k = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
      (wkByDay[k] = wkByDay[k] || []).push(r);
    }
    const dayKeys = Object.keys(wkByDay).sort((a, b) => {
      const f = r0 => r0.t === "seq" ? r0.evs[0].start.getTime() : r0.e.start.getTime();
      return f(wkByDay[a][0]) - f(wkByDay[b][0]);
    });
    return dayKeys.map(k => {
      const rs = wkByDay[k].slice().sort((a, b) => (a.t === "seq" ? a.evs[0].start : a.e.start) - (b.t === "seq" ? b.evs[0].start : b.e.start));
      const d0 = rs[0].t === "seq" ? rs[0].evs[0].start : rs[0].e.start;
      return /*#__PURE__*/React.createElement("div", {
        key: k,
        className: "mb-1.5"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-[11px] font-semibold text-amber-300 sticky top-0 bg-slate-900/95 py-0.5"
      }, d0.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long"
      })), rs.map((r, i) => r.t === "ev" ? /*#__PURE__*/React.createElement("div", {
        key: (r.e.id || "") + "@" + r.e.start.getTime() + "@" + i,
        className: "flex flex-wrap items-baseline gap-x-2 gap-y-0 py-1 border-t border-slate-800 " + (r.e.end.getTime() < today.getTime() ? "opacity-40" : "")
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] font-semibold whitespace-nowrap " + (devoirsWkChip129[r.p] || "text-teal-300")
      }, "â ", devoirsWkLabel129(r.p)), /*#__PURE__*/React.createElement("span", {
        className: "text-[11px] text-slate-400 whitespace-nowrap"
      }, fmtHM(r.e.start), "â", fmtHM(r.e.end)), /*#__PURE__*/React.createElement("span", {
        className: "text-[11.5px] text-slate-100 flex-1"
      }, r.e.summary), (r.e.groups || []).length > 0 && /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] text-slate-400"
      }, r.e.groups.join(", ")), r.e.location && /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] text-slate-500"
      }, r.e.location)) : (() => {
        const open = !!soutOpen[r.key];
        const past = r.evs[r.evs.length - 1].end.getTime() < today.getTime();
        return /*#__PURE__*/React.createElement("div", {
          key: "seq@" + r.key + "@" + i,
          className: "border-t border-slate-800 " + (past ? "opacity-40" : "")
        }, /*#__PURE__*/React.createElement("button", {
          onClick: () => setSoutOpen(o => ({
            ...o,
            [r.key]: !open
          })),
          className: "w-full flex flex-wrap items-baseline gap-x-2 gap-y-0 py-1 text-left hover:bg-slate-800/40 transition rounded px-0.5 -mx-0.5",
          title: open ? "Replier la sÃ©quence de soutenances" : "DÃ©plier : jours de soutenances"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-[10px] text-amber-300 font-semibold w-4 shrink-0"
        }, open ? "â¾" : "â¸"), /*#__PURE__*/React.createElement("span", {
          className: "text-[10px] font-semibold whitespace-nowrap " + (devoirsWkChip129[r.p] || "text-teal-300")
        }, "â ", devoirsWkLabel129(r.p)), /*#__PURE__*/React.createElement("span", {
          className: "text-[11px] text-slate-400 whitespace-nowrap"
        }, r.evs.length, " sÃ©ance", r.evs.length > 1 ? "s" : ""), /*#__PURE__*/React.createElement("span", {
          className: "text-[11px] text-slate-400 whitespace-nowrap"
        }, "(", fmtHM(r.evs[0].start), "â", fmtHM(r.evs[r.evs.length - 1].end), ")"), /*#__PURE__*/React.createElement("span", {
          className: "text-[11.5px] text-slate-100 flex-1"
        }, r.title), /*#__PURE__*/React.createElement("span", {
          className: "text-[9px] uppercase font-semibold rounded px-1 py-px bg-amber-500/15 text-amber-300 border border-amber-400/40"
        }, "Soutenances")), open && (() => {
          const seqByDay = {};
          for (const e of r.evs) {
            const kk = e.start.getFullYear() + "-" + e.start.getMonth() + "-" + e.start.getDate();
            (seqByDay[kk] = seqByDay[kk] || []).push(e);
          }
          return Object.keys(seqByDay).map(kk => {
            const de = seqByDay[kk].slice().sort((a, b) => a.start - b.start);
            const rooms = Array.from(new Set(de.map(e => (e.location || "").trim()).filter(Boolean)));
            return /*#__PURE__*/React.createElement("div", {
              key: kk,
              className: "flex flex-wrap items-baseline gap-x-2 gap-y-0 py-0.5 pl-5"
            }, /*#__PURE__*/React.createElement("span", {
              className: "text-[10px] font-semibold text-amber-300/80"
            }, de[0].start.toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "numeric",
              month: "numeric"
            })), /*#__PURE__*/React.createElement("span", {
              className: "text-[11px] text-slate-400 whitespace-nowrap"
            }, "(", fmtHM(de[0].start), "â", fmtHM(de[de.length - 1].end), ")"), rooms.length > 0 && /*#__PURE__*/React.createElement("span", {
              className: "text-[10px] text-slate-500"
            }, rooms.join(", ")), /*#__PURE__*/React.createElement("span", {
              className: "text-[9px] uppercase font-semibold rounded px-1 py-px bg-amber-500/15 text-amber-300 border border-amber-400/40"
            }, "Soutenances"));
          });
        })());
      })()));
    });
  })())), devoirsPromo && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]",
    onClick: () => setDevoirsPromo(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-4",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-slate-100"
  }, "Devoirs Â· ", PROMOS[devoirsPromo].label, PROMOS[devoirsPromo].sub ? " " + PROMOS[devoirsPromo].sub : ""), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDevoirsPromo(null),
    className: "text-slate-500 hover:text-slate-200 text-lg leading-none px-1"
  }, "â")), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mb-2"
  }, "Ãvaluations de l'annÃ©e dÃ©tectÃ©es au titre (devoir, examen, contrÃ´le, interrogation, soutenance). Â« 1/3 temps Â» exclu : info surveillance, pas un devoir. Les Ã©coulÃ©s sont en gris. Soutenances en sÃ©quence repliable (â¸) : dÃ©pliant = jours avec amplitude horaire (1reâderniÃ¨re sÃ©ance, salles du jour), dÃ©tail par crÃ©neau si les groupes diffÃ¨rent."), devoirsList.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500"
  }, "Aucun devoir trouvÃ©. Si la promo vient d'Ãªtre synchronisÃ©e, la liste se remplit au prochain Â« â» Â»."), devoirsRows.map((r, i) => r.t === "ev" ? /*#__PURE__*/React.createElement("div", {
    key: (r.e.id || "") + "@" + r.e.start.getTime() + "@" + i,
    className: "flex flex-wrap items-baseline gap-x-2 gap-y-0 py-1 border-t border-slate-800 first:border-t-0 " + (r.e.end.getTime() < today.getTime() ? "opacity-40" : "")
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-300 whitespace-nowrap"
  }, new Date(r.e.start).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "numeric"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-400 whitespace-nowrap"
  }, fmtHM(r.e.start), "â", fmtHM(r.e.end)), /*#__PURE__*/React.createElement("span", {
    className: "text-[11.5px] text-slate-100 flex-1"
  }, r.e.summary), (r.e.groups || []).length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400"
  }, r.e.groups.join(", ")), r.e.location && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-500"
  }, r.e.location)) : () => {
    const evs = r.evs;
    const open = !!soutOpen[r.key];
    const past = evs[evs.length - 1].end.getTime() < today.getTime();
    // par jour local : amplitude si le jour est homogÃ¨ne (mÃªme salleâªgroupes + contiguÃ¯tÃ©), sinon dÃ©tail par crÃ©neau
    const byDay = {};
    for (const e of evs) {
      const k = e.start.getFullYear() + "-" + e.start.getMonth() + "-" + e.start.getDate();
      (byDay[k] = byDay[k] || []).push(e);
    }
    const dayKeys = Object.keys(byDay).sort((a, b) => byDay[a][0].start - byDay[b][0].start);
    return /*#__PURE__*/React.createElement("div", {
      key: "seq@" + r.key + "@" + i,
      className: "border-t border-slate-800 first:border-t-0 " + (past ? "opacity-40" : "")
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setSoutOpen(o => ({
        ...o,
        [r.key]: !open
      })),
      className: "w-full flex flex-wrap items-baseline gap-x-2 gap-y-0 py-1 text-left hover:bg-slate-800/40 transition rounded px-0.5 -mx-0.5",
      title: open ? "Replier la sÃ©quence de soutenances" : "DÃ©plier : jours de soutenances"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-amber-300 font-semibold w-4 shrink-0"
    }, open ? "â¾" : "â¸"), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-slate-400 whitespace-nowrap"
    }, evs.length, " sÃ©ances Â· du ", new Date(evs[0].start).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "numeric"
    }), " au ", new Date(evs[evs.length - 1].start).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "numeric"
    })), /*#__PURE__*/React.createElement("span", {
      className: "text-[11.5px] text-slate-100 flex-1"
    }, r.title), /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] uppercase font-semibold rounded px-1 py-px bg-amber-500/15 text-amber-300 border border-amber-400/40"
    }, "Soutenances")), open && dayKeys.map(k => {
      const de = byDay[k].slice().sort((a, b) => a.start - b.start);
      // suite 83 : amplitude du JOUR si les GROUPES sont homogÃ¨nes (mÃªmes
      // Ã©tudiants toute la journÃ©e â ex. AVTECH, salles C101/C207 incluses) ;
      // dÃ©tail par crÃ©neau si les groupes diffÃ¨rent (ex. PTUT : TP EA1 vs MB3).
      const sigOf = e => (e.groups || []).slice().sort().join(",");
      const homo = de.every(e => sigOf(e) === sigOf(de[0]));
      if (homo) {
        const rooms = Array.from(new Set(de.map(e => (e.location || "").trim()).filter(Boolean)));
        return /*#__PURE__*/React.createElement("div", {
          key: k,
          className: "flex flex-wrap items-baseline gap-x-2 gap-y-0 py-0.5 pl-5"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-[11px] text-slate-300 whitespace-nowrap"
        }, new Date(de[0].start).toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "numeric"
        })), /*#__PURE__*/React.createElement("span", {
          className: "text-[11px] text-slate-400 whitespace-nowrap"
        }, "(", fmtHM(de[0].start), "â", fmtHM(de[de.length - 1].end), ")"), rooms.length > 0 && /*#__PURE__*/React.createElement("span", {
          className: "text-[10px] text-slate-500"
        }, rooms.join(", ")), /*#__PURE__*/React.createElement("span", {
          className: "text-[10px] text-slate-500"
        }, de.length, " crÃ©neau", de.length > 1 ? "x" : ""));
      }
      return de.map((e, j) => /*#__PURE__*/React.createElement("div", {
        key: k + "@" + j,
        className: "flex flex-wrap items-baseline gap-x-2 gap-y-0 py-0.5 pl-5"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-[11px] text-slate-300 whitespace-nowrap"
      }, new Date(e.start).toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "numeric"
      })), /*#__PURE__*/React.createElement("span", {
        className: "text-[11px] text-slate-400 whitespace-nowrap"
      }, fmtHM(e.start), "â", fmtHM(e.end)), (e.groups || []).length > 0 && /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] text-slate-400"
      }, e.groups.join(", ")), e.location && /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] text-slate-500"
      }, e.location)));
    }));
  }))), showDiff && diff && diff.items.length > 0 && (() => {
    // Suite 79 : vue FILTRÃE sur un agenda favori (badge Î de la liste des favoris)
    // ou vue globale (badge Î de l'entÃªte, comportement suite 71 conservÃ©).
    // Suite 86 : lecture en sous-types â le global dit Â« ce qui a changÃ© dans le
    // dÃ©partement Â», le filtrÃ© dit Â« ce qui change pour CET agenda Â» (gagnÃ©/perdu).
    const dItems = diffFilter ? diff.items.filter(it => diffMatch(it, diffFilter)) : diff.items;
    const byT = (x, y) => x.t - y.t;
    const adds = dItems.filter(x => x.k === "add").sort(byT);
    const dels = dItems.filter(x => x.k === "del").sort(byT);
    const mRoom = dItems.filter(x => diffModType(x) === "room").sort(byT);
    const mEns = dItems.filter(x => diffModType(x) === "ens").sort(byT);
    const mMove = dItems.filter(x => x.k === "mod" && (diffModType(x) === "move" || diffModType(x) === "legacy")).sort(byT);
    const dA = adds.length,
      dD = dels.length;
    const nGain = dItems.filter(x => diffGainLoss(x, diffFilter) === "gain").length;
    const nLoss = dItems.filter(x => diffGainLoss(x, diffFilter) === "loss").length;
    const povAgenda = diffFilter && (diffFilter.kind === "teacher" || diffFilter.kind === "room");
    // Suite 86 : ligne compacte â promo Â· horaire (ou ancien â nouveau si dÃ©placÃ©) Â·
    // titre Â· SEGMENTS CHANGÃS UNIQUEMENT (plus de Â« 8:30 â 8:30 Â»). Items legacy
    // (stockÃ©s avant la suite 86) : ancien format conservÃ©.
    const dOnly = t => new Date(t).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "numeric"
    });
    const hOnly = t => fmtHM(new Date(t));
    const seg = it => {
      const lab = PROMOS[it.p] && PROMOS[it.p].label || it.p;
      if (it.k !== "mod" || it.os === undefined) return lab + " Â· " + it.s + " Â· " + (it.k === "mod" ? fdt(it.ot) + " â " + fdt(it.t) : fdt(it.t)) + (it.k === "mod" && it.ol && it.ol !== it.l ? " Â· " + it.ol + " â " + it.l : it.l ? " Â· " + it.l : "");
      const tCh = (it.ot || it.t) !== it.t;
      const parts = [lab, tCh ? fdt(it.ot) + " â " + fdt(it.t) : dOnly(it.ot) + " Â· " + hOnly(it.ot) + "â" + hOnly(it.e || it.t)];
      if ((it.os || "") !== (it.s || "")) parts.push((it.os || "â") + " â " + it.s);else parts.push(it.s);
      if ((it.ol || "") !== (it.l || "")) parts.push((it.ol || "â") + " â " + (it.l || "â"));
      if ((it.otc || "") !== (it.tc || "")) parts.push((it.otc || "â") + " â " + (it.tc || "â"));
      return parts.join(" Â· ");
    };
    const badgeOf = it => {
      const q = diffGainLoss(it, diffFilter);
      if (it.k === "add") return ["+ ajoutÃ©", "add"];
      if (it.k === "del") return ["â supprimÃ©", "del"];
      if (q === "gain") return ["+ gagnÃ©", "add"];
      if (q === "loss") return ["â perdu", "del"];
      if (diffModType(it) === "ens") return ["Î ens.", "mod"];
      return ["Î modifiÃ©", "mod"];
    };
    const row = (it, i) => {
      const [bl, bk] = badgeOf(it);
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        className: "flex items-start gap-1.5 py-0.5 border-t border-slate-800 first:border-t-0"
      }, /*#__PURE__*/React.createElement("span", {
        className: "text-[10px] font-semibold rounded px-1 py-0.5 border shrink-0 " + (bk === "add" ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/40" : bk === "del" ? "bg-rose-500/15 text-rose-300 border-rose-400/40" : "bg-amber-500/15 text-amber-300 border-amber-400/40")
      }, bl), /*#__PURE__*/React.createElement("span", {
        className: "text-[11px] text-slate-300 leading-snug"
      }, seg(it)));
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50",
      onClick: () => setShowDiff(false)
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-4",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-1"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm font-semibold text-slate-100"
    }, "Changements depuis ta derniÃ¨re synchro", diffFilter ? " Â· " + favLabel(diffFilter) : ""), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowDiff(false),
      className: "text-slate-500 hover:text-slate-200 text-lg leading-none px-1"
    }, "â")), /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] text-slate-500 mb-2"
    }, DATA_DATE ? "MAJ embarquÃ©e du " + DATA_DATE + " Â· " : "", "dÃ©tection au dernier Â« â» Â» (comparÃ© aux donnÃ©es affichÃ©es avant la synchro)", diffFilter ? ", filtrÃ© sur cet agenda" : "", " : ", dA, " ajoutÃ©(s) Â· ", mRoom.length, " salle Â· ", mEns.length, " ens. Â· ", mMove.length, " dÃ©placÃ©(s) Â· ", dD, " supprimÃ©(s)", povAgenda ? " Â· pour cet agenda : " + nGain + " gagnÃ©(s), " + nLoss + " perdu(s)" : "", !diffFilter && (diff.counts ? diff.counts.add + diff.counts.mod + diff.counts.del : diff.items.length) > diff.items.length ? " (" + diff.items.length + " premiers affichÃ©s)" : "", ". Les crÃ©neaux supprimÃ©s cÃ´tÃ© ADE ne s'affichent plus dans les grilles."), adds.map(row), mRoom.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "border-t border-slate-800"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setDiffRoomOpen(!diffRoomOpen),
      className: "w-full flex items-center gap-1.5 text-left py-0.5 text-amber-300 hover:text-amber-200 transition"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-semibold rounded px-1 py-0.5 border shrink-0 bg-amber-500/15 text-amber-300 border-amber-400/40"
    }, "Î salle"), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px]"
    }, mRoom.length, " changement", mRoom.length > 1 ? "s" : "", " de salle ", diffRoomOpen ? "â¾" : "â¸")), diffRoomOpen && mRoom.map(row)), mEns.map(row), mMove.map(row), dels.map(row)));
  })(), PERSO_ENABLED && persoOpen && (() => {
    // SUITE 108 : multi-collÃ¨gues â la SynthÃ¨se suit l'enseignant du FAVORI qui l'a
    // ouverte (persoT108) : crÃ©neaux depuis teachers[persoT108], saisies depuis les
    // clÃ©s prÃ©fixÃ©es. SUITE 137 : l'onglet Â« 2025-2026 figÃ©e Â» est alimentÃ© par
    // l'ARCHIVE D'ANNÃE importÃ©e par chacun (aucune donnÃ©e embarquÃ©e) ; sans
    // archive, un bandeau propose l'import du fichier JSON.
    const arch137 = archLoad137(persoT108);
    if (persoTLoading108) {
      // SUITE 108 : rechargement des saisies de l enseignant en cours â ni les siennes ni celles d autrui ne s affichent
      return /*#__PURE__*/React.createElement("div", {
        className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 z-50"
      }, /*#__PURE__*/React.createElement("div", {
        className: "bg-slate-900 border border-slate-700 rounded-2xl p-4 max-w-3xl w-full shadow-2xl"
      }, /*#__PURE__*/React.createElement("h2", {
        className: "font-bold text-base mb-2"
      }, "Î£ SynthÃ¨se personnelle Â· ", persoT108), /*#__PURE__*/React.createElement("p", {
        className: "text-[11px] text-slate-400"
      }, "Chargement des saisies de cet enseignantâ¦")));
    }
    const liveEvs94 = (teachers[persoT108] || []).map(e => ({
      ...e,
      start: decDT(e.start),
      end: decDT(e.end),
      groups: typeof e.groups === "string" ? e.groups ? e.groups.split(",") : [] : e.groups || []
    }));
    const refDyn99 = persoRefLines.reduce((a, l) => a + (l.h || 0), 0); // SUITE 99 : total des lignes OSE Ã©ditables (annÃ©e en cours)
    const refEff112 = refDyn99 > 0 ? refDyn99 : persoRefApprox112 > 0 ? persoRefApprox112 : 0; // SUITE 112 : prioritÃ© LIGNES OSE > valeur approchÃ©e ; sinon hypothÃ¨se 0 (remplace le masquage suite 108 â spec recette : tout s'affiche, badge dÃ©diÃ©)
    const refAvail108 = true; // SUITE 112 : rien fourni = hypothÃ¨se 0 + badge Â« calculÃ© avec rÃ©fÃ©rentiel Ã  zÃ©ro Â», PLUS aucune carte masquÃ©e
    // SUITE 108 : import OSE Â« page collÃ©e Â» â parse local + garde-fous de complÃ©tude
    // (marqueurs dÃ©but/fin, nb de lignes, auto-contrÃ´le). Un collÃ© Â« ÃCHEC Â» ne devient
    // JAMAIS rÃ©fÃ©rence sans intervention humaine (bouton Utiliser dÃ©sactivÃ©).
    const oseParse108 = () => {
      const t = oseBuf108;
      if (!t || !t.trim()) {
        setOseRes108(null);
        return;
      }
      const type = oseDetect108(t);
      const res = type === "ref" ? parseOSEReferentiel108(t) : type === "ens" ? parseOSEnseignements108(t) : null;
      setOseRes108({
        type,
        res,
        complete: oseComplete108(t)
      });
    };
    const oseCanUse108 = r => !!(r && r.type && r.res && r.res.check !== "ÃCHEC");
    const oseApply108 = () => {
      // action selon la page dÃ©tectÃ©e ET l onglet courant
      if (!oseCanUse108(oseRes108)) return;
      const {
        type,
        res
      } = oseRes108;
      if (persoTab !== "fig") {
        if (type === "ref") {
          // page rÃ©fÃ©rentiel â remplace les lignes OSE du rÃ©fÃ©rentiel (niveau 1 des 3 niveaux)
          const nl = Object.keys(res.byFn108).map(fn => ({
            lib: fn,
            h: res.byFn108[fn]
          }));
          setPersoRefLines(nl);
          store(persoKeyOf(persoT108, "ref-lines"), JSON.stringify(nl));
          setPersoRefOpen(true);
          setPersoOseOpen108(false);
          setOseBuf108("");
        } else {
          // page enseignements â prÃ©visionnel OSE de l'annÃ©e en cours (rÃ©fÃ©rence collÃ©e)
          oseStoreEns108(res.rows.map(r => ({
            lib: (r.formation ? r.formation + " Â· " : "") + r.lib,
            periode: r.periode,
            cm: r.cm,
            td: r.td,
            tp: r.tp
          })));
          setPersoOseOpen108(false);
          setOseBuf108("");
        }
      } else {
        // onglet FIGÃ (collÃ¨gue) : bilan figÃ©-par-OSE de l'annÃ©e sans ADE
        oseStoreFig108(type, type === "ref" ? {
          rows: res.rows,
          tot: res.tot
        } : {
          rows: res.rows,
          tot: res.tot,
          cm: res.tot.cm,
          td: res.tot.td,
          tp: res.tot.tp
        });
        setPersoOseOpen108(false);
        setOseBuf108("");
      }
    };
    const oseBtnLabel108 = persoTab === "fig" ? "Utiliser comme bilan figÃ© 2025-2026" : oseRes108 && oseRes108.type === "ref" ? "Remplacer les lignes du rÃ©fÃ©rentiel" : "Utiliser comme prÃ©visionnel de l'annÃ©e en cours";
    const osePanel108 = persoOseOpen108 ? /*#__PURE__*/React.createElement("div", {
      className: "absolute left-0 right-0 top-full mt-1 z-40 bg-slate-900/95 backdrop-blur border border-slate-600 rounded-xl p-2 shadow-2xl"
    }, " ", /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-1"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] uppercase tracking-wide text-slate-400 font-semibold"
    }, "Import OSE â page collÃ©e (derriÃ¨re le CAS)"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setPersoOseOpen108(false);
        setOseRes108(null);
      },
      title: "Refermer l import",
      className: "text-slate-500 hover:text-slate-200 text-base leading-none px-1"
    }, "â")), /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] text-slate-400 mb-1"
    }, "Sur la page OSE (", persoTab === "fig" ? "Enseignements rÃ©alisÃ©s ou RÃ©fÃ©rentiel de l'annÃ©e figÃ©e" : "Enseignements prÃ©visionnels ou RÃ©fÃ©rentiel prÃ©visionnel", "), ne sÃ©lectionne rien : copie toute la page (Ctrl+A puis Ctrl+C) et colle ici â tout ce qui n est pas un tableau de service est ignorÃ©."), /*#__PURE__*/React.createElement("textarea", {
      value: oseBuf108,
      onChange: ev => setOseBuf108(ev.target.value),
      placeholder: "Coller ici la page OSE (Ctrl+V)â¦",
      rows: 4,
      className: "w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 font-mono"
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-1.5 mt-1"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setOseBuf108(""),
      title: "Vider le champ",
      className: "text-[10px] font-medium bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-500 rounded px-1.5 py-0.5"
    }, "Vider"), /*#__PURE__*/React.createElement("button", {
      onClick: oseParse108,
      title: "Analyser le collÃ© sans rien enregistrer",
      className: "text-[10px] font-medium bg-slate-900 text-indigo-300 border border-indigo-400/40 hover:border-indigo-300 rounded px-1.5 py-0.5"
    }, "Analyser"), oseRes108 && oseCanUse108(oseRes108) && /*#__PURE__*/React.createElement("button", {
      onClick: oseApply108,
      title: oseBtnLabel108 + " â enregistrÃ© sur cet appareil pour " + persoT108,
      className: "text-[10px] font-medium bg-slate-900 text-emerald-300 border border-emerald-400/40 hover:border-emerald-300 rounded px-1.5 py-0.5"
    }, oseBtnLabel108), oseBuf108 && /*#__PURE__*/React.createElement("span", {
      className: "ml-auto text-[10px] font-semibold rounded px-1.5 py-0.5 border " + (oseRes108 && oseRes108.res && oseRes108.res.check === "OK" ? "text-emerald-300 border-emerald-400/40" : oseRes108 && oseRes108.res && oseRes108.res.check === "ÃCHEC" ? "text-rose-300 border-rose-400/40" : "text-slate-500 border-slate-700")
    }, oseRes108 ? (oseRes108.type === "ref" ? "page RÃ©fÃ©rentiel" : oseRes108.type === "ens" ? "page Enseignements" : "page non reconnue") + " Â· " + (oseRes108.res ? oseRes108.res.check : "?") : "Ã  analyser")), oseRes108 && oseRes108.res && oseRes108.res.check === "ÃCHEC" && /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] text-rose-300 mt-1"
    }, "â  Auto-contrÃ´le ÃCHEC : le recalcul ne retrouve PAS les totaux officiels de la page (sÃ©lection probablement incomplÃ¨te ou mÃ©langÃ©e). Recolle la page ENTIÃRE (Ctrl+A Ctrl+C) â ce collÃ© ne peut pas devenir une rÃ©fÃ©rence."), oseRes108 && oseRes108.type && oseRes108.res && /*#__PURE__*/React.createElement("div", {
      className: "mt-1.5 border-t border-slate-700/60 pt-1.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-lg font-bold text-slate-100 tabular-nums leading-none"
    }, oseRes108.res.rows ? oseRes108.res.rows.length : Object.keys(oseRes108.res.byFn108 || {}).length), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-slate-400 leading-tight"
    }, "lignes reconnues â vÃ©rifie Ã  l Åil contre la page OSE"), /*#__PURE__*/React.createElement("span", {
      className: "ml-auto text-[10px] rounded px-1.5 py-0.5 border " + (oseRes108.complete.full ? "text-emerald-300 border-emerald-400/40" : "text-amber-300 border-amber-400/40"),
      title: "Marqueur dÃ©but de tableau : " + (oseRes108.complete.debut ? "dÃ©tectÃ©" : "ABSENT") + " Â· marqueur fin (totaux officiels) : " + (oseRes108.complete.fin ? "dÃ©tectÃ©" : "ABSENT")
    }, oseRes108.complete.full ? "sÃ©lection complÃ¨te" : "sÃ©lection probablement incomplÃ¨te")), !oseRes108.complete.full && /*#__PURE__*/React.createElement©, aide au remplissage) â SUITE 137 : depuis l ARCHIVE importÃ©e
        if (persoTab === "fig" || !arch137) return null;
        const r104 = (arch137.refItems || []).find(r => r.lib === l.lib);
        const dr104 = r104 ? (l.h || 0) - r104.h : null;
        return /*#__PURE__*/React.createElement("span", {
          className: "w-[4.5rem] shrink-0 text-right text-[9.5px] tabular-nums",
          title: "MÃªme ligne au rÃ©fÃ©rentiel 2025-2026 (figÃ©, validÃ© paye)" + (r104 ? " : " + r104.h + " h Ã©qTD" : " â ligne absente du rÃ©fÃ©rentiel 25-26")
        }, r104 ? "25-26 : " + (r104.h % 1 ? r104.h.toFixed(1) : r104.h) + " h" : "25-26 : â", dr104 ? /*#__PURE__*/React.createElement("b", {
          className: dr104 > 0 ? " text-emerald-300" : " text-amber-300"
        }, " (" + (dr104 > 0 ? "+" : "") + (dr104 % 1 ? dr104.toFixed(1) : dr104) + ")") : null);
      })(), persoTab !== "fig" ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
        type: "text",
        value: l.lib,
        onChange: ev => edit99(i, "lib", ev.target.value),
        className: "flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-100"
      }), /*#__PURE__*/React.createElement("input", {
        type: "number",
        min: "0",
        step: "0.5",
        value: l.h,
        onChange: ev => {
          const n = Number(ev.target.value);
          if (isFinite(n) && n >= 0) edit99(i, "h", n);
        },
        title: "Heures Ã©qTD de cette ligne",
        className: "w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-100 tabular-nums"
      }), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          const nl = persoRefLines.filter((_, j) => j !== i);
          setPersoRefLines(nl);
          store(persoKeyOf(persoT108, "ref-lines"), JSON.stringify(nl));
        },
        title: "Supprimer cette ligne",
        className: "text-slate-500 hover:text-rose-300 text-sm leading-none px-1"
      }, "â")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
        className: "flex-1 min-w-0 truncate text-[11px] text-slate-300",
        title: l.lib
      }, l.lib), /*#__PURE__*/React.createElement("span", {
        className: "text-[11px] text-slate-400 tabular-nums"
      }, l.h % 1 ? l.h.toFixed(1) : l.h, " h"))))), /*#__PURE__*/React.createElement("p", {
        className: "text-[10px] text-slate-400 mt-1 text-right tabular-nums"
      }, "Total : ", /*#__PURE__*/React.createElement("b", {
        className: "text-slate-200"
      }, tot99 % 1 ? tot99.toFixed(1) : tot99, " h Ã©qTD"), persoTab !== "fig" ? " â socle actif dÃ¨s le 1er septembre, comptÃ© dans E et le payÃ©" : "")));
    })()), /*#__PURE__*/React.createElement("span", {
      className: "flex items-center gap-1 text-[10.5px] text-slate-400"
    }, "Service :", /*#__PURE__*/React.createElement("select", {
      value: persoSvcCustom ? "autre" : String(persoService),
      onChange: ev => {
        const v = ev.target.value;
        if (v === "384" || v === "192") {
          const n = Number(v);
          setPersoService(n);
          setPersoSvcCustom(false);
          store(persoKeyOf(persoT108, "service"), n);
        } else if (v === "autre") setPersoSvcCustom(true);
      },
      title: "Service statutaire en Ã©qTD (384 par dÃ©faut, 192 pour un demi-poste, ou libre) â la rÃ¨gle des heures complÃ©mentaires reste identique",
      className: "bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100"
    }, /*#__PURE__*/React.createElement("option", {
      value: "384"
    }, "384 h"), /*#__PURE__*/React.createElement("option", {
      value: "192"
    }, "192 h"), /*#__PURE__*/React.createElement("option", {
      value: "autre"
    }, "Autreâ¦")), persoSvcCustom && /*#__PURE__*/React.createElement("input", {
      type: "number",
      min: "1",
      step: "1",
      value: persoService,
      onChange: ev => {
        const n = Number(ev.target.value);
        if (isFinite(n) && n >= 1) {
          setPersoService(n);
          store(persoKeyOf(persoT108, "service"), n);
        }
      },
      title: "Service statutaire libre (h Ã©qTD)",
      className: "w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100"
    })), persoTab !== "fig" &&
    /*#__PURE__*/
    // SUITE 99 : bouton Hors MP dÃ©placÃ© DANS la ligne des rÃ©glages (Ã  droite du service 384 h) â il se superposait Ã  l'histogramme
    React.createElement("button", {
      onClick: () => {
        setMpOnly(!mpOnly);
        store("edt2-mp-only", mpOnly ? 0 : 1);
      },
      title: "Tout = tous les crÃ©neaux, y compris hors dÃ©partement MP (roses dans l'agenda) Â· MP = seuls les crÃ©neaux du dÃ©partement MP. MÃªme rÃ©glage pour l'agenda enseignant (persistÃ©).",
      className: "ml-auto text-[10px] font-medium rounded px-1.5 py-0.5 border transition " + (mpOnly ? "bg-slate-100 text-slate-900 border-slate-100" : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500")
    }, "Hors MP : ", mpOnly ? "exclus" : "comptÃ©s")), persoTab !== "promo" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "flex items-end gap-[2px] h-20 mb-1"
    }, Y.WEEKS.map(w => /*#__PURE__*/React.createElement("div", {
      key: w.i,
      onClick: () => setPersoWk(w.i),
      title: "Semaine " + (w.i + 1) + " Â· " + wBar(w.i),
      className: "relative flex-1 cursor-pointer rounded-t-sm " + (w.i === wi ? "ring-2 ring-indigo-300 bg-slate-700/60" : "hover:bg-slate-800/60"),
      style: {
        height: "100%"
      }
    }, w.tot > 0 && /*#__PURE__*/React.createElement("div", {
      className: "w-full flex flex-col justify-end",
      style: {
        height: Math.max(w.tot / Y.maxWeek, 0.06) * 100 + "%"
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-rose-400/80",
      style: {
        height: 100 * w.tp / w.tot + "%"
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "bg-sky-400/80",
      style: {
        height: 100 * w.td / w.tot + "%"
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "bg-indigo-400/80",
      style: {
        height: 100 * w.cm / w.tot + "%"
      }
    })), satW === w.i && /*#__PURE__*/React.createElement("span", {
      className: "absolute -top-0.5 left-0 right-0 text-center text-[9px] text-amber-300 leading-none",
      title: "â service " + persoService + " Ã©qTD cours + rÃ©fÃ©rentiel atteints ici (" + wBar(w.i) + ")"
    }, "â"), satC === w.i && /*#__PURE__*/React.createElement("span", {
      className: "absolute bottom-0 left-0 right-0 text-center text-[9px] text-sky-300 leading-none",
      title: "â " + persoService + " Ã©qTD avec les cours SEULS atteints ici (" + wBar(w.i) + ")"
    }, "â")))), /*#__PURE__*/React.createElement("div", {
      className: "relative h-6 cursor-ew-resize select-none",
      style: {
        touchAction: "none"
      },
      onPointerDown: ev => {
        try {
          ev.currentTarget.setPointerCapture(ev.pointerId);
        } catch (x) {}
        const r = ev.currentTarget.getBoundingClientRect();
        setPersoWk(Math.max(0, Math.min(Y.NW - 1, Math.floor((ev.clientX - r.left) / r.width * Y.NW))));
      },
      onPointerMove: ev => {
        if (ev.buttons) {
          const r = ev.currentTarget.getBoundingClientRect();
          setPersoWk(Math.max(0, Math.min(Y.NW - 1, Math.floor((ev.clientX - r.left) / r.width * Y.NW))));
        }
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-700 rounded-full"
    }), Y.WEEKS.map(w => w.date.getDate() <= 7 ? /*#__PURE__*/React.createElement("span", {
      key: w.i,
      className: "absolute top-1/2 -mt-1.5 w-px h-3 bg-slate-600",
      style: {
        left: (w.i + 0.5) / Y.NW * 100 + "%"
      }
    }) : null), /*#__PURE__*/React.createElement("div", {
      className: "absolute top-1/2 w-4 h-4 -mt-2 -ml-2 rounded-full bg-indigo-400 border-2 border-slate-100 shadow pointer-events-none",
      style: {
        left: (wi + 0.5) / Y.NW * 100 + "%"
      },
      title: "Curseur : semaine " + (wi + 1) + " â glisse le point le long du rail"
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex justify-between text-[9px] text-slate-500 -mt-1 mb-2"
    }, /*#__PURE__*/React.createElement("span", null, wLbl(0)), /*#__PURE__*/React.createElement("span", null, wLbl(Y.NW - 1))), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9.5px] text-slate-500 mb-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "flex items-center gap-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-block w-2 h-2 rounded-sm bg-indigo-400/80"
    }), "CM"), /*#__PURE__*/React.createElement("span", {
      className: "flex items-center gap-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-block w-2 h-2 rounded-sm bg-sky-400/80"
    }), "TD"), /*#__PURE__*/React.createElement("span", {
      className: "flex items-center gap-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-block w-2 h-2 rounded-sm bg-rose-400/80"
    }), "TP"), /*#__PURE__*/React.createElement("span", {
      className: "text-amber-300"
    }, "â ambre : service ", persoService, " Ã©qTD atteints, cours + rÃ©fÃ©rentiel", satW >= 0 ? " (" + wLbl(satW) + ")" : ""), /*#__PURE__*/React.createElement("span", {
      className: "text-sky-300"
    }, "â bleue : service ", persoService, " Ã©qTD en cours seuls", satC >= 0 ? " (" + wLbl(satC) + ")" : "")), persoTab === "dyn" && refEff112 === 0 && /*#__PURE__*/React.createElement("p", {
      className: "mb-2 text-[11px] font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/40 rounded-lg px-2.5 py-1"
    }, "â  SynthÃ¨se calculÃ©e avec rÃ©fÃ©rentiel Ã  zÃ©ro â pose une valeur approchÃ©e dans le champ Â« â rÃ©f. Â» (ligne RÃ©fÃ©rentiel), ou saisis/importe les lignes OSE : les cases et le graphe s'ajustent immÃ©diatement."), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-2 mb-3"
    }, card("Au curseur", "S" + (wi + 1) + " Â· " + wLbl(wi), fmtHrs(Y.WEEKS[wi].tot) + " cette semaine Â· " + promos.length + " promos"), card("Prorata fait/service", fmt2(snap.E / (persoService || 1) * 100) + " %", "seuil " + persoService + " Ã©qTD Â· " + (snap.saturated ? "couvert â" : "non couvert"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 mb-3 overflow-x-auto"
    }, /*#__PURE__*/React.createElement("table", {
      className: "w-full text-[11px] tabular-nums"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      className: "text-[9.5px] uppercase tracking-wide text-slate-400"
    }, /*#__PURE__*/React.createElement("th", {
      className: "text-left font-semibold py-0.5 pr-2"
    }, "Devant les Ã©tudiants"), /*#__PURE__*/React.createElement("th", {
      className: "text-right font-semibold py-0.5 px-1"
    }, "Au curseur"), /*#__PURE__*/React.createElement("th", {
      className: "text-right font-semibold py-0.5 px-1"
    }, "Fin d'annÃ©e"))), /*#__PURE__*/React.createElement("tbody", null, (() => {
      // SUITE 115 : cf = cumuls annuels (fin d'annÃ©e) pour la ligne heures ; hc = perte HC (Ã©qTD â payÃ© ens.)
      const cf115 = Y.CUM[Y.NW - 1];
      const hcCur115 = Math.round((snap.ensTD114 - snap.paidCours) * 100) / 100,
        hcFin115 = Math.round((full.ensTD114 - full.paidCours) * 100) / 100;
      const row115 = (label, vCur, sCur, vFin, sFin) => /*#__PURE__*/React.createElement("tr", {
        className: "border-t border-slate-700/60"
      }, /*#__PURE__*/React.createElement("td", {
        className: "py-1 pr-2 font-semibold text-slate-300 align-top"
      }, label), /*#__PURE__*/React.createElement("td", {
        className: "py-1 px-1 text-right align-top"
      }, /*#__PURE__*/React.createElement("span", {
        className: "font-bold text-slate-100"
      }, vCur), sCur ? /*#__PURE__*/React.createElement("span", {
        className: "block text-[9px] text-slate-500 leading-tight"
      }, sCur) : null), /*#__PURE__*/React.createElement("td", {
        className: "py-1 px-1 text-right align-top"
      }, /*#__PURE__*/React.createElement("span", {
        className: "font-bold text-slate-100"
      }, vFin), sFin ? /*#__PURE__*/React.createElement("span", {
        className: "block text-[9px] text-slate-500 leading-tight"
      }, sFin) : null));
      return /*#__PURE__*/React.createElement(React.Fragment, null, row115("Heures (1/1/1)", fmtHrs(c.cm + c.td + c.tp), "CM " + fmtHrs(c.cm) + " Â· TD " + fmtHrs(c.td) + " Â· TP " + fmtHrs(c.tp), fmtHrs(cf115.cm + cf115.td + cf115.tp), "CM " + fmtHrs(cf115.cm) + " Â· TD " + fmtHrs(cf115.td) + " Â· TP " + fmtHrs(cf115.tp)), row115("ÃqTD enseignement (1,5/1/1)", fmt2(snap.ensTD114) + " Ã©qTD", "hors rÃ©f. â TP comptÃ©s Ã1", fmt2(full.ensTD114) + " Ã©qTD", "tout Ã  Ã1, perte HC non dÃ©duite"), row115("PayÃ© enseignement", fmt2(snap.paidCours) + " Ã©qTD", "1 h TP supp. â " + fmt2(snap.tpRate) + " Ã©qTD Â· HC â" + fmt2(hcCur115), fmt2(full.paidCours) + " Ã©qTD", "HC â" + fmt2(hcFin115) + " (0,34 Ã TP hors service lissÃ©s)"), row115("ÃqTD ens. + rÃ©fÃ©rentiel", fmt2(snap.E) + " Ã©qTD", "ens. " + fmt2(snap.ensTD114) + " + rÃ©f. " + fmt2(snap.ref), fmt2(full.E) + " Ã©qTD", "ens. " + fmt2(full.ensTD114) + " + rÃ©f. " + fmt2(full.ref)), row115("PayÃ© ens. + rÃ©fÃ©rentiel", fmt2(snap.paid) + " Ã©qTD", "payÃ© ens. " + fmt2(snap.paidCours) + " + rÃ©f. " + fmt2(snap.ref), fmt2(full.paid) + " Ã©qTD", "payÃ© ens. " + fmt2(full.paidCours) + " + rÃ©f. " + fmt2(full.ref) + (prevOse113 !== null ? " Â· prev OSE : " + prevOse113 : "")));
    })()))), persoOseEns && persoTab === "dyn" && (() => {
      // SUITE 108 : prÃ©visionnel OSE de l'annÃ©e en cours COLLÃ (rÃ©fÃ©rence validÃ©e en novembre) â bilan, lignes Ã©ditables, supprimable
      const rows108 = persoOseEns.rows || [];
      const t108 = rows108.reduce((a, r) => ({
        cm: a.cm + (r.cm || 0),
        td: a.td + (r.td || 0),
        tp: a.tp + (r.tp || 0)
      }), {
        cm: 0,
        td: 0,
        tp: 0
      });
      const eq108 = Math.round((t108.cm * 1.5 + t108.td + t108.tp) * 100) / 100;
      const editOse108 = (i, k, v) => {
        const nr = rows108.map((r, j) => j === i ? {
          ...r,
          [k]: v
        } : r);
        oseStoreEns108(nr);
      };
      return /*#__PURE__*/React.createElement("div", {
        className: "bg-slate-800/40 border border-slate-700/60 rounded-xl p-2.5 mb-3"
      }, " ", /*#__PURE__*/React.createElement("div", {
        className: "flex items-center justify-between gap-2 mb-1"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-[10px] uppercase tracking-wide text-slate-400 font-semibold"
      }, "PrÃ©visionnel OSE Â· enseignement (collÃ© le ", new Date(persoOseEns.stamp).toLocaleDateString("fr-FR"), ")"), /*#__PURE__*/React.createElement("button", {
        onClick: () => {
          setPersoOseEns(null);
          store(persoKeyOf(persoT108, "ose-ens"), "null");
        },
        title: "Retirer ce prÃ©visionnel OSE (colle une autre page pour le remplacer)",
        className: "text-[10px] font-medium bg-slate-900 text-rose-300 border border-rose-400/40 hover:border-rose-300 rounded px-1.5 py-0.5"
      }, "â Retirer")), /*#__PURE__*/React.createElement("p", {
        className: "text-[11px] text-slate-300 tabular-nums mb-1"
      }, "PrÃ©vu : CM ", t108.cm, " Â· TD ", t108.td, " Â· TP ", t108.tp, " = ", Math.round((t108.cm + t108.td + t108.tp) * 100) / 100, " h Â· ", /*#__PURE__*/React.createElement("b", {
        className: "text-slate-100"
      }, eq108, " Ã©qTD"), " ", /*#__PURE__*/React.createElement("span", {
        className: "text-slate-500"
      }, "(CM Ã1,5 Â· TD Ã1 Â· TP Ã1 â ", rows108.length, " lignes de service)")), /*#__PURE__*/React.createElement("details", {
        className: "text-[10px]"
      }, /*#__PURE__*/React.createElement("summary", {
        className: "cursor-pointer text-slate-400 hover:text-slate-200"
      }, "DÃ©tail des ", rows108.length, " lignes (Ã©ditable â vÃ©rifie et corrige avant usage comme rÃ©fÃ©rence)"), /*#__PURE__*/React.createElement("div", {
        className: "flex flex-col gap-0.5 mt-1"
      }, rows108.map((r, i) => /*#__PURE__*/React.createElement("div", {
        key: i,
        className: "flex items-center gap-1"
      }, /*#__PURE__*/React.createElement("input", {
        type: "text",
        value: r.lib,
        onChange: ev => editOse108(i, "lib", ev.target.value),
        title: (r.periode ? "PÃ©riode " + r.periode + " â " : "") + "libellÃ© editable (validation humaine du collÃ©)",
        className: "flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10.5px] text-slate-100"
      }), /*#__PURE__*/React.createElement("input", {
        type: "number",
        min: "0",
        step: "0.5",
        value: r.cm,
        onChange: ev => {
          const n = Number(ev.target.value);
          if (isFinite(n) && n >= 0) editOse108(i, "cm", n);
        },
        title: "Heures CM",
        className: "w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10.5px] text-slate-100 tabular-nums"
      }), /*#__PURE__*/React.createElement("input", {
        type: "number",
        min: "0",
        step: "0.5",
        value: r.td,
        onChange: ev => {
          const n = Number(ev.target.value);
          if (isFinite(n) && n >= 0) editOse108(i, "td", n);
        },
        title: "Heures TD",
        className: "w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10.5px] text-slate-100 tabular-nums"
      }), /*#__PURE__*/React.createElement("input", {
        type: "number",
        min: "0",
        step: "0.5",
        value: r.tp,
        onChange: ev => {
          const n = Number(ev.target.value);
          if (isFinite(n) && n >= 0) editOse108(i, "tp", n);
        },
        title: "Heures TP",
        className: "w-14 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[10.5px] text-slate-100 tabular-nums"
      }))))));
    })(), /*#__PURE__*/React.createElement("div", {
      className: "bg-slate-800/40 border border-slate-700/60 rounded-xl p-2.5 mb-3"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1"
    }, "Cumul â heures rÃ©elles vs heures Ã©qTD payÃ©es (prorata OSE dynamique)"), /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 " + CH_W + " " + CH_H,
      className: "w-full",
      style: {
        display: "block"
      }
    }, [0, 1, 2, 3, 4].map(k => {
      const v = ymax * k / 4;
      return /*#__PURE__*/React.createElement("g", {
        key: k
      }, /*#__PURE__*/React.createElement("line", {
        x1: PL,
        x2: CH_W - PR,
        y1: cy(v),
        y2: cy(v),
        stroke: "#334155",
        strokeDasharray: "3 3"
      }), /*#__PURE__*/React.createElement("text", {
        x: PL - 4,
        y: cy(v) + 3,
        textAnchor: "end",
        fill: "#64748b",
        fontSize: "9"
      }, Math.round(v)));
    }), Y.WEEKS.map((w, j) => w.date.getDate() <= 7 ? /*#__PURE__*/React.createElement("text", {
      key: w.i,
      x: cx(j),
      y: CH_H - 4,
      textAnchor: "middle",
      fill: "#64748b",
      fontSize: "9"
    }, w.date.toLocaleDateString("fr-FR", {
      month: "short"
    })) : null), /*#__PURE__*/React.createElement("line", {
      x1: PL,
      x2: CH_W - PR,
      y1: cy(persoService),
      y2: cy(persoService),
      stroke: "#fbbf24",
      strokeDasharray: "5 4",
      strokeWidth: "1.5"
    }), /*#__PURE__*/React.createElement("text", {
      x: CH_W - PR,
      y: cy(persoService) - 3,
      textAnchor: "end",
      fill: "#fbbf24",
      fontSize: "9"
    }, "service ", persoService, " h"), SERv108.map(sr => {
      const p95 = (ja, jb) => Y.WEEKS.slice(ja, jb + 1).map((w, j) => cx(j) + "," + cy(vAt(j)[sr.key])).join(" ");
      return /*#__PURE__*/React.createElement("g", {
        key: sr.key
      }, /*#__PURE__*/React.createElement("polyline", {
        fill: "none",
        stroke: sr.color,
        strokeWidth: "2",
        strokeDasharray: sr.dash,
        points: p95(0, jEnd95)
      }), jHor95 > jEnd95 ? /*#__PURE__*/React.createElement("polyline", {
        fill: "none",
        stroke: sr.color,
        strokeWidth: "2",
        strokeDasharray: sr.dash === "none" ? "4 3" : sr.dash,
        points: p95(jEnd95, jHor95)
      }) : null);
    }), SERv108.map(sr => /*#__PURE__*/React.createElement("circle", {
      key: "d" + sr.key,
      cx: cx(wi),
      cy: cy(vAt(wi)[sr.key]),
      r: "3.5",
      fill: sr.color,
      stroke: "#e2e8f0",
      strokeWidth: "1"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9.5px] text-slate-500 mt-1"
    }, SERv108.map(sr => /*#__PURE__*/React.createElement("span", {
      key: sr.key,
      className: "flex items-center gap-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-block w-2 h-2 rounded-sm",
      style: {
        background: sr.color
      }
    }), sr.name)), /*#__PURE__*/React.createElement("span", {
      className: "text-amber-300"
    }, "â ligne de service ", persoService, " Ã©qTD ( croisement = â ambre/bleue )"))), /*#__PURE__*/React.createElement("div", {
      className: "grid sm:grid-cols-2 gap-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-slate-800/40 border border-slate-700/60 rounded-xl p-2.5"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1"
    }, "Par promotion (h, annÃ©e entiÃ¨re)"), promos.length === 0 ? /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] text-slate-500"
    }, "aucun crÃ©neau comptÃ©") : promos.map(p => /*#__PURE__*/React.createElement("p", {
      key: p,
      className: "text-[11px] text-slate-300 flex justify-between"
    }, /*#__PURE__*/React.createElement("span", null, p === "?" ? "hors promotions" : p), /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, fmt2(promoTot[p]), " h")))), /*#__PURE__*/React.createElement("div", {
      className: "bg-slate-800/40 border border-slate-700/60 rounded-xl p-2.5"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1"
    }, "Semaines les plus chargÃ©es"), big.filter(b => b.tot > 0).map(b => /*#__PURE__*/React.createElement("p", {
      key: b.i,
      className: "text-[11px] text-slate-300 flex justify-between"
    }, /*#__PURE__*/React.createElement("span", null, "S", b.i + 1, " Â· ", wLbl(b.i)), /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, fmtHrs(b.tot)))), /*#__PURE__*/React.createElement("p", {
      className: "text-[10px] text-slate-500 mt-1"
    }, "moyenne ", fmtHrs(Y.meanWeek), " / semaine active (hors semaines vides)")))), arch137 && arch137.rapprochementOSE && persoTab === "promo" && (() => {
      // SUITE 105 : onglet Promos â % du prÃ©visionnel 25-26 validÃ© en 26-27, lignes dÃ©pliables (dÃ©tail par Ã©tiquette OSE) + ligne RÃ©fÃ©rentiel global â SUITE 137 : donnÃ©es de l ARCHIVE importÃ©e
      const prevAll105 = PROMOS_105.reduce((a, pr) => a + prevTot105(pr), 0);
      const effAll105 = PROMOS_105.reduce((a, pr) => a + doneTot105(pr), 0);
      const dAll105 = {
        cm: 0,
        td: 0,
        tp: 0
      };
      for (const pr of PROMOS_105) {
        const d = done105[pr];
        if (d) {
          dAll105.cm += d.cm;
          dAll105.td += d.td;
          dAll105.tp += d.tp;
        }
      }
      const refPrev105 = archRefTotal137(arch137) || 0,
        refEff105 = refDyn99,
        refPct105 = pct105(refEff105, refPrev105);
      const line105 = (key, name, nameCls, nameTitle, prev, eff, details) => {
        const pct = pct105(eff, prev);
        const op = persoPromoOpen === key;
        return /*#__PURE__*/React.createElement("div", {
          className: "mb-1 border border-slate-700/60 rounded-xl overflow-hidden"
        }, /*#__PURE__*/React.createElement("button", {
          onClick: () => setPersoPromoOpen(op ? null : key),
          className: "w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/60 text-left"
        }, /*#__PURE__*/React.createElement("span", {
          className: "text-[10px] w-3 text-slate-500 shrink-0"
        }, op ? "â¾" : "â¸"), /*#__PURE__*/React.createElement("span", {
          className: "text-[11px] font-semibold w-[7.2rem] truncate shrink-0 " + (nameCls || "text-slate-200"),
          title: nameTitle || name
        }, name), /*#__PURE__*/React.createElement("span", {
          className: "flex-1 h-3 bg-slate-800 rounded-full overflow-hidden min-w-0"
        }, /*#__PURE__*/React.createElement("span", {
          className: "block h-full rounded-full",
          style: {
            width: (pct == null ? 0 : Math.min(100, pct)) + "%",
            background: pct == null ? "transparent" : pct >= 99.5 ? "#22c55e" : pct >= 50 ? "#818cf8" : "#f59e0b"
          }
        })), /*#__PURE__*/React.createElement("span", {
          className: "text-[10.5px] tabular-nums w-[4.2rem] text-right font-bold shrink-0 " + (pct == null ? "text-slate-500" : pct >= 99.5 ? "text-emerald-300" : pct >= 50 ? "text-indigo-300" : "text-amber-300")
        }, pct == null ? "â" : (pct % 1 ? pct.toFixed(1) : pct) + " %"), /*#__PURE__*/React.createElement("span", {
          className: "text-[10px] text-slate-400 tabular-nums w-[7.5rem] text-right whitespace-nowrap shrink-0"
        }, eff, " / ", prev, " h")), op && /*#__PURE__*/React.createElement("div", {
          className: "border-t border-slate-700/60 bg-slate-800/30 px-2 py-1.5"
        }, details));
      };
      return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
        className: "text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1"
      }, "PrÃ©visionnel 25-26 (service fait, rapprochement OSE soldÃ©) vs effectuÃ© 26-27 Ã  ce jour"), /*#__PURE__*/React.createElement("div", {
        className: "grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2"
      }, card("PrÃ©visionnel 25-26", (prevAll105 % 1 ? prevAll105.toFixed(2) : prevAll105) + " h", "service fait ADE par promo Â· rapprochement soldÃ©"), card("EffectuÃ© 26-27", (effAll105 % 1 ? effAll105.toFixed(2) : effAll105) + " h", "CM " + fmt2(dAll105.cm) + " Â· TD " + fmt2(dAll105.td) + " Â· TP " + fmt2(dAll105.tp) + " Â· Ã  ce jour"), card("RÃ©fÃ©rentiel (hors ADE)", (refEff105 % 1 ? refEff105.toFixed(1) : refEff105) + " / " + (refPrev105 % 1 ? refPrev105.toFixed(1) : refPrev105) + " h", refPct105 == null ? "â" : (refPct105 % 1 ? refPct105.toFixed(1) : refPct105) + " % Â· lignes 26-27 en cours")), PROMOS_105.map(pr => line105(pr, pr, null, null, prevTot105(pr), doneTot105(pr), /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
        className: "text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1"
      }, "Ãtiquettes OSE Â· prÃ©visionnel 25-26 par Ã©tiquette"), /*#__PURE__*/React.createElement("div", {
        className: "flex flex-col gap-0.5 mb-1"
      }, (arch137.rapprochementOSE[pr] || []).map(it => /*#__PURE__*/React.createElement("div", {
        key: it.e,
        className: "flex items-center gap-1.5 text-[10.5px]"
      }, /*#__PURE__*/React.createElement("span", {
        className: "flex-1 min-w-0 truncate text-slate-300",
        title: it.e
      }, it.e), /*#__PURE__*/React.createElement("span", {
        className: "text-[9px] text-slate-500 whitespace-nowrap"
      }, it.cm ? "CM " + it.cm : "", it.td ? (it.cm ? " Â· " : "") + "TD " + it.td : "", it.tp ? (it.cm || it.td ? " Â· " : "") + "TP " + it.tp : "", " Â· ", it.n, " crÃ©neau", it.n > 1 ? "x" : ""), /*#__PURE__*/React.createElement("span", {
        className: "text-[10.5px] text-slate-200 tabular-nums w-12 text-right font-semibold shrink-0"
      }, it.h, " h")))), /*#__PURE__*/React.createElement("p", {
        className: "text-[10px] text-slate-400 mt-1 tabular-nums"
      }, "EffectuÃ© 26-27 Ã  ce jour : ", /*#__PURE__*/React.createElement("b", {
        className: "text-slate-200"
      }, doneTot105(pr), " h"), (done105[pr] || {}).cm ? " Â· CM " + fmt2(done105[pr].cm) : "", (done105[pr] || {}).td ? " Â· TD " + fmt2(done105[pr].td) : "", (done105[pr] || {}).tp ? " Â· TP " + fmt2(done105[pr].tp) : "", " â recalculÃ© Ã  chaque â»")))), line105("ref", "RÃ©fÃ©rentiel", "text-amber-300", "RÃ©fÃ©rentiel (hors ADE) â " + (refPrev105 % 1 ? refPrev105.toFixed(1) : refPrev105) + " h rÃ©alisÃ©s en 25-26 (archive importÃ©e) ; 26-27 = total des lignes Ã©ditables de l onglet direct", refPrev105, refEff105, /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
        className: "text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1"
      }, "Ãtiquettes OSE du rÃ©fÃ©rentiel â 25-26 rÃ©alisÃ© (figÃ©) vs 26-27 en cours (Ã©ditable dans l onglet direct)"), /*#__PURE__*/React.createElement("div", {
        className: "flex flex-col gap-0.5"
      }, (arch137.refItems || []).map(it => {
        const cur = persoRefLines.find(l => l.lib === it.lib);
        const hh = cur ? cur.h || 0 : null;
        return /*#__PURE__*/React.createElement("div", {
          key: it.lib,
          className: "flex items-center gap-1.5 text-[10.5px]"
        }, /*#__PURE__*/React.createElement("span", {
          className: "flex-1 min-w-0 truncate text-slate-300",
          title: it.lib
        }, it.lib), /*#__PURE__*/React.createElement("span", {
          className: "text-[9.5px] text-slate-500 tabular-nums w-[4.5rem] text-right"
        }, it.h, " h en 25-26"), /*#__PURE__*/React.createElement("span", {
          className: "tabular-nums w-[5rem] text-right font-semibold " + (hh == null ? "text-slate-600" : hh >= it.h ? "text-emerald-300" : "text-amber-300"),
          title: hh == null ? "Pas de ligne 26-27 de ce nom â ajoute-la dans l onglet direct" : "Ligne 26-27 en cours"
        }, hh == null ? "â" : hh + " h en 26-27"));
      })), /*#__PURE__*/React.createElement("p", {
        className: "text-[10px] text-slate-400 mt-1 text-right tabular-nums"
      }, "Total : ", refEff105 % 1 ? refEff105.toFixed(1) : refEff105, " h en cours vs ", refPrev105 % 1 ? refPrev105.toFixed(1) : refPrev105, " h en 25-26", refEff105 - refPrev105 ? " Â· Ã©cart " + (refEff105 > refPrev105 ? "+" : "") + (refEff105 % 1 ? (refEff105 - refPrev105).toFixed(1) : Math.round((refEff105 - refPrev105) * 10) / 10) + " h" : " Â· identique"))), doneTot105("?") > 0 && /*#__PURE__*/React.createElement("p", {
        className: "text-[10px] text-slate-500 mt-1"
      }, "+ ", doneTot105("?"), " h effectuÃ©es sans promotion reconnue (hors dÃ©compte des lignes ci-dessus)."), PROMOS_105.indexOf("MP-3A-TECHVIMAT") === -1 && Object.keys(done105).filter(k => k !== "?" && PROMOS_105.indexOf(k) < 0 && doneTot105(k) > 0).map(k => /*#__PURE__*/React.createElement("p", {
        key: k,
        className: "text-[10px] text-slate-500 mt-1"
      }, "+ ", doneTot105(k), " h effectuÃ©es en ", k, " en 26-27 (pas de prÃ©visionnel 25-26 pour cette promo).")), /*#__PURE__*/React.createElement("p", {
        className: "text-[10px] text-slate-500 mt-1"
      }, "Barre et case % = effectuÃ© 26-27 Ã· prÃ©visionnel 25-26 (service fait, rapprochement OSE soldÃ©) ; vert = bouclÃ© (â¥ 99,5 %) Â· ambre < 50 % ; effectuÃ© = crÃ©neaux passÃ©s uniquement (exclusions habituelles ; toggle Tout/MP appliquÃ©)."));
    })()));
  })(), showImport && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50",
    onClick: () => setShowImport(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-3"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-base"
  }, "Options â flux & sources"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowImport(false),
    className: "text-slate-500 hover:text-slate-200 text-lg leading-none"
  }, "â")), /*#__PURE__*/React.createElement("div", {
    className: "border border-slate-700 bg-slate-950/60 rounded-xl p-3 mb-4 flex items-center justify-between gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-slate-200"
  }, "Apparence"), /*#__PURE__*/React.createElement("button", {
    onClick: toggleLight134,
    title: "Basculer le thÃ¨me de l'appli : clair ou sombre (par dÃ©faut) â la prÃ©fÃ©rence est mÃ©morisÃ©e sur cet appareil",
    className: "text-[11px] font-semibold rounded-lg px-2.5 py-1 border transition " + (light134 ? "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500" : "bg-slate-100 text-slate-900 border-slate-100")
  }, light134 ? "âï¸ ThÃ¨me clair actif â passer en sombre" : "ð ThÃ¨me sombre actif â passer en clair")), /*#__PURE__*/React.createElement("div", {
    className: "border border-slate-700 bg-slate-950/60 rounded-xl p-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 flex-wrap mb-1.5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-slate-200"
  }, "Flux ADE officiels (", feedsSrc === "json" ? "feeds-" + feedsYear + ".json en ligne (Ã  jour)" : "secours intÃ©grÃ© Ã  l'appli", ")"), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => refreshIcs(),
    disabled: busySync,
    title: "RetÃ©lÃ©charge les flux ICS ADE (promotions + complÃ©ment enseignants) en parallÃ¨le via le proxy et reconstruit les crÃ©neaux (suppressions et dÃ©placements ADE pris en compte)",
    className: (busySync ? "bg-emerald-700 " : "bg-emerald-500 hover:bg-emerald-400 ") + "text-[10px] font-semibold text-slate-900 border border-emerald-400 transition rounded-lg px-1.5 py-1 whitespace-nowrap"
  }, busySync ? "â» â¦" : "â» ICS Ã" + feeds.length), /*#__PURE__*/React.createElement("span", {
    className: "text-[8.5px] text-slate-500"
  }, "quelques s"))), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-400 mb-2"
  }, "Une ligne par flux : Ã©tat du dernier Â« â» Â». â remplace le lien ADE (rÃ©gÃ©nÃ©rÃ© dans ADE) sans attendre une publication â conservÃ© dans ce navigateur."), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-left"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "text-[9.5px] uppercase tracking-wide text-slate-500 font-semibold px-1.5 py-1 border-b border-slate-800"
  }, "Source"), /*#__PURE__*/React.createElement("th", {
    className: "text-[9.5px] uppercase tracking-wide text-slate-500 font-semibold px-1.5 py-1 border-b border-slate-800 w-[46px]"
  }, "Flux"), /*#__PURE__*/React.createElement("th", {
    className: "text-[9.5px] uppercase tracking-wide text-slate-500 font-semibold px-1.5 py-1 border-b border-slate-800"
  }, "Ãtat"), /*#__PURE__*/React.createElement("th", {
    className: "text-[9.5px] uppercase tracking-wide text-slate-500 font-semibold px-1.5 py-1 border-b border-slate-800 w-[72px] text-right"
  }, "Lien"))), /*#__PURE__*/React.createElement("tbody", null, feeds.map(f => {
    const meta = FEED_META[f.name] || [f.promo ? "groupe" : "evt", f.name];
    const [tag, label, sub] = meta;
    const err = feedErrs.find(x => x.name === f.name);
    const over = feedOverrides[f.name];
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: f.name
    }, /*#__PURE__*/React.createElement("tr", {
      className: err && !err.suspect ? "bg-rose-500/[0.06]" : ""
    }, /*#__PURE__*/React.createElement("td", {
      className: "px-1.5 py-1.5 border-b border-slate-800/60 whitespace-nowrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] font-semibold rounded px-1 py-px shrink-0 " + (tag === "groupe" ? "bg-emerald-500/15 text-emerald-300" : "bg-indigo-500/15 text-indigo-300")
    }, tag), /*#__PURE__*/React.createElement("span", {
      className: "text-[11.5px] text-slate-200"
    }, label, sub && /*#__PURE__*/React.createElement("span", {
      className: (WIDE ? "inline ml-1 " : "block ") + "text-[9.5px] text-slate-500"
    }, sub)))), /*#__PURE__*/React.createElement("td", {
      className: "px-1.5 py-1.5 border-b border-slate-800/60"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] font-semibold rounded px-1 py-px bg-indigo-500/15 text-indigo-300"
    }, "ICS")), /*#__PURE__*/React.createElement("td", {
      className: "px-1.5 py-1.5 border-b border-slate-800/60"
    }, err ? /*#__PURE__*/React.createElement("span", {
      className: "inline-flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[9px] font-semibold rounded px-1 py-px " + (err.suspect ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300")
    }, err.suspect ? "SUSPECT" : "ERREUR"), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-slate-400"
    }, err.msg)) : /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-emerald-300"
    }, "â OK")), /*#__PURE__*/React.createElement("td", {
      className: "px-1.5 py-1.5 border-b border-slate-800/60 text-right"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setEditFeed(editFeed === f.name ? null : f.name);
        setEditFeedUrl(editFeed === f.name ? "" : over || f.url);
      },
      className: "text-[10px] font-semibold rounded-lg px-1.5 py-1 border transition whitespace-nowrap " + (over ? "bg-amber-500/15 text-amber-300 border-amber-400/40 hover:border-amber-300" : "bg-slate-900 text-indigo-300 border-slate-700 hover:border-indigo-400"),
      title: "Remplacer le lien ADE de ce flux (stockÃ© dans votre navigateur)"
    }, over ? "â modifiÃ©" : "â"))), editFeed === f.name && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
      colSpan: 4,
      className: "border-b border-slate-800/60 px-1.5 pb-2.5 pt-0.5"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 flex-wrap bg-slate-950/70 border border-slate-700 rounded-lg px-2.5 py-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] text-slate-400 whitespace-nowrap"
    }, "Remplacer Â« ", f.name, " Â»"), /*#__PURE__*/React.createElement("input", {
      value: editFeedUrl,
      onChange: e => setEditFeedUrl(e.target.value),
      placeholder: "URL iCal du flux (anonymous_cal.jsp?data=â¦)",
      className: "flex-1 min-w-[160px] bg-slate-950 border border-slate-700 focus:border-indigo-400 outline-none rounded-lg px-2.5 py-1.5 text-[11px]"
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => saveFeedOverride(f.name, editFeedUrl),
      className: "text-[11px] font-medium bg-indigo-500 hover:bg-indigo-400 transition rounded-lg px-2.5 py-1.5 whitespace-nowrap"
    }, "Enregistrer"), over && /*#__PURE__*/React.createElement("button", {
      onClick: () => saveFeedOverride(f.name, ""),
      className: "text-[11px] text-amber-300 hover:text-amber-200 whitespace-nowrap"
    }, "RÃ©tablir le lien publiÃ©"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setEditFeed(null);
        setEditFeedUrl("");
      },
      className: "text-[11px] text-slate-400 hover:text-slate-200 whitespace-nowrap"
    }, "Annuler")))));
  })))), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-slate-500 mt-2"
  }, "DerniÃ¨re synchro : ", syncCell(busySync, lastSync, syncState === "error" || syncState === "blocked", DATA_DATE), " Â· provenance des flux actifs :", " ", feedsSrc === "json" ? /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-300 font-semibold"
  }, "feeds-" + feedsYear + ".json en ligne (Ã  jour)") : /*#__PURE__*/React.createElement("span", {
    className: "text-amber-300 font-semibold"
  }, "secours intÃ©grÃ© Ã  l'appli (feeds-" + SCHOOL_YEAR + ".json injoignable ou invalide)"), " Â· Â« â» ICS Â» retÃ©lÃ©charge les " + feeds.length + " flux en parallÃ¨le (promotions + complÃ©ment enseignants) ; un flux en erreur ne remplace jamais la base affichÃ©e (garde < 25 %).", feedsPending ? /*#__PURE__*/React.createElement("p", {
    className: "text-amber-300 font-semibold text-[11px] mt-1"
  }, "â  feeds-" + feedsPending + ".json pas encore publiÃ© (rentrÃ©e Ã  venir) â flux de l'annÃ©e " + feedsYear + " utilisÃ©s en attendant.") : null)), /*#__PURE__*/React.createElement("div", {
    className: "border border-indigo-400/30 bg-indigo-500/[0.06] rounded-xl p-4 mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-indigo-200 mb-1.5"
  }, "Flux personnels (ADE en direct)"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-300 mb-3"
  }, "GÃ©nÃ©rez une URL par groupe ou promotion (menu de gauche â icÃ´ne d'export en bas Ã  gauche â intervalle Â« annÃ©e Â» â Â« ICalendar Â» â Â« GÃ©nÃ©rer URL Â»), puis ajoutez-les toutes ici : fusion et dÃ©doublonnage automatiques. Pour un agenda ", /*#__PURE__*/React.createElement("b", null, "enseignant"), " (ex. votre lien ADE personnel), choisissez le type Â« Enseignant Â» : le flux alimente l'agenda de l'enseignant au nom donnÃ©, sans toucher aux crÃ©neaux des promos."), lsErr && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/40 rounded-lg px-2.5 py-1.5 mb-2"
  }, "â  Stockage navigateur indisponible (quota dÃ©passÃ© ou localStorage bloquÃ©) : vos flux personnels, favoris et remplacements ne sont PAS sauvegardÃ©s. Exportez vos rÃ©glages ci-dessous et importez-les aprÃ¨s rÃ©installation."), sources.length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "mb-3 space-y-1.5"
  }, sources.map(s => /*#__PURE__*/React.createElement("li", {
    key: s.id,
    className: "flex items-center gap-2 bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] uppercase font-semibold rounded px-1 py-px shrink-0 " + (s.type === "ens" ? "bg-sky-500/15 text-sky-300" : "bg-emerald-500/15 text-emerald-300")
  }, s.type === "ens" ? "Ens" : "Promo"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium text-slate-200 whitespace-nowrap"
  }, s.name), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-500 truncate flex-1"
  }, s.url), /*#__PURE__*/React.createElement("button", {
    onClick: () => removeSource(s.id),
    className: "text-[11px] text-rose-300 hover:text-rose-200 whitespace-nowrap"
  }, "Retirer")))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: nameDraft,
    onChange: e => setNameDraft(e.target.value),
    placeholder: srcTypeDraft === "ens" ? "Nom de l'enseignant (ex. : Marcel Dupont)" : "Nom (ex. : BUT2 MP)",
    className: "flex-1 bg-slate-950 border border-slate-700 focus:border-indigo-400 outline-none rounded-xl px-3 py-2 text-xs"
  }), /*#__PURE__*/React.createElement("select", {
    value: srcTypeDraft,
    onChange: e => setSrcTypeDraft(e.target.value),
    title: "Type du flux personnel",
    className: "bg-slate-950 border border-slate-700 focus:border-indigo-400 outline-none rounded-xl px-2 py-2 text-xs text-slate-200"
  }, /*#__PURE__*/React.createElement("option", {
    value: "promo"
  }, "Promo"), /*#__PURE__*/React.createElement("option", {
    value: "ens"
  }, "Enseignant"))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: urlDraft,
    onChange: e => setUrlDraft(e.target.value),
    placeholder: "URL iCal gÃ©nÃ©rÃ©e dans ADE (anonymous_cal.jsp?data=â¦)",
    className: "flex-1 bg-slate-950 border border-slate-700 focus:border-indigo-400 outline-none rounded-xl px-3 py-2 text-xs"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addSource,
    disabled: !urlDraft.trim(),
    className: "text-xs font-medium bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 transition rounded-lg px-3 py-2 whitespace-nowrap"
  }, "Ajouter"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-2 border-t border-slate-800/60"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10.5px] text-slate-400"
  }, "RÃ©glages (flux personnels, favoris, liens modifiÃ©s â) :")