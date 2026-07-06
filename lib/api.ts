import type { SerializedNode } from "./nodes";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  list(params: { view?: string; parent?: string | null; q?: string }) {
    const sp = new URLSearchParams();
    if (params.view) sp.set("view", params.view);
    if (params.parent) sp.set("parent", params.parent);
    if (params.q) sp.set("q", params.q);
    return req<{ nodes: SerializedNode[] }>(`/api/nodes?${sp.toString()}`);
  },

  createFolder(name: string, parentId: string | null) {
    return req<{ node: SerializedNode }>(
      "/api/nodes",
      jsonInit("POST", { name, parentId }),
    );
  },

  createDoc(name: string, parentId: string | null) {
    return req<{ node: SerializedNode }>(
      "/api/nodes",
      jsonInit("POST", { name, parentId, type: "doc" }),
    );
  },

  getDoc(id: string) {
    return req<{ id: string; name: string; content: string; updatedAt: string }>(
      `/api/docs/${id}`,
    );
  },

  saveDoc(id: string, patch: { content?: string; name?: string }) {
    return req<{ ok: boolean; updatedAt: string }>(`/api/docs/${id}`, jsonInit("PUT", patch));
  },

  createSheet(name: string, parentId: string | null) {
    return req<{ node: SerializedNode }>(
      "/api/nodes",
      jsonInit("POST", { name, parentId, type: "sheet" }),
    );
  },

  saveSheet(id: string, patch: { content?: unknown; name?: string }) {
    return req<{ ok: boolean; updatedAt: string }>(`/api/sheets/${id}`, jsonInit("PUT", patch));
  },

  update(id: string, patch: Partial<Pick<SerializedNode, "name" | "starred" | "trashed" | "color" | "parentId">>) {
    return req<{ node: SerializedNode }>(`/api/nodes/${id}`, jsonInit("PATCH", patch));
  },

  remove(id: string) {
    return req<{ ok: boolean }>(`/api/nodes/${id}`, { method: "DELETE" });
  },

  emptyTrash() {
    return req<{ ok: boolean }>("/api/trash", { method: "DELETE" });
  },

  share(id: string) {
    return req<{ token: string }>(`/api/nodes/${id}/share`, { method: "POST" });
  },

  unshare(id: string) {
    return req<{ ok: boolean }>(`/api/nodes/${id}/share`, { method: "DELETE" });
  },
};

/** Notify sidebar (and others) that storage/data changed. */
export function notifyRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("filehub:refresh"));
  }
}
