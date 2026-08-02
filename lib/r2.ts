import { AwsClient } from "aws4fetch";

// Cloudflare R2 (stockage objet compatible S3, egress gratuit).
// Les fichiers lourds (images des designs, plus tard les vidéos) y sont stockés,
// jamais dans la base. Lecture via un proxy same-origin (/api/media/…) pour
// éviter tout problème de CORS / canvas tainté à l'export.

const ENDPOINT = (process.env.R2_ENDPOINT ?? "").replace(/\/$/, "");
const BUCKET = process.env.R2_BUCKET ?? "";
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";

export function r2Configured(): boolean {
  return Boolean(ENDPOINT && BUCKET && ACCESS_KEY_ID && SECRET_ACCESS_KEY);
}

function client(): AwsClient {
  return new AwsClient({
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(key: string): string {
  return `${ENDPOINT}/${BUCKET}/${encodeURI(key)}`;
}

/** Écrit un objet dans le bucket (upload côté serveur). */
export async function putObject(
  key: string,
  body: ArrayBuffer | Uint8Array | Buffer,
  contentType: string,
): Promise<Response> {
  return client().fetch(objectUrl(key), {
    method: "PUT",
    body: body as BodyInit,
    headers: { "content-type": contentType },
  });
}

/** Lit un objet du bucket (utilisé par le proxy same-origin). */
export async function getObject(key: string): Promise<Response> {
  return client().fetch(objectUrl(key), { method: "GET" });
}

/** Supprime un objet du bucket. */
export async function deleteObject(key: string): Promise<Response> {
  return client().fetch(objectUrl(key), { method: "DELETE" });
}

// Extensions/types tolérés pour les médias d'un design (images uniquement en V1).
export const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 Mo (les images sont réduites côté client)
