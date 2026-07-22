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
export type CoachingSummary = {
  id: string;
  name: string;
  updatedAt: string;
  coacheeName: string;
  status: string;
  progress: number;
  sessions: number;
  openActions: number;
  shared: boolean;
};
export type CoachingAgendaItem = {
  coachingId: string;
  itemId: string;
  coacheeName: string;
  date: string;
  kind: "session" | "action";
  label: string;
  done: boolean;
  general?: boolean;
};
export type CoachingPendingAction = {
  coachingId: string;
  coacheeName: string;
  text: string;
  due: string | null;
};
export type CoachingOverview = {
  stats: {
    total: number; active: number; avgProgress: number; openActions: number; upcoming: number;
    doneActions: number; totalActions: number; totalSessions: number; totalObjectives: number;
  };
  coachees: {
    id: string; coacheeName: string; status: string; progress: number;
    openActions: number; doneActions: number; totalActions: number;
    sessions: number; objectives: number; nextSession: string | null; shared: boolean;
  }[];
  upcoming: CoachingAgendaItem[];
  pendingActions: CoachingPendingAction[];
  agenda: CoachingAgendaItem[];
};
export type CoachingSessionDoc = {
  id: string;
  name: string;
  date: string | null;
  rating: number | null;
  updatedAt: string;
};
export type CoachingMemberInfo = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  role: string;
  isOwner: boolean;
  isMe: boolean;
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

export type AiChart = {
  type: string;
  categories: string[];
  series: { name: string; data: number[] }[];
};

export type DashboardStats = {
  plan: string;
  storageUsed: number;
  storageLimit: number;
  totalCount: number;
  trashedCount: number;
  sharesCount: number;
  spacesCount: number;
  byType: Record<string, { count: number; size: number }>;
  biggest: { id: string; name: string; size: number; mimeType: string | null }[];
};

export type ActivityItem = {
  id: string;
  actorName: string;
  action: string;
  targetName: string;
  spaceId: string | null;
  nodeId: string | null;
  createdAt: string;
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

  // ── Types génériques (note, diagram, board, slides) ──
  createNode(type: "note" | "diagram" | "board" | "slides" | "project" | "coaching" | "seance", name: string, parentId: string | null, spaceId?: string | null) {
    return req<{ node: SerializedNode }>(
      "/api/nodes",
      jsonInit("POST", { name, parentId, type, spaceId: spaceId ?? null }),
    );
  },
  getContent(id: string) {
    return req<{ id: string; name: string; type: string; content: string }>(`/api/content/${id}`);
  },
  saveContent(id: string, patch: { content?: string; name?: string }) {
    return req<{ ok: boolean; updatedAt: string }>(`/api/content/${id}`, jsonInit("PUT", patch));
  },
  // Heartbeat de collaboration temps réel (présence + version du document).
  collab(id: string, body: { editing?: boolean; leave?: boolean }) {
    return req<{ updatedAt?: string; peers?: { userId: string; name: string; color: string; editing: boolean }[] }>(
      `/api/collab/${id}`,
      jsonInit("POST", body),
    );
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
  inviteMember(id: string, identifier: string, role: "editor" | "viewer" = "editor") {
    return req<{ member: SpaceMemberInfo }>(`/api/spaces/${id}/members`, jsonInit("POST", { identifier, role }));
  },
  updateMemberRole(id: string, memberUserId: string, role: "editor" | "viewer") {
    return req<{ ok: boolean }>(`/api/spaces/${id}/members`, jsonInit("PATCH", { userId: memberUserId, role }));
  },
  removeMember(id: string, memberUserId: string) {
    return req<{ ok: boolean }>(`/api/spaces/${id}/members`, jsonInit("DELETE", { userId: memberUserId }));
  },

  // ── Assistant IA ──
  aiChat(messages: { role: "user" | "assistant"; content: string }[]) {
    return req<{ reply: string }>("/api/ai/chat", jsonInit("POST", { messages }));
  },
  ai(payload: {
    kind: "doc" | "sheet" | "chart" | "draw" | "note" | "diagram" | "board" | "slides" | "project";
    action: string;
    text?: string;
    instruction?: string;
  }) {
    return req<{ result?: string; chart?: AiChart; data?: unknown }>("/api/ai", jsonInit("POST", payload));
  },

  // ── Tableau de bord ──
  getDashboard() {
    return req<DashboardStats>("/api/dashboard");
  },

  // ── Journal d'activité ──
  getActivity(space?: string | null) {
    const sp = new URLSearchParams();
    if (space) sp.set("space", space);
    const qs = sp.toString();
    return req<{ activities: ActivityItem[] }>(`/api/activity${qs ? `?${qs}` : ""}`);
  },

  // ── Notifications ──
  getNotifications() {
    return req<{ unread: number; notifications: Notif[] }>("/api/notifications");
  },
  markNotificationsRead() {
    return req<{ ok: boolean }>("/api/notifications", { method: "POST" });
  },

  // ── Abonnement (Stripe) ──
  startCheckout(plan: "premium" | "business" = "premium", interval: "month" | "year" = "month") {
    return req<{ url: string | null }>("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan, interval }),
    });
  },
  openBillingPortal() {
    return req<{ url: string }>("/api/billing/portal", { method: "POST" });
  },
  // ── Grade Team (offert par les membres Business) ──
  teamGifts() {
    return req<{ canGift: boolean; max: number; used: number; gifts: { id: string; email: string; name: string | null }[] }>(
      "/api/billing/team",
    );
  },
  giftTeam(email: string) {
    return req<{ ok: boolean; recipient: { id: string; email: string; name: string | null } }>(
      "/api/billing/team",
      jsonInit("POST", { email }),
    );
  },
  revokeTeam(recipientId: string) {
    return req<{ ok: boolean }>("/api/billing/team", jsonInit("DELETE", { recipientId }));
  },
  // ── Compte ──
  updateProfile(patch: { name?: string; username?: string }) {
    return req<{ ok: boolean; user: { name: string | null; username: string | null; email: string } }>(
      "/api/account/profile",
      jsonInit("POST", patch),
    );
  },
  changePassword(current: string, next: string) {
    return req<{ ok: boolean }>("/api/account/password", jsonInit("POST", { current, next }));
  },
  // ── Historique de versions (documents) ──
  listVersions(id: string) {
    return req<{ versions: { id: string; authorName: string | null; size: number; createdAt: string }[] }>(
      `/api/content/${id}/versions`,
    );
  },
  restoreVersion(id: string, versionId: string) {
    return req<{ content: string; updatedAt: string }>(`/api/content/${id}/versions`, jsonInit("POST", { versionId }));
  },
  // ── Commentaires ──
  listComments(id: string) {
    return req<{ comments: { id: string; authorId: string; authorName: string | null; body: string; createdAt: string }[]; me: string }>(
      `/api/content/${id}/comments`,
    );
  },
  addComment(id: string, body: string) {
    return req<{ comment: { id: string; authorId: string; authorName: string | null; body: string; createdAt: string } }>(
      `/api/content/${id}/comments`,
      jsonInit("POST", { body }),
    );
  },
  deleteComment(id: string, commentId: string) {
    return req<{ ok: boolean }>(`/api/content/${id}/comments`, jsonInit("DELETE", { commentId }));
  },
  // ── Admin Fondateur : attribuer un grade ──
  adminSetPlan(email: string, plan: "free" | "team" | "premium" | "business") {
    return req<{ ok: boolean; previousPlan: string; user: { email: string; name: string | null; plan: string } }>(
      "/api/admin/set-plan",
      jsonInit("POST", { email, plan }),
    );
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

  // ── Extension « Accompagnement » (suivis de coaché) ──
  listAccompagnement() {
    return req<{ items: CoachingSummary[] }>("/api/accompagnement");
  },
  createAccompagnement(name?: string) {
    return req<{ id: string; name: string }>("/api/accompagnement", jsonInit("POST", { name }));
  },
  deleteCoaching(id: string) {
    return req<{ ok: boolean }>(`/api/coaching/${id}`, { method: "DELETE" });
  },
  // Nettoie les espaces-coaché orphelins (vides) qui polluent la liste Espaces.
  cleanupCoachingSpaces() {
    return req<{ removed: number }>("/api/coaching/cleanup-spaces", { method: "POST" });
  },
  // Agrégat transversal (dashboard/agenda/pipeline/stats du coaching).
  getCoachingOverview() {
    return req<CoachingOverview>("/api/coaching/overview");
  },
  // Change le statut d'un coaché (pipeline).
  setCoachingStatus(id: string, status: "prospect" | "active" | "paused" | "done") {
    return req<{ ok: boolean }>(`/api/coaching/${id}/status`, jsonInit("PATCH", { status }));
  },
  // Comptes-rendus de séance (documents « seance ») d'un coaché.
  getCoachingSessions(id: string) {
    return req<{ sessions: CoachingSessionDoc[] }>(`/api/coaching/${id}/sessions`);
  },
  // Documents & fichiers du drive d'un coaché (pour les joindre aux étapes).
  getCoachingFiles(id: string) {
    return req<{ files: { id: string; name: string; type: string; mimeType: string | null }[] }>(`/api/coaching/${id}/files`);
  },
  // Crée une note (« carnet ») partagée dans le drive du coaché.
  createCoachingNote(id: string, name?: string) {
    return req<{ note: { id: string; name: string; type: string } }>(
      `/api/coaching/${id}/notebook`,
      jsonInit("POST", { name }),
    );
  },
  // Édition de l'agenda : ajoute/modifie/supprime une séance ou action d'un coaché.
  editCoachingAgenda(id: string, body: {
    op: "add" | "update" | "delete";
    kind: "session" | "action";
    itemId?: string;
    date?: string;
    label?: string;
    done?: boolean;
  }) {
    return req<{ ok: boolean }>(`/api/coaching/${id}/agenda`, jsonInit("PATCH", body));
  },
  // Édition de l'agenda « Général » (événements non rattachés à un coaché).
  editGeneralAgenda(body: {
    op: "add" | "update" | "delete";
    kind?: "session" | "action";
    itemId?: string;
    date?: string;
    label?: string;
    done?: boolean;
  }) {
    return req<{ ok: boolean }>(`/api/agenda/general`, jsonInit("PATCH", body));
  },
  getCoachingMembers(id: string) {
    return req<{ id: string; name: string; isOwner: boolean; myRole: string; members: CoachingMemberInfo[] }>(
      `/api/coaching/${id}/members`,
    );
  },
  inviteCoachingMember(id: string, identifier: string, role: "editor" | "viewer" = "editor") {
    return req<{ member: CoachingMemberInfo }>(`/api/coaching/${id}/members`, jsonInit("POST", { identifier, role }));
  },
  updateCoachingMemberRole(id: string, memberUserId: string, role: "editor" | "viewer") {
    return req<{ ok: boolean }>(`/api/coaching/${id}/members`, jsonInit("PATCH", { userId: memberUserId, role }));
  },
  removeCoachingMember(id: string, memberUserId: string) {
    return req<{ ok: boolean }>(`/api/coaching/${id}/members`, jsonInit("DELETE", { userId: memberUserId }));
  },

  emptyTrash() {
    return req<{ ok: boolean }>("/api/trash", { method: "DELETE" });
  },

  share(id: string) {
    return req<{ share: ShareInfo }>(`/api/nodes/${id}/share`, { method: "POST" });
  },

  updateShare(
    id: string,
    patch: { expiresInDays?: number | null; password?: string | null; allowDownload?: boolean },
  ) {
    return req<{ share: ShareInfo }>(`/api/nodes/${id}/share`, jsonInit("PATCH", patch));
  },

  unshare(id: string) {
    return req<{ ok: boolean }>(`/api/nodes/${id}/share`, { method: "DELETE" });
  },
};

export type ShareInfo = {
  token: string;
  expiresAt: string | null;
  allowDownload: boolean;
  hasPassword: boolean;
  views: number;
  lastViewedAt: string | null;
};

/** Notify sidebar (and others) that storage/data changed. */
export function notifyRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("filehub:refresh"));
  }
}
