"use client";

import { useActionState } from "react";
import Link from "next/link";
import { HardDrive, Loader2 } from "lucide-react";
import { loginAction, signupAction, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <HardDrive className="size-6" />
          FileHub
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Votre espace de fichiers,
            <br /> réinventé.
          </h1>
          <p className="text-brand-100 text-lg max-w-md">
            Stockez, organisez, prévisualisez et partagez. Rapide, moderne et
            pensé pour vous faire gagner du temps.
          </p>
        </div>
        <div className="flex gap-6 text-sm text-brand-100">
          <span>Upload glisser-déposer</span>
          <span>Aperçu instantané</span>
          <span>Partage sécurisé</span>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 text-xl font-semibold mb-8">
            <HardDrive className="size-6 text-brand-600" />
            FileHub
          </div>
          <h2 className="text-2xl font-bold">
            {mode === "login" ? "Bon retour 👋" : "Créer votre compte"}
          </h2>
          <p className="text-muted mt-1 mb-8">
            {mode === "login"
              ? "Connectez-vous pour accéder à vos fichiers."
              : "Quelques secondes et c'est parti."}
          </p>

          <form action={formAction} className="space-y-4">
            {mode === "signup" && (
              <Field
                label="Nom"
                name="name"
                type="text"
                placeholder="Votre nom"
                autoComplete="name"
              />
            )}
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="vous@exemple.com"
              autoComplete="email"
              required
            />
            <Field
              label="Mot de passe"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />

            {state?.error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full h-11 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          <p className="text-sm text-muted mt-6 text-center">
            {mode === "login" ? (
              <>
                Pas encore de compte ?{" "}
                <Link href="/signup" className="text-brand-600 font-medium hover:underline">
                  Inscrivez-vous
                </Link>
              </>
            ) : (
              <>
                Déjà inscrit ?{" "}
                <Link href="/login" className="text-brand-600 font-medium hover:underline">
                  Connectez-vous
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        {...props}
        className="mt-1.5 w-full h-11 rounded-xl border border-line bg-white px-3.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
      />
    </label>
  );
}
