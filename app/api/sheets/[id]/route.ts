import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_BYTES = 8_000_000; // ~8 Mo, large pour un classeur

// GET /api/sheets/:id — classeur (snapshot JSON)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const sheet = await prisma.node.findFirst({
    where: { id, userId, type: "sheet" },
    select: { id: true, name: true, content: true },
  });
  if (!sheet) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let data: unknown = null;
  if (sheet.content) {
    try {
      data = JSON.parse(sheet.content);
    } catch {
      data = null;
    }
  }
  return NextResponse.json({ id: sheet.id, name: sheet.name, data });
}

const saveSchema = z.object({
  content: z.unknown().optional(),
  name: z.string().trim().min(1).max(255).optional(),
});

// PUT /api/sheets/:id — enregistre le classeur et/ou le titre
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const sheet = await prisma.node.findFirst({
    where: { id, userId, type: "sheet" },
    select: { id: true },
  });
  if (!sheet) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.content !== undefined) {
    const serialized = JSON.stringify(parsed.data.content);
    if (serialized.length > MAX_BYTES) {
      return NextResponse.json({ error: "Feuille trop volumineuse" }, { status: 413 });
    }
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
