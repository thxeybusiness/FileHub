import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getCoachingOverview } from "@/lib/coaching-overview";

export const runtime = "nodejs";

// GET /api/coaching/overview — agrégat transversal des coachés (dashboard/agenda).
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const overview = await getCoachingOverview(userId);
  return NextResponse.json(overview);
}
