// Utilitaires d'export côté client (PDF via impression, PNG/SVG, données).

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  downloadBlob(filename, new Blob([text], { type: `${mime};charset=utf-8` }));
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

/** Ouvre une fenêtre imprimable (thème clair) → l'utilisateur enregistre en PDF. */
export function openPrintWindow(title: string, bodyHtml: string) {
  const w = window.open("", "_blank", "width=880,height=1000");
  if (!w) { alert("Autorisez les fenêtres pop-up pour exporter en PDF."); return; }
  w.document.write(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#111827;background:#fff;max-width:820px;margin:48px auto;padding:0 28px;line-height:1.65}
      h1,h2,h3,h4{line-height:1.25;margin:1.4em 0 .5em}
      h1{margin-top:0;font-size:1.9rem}
      img{max-width:100%}
      pre{background:#f4f4f5;padding:14px;border-radius:8px;overflow:auto;font-size:.9em}
      code{background:#f4f4f5;padding:2px 5px;border-radius:4px;font-size:.9em}
      pre code{background:none;padding:0}
      table{border-collapse:collapse;width:100%;margin:1em 0}
      th,td{border:1px solid #e5e7eb;padding:7px 11px;text-align:left}
      blockquote{border-left:3px solid #d1d5db;margin:1em 0;padding:.2em 0 .2em 16px;color:#4b5563}
      ul,ol{padding-left:1.4em}
      a{color:#2563eb}
      @media print{body{margin:0;max-width:none;padding:0 8mm}}
    </style></head><body><h1>${escapeHtml(title)}</h1>${bodyHtml}</body></html>`,
  );
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 350);
}

export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

/** Convertit un SVG rendu en PNG (fond sombre, haute résolution). */
export async function svgToPng(svg: SVGSVGElement, scale = 2): Promise<Blob> {
  const xml = serializeSvg(svg);
  const src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = src; });
  const vb = svg.viewBox?.baseVal;
  const w = Math.max(1, Math.round(vb?.width || svg.clientWidth || img.width || 800));
  const h = Math.max(1, Math.round(vb?.height || svg.clientHeight || img.height || 600));
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.fillStyle = "#0b0c11";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Export PNG échoué"))), "image/png"));
}

export const safeFilename = (name: string) => (name || "document").replace(/[^\p{L}\p{N} _-]+/gu, "").trim().slice(0, 80) || "document";
