"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { LiveblocksProvider, RoomProvider, useOthers, useRoom } from "@liveblocks/react";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import * as Y from "yjs";
import { LIVE_ENABLED, roomId } from "@/liveblocks.config";
import { useCollab, type Peer } from "./use-collab";

export type Actions = { markEditing: () => void; syncVersion: (v: string) => void };

type Props = {
  id: string;
  shared: boolean;
  mode: "text" | "blob";
  /** Contenu sérialisé courant (déclenche l'envoi des modifications locales). */
  content: string;
  /** Applique un contenu distant (chaîne sérialisée). Doit être stable. */
  onRemote: (str: string) => void;
  /** Récupération distante en mode repli (heartbeat). */
  fetchRemote: () => void | Promise<void>;
  setPeers: (p: Peer[]) => void;
  actions: MutableRefObject<Actions>;
};

// Choisit le moteur : Liveblocks (temps réel) si activé + document partagé,
// sinon repli par heartbeat. Rendu conditionnel de composants (pas de hooks
// conditionnels) → conforme aux règles des hooks.
export function RealtimeEngine(props: Props) {
  if (LIVE_ENABLED && props.shared) {
    return (
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <RoomProvider id={roomId(props.id)} initialPresence={{ cursor: null, caret: null }}>
          <LiveEngine {...props} />
        </RoomProvider>
      </LiveblocksProvider>
    );
  }
  return <PollEngine {...props} />;
}

// Repli : heartbeat de présence + tirage du contenu distant.
function PollEngine({ id, shared, fetchRemote, setPeers, actions }: Props) {
  const { peers, markEditing, syncVersion } = useCollab(id, shared, fetchRemote);
  useEffect(() => { setPeers(peers); }, [peers, setPeers]);
  useEffect(() => { actions.current = { markEditing, syncVersion }; }, [markEditing, syncVersion, actions]);
  return null;
}

// Temps réel : présence Liveblocks + synchronisation Yjs (fusion CRDT).
function LiveEngine({ mode, content, onRemote, setPeers, actions }: Props) {
  const others = useOthers();
  const room = useRoom();
  const docRef = useRef<Y.Doc | null>(null);
  const textRef = useRef<Y.Text | null>(null);
  const mapRef = useRef<Y.Map<string> | null>(null);
  const applying = useRef(false);
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; }, [content]);

  // Pastilles des collaborateurs présents.
  useEffect(() => {
    setPeers(
      others.map((o) => ({
        userId: String(o.connectionId),
        name: o.info?.name ?? "Invité",
        color: o.info?.color ?? "#8aa2ff",
        editing: o.presence?.caret != null,
      })),
    );
  }, [others, setPeers]);

  // En temps réel, la synchro passe par Yjs : markEditing/syncVersion no-op.
  useEffect(() => { actions.current = { markEditing: () => {}, syncVersion: () => {} }; }, [actions]);

  // Liaison Yjs ⇄ contenu du document.
  useEffect(() => {
    const provider = getYjsProviderForRoom(room);
    const doc = provider.getYDoc();
    docRef.current = doc;

    if (mode === "text") {
      const ytext = doc.getText("content");
      textRef.current = ytext;
      const seed = () => {
        if (ytext.length === 0 && contentRef.current) {
          doc.transact(() => ytext.insert(0, contentRef.current));
        } else if (ytext.toString() !== contentRef.current) {
          applying.current = true; onRemote(ytext.toString()); applying.current = false;
        }
      };
      const obs = () => {
        if (applying.current) return;
        applying.current = true; onRemote(ytext.toString()); applying.current = false;
      };
      ytext.observe(obs);
      const t = setTimeout(seed, 700);
      try { provider.on("synced", seed); } catch { /* selon version */ }
      return () => { ytext.unobserve(obs); clearTimeout(t); try { provider.off("synced", seed); } catch { /* ignore */ } };
    }

    const ymap = doc.getMap<string>("blob");
    mapRef.current = ymap;
    const seed = () => {
      const cur = ymap.get("content");
      if (cur == null && contentRef.current) doc.transact(() => ymap.set("content", contentRef.current));
      else if (cur != null && cur !== contentRef.current) { applying.current = true; onRemote(cur); applying.current = false; }
    };
    const obs = () => {
      if (applying.current) return;
      const cur = ymap.get("content");
      if (cur != null && cur !== contentRef.current) { applying.current = true; onRemote(cur); applying.current = false; }
    };
    ymap.observe(obs);
    const t = setTimeout(seed, 700);
    try { provider.on("synced", seed); } catch { /* ignore */ }
    return () => { ymap.unobserve(obs); clearTimeout(t); try { provider.off("synced", seed); } catch { /* ignore */ } };
  }, [room, mode, onRemote]);

  // Envoi des modifications locales vers Yjs.
  useEffect(() => {
    if (applying.current) return;
    const doc = docRef.current;
    if (!doc) return;
    if (mode === "text") {
      const ytext = textRef.current;
      if (!ytext) return;
      const old = ytext.toString();
      if (old === content) return;
      // Diff minimal (préfixe + suffixe communs) → insertions/suppressions ciblées.
      const minLen = Math.min(old.length, content.length);
      let p = 0;
      while (p < minLen && old[p] === content[p]) p++;
      let s = 0;
      while (s < minLen - p && old[old.length - 1 - s] === content[content.length - 1 - s]) s++;
      const del = old.length - p - s;
      const ins = content.slice(p, content.length - s);
      doc.transact(() => { if (del > 0) ytext.delete(p, del); if (ins) ytext.insert(p, ins); });
    } else {
      const ymap = mapRef.current;
      if (!ymap || ymap.get("content") === content) return;
      doc.transact(() => ymap.set("content", content));
    }
  }, [content, mode]);

  return null;
}
