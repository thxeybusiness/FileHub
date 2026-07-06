import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FileHub — votre espace de fichiers moderne",
  description:
    "FileHub : stockez, organisez, prévisualisez et partagez vos fichiers. Un Drive moderne, rapide et complet.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
