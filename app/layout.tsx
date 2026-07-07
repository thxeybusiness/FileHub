import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "FileHub — votre espace de fichiers moderne",
  description:
    "FileHub : stockez, organisez, prévisualisez et partagez vos fichiers. Un Drive moderne, rapide et complet.",
  manifest: "/manifest.webmanifest",
  // « default » réserve l'espace de la barre d'état iOS (pas de chevauchement).
  // « black-translucent » + viewport-fit=cover faisaient passer le contenu SOUS
  // la barre d'état de l'iPhone -> en-têtes tronqués.
  appleWebApp: { capable: true, statusBarStyle: "default", title: "FileHub" },
  // Le favicon de l'onglet vient des conventions App Router (app/favicon.ico +
  // app/icon.svg). On ne garde ici que l'icône « Ajouter à l'écran d'accueil »
  // iOS pour éviter un <link rel="icon"> concurrent qui prenait le dessus.
  icons: { apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#07070c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
