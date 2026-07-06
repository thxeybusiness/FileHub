import { notFound, redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBreadcrumb } from "@/lib/nodes";
import { DocEditor } from "@/components/doc-editor";

export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const { id } = await params;

  const doc = await prisma.node.findFirst({
    where: { id, userId, type: "doc" },
    select: { id: true, name: true, content: true, parentId: true, updatedAt: true },
  });
  if (!doc) notFound();

  const crumbs = await getBreadcrumb(userId, doc.parentId);

  return (
    <DocEditor
      id={doc.id}
      initialName={doc.name}
      initialContent={doc.content ?? ""}
      backHref={doc.parentId ? `/drive/folder/${doc.parentId}` : "/drive"}
      crumbs={crumbs}
    />
  );
}
