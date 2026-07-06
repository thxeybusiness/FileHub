import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeNode } from "@/lib/nodes";

export const runtime = "nodejs";

// GET /api/nodes?parent=<id|root>&view=my|starred|trash|recent&q=<search>
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "my";
  const q = searchParams.get("q")?.trim();
  const parent = searchParams.get("parent");

  const where: Record<string, unknown> = { userId };

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
    where.type = { in: ["file", "doc"] };
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

  return NextResponse.json({ nodes: nodes.map(serializeNode) });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  parentId: z.string().nullable().optional(),
  color: z.string().optional(),
  type: z.enum(["folder", "doc"]).optional(),
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
  const { name, parentId, color, type = "folder" } = parsed.data;

  if (parentId) {
    const parent = await prisma.node.findFirst({
      where: { id: parentId, userId, type: "folder" },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }

  const node = await prisma.node.create({
    data: {
      userId,
      parentId: parentId ?? null,
      name,
      type,
      color: color ?? null,
      ...(type === "doc" ? { content: "", mimeType: "application/vnd.filehub.doc" } : {}),
    },
    include: { _count: { select: { children: true } } },
  });

  return NextResponse.json({ node: serializeNode(node) });
}
