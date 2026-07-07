import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberSpaceIds, nodeAccessWhere, canWriteSpace } from "@/lib/spaces";

export const runtime = "nodejs";

// GET /api/charts/:id — configuration du graphique
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const memberIds = await getMemberSpaceIds(userId);

  const chart = await prisma.node.findFirst({
    where: { id, type: "chart", ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, name: true, content: true },
  });
  if (!chart) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let data: unknown = null;
  if (chart.content) {
    try {
      data = JSON.parse(chart.content);
    } catch {
      data = null;
    }
  }
  return NextResponse.json({ id: chart.id, name: chart.name, data });
}

const saveSchema = z.object({
  content: z.unknown().optional(),
  name: z.string().trim().min(1).max(255).optional(),
});

// PUT /api/charts/:id — enregistre la configuration et/ou le titre
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const memberIds = await getMemberSpaceIds(userId);

  const chart = await prisma.node.findFirst({
    where: { id, type: "chart", ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, spaceId: true },
  });
  if (!chart) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (chart.spaceId && !(await canWriteSpace(userId, chart.spaceId))) {
    return NextResponse.json({ error: "Vous êtes en lecture seule sur cet espace" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.content !== undefined) {
    const serialized = JSON.stringify(parsed.data.content);
    data.content = serialized;
    data.size = BigInt(Buffer.byteLength(serialized, "utf8"));
    // Encode le type de graphique dans le mimeType (ex.
    // "application/vnd.filehub.chart+line") pour que la vignette du Drive
    // affiche une icône propre à chaque type, sans charger tout le contenu.
    const kind = (parsed.data.content as { type?: unknown } | null)?.type;
    if (typeof kind === "string" && /^[a-z-]{1,20}$/.test(kind)) {
      data.mimeType = `application/vnd.filehub.chart+${kind}`;
    }
  }
  if (parsed.data.name !== undefined) data.name = parsed.data.name;

  const updated = await prisma.node.update({
    where: { id },
    data,
    select: { updatedAt: true },
  });
  return NextResponse.json({ ok: true, updatedAt: updated.updatedAt.toISOString() });
}
