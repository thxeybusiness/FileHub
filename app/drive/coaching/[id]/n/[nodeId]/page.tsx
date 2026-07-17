import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb } from "@/lib/nodes";
import { resolveCoachingAccess } from "@/lib/coaching-members";
import { ensureCoachingSpace } from "@/lib/coaching-space";
import { DocEditor } from "@/components/doc-editor";
import { ExcelBoardLazy } from "@/components/excel-board-lazy";
import { ChartEditor } from "@/components/chart-editor";
import { DrawEditor, type DrawDoc } from "@/components/draw-editor";
import { NoteEditor } from "@/components/note-editor";
import { DiagramEditor } from "@/components/diagram-editor";
import { BoardEditor } from "@/components/board-editor";
import { SlidesEditor } from "@/components/slides-editor";
import { PlanEditor } from "@/components/plan-editor";
import { SeanceEditor } from "@/components/seance-editor";
import type { ChartDoc } from "@/lib/chart-palette";

function parseJson<T>(content: string | null): T | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

// Éditeur générique du drive d'un coaché : ouvre n'importe quel document du
// coaché (doc, feuille, graphique, dessin, note, diagramme, tableau,
// présentation, projet) sans quitter l'espace Coaching.
export default async function Page({ params }: { params: Promise<{ id: string; nodeId: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id, nodeId } = await params;

  const { node: coaching, role } = await resolveCoachingAccess(userId, id);
  if (!coaching || !role) notFound();

  const spaceId = await ensureCoachingSpace(id, coaching.userId, coaching.name);
  const node = await prisma.node.findFirst({
    where: { id: nodeId, spaceId },
    select: { id: true, name: true, content: true, parentId: true, type: true },
  });
  if (!node) notFound();

  const backHref = node.parentId ? `/drive/coaching/${id}/folder/${node.parentId}` : `/drive/coaching/${id}`;
  const crumbs = await getBreadcrumb({ spaceId }, node.parentId);
  const content = node.content ?? "";

  switch (node.type) {
    case "doc":
      return <DocEditor id={node.id} initialName={node.name} initialContent={content} backHref={backHref} crumbs={crumbs} />;
    case "sheet":
      return <ExcelBoardLazy sheetId={node.id} initialName={node.name} initialData={parseJson(node.content)} backHref={backHref} crumbs={crumbs} />;
    case "chart":
      return <ChartEditor id={node.id} initialName={node.name} initialDoc={parseJson<ChartDoc>(node.content)} backHref={backHref} crumbs={crumbs} />;
    case "draw":
      return <DrawEditor id={node.id} initialName={node.name} initialDoc={parseJson<DrawDoc>(node.content)} backHref={backHref} crumbs={crumbs} />;
    case "note":
      return <NoteEditor id={node.id} initialName={node.name} initialContent={content} backHref={backHref} crumbs={crumbs} shared />;
    case "diagram":
      return <DiagramEditor id={node.id} initialName={node.name} initialContent={content} backHref={backHref} crumbs={crumbs} shared />;
    case "board":
      return <BoardEditor id={node.id} initialName={node.name} initialContent={content} backHref={backHref} crumbs={crumbs} shared />;
    case "slides":
      return <SlidesEditor id={node.id} initialName={node.name} initialContent={content} backHref={backHref} crumbs={crumbs} shared />;
    case "project":
      // Dans le coaching, un « projet » est un Plan d'action → éditeur dédié
      // (convertit automatiquement l'ancien format base de données).
      return <PlanEditor id={node.id} coachingId={id} initialName={node.name} initialContent={content} backHref={backHref} crumbs={crumbs} canEdit={role !== "viewer"} />;
    case "seance":
      return <SeanceEditor id={node.id} initialName={node.name} initialContent={content} backHref={backHref} crumbs={crumbs} canEdit={role !== "viewer"} />;
    default:
      notFound();
  }
}
