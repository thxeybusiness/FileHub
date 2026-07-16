import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { resolveCoachingAccess, canEditRole } from "@/lib/coaching-members";
import { listCoachingDocs, createCoachingDoc, COACHING_CATEGORIES } from "@/lib/coaching-docs";

export const runtime = "nodejs";

// GET /api/coaching/:id/docs — liste des documents du coaché (owner ou membre).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  return NextResponse.json({ docs: await listCoachingDocs(id) });
}

const createSchema = z.object({
  category: z.enum(COACHING_CATEGORIES).optional(),
  title: z.string().trim().max(255).optional(),
});

// POST /api/coaching/:id/docs — créer un document (owner ou éditeur).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canEditRole(role)) return NextResponse.json({ error: "Lecture seule" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const doc = await createCoachingDoc(id, userId, parsed.data.category ?? "documents", parsed.data.title?.trim() || "Sans titre");
  return NextResponse.json({ doc });
}
