import { NextResponse } from "next/server";
import { AwsClient } from "aws4fetch";
import { getUserId } from "@/lib/auth";
import { callerIsFounder } from "@/lib/founder";

// Test de connexion à Cloudflare R2 — réservé au Fondateur.
// Fait un vrai aller-retour : écrit un petit fichier, le relit, le supprime.
// Endpoint temporaire, à retirer une fois la vérification faite.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId || !(await callerIsFounder(userId))) {
    return NextResponse.json({ ok: false, error: "Réservé au Fondateur." }, { status: 403 });
  }

  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  // Quelles variables manquent ? (on ne divulgue jamais les valeurs)
  const missing = Object.entries({
    R2_ENDPOINT: endpoint,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    return NextResponse.json({ ok: false, error: "Variables manquantes", missing }, { status: 500 });
  }

  const client = new AwsClient({
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    service: "s3",
    region: "auto",
  });

  const base = `${endpoint!.replace(/\/$/, "")}/${bucket}`;
  const key = `_healthcheck/r2-check-${Date.now()}.txt`;
  const url = `${base}/${key}`;
  const payload = "FileHub R2 OK";
  const steps: Record<string, string> = {};

  try {
    const put = await client.fetch(url, { method: "PUT", body: payload });
    steps.write = put.ok ? "✅ écriture" : `❌ écriture (${put.status})`;
    if (!put.ok) throw new Error(`PUT ${put.status}`);

    const get = await client.fetch(url, { method: "GET" });
    const body = await get.text();
    const match = get.ok && body === payload;
    steps.read = match ? "✅ lecture" : `❌ lecture (${get.status})`;
    if (!match) throw new Error(`GET ${get.status}`);

    const del = await client.fetch(url, { method: "DELETE" });
    steps.delete = del.ok ? "✅ suppression" : `⚠️ suppression (${del.status})`;

    return NextResponse.json({
      ok: true,
      message: "Connexion R2 réussie — écriture, lecture et suppression fonctionnent.",
      bucket,
      steps,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Échec de connexion à R2.",
        detail: err instanceof Error ? err.message : String(err),
        steps,
      },
      { status: 502 },
    );
  }
}
