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

export type SpaceSummary = {
  id: string;
  name: string;
  role: string;
  isOwner: boolean;
  memberCount: number;
};
export type SpaceMemberInfo = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  role: string;
  isOwner: boolean;
  isMe: boolean;
};

export type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  spaceId: string | null;
  read: boolean;
  createdAt: string;
};

export const api = {
  list(params: { view?: string; parent?: string | null; q?: string; space?: string | null }) {
    const sp = new URLSearchParams();
    if (params.view) sp.set("view", params.view);
    if (params.parent) sp.set("parent", params.parent);
    if (params.q) sp.set("q", params.q);
    if (params.space) sp.set("space", params.space);
    return req<{ nodes: SerializedNode[] }>(`/api/nodes?${sp.toString()}`);
  },

  createFolder(name: string, parentId: string | null, spaceId?: string | null) {
    return req<{ node: SerializedNode }>(
      "/api/nodes",
      jsonInit("POST", { name, parentId, spaceId: spaceId ?? null }),
    );
  },

  createDoc(name: string, parentId: string | null, spaceId?: string | null) {
    return req<{ node: SerializedNode }>(
      "/api/nodes",
      jsonInit("POST", { name, parentId, type: "doc", spaceId: spaceId ?? null }),
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

  createSheet(name: string, parentId: string | null, spaceId?: string | null) {
    return req<{ node: SerializedNode }>(
      "/api/nodes",
      jsonInit("POST", { name, parentId, type: "sheet", spaceId: spaceId ?? null }),
    );
  },

  saveSheet(id: string, patch: { content?: unknown; name?: string }) {
    return req<{ ok: boolean; updatedAt: string }>(`/api/sheets/${id}`, jsonInit("PUT", patch));
  },

  createChart(name: string, parentId: string | null, spaceId?: string | null) {
    return req<{ node: SerializedNode }>(
      "/api/nodes",
      jsonInit("POST", { name, parentId, type: "chart", spaceId: spaceId ?? null }),
    );
  },

  createDraw(name: string, parentId: string | null, spaceId?: string | null) {
    return req<{ node: SerializedNode }>(
      "/api/nodes",
      jsonInit("POST", { name, parentId, type: "draw", spaceId: spaceId ?? null }),
    );
  },

  saveDraw(id: string, patch: { content?: unknown; name?: string }) {
    return req<{ ok: boolean; updatedAt: string }>(`/api/draws/${id}`, jsonInit("PUT", patch));
  },

  // ── Espaces communs ──
  listSpaces() {
    return req<{ spaces: SpaceSummary[] }>("/api/spaces");
  },
  createSpace(name: string) {
    return req<{ space: SpaceSummary }>("/api/spaces", jsonInit("POST", { name }));
  },
  getSpace(id: string) {
    return req<{ id: string; name: string; myRole: string; isOwner: boolean; members: SpaceMemberInfo[] }>(
      `/api/spaces/${id}`,
    );
  },
  renameSpace(id: string, name: string) {
    return req<{ ok: boolean }>(`/api/spaces/${id}`, jsonInit("PATCH", { name }));
  },
  deleteSpace(id: string) {
    return req<{ ok: boolean }>(`/api/spaces/${id}`, { method: "DELETE" });
  },
  inviteMember(id: string, identifier: string) {
    return req<{ member: SpaceMemberInfo }>(`/api/spaces/${id}/members`, jsonInit("POST", { identifier }));
  },
  removeMember(id: string, memberUserId: string) {
    return req<{ ok: boolean }>(`/api/spaces/${id}/members`, jsonInit("DELETE", { userId: memberUserId }));
  },

  // ── Notifications ──
  getNotifications() {
    return req<{ unread: number; notifications: Notif[] }>("/api/notifications");
  },
  markNotificationsRead() {
    return req<{ ok: boolean }>("/api/notifications", { method: "POST" });
  },

  saveChart(id: string, patch: { content?: unknown; name?: string }) {
    return req<{ ok: boolean; updatedAt: string }>(`/api/charts/${id}`, jsonInit("PUT", patch));
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
