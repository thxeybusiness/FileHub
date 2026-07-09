"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export type Peer = { userId: string; name: string; color: string; editing: boolean };

/**
 * Collaboration temps réel par heartbeat (compatible serverless / Vercel).
 * - `enabled` : n'active la synchro que dans les espaces communs.
 * - `onRemote(version)` : appelé quand un collaborateur a modifié le document
 *   (le composant doit alors récupérer le contenu à jour).
 * Retourne la liste des autres collaborateurs présents et deux utilitaires :
 * - `markEditing()` : signale que l'utilisateur est en train de saisir.
 * - `syncVersion(v)` : enregistre la version issue de nos propres sauvegardes
 *   pour ne pas la confondre avec un changement distant.
 */
export function useCollab(id: string, enabled: boolean, onRemote: (version: string) => void) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const editingRef = useRef(false);
  const editTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVersion = useRef<string | null>(null);
  const onRemoteRef = useRef(onRemote);
  useEffect(() => { onRemoteRef.current = onRemote; }, [onRemote]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const beat = async () => {
      try {
        const res = await api.collab(id, { editing: editingRef.current });
        if (!alive) return;
        setPeers(res.peers ?? []);
        if (res.updatedAt) {
          if (lastVersion.current !== null && res.updatedAt !== lastVersion.current) {
            onRemoteRef.current(res.updatedAt);
          }
          lastVersion.current = res.updatedAt;
        }
      } catch { /* silencieux : réseau instable, on réessaiera */ }
    };
    beat();
    const iv = setInterval(beat, 3500);
    const onVis = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      api.collab(id, { leave: true }).catch(() => {});
    };
  }, [id, enabled]);

  const markEditing = useCallback(() => {
    editingRef.current = true;
    if (editTimer.current) clearTimeout(editTimer.current);
    editTimer.current = setTimeout(() => { editingRef.current = false; }, 2500);
  }, []);

  const syncVersion = useCallback((v: string) => { lastVersion.current = v; }, []);

  return { peers, markEditing, syncVersion };
}
