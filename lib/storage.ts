import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Storage abstraction. The dev implementation writes bytes to the local disk
 * under STORAGE_DIR. To move to production, implement the same three methods
 * against S3, Vercel Blob, Cloudflare R2, etc. and swap the export below.
 */
export interface Storage {
  save(buffer: Buffer, ext?: string): Promise<{ key: string }>;
  read(key: string): Promise<Buffer>;
  stream(key: string): ReturnType<typeof createReadStream>;
  delete(key: string): Promise<void>;
}

function root(): string {
  return path.resolve(process.env.STORAGE_DIR || "./.storage");
}

function keyToPath(key: string): string {
  // key is "ab/cdef..." — shard by first 2 chars to avoid huge flat dirs.
  return path.join(root(), key);
}

export const storage: Storage = {
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

  stream(key) {
    return createReadStream(keyToPath(key));
  },

  async delete(key) {
    try {
      await fs.unlink(keyToPath(key));
    } catch {
      // already gone — fine.
    }
  },
};
