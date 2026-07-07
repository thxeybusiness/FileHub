import { prisma } from "./prisma";
import { getMemberSpaceIds, nodeAccessWhere } from "./spaces";

// Construit le contexte fourni à l'assistant global : un index de tous les
// fichiers de l'utilisateur + des extraits du contenu des documents les plus
// pertinents pour sa question. Aucune donnée d'un autre compte n'est exposée.

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function keywords(q: string): string[] {
  return [...new Set(norm(q).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3))];
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Extrait un texte lisible du contenu d'un nœud selon son type.
function nodeText(type: string, content: string | null): string {
  if (!content) return "";
  if (type === "doc") return htmlToText(content);
  if (type === "chart") {
    try {
      const c = JSON.parse(content) as { type?: string; categories?: string[]; series?: { name: string; data: number[] }[] };
      const series = (c.series ?? []).map((s) => `${s.name}=[${s.data.join(", ")}]`).join(" ; ");
      return `Graphique ${c.type ?? ""} — catégories: ${(c.categories ?? []).join(", ")} — séries: ${series}`;
    } catch {
      return "";
    }
  }
  return "";
}

type Row = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  mimeType: string | null;
  size: bigint;
  updatedAt: Date;
  content: string | null;
  spaceId: string | null;
};

export async function buildDriveContext(userId: string, question: string): Promise<string> {
  const memberIds = await getMemberSpaceIds(userId);
  const nodes = (await prisma.node.findMany({
    where: { trashed: false, ...nodeAccessWhere(userId, memberIds) },
    select: {
      id: true, name: true, type: true, parentId: true,
      mimeType: true, size: true, updatedAt: true, content: true, spaceId: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 400,
  })) as Row[];

  if (!nodes.length) return "L'utilisateur n'a encore aucun fichier.";

  // Chemins de dossiers.
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pathOf = (n: Row): string => {
    const parts: string[] = [];
    let cur = n.parentId ? byId.get(n.parentId) : undefined;
    let guard = 0;
    while (cur && guard++ < 20) {
      parts.unshift(cur.name);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return parts.length ? "/" + parts.join("/") : "/";
  };

  const typeLabel: Record<string, string> = {
    folder: "Dossier", file: "Fichier", doc: "Document", sheet: "Feuille", chart: "Graphique", draw: "Dessin",
  };
  const fmtSize = (b: bigint) => {
    const n = Number(b);
    if (n < 1024) return `${n} o`;
    if (n < 1048576) return `${(n / 1024).toFixed(0)} Ko`;
    return `${(n / 1048576).toFixed(1)} Mo`;
  };

  // Index complet (borné).
  const index = nodes
    .slice(0, 250)
    .map((n) => {
      const meta = n.type === "folder" ? "" : ` · ${fmtSize(n.size)}`;
      const d = n.updatedAt.toISOString().slice(0, 10);
      return `- [${typeLabel[n.type] ?? n.type}] ${n.name} (${pathOf(n)})${meta} · modifié ${d}`;
    })
    .join("\n");

  // Extraits de contenu pertinents.
  const kws = keywords(question);
  const scored = nodes
    .filter((n) => n.type === "doc" || n.type === "chart")
    .map((n) => {
      const text = nodeText(n.type, n.content);
      const hay = norm(n.name + " " + text);
      const score = kws.reduce((s, k) => s + (hay.includes(k) ? 1 : 0), 0);
      return { n, text, score };
    })
    .filter((x) => x.text);

  scored.sort((a, b) => b.score - a.score || b.n.updatedAt.getTime() - a.n.updatedAt.getTime());
  const picked = scored.slice(0, 6).filter((x, i) => x.score > 0 || i < 3);

  let budget = 22000;
  const excerpts = picked
    .map(({ n, text }) => {
      const slice = text.slice(0, Math.min(4000, budget));
      budget -= slice.length;
      return `### ${n.name} (${typeLabel[n.type]}, ${pathOf(n)})\n${slice}`;
    })
    .filter(() => budget > 0)
    .join("\n\n");

  return [
    `INDEX DES FICHIERS (${nodes.length} au total) :`,
    index,
    excerpts ? `\nCONTENU DES DOCUMENTS PERTINENTS :\n${excerpts}` : "",
  ].join("\n");
}
