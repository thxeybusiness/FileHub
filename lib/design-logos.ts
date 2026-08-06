// Marques logicielles — reconstructions géométriques.
//
// CE QUE C'EST. Les marques ci-dessous sont RECONSTRUITES à partir de formes
// exactes (disques, capsules, secteurs d'anneau, polygones) : rien n'est copié
// depuis un fichier officiel. N'y figurent que les marques dont le dessin se
// laisse bâtir fidèlement ainsi ; celles qui reposent sur une typographie
// propre ou une illustration détaillée sont écartées — une approximation
// bancale dessert la marque autant que celui qui l'emploie.
//
// USAGE. Ces signes sont les MARQUES DÉPOSÉES de leurs titulaires respectifs.
// Ils servent à DÉSIGNER les produits : un bouton « partager sur… », une page
// « compatible avec… », un schéma d'outillage. Ils ne doivent pas être
// déformés ni employés d'une façon qui laisserait croire à un partenariat.
//
// DEUX VERSIONS PAR MARQUE. Couleurs d'origine — un emplacement éditable par
// teinte — et monochrome, une seule couleur. En monochrome, un tracé marqué
// `cut` ÉVIDE celui qui le précède : un sigle blanc posé sur un fond plein
// devient donc une découpe, et non une tache invisible.

const N = (n: number) => Math.round(n * 100) / 100;

/* ── Primitives ── */
const circ = (cx: number, cy: number, r: number) =>
  `M ${N(cx - r)} ${N(cy)} a ${N(r)} ${N(r)} 0 1 0 ${N(2 * r)} 0 a ${N(r)} ${N(r)} 0 1 0 ${N(-2 * r)} 0 Z`;

const rect = (x: number, y: number, w: number, h: number, r = 0) => {
  const k = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  if (!k) return `M ${N(x)} ${N(y)} H ${N(x + w)} V ${N(y + h)} H ${N(x)} Z`;
  return `M ${N(x + k)} ${N(y)} H ${N(x + w - k)} A ${N(k)} ${N(k)} 0 0 1 ${N(x + w)} ${N(y + k)}` +
    ` V ${N(y + h - k)} A ${N(k)} ${N(k)} 0 0 1 ${N(x + w - k)} ${N(y + h)}` +
    ` H ${N(x + k)} A ${N(k)} ${N(k)} 0 0 1 ${N(x)} ${N(y + h - k)}` +
    ` V ${N(y + k)} A ${N(k)} ${N(k)} 0 0 1 ${N(x + k)} ${N(y)} Z`;
};

/** Capsule entre deux points (bouts hémisphériques). */
const caps = (x1: number, y1: number, x2: number, y2: number, t: number) => {
  const r = t / 2;
  if (x1 === x2 && y1 === y2) return circ(x1, y1, r);
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a) * r, ny = Math.cos(a) * r;
  return `M ${N(x1 + nx)} ${N(y1 + ny)} L ${N(x2 + nx)} ${N(y2 + ny)}` +
    ` A ${N(r)} ${N(r)} 0 0 0 ${N(x2 - nx)} ${N(y2 - ny)} L ${N(x1 - nx)} ${N(y1 - ny)}` +
    ` A ${N(r)} ${N(r)} 0 0 0 ${N(x1 + nx)} ${N(y1 + ny)} Z`;
};

const poly = (pts: [number, number][]) => `M ${pts.map(([x, y]) => `${N(x)} ${N(y)}`).join(" L ")} Z`;

const pt = (cx: number, cy: number, r: number, deg: number): [number, number] =>
  [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];

/** Secteur d'anneau (0° = est, angles croissants dans le sens horaire). */
const seg = (cx: number, cy: number, R: number, r: number, a0: number, a1raw: number) => {
  // Balayage toujours horaire et positif : sans ça un secteur qui franchit 0°
  // (270° → 30°) partait à l'envers et sortait du cadre.
  const d = (((a1raw - a0) % 360) + 360) % 360;
  const a1 = a0 + d;
  const big = d > 180 ? 1 : 0;
  const [x1, y1] = pt(cx, cy, R, a0), [x2, y2] = pt(cx, cy, R, a1);
  const [x3, y3] = pt(cx, cy, r, a1), [x4, y4] = pt(cx, cy, r, a0);
  return `M ${N(x1)} ${N(y1)} A ${N(R)} ${N(R)} 0 ${big} 1 ${N(x2)} ${N(y2)}` +
    ` L ${N(x3)} ${N(y3)} A ${N(r)} ${N(r)} 0 ${big} 0 ${N(x4)} ${N(y4)} Z`;
};

/** Anneau — un seul tracé, évidé par la règle evenodd. */
const ring = (cx: number, cy: number, R: number, r: number) => `${circ(cx, cy, R)} ${circ(cx, cy, r)}`;

const ell = (cx: number, cy: number, rx: number, ry: number) =>
  `M ${N(cx - rx)} ${N(cy)} a ${N(rx)} ${N(ry)} 0 1 0 ${N(2 * rx)} 0 a ${N(rx)} ${N(ry)} 0 1 0 ${N(-2 * rx)} 0 Z`;

/* ── Modèle ── */
export type LogoPart = {
  d: string;
  c: string;               // couleur d'origine
  nom: string;             // libellé de l'emplacement de couleur
  /** Réunion interne plutôt que découpe (tracés qui se chevauchent). */
  union?: true;
  /** En monochrome, ÉVIDE le tracé précédent au lieu de s'y ajouter. */
  cut?: true;
  /** Rotation autour du centre (degrés). */
  rot?: number;
};
export type LogoDef = { id: string; label: string; kw: string; parts: LogoPart[] };

const ORBITE = `${ell(100, 100, 88, 33)} ${ell(100, 100, 76, 21)}`;
// Équerre de Slack : barre longue + téton détaché, aux proportions du sigle.
const SLACK = `${caps(76.2, 124.9, 76.2, 173.4, 38.7)} ${circ(27.9, 124.9, 19.35)}`;

export const LOGOS: LogoDef[] = [
  /* ═══ Communication & réseaux ═══ */
  {
    id: "slack", label: "Slack", kw: "messagerie equipe travail chat discussion",
    // Le sigle a une symétrie d'ordre 4 : une seule équerre — barre longue plus
    // téton détaché — pivotée de 90° en 90°, chacune dans sa couleur.
    parts: [
      P(SLACK, "#36C5F0", "Bleu", { union: true }),
      P(SLACK, "#E01E5A", "Rouge", { union: true, rot: 90 }),
      P(SLACK, "#ECB22E", "Jaune", { union: true, rot: 180 }),
      P(SLACK, "#2EB67D", "Vert", { union: true, rot: 270 }),
    ],
  },
  {
    id: "whatsapp", label: "WhatsApp", kw: "messagerie discussion telephone appel",
    parts: [
      P(`M 100 14 C 148 14 186 52 186 100 C 186 148 148 186 100 186 C 84 186 68 182 55 174 L 14 186 L 26 146 C 18 132 14 117 14 100 C 14 52 52 14 100 14 Z`, "#25D366", "Vert"),
      P(`M 72 56 C 78 56 81 58 84 65 L 92 84 C 94 89 92 93 89 96 L 83 102 C 80 105 80 108 82 111 C 89 124 100 135 114 142 C 117 144 120 143 122 140 L 129 132 C 132 129 136 128 140 130 L 158 139 C 163 142 164 145 164 151 C 164 164 152 172 138 172 C 96 172 42 120 42 80 C 42 66 56 56 72 56 Z`, "#ffffff", "Combiné", { cut: true }),
    ],
  },
  {
    id: "telegram", label: "Telegram", kw: "messagerie canal discussion",
    parts: [
      P(circ(100, 100, 88), "#26A5E4", "Cercle"),
      P(`M 40 100 L 158 54 L 140 152 L 100 126 L 82 152 L 80 116 Z`, "#ffffff", "Avion", { cut: true }),
    ],
  },
  {
    id: "discord", label: "Discord", kw: "vocal communaute jeu chat",
    parts: [
      P(`M 72 46 C 90 41 110 41 128 46 L 134 57 C 158 65 174 87 178 112 C 180 134 174 152 160 164 C 150 171 138 175 130 174 L 121 158 C 114 160 107 161 100 161 C 93 161 86 160 79 158 L 70 174 C 62 175 50 171 40 164 C 26 152 20 134 22 112 C 26 87 42 65 66 57 Z`, "#5865F2", "Bleu"),
      P(ell(76, 110, 12, 15) + ell(124, 110, 12, 15), "#ffffff", "Yeux", { cut: true }),
    ],
  },
  {
    id: "x", label: "X", kw: "twitter reseau social publication",
    parts: [
      P(`M 24 22 H 76 L 110 70 L 150 22 H 176 L 122 84 L 178 178 H 126 L 88 122 L 42 178 H 18 L 76 108 Z M 60 40 H 44 L 140 160 H 156 Z`, "#000000", "Noir"),
    ],
  },
  {
    id: "instagram", label: "Instagram", kw: "photo reseau social image",
    parts: [
      P(`${rect(18, 18, 164, 164, 48)} ${rect(40, 40, 120, 120, 32)}`, "#E4405F", "Cadre"),
      P(ring(100, 100, 42, 24), "#E4405F", "Objectif"),
      P(circ(148, 52, 11), "#E4405F", "Point"),
    ],
  },
  {
    id: "facebook", label: "Facebook", kw: "reseau social meta page",
    parts: [
      P(circ(100, 100, 88), "#1877F2", "Bleu"),
      P(`M 114 188 V 124 H 136 L 140 96 H 114 V 78 C 114 70 118 64 130 64 H 142 V 40 C 136 39 126 38 116 38 C 92 38 78 52 78 76 V 96 H 54 V 124 H 78 V 188 Z`, "#ffffff", "Lettre", { cut: true }),
    ],
  },
  {
    id: "linkedin", label: "LinkedIn", kw: "professionnel reseau emploi",
    parts: [
      P(rect(14, 14, 172, 172, 36), "#0A66C2", "Fond"),
      P(`${circ(58, 58, 15)} ${rect(44, 84, 28, 74)} ${rect(88, 84, 26, 74)} M 106 108 C 106 92 122 82 138 82 C 156 82 164 94 164 114 V 158 H 136 V 118 C 136 108 130 104 124 104 C 116 104 114 110 114 118 V 158 H 106 Z`, "#ffffff", "Sigle", { cut: true, union: true }),
    ],
  },
  {
    id: "youtube", label: "YouTube", kw: "video chaine lecture",
    parts: [
      P(rect(8, 42, 184, 116, 36), "#FF0000", "Rouge"),
      P(poly([[82, 72], [82, 128], [130, 100]]), "#ffffff", "Lecture", { cut: true }),
    ],
  },
  {
    id: "twitch", label: "Twitch", kw: "direct streaming jeu video",
    parts: [
      P(`M 52.5 5 L 18.5 39 V 161.4 H 59.3 V 195.4 L 93.3 161.4 H 120.5 L 181.7 100.2 V 5 Z`, "#9146FF", "Violet"),
      P(`M 168.1 93.4 L 140.9 120.6 H 113.7 L 89.9 144.4 V 120.6 H 59.3 V 18.6 H 168.1 Z`, "#ffffff", "Écran", { cut: true }),
      P(rect(120.5, 52.6, 13.6, 40.8) + rect(147.7, 52.6, 13.6, 40.8), "#9146FF", "Barres", { union: true }),
    ],
  },
  {
    id: "reddit", label: "Reddit", kw: "forum communaute discussion",
    parts: [
      P(circ(100, 100, 88), "#FF4500", "Orange"),
      P(`${ell(100, 116, 62, 44)} ${circ(38, 116, 17)} ${circ(162, 116, 17)} ${circ(142, 38, 13)} ${caps(140, 40, 116, 76, 7)}`,
        "#ffffff", "Silhouette", { cut: true, union: true }),
      P(`${circ(78, 110, 10)} ${circ(122, 110, 10)} M 74 132 C 84 144 116 144 126 132 L 126 140 C 114 152 86 152 74 140 Z`,
        "#FF4500", "Yeux & bouche", { union: true }),
    ],
  },
  {
    id: "pinterest", label: "Pinterest", kw: "epingle inspiration image",
    parts: [
      P(circ(100, 100, 88), "#BD081C", "Rouge"),
      P(`M 104 36 C 142 36 166 60 166 92 C 166 126 144 150 116 150 C 105 150 95 145 91 137 L 82 172 C 79 183 73 192 66 200 L 44 190 C 50 180 56 168 59 156 L 76 84 C 74 78 73 72 73 66 C 73 52 81 42 92 42 C 101 42 106 49 106 58 C 106 69 99 84 96 96 C 93 107 101 116 112 116 C 131 116 144 98 144 74 C 144 54 130 42 108 42 C 83 42 68 60 68 80 C 68 88 71 94 75 99 L 68 112 C 57 104 50 91 50 74 C 50 52 70 36 104 36 Z`, "#ffffff", "Sigle", { cut: true }),
    ],
  },
  {
    id: "snapchat", label: "Snapchat", kw: "photo ephemere message",
    parts: [
      P(rect(14, 14, 172, 172, 42), "#FFFC00", "Jaune"),
      P(`M 100 38 C 126 38 141 58 141 82 C 141 92 140 100 139 106 C 145 108 151 106 155 104 C 162 101 168 108 163 117 C 158 126 148 130 141 132 C 137 134 139 140 143 146 C 150 157 160 163 168 165 C 175 168 174 174 168 176 C 159 180 149 180 145 184 C 141 189 136 192 124 192 C 116 192 110 188 100 188 C 90 188 84 192 76 192 C 64 192 59 189 55 184 C 51 180 41 180 32 176 C 26 174 25 168 32 165 C 40 163 50 157 57 146 C 61 140 63 134 59 132 C 52 130 42 126 37 117 C 32 108 38 101 45 104 C 49 106 55 108 61 106 C 60 100 59 92 59 82 C 59 58 74 38 100 38 Z`, "#ffffff", "Fantôme", { cut: true }),
    ],
  },
  {
    id: "zoom", label: "Zoom", kw: "visio reunion appel video",
    parts: [
      P(rect(10, 10, 180, 180, 46), "#0B5CFF", "Bleu"),
      P(`${rect(42, 72, 78, 56, 14)} M 126 90 L 160 66 V 134 L 126 110 Z`, "#ffffff", "Caméra", { cut: true, union: true }),
    ],
  },

  /* ═══ Outils & plateformes ═══ */
  {
    id: "google", label: "Google", kw: "recherche moteur web",
    parts: [
      // L'arc bleu s'arrête à la barre ; la barre part de l'intérieur de
      // l'anneau : les deux se touchent sans se recouvrir.
      P(seg(100, 100, 88, 52, 302, 358) + rect(100, 86, 88, 28), "#4285F4", "Bleu", { union: true }),
      P(seg(100, 100, 88, 52, 14, 108), "#34A853", "Vert"),
      P(seg(100, 100, 88, 52, 108, 200), "#FBBC05", "Jaune"),
      P(seg(100, 100, 88, 52, 200, 302), "#EA4335", "Rouge"),
    ],
  },
  {
    id: "chrome", label: "Chrome", kw: "navigateur web google",
    parts: [
      P(seg(100, 100, 88, 38, 270, 30), "#EA4335", "Rouge"),
      P(seg(100, 100, 88, 38, 30, 150), "#34A853", "Vert"),
      P(seg(100, 100, 88, 38, 150, 270), "#FBBC05", "Jaune"),
      P(circ(100, 100, 34), "#4285F4", "Centre"),
    ],
  },
  {
    id: "gmail", label: "Gmail", kw: "courriel messagerie google mail",
    parts: [
      P(`M 30 48 H 170 L 100 104 L 30 48 Z M 14 62 V 152 H 46 V 86 Z M 186 62 V 152 H 154 V 86 Z M 46 86 L 100 128 L 154 86 V 152 H 46 Z`, "#ffffff", "Corps", { union: true }),
      P(`M 14 62 L 14 56 C 14 46 24 42 32 48 L 46 58 V 86 Z`, "#EA4335", "Rabat"),
      P(rect(14, 62, 32, 90), "#4285F4", "Bord gauche"),
      P(rect(154, 62, 32, 90), "#34A853", "Bord droit"),
      P(`M 186 62 L 186 56 C 186 46 176 42 168 48 L 154 58 V 86 Z`, "#FBBC05", "Coin"),
      P(`M 32 48 L 100 100 L 168 48 L 154 58 L 100 104 L 46 58 Z`, "#C5221F", "Pli"),
    ],
  },
  {
    id: "drive", label: "Google Drive", kw: "stockage fichier cloud google",
    parts: [
      P(poly([[74, 22], [126, 22], [72, 116], [46, 70]]), "#0066DA", "Bleu"),
      P(poly([[126, 22], [180, 116], [126, 116], [72, 22]]), "#00AC47", "Vert"),
      P(poly([[46, 70], [72, 116], [180, 116], [154, 162], [20, 162]]), "#FFBA00", "Jaune"),
    ],
  },
  {
    id: "dropbox", label: "Dropbox", kw: "stockage fichier cloud partage",
    parts: [
      P(poly([[58, 22], [16, 56], [58, 90], [100, 56]]) + poly([[142, 22], [100, 56], [142, 90], [184, 56]]) +
        poly([[58, 124], [16, 90], [58, 56], [100, 90]]) + poly([[142, 124], [184, 90], [142, 56], [100, 90]]) +
        poly([[58, 134], [100, 102], [142, 134], [100, 168]]), "#0061FF", "Bleu", { union: true }),
    ],
  },
  {
    id: "figma", label: "Figma", kw: "maquette interface design outil",
    parts: [
      P(`M 72 14 H 100 V 70 H 72 A 28 28 0 0 1 72 14 Z`, "#F24E1E", "Rouge"),
      P(`M 100 14 H 128 A 28 28 0 0 1 128 70 H 100 Z`, "#FF7262", "Rose"),
      P(`M 72 70 H 100 V 126 H 72 A 28 28 0 0 1 72 70 Z`, "#A259FF", "Violet"),
      P(circ(128, 98, 28), "#1ABCFE", "Cyan"),
      P(`M 100 126 H 72 A 28 28 0 1 0 100 154 Z`, "#0ACF83", "Vert"),
    ],
  },
  {
    id: "notion", label: "Notion", kw: "notes espace de travail wiki",
    parts: [
      P(`${rect(20, 20, 160, 160, 18)} ${rect(38, 38, 124, 124, 6)}`, "#000000", "Cadre"),
      P(`M 60 140 V 60 H 84 L 124 118 V 60 H 142 V 140 H 120 L 78 82 V 140 Z`, "#000000", "Lettre"),
    ],
  },
  {
    id: "trello", label: "Trello", kw: "tableau kanban projet",
    parts: [
      P(rect(14, 14, 172, 172, 32), "#0079BF", "Bleu"),
      P(rect(40, 42, 52, 116, 9) + rect(108, 42, 52, 72, 9), "#ffffff", "Colonnes", { cut: true, union: true }),
    ],
  },
  {
    id: "gitlab", label: "GitLab", kw: "code depot devops git",
    parts: [
      P(poly([[100, 180], [134, 78], [66, 78]]), "#E24329", "Centre"),
      P(poly([[100, 180], [66, 78], [18, 78]]) + poly([[100, 180], [134, 78], [182, 78]]), "#FC6D26", "Ailes", { union: true }),
      P(poly([[18, 78], [33, 30], [66, 78]]) + poly([[182, 78], [167, 30], [134, 78]]), "#FCA326", "Sommets", { union: true }),
    ],
  },
  {
    id: "vscode", label: "VS Code", kw: "editeur code developpement",
    parts: [
      P(`M 152 12 L 188 30 V 170 L 152 188 L 64 118 L 32 146 L 12 134 V 66 L 32 54 L 64 82 Z M 152 58 L 96 100 L 152 142 Z M 32 78 V 122 L 54 100 Z`, "#007ACC", "Bleu"),
    ],
  },
  {
    id: "npm", label: "npm", kw: "paquet node javascript registre",
    parts: [
      P(rect(10, 62, 180, 76), "#CB3837", "Rouge"),
      // « npm » en bas-de-casse à empattements droits : montants et barres.
      P(rect(24, 78, 11, 44) + rect(24, 78, 40, 11) + rect(53, 78, 11, 44) +
        rect(76, 78, 11, 60) + rect(76, 78, 40, 11) + rect(105, 78, 11, 33) + rect(76, 100, 40, 11) +
        rect(128, 78, 11, 44) + rect(128, 78, 48, 11) + rect(146, 78, 11, 44) + rect(165, 78, 11, 44),
        "#ffffff", "Sigle", { cut: true, union: true }),
    ],
  },
  {
    id: "react", label: "React", kw: "javascript bibliotheque interface",
    parts: [
      P(circ(100, 100, 19), "#61DAFB", "Noyau"),
      P(ORBITE, "#61DAFB", "Orbite 1"),
      P(ORBITE, "#61DAFB", "Orbite 2", { rot: 60 }),
      P(ORBITE, "#61DAFB", "Orbite 3", { rot: 120 }),
    ],
  },
  {
    id: "vuejs", label: "Vue", kw: "javascript framework interface",
    parts: [
      P(poly([[100, 170], [14, 34], [56, 34], [100, 104], [144, 34], [186, 34]]), "#4FC08D", "Vert"),
      P(poly([[100, 104], [72, 34], [128, 34]]), "#35495E", "Sombre"),
    ],
  },
  {
    id: "nodejs", label: "Node.js", kw: "javascript serveur runtime",
    parts: [
      P(poly([[100, 10], [178, 55], [178, 145], [100, 190], [22, 145], [22, 55]]), "#339933", "Hexagone"),
      // Hexagone intérieur évidé — le sigle en « S » que j'avais tracé
      // n'existe pas dans cette marque.
      P(poly([[100, 54], [152, 84], [152, 116], [100, 146], [48, 116], [48, 84]]) +
        poly([[100, 74], [134, 94], [134, 106], [100, 126], [66, 106], [66, 94]]),
        "#ffffff", "Hexagone intérieur", { cut: true }),
    ],
  },
  {
    id: "docker", label: "Docker", kw: "conteneur devops image",
    parts: [
      P(`M 16 98 H 168 C 176 116 176 132 168 146 C 156 164 132 174 102 174 C 66 174 38 158 26 132 C 20 120 16 108 16 98 Z`, "#2496ED", "Baleine"),
      P(rect(34, 74, 24, 20, 2) + rect(62, 74, 24, 20, 2) + rect(90, 74, 24, 20, 2) + rect(118, 74, 24, 20, 2) +
        rect(62, 50, 24, 20, 2) + rect(90, 50, 24, 20, 2) + rect(90, 26, 24, 20, 2), "#2496ED", "Conteneurs", { union: true }),
      P(`M 168 110 C 178 100 190 100 196 106 C 190 118 180 122 168 122 Z`, "#2496ED", "Queue"),
    ],
  },

  /* ═══ Systèmes & médias ═══ */
  {
    id: "android", label: "Android", kw: "systeme mobile google robot",
    parts: [
      P(`M 32 96 C 32 68 62 46 100 46 C 138 46 168 68 168 96 Z` +
        caps(52, 26, 68, 56, 7) + caps(148, 26, 132, 56, 7), "#3DDC84", "Tête", { union: true }),
      P(circ(76, 74, 8) + circ(124, 74, 8), "#ffffff", "Yeux", { cut: true, union: true }),
      P(rect(32, 108, 136, 62, 10) + caps(60, 170, 60, 186, 22) + caps(140, 170, 140, 186, 22) +
        caps(14, 114, 14, 148, 22) + caps(186, 114, 186, 148, 22), "#3DDC84", "Corps", { union: true }),
    ],
  },
  {
    id: "microsoft", label: "Microsoft", kw: "windows systeme logiciel bureautique",
    parts: [
      P(rect(18, 18, 78, 78), "#F25022", "Rouge"),
      P(rect(104, 18, 78, 78), "#7FBA00", "Vert"),
      P(rect(18, 104, 78, 78), "#00A4EF", "Bleu"),
      P(rect(104, 104, 78, 78), "#FFB900", "Jaune"),
    ],
  },
  {
    id: "windows", label: "Windows", kw: "systeme microsoft bureau",
    parts: [
      P(poly([[14, 46], [93, 35], [93, 96], [14, 96]]) + poly([[103, 33], [186, 21], [186, 96], [103, 96]]) +
        poly([[14, 104], [93, 104], [93, 165], [14, 154]]) + poly([[103, 104], [186, 104], [186, 179], [103, 167]]),
        "#00A4EF", "Bleu", { union: true }),
    ],
  },
  {
    id: "apple", label: "Apple", kw: "systeme mac iphone marque",
    parts: [
      P(`M 143 106 C 143 84 158 74 160 73 C 150 58 134 56 128 56 C 114 55 100 63 94 63 C 88 63 76 56 64 56 C 48 57 34 66 26 81 C 10 110 22 152 38 174 C 46 185 55 197 68 197 C 80 196 85 189 100 189 C 115 189 119 197 132 196 C 145 196 153 185 161 174 C 170 161 173 149 173 148 C 172 148 144 137 143 106 Z` +
        `M 120 40 C 127 32 131 21 130 10 C 120 10 109 16 102 24 C 96 31 91 42 92 53 C 103 54 113 48 120 40 Z`, "#000000", "Noir", { union: true }),
    ],
  },
  {
    id: "spotify", label: "Spotify", kw: "musique streaming audio",
    parts: [
      P(circ(100, 100, 88), "#1DB954", "Vert"),
      P(`M 42 70 C 84 56 134 60 166 80 L 156 100 C 128 82 84 79 50 90 Z` +
        `M 50 106 C 86 94 128 98 154 116 L 146 132 C 122 116 86 113 58 122 Z` +
        `M 60 138 C 88 130 120 132 140 144 L 134 158 C 116 148 88 146 66 152 Z`, "#000000", "Ondes", { cut: true, union: true }),
    ],
  },
  {
    id: "netflix", label: "Netflix", kw: "video streaming serie film",
    parts: [
      P(poly([[48, 14], [88, 14], [152, 186], [112, 186]]) + poly([[48, 14], [86, 14], [86, 186], [48, 186]]) +
        poly([[114, 14], [152, 14], [152, 186], [114, 186]]), "#E50914", "Rouge", { union: true }),
    ],
  },
  {
    id: "adobe", label: "Adobe", kw: "creation logiciel graphisme",
    parts: [
      P(`M 12 22 H 82 L 12 178 Z M 118 22 H 188 V 178 Z M 92 74 L 140 178 H 110 L 96 146 H 66 Z`, "#FF0000", "Rouge", { union: true }),
    ],
  },
];

function P(d: string, c: string, nom: string, o: Partial<LogoPart> = {}): LogoPart {
  return { d, c, nom, ...o };
}

/* ── Fabrication des tracés ── */

const wrap = (p: LogoPart, inner: string) =>
  p.rot ? `<g transform="rotate(${p.rot} 100 100)">${inner}</g>` : inner;

/** Couleurs d'origine : un emplacement éditable par teinte. */
export function logoBodyColor(l: LogoDef): string {
  return l.parts
    .map((p, i) => wrap(p, `<path fill-rule="${p.union ? "nonzero" : "evenodd"}" d="${p.d}" fill="${i === 0 ? "__C__" : `__C${i}~__`}"/>`))
    .join("");
}

/** Monochrome : les tracés marqués `cut` évident celui qui les précède, les
    autres s'ajoutent. Une seule couleur, éditable. */
export function logoBodyMono(l: LogoDef): string {
  const groupes: { d: string; rot?: number; fr: string }[] = [];
  for (const p of l.parts) {
    const g = groupes[groupes.length - 1];
    // Un tracé « cut » rejoint le précédent : leur réunion en evenodd creuse
    // le trou. Sinon le tracé garde SA règle — un anneau reste un anneau.
    if (p.cut && g && g.rot === p.rot) { g.d += " " + p.d; g.fr = "evenodd"; continue; }
    groupes.push({ d: p.d, rot: p.rot, fr: p.union ? "nonzero" : "evenodd" });
  }
  return groupes
    .map((g) => {
      const path = `<path fill-rule="${g.fr}" d="${g.d}" fill="__C__"/>`;
      return g.rot ? `<g transform="rotate(${g.rot} 100 100)">${path}</g>` : path;
    })
    .join("");
}

/** Emplacements de couleur de la version d'origine. */
export function logoSlots(l: LogoDef): { label: string; def?: string }[] {
  return l.parts.map((p, i) => (i === 0 ? { label: p.nom } : { label: p.nom, def: p.c }));
}
