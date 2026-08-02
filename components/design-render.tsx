"use client";

// Rendu visuel PUR des calques du studio Design — partagé par l'éditeur,
// les aperçus (galerie, modèles) et tout autre affichage statique.
// Le canvas d'export (lib/design.ts → rasterize) réplique exactement ces règles.

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  type DesignDoc, type Layer, type GradientFill,
  shapePath, filterCss, shadowCss, backgroundCss,
  linearGradientPoints, radialGradientRadius,
} from "@/lib/design";
import { elementSvgByRef } from "@/lib/design-elements";

/* ── Contenu visuel d'un calque (remplit 100 % de sa boîte) ── */
export function LayerVisual({ layer: l }: { layer: Layer }) {
  const uid = useId();

  // Élément de bibliothèque : SVG monochrome reconstruit avec la couleur (ou
  // le dégradé) du calque, étiré dans sa boîte — même règle que l'export.
  const elementSrc = useMemo(() => {
    if (l.type !== "element") return null;
    const svg = elementSvgByRef(l.ref, l.fill, l.gradient);
    return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
  }, [l.type === "element" ? l.ref : "", l.type === "element" ? l.fill : "", l.type === "element" ? JSON.stringify(l.gradient) : ""]); // eslint-disable-line react-hooks/exhaustive-deps

  if (l.type === "element") {
    return elementSrc ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={elementSrc} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
    ) : (
      <div style={{ width: "100%", height: "100%", border: "2px dashed rgba(148,163,184,0.4)", borderRadius: 8 }} />
    );
  }

  if (l.type === "shape") {
    const gid = `g-${uid}`;
    const d = shapePath(l.shape, l.w, l.h, l.radius);
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(1, l.w)} ${Math.max(1, l.h)}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
        {l.gradient && <GradientDef id={gid} g={l.gradient} w={l.w} h={l.h} />}
        <path
          d={d}
          fill={l.gradient ? `url(#${gid})` : l.fill === "transparent" ? "none" : l.fill}
          fillRule="evenodd"
          stroke={l.strokeWidth > 0 ? l.stroke : "none"}
          strokeWidth={l.strokeWidth}
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (l.type === "line") {
    const sw = l.strokeWidth;
    const dash = l.dash === "dashed" ? `${sw * 3} ${sw * 2}` : l.dash === "dotted" ? `0.01 ${sw * 2.2}` : undefined;
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(1, l.w)} ${Math.max(1, l.h)}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
        <line x1={0} y1={l.h / 2} x2={l.w} y2={l.h / 2} stroke={l.stroke} strokeWidth={sw} strokeLinecap="round" strokeDasharray={dash} />
      </svg>
    );
  }

  if (l.type === "image") {
    return l.src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={l.src}
        alt=""
        draggable={false}
        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: l.radius, filter: filterCss(l.filters), display: "block" }}
      />
    ) : (
      <div style={{ width: "100%", height: "100%", background: "rgba(148,163,184,0.18)", display: "grid", placeItems: "center", color: "#94a3b8", fontSize: 13, borderRadius: l.radius }}>
        Image
      </div>
    );
  }

  // texte
  return <div style={textStyle(l)}>{l.text || " "}</div>;
}

export function textStyle(l: Extract<Layer, { type: "text" }>): React.CSSProperties {
  return {
    width: "100%",
    minHeight: "100%",
    color: l.color,
    fontFamily: l.fontFamily,
    fontSize: l.fontSize,
    fontWeight: l.fontWeight,
    fontStyle: l.italic ? "italic" : "normal",
    textDecoration: l.underline ? "underline" : "none",
    textTransform: l.uppercase ? "uppercase" : "none",
    textAlign: l.align,
    lineHeight: l.lineHeight,
    letterSpacing: l.letterSpacing,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflow: "visible",
    outline: "none",
    WebkitTextStroke: l.strokeWidth > 0 ? `${l.strokeWidth}px ${l.strokeColor}` : undefined,
    paintOrder: "stroke fill",
  };
}

function GradientDef({ id, g, w, h }: { id: string; g: GradientFill; w: number; h: number }) {
  if (g.type === "radial") {
    return (
      <defs>
        <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={w / 2} cy={h / 2} r={radialGradientRadius(w, h)}>
          <stop offset="0%" stopColor={g.from} />
          <stop offset="100%" stopColor={g.to} />
        </radialGradient>
      </defs>
    );
  }
  const p = linearGradientPoints(g.angle, w, h);
  return (
    <defs>
      <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}>
        <stop offset="0%" stopColor={g.from} />
        <stop offset="100%" stopColor={g.to} />
      </linearGradient>
    </defs>
  );
}

/* ── Boîte positionnée d'un calque (transformations communes DOM/export) ── */
export function layerBoxStyle(l: Layer): React.CSSProperties {
  const flip = `${l.flipX ? " scaleX(-1)" : ""}${l.flipY ? " scaleY(-1)" : ""}`;
  const sh = shadowCss(l.shadow);
  return {
    position: "absolute",
    left: l.x,
    top: l.y,
    width: l.w,
    height: l.h,
    transform: `rotate(${l.rotation}deg)${flip}`,
    transformOrigin: "center",
    opacity: l.opacity,
    mixBlendMode: l.blend as React.CSSProperties["mixBlendMode"],
    visibility: l.visible ? "visible" : "hidden",
    filter: sh || undefined,
  };
}

/* ── Aperçu statique d'un document complet (galerie, modèles) ── */
export function DocPreview({ doc, className = "", rounded = 8 }: { doc: DesignDoc; className?: string; rounded?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / doc.width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc.width]);

  const transparent = !doc.backgroundGradient && doc.background === "transparent";
  return (
    <div
      ref={ref}
      className={className}
      style={{ position: "relative", width: "100%", aspectRatio: `${doc.width} / ${doc.height}`, overflow: "hidden", borderRadius: rounded }}
    >
      {scale > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: doc.width,
            height: doc.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background: transparent
              ? "repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 50% / 20px 20px"
              : backgroundCss(doc.background, doc.backgroundGradient),
          }}
        >
          {doc.layers.map((l) => (
            <div key={l.id} style={layerBoxStyle(l)}>
              <LayerVisual layer={l} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
