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
# Renseignez DATABASE_URL (PostgreSQL) dans .env — voir .env.example
npm install          # installe les dépendances + génère Prisma
npm run db:push      # crée les tables filehub_* dans la base
npm run dev          # démarre sur http://localhost:3000
```

Créez un compte sur `/signup`, puis importez vos premiers fichiers.

## 🏗️ Architecture

| Couche | Détail |
| --- | --- |
| **Framework** | Next.js 16 (App Router, route handlers, server actions) |
| **UI** | React 19 + Tailwind CSS v4 + lucide-react |
| **Données** | Prisma + PostgreSQL |
| **Auth** | Cookie de session signé HMAC (secret dérivé de `DATABASE_URL`) |
| **Stockage fichiers** | Octets stockés **dans PostgreSQL** (table `filehub_blob`) — |
| | aucune ressource de stockage objet à provisionner |

> Toutes les tables sont préfixées `filehub_` (via `@@map`) : FileHub peut donc
> **partager une base** avec une autre application sans le moindre risque de
> collision — Prisma ne touche jamais qu'aux tables `filehub_*`.

### Modèle de données

Un seul modèle `Node` représente **fichiers et dossiers** (arbre via `parentId`),
ce qui simplifie déplacement, listing et breadcrumb. Voir `prisma/schema.prisma`.

## 🔁 Déploiement (Vercel)

Une **seule** variable est nécessaire : `DATABASE_URL` (PostgreSQL). Le build
Vercel (`vercel.json`) lance `prisma db push` automatiquement pour créer les
tables `filehub_*`, et reste résilient si la base n'est pas encore branchée.

1. Renseigner `DATABASE_URL` dans les variables d'environnement du projet Vercel.
2. (Optionnel) Définir `AUTH_SECRET` ; sinon il est dérivé de `DATABASE_URL`.

## 🗺️ Suite (roadmap « 100x »)

Versions de fichiers · commentaires · aperçu Office · recherche plein-texte /
OCR · corbeille auto-purge · dossiers partagés collaboratifs · glisser-déposer
pour réorganiser · thèmes clair/sombre.
