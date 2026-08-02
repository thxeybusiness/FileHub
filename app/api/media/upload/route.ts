import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { putObject, r2Configured, IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/r2";

// Upload d'une image vers R2 (côté serveur → pas de CORS navigateur à gérer).
// Le client envoie le fichier brut en corps de requête, avec son content-type.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  if (!r2Configured()) {
    return NextResponse.json({ error: "Stockage média non configuré." }, { status: 503 });
  }

  const contentType = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = IMAGE_TYPES[contentType];
  if (!ext) {
    return NextResponse.json({ error: "Type d'image non supporté." }, { status: 415 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: "Fichier vide." }, { status: 400 });
  }
  if (buf.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image trop volumineuse." }, { status: 413 });
  }

  const uid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const key = `media/${userId}/${uid}.${ext}`;

  const res = await putObject(key, buf, contentType);
  if (!res.ok) {
    return NextResponse.json({ error: `Échec de l'upload (${res.status}).` }, { status: 502 });
  }

  return NextResponse.json({ key, url: `/api/media/${key}` });
}
