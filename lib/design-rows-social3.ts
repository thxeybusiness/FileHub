// Modèles — publications sociales, secteur par secteur.
//
// Chaque métier a ses publications récurrentes : le garage annonce ses
// créneaux, le fleuriste ses arrivages, le cabinet ses fermetures. Cette série
// donne à chacun de quoi tenir un compte sans repartir d'une page blanche
// chaque semaine, avec des textes déjà écrits pour son activité.

import type { Row } from "./design-templates";

export const ROWS_SOCIAL3: Row[] = [

  /* ══════════ Restauration & café ══════════ */

  ["polaroid", "carre", "terre", "Restauration & café", "Coulisses du fournil", { sur: "5 h 40", titre: "La première\nfournée", emoji: "🥖", meta: "Avant que la rue se réveille" }],
  ["etiquette", "story", "chaud", "Restauration & café", "Story plat du jour", { sur: "AUJOURD'HUI", gros: "14 €", titre: "Joue de bœuf braisée,\npurée de céleri", sous: "Entrée + plat 18 €", meta: "SERVI JUSQU'À 14 H" }],
  ["question", "carre", "chaud", "Restauration & café", "Sondage sur la carte", { sur: "On hésite", titre: "Le risotto\nreste ou\nil sort ?", sous: "Il est sur la carte depuis deux ans. Dites-nous franchement." }],
  ["temoignage", "carre", "pastel", "Restauration & café", "Avis mis en avant", { emoji: "🍷", titre: "« On est venus pour un verre, on est repartis trois heures après. »", auteur: "Noé T.", sous: "Vendredi soir, en terrasse" }],
  ["ruban", "story", "chaud", "Restauration & café", "Story complet", { sur: "Ce soir", titre: "COMPLET", sous: "Plus une table ce soir. Il reste de la place demain midi et jeudi soir.", meta: "05 56 00 00 00" }],
  ["grille", "carre", "nature", "Restauration & café", "Produits de la semaine", { titre: "Ce qui arrive\ncette semaine", sous: "Directement de nos six producteurs", items: ["Asperges", "Agneau", "Fraises", "Fèves", "Rhubarbe", "Petits pois"], meta: "La carte change chaque lundi selon les arrivages" }],
  ["annonce", "story", "vif", "Restauration & café", "Story nouveauté", { emoji: "🍦", gros: "NEW", titre: "Le sorbet\nfraise\nest là", sous: "Plein fruit, sans sucre ajouté, jusqu'à fin juin seulement.", items: ["Plein fruit", "Fait le matin", "Vegan"] }],

  /* ══════════ Commerce & promotion ══════════ */

  ["polaroid", "carre", "chic", "Commerce & promotion", "Coulisses d'expédition", { sur: "Ce matin", titre: "Quarante colis,\nzéro plastique", emoji: "📦", meta: "Atelier, 8 h 30" }],
  ["duo", "carre", "tech", "Commerce & promotion", "Deux chiffres du mois", { gros: "AVRIL", items: ["312|commandes livrées", "1|retour sur 312"] }],
  ["question", "story", "clair", "Commerce & promotion", "Story sondage produit", { sur: "Aidez-nous", titre: "Terre brûlée\nou bleu\nardoise ?", sous: "Une seule couleur partira en production. La vôtre, peut-être." }],
  ["carrousel", "carre", "tech", "Commerce & promotion", "Volet de carrousel produit", { meta: "2/5", sur: "Le vrai coût", titre: "Où part\nvotre argent\nsur ce sac", sous: "Cuir 34 %, confection 28 %, transport 4 %, marge atelier 34 %. Pas de distributeur.", cta: "Suite au volet suivant" }],
  ["sablier", "story", "sombre", "Commerce & promotion", "Story dernière heure", { sur: "PLUS QU'UNE HEURE", titre: "La vente\nferme à minuit", sous: "Les paniers non validés seront libérés automatiquement.", meta: "AUCUNE PROLONGATION" }],
  ["mosaique", "carre", "pastel", "Commerce & promotion", "Merci de commande", { titre: "Merci\npour votre\ncommande", sous: "Elle part demain matin. Le suivi arrive par SMS." }],

  /* ══════════ Immobilier & services ══════════ */

  ["fiche", "carre", "clair", "Immobilier & services", "Post fiche de bien", { titre: "T3 lumineux,\n68 m², 3e étage", meta: "Chartrons — DPE B — 279 000 €", sur: "POINTS FORTS", sous: "À NOTER", items: ["Balcon plein sud sans vis-à-vis", "Ascenseur, cave", "Charges de 92 € par mois", "Pas de parking", "Rue passante en journée", "Travaux de façade votés"] }],
  ["ruban", "carre", "chaud", "Immobilier & services", "Post vendu", { sur: "Encore un", titre: "VENDU", sous: "Vendu au prix demandé en dix-neuf jours, sans négociation.", meta: "MERCI POUR VOTRE CONFIANCE" }],
  ["chiffre", "carre", "tech", "Immobilier & services", "Post délai moyen", { sur: "Notre moyenne 2025", gros: "38", titre: "jours entre le mandat et le compromis", sous: "Sur 42 biens vendus, tous types et tous secteurs confondus.", cta: "Estimation gratuite" }],
  ["question", "story", "clair", "Immobilier & services", "Story question vendeur", { sur: "Propriétaires", titre: "Savez-vous\nce que vaut\nvotre bien ?", sous: "Estimation écrite, gratuite, sous quarante-huit heures." }],
  ["polaroid", "carre", "terre", "Immobilier & services", "Post visite du jour", { sur: "Ce matin", titre: "Onzième visite,\net la bonne", emoji: "🔑", meta: "Nansouty, mardi" }],

  /* ══════════ Santé & cabinet ══════════ */

  ["cadre", "carre", "clair", "Santé & cabinet", "Post fermeture du cabinet", { sur: "Information", titre: "Cabinet fermé\ndu 3 au 17 août", sous: "Continuité assurée par le Dr Roux, au 05 56 00 00 01. Urgences : le 15.", meta: "REPRISE LE LUNDI 18 AOÛT À 8 H 30" }],
  ["calendrier", "carre", "froid", "Santé & cabinet", "Post vaccination", { sur: "OCTOBRE 2026", gros: "01", titre: "Vaccination\ngrippe", items: ["Sans rendez-vous les mercredis", "De 14 h à 18 h, jusqu'au 30 novembre", "Apportez votre bon de prise en charge", "Gratuite pour les plus de 65 ans"] }],
  ["liste", "carre", "froid", "Santé & cabinet", "Post prévention", { sur: "Prévention", titre: "Cinq gestes\nqui ne coûtent\nrien", items: ["Dormir sept heures, à heures régulières", "Marcher trente minutes par jour", "Limiter l'alcool à dix verres par semaine", "Faire contrôler sa tension une fois par an", "Consulter dès qu'un symptôme dure trois semaines"], meta: "Aucun de ces conseils ne demande d'ordonnance" }],
  ["question", "carre", "nature", "Santé & cabinet", "Post question santé", { sur: "Idée reçue", titre: "Faut-il vraiment\nboire deux litres\nd'eau par jour ?", sous: "La réponse est plus nuancée que le chiffre qu'on répète." }],
  ["cadre", "story", "clair", "Santé & cabinet", "Story rappel d'annulation", { sur: "Rappel", titre: "Prévenez\n24 heures\navant", sous: "Un créneau libéré à temps profite à quelqu'un qui attend depuis trois semaines.", meta: "05 56 00 00 00" }],

  /* ══════════ Artisanat & bâtiment ══════════ */

  ["avantapres", "carre", "froid", "Artisanat & bâtiment", "Post chantier", { titre: "Une salle\nde bain,\ndix jours", sur: "AVANT", cta: "APRÈS", items: ["Carrelage de 1978, baignoire fuyarde, aucune ventilation.", "Douche à l'italienne, VMC, sol antidérapant."], sous: "6 400 € TTC, fournitures comprises, sans dépassement.", meta: "Chantier de mars 2026, Talence" }],
  ["polaroid", "carre", "terre", "Artisanat & bâtiment", "Post atelier", { sur: "Atelier", titre: "Trois heures\nsur un assemblage", emoji: "🪚", meta: "Mardi, 4 rue des Forges" }],
  ["grille", "carre", "terre", "Artisanat & bâtiment", "Post réalisations", { titre: "Six chantiers\nrécents", sous: "Photos et références sur demande", items: ["Escalier chêne", "Cuisine", "Bibliothèque", "Parquet massif", "Volets bois", "Verrière"], meta: "Coordonnées de clients communiquées volontiers" }],
  ["typo", "carre", "sombre", "Artisanat & bâtiment", "Post slogan artisan", { titre: "UN DEVIS\nCLAIR VAUT\nMIEUX QU'UN\nDEVIS BAS", sous: "Vingt ans de chantiers résumés en une phrase.", meta: "Menuiserie Berthier" }],
  ["chiffre", "carre", "tech", "Artisanat & bâtiment", "Post chiffre chantier", { sur: "Bilan 2025", gros: "97 %", titre: "de chantiers livrés dans les délais", sous: "Sur 68 chantiers. Les deux retards ont été annoncés à l'avance.", cta: "Références sur demande" }],

  /* ══════════ Beauté & coiffure ══════════ */

  ["avantapres", "portrait", "pastel", "Beauté & coiffure", "Post transformation", { titre: "Deux heures\nde travail", sur: "AVANT", cta: "APRÈS", items: ["Longueurs abîmées, racines marquées, aucune forme.", "Base éclaircie, dégradé net, entretien tous les trois mois."], sous: "Photos non retouchées, même lumière, même jour.", meta: "Balayage complet — 110 €" }],
  ["promo", "carre", "vif", "Beauté & coiffure", "Post offre de créneau", { sur: "Créneaux du mardi", titre: "Coupe\net soin", gros: "55 €", items: ["80 €"], sous: "Uniquement le mardi et le mercredi, de septembre à décembre.", meta: "SUR RENDEZ-VOUS AU 05 56 00 00 00" }],
  ["organique", "story", "pastel", "Beauté & coiffure", "Story invitation", { sur: "Prenez soin de vous", titre: "Une heure\nrien que\npour vous", sous: "Soin visage complet, cabine individuelle, téléphone en mode avion.", cta: "Réserver un créneau" }],
  ["checklist", "carre", "clair", "Beauté & coiffure", "Post conseils entretien", { sur: "Après le salon", titre: "Cinq gestes\npour tenir\ntrois mois", items: ["Laver à l'eau tiède, jamais chaude", "Deux shampoings par semaine, pas plus", "Un masque tous les dix jours", "Protéger de la chaleur avant le sèche-cheveux", "Couper les pointes tous les trois mois"], meta: "Enregistrez ce post pour ne pas oublier" }],
  ["monogramme", "carre", "chic", "Beauté & coiffure", "Post identité", { gros: "MB", titre: "Maison Beauté", sous: "SOINS & COIFFURE — BORDEAUX" }],

  /* ══════════ Auto & mobilité ══════════ */

  ["promo", "carre", "vif", "Auto & mobilité", "Post offre révision", { sur: "Offre de printemps", titre: "Révision\ncomplète", gros: "129 €", items: ["189 €"], sous: "Vidange, filtres, contrôle 42 points. Jusqu'au 30 avril, sur rendez-vous.", meta: "05 56 00 00 00" }],
  ["checklist", "carre", "clair", "Auto & mobilité", "Post avant contrôle technique", { sur: "Contrôle technique", titre: "Six points\nà vérifier\navant", items: ["Toutes les ampoules, plaque comprise", "Niveau de lave-glace", "Usure et pression des pneus", "Essuie-glaces en bon état", "Aucun voyant au tableau de bord", "Carte grise dans le véhicule"], meta: "Six minutes évitent une contre-visite" }],
  ["chrono", "carre", "tech", "Auto & mobilité", "Post entretien par kilométrage", { titre: "Quand\nfaire quoi", sous: "Repères valables pour la plupart des motorisations.", items: ["15 000|Vidange.", "40 000|Filtres.", "80 000|Distribution.", "120 000|Embrayage."], meta: "Se référer au carnet constructeur en cas de doute" }],
  ["etiquette", "story", "sombre", "Auto & mobilité", "Story véhicule d'occasion", { sur: "OCCASION GARANTIE", gros: "14 900 €", titre: "Berline 2019,\n86 000 km", sous: "Carnet complet, distribution faite, deux jeux de pneus.", meta: "CT DE MOINS D'UN MOIS" }],
  ["notation", "carre", "clair", "Auto & mobilité", "Post avis garage", { gros: "4,8", sur: "sur 340 avis", titre: "Devis annoncé à 480 €, facture à 462 €. Ils m'ont montré les pièces sans que je demande.", auteur: "Aline R.", meta: "Avis Google — mars 2026" }],

  /* ══════════ Sport & bien-être ══════════ */

  ["progression", "story", "vif", "Sport & bien-être", "Story défi", { sur: "Défi 30 jours", titre: "Jour 24\nsur 30", gros: "80", sous: "Six jours restants. Le plus dur est derrière vous.", meta: "TENEZ BON" }],
  ["fiche", "carre", "froid", "Sport & bien-être", "Post fiche d'exercice", { titre: "Le gainage,\ncorrectement", meta: "3 × 30 secondes — repos 45 secondes", sur: "À FAIRE", sous: "À ÉVITER", items: ["Coudes sous les épaules", "Bassin dans l'axe du dos", "Respiration continue", "Creuser le bas du dos", "Lever les fesses", "Tenir plus longtemps que la forme"] }],
  ["score", "carre", "vif", "Sport & bien-être", "Post résultat", { sur: "CHAMPIONNAT — J18", items: ["AS Rivière", "US Combe"], gros: "4-0", titre: "Maintien assuré à deux journées de la fin", meta: "SAMEDI 20 H — STADE MUNICIPAL" }],
  ["temoignage", "carre", "pastel", "Sport & bien-être", "Post témoignage", { emoji: "🏃", titre: "« Je n'avais pas couru depuis quinze ans. J'ai fait dix kilomètres en mai. »", auteur: "Marc T., 52 ans", sous: "Adhérent depuis un an" }],
  ["montagne", "story", "nature", "Sport & bien-être", "Story objectif", { sur: "Objectif 2026", titre: "Cinquante\nkilomètres\nen septembre", sous: "Deux mille mètres de dénivelé. Préparation commencée en janvier.", meta: "SUIVEZ L'ENTRAÎNEMENT" }],

  /* ══════════ Éducation & association ══════════ */

  ["calendrier", "carre", "vif", "Éducation & association", "Post réunion de rentrée", { sur: "JEUDI 10 SEPTEMBRE", gros: "10", titre: "Réunion\nde rentrée", items: ["18 h, salle polyvalente", "Présentation de l'équipe", "Organisation et sorties de l'année", "Verre de l'amitié à 19 h 30"] }],
  ["typo", "carre", "vif", "Éducation & association", "Post appel à bénévoles", { titre: "ON A\nBESOIN\nDE VOUS", sous: "Six bénévoles manquent. Deux heures par semaine suffisent.", meta: "PERMANENCE LE SAMEDI, 10 H – 12 H" }],
  ["progression", "carre", "vif", "Éducation & association", "Post collecte", { sur: "Collecte", titre: "Pour équiper\nla salle", gros: "64", sous: "Il manque 1 800 € pour le nouveau plancher de danse.", meta: "CAGNOTTE EN LIGNE OU EN PERMANENCE" }],
  ["grille", "carre", "clair", "Éducation & association", "Post ateliers", { titre: "Nos six\nateliers", sous: "Toute l'année, pour tous les âges", items: ["Théâtre", "Poterie", "Guitare", "Dessin", "Danse", "Échecs"], meta: "Adhésion annuelle 25 € — inscriptions en juin" }],
  ["question", "carre", "clair", "Éducation & association", "Post consultation", { sur: "Consultation", titre: "Quels horaires\nvous arrangeraient\nle mieux ?", sous: "Répondez avant le 30 mai : votre avis décide du planning." }],

  /* ══════════ Marque & logo, Tech, Emploi ══════════ */

  ["souligne", "carre", "clair", "Marque & logo", "Post baseline", { sur: "Notre promesse", titre: "Simple.\nSolide.\nRéparable.", sous: "Trois mots qui décident de ce qu'on fabrique, et surtout de ce qu'on refuse.", meta: "atelierberthier.fr" }],
  ["embleme", "carre", "chic", "Marque & logo", "Post emblème", { meta: "ring", gros: "AB", titre: "Atelier Berthier", sous: "MENUISERIE D'ART DEPUIS 2006" }],
  ["neon", "carre", "tech", "Tech & startup", "Post version", { gros: "v3", titre: "La version 3 est en ligne", sous: "Deux ans de retours, une interface repensée, aucun surcoût." }],
  ["stats", "carre", "tech", "Tech & startup", "Post fiabilité", { sur: "Douze derniers mois", titre: "Ce que vaut\nnotre disponibilité", items: ["99,97 %|de disponibilité", "11 min|d'arrêt total", "4 h|délai de réponse"], meta: "Historique public sur status.exemple.fr" }],
  ["demi", "carre", "vif", "Emploi & recrutement", "Post recrutement", { sur: "Recrutement", gros: "ON\nRECRUTE", titre: "Trois postes ouverts, salaires affichés", sous: "Opérations, atelier et relation client. CDI, Bordeaux, réponse sous cinq jours.", meta: "TOUTES LES OFFRES SUR NOTRE SITE" }],
  ["equipe", "carre", "clair", "Emploi & recrutement", "Post arrivées", { titre: "Quatre\narrivées\nce trimestre", sous: "Et un vrai plan d'intégration pour chacune.", items: ["Sofia|Opérations", "Marc|Atelier", "Aline|Clients", "Noé|Logistique"] }],

  /* ══════════ Culture, Voyage, Animaux, Podcast ══════════ */

  ["evenement", "carre", "chic", "Culture & spectacle", "Post spectacle", { sur: "Création", titre: "Les Justes", meta: "DU 14 AU 18 NOVEMBRE — 20 H 30", sous: "Théâtre municipal — 1 h 45 sans entracte", cta: "Plein 18 € — réduit 12 € — moins de 26 ans 8 €" }],
  ["citation", "carre", "chic", "Culture & spectacle", "Post citation de presse", { titre: "« Une heure\nquarante-cinq\nsans un temps\nmort. »", auteur: "Le Journal du Sud-Ouest", sous: "À propos des Justes, novembre 2026" }],
  ["vagues", "story", "froid", "Voyage & saison", "Story ouverture de terrasse", { sur: "Enfin", titre: "La terrasse\nrouvre\nsamedi", sous: "Quarante couverts face au port, service continu jusqu'à 23 h.", meta: "PREMIER ARRIVÉ, PREMIER SERVI" }],
  ["grille", "carre", "nature", "Voyage & saison", "Post à faire autour", { titre: "Six choses\nà faire\nautour", sous: "Toutes à moins de trente minutes", items: ["Village médiéval", "Marché du dimanche", "Balade des vignes", "Grotte", "Base nautique", "Marché nocturne"], meta: "Détails et horaires dans le livret d'accueil" }],
  ["polaroid", "carre", "pastel", "Animaux", "Post adoption", { sur: "À adopter", titre: "Roux attend\ndepuis huit mois", emoji: "🐱", meta: "Refuge du Port — 05 56 00 00 00" }],
  ["progression", "carre", "vif", "Animaux", "Post collecte refuge", { sur: "Collecte d'hiver", titre: "Pour chauffer\nle chenil", gros: "58", sous: "Il manque 2 100 € avant les premières gelées.", meta: "DONS EN LIGNE OU AU REFUGE" }],
  ["carrousel", "carre", "tech", "Podcast & musique", "Post extrait", { meta: "EXTRAIT", sur: "Épisode 12", titre: "« J'ai fait\nmes comptes\navant de\ndémissionner »", sous: "Quinze mois d'économies, un budget écrit, une date limite. Sans ça, il dit qu'il n'aurait pas tenu.", cta: "Épisode complet en bio" }],
  ["playlist", "carre", "sombre", "Podcast & musique", "Post liste d'épisodes", { emoji: "🎙️", titre: "Par où\ncommencer", sous: "Six épisodes pour comprendre la série", items: ["Le boulanger|41:12", "La juge|38:44", "Le berger|52:03", "La sage-femme|46:19", "Le libraire|33:57", "La routière|49:28"], meta: "Tous les épisodes sur lesgensquifont.fr" }],

];
