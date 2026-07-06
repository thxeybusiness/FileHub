"use client";

import { useEffect, useState } from "react";
import { X, Download, Star, Share2 } from "lucide-react";
import type { SerializedNode } from "@/lib/nodes";
import { categoryOf, isPreviewableInline } from "@/lib/filetypes";
import { formatBytes, formatRelative } from "@/lib/utils";
import { NodeIcon } from "./file-icon";

export function PreviewModal({
  node,
  onClose,
  onToggleStar,
  onShare,
}: {
  node: SerializedNode;
  onClose: () => void;
  onToggleStar: (n: SerializedNode) => void;
  onShare: (n: SerializedNode) => void;
}) {
  const cat = categoryOf(node.mimeType, node.name);
  const url = `/api/nodes/${node.id}/raw`;
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (cat === "text" || cat === "code") {
      fetch(url)
        .then((r) => (r.ok ? r.text() : ""))
        .then((t) => setText(t.slice(0, 200_000)))
        .catch(() => setText("Impossible de charger l'aperçu."));
    }
  }, [cat, url]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex flex-col animate-in"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="h-16 shrink-0 flex items-center gap-3 px-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <NodeIcon type={node.type} mimeType={node.mimeType} name={node.name} size={22} />
        <div className="min-w-0">
          <p className="font-medium truncate">{node.name}</p>
          <p className="text-xs text-white/60">
            {formatBytes(node.size)} · {formatRelative(node.updatedAt)}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <IconBtn title="Favori" onClick={() => onToggleStar(node)}>
            <Star className={node.starred ? "fill-yellow-400 text-yellow-400" : ""} />
          </IconBtn>
          <IconBtn title="Partager" onClick={() => onShare(node)}>
            <Share2 />
          </IconBtn>
          <a
            href={`${url}?download=1`}
            className="size-10 grid place-items-center rounded-full hover:bg-white/10 text-white"
            title="Télécharger"
          >
            <Download className="size-5" />
          </a>
          <IconBtn title="Fermer" onClick={onClose}>
            <X />
          </IconBtn>
        </div>
      </div>

      {/* Body */}
      <div
        className="flex-1 min-h-0 grid place-items-center p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {cat === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={node.name} className="max-h-full max-w-full rounded-lg object-contain" />
        )}
        {cat === "video" && (
          <video src={url} controls className="max-h-full max-w-full rounded-lg" />
        )}
        {cat === "audio" && (
          <div className="bg-surface rounded-2xl p-8 w-full max-w-md">
            <audio src={url} controls className="w-full" />
          </div>
        )}
        {cat === "pdf" && (
          <iframe src={url} className="w-full h-full bg-white rounded-lg" title={node.name} />
        )}
        {(cat === "text" || cat === "code") && (
          <pre className="w-full max-w-4xl h-full overflow-auto bg-surface rounded-xl p-5 text-sm leading-relaxed">
            {text ?? "Chargement…"}
          </pre>
        )}
        {!isPreviewableInline(cat) && (
          <div className="text-center text-white/80">
            <NodeIcon type={node.type} mimeType={node.mimeType} name={node.name} size={72} />
            <p className="mt-4">Aperçu indisponible pour ce type de fichier.</p>
            <a
              href={`${url}?download=1`}
              className="inline-flex items-center gap-2 mt-4 h-10 px-5 rounded-xl bg-white text-[#07070c] font-medium"
            >
              <Download className="size-4" /> Télécharger
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="size-10 grid place-items-center rounded-full hover:bg-white/10 text-white [&_svg]:size-5"
    >
      {children}
    </button>
  );
}
