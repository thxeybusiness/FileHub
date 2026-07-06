# FileHub ☁️

Un **Google Drive moderne** — stockez, organisez, prévisualisez et partagez vos
fichiers. Construit avec Next.js 16 (App Router), React 19, Prisma et Tailwind v4.

## ✨ Fonctionnalités

- 🔐 **Authentification** par email / mot de passe (sessions signées, httpOnly)
- ⬆️ **Import glisser-déposer** multi-fichiers avec barre de progression
- 📁 **Dossiers imbriqués** + fil d'Ariane (breadcrumb) de navigation
- 🔎 **Recherche instantanée** dans tout le Drive
- 🗂️ **Vues grille & liste** (préférence mémorisée)
- ⭐ **Favoris**, ♻️ **Corbeille** avec restauration et suppression définitive
- 👁️ **Aperçu intégré** : images, vidéos, audio, PDF, texte et code
- 🔗 **Partage par lien public** (fichier ou dossier, lecture seule)
- 📊 **Quota de stockage** visuel (15 Go par défaut)
- ⬇️ Téléchargement, renommage, déplacement, suppression

## 🚀 Démarrage

```bash
npm install          # installe les dépendances + génère Prisma
npm run db:push      # crée la base SQLite (dev.db)
npm run dev          # démarre sur http://localhost:3000
```

Créez un compte sur `/signup`, puis importez vos premiers fichiers.

## 🏗️ Architecture

| Couche | Détail |
| --- | --- |
| **Framework** | Next.js 16 (App Router, route handlers, server actions) |
| **UI** | React 19 + Tailwind CSS v4 + lucide-react |
| **Données** | Prisma — SQLite en dev, migrable vers PostgreSQL |
| **Auth** | Cookie de session signé HMAC-SHA256 (`lib/auth.ts`) |
| **Stockage fichiers** | Abstraction `lib/storage.ts` — disque local en dev, |
| | swappable vers S3 / Vercel Blob / R2 en production |

### Modèle de données

Un seul modèle `Node` représente **fichiers et dossiers** (arbre via `parentId`),
ce qui simplifie déplacement, listing et breadcrumb. Voir `prisma/schema.prisma`.

## 🔁 Passage en production

1. `datasource db` → `provider = "postgresql"` et pointer `DATABASE_URL` vers Postgres.
2. Implémenter l'interface `Storage` de `lib/storage.ts` avec votre backend objet
   (S3 / Vercel Blob), puis exporter cette implémentation.
3. Définir un `AUTH_SECRET` fort en variable d'environnement.

## 🗺️ Suite (roadmap « 100x »)

Versions de fichiers · commentaires · aperçu Office · recherche plein-texte /
OCR · corbeille auto-purge · dossiers partagés collaboratifs · glisser-déposer
pour réorganiser · thèmes clair/sombre.
