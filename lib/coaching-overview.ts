import { prisma } from "./prisma";
import { listMemberCoachingIds } from "./coaching-members";

// Agrégation transversale des suivis de coaché pour les vues « cockpit »
// (Tableau de bord, Agenda). Tout est dérivé du contenu des nodes « coaching »
// (objectifs, séances, actions) → une seule requête, pas de N+1.

export type AgendaItem = {
  coachingId: string; // "" pour un événement « Général »
  itemId: string; // id de la séance / action (pour l'édition)
  coacheeName: string;
  date: string; // yyyy-mm-dd
  kind: "session" | "action";
  label: string;
  done: boolean;
  general?: boolean; // true = événement Général (non rattaché à un coaché)
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
  doneActions: number;
  totalActions: number;
  sessions: number;
  objectives: number;
  nextSession: string | null; // yyyy-mm-dd
  shared: boolean;
};
export type CoachingOverview = {
  stats: {
    total: number; active: number; avgProgress: number; openActions: number; upcoming: number;
    doneActions: number; totalActions: number; totalSessions: number; totalObjectives: number;
  };
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
  let doneActionsTotal = 0;
  let totalActionsTotal = 0;
  let totalSessionsTotal = 0;
  let totalObjectivesTotal = 0;
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

    // Actions : ouvertes → liste + agenda ; on compte aussi faites / total.
    let openActions = 0;
    let doneActions = 0;
    for (const a of actions) {
      if (a.done === true) { doneActions++; continue; }
      openActions++;
      const text = asStr(a.text) || "Action";
      const due = isDate(asStr(a.due)) ? asStr(a.due) : null;
      pendingActions.push({ coachingId: n.id, coacheeName: name, text, due });
      if (due) {
        agenda.push({ coachingId: n.id, itemId: asStr(a.id), coacheeName: name, date: due, kind: "action", label: text, done: false });
      }
    }
    openActionsTotal += openActions;
    doneActionsTotal += doneActions;
    totalActionsTotal += actions.length;

    const sessionCount = sessions.filter((s) => isDate(asStr(s.date))).length;
    totalSessionsTotal += sessionCount;
    totalObjectivesTotal += objectives.length;

    coachees.push({
      id: n.id, coacheeName: name, status, progress, openActions,
      doneActions, totalActions: actions.length,
      sessions: sessionCount, objectives: objectives.length,
      nextSession, shared: n.userId !== userId,
    });
  }

  // Événements « Général » (non rattachés à un coaché) : appels prospects, divers.
  const generalEvents = await prisma.agendaEvent
    .findMany({ where: { userId }, select: { id: true, date: true, kind: true, label: true, done: true } })
    .catch(() => [] as { id: string; date: string; kind: string; label: string; done: boolean }[]);
  for (const g of generalEvents) {
    if (!isDate(g.date)) continue;
    const kind = g.kind === "action" ? "action" : "session";
    const item: AgendaItem = {
      coachingId: "", itemId: g.id, coacheeName: "Général", date: g.date, kind,
      label: g.label || (kind === "action" ? "Action" : "Séance"), done: g.done, general: true,
    };
    agenda.push(item);
    if (kind === "session" && g.date >= today && !g.done) upcoming.push(item);
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
      doneActions: doneActionsTotal,
      totalActions: totalActionsTotal,
      totalSessions: totalSessionsTotal,
      totalObjectives: totalObjectivesTotal,
    },
    coachees,
    upcoming,
    pendingActions,
    agenda,
  };
}
