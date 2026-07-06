import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Storage abstraction. Two backends are provided:
 *  - Vercel Blob  — used automatically when BLOB_READ_WRITE_TOKEN is present
 *    (i.e. on Vercel with a Blob store attached). Bytes live in object storage.
 *  - Local disk   — used in local dev; bytes go under STORAGE_DIR.
 *
 * `storageKey` is opaque to callers: for Blob it is the blob URL, for local it
 * is a sharded relative path.
 */
export interface Storage {
  save(buffer: Buffer, ext?: string): Promise<{ key: string }>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

// ---- Local disk backend ----------------------------------------------------
function root(): string {
  return path.resolve(process.env.STORAGE_DIR || "./.storage");
}
function keyToPath(key: string): string {
  return path.join(root(), key);
}

const localStorage: Storage = {
  async save(buffer, ext = "") {
    const id = randomBytes(16).toString("hex");
    const shard = id.slice(0, 2);
    const name = ext ? `${id}${ext.startsWith(".") ? ext : `.${ext}`}` : id;
    const key = `${shard}/${name}`;
    const full = keyToPath(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
    return { key };
  },
  async read(key) {
    return fs.readFile(keyToPath(key));
  },
  async delete(key) {
    try {
      await fs.unlink(keyToPath(key));
    } catch {
      /* already gone */
    }
  },
};

export function localStream(key: string) {
  return createReadStream(keyToPath(key));
}

// ---- Vercel Blob backend ---------------------------------------------------
const blobStorage: Storage = {
  async save(buffer, ext = "") {
    const { put } = await import("@vercel/blob");
    const id = randomBytes(16).toString("hex");
    const name = ext ? `${id}${ext.startsWith(".") ? ext : `.${ext}`}` : id;
    const { url } = await put(`files/${name}`, buffer, {
      access: "public",
      addRandomSuffix: false,
    });
    return { key: url };
  },
  async read(key) {
    const res = await fetch(key);
    if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  },
  async delete(key) {
    try {
      const { del } = await import("@vercel/blob");
      await del(key);
    } catch {
      /* ignore */
    }
  },
};

export const storage: Storage = process.env.BLOB_READ_WRITE_TOKEN
  ? blobStorage
  : localStorage;
