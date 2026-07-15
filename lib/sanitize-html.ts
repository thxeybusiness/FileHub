import sanitizeHtml from "sanitize-html";

// Sanitiseur HTML unique et robuste (serveur + client), basé sur une liste
// blanche stricte. Utilisé à chaque endroit où du contenu utilisateur est
// injecté en HTML (éditeurs, page de partage, sortie IA).
//
// Un attaquant peut écrire du contenu arbitraire directement via l'API : la
// seule protection fiable est de nettoyer au moment du rendu, jamais
// uniquement au collage. On retire donc scripts, iframes, gestionnaires
// d'événements (on*), URLs `javascript:` et styles dangereux.

// Couleurs / valeurs CSS autorisées (hex, rgb(a), noms simples).
const COLOR = [/^#(0x)?[0-9a-f]+$/i, /^rgb(a)?\(\s*\d+(\.\d+)?%?(\s*,\s*\d+(\.\d+)?%?){2,3}\s*\)$/i, /^[a-z-]+$/i];

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "div", "span",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "pre", "code", "kbd", "samp",
    "b", "strong", "i", "em", "u", "s", "strike", "del", "ins", "mark", "sub", "sup", "small",
    "a", "ul", "ol", "li",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
    "img", "figure", "figcaption",
    "dl", "dt", "dd", "font", "input",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    font: ["color"],
    // Cases à cocher des listes de tâches Markdown (rendu, non éditable).
    input: ["type", "checked", "disabled"],
    td: ["colspan", "rowspan", "align"],
    th: ["colspan", "rowspan", "align", "scope"],
    col: ["span", "width"],
    "*": ["style"],
  },
  // Seules ces propriétés CSS survivent : pas de `background`, `position`,
  // `behavior`, `expression`, etc. — les couleurs volontaires sont conservées.
  allowedStyles: {
    "*": {
      color: COLOR,
      "text-align": [/^(left|right|center|justify)$/i],
      "text-decoration": [/^[a-z- ]+$/i],
      "font-weight": [/^(normal|bold|bolder|lighter|\d{3})$/i],
      "font-style": [/^(normal|italic|oblique)$/i],
      "font-family": [/^[\w\s",'-]+$/i],
      "font-size": [/^\d+(\.\d+)?(px|em|rem|%|pt)$/i],
      "line-height": [/^\d+(\.\d+)?(px|em|rem|%)?$/i],
    },
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // Le schéma `data:` n'est autorisé que pour les images (jamais pour un lien,
  // où `data:text/html` permettrait une navigation vers du HTML arbitraire).
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false,
  // Contenu des balises interdites (script/style…) : supprimé entièrement.
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe"],
  transformTags: {
    // Tout lien s'ouvrant dans un nouvel onglet est isolé (anti tab-nabbing).
    a: (tagName, attribs) => {
      if (attribs.target) attribs.rel = "noopener noreferrer nofollow";
      return { tagName, attribs };
    },
  },
};

/** Nettoie un fragment HTML avant tout rendu via innerHTML / dangerouslySetInnerHTML. */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, options);
}
