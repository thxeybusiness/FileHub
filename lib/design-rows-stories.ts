// Modèles — formats verticaux, secteur par secteur.
//
// La story est le format le plus consommé et le plus mal servi : on y recopie
// souvent un post carré, qui se retrouve perdu au milieu de l'écran. Cette
// série écrit pour la verticale — une idée par écran, un texte court, une
// information utile en bas — et couvre les métiers un à un.

import type { Row } from "./design-templates";

export const ROWS_STORIES: Row[] = [

  /* ══════════ Restauration & café ══════════ */

  ["etiquette", "story", "chaud", "Restauration & café", "Story menu du jour", { sur: "AUJOURD'HUI", gros: "16 €", titre: "Entrée, plat\net café", sous: "Du mardi au vendredi, servi jusqu'à 14 h.", meta: "SANS RÉSERVATION" }],
  ["polaroid", "story", "terre", "Restauration & café", "Story arrivage", { sur: "Ce matin", titre: "Le retour\ndu marché", emoji: "🧺", meta: "Capucins, 6 h 20" }],
  ["disque", "story", "vif", "Restauration & café", "Story ouverture du soir", { sur: "Ce soir", titre: "Ouvert\njusqu'à\nminuit", sous: "Cuisine jusqu'à 22 h 30, comptoir jusqu'à minuit.", meta: "8 QUAI VAUBAN" }],
  ["empilement", "story", "clair", "Restauration & café", "Story cinq plats", { titre: "Cinq plats\nà la carte\ncette semaine", sous: "Elle change tous les lundis.", items: ["Velouté de courge", "Joue de bœuf braisée", "Cabillaud, beurre blanc", "Risotto d'épeautre", "Tarte fine aux pommes"], meta: "Réservation conseillée le week-end" }],
  ["bulle", "story", "pastel", "Restauration & café", "Story avis reçu", { sur: "Reçu hier soir", titre: "« On est venus pour un verre, on est repartis trois heures après. »", auteur: "Noé T.", sous: "Vendredi, en terrasse" }],
  ["sablier", "story", "sombre", "Restauration & café", "Story dernier service", { sur: "CE SOIR", titre: "Dernier\nservice\nde la saison", sous: "La terrasse ferme dimanche. Réouverture en avril.", meta: "MERCI POUR CET ÉTÉ" }],

  /* ══════════ Commerce & boutique ══════════ */

  ["pastille", "story", "vif", "Commerce & promotion", "Story remise", { gros: "-30%", sur: "AUJOURD'HUI SEULEMENT", titre: "Sur toute la boutique", meta: "SANS CODE, REMISE AUTOMATIQUE" }],
  ["etiquette", "story", "chic", "Commerce & promotion", "Story pièce unique", { sur: "PIÈCE UNIQUE", gros: "180 €", titre: "Écharpe tissée main,\nlaine mérinos", sous: "Deux mois de travail, une seule pièce.", meta: "DISPONIBLE EN MESSAGE PRIVÉ" }],
  ["progression", "story", "chaud", "Commerce & promotion", "Story stock restant", { sur: "Série limitée", titre: "Il reste\ndouze pièces", gros: "88", sous: "Sur cent. Aucun réassort n'est prévu avant l'automne.", meta: "LIEN EN HAUT DE L'ÉCRAN" }],
  ["carrousel", "story", "tech", "Commerce & promotion", "Story explication de prix", { meta: "3/5", sur: "Le vrai coût", titre: "Pourquoi\nce sac\ncoûte 180 €", sous: "Cuir 61 €, confection 50 €, transport 7 €, atelier 62 €. Aucun distributeur au milieu.", cta: "Écran suivant →" }],
  ["ruban", "story", "chaud", "Commerce & promotion", "Story rupture", { sur: "Information", titre: "ÉPUISÉ", sous: "Parti en quatre heures. Réassort sous trois semaines.", meta: "ALERTE STOCK SUR LA FICHE PRODUIT" }],
  ["mosaique", "story", "pastel", "Commerce & promotion", "Story merci", { titre: "Merci\npour hier", sous: "Trois cents commandes en une journée. On souffle un peu." }],

  /* ══════════ Beauté, coiffure et bien-être ══════════ */

  ["avantapres", "story", "pastel", "Beauté & coiffure", "Story transformation", { titre: "Deux heures\nde travail", sur: "AVANT", cta: "APRÈS", items: ["Longueurs abîmées, aucune forme.", "Base éclaircie, dégradé net."], sous: "Photos non retouchées, même lumière.", meta: "Balayage complet — 110 €" }],
  ["etiquette", "story", "pastel", "Beauté & coiffure", "Story créneau libre", { sur: "CRÉNEAU LIBRE", gros: "14 H", titre: "Une annulation\nce jeudi", sous: "Coupe et brushing, une heure trente.", meta: "PREMIER MESSAGE, PREMIER SERVI" }],
  ["organique", "story", "nature", "Sport & bien-être", "Story respiration", { sur: "Trois minutes", titre: "Inspirez\nquatre temps,\nexpirez six", sous: "Trois fois de suite. C'est tout, et ça suffit souvent.", cta: "À refaire ce soir" }],
  ["progression", "story", "vif", "Sport & bien-être", "Story avancement", { sur: "Défi 30 jours", titre: "Jour 18\nsur 30", gros: "60", sous: "Douze jours restants. Personne n'a abandonné pour l'instant.", meta: "REJOIGNEZ EN COURS DE ROUTE" }],
  ["checklist", "story", "clair", "Sport & bien-être", "Story routine", { sur: "Dix minutes", titre: "La routine\ndu matin", items: ["Deux minutes de respiration", "Trente secondes de gainage", "Vingt fentes alternées", "Quinze pompes", "Une minute d'étirement du dos"], meta: "Enregistrez pour demain" }],

  /* ══════════ Immobilier, artisanat, auto ══════════ */

  ["fiche", "story", "clair", "Immobilier & services", "Story fiche de bien", { titre: "T3 lumineux,\n68 m²", meta: "Chartrons — DPE B — 279 000 €", sur: "POINTS FORTS", sous: "À NOTER", items: ["Balcon plein sud", "Ascenseur et cave", "Charges 92 €/mois", "Pas de parking", "Rue passante", "Façade à ravaler"] }],
  ["ruban", "story", "chaud", "Immobilier & services", "Story vendu", { sur: "Encore un", titre: "VENDU", sous: "Au prix demandé, en dix-neuf jours, sans négociation.", meta: "MERCI POUR VOTRE CONFIANCE" }],
  ["avantapres", "story", "froid", "Artisanat & bâtiment", "Story chantier", { titre: "Dix jours\nde chantier", sur: "AVANT", cta: "APRÈS", items: ["Carrelage de 1978, aucune ventilation.", "Douche à l'italienne, VMC, sol antidérapant."], sous: "6 400 € TTC, sans dépassement.", meta: "Talence, mars 2026" }],
  ["polaroid", "story", "terre", "Artisanat & bâtiment", "Story atelier", { sur: "Atelier", titre: "Trois heures\nsur un assemblage", emoji: "🪚", meta: "Mardi, rue des Forges" }],
  ["etiquette", "story", "sombre", "Auto & mobilité", "Story véhicule", { sur: "OCCASION GARANTIE", gros: "14 900 €", titre: "Berline 2019,\n86 000 km", sous: "Carnet complet, distribution faite, deux jeux de pneus.", meta: "CT DE MOINS D'UN MOIS" }],
  ["checklist", "story", "clair", "Auto & mobilité", "Story avant contrôle", { sur: "Contrôle technique", titre: "Six points\nà vérifier", items: ["Toutes les ampoules", "Niveau de lave-glace", "Pneus et pression", "Essuie-glaces", "Aucun voyant allumé", "Carte grise à bord"], meta: "Six minutes évitent une contre-visite" }],

  /* ══════════ Santé, éducation, associations ══════════ */

  ["cadre", "story", "clair", "Santé & cabinet", "Story fermeture", { sur: "Information", titre: "Cabinet fermé\ndu 3 au 17 août", sous: "Continuité assurée par le Dr Roux, 05 56 00 00 01. Urgences : le 15.", meta: "REPRISE LE 18 AOÛT À 8 H 30" }],
  ["liste", "story", "froid", "Santé & cabinet", "Story prévention", { sur: "Prévention", titre: "Cinq gestes\nqui ne coûtent\nrien", items: ["Dormir sept heures", "Marcher trente minutes", "Limiter l'alcool", "Contrôler sa tension une fois par an", "Consulter au bout de trois semaines"], meta: "Aucun ne demande d'ordonnance" }],
  ["calendrier", "story", "vif", "Éducation & association", "Story réunion", { sur: "JEUDI 10 SEPTEMBRE", gros: "10", titre: "Réunion\nde rentrée", items: ["18 h, salle polyvalente", "Équipe et organisation", "Sorties de l'année", "Verre de l'amitié à 19 h 30"] }],
  ["typo", "story", "vif", "Éducation & association", "Story bénévoles", { titre: "ON A\nBESOIN\nDE VOUS", sous: "Six bénévoles manquent. Deux heures par semaine suffisent.", meta: "PERMANENCE LE SAMEDI, 10 H – 12 H" }],
  ["progression", "story", "vif", "Éducation & association", "Story collecte", { sur: "Collecte", titre: "Pour équiper\nla salle", gros: "64", sous: "Il manque 1 800 € pour le plancher de danse.", meta: "CAGNOTTE EN LIGNE" }],
  ["question", "story", "clair", "Éducation & association", "Story consultation", { sur: "On vous écoute", titre: "Quels horaires\nvous arrangeraient\nle mieux ?", sous: "Votre réponse décide du planning de septembre." }],

  /* ══════════ Culture, voyage, animaux ══════════ */

  ["evenement", "story", "chic", "Culture & spectacle", "Story spectacle", { sur: "Création", titre: "Les Justes", meta: "DU 14 AU 18 NOVEMBRE — 20 H 30", sous: "Théâtre municipal — 1 h 45 sans entracte", cta: "Plein 18 € — moins de 26 ans 8 €" }],
  ["progression", "story", "vif", "Culture & spectacle", "Story places restantes", { sur: "Billetterie", titre: "Il reste\npeu de places", gros: "88", sous: "Douze pour cent des places encore libres pour la première.", meta: "RÉSERVATION EN LIGNE" }],
  ["montagne", "story", "nature", "Voyage & saison", "Story randonnée", { sur: "Ce matin", titre: "Deux heures\nde montée,\nzéro regret", sous: "Col de la Coche, 1 780 m, sous les nuages.", meta: "ITINÉRAIRE EN COMMENTAIRE" }],
  ["soleil", "story", "chaud", "Voyage & saison", "Story ouverture de saison", { sur: "1er avril", titre: "La saison\ncommence", sous: "Camping ouvert jusqu'au 30 octobre, réservations en ligne.", meta: "TARIFS INCHANGÉS DEPUIS 2024" }],
  ["polaroid", "story", "pastel", "Animaux", "Story adoption", { sur: "À adopter", titre: "Roux attend\ndepuis huit mois", emoji: "🐱", meta: "Refuge du Port — 05 56 00 00 00" }],
  ["fiche", "story", "nature", "Animaux", "Story fiche d'adoption", { titre: "Nougat,\ncroisé berger,\n5 ans", meta: "Identifié, vacciné, castré — 250 €", sur: "SON CARACTÈRE", sous: "CE QU'IL LUI FAUT", items: ["Doux, très attaché", "Marche bien en laisse", "Aboie s'il reste seul", "Jardin clôturé 1,60 m", "Deux sorties longues", "Une présence en journée"] }],

  /* ══════════ Tech, emploi, marque ══════════ */

  ["neon", "story", "tech", "Tech & startup", "Story nouvelle version", { gros: "v3", titre: "La version 3 est en ligne", sous: "Deux ans de retours, une interface repensée, aucun surcoût." }],
  ["stats", "story", "tech", "Tech & startup", "Story fiabilité", { sur: "Douze derniers mois", titre: "Trois chiffres\nqu'on publie", items: ["99,97 %|de disponibilité", "11 min|d'arrêt total", "4 h|délai de réponse"], meta: "Historique public sur status.exemple.fr" }],
  ["recrute", "story", "froid", "Emploi & recrutement", "Story offre d'emploi", { sur: "ON RECRUTE", titre: "Chargé·e\nde clientèle", sous: "CDI 35 h — Bordeaux — dès juin", items: ["30 à 34 k€ annoncés", "Deux jours de télétravail", "Trois entretiens maximum"], meta: "Réponse à toute candidature sous cinq jours" }],
  ["chiffre", "story", "tech", "Emploi & recrutement", "Story engagement de réponse", { sur: "Notre engagement", gros: "5", titre: "jours pour répondre à toute candidature", sous: "Y compris quand la réponse est non. Surtout quand elle est non.", cta: "Voir nos offres" }],
  ["monogramme", "story", "chic", "Marque & logo", "Story identité", { gros: "AB", titre: "Atelier Berthier", sous: "MENUISERIE — BORDEAUX" }],
  ["souligne", "story", "clair", "Marque & logo", "Story baseline", { sur: "Notre promesse", titre: "Simple.\nSolide.\nRéparable.", sous: "Trois critères avant de sortir un produit. Aucun n'est négociable.", meta: "atelierberthier.fr" }],

  /* ══════════ Pinterest — formats hauts ══════════ */

  ["checklist", "pin", "clair", "Pinterest", "Épingle check-list de rentrée", { sur: "Septembre", titre: "Ce qu'il faut\navoir fait", items: ["Inscrire à la cantine", "Renouveler l'assurance scolaire", "Prendre les rendez-vous médicaux", "Réinscrire aux activités", "Vérifier les vaccins", "Faire les papiers de garderie", "Poser les dates de Toussaint"], meta: "Ce qui n'est pas fait en septembre se paie en novembre" }],
  ["etapes", "pin", "nature", "Pinterest", "Épingle méthode jardin", { titre: "Démarrer\nun compost", sous: "Quatre étapes, aucun matériel spécifique.", items: ["L'endroit|À l'ombre, en contact avec la terre.", "L'équilibre|Une part d'humide pour une part de sec.", "L'aération|Retourner une fois par mois, pas plus.", "La récolte|Six à neuf mois, quand ça sent la forêt."] }],
  ["recette", "pin", "pastel", "Pinterest", "Épingle recette sucrée — Il vous faut", { titre: "Cookies\nau chocolat", meta: "25 MIN — 16 PIÈCES — TRÈS FACILE", sur: "IL VOUS FAUT", cta: "ON Y VA", items: ["125 g de beurre mou", "150 g de sucre roux", "1 œuf, 220 g de farine", "200 g de chocolat en morceaux", "Crémez beurre et sucre, ajoutez l'œuf.", "Incorporez farine et chocolat, sans insister.", "Formez des boules, espacez-les bien.", "11 min à 180 °C, pas une de plus."], sous: "Ils paraissent crus à la sortie du four. C'est normal, laissez-les refroidir." }],
  ["comparatif", "pin", "clair", "Pinterest", "Épingle comparatif", { titre: "Location\nou achat", sur: "LOUER", cta: "ACHETER", items: ["Aucun apport|Apport de 10 %", "Mobilité immédiate|Frais de revente", "Charges limitées|Travaux à votre charge", "Loyer perdu|Capital constitué", "Rentable si < 5 ans|Rentable si > 7 ans"], meta: "Le seuil dépend surtout de la durée, pas du taux" }],
  ["frise", "pin", "chic", "Pinterest", "Épingle chronologie — Liste de courses", { titre: "Une journée\nde batch cooking", sous: "Trois heures, six repas.", items: ["9 h|Courses et mise en place.", "10 h|Légumes rôtis au four.", "11 h|Céréales et légumineuses.", "12 h|Portionnage et étiquetage.", "12 h 30|Vaisselle, et c'est fini."], meta: "Liste de courses complète dans l'article" }],
  ["grille", "pin", "pastel", "Pinterest", "Épingle six idées", { titre: "Six idées\npour un\npetit balcon", sous: "Trois mètres carrés, orientation nord", items: ["Jardinière haute", "Banc coffre", "Store bateau", "Guirlande solaire", "Treillis grimpant", "Tapis extérieur"], meta: "Sources et budgets dans l'article complet" }],
  ["colonnes", "pin", "clair", "Pinterest", "Épingle article long", { sur: "Article", titre: "Pourquoi\nranger\nne suffit\njamais", sous: "Le rangement échoue quand il lutte contre l'usage.", items: ["Un rangement tient s'il demande moins d'effort que le désordre. Ranger un manteau dans un placard fermé, à l'autre bout du couloir, perdra toujours contre le dossier de chaise. C'est une question de distance, pas de discipline.", "La règle qui marche : rangez chaque chose là où vous vous en servez, même si l'ensemble paraît moins logique vu de loin. Un rangement laid mais tenu vaut mieux qu'un rangement parfait abandonné en trois semaines."], meta: "ARTICLE COMPLET SUR LE BLOG" }],

];
