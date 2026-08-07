// Modèles — les formats qu'on oublie.
//
// Un catalogue qui propose trente formats mais n'en garnit que six laisse
// l'utilisateur seul dès qu'il veut une couverture d'e-book, un badge de
// salon, une signature d'e-mail ou une bannière de profil. Cette série
// couvre délibérément les formats les moins servis ailleurs, avec des
// contenus adaptés à chacun : un badge tient en trois lignes, pas en dix.

import type { Row } from "./design-templates";

export const ROWS_FORMATS: Row[] = [

  /* ══════════ Couvertures d'e-book et de livre ══════════ */

  ["couverture", "ebook", "sombre", "Impression & affiche", "Couverture d'e-book", { sur: "Guide pratique", titre: "Vendre\nsans\nse renier", sous: "Ce qui marche vraiment quand on refuse la promotion permanente.", auteur: "Sofia Bernard — 128 pages" }],
  ["couverture", "ebook", "chic", "Impression & affiche", "Couverture de roman", { sur: "Roman", titre: "Les mains\ndu métier", sous: "Trois générations dans le même atelier, et une dernière décision.", auteur: "Marc Vidal" }],
  ["arche", "ebook", "chic", "Impression & affiche", "Couverture élégante", { sur: "Essai", titre: "Le temps\nlong", sous: "Éloge des décisions qui mettent dix ans à porter leurs fruits.", meta: "ÉDITIONS DU PORT — 2026" }],
  ["contour", "ebook", "vif", "Impression & affiche", "Couverture typographique", { sur: "Manuel", gros: "MOINS", titre: "Faire moins, faire mieux, et le tenir", sous: "Un manuel court, pour des équipes qui n'ont pas le temps d'en lire un long.", meta: "96 PAGES — ÉDITIONS DU PORT" }],
  ["montagne", "ebook", "nature", "Impression & affiche", "Couverture de guide nature", { sur: "Guide", titre: "Marcher\nen Gironde", sous: "Trente itinéraires balisés, de deux à sept heures, toutes saisons.", meta: "CARTES ET TRACES GPX INCLUSES" }],
  ["magazine", "ebook", "chic", "Impression & affiche", "Couverture de revue", { sur: "REVUE", meta: "NUMÉRO 4 — PRINTEMPS 2026", titre: "Ce qui\ntient", sous: "Enquêtes longues sur des métiers qu'on croyait disparus.", items: ["Le dernier tanneur", "Réparer plutôt que remplacer", "Transmettre sans école"] }],
  ["sommaire", "ebook", "clair", "Impression & affiche", "Sommaire de livre", { sur: "Sommaire", titre: "Ce que\nvous allez\nlire", items: ["Pourquoi ce livre|7", "Le constat|15", "Ce qui ne marche pas|38", "Ce qui marche|61", "Comment commencer|94", "Pour aller plus loin|118"], meta: "128 pages — édition de 2026" }],
  ["chapitre", "ebook", "tech", "Impression & affiche", "Ouverture de chapitre de livre", { gros: "03", sur: "Chapitre", titre: "Ce qui\nne marche\npas", sous: "Six approches largement recommandées, et pourquoi elles échouent presque toujours.", meta: "PAGES 38 À 60" }],

  /* ══════════ Pochettes carrées : podcast, album, cours ══════════ */

  ["couverture", "pod", "tech", "Podcast & musique", "Pochette de série documentaire", { sur: "Série documentaire", titre: "Ceux\nqui restent", sous: "Six épisodes sur des métiers qu'on dit condamnés, et qui tiennent.", auteur: "Réalisation : Sofia Bernard" }],
  ["disque", "pod", "chaud", "Podcast & musique", "Pochette ronde d'album", { sur: "Premier album", titre: "Marée\nbasse", sous: "Six titres enregistrés en trois jours, sans retouche.", meta: "TRIO AUBÉPINE — 2026" }],
  ["contour", "pod", "sombre", "Podcast & musique", "Pochette typographique — Album", { sur: "Album", gros: "NUIT", titre: "Neuf titres, un seul micro", sous: "Enregistré en une nuit, au comptoir du Port, après la fermeture.", meta: "VINYLE ET NUMÉRIQUE" }],
  ["damier", "pod", "vif", "Podcast & musique", "Pochette graphique — Saison 3", { sur: "Saison 3", titre: "ON\nREPART", sous: "Douze épisodes, un par semaine, à partir du 6 septembre.", meta: "SUR TOUTES LES PLATEFORMES" }],
  ["monogramme", "pod", "chic", "Podcast & musique", "Pochette monogramme", { gros: "TA", titre: "Trio Aubépine", sous: "PREMIER ALBUM — 2026" }],
  ["polaroid", "pod", "terre", "Podcast & musique", "Pochette instantanée", { sur: "Enregistré ici", titre: "Le comptoir,\naprès la fermeture", emoji: "🎙️", meta: "Bordeaux, novembre 2025" }],
  ["playlist", "pod", "sombre", "Podcast & musique", "Pochette avec pistes", { emoji: "💿", titre: "Marée\nbasse", sous: "Six titres, trente-deux minutes", items: ["Rue des Halles|3:42", "Marée basse|4:18", "Contre-jour|2:55", "Lundi gris|5:07", "Dernier client|3:29", "On ferme|6:11"], meta: "Trio Aubépine — enregistré au Comptoir du Port" }],
  ["couverture", "pod", "clair", "Éducation & association", "Pochette de cours en ligne", { sur: "Formation en ligne", titre: "Comprendre\nsa compta", sous: "Six modules d'une heure, pour dirigeants qui n'y connaissent rien.", auteur: "Sofia Bernard, experte-comptable" }],

  /* ══════════ Badges et accréditations ══════════ */

  ["visite", "badge", "froid", "Événement", "Badge participant", { gros: "SB", titre: "Sofia Bernard", sur: "PARTICIPANTE", sous: "Aubépine · Bordeaux\nConférence annuelle 2026" }],
  ["visite", "badge", "sombre", "Événement", "Badge intervenant", { gros: "MV", titre: "Marc Vidal", sur: "INTERVENANT", sous: "Table ronde 14 h — salle B\nConférence annuelle 2026" }],
  ["visite", "badge", "vif", "Événement", "Badge bénévole", { gros: "AR", titre: "Aline Roux", sur: "BÉNÉVOLE", sous: "Accueil et buvette\nFestival des Halles 2026" }],
  ["visite", "badge", "chic", "Événement", "Badge presse", { gros: "NT", titre: "Noé Tissot", sur: "PRESSE", sous: "Le Journal du Sud-Ouest\nAccès zone photo autorisé" }],
  ["visite", "badge", "terre", "Événement", "Badge exposant", { gros: "AB", titre: "Atelier Berthier", sur: "EXPOSANT — STAND B14", sous: "Salon de l'artisanat 2026\nAccès montage dès 7 h" }],
  ["embleme", "badge", "tech", "Événement", "Badge d'accès technique", { meta: "shield", gros: "T", titre: "Accès technique", sous: "RÉGIE, COULISSES ET LOCAUX TECHNIQUES" }],
  ["pastille", "badge", "vif", "Événement", "Badge visiteur", { gros: "VIS", sur: "VISITEUR", titre: "À porter de façon visible", meta: "À RESTITUER À L'ACCUEIL EN SORTANT" }],
  ["etiquette", "badge", "pastel", "Enfance & jeunesse", "Badge d'enfant", { sur: "SÉJOUR D'ÉTÉ", gros: "12", titre: "Camille Durand,\ngroupe des Chênes", sous: "Animateur référent : Noé — 06 00 00 00 00", meta: "CENTRE DE LA COMBE" }],

  /* ══════════ Bannières larges et bandeaux de profil ══════════ */

  ["banniere", "banx", "tech", "Web & e-mail", "Bannière de profil large", { gros: "→", titre: "Produit, opérations, un peu de terrain", sous: "J'écris chaque semaine sur ce qui marche vraiment en interne, chiffres à l'appui.", cta: "Bordeaux · disponible pour échanger" }],
  ["banniere", "banx", "chaud", "Web & e-mail", "Bannière de compte commerçant", { gros: "🥖", titre: "Boulangerie du Marché, Bordeaux", sous: "Pains au levain, cuisson sur sole, tous les jours sauf le lundi.", cta: "12 rue du Marché · 05 56 00 00 00" }],
  ["typo", "banx", "sombre", "Web & e-mail", "Bannière typographique", { titre: "FAIRE SIMPLE,\nC'EST LE PLUS DUR", sous: "Design produit · Bordeaux", meta: "Portfolio en lien" }],
  ["souligne", "banx", "clair", "Web & e-mail", "Bannière trois mots", { sur: "Notre façon de faire", titre: "Simple.\nSolide.\nRéparable.", sous: "Trois critères avant de sortir un produit.", meta: "atelierberthier.fr" }],
  ["visite", "banx", "chic", "Web & e-mail", "Bannière carte de visite", { gros: "SV", titre: "Studio Verrier", sur: "PHOTOGRAPHIE CULINAIRE ET D'ATELIER", sous: "Bordeaux et Sud-Ouest · 06 00 00 00 00 · studioverrier.fr" }],
  ["rayures", "banx", "vif", "Web & e-mail", "Bannière promotionnelle", { sur: "Trois jours", titre: "GRANDE\nBRADERIE", sous: "Fins de série et pièces d'exposition, tout à moins de trente euros.", meta: "DU 12 AU 14 JUIN — 12 RUE DU MARCHÉ" }],
  ["vagues", "banx", "froid", "Web & e-mail", "Bannière saisonnière", { sur: "Ouverture", titre: "La terrasse\nrouvre samedi", sous: "Quarante couverts face au port, service continu jusqu'à 23 h.", meta: "LE COMPTOIR DU PORT — 8 QUAI VAUBAN" }],
  ["banniere", "bannli", "froid", "LinkedIn", "Bannière de profil conseil", { gros: "⌘", titre: "Conseil en organisation, sans slide inutile", sous: "Quinze ans d'opérations, deux secteurs, un principe : ce qui tient.", cta: "contact@exemple.fr" }],
  ["souligne", "bannli", "clair", "LinkedIn", "Bannière de profil trois mots", { sur: "Ma façon de travailler", titre: "Clair.\nÉcrit.\nTenu.", sous: "Trois principes qui évitent la plupart des malentendus en mission.", meta: "aubepine.fr" }],
  ["contour", "bannli", "sombre", "LinkedIn", "Bannière de profil creuse", { sur: "Bordeaux", gros: "OPS", titre: "Directrice des opérations, Aubépine", sous: "J'écris sur le pilotage d'équipe, une fois par semaine.", meta: "SOFIA BERNARD" }],
  ["banniere", "ytban", "sombre", "YouTube", "Bannière de chaîne documentaire", { gros: "▶", titre: "Des métiers filmés du premier au dernier geste", sous: "Documentaires courts, tournés en atelier, sans musique inutile.", cta: "Une vidéo tous les quinze jours" }],
  ["montagne", "ytban", "nature", "YouTube", "Bannière de chaîne nature", { sur: "Randonnée", titre: "Marcher,\nfilmer,\nrecommencer", sous: "Itinéraires complets, bivouacs, traces GPX en description.", meta: "UN ITINÉRAIRE CHAQUE DIMANCHE" }],
  ["damier", "ytban", "vif", "YouTube", "Bannière de chaîne graphique", { sur: "Chaîne", titre: "TESTÉ\nLONGTEMPS", sous: "Six mois d'usage minimum avant toute conclusion. Aucun produit offert.", meta: "NOUVELLE VIDÉO LE JEUDI" }],
  ["banniere", "bandeau", "clair", "Web & e-mail", "Bandeau d'en-tête de site", { gros: "→", titre: "Tout ce que vous cherchez, au même endroit", sous: "Fichiers, design et partage, sans passer d'un outil à l'autre.", cta: "Essayer gratuitement" }],
  ["banniere", "bandeau", "nature", "Web & e-mail", "Bandeau de site producteur", { gros: "🍯", titre: "Vente directe à la ferme, toute l'année", sous: "Miels, confitures et légumes de saison, du mardi au samedi.", cta: "Voir les horaires" }],

  /* ══════════ Signatures d'e-mail ══════════ */

  ["entete", "signa", "clair", "Web & e-mail", "Signature sobre", { titre: "Sofia Bernard", sur: "Responsable des opérations", sous: "06 00 00 00 00\nsofia@exemple.fr", meta: "Aubépine — 12 rue du Marché, Bordeaux" }],
  ["entete", "signa", "chic", "Web & e-mail", "Signature élégante", { titre: "Marc Vidal", sur: "Chef de cuisine", sous: "05 56 00 00 00\nmarc@lecomptoir.fr", meta: "Le Comptoir du Port — 8 quai Vauban, Bordeaux" }],
  ["entete", "signa", "terre", "Web & e-mail", "Signature artisan", { titre: "Menuiserie Berthier", sur: "Menuisier — agenceur", sous: "06 00 00 00 00\ncontact@menuiserie-berthier.fr", meta: "4 rue des Forges, Bordeaux — décennale AXA n° 0000000" }],
  ["visite", "signa", "sombre", "Web & e-mail", "Signature carte", { gros: "SV", titre: "Sophie Verrier", sur: "DIRECTRICE ARTISTIQUE", sous: "06 00 00 00 00 · sophie@sverrier.fr · sverrier.fr" }],
  ["visite", "signa", "froid", "Web & e-mail", "Signature médicale", { gros: "SB", titre: "Dr Sofia Bernard", sur: "MÉDECIN GÉNÉRALISTE", sous: "05 56 00 00 00 · 12 rue du Marché, Bordeaux · RPPS 10000000000" }],
  ["souligne", "signa", "vif", "Web & e-mail", "Signature à message", { sur: "Aubépine", titre: "Simple.\nSolide.", sous: "sofia@exemple.fr — 06 00 00 00 00", meta: "aubepine.fr" }],

  /* ══════════ Grand carré : affichage et réseaux ══════════ */

  ["disque", "carreL", "vif", "Instagram", "Grand carré — annonce", { sur: "Nouveauté", titre: "C'est\nen ligne", sous: "Toute la collection, aux mêmes prix qu'en boutique.", meta: "LIVRAISON OFFERTE LA PREMIÈRE SEMAINE" }],
  ["arche", "carreL", "chic", "Marque & logo", "Grand carré — identité", { sur: "Maison", titre: "Berthier", sous: "Parfums composés à Grasse, embouteillés à la main depuis 1974.", meta: "PARIS — GRASSE" }],
  ["bloc", "carreL", "vif", "Impression & affiche", "Grand carré — affiche", { titre: "TROIS\nJOURS\nSEULEMENT", sous: "Portes ouvertes de l'atelier : démonstrations, ventes directes, café offert.", meta: "DU 12 AU 14 JUIN — 4 RUE DES FORGES" }],
  ["stats", "carreL", "tech", "Instagram", "Grand carré — chiffres", { sur: "Bilan 2026", titre: "Ce que vous\navez rendu\npossible", items: ["4 120|commandes", "2|emplois créés", "0|invendu jeté"], meta: "Bilan complet publié chaque janvier sur notre site" }],
  ["sceau", "carreL", "terre", "Marque & logo", "Grand carré — label", { sur: "FAIT MAIN", gros: "100%", meta: "BORDEAUX", titre: "Rien n'est sous-traité", sous: "Visite de l'atelier possible sur rendez-vous." }],
  ["pois", "carreL", "pastel", "Commerce & promotion", "Grand carré — anniversaire", { sur: "Cinq ans", titre: "Merci\nd'être là", sous: "Cinq ans, quatre mille commandes, et toujours le même atelier.", meta: "-15 % TOUTE LA SEMAINE" }],

  /* ══════════ Cartes verticales et étiquettes ══════════ */

  ["etiquette", "carteV", "chic", "Carte & papeterie", "Carte verticale d'atelier", { sur: "ATELIER", gros: "AB", titre: "Atelier Berthier,\nmenuiserie", sous: "Sur rendez-vous, 4 rue des Forges.", meta: "06 00 00 00 00" }],
  ["etiquette", "carteV", "nature", "Agriculture & terroir", "Carte verticale de ferme", { sur: "VENTE DIRECTE", gros: "FC", titre: "Ferme de la Combe,\nSaint-Émilion", sous: "Du mardi au samedi, 9 h à 12 h et 15 h à 19 h.", meta: "05 57 00 00 00" }],
  ["monogramme", "carteV", "chic", "Carte & papeterie", "Carte verticale monogramme", { gros: "S&M", titre: "Sofia & Marc", sous: "12 SEPTEMBRE 2026" }],
  ["cadre", "carteV", "pastel", "Carte & papeterie", "Marque-place vertical", { sur: "Table 4", titre: "Camille\nDurand", sous: "Menu sans gluten signalé au service.", meta: "12 SEPTEMBRE 2026" }],
  ["etiquette", "etiq", "chic", "Commerce & promotion", "Étiquette de bougie", { sur: "CIRE D'ABEILLE", gros: "22 €", titre: "Bougie coulée main,\n180 g, 35 heures", sous: "Cire d'abeille française, mèche en coton, sans parfum.", meta: "COUPER LA MÈCHE À 5 MM AVANT CHAQUE USAGE" }],
  ["etiquette", "etiq", "sombre", "Commerce & promotion", "Étiquette de bagage", { sur: "SI TROUVÉ", gros: "✈", titre: "Sofia Bernard,\nBordeaux", sous: "Merci de contacter le 06 00 00 00 00.", meta: "RÉCOMPENSE OFFERTE" }],
  ["etiquette", "etiq", "pastel", "Carte & papeterie", "Étiquette de bocal maison", { sur: "MAISON", gros: "2026", titre: "Confiture de fraises,\nrécolte de juin", sous: "Fraises, sucre de canne, jus de citron.", meta: "À CONSERVER AU FRAIS APRÈS OUVERTURE" }],

  /* ══════════ Paysage A4 : diplômes, tableaux, plans ══════════ */

  ["certificat", "paysage", "vif", "Sport & bien-être", "Diplôme sportif", { sur: "DIPLÔME", titre: "Camille Durand", auteur: "Le président du club", sous: "a terminé le trail de la Combe, 42 kilomètres et 1 900 mètres de dénivelé, en 5 h 12 min.", meta: "12 SEPTEMBRE 2026" }],
  ["certificat", "paysage", "nature", "Éducation & association", "Diplôme d'atelier", { sur: "ATTESTATION", titre: "Noé Tissot", auteur: "L'équipe de l'atelier", sous: "a suivi l'atelier de poterie pendant toute l'année, et repart avec quatorze pièces cuites.", meta: "JUIN 2026 — MAISON DE QUARTIER" }],
  ["tableau", "paysage", "clair", "CV & document", "Tableau en paysage", { titre: "Suivi\nmensuel", sous: "Chiffres arrêtés au dernier jour de chaque mois.", sur: "MOIS|COMMANDES / DÉLAI", items: ["Janvier|280 / 9 j", "Février|310 / 8 j", "Mars|342 / 8 j", "Avril|312 / 7 j", "Mai|368 / 7 j", "Juin|401 / 6 j"], meta: "Objectif annuel : maintenir le délai sous huit jours" }],
  ["chrono", "paysage", "tech", "CV & document", "Frise en paysage", { titre: "Les jalons\nde l'année", sous: "Quatre dates, quatre décisions.", items: ["T1|Budget validé.", "T2|Recrutements.", "T3|Bascule logistique.", "T4|Bilan et arbitrage."], meta: "Point d'avancement mensuel en comité de direction" }],
  ["equipe", "paysage", "clair", "CV & document", "Organigramme simplifié", { titre: "Qui fait\nquoi", sous: "Une équipe de quatre, sans échelon intermédiaire.", items: ["Sofia|Opérations", "Marc|Atelier", "Aline|Clients", "Noé|Logistique"] }],
  ["comparatif", "paysage", "froid", "Présentation", "Comparatif en paysage", { titre: "Deux options\nchiffrées", sur: "EXTERNALISÉ", cta: "INTERNALISÉ", items: ["148 k€ par an|104 k€ par an", "Aucun recrutement|Deux recrutements", "Pics absorbés|Pics à gérer", "Aucun investissement|40 k€ initiaux", "Dépendance forte|Maîtrise complète"], meta: "Décision demandée avant le 30 juin" }],

  /* ══════════ Billets, coupons et tickets ══════════ */

  ["billet", "billet", "chic", "Culture & spectacle", "Billet de théâtre", { sur: "BILLET", titre: "LES JUSTES", gros: "18€", meta: "SAM. 14 NOVEMBRE — 20 H 30", sous: "Théâtre municipal — placement libre — durée 1 h 45" }],
  ["billet", "billet", "nature", "Voyage & saison", "Ticket d'entrée", { sur: "ENTRÉE", titre: "FERME DE LA COMBE", gros: "6€", meta: "VALABLE LE JOUR D'ÉMISSION", sous: "Visite libre — dégustation comprise — gratuit moins de 12 ans" }],
  ["billet", "billet", "vif", "Sport & bien-être", "Ticket de tournoi", { sur: "ENTRÉE", titre: "TOURNOI DE PRINTEMPS", gros: "3€", meta: "DIMANCHE 7 JUIN", sous: "Stade municipal — buvette sur place — gratuit moins de 16 ans" }],
  ["coupon", "billet", "chaud", "Commerce & promotion", "Coupon imprimable", { gros: "-5 €", sur: "DÈS 30 € D'ACHAT", titre: "À découper et à présenter en caisse", sous: "Une utilisation par personne, non cumulable, hors soldes et cartes cadeaux.", meta: "COUPON-2026", cta: "Valable jusqu'au 31 décembre 2026" }],
  ["coupon", "billet", "nature", "Restauration & café", "Coupon de fidélité", { gros: "10E", sur: "CARTE DE FIDÉLITÉ", titre: "Le dixième café est offert", sous: "Un tampon par consommation, dans la limite d'un par jour. Carte non nominative.", meta: "CARTE N° 0000", cta: "Sans date de validité" }],
  ["etiquette", "billet", "sombre", "Événement", "Ticket de vestiaire", { sur: "VESTIAIRE", gros: "042", titre: "Soirée du 12 juin,\nsalle des fêtes", sous: "Objet remis contre présentation du ticket.", meta: "AUCUN DUPLICATA DÉLIVRÉ" }],

  /* ══════════ Menus au format long ══════════ */

  ["menu", "menuc", "chic", "Restauration & café", "Carte des desserts", { sur: "Desserts", titre: "Pour finir", items: ["Tarte fine aux pommes, glace vanille|9", "Moelleux chocolat, cœur coulant|9", "Riz au lait, caramel au beurre salé|7", "Sorbet plein fruit, deux boules|6", "Assiette de fromages affinés|11", "Café gourmand|8"], meta: "Desserts préparés le jour même — merci de commander le moelleux en début de repas" }],
  ["menu", "menuc", "froid", "Restauration & café", "Carte des boissons", { sur: "Boissons", titre: "À boire", items: ["Café, expresso|1,80", "Thé ou infusion|3,50", "Jus de fruits pressé|4,50", "Limonade artisanale|3,80", "Bière pression, 25 cl|3,50", "Verre de vin, 12 cl|dès 4,50"], meta: "Eau du robinet servie gratuitement sur demande — carafe d'eau filtrée 2 €" }],
  ["menu", "menuc", "pastel", "Beauté & coiffure", "Carte des soins", { sur: "Institut", titre: "Nos soins", items: ["Soin visage découverte, 30 min|45", "Soin éclat, 45 min|65", "Hydratation profonde, 60 min|80", "Massage dos et nuque, 45 min|60", "Rituel complet, 120 min|145", "Forfait cinq soins|-15 %"], meta: "Sur rendez-vous — annulation gratuite jusqu'à 24 h avant" }],
  ["menu", "menuc", "vif", "Sport & bien-être", "Carte des cours", { sur: "Cours collectifs", titre: "Au planning", items: ["Renforcement, lundi 18 h 30|Inclus", "Yoga, mardi 12 h 15|Inclus", "Cardio, mercredi 19 h|Inclus", "Pilates, jeudi 12 h 15|Inclus", "Circuit, vendredi 18 h 30|Inclus", "Sortie course, samedi 10 h|Inclus"], meta: "Tous les cours sont compris dans l'abonnement — douze places par créneau" }],

];
