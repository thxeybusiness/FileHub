import { prisma } from "./prisma";

/**
 * File-bytes storage. Following RoadMapXey's approach, bytes live in PostgreSQL
 * (the `filehub_blob` table) — no external object store to provision. The only
 * resource FileHub needs is a database.
 *
 * `storageKey` is the FileBlob id.
 */
export interface Storage {
  save(buffer: Buffer): Promise<{ key: string }>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export const storage: Storage = {
  async save(buffer) {
    const blob = await prisma.fileBlob.create({
      data: { data: new Uint8Array(buffer) },
      select: { id: true },
    });
    return { key: blob.id };
  },

  async read(key) {
    const blob = await prisma.fileBlob.findUnique({
      where: { id: key },
      select: { data: true },
    });
    if (!blob) throw new Error("Blob introuvable");
    return Buffer.from(blob.data);
  },

  async delete(key) {
    try {
      await prisma.fileBlob.delete({ where: { id: key } });
    } catch {
      /* already gone */
    }
  },
};
