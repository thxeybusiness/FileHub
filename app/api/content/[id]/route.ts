import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberSpaceIds, nodeAccessWhere, canWriteSpace } from "@/lib/spaces";
import { snapshotVersion } from "@/lib/doc-versions";

export const runtime = "nodejs";

// Route générique de contenu pour les types "simples" stockés en texte/JSON
// dans node.content : note (Markdown), diagram (Mermaid), board (Kanban),
// slides (présentation).
const TYPES = ["note", "diagram", "board", "slides", "project"];

// GET /api/content/:id — renvoie le contenu brut (texte).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const memberIds = await getMemberSpaceIds(userId);

  const node = await prisma.node.findFirst({
    where: { id, type: { in: TYPES }, ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, name: true, type: true, content: true },
  });
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ id: node.id, name: node.name, type: node.type, content: node.content ?? "" });
}

const saveSchema = z.object({
  // Généreux : les présentations peuvent embarquer des images (data URL).
  content: z.string().max(6_000_000).optional(),
  name: z.string().trim().min(1).max(255).optional(),
});

// PUT /api/content/:id — enregistre le contenu et/ou le titre.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const memberIds = await getMemberSpaceIds(userId);

  const node = await prisma.node.findFirst({
    where: { id, type: { in: TYPES }, ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, spaceId: true },
  });
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (node.spaceId && !(await canWriteSpace(userId, node.spaceId))) {
    return NextResponse.json({ error: "Vous êtes en lecture seule sur cet espace" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.content !== undefined) {
    data.content = parsed.data.content;
    data.size = BigInt(Buffer.byteLength(parsed.data.content, "utf8"));
  }
  if (parsed.data.name !== undefined) data.name = parsed.data.name;

  const updated = await prisma.node.update({ where: { id }, data, select: { updatedAt: true } });

  // Snapshot d'historique (best-effort, throttlé) quand le contenu change.
  if (parsed.data.content !== undefined) {
    const author = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    void snapshotVersion(id, author?.name || author?.email?.split("@")[0] || null, parsed.data.content);
  }

  return NextResponse.json({ ok: true, updatedAt: updated.updatedAt.toISOString() });
}
