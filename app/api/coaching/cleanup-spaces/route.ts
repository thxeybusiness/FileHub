import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { reconcileOrphanCoachingSpaces } from "@/lib/coaching-space";

export const runtime = "nodejs";

// POST /api/coaching/cleanup-spaces — supprime les espaces-coaché orphelins
// (vides + non reliés) qui polluaient la liste « Espaces » de FileHub.
// Opère uniquement sur les espaces de l'utilisateur courant. Sans danger :
// seuls des espaces VIDES sont supprimés (voir reconcileOrphanCoachingSpaces).
export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const removed = await reconcileOrphanCoachingSpaces(userId).catch(() => 0);
  return NextResponse.json({ removed });
}
