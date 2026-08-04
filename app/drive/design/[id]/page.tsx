import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isFounder } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb, nodeBackHref, type NodeScope } from "@/lib/nodes";
import { getMemberSpaceIds, nodeAccessWhere, canWriteSpace } from "@/lib/spaces";
import { DesignEditor } from "@/components/design-editor";

// Studio Design : éditeur graphique à calques (façon Canva / Photopea).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // ACCÈS PRIVÉ : application réservée aux comptes Fondateur pour l'instant.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isFounder(user.email)) redirect("/drive");
  const userId = user.id;
  const { id } = await params;

  const memberIds = await getMemberSpaceIds(userId);
  const node = await prisma.node.findFirst({
    where: { id, type: "design", ...nodeAccessWhere(userId, memberIds) },
    select: { id: true, name: true, content: true, parentId: true, spaceId: true },
  });
  if (!node) notFound();

  const scope: NodeScope = node.spaceId ? { spaceId: node.spaceId } : { userId, spaceId: null };
  const crumbs = await getBreadcrumb(scope, node.parentId);
  const canEdit = node.spaceId ? await canWriteSpace(userId, node.spaceId) : true;
  // Retour vers l'accueil de l'application Design (sauf création dans un espace commun).
  const backHref = node.spaceId ? nodeBackHref(node.spaceId, node.parentId) : "/drive/design";

  return (
    <DesignEditor
      id={node.id}
      initialName={node.name}
      initialContent={node.content ?? ""}
      backHref={backHref}
      crumbs={crumbs}
      canEdit={canEdit}
    />
  );
}
