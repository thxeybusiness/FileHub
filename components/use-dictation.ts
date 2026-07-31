"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dictée vocale via l'API Web Speech du navigateur.
 *
 * Aucun service externe, aucune clé d'API, aucun coût : c'est le navigateur
 * qui transcrit (Chrome/Edge via Google, Safari via Apple). L'audio ne transite
 * jamais par nos serveurs — nous ne sommes donc pas responsables de traitement
 * sur cette donnée vocale.
 *
 * Deux règles structurent ce hook :
 *  1. Seul le texte VALIDÉ (`isFinal`) est remonté à l'éditeur. Le texte
 *     provisoire reste local (voir `interim`) : s'il entrait dans l'état du
 *     document, il partirait en base et serait diffusé aux collaborateurs
 *     avant d'être réécrit à chaque correction du moteur.
 *  2. Le mode continu est relancé automatiquement, car le moteur s'arrête de
 *     lui-même après un silence — sinon la dictée se coupe en pleine phrase.
 */

/* L'API Web Speech n'est pas décrite par les définitions TypeScript standard.
   On type donc uniquement ce que l'on utilise (même approche que le typage
   local de `BeforeInstallPromptEvent` dans install-button.tsx). */
type SpeechAlternative = { transcript: string };
type SpeechResult = { isFinal: boolean; 0: SpeechAlternative };
type SpeechResultList = { length: number; [index: number]: SpeechResult };
type SpeechEvent = { resultIndex: number; results: SpeechResultList };
type SpeechErrorEvent = { error: string };

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ s'annonce comme un Mac : on le distingue au nombre de points
  // de contact.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

// Même test que le bouton d'installation : mode application (manifeste
// `display: standalone`) ou écran d'accueil iOS (`navigator.standalone`).
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * PIÈGE iOS — la raison d'être de cette fonction.
 *
 * Dans une PWA installée sur iPhone/iPad, WebKit EXPOSE bien l'objet
 * `webkitSpeechRecognition`, mais `start()` ne produit jamais rien : ni
 * résultat, ni erreur, ni fin. Une détection fondée sur la seule présence de
 * l'API afficherait donc un bouton qui ne fait rien, sans le moindre message.
 *
 * On exclut explicitement ce contexte. Sur iPhone/iPad en application
 * installée, la dictée reste disponible : c'est celle du clavier système
 * (touche micro), qui écrit dans le champ via les événements de saisie
 * habituels — donc compatible avec la sauvegarde automatique et la
 * collaboration, sans une ligne de code de notre côté.
 */
export function dictationSupported(): boolean {
  return recognitionCtor() !== null && !(isIos() && isStandalone());
}

export type DictationStatus = "idle" | "listening" | "denied" | "error";

export function useDictation({
  onFinal,
  lang = "fr-FR",
}: {
  /** Reçoit uniquement le texte validé, à insérer dans le document. */
  onFinal: (text: string) => void;
  lang?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [interim, setInterim] = useState("");

  const recRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false); // l'utilisateur veut-il toujours dicter ?
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref sur le callback : le hook ne doit pas se reconfigurer à chaque rendu
  // (le point d'insertion change à chaque frappe).
  const onFinalRef = useRef(onFinal);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  // Détection APRÈS montage : le rendu serveur ne connaît ni le navigateur ni
  // le mode d'affichage. La calculer pendant le rendu provoquerait un écart
  // d'hydratation.
  useEffect(() => { setSupported(dictationSupported()); }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    if (restartTimer.current) { clearTimeout(restartTimer.current); restartTimer.current = null; }
    try { recRef.current?.stop(); } catch { /* déjà arrêtée */ }
    recRef.current = null;
    setInterim("");
    setActive(false);
    setStatus((s) => (s === "denied" || s === "error" ? s : "idle"));
  }, []);

  const start = useCallback(() => {
    if (wantRef.current) return;
    const Ctor = recognitionCtor();
    if (!Ctor) { setStatus("error"); return; }

    const rec = new Ctor();
    rec.lang = lang;
    // Sans le mode continu, la reconnaissance s'arrête à la première pause :
    // l'utilisateur réfléchit deux secondes et le micro se coupe.
    rec.continuous = true;
    // Résultats provisoires demandés, mais affichés LOCALEMENT seulement.
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setStatus("listening");

    rec.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r?.[0]?.transcript ?? "";
        if (r?.isFinal) {
          const clean = text.trim();
          if (clean) onFinalRef.current(clean);
        } else {
          pending += text;
        }
      }
      setInterim(pending);
    };

    rec.onerror = (e) => {
      // « no-speech » et « aborted » sont bénins : `onend` relancera.
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantRef.current = false;
        setStatus("denied");
        setActive(false);
      } else if (e.error === "audio-capture") {
        wantRef.current = false;
        setStatus("error");
        setActive(false);
      }
    };

    rec.onend = () => {
      setInterim("");
      if (!wantRef.current) {
        setActive(false);
        setStatus((s) => (s === "denied" || s === "error" ? s : "idle"));
        return;
      }
      // Relance : le moteur se termine tout seul après un silence prolongé.
      // Sans cela, la dictée s'arrête sans prévenir au bout de quelques
      // secondes et l'utilisateur croit que la fonctionnalité est cassée.
      restartTimer.current = setTimeout(() => {
        try { rec.start(); } catch { /* déjà relancée */ }
      }, 150);
    };

    recRef.current = rec;
    wantRef.current = true;
    setActive(true);
    setStatus("listening");
    try {
      rec.start();
    } catch {
      wantRef.current = false;
      recRef.current = null;
      setActive(false);
      setStatus("error");
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (wantRef.current) stop(); else start();
  }, [start, stop]);

  // Page masquée (changement d'app, téléphone verrouillé) : on coupe le micro
  // plutôt que de laisser une écoute active en arrière-plan.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") stop(); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [stop]);

  // Démontage : on coupe sans attendre la fin de la reconnaissance en cours.
  useEffect(() => {
    return () => {
      wantRef.current = false;
      if (restartTimer.current) clearTimeout(restartTimer.current);
      try { recRef.current?.abort(); } catch { /* ignore */ }
    };
  }, []);

  return { supported, active, status, interim, start, stop, toggle };
}
