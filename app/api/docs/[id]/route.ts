import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/docs/:id — contenu d'un document
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const doc = await prisma.node.findFirst({
    where: { id, userId, type: "doc" },
    select: { id: true, name: true, content: true, updatedAt: true },
  });
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({
    id: doc.id,
    name: doc.name,
    content: doc.content ?? "",
    updatedAt: doc.updatedAt.toISOString(),
  });
}

const saveSchema = z.object({
  content: z.string().max(5_000_000).optional(),
  name: z.string().trim().min(1).max(255).optional(),
});

// PUT /api/docs/:id — enregistre le contenu et/ou le titre
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const doc = await prisma.node.findFirst({
    where: { id, userId, type: "doc" },
    select: { id: true },
  });
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.content !== undefined) {
    data.content = parsed.data.content;
    data.size = BigInt(Buffer.byteLength(parsed.data.content, "utf8"));
  }
  if (parsed.data.name !== undefined) data.name = parsed.data.name;

  const updated = await prisma.node.update({
    where: { id },
    data,
    select: { updatedAt: true },
  });

  return NextResponse.json({ ok: true, updatedAt: updated.updatedAt.toISOString() });
}
