import Link from "next/link";
import { notFound } from "next/navigation";
import { Cloud, Download, FileWarning } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatRelative } from "@/lib/utils";
import { categoryOf, CATEGORY_META } from "@/lib/filetypes";
import { SharedFileIcon } from "@/components/shared-file-icon";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await prisma.share.findUnique({ where: { token } });
  if (!share || (share.expiresAt && share.expiresAt < new Date())) notFound();

  const node = await prisma.node.findFirst({
    where: { id: share.nodeId, trashed: false },
    select: { id: true, name: true, type: true, mimeType: true, size: true, updatedAt: true },
  });
  if (!node) notFound();

  const children =
    node.type === "folder"
      ? await prisma.node.findMany({
          where: { parentId: node.id, trashed: false },
          orderBy: [{ type: "asc" }, { name: "asc" }],
          select: { id: true, name: true, type: true, mimeType: true, size: true },
        })
      : [];

  const cat = categoryOf(node.mimeType, node.name);
  const rawUrl = `/api/s/${token}/raw`;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="h-16 border-b border-line bg-surface flex items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="size-8 rounded-lg bg-brand-600 grid place-items-center">
            <Cloud className="size-5 text-white" />
          </span>
          FileHub
        </Link>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-surface rounded-2xl border border-line overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-line flex items-center gap-4">
            <div
              className="size-14 rounded-2xl grid place-items-center shrink-0"
              style={{ background: CATEGORY_META[cat].bg }}
            >
              <SharedFileIcon type={node.type as "folder" | "file"} mimeType={node.mimeType} name={node.name} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{node.name}</h1>
              <p className="text-sm text-muted">
                {node.type === "folder"
                  ? `${children.length} élément(s)`
                  : `${formatBytes(node.size)} · modifié ${formatRelative(node.updatedAt)}`}
              </p>
            </div>
            {node.type === "file" && (
              <a
                href={`${rawUrl}?download=1`}
                className="ml-auto h-10 px-5 rounded-xl bg-brand-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-brand-700"
              >
                <Download className="size-4" /> Télécharger
              </a>
            )}
          </div>

          {/* Body */}
          <div className="p-6">
            {node.type === "file" ? (
              <FilePreview cat={cat} url={rawUrl} name={node.name} />
            ) : children.length === 0 ? (
              <div className="py-16 text-center text-muted flex flex-col items-center gap-2">
                <FileWarning className="size-8" />
                Ce dossier est vide.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {children.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-3">
                    <SharedFileIcon type={c.type as "folder" | "file"} mimeType={c.mimeType} name={c.name} small />
                    <span className="text-sm font-medium truncate flex-1">{c.name}</span>
                    <span className="text-sm text-muted">
                      {c.type === "folder" ? "Dossier" : formatBytes(c.size)}
                    </span>
                    {c.type === "file" && (
                      <a
                        href={`${rawUrl}?child=${c.id}&download=1`}
                        className="size-9 grid place-items-center rounded-lg hover:bg-canvas text-muted"
                        title="Télécharger"
                      >
                        <Download className="size-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-muted mt-4">
          Partagé via FileHub · Lecture seule
        </p>
      </main>
    </div>
  );
}

function FilePreview({ cat, url, name }: { cat: string; url: string; name: string }) {
  if (cat === "image")
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="max-h-[70vh] mx-auto rounded-xl" />;
  if (cat === "video") return <video src={url} controls className="max-h-[70vh] mx-auto rounded-xl" />;
  if (cat === "audio") return <audio src={url} controls className="w-full" />;
  if (cat === "pdf")
    return <iframe src={url} className="w-full h-[70vh] rounded-xl border border-line" title={name} />;
  return (
    <div className="py-16 text-center text-muted">
      Aperçu indisponible — utilisez le bouton Télécharger.
    </div>
  );
}
