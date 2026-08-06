// Génère lib/design-logos.ts à partir de deux jeux d'icônes CC0 :
//  · @iconify-json/logos  (collection « logos » de Gil Barbara) → couleurs d'origine
//  · simple-icons                                              → marque monochrome
// Les tracés sont repris TELS QUELS, seulement mis à l'échelle d'une boîte
// 200×200 et tokenisés pour rendre les couleurs éditables.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../package.json", import.meta.url));
const LOGOS = require("@iconify-json/logos/icons.json");
const SI = require("simple-icons");
const sharp = require("sharp");

const SI_BY_SLUG = new Map();
for (const v of Object.values(SI)) if (v && v.slug) SI_BY_SLUG.set(v.slug, v);

/* Marques retenues : clé Iconify (le variant « -icon » est la marque seule,
   sans le mot), libellé, mots-clés, et le slug simple-icons du monochrome. */
const M = [
  // Réseaux & messagerie
  ["slack-icon", "Slack", "messagerie equipe travail chat", null],
  ["whatsapp-icon", "WhatsApp", "messagerie discussion telephone", "whatsapp"],
  ["telegram", "Telegram", "messagerie canal discussion", "telegram"],
  ["discord-icon", "Discord", "vocal communaute jeu chat", "discord"],
  ["messenger", "Messenger", "messagerie meta discussion", "messenger"],
  ["signal", "Signal", "messagerie chiffree confidentialite", "signal"],
  ["instagram-icon", "Instagram", "photo reseau social image", "instagram"],
  ["facebook", "Facebook", "reseau social meta page", "facebook"],
  ["linkedin-icon", "LinkedIn", "professionnel reseau emploi", "linkedin"],
  ["x", "X", "twitter reseau social publication", "x"],
  ["tiktok-icon", "TikTok", "video courte musique", "tiktok"],
  ["snapchat", "Snapchat", "photo ephemere message", "snapchat"],
  ["reddit-icon", "Reddit", "forum communaute discussion", "reddit"],
  ["pinterest", "Pinterest", "epingle inspiration image", "pinterest"],
  ["twitch", "Twitch", "direct streaming jeu video", "twitch"],
  ["threads-icon", "Threads", "reseau social meta texte", "threads"],
  // Visio & travail
  ["zoom-icon", "Zoom", "visio reunion appel video", "zoom"],
  ["microsoft-teams", "Microsoft Teams", "visio equipe reunion", "microsoftteams"],
  ["notion-icon", "Notion", "notes espace de travail wiki", "notion"],
  ["trello", "Trello", "tableau kanban projet", "trello"],
  ["asana-icon", "Asana", "projet tache equipe", "asana"],
  ["jira", "Jira", "ticket projet suivi", "jira"],
  ["airtable", "Airtable", "base tableur projet", "airtable"],
  // Google & bureautique
  ["google-icon", "Google", "recherche moteur web", "google"],
  ["chrome", "Chrome", "navigateur web google", "googlechrome"],
  ["google-gmail", "Gmail", "courriel messagerie google", "gmail"],
  ["google-drive", "Google Drive", "stockage fichier cloud google", "googledrive"],
  ["google-maps", "Google Maps", "carte itineraire navigation", "googlemaps"],
  ["google-play-icon", "Google Play", "magasin application android", "googleplay"],
  ["microsoft-icon", "Microsoft", "logiciel systeme bureautique", null],
  ["microsoft-onedrive", "OneDrive", "stockage cloud microsoft", "microsoftonedrive"],
  ["microsoft-edge", "Edge", "navigateur web microsoft", "microsoftedge"],
  ["dropbox", "Dropbox", "stockage fichier cloud partage", "dropbox"],
  // Création
  ["figma", "Figma", "maquette interface design", "figma"],
  ["adobe-photoshop", "Photoshop", "retouche image adobe", "adobephotoshop"],
  ["adobe-illustrator", "Illustrator", "vectoriel dessin adobe", "adobeillustrator"],
  ["adobe-premiere", "Premiere Pro", "montage video adobe", "adobepremierepro"],
  ["adobe-after-effects", "After Effects", "animation video adobe", "adobeaftereffects"],
  ["blender", "Blender", "3d modelisation animation", "blender"],
  ["sketch", "Sketch", "maquette interface design", "sketch"],
  // Développement
  ["github-icon", "GitHub", "code depot developpement git", "github"],
  ["gitlab-icon", "GitLab", "code depot devops git", "gitlab"],
  ["git-icon", "Git", "versions depot developpement", "git"],
  ["visual-studio-code", "VS Code", "editeur code developpement", null],
  ["docker-icon", "Docker", "conteneur devops image", "docker"],
  ["kubernetes", "Kubernetes", "orchestration conteneur devops", "kubernetes"],
  ["nodejs-icon", "Node.js", "javascript serveur runtime", "nodedotjs"],
  ["react", "React", "javascript bibliotheque interface", "react"],
  ["vue", "Vue", "javascript framework interface", "vuedotjs"],
  ["angular-icon", "Angular", "framework typescript interface", "angular"],
  ["nextjs-icon", "Next.js", "framework react rendu", "nextdotjs"],
  ["svelte-icon", "Svelte", "framework javascript interface", "svelte"],
  ["tailwindcss-icon", "Tailwind CSS", "style css utilitaire", "tailwindcss"],
  ["typescript-icon", "TypeScript", "langage javascript types", "typescript"],
  ["javascript", "JavaScript", "langage web script", "javascript"],
  ["python", "Python", "langage programmation script", "python"],
  ["rust", "Rust", "langage systeme performance", "rust"],
  ["go", "Go", "langage google serveur", "go"],
  ["php", "PHP", "langage web serveur", "php"],
  ["java", "Java", "langage machine virtuelle", null],
  ["swift", "Swift", "langage apple mobile", "swift"],
  ["kotlin-icon", "Kotlin", "langage android jvm", "kotlin"],
  ["npm-icon", "npm", "paquet node javascript registre", "npm"],
  ["postgresql", "PostgreSQL", "base de donnees sql", "postgresql"],
  ["mongodb-icon", "MongoDB", "base de donnees document", "mongodb"],
  ["redis", "Redis", "base cle valeur cache", "redis"],
  ["supabase-icon", "Supabase", "base de donnees backend", "supabase"],
  ["firebase-icon", "Firebase", "backend google application", "firebase"],
  ["vercel-icon", "Vercel", "hebergement deploiement web", "vercel"],
  ["aws", "AWS", "cloud amazon hebergement", null],
  ["azure-icon", "Azure", "cloud microsoft hebergement", null],
  ["cloudflare-icon", "Cloudflare", "reseau securite cdn", "cloudflare"],
  // Systèmes
  ["apple", "Apple", "systeme mac iphone marque", "apple"],
  ["android-icon", "Android", "systeme mobile google robot", "android"],
  ["linux-tux", "Linux", "systeme libre noyau", "linux"],
  ["ubuntu", "Ubuntu", "systeme linux distribution", "ubuntu"],
  ["firefox", "Firefox", "navigateur web mozilla", "firefoxbrowser"],
  ["safari", "Safari", "navigateur web apple", "safari"],
  // Médias & services
  ["spotify-icon", "Spotify", "musique streaming audio", "spotify"],
  ["youtube-icon", "YouTube", "video chaine lecture", "youtube"],
  ["netflix-icon", "Netflix", "video streaming serie film", "netflix"],
  ["steam", "Steam", "jeu video plateforme", "steam"],
  ["openai-icon", "OpenAI", "intelligence artificielle chatgpt", "openai"],
  ["claude-icon", "Claude", "intelligence artificielle anthropic", "claude"],
  ["stripe", "Stripe", "paiement en ligne carte", "stripe"],
  ["paypal", "PayPal", "paiement en ligne compte", "paypal"],
  ["visa", "Visa", "carte bancaire paiement", "visa"],
  ["mastercard", "Mastercard", "carte bancaire paiement", "mastercard"],
  ["shopify", "Shopify", "boutique commerce en ligne", "shopify"],
  ["wordpress-icon", "WordPress", "site web publication cms", "wordpress"],
  ["airbnb-icon", "Airbnb", "logement voyage reservation", "airbnb"],
];

/* Le jeu en couleurs ne livre que le glyphe noir d'Instagram : on lui rend son
   dégradé de marque, sans toucher au tracé. */
const DEGRADE = {
  "instagram-icon": {
    de: "#0a0a08",
    defs: `<radialGradient id="ig" cx="19%" cy="99%" r="108%">`
      + `<stop offset="0%" stop-color="#ffd521"/><stop offset="5%" stop-color="#ffd521"/>`
      + `<stop offset="50%" stop-color="#f50000"/><stop offset="95%" stop-color="#b900b4"/>`
      + `<stop offset="100%" stop-color="#b900b4"/></radialGradient>`,
  },
};

const N = (n) => Math.round(n * 100) / 100;

/* ── Mise à l'échelle d'un corps SVG dans une boîte 200×200 ── */
function fit(body, w, h, id) {
  const s = Math.min(200 / w, 200 / h) * 0.94;      // 3 % de marge de chaque côté
  const tx = (200 - w * s) / 2, ty = (200 - h * s) / 2;
  return `<g transform="translate(${N(tx)} ${N(ty)}) scale(${N(s)})">${body}</g>`;
}

/* ── Identifiants internes rendus uniques (les défs de dégradés se croisent
      sinon d'un logo à l'autre sur la même page) ── */
function uniqueIds(body, id) {
  const ids = [...body.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  for (const old of new Set(ids)) {
    const neuf = `${id}-${old}`;
    body = body.split(`id="${old}"`).join(`id="${neuf}"`)
      .split(`url(#${old})`).join(`url(#${neuf})`)
      .split(`href="#${old}"`).join(`href="#${neuf}"`)
      .split(`xlink:href="#${old}"`).join(`xlink:href="#${neuf}"`);
  }
  return body;
}

/* ── Couleurs → emplacements éditables ── */
const MAX_SLOTS = 10;
function tokenise(body) {
  const vus = [];
  const attrs = /(fill|stop-color|stroke)="(#[0-9a-fA-F]{3,8})"/g;
  for (const m of body.matchAll(attrs)) {
    const c = m[2].toLowerCase();
    if (!vus.includes(c)) vus.push(c);
  }
  // Marque sans attribut de couleur (le noir est implicite) : on la peint.
  if (!vus.length) return { body: `<g fill="__C__">${body}</g>`, colors: ["#000000"] };
  const slots = vus.slice(0, MAX_SLOTS);
  let out = body;
  slots.forEach((c, i) => {
    const jeton = i === 0 ? "__C__" : `__C${i}~__`;
    // Remplacement insensible à la casse, attribut par attribut.
    out = out.replace(new RegExp(`(fill|stop-color|stroke)="${c}"`, "gi"), `$1="${jeton}"`);
  });
  return { body: out, colors: slots };
}

/* ── Luminance relative (WCAG) d'une couleur hexadécimale ── */
function lum(hex) {
  const h = hex.replace("#", "");
  const t = h.length < 6 ? h.slice(0, 3).split("").map((c) => c + c).join("") : h.slice(0, 6);
  const v = [0, 2, 4].map((i) => {
    const c = parseInt(t.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

/* ── Encre d'un corps SVG, à la résolution R, sous forme de booléens ── */
const R = 96;
async function encre(body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${R}" height="${R}" viewBox="0 0 200 200">${body}</svg>`;
  const px = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  const a = new Uint8Array(R * R);
  for (let i = 0; i < R * R; i++) a[i] = px[i * 4 + 3] > 40 ? 1 : 0;
  return a;
}

/* ── Le premier tracé est-il une plaque qui porte les autres ?
      Oui si l'encre des tracés suivants tient à l'intérieur de la sienne. ── */
async function estPlaque(body) {
  const parts = body.match(/<(path|circle|rect|ellipse|polygon|polyline)\b[^>]*\/?>/g);
  if (!parts || parts.length < 2) return false;
  const enrobe = (contenu) => body.replace(/<(path|circle|rect|ellipse|polygon|polyline)\b[^>]*\/?>/g, "") + contenu;
  const a0 = await encre(enrobe(parts[0]));
  const ar = await encre(enrobe(parts.slice(1).join("")));
  let dedans = 0, total = 0;
  for (let i = 0; i < a0.length; i++) if (ar[i]) { total++; if (a0[i]) dedans++; }
  let aire = 0;
  for (let i = 0; i < a0.length; i++) if (a0[i]) aire++;
  return total > 0 && dedans / total > 0.9 && aire / (R * R) > 0.25;
}

/* ── Monochrome : tracé officiel de simple-icons, sinon la même géométrie
      ramenée à une teinte — en découpant le motif clair quand le logo est
      posé sur une plaque, faute de quoi il ne resterait qu'un pavé plein. ── */
async function mono(slug, colourBody, id) {
  if (slug && SI_BY_SLUG.has(slug)) {
    const si = SI_BY_SLUG.get(slug);
    return { body: fit(`<path d="${si.path}" fill="__C__"/>`, 24, 24), hex: `#${si.hex}`, source: "simple-icons" };
  }
  const teintes = [...colourBody.matchAll(/(?:fill|stop-color|stroke)="(#[0-9a-fA-F]{3,8})"/gi)].map((m) => m[1]);
  // Silhouette : le logo sert de masque de transparence, une seule teinte le
  // remplit. Les évidements et les fondus du tracé d'origine sont conservés,
  // là où un simple aplat écraserait les dégradés translucides.
  const silhouette = () => ({
    body: `<defs><mask id="${id}-s" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">${colourBody}</mask></defs>`
      + `<rect x="0" y="0" width="200" height="200" fill="__C__" mask="url(#${id}-s)"/>`,
    hex: null, source: "silhouette",
  });
  if (teintes.length < 2 || !(await estPlaque(colourBody))) return silhouette();
  // Plaque : le fond devient l'encre, tout ce qui est plus clair est évidé.
  const l0 = lum(teintes[0]);
  const masque = colourBody.replace(/(fill|stop-color|stroke)="(#[0-9a-fA-F]{3,8})"/gi,
    (_m, a, c) => `${a}="${lum(c) > l0 + 0.1 ? "#000" : "#fff"}"`);
  return {
    body: `<defs><mask id="${id}-k" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">${masque}</mask></defs>`
      + `<rect x="0" y="0" width="200" height="200" fill="__C__" mask="url(#${id}-k)"/>`,
    hex: null, source: "decoupe",
  };
}

/* ── Génération ── */
const sorties = [];
const absents = [];
for (const [cle, label, kw, siSlug] of M) {
  const ic = LOGOS.icons[cle];
  if (!ic) {
    // Marque absente du jeu en couleurs mais présente dans simple-icons : le
    // tracé officiel prend alors la teinte officielle de la marque.
    const si = siSlug && SI_BY_SLUG.get(siSlug);
    if (!si) { absents.push(cle); continue; }
    const id = cle.replace(/[^a-z0-9]/g, "");
    const corps = fit(`<path d="${si.path}" fill="__C__"/>`, 24, 24);
    sorties.push({ id, label, kw, couleur: corps, colors: [`#${si.hex.toLowerCase()}`],
      mono: corps, monoHex: `#${si.hex}`, monoSrc: "simple-icons" });
    continue;
  }
  const w = ic.width ?? LOGOS.width ?? 256;
  const h = ic.height ?? LOGOS.height ?? 256;
  const id = cle.replace(/[^a-z0-9]/g, "");
  const g = DEGRADE[cle];
  const brut = uniqueIds(g ? `${g.defs}${ic.body.split(`"${g.de}"`).join('"url(#ig)"')}` : ic.body, id);
  const { body: tok, colors } = tokenise(brut);
  const couleur = fit(tok, w, h);
  const m = await mono(siSlug, fit(uniqueIds(ic.body, `${id}m`), w, h), id);
  sorties.push({ id, label, kw, couleur, colors, mono: m.body, monoHex: m.hex, monoSrc: m.source });
}

console.log(`${sorties.length} marques générées${absents.length ? ` — absentes : ${absents.join(", ")}` : ""}`);
console.log("emplacements de couleur :", sorties.map((s) => s.colors.length).reduce((a, b) => a + b, 0),
  "· max", Math.max(...sorties.map((s) => s.colors.length)));
for (const src of ["simple-icons", "silhouette", "decoupe"])
  console.log(`monochromes « ${src} » :`, sorties.filter((s) => s.monoSrc === src).map((s) => s.label).join(", ") || "—");

const esc = (s) => JSON.stringify(s);
const src = `// FICHIER GÉNÉRÉ — ne pas modifier à la main.
//
// Logos officiels des marques logicielles, tracés repris tels quels de deux
// jeux placés dans le DOMAINE PUBLIC (CC0-1.0) :
//   · collection « logos » d'Iconify (Gil Barbara) — versions en couleurs
//   · simple-icons — marque monochrome et teinte officielle
// Les tracés ne sont ni redessinés ni approximés : ils sont seulement mis à
// l'échelle d'une boîte 200×200 et leurs couleurs remplacées par des
// emplacements éditables, pour rester conformes au modèle du catalogue.
//
// Les SIGNES restent les marques déposées de leurs titulaires. Ils servent à
// DÉSIGNER les produits — bouton de partage, mention « compatible avec »,
// schéma d'outillage — sans laisser croire à un partenariat ni à une
// approbation. Régénérer avec scripts/gen-logos.mjs.

export type LogoEntry = {
  id: string;
  label: string;
  kw: string;
  /** Corps SVG en couleurs d'origine, couleurs tokenisées. */
  couleur: string;
  /** Couleurs d'origine, dans l'ordre des emplacements. */
  colors: string[];
  /** Corps SVG monochrome (une seule couleur, éditable). */
  mono: string;
  /** Teinte officielle de la marque, quand simple-icons la donne. */
  monoHex: string | null;
};

export const LOGO_ENTRIES: LogoEntry[] = [
${sorties.map((s) => `  { id: ${esc(s.id)}, label: ${esc(s.label)}, kw: ${esc(s.kw)}, colors: ${JSON.stringify(s.colors)}, monoHex: ${s.monoHex ? esc(s.monoHex) : "null"},
    couleur: ${esc(s.couleur)},
    mono: ${esc(s.mono)} },`).join("\n")}
];
`;
writeFileSync(new URL("../lib/design-logos.ts", import.meta.url), src);
console.log("écrit : lib/design-logos.ts", (src.length / 1024).toFixed(0), "Ko");
