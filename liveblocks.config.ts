// Configuration Liveblocks (temps réel). Activé uniquement si la variable
// publique NEXT_PUBLIC_LIVEBLOCKS_ENABLED vaut "1" ET que la clé secrète
// LIVEBLOCKS_SECRET_KEY est définie côté serveur. Sinon, l'application
// retombe automatiquement sur la synchronisation par heartbeat.
import "@liveblocks/client";

declare global {
  interface Liveblocks {
    // État de présence partagé (curseur + position du curseur texte).
    Presence: {
      cursor: { x: number; y: number } | null;
      caret: number | null;
    };
    // Infos utilisateur injectées par le point d'authentification serveur.
    UserMeta: {
      id: string;
      info: { name: string; color: string };
    };
  }
}

export const LIVE_ENABLED = process.env.NEXT_PUBLIC_LIVEBLOCKS_ENABLED === "1";
export const roomId = (nodeId: string) => `filehub:node:${nodeId}`;

// Déclenche le build de production.
