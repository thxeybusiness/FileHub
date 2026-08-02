import { getObject } from "@/lib/r2";

// Proxy de lecture des médias R2, servi en same-origin (filehub.business).
// → les images chargées dans l'éditeur ne « taintent » pas le canvas, donc
// l'export PNG/JPG fonctionne. Les clés sont aléatoires (capability URLs).
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = (path ?? []).map((p) => decodeURIComponent(p)).join("/");

  // On ne sert que ce qui vit sous « media/ ».
  if (!key.startsWith("media/") || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  let res: Response;
  try {
    res = await getObject(key);
  } catch {
    return new Response("Bad gateway", { status: 502 });
  }
  if (!res.ok || !res.body) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("content-type", res.headers.get("content-type") ?? "application/octet-stream");
  const len = res.headers.get("content-length");
  if (len) headers.set("content-length", len);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(res.body, { status: 200, headers });
}
