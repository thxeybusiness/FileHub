import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberSpaceIds, nodeAccessWhere } from "@/lib/spaces";

export const runtime = "nodejs";

// GET /api/draws/:id — contenu du dessin (strokes JSON)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const memberIds = await getMemberSpaceIds(userId);

  const draw = await prisma.node.findFirst({
    where: { id, type: "draw", ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, name: true, content: true },
  });
  if (!draw) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let data: unknown = null;
  if (draw.content) {
    try {
      data = JSON.parse(draw.content);
    } catch {
      data = null;
    }
  }
  return NextResponse.json({ id: draw.id, name: draw.name, data });
}

const saveSchema = z.object({
  content: z.unknown().optional(),
  name: z.string().trim().min(1).max(255).optional(),
});

// PUT /api/draws/:id — enregistre le dessin et/ou le titre
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const memberIds = await getMemberSpaceIds(userId);

  const draw = await prisma.node.findFirst({
    where: { id, type: "draw", ...nodeAccessWhere(userId, memberIds) },
    select: { id: true },
  });
  if (!draw) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.content !== undefined) {
    const serialized = JSON.stringify(parsed.data.content);
    data.content = serialized;
    data.size = BigInt(Buffer.byteLength(serialized, "utf8"));
  }
  if (parsed.data.name !== undefined) data.name = parsed.data.name;

  const updated = await prisma.node.update({
    where: { id },
    data,
    select: { updatedAt: true },
  });
  return NextResponse.json({ ok: true, updatedAt: updated.updatedAt.toISOString() });
}
