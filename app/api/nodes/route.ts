import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeNode } from "@/lib/nodes";
import { getSpaceRole, canEditRole } from "@/lib/spaces";
import { logActivity, actorNameFor } from "@/lib/activity";

export const runtime = "nodejs";

// Contenus initiaux des nouveaux types de document.
const DEFAULT_DIAGRAM = `graph TD
  A[Début] --> B{Décision}
  B -->|Oui| C[Action]
  B -->|Non| D[Fin]`;
const DEFAULT_BOARD = JSON.stringify({
  columns: [
    { id: "c1", title: "À faire", cards: [] },
    { id: "c2", title: "En cours", cards: [] },
    { id: "c3", title: "Terminé", cards: [] },
  ],
});
const DEFAULT_SLIDES = JSON.stringify({
  slides: [{ title: "Titre de la présentation", bullets: ["Premier point", "Deuxième point"] }],
});

// GET /api/nodes?parent=<id|root>&view=my|starred|trash|recent&q=<search>&space=<id>
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "my";
  const q = searchParams.get("q")?.trim();
  const parent = searchParams.get("parent");
  const space = searchParams.get("space");

  // Portée : un espace commun (membre requis) ou le drive personnel.
  const where: Record<string, unknown> = {};
  if (space) {
    if (!(await getSpaceRole(userId, space))) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    where.spaceId = space;
  } else {
    where.userId = userId;
    where.spaceId = null;
  }

  if (q) {
    where.trashed = false;
    where.name = { contains: q };
  } else if (view === "starred") {
    where.starred = true;
    where.trashed = false;
  } else if (view === "trash") {
    where.trashed = true;
  } else if (view === "recent") {
    where.trashed = false;
    where.type = { in: ["file", "doc", "sheet", "chart", "draw", "note", "diagram", "board", "slides"] };
  } else {
    where.trashed = false;
    where.parentId = parent && parent !== "root" ? parent : null;
  }

  const orderBy =
    view === "recent"
      ? { updatedAt: "desc" as const }
      : [{ type: "asc" as const }, { name: "asc" as const }];

  const nodes = await prisma.node.findMany({
    where,
    orderBy,
    take: view === "recent" ? 50 : undefined,
    include: { _count: { select: { children: true } } },
  });

  await backfillChartKinds(nodes);

  return NextResponse.json({ nodes: nodes.map(serializeNode) });
}

// Migration paresseuse : les graphiques créés avant l'encodage du type dans le
// mimeType affichent tous la même icône. On complète leur mimeType à la volée
// (une seule fois) à partir de leur contenu, et on reflète la correction dans
// la réponse pour que la vignette soit tout de suite la bonne.
async function backfillChartKinds(nodes: { id: string; type: string; mimeType: string | null }[]) {
  const stale = nodes.filter((n) => n.type === "chart" && !(n.mimeType ?? "").includes("+"));
  if (!stale.length) return;
  const withContent = await prisma.node.findMany({
    where: { id: { in: stale.map((n) => n.id) } },
    select: { id: true, content: true },
  });
  const contentById = new Map(withContent.map((c) => [c.id, c.content]));
  await Promise.all(
    stale.map(async (n) => {
      let kind = "bar";
      const content = contentById.get(n.id);
      if (content) {
        try {
          const k = (JSON.parse(content) as { type?: unknown })?.type;
          if (typeof k === "string" && /^[a-z-]{1,20}$/.test(k)) kind = k;
        } catch {
          /* contenu illisible -> reste "bar" */
        }
      }
      const mimeType = `application/vnd.filehub.chart+${kind}`;
      n.mimeType = mimeType;
      await prisma.node.update({ where: { id: n.id }, data: { mimeType } }).catch(() => {});
    }),
  );
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  parentId: z.string().nullable().optional(),
  color: z.string().optional(),
  type: z
    .enum(["folder", "doc", "sheet", "chart", "draw", "note", "diagram", "board", "slides"])
    .optional(),
  spaceId: z.string().nullable().optional(),
});

// POST /api/nodes  — create a folder or a document ("doc")
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  }
  const { name, parentId, color, type = "folder", spaceId } = parsed.data;

  // Espace commun : rôle éditeur (ou plus) requis pour créer.
  if (spaceId) {
    if (!canEditRole(await getSpaceRole(userId, spaceId))) {
      return NextResponse.json({ error: "Vous êtes en lecture seule sur cet espace" }, { status: 403 });
    }
  }

  if (parentId) {
    const parent = await prisma.node.findFirst({
      where: { id: parentId, type: "folder", ...(spaceId ? { spaceId } : { userId, spaceId: null }) },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }

  const node = await prisma.node.create({
    data: {
      userId,
      parentId: parentId ?? null,
      spaceId: spaceId ?? null,
      name,
      type,
      color: color ?? null,
      ...(type === "doc" ? { content: "", mimeType: "application/vnd.filehub.doc" } : {}),
      ...(type === "sheet" ? { content: "", mimeType: "application/vnd.filehub.sheet" } : {}),
      ...(type === "chart" ? { content: "", mimeType: "application/vnd.filehub.chart" } : {}),
      ...(type === "draw" ? { content: "", mimeType: "application/vnd.filehub.draw" } : {}),
      ...(type === "note" ? { content: "", mimeType: "application/vnd.filehub.note" } : {}),
      ...(type === "diagram"
        ? { content: DEFAULT_DIAGRAM, mimeType: "application/vnd.filehub.diagram" }
        : {}),
      ...(type === "board"
        ? { content: DEFAULT_BOARD, mimeType: "application/vnd.filehub.board" }
        : {}),
      ...(type === "slides"
        ? { content: DEFAULT_SLIDES, mimeType: "application/vnd.filehub.slides" }
        : {}),
    },
    include: { _count: { select: { children: true } } },
  });

  await logActivity({
    userId,
    actorName: await actorNameFor(userId),
    action: "created",
    targetName: node.name,
    spaceId: node.spaceId,
    nodeId: node.id,
  });

  return NextResponse.json({ node: serializeNode(node) });
}
