import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberSpaceIds, nodeAccessWhere, canWriteSpace } from "@/lib/spaces";
import { listVersions, getVersionContent } from "@/lib/doc-versions";

export const runtime = "nodejs";

const TYPES = ["note", "diagram", "board", "slides", "project", "coaching"];

async function loadNode(userId: string, id: string) {
  const memberIds = await getMemberSpaceIds(userId);
  return prisma.node.findFirst({
    where: { id, type: { in: TYPES }, ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, spaceId: true },
  });
}

// GET /api/content/:id/versions — liste des versions.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const node = await loadNode(userId, id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ versions: await listVersions(id) });
}

const restoreSchema = z.object({ versionId: z.string().min(1) });

// POST /api/content/:id/versions — restaure une version.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const node = await loadNode(userId, id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (node.spaceId && !(await canWriteSpace(userId, node.spaceId))) {
    return NextResponse.json({ error: "Vous êtes en lecture seule sur cet espace" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = restoreSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const content = await getVersionContent(id, parsed.data.versionId);
  if (content == null) return NextResponse.json({ error: "Version introuvable." }, { status: 404 });

  const updated = await prisma.node.update({
    where: { id },
    data: { content, size: BigInt(Buffer.byteLength(content, "utf8")) },
    select: { updatedAt: true },
  });
  return NextResponse.json({ content, updatedAt: updated.updatedAt.toISOString() });
}
