import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Cloud, Download, FileWarning, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatRelative } from "@/lib/utils";
import { categoryOf, CATEGORY_META } from "@/lib/filetypes";
import { SharedFileIcon } from "@/components/shared-file-icon";
import { SharePasswordGate } from "@/components/share-password-gate";
import { isUnlocked, unlockCookieName } from "@/lib/share";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const share = await prisma.share.findUnique({ where: { token } });
  if (!share || (share.expiresAt && share.expiresAt < new Date())) notFound();

  // Protection par mot de passe : porte de déverrouillage si non validé.
  if (share.passwordHash) {
    const store = await cookies();
    const cookieVal = store.get(unlockCookieName(token))?.value;
    if (!isUnlocked(cookieVal, token, share.passwordHash)) {
      return <SharePasswordGate token={token} />;
    }
  }

  const node = await prisma.node.findFirst({
    where: { id: share.nodeId, trashed: false },
    select: { id: true, name: true, type: true, mimeType: true, size: true, updatedAt: true, content: true },
  });
  if (!node) notFound();

  // Comptabilise l'ouverture du lien (statistiques de partage).
  await prisma.share
    .update({ where: { id: share.id }, data: { views: { increment: 1 }, lastViewedAt: new Date() } })
    .catch(() => {});

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
  const canDownload = share.allowDownload;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="h-16 border-b border-line bg-surface flex items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="size-8 rounded-lg bg-brand-600 grid place-items-center">
            <Cloud className="size-5 text-white" />
          </span>
          FileHub
        </Link>
        {share.expiresAt && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
            <Clock className="size-3.5" /> Expire {formatRelative(share.expiresAt)}
          </span>
        )}
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
            {node.type === "file" && canDownload && (
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
            {node.type === "doc" ? (
              <article
                className="doc-surface prose-share"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(node.content ?? "") || "<p>Document vide.</p>" }}
              />
            ) : node.type === "sheet" || node.type === "chart" || node.type === "draw" ? (
              <div className="py-16 text-center text-muted flex flex-col items-center gap-2">
                <FileWarning className="size-8" />
                Cet élément s'ouvre dans FileHub.
              </div>
            ) : node.type === "file" ? (
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
                    {c.type === "file" && canDownload && (
                      <a
                        href={`${rawUrl}?child=${c.id}&download=1`}
                        className="size-9 grid place-items-center rounded-lg hover:bg-white/5 text-muted"
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
          Partagé via FileHub · {canDownload ? "Lecture & téléchargement" : "Lecture seule"}
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

// Nettoyage minimal du HTML d'un document avant affichage public :
// retire scripts, iframes, gestionnaires d'événements et URLs javascript:.
function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed|link|meta|style)\b[\s\S]*?(<\/\s*\1\s*>|$)/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*/gi, "$1=$2#");
}
