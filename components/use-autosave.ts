"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "saved" | "saving" | "idle" | "error";

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Sauvegarde automatique fiable, y compris sur mobile.
 *
 * PROBLÈME RÉSOLU : une sauvegarde simplement « différée » (setTimeout) est
 * PERDUE quand la page disparaît avant l'échéance — téléphone verrouillé,
 * changement d'application, onglet fermé ou évincé par le système. L'utilisateur
 * voit « Enregistrement… » et croit son travail sauvegardé, alors que rien n'est
 * jamais parti. C'est le cas typique d'une modification faite depuis un mobile.
 *
 * Ce hook garantit l'écriture :
 *  • il diffère l'envoi (regroupe les frappes) comme avant ;
 *  • mais il VIDE IMMÉDIATEMENT la file d'attente dès que la page est masquée
 *    (`visibilitychange`) ou déchargée (`pagehide`), ainsi qu'au démontage ;
 *  • ces envois de dernière minute utilisent `keepalive`, ce qui demande au
 *    navigateur de terminer la requête même si la page est en train de mourir ;
 *  • en cas d'échec, la modification reste marquée « à envoyer » et sera
 *    réessayée à la prochaine frappe ou au prochain masquage.
 */
export function useAutosave<T>(
  save: (payload: T, keepalive: boolean) => Promise<{ updatedAt?: string } | void>,
  options?: { delay?: number; onSaved?: (updatedAt?: string) => void },
) {
  const delay = options?.delay ?? 550;

  const [state, setState] = useState<SaveState>("saved");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<T | null>(null); // dernière charge utile non confirmée
  const inflight = useRef(false);

  // Refs sur les callbacks : le hook ne doit pas se reconfigurer à chaque rendu.
  const saveRef = useRef(save);
  const savedRef = useRef(options?.onSaved);
  useEffect(() => { saveRef.current = save; }, [save]);
  useEffect(() => { savedRef.current = options?.onSaved; }, [options?.onSaved]);

  /** Envoie tout de suite ce qui est en attente. */
  const flush = useCallback((keepalive = false) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const payload = pending.current;
    if (payload === null) return;
    // On garde la charge utile jusqu'à confirmation : si l'envoi échoue, elle
    // sera réessayée (rien n'est perdu silencieusement).
    if (inflight.current && !keepalive) return;
    inflight.current = true;
    setState("saving");
    Promise.resolve(saveRef.current(payload, keepalive))
      .then((r) => {
        // Une frappe survenue pendant l'envoi a pu remplacer la charge utile :
        // on ne considère « enregistré » que si rien de plus récent n'attend.
        if (pending.current === payload) {
          pending.current = null;
          setState("saved");
        }
        savedRef.current?.((r as { updatedAt?: string } | undefined)?.updatedAt);
      })
      .catch(() => setState("error")) // charge utile conservée → réessai
      .finally(() => { inflight.current = false; });
  }, []);

  /**
   * Programme une sauvegarde (regroupe les frappes rapprochées).
   *
   * Les modifications successives sont FUSIONNÉES : modifier le contenu puis
   * renommer dans la foulée envoie bien les deux, au lieu que le second
   * remplace le premier (perte silencieuse).
   */
  const schedule = useCallback((payload: T) => {
    const prev = pending.current;
    pending.current =
      isPlainObject(prev) && isPlainObject(payload)
        ? ({ ...prev, ...payload } as T)
        : payload;
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; flush(false); }, delay);
  }, [delay, flush]);

  // Filet de sécurité : page masquée / déchargée / composant démonté.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flush(true); };
    const onPageHide = () => flush(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      flush(true); // navigation interne : on n'abandonne rien
    };
  }, [flush]);

  /** Vrai s'il reste une modification non confirmée. */
  const isDirty = useCallback(() => pending.current !== null, []);

  return { state, setState, schedule, flush, isDirty };
}
