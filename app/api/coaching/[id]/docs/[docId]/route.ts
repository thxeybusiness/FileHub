import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { resolveCoachingAccess, canEditRole } from "@/lib/coaching-members";
import { getCoachingDoc, updateCoachingDoc, deleteCoachingDoc, COACHING_CATEGORIES } from "@/lib/coaching-docs";

export const runtime = "nodejs";

// GET /api/coaching/:id/docs/:docId — contenu d'un document (owner ou membre).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id, docId } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const doc = await getCoachingDoc(id, docId);
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ doc });
}

const saveSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  content: z.string().max(2_000_000).optional(),
  category: z.enum(COACHING_CATEGORIES).optional(),
});

// PUT /api/coaching/:id/docs/:docId — enregistrer (owner ou éditeur).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id, docId } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canEditRole(role)) return NextResponse.json({ error: "Lecture seule" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const updatedAt = await updateCoachingDoc(id, docId, parsed.data);
  if (!updatedAt) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true, updatedAt });
}

// DELETE /api/coaching/:id/docs/:docId — supprimer (owner ou éditeur).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id, docId } = await params;

  const { node, role } = await resolveCoachingAccess(userId, id);
  if (!node) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canEditRole(role)) return NextResponse.json({ error: "Lecture seule" }, { status: 403 });

  await deleteCoachingDoc(id, docId);
  return NextResponse.json({ ok: true });
}
