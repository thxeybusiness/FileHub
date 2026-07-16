import { prisma } from "./prisma";
import { listMemberCoachingIds } from "./coaching-members";

// Agrégation transversale des suivis de coaché pour les vues « cockpit »
// (Tableau de bord, Agenda). Tout est dérivé du contenu des nodes « coaching »
// (objectifs, séances, actions) → une seule requête, pas de N+1.

export type AgendaItem = {
  coachingId: string;
  itemId: string; // id de la séance / action dans la fiche (pour l'édition)
  coacheeName: string;
  date: string; // yyyy-mm-dd
  kind: "session" | "action";
  label: string;
  done: boolean;
};
export type PendingAction = {
  coachingId: string;
  coacheeName: string;
  text: string;
  due: string | null; // yyyy-mm-dd
};
export type CoacheeCard = {
  id: string;
  coacheeName: string;
  status: string;
  progress: number;
  openActions: number;
  sessions: number;
  nextSession: string | null; // yyyy-mm-dd
  shared: boolean;
};
export type CoachingOverview = {
  stats: { total: number; active: number; avgProgress: number; openActions: number; upcoming: number };
  coachees: CoacheeCard[];
  upcoming: AgendaItem[]; // séances futures triées (dashboard)
  pendingActions: PendingAction[];
  agenda: AgendaItem[]; // toutes les séances + échéances d'actions (calendrier)
};

const asStr = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const clampPct = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

type RawObjective = { done?: unknown; progress?: unknown };
type RawSession = { id?: unknown; date?: unknown; title?: unknown };
type RawAction = { id?: unknown; text?: unknown; due?: unknown; done?: unknown };

export async function getCoachingOverview(userId: string): Promise<CoachingOverview> {
  const memberIds = await listMemberCoachingIds(userId).catch(() => [] as string[]);
  const nodes = await prisma.node.findMany({
    where: {
      type: "coaching",
      trashed: false,
      OR: [{ userId, spaceId: null }, ...(memberIds.length ? [{ id: { in: memberIds } }] : [])],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, content: true, userId: true },
  });

  const today = new Date().toISOString().slice(0, 10);

  const coachees: CoacheeCard[] = [];
  const upcoming: AgendaItem[] = [];
  const pendingActions: PendingAction[] = [];
  const agenda: AgendaItem[] = [];
  let progressSum = 0;
  let progressCount = 0;
  let openActionsTotal = 0;
  let activeTotal = 0;

  for (const n of nodes) {
    let c: Record<string, unknown> = {};
    try {
      c = JSON.parse(n.content || "{}") as Record<string, unknown>;
    } catch {
      c = {};
    }
    const coachee = (c.coachee ?? {}) as Record<string, unknown>;
    const name = asStr(coachee.name) || n.name || "Coaché";
    const status = asStr(coachee.status) || "active";
    if (status === "active") activeTotal++;

    const objectives = Array.isArray(c.objectives) ? (c.objectives as RawObjective[]) : [];
    const progress = objectives.length
      ? Math.round(
          objectives.reduce((s, o) => s + (o.done ? 100 : clampPct(o.progress)), 0) / objectives.length,
        )
      : 0;
    if (objectives.length) { progressSum += progress; progressCount++; }

    const sessions = Array.isArray(c.sessions) ? (c.sessions as RawSession[]) : [];
    const actions = Array.isArray(c.actions) ? (c.actions as RawAction[]) : [];

    // Séances → agenda ; celles à venir → « prochaines séances ».
    let nextSession: string | null = null;
    for (const s of sessions) {
      const date = asStr(s.date);
      if (!isDate(date)) continue;
      const item: AgendaItem = {
        coachingId: n.id, itemId: asStr(s.id), coacheeName: name, date, kind: "session",
        label: asStr(s.title) || "Séance", done: date < today,
      };
      agenda.push(item);
      if (date >= today) {
        upcoming.push(item);
        if (!nextSession || date < nextSession) nextSession = date;
      }
    }

    // Actions ouvertes → compteur + liste ; celles avec échéance → agenda.
    let openActions = 0;
    for (const a of actions) {
      const done = a.done === true;
      if (done) continue;
      openActions++;
      const text = asStr(a.text) || "Action";
      const due = isDate(asStr(a.due)) ? asStr(a.due) : null;
      pendingActions.push({ coachingId: n.id, coacheeName: name, text, due });
      if (due) {
        agenda.push({ coachingId: n.id, itemId: asStr(a.id), coacheeName: name, date: due, kind: "action", label: text, done: false });
      }
    }
    openActionsTotal += openActions;

    coachees.push({
      id: n.id, coacheeName: name, status, progress, openActions,
      sessions: sessions.filter((s) => isDate(asStr(s.date))).length,
      nextSession, shared: n.userId !== userId,
    });
  }

  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  agenda.sort((a, b) => a.date.localeCompare(b.date));
  // Actions en attente : échéance la plus proche d'abord, sans échéance à la fin.
  pendingActions.sort((a, b) => {
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return 0;
  });

  return {
    stats: {
      total: nodes.length,
      active: activeTotal,
      avgProgress: progressCount ? Math.round(progressSum / progressCount) : 0,
      openActions: openActionsTotal,
      upcoming: upcoming.length,
    },
    coachees,
    upcoming,
    pendingActions,
    agenda,
  };
}
