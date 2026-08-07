// Modèles — une campagne, tous ses formats.
//
// Une ouverture de boutique ne se dit pas de la même façon sur une affiche A3,
// dans une story et sur une carte de visite : l'affiche porte l'adresse, la
// story porte l'urgence, la carte porte le contact. Chaque campagne est donc
// déclinée sur les formats où elle sert vraiment, avec un texte réécrit à
// chaque fois — pas le même bloc redimensionné.

import type { Row } from "./design-templates";

export const ROWS_CANAUX: Row[] = [

  /* ══════════ Campagne : ouverture d'un commerce ══════════ */

  ["rayures", "a3", "vif", "Impression & affiche", "Ouverture — affiche de rue", { sur: "Nouvelle adresse", titre: "ON OUVRE", sous: "Boulangerie artisanale, pains au levain, viennoiseries pur beurre. Café offert tout le week-end d'ouverture.", meta: "SAMEDI 14 JUIN — 7 H — 12 RUE DU MARCHÉ" }],
  ["disque", "carre", "vif", "Instagram", "Ouverture — post carré", { sur: "Ça y est", titre: "On ouvre\nsamedi", sous: "7 h, 12 rue du Marché. Café offert toute la journée.", meta: "VENEZ TÔT, LA PREMIÈRE FOURNÉE PART VITE" }],
  ["demi", "story", "chaud", "Story & Reel", "Ouverture — story", { sur: "Demain", gros: "ON\nOUVRE", titre: "Samedi 7 h, 12 rue du Marché", sous: "Café offert toute la journée, visite du fournil à 11 h.", meta: "À DEMAIN" }],
  ["couverture", "couv", "chaud", "Facebook", "Ouverture — couverture de page", { sur: "Depuis juin 2026", titre: "Boulangerie\ndu Marché", sous: "Pains au levain, cuisson sur sole, tous les jours sauf le lundi.", auteur: "12 rue du Marché, Bordeaux · 05 56 00 00 00" }],
  ["visite", "carte", "terre", "Carte & papeterie", "Ouverture — carte de visite", { gros: "BM", titre: "Boulangerie du Marché", sur: "PAINS AU LEVAIN — VIENNOISERIES", sous: "12 rue du Marché, Bordeaux · 05 56 00 00 00" }],
  ["horaires", "a5", "terre", "Impression & affiche", "Ouverture — affichette horaires", { sur: "À partir du 14 juin", titre: "Nos horaires", items: ["Lundi|Fermé", "Mardi – vendredi|7 h – 13 h · 16 h – 19 h 30", "Samedi|7 h – 19 h 30", "Dimanche|7 h – 13 h"], meta: "DERNIÈRE FOURNÉE À 17 H" }],
  ["banniere", "bandeau", "chaud", "Web & e-mail", "Ouverture — bandeau web", { gros: "🥖", titre: "La boulangerie ouvre le 14 juin", sous: "Pains au levain, cuisson sur sole, 12 rue du Marché à Bordeaux.", cta: "Voir les horaires" }],
  ["coupon", "billet", "vif", "Commerce & promotion", "Ouverture — bon d'ouverture", { gros: "-20%", sur: "SEMAINE D'OUVERTURE", titre: "Sur tout, du 14 au 21 juin", sous: "Une utilisation par personne, sur présentation de ce bon, hors commandes spéciales.", meta: "OUVERTURE26", cta: "Valable jusqu'au 21 juin 2026" }],

  /* ══════════ Campagne : recrutement d'un poste ══════════ */

  ["recrute", "a4", "froid", "Emploi & recrutement", "Recrutement — annonce imprimée", { sur: "NOUS RECRUTONS", titre: "Un boulanger\nou une\nboulangère", sous: "CDI 39 h — Bordeaux — à partir de septembre 2026", items: ["Deux jours de repos consécutifs", "Salaire 2 300 € net, treizième mois", "Pas de travail le dimanche après-midi"], meta: "CV à déposer en boutique ou à emploi@boulangeriedumarche.fr" }],
  ["demi", "carre", "vif", "Instagram", "Recrutement — post carré", { sur: "Recrutement", gros: "ON\nRECRUTE", titre: "Un boulanger ou une boulangère, dès septembre", sous: "CDI 39 h, deux jours de repos consécutifs, 2 300 € net.", meta: "CV EN BOUTIQUE OU PAR E-MAIL" }],
  ["recrute", "story", "vif", "Story & Reel", "Recrutement — story", { sur: "ON RECRUTE", titre: "Boulanger\nou boulangère", sous: "CDI 39 h — dès septembre — Bordeaux", items: ["2 300 € net, treizième mois", "Deux jours de repos consécutifs", "Fournil équipé, four à sole"], meta: "Passez déposer un CV, on répond toujours" }],
  ["recrute", "li", "clair", "LinkedIn", "Recrutement — post professionnel", { sur: "POSTE À POURVOIR", titre: "Boulanger ou\nboulangère,\nCDI", sous: "Bordeaux — 39 h — prise de poste en septembre 2026", items: ["Salaire annoncé : 2 300 € net", "Équipe de quatre, fournil récent", "Aucun dimanche après-midi travaillé"], meta: "Réponse à toute candidature sous cinq jours" }],
  ["cadre", "a5", "clair", "Emploi & recrutement", "Recrutement — affichette vitrine", { sur: "Recrutement", titre: "Nous\nrecrutons", sous: "Un boulanger ou une boulangère en CDI, 39 heures, à partir de septembre. Deux jours de repos consécutifs.", meta: "DÉPOSEZ VOTRE CV EN BOUTIQUE" }],
  ["faq", "a4", "clair", "Emploi & recrutement", "Recrutement — questions du poste", { sur: "Le poste en clair", titre: "Quatre réponses\navant de\npostuler", items: ["Quels horaires ?|4 h à 12 h, deux jours de repos consécutifs.", "Quel salaire ?|2 300 € net, treizième mois après un an.", "Quelle équipe ?|Quatre personnes, dont un apprenti.", "Quel matériel ?|Four à sole, pétrin à axe oblique, chambre de pousse."], meta: "emploi@boulangeriedumarche.fr" }],

  /* ══════════ Campagne : lancement d'un produit ══════════ */

  ["annonce", "carre", "nature", "Instagram", "Lancement — post carré", { emoji: "🧴", gros: "NEW", titre: "Le savon\nau lait\nd'ânesse", sous: "Saponifié à froid, sans emballage plastique, fabriqué à Saint-Émilion.", items: ["Sans plastique", "Fait à 40 km", "Tient 3 mois"] }],
  ["etiquette", "etiq", "nature", "Commerce & promotion", "Lancement — étiquette produit", { sur: "NOUVEAUTÉ", gros: "9,50 €", titre: "Savon au lait d'ânesse,\n100 g", sous: "Saponifié à froid, sans huile de palme, sans parfum de synthèse.", meta: "LOT 2026-04 — SAINT-ÉMILION" }],
  ["fiche", "a4", "nature", "Commerce & promotion", "Lancement — fiche produit", { titre: "Savon au lait\nd'ânesse, 100 g", meta: "Saponification à froid — cure de 6 semaines — 9,50 €", sur: "CE QU'IL Y A DEDANS", sous: "CE QU'IL N'Y A PAS", items: ["Huile d'olive du Gers, 62 %", "Lait d'ânesse frais, 18 %", "Beurre de karité, soude, eau", "Aucune huile de palme", "Aucun parfum de synthèse", "Aucun conservateur"] }],
  ["sablier", "story", "sombre", "Story & Reel", "Lancement — compte à rebours", { sur: "DEMAIN 10 H", titre: "Le savon\narrive", sous: "Trois cents pièces pour la première production. Il n'y en aura pas d'autres avant six semaines.", meta: "ALERTE ACTIVABLE EN BIO" }],
  ["banniere", "bandeau", "nature", "Web & e-mail", "Lancement — bandeau site", { gros: "NEW", titre: "Le savon au lait d'ânesse est en ligne", sous: "Saponifié à froid, sans emballage plastique, 9,50 € les 100 g.", cta: "Découvrir" }],
  ["bandeau", "large", "nature", "Web & e-mail", "Lancement — bloc e-mail", { sur: "Nouveauté", titre: "Le savon\nqu'on préparait\ndepuis un an", sous: "Six semaines de cure, aucune huile de palme, aucun emballage plastique.", cta: "Le découvrir en boutique" }],
  ["grille", "pin", "nature", "Pinterest", "Lancement — épingle gamme", { titre: "Six savons,\nune seule\nrecette", sous: "Même base, six huiles essentielles", items: ["Lavande", "Menthe", "Romarin", "Cèdre", "Nature", "Argile"], meta: "Fabriqués à Saint-Émilion, en séries de trois cents" }],

  /* ══════════ Campagne : soldes et fin de saison ══════════ */

  ["bloc", "a3", "vif", "Impression & affiche", "Soldes — affiche vitrine", { titre: "SOLDES\nJUSQU'À\n-50 %", sous: "Sur toute la collection automne-hiver. Fins de série, tailles complètes, aucune reprise.", meta: "DU 7 JANVIER AU 3 FÉVRIER — 12 RUE DU MARCHÉ" }],
  ["pastille", "carre", "vif", "Commerce & promotion", "Soldes — post carré", { gros: "-50%", sur: "PREMIER JOUR", titre: "Les soldes commencent", meta: "MERCREDI 7 JANVIER, 8 H" }],
  ["sablier", "story", "sombre", "Story & Reel", "Soldes — dernier jour", { sur: "DERNIER JOUR", titre: "Ça se termine\nce soir", sous: "À minuit, les prix reviennent à la normale. Aucune prolongation.", meta: "MARDI 3 FÉVRIER" }],
  ["banniere", "bandeau", "vif", "Web & e-mail", "Soldes — bandeau site", { gros: "-50%", titre: "Soldes jusqu'à moins cinquante pour cent", sous: "Sur la collection automne-hiver, en boutique et en ligne, jusqu'au 3 février.", cta: "En profiter" }],
  ["etiquette", "etiq", "vif", "Commerce & promotion", "Soldes — étiquette de rayon", { sur: "SOLDES", gros: "-40%", titre: "Sur tous les articles\nde ce portant", sous: "Prix barré affiché sur chaque étiquette.", meta: "SECONDE DÉMARQUE À PARTIR DU 21 JANVIER" }],
  ["ruban", "carre", "chaud", "Commerce & promotion", "Soldes — fin de stock", { sur: "Information", titre: "TOUT PARTI", sous: "Il ne reste plus rien de la collection soldée. Merci d'être passés si nombreux.", meta: "NOUVELLE COLLECTION LE 15 FÉVRIER" }],

  /* ══════════ Campagne : événement associatif ══════════ */

  ["soleil", "a3", "chaud", "Impression & affiche", "Fête de quartier — affiche", { sur: "Comité des fêtes", titre: "Fête\ndu quartier", sous: "Vide-grenier dès 8 h, buvette, barbecue, bal à 21 h et feu d'artifice à 23 h.", meta: "SAMEDI 27 JUIN — PLACE DU MARCHÉ — ENTRÉE LIBRE" }],
  ["calendrier", "carre", "vif", "Événement", "Fête de quartier — post date", { sur: "SAMEDI 27 JUIN", gros: "27", titre: "Fête\ndu quartier", items: ["Vide-grenier dès 8 h", "Barbecue à midi, 8 € l'assiette", "Bal à 21 h, entrée libre", "Feu d'artifice à 23 h"] }],
  ["chrono", "large", "vif", "Événement", "Fête de quartier — programme", { titre: "Le programme\nde la journée", sous: "Tout se passe place du Marché.", items: ["8 h|Vide-grenier.", "12 h|Barbecue.", "16 h|Jeux pour enfants.", "21 h|Bal et feu d'artifice."], meta: "Repli en salle des fêtes en cas de pluie" }],
  ["recrute", "a4", "froid", "Événement", "Fête de quartier — appel à bénévoles", { sur: "APPEL À BÉNÉVOLES", titre: "La fête\na besoin\nde vingt mains", sous: "Montage vendredi, tenue de stands samedi, rangement dimanche", items: ["Repas et boissons offerts", "Créneaux de trois heures", "Aucune compétence requise"], meta: "Inscriptions : benevoles@comitedesfetes.fr" }],
  ["billet", "billet", "vif", "Événement", "Fête de quartier — ticket repas", { sur: "TICKET REPAS", titre: "BARBECUE — 27 JUIN", gros: "8€", meta: "SERVI DE 12 H À 14 H", sous: "Une assiette, un dessert, une boisson — à présenter au stand" }],
  ["cadre", "a5", "clair", "Événement", "Fête de quartier — inscription exposant", { sur: "Vide-grenier", titre: "Inscription\nexposants", sous: "8 € le mètre linéaire, trois mètres minimum. Installation à partir de 6 h 30, véhicules évacués à 8 h.", meta: "INSCRIPTIONS EN MAIRIE JUSQU'AU 1ER JUIN" }],
  ["stats", "large", "tech", "Événement", "Fête de quartier — bilan", { sur: "Bilan 2026", titre: "La fête\nen trois chiffres", items: ["120|exposants", "3 400|visiteurs", "42|bénévoles"], meta: "Bénéfices intégralement reversés aux écoles du quartier" }],

  /* ══════════ Campagne : cabinet et prise de rendez-vous ══════════ */

  ["contact", "carte", "froid", "Santé & cabinet", "Cabinet — carte de rendez-vous", { sur: "Prochain rendez-vous", titre: "Cabinet\ndu Marché", sous: "Prévenez 24 h à l'avance en cas d'empêchement.", items: ["Date : ____ / ____ / ______", "Heure : ______ h ______", "Praticien : ______________", "05 56 00 00 00"], meta: "12 rue du Marché, 33000 Bordeaux" }],
  ["horaires", "a4", "froid", "Santé & cabinet", "Cabinet — affichage horaires", { sur: "Cabinet", titre: "Horaires\nde consultation", items: ["Lundi|8 h 30 – 12 h · 14 h – 18 h", "Mardi|8 h 30 – 12 h", "Mercredi|8 h 30 – 12 h · 14 h – 19 h", "Jeudi|8 h 30 – 12 h · 14 h – 18 h", "Vendredi|8 h 30 – 12 h · 14 h – 17 h", "Samedi|Urgences uniquement"], meta: "PRISE DE RENDEZ-VOUS EN LIGNE OU AU 05 56 00 00 00" }],
  ["cadre", "a5", "clair", "Santé & cabinet", "Cabinet — règle d'annulation", { sur: "Information", titre: "Annulation\nsous 24 heures", sous: "Toute consultation non décommandée vingt-quatre heures à l'avance est facturée. Le créneau libéré profite à un autre patient.", meta: "MERCI DE VOTRE COMPRÉHENSION" }],
  ["checklist", "a5", "clair", "Santé & cabinet", "Cabinet — à apporter", { sur: "Votre venue", titre: "À apporter", items: ["Carte Vitale à jour", "Carte de mutuelle", "Ordonnances en cours", "Résultats d'examens récents", "Carnet de vaccination", "La liste de vos questions"], meta: "Cinq minutes gagnées, autant de temps pour vous écouter" }],
  ["visite", "carte", "froid", "Santé & cabinet", "Cabinet — carte praticien", { gros: "SB", titre: "Dr Sofia Bernard", sur: "MÉDECIN GÉNÉRALISTE", sous: "12 rue du Marché, Bordeaux · 05 56 00 00 00 · RPPS 10000000000" }],

  /* ══════════ Campagne : restaurant, carte et service ══════════ */

  ["menu", "menuc", "terre", "Restauration & café", "Restaurant — carte principale", { sur: "Carte", titre: "Nos plats", items: ["Terrine de campagne, cornichons maison|9", "Velouté de saison, huile de noisette|8", "Joue de bœuf braisée, purée de céleri|22", "Cabillaud rôti, beurre blanc, épinards|24", "Risotto d'épeautre aux champignons|19", "Tarte fine aux pommes, glace vanille|9"], meta: "Prix nets, service compris — la carte change chaque lundi" }],
  ["etiquette", "etiq", "chaud", "Restauration & café", "Restaurant — ardoise du jour", { sur: "PLAT DU JOUR", gros: "14 €", titre: "Joue de bœuf braisée,\npurée de céleri", sous: "Entrée + plat 18 € — plat + dessert 18 €", meta: "SERVI DE 12 H À 14 H" }],
  ["horaires", "a5", "sombre", "Restauration & café", "Restaurant — horaires vitrine", { sur: "Service", titre: "Horaires", items: ["Lundi|Fermé", "Mardi – jeudi|12 h – 14 h · 19 h – 22 h", "Vendredi – samedi|12 h – 14 h · 19 h – 23 h", "Dimanche|12 h – 15 h"], meta: "RÉSERVATION CONSEILLÉE — 05 56 00 00 00" }],
  ["notation", "large", "clair", "Restauration & café", "Restaurant — avis mis en avant", { gros: "4,6", sur: "sur 380 avis Google", titre: "Produits d'une fraîcheur évidente, service attentif sans être pesant, addition honnête pour la qualité.", auteur: "Camille D.", meta: "Avis publié en mai 2026" }],
  ["evenement", "carre", "sombre", "Restauration & café", "Restaurant — soirée à thème", { sur: "Soirée", titre: "Blind test\net planches", meta: "JEUDI 18 JUIN — 20 H", sous: "Équipes de quatre, inscription au comptoir", cta: "Réservation conseillée au 05 56 00 00 00" }],
  ["billet", "billet", "chaud", "Restauration & café", "Restaurant — bon repas", { sur: "BON CADEAU", titre: "MENU DÉGUSTATION", gros: "52€", meta: "VALABLE 1 AN", sous: "Pour une personne, hors boissons, sur réservation" }],

  /* ══════════ Campagne : artisan et devis ══════════ */

  ["panneau", "a4", "terre", "Artisanat & bâtiment", "Artisan — plaquette", { gros: "20", sur: "Depuis 2006", titre: "Menuiserie\nBerthier", sous: "Escaliers, parquets, agencement sur mesure. Vingt ans de chantiers dans la région, et pas un abandonné en route.", meta: "Devis gratuit — 06 00 00 00 00" }],
  ["typo", "bandeau", "sombre", "Artisanat & bâtiment", "Artisan — bâche de chantier", { titre: "ICI TRAVAILLE\nLA MENUISERIE\nBERTHIER", sous: "Escaliers, agencement, restauration du bâti ancien.", meta: "06 00 00 00 00 — MENUISERIE-BERTHIER.FR" }],
  ["visite", "carte", "terre", "Artisanat & bâtiment", "Artisan — carte de visite", { gros: "MB", titre: "Menuiserie Berthier", sur: "MENUISIER — AGENCEUR", sous: "06 00 00 00 00 · contact@menuiserie-berthier.fr · Bordeaux" }],
  ["tableau", "a4", "clair", "Artisanat & bâtiment", "Artisan — devis type", { titre: "Devis\nn° D-2026-0092", sous: "Établi le 3 avril 2026 — valable trois mois.", sur: "PRESTATION|MONTANT HT", items: ["Relevé de cotes et étude|Offert", "Fabrication escalier chêne|2 800,00 €", "Traitement et finition|420,00 €", "Pose sur site (2 jours)|760,00 €", "Total HT|3 980,00 €", "Total TTC (TVA 10 %)|4 378,00 €"], meta: "Bon pour accord, date et signature — acompte de 30 % à la commande" }],
  ["avantapres", "carre", "froid", "Artisanat & bâtiment", "Artisan — chantier en images", { titre: "Une cuisine,\ntrois semaines", sur: "AVANT", cta: "APRÈS", items: ["Meubles de 1985, plan gonflé, rien en hauteur.", "Chêne massif, plan granit, rangé jusqu'au plafond."], sous: "14 200 € TTC, pose comprise, sans dépassement.", meta: "Chantier réalisé en mars 2026 à Talence" }],
  ["avantages", "large", "terre", "Artisanat & bâtiment", "Artisan — garanties", { titre: "Trois garanties\nsérieuses", sous: "Attestations fournies avant signature.", items: ["Décennale|Assurance à jour, attestation remise.", "Devis ferme|Aucun supplément sans avenant signé.", "Atelier local|Fabrication à Bordeaux, pas d'import."], meta: "SIRET et assurances communiqués sur simple demande" }],

  /* ══════════ Campagne : formation et inscription ══════════ */

  ["couverture", "a4", "froid", "Éducation & association", "Formation — couverture de programme", { sur: "Formation professionnelle", titre: "Sécurité\nau travail", sous: "Quatorze heures sur deux journées, en présentiel, groupe de douze maximum.", auteur: "Organisme certifié Qualiopi — 05 56 00 00 00" }],
  ["tableau", "a4", "clair", "Éducation & association", "Formation — programme détaillé", { titre: "Programme", sous: "Quatorze heures réparties sur deux journées consécutives.", sur: "SÉQUENCE|DURÉE", items: ["Cadre réglementaire|2 h", "Analyse des risques|3 h", "Mise en pratique|4 h", "Étude de cas|3 h", "Évaluation|1 h", "Bilan et questions|1 h"], meta: "Support remis en fin de formation — attestation délivrée le jour même" }],
  ["tarif", "a4", "froid", "Éducation & association", "Formation — tarif", { sur: "FORMATION", gros: "690 €", sous: "par personne, deux journées, repas compris", items: ["Groupe de douze maximum", "Support papier et numérique", "Attestation le jour même", "Financement CPF et OPCO", "Report gratuit jusqu'à 7 jours avant"], cta: "S'inscrire à une session" }],
  ["calendrier", "a5", "vif", "Éducation & association", "Formation — prochaine session", { sur: "LUNDI 12 OCTOBRE", gros: "12", titre: "Prochaine\nsession", items: ["12 et 13 octobre, 9 h à 17 h", "Bordeaux, salle de formation", "Douze places, quatre restantes", "Inscription jusqu'au 5 octobre"] }],
  ["certificat", "paysage", "chic", "Éducation & association", "Formation — attestation", { sur: "ATTESTATION DE FORMATION", titre: "Aline Roux", auteur: "Sofia Bernard, responsable pédagogique", sous: "a suivi la formation « Sécurité au travail », d'une durée de quatorze heures, les 12 et 13 octobre 2026.", meta: "BORDEAUX, LE 13 OCTOBRE 2026" }],
  ["faq", "a4", "clair", "Éducation & association", "Formation — questions", { sur: "Avant de vous inscrire", titre: "Quatre réponses\npratiques", items: ["Est-ce finançable ?|CPF, OPCO et France Travail, dossier monté par nos soins.", "Quel niveau requis ?|Aucun prérequis.", "Y a-t-il un examen ?|Une évaluation, rien d'éliminatoire.", "Et si j'annule ?|Report gratuit jusqu'à sept jours avant."], meta: "formation@exemple.fr — 05 56 00 00 00" }],

  /* ══════════ Campagne : logiciel et essai gratuit ══════════ */

  ["banniere", "bandeau", "tech", "Web & e-mail", "Logiciel — bandeau d'accueil", { gros: "14J", titre: "Quatorze jours d'essai, sans carte bancaire", sous: "Toutes les fonctions, aucun engagement, export complet à tout moment.", cta: "Commencer l'essai" }],
  ["cartes", "large", "tech", "Tech & startup", "Logiciel — trois plans", { titre: "Trois plans,\naucune surprise", sous: "Changez ou arrêtez à tout moment, au prorata.", items: ["Solo|9 €/mois, un utilisateur.", "Équipe|29 €/mois, jusqu'à dix.", "Entreprise|Sur devis, hébergement dédié."] }],
  ["etapes", "large", "froid", "Tech & startup", "Logiciel — prise en main", { titre: "En route\nen quinze minutes", sous: "Aucune installation, aucun consultant.", items: ["Créer un compte|Une adresse e-mail suffit.", "Importer|CSV ou connexion directe.", "Inviter|L'équipe reçoit un lien.", "Utiliser|Premiers rapports le soir même."] }],
  ["comparatif", "large", "tech", "Tech & startup", "Logiciel — gratuit ou payant", { titre: "Ce que change\nle plan payant", sur: "GRATUIT", cta: "PAYANT", items: ["1 utilisateur|Jusqu'à 10", "30 jours d'historique|2 ans", "Export manuel|API complète", "Support communautaire|Réponse sous 4 h", "0 €|29 €/mois"], meta: "Aucune fonction n'a été retirée du plan gratuit depuis 2021" }],
  ["faq", "a4", "clair", "Tech & startup", "Logiciel — questions d'essai", { sur: "Avant d'essayer", titre: "Quatre réponses\nsans piège", items: ["Faut-il une carte bancaire ?|Non, et rien ne se déclenche à la fin.", "Que se passe-t-il après 14 jours ?|Le compte passe en lecture seule.", "Puis-je exporter mes données ?|À tout moment, en un clic, format ouvert.", "Y a-t-il un engagement ?|Aucun, y compris sur les plans payants."], meta: "support@exemple.fr — réponse sous quatre heures ouvrées" }],
  ["neon", "large", "tech", "Tech & startup", "Logiciel — annonce de version", { gros: "v3", titre: "La version 3 est en ligne", sous: "Deux ans de retours utilisateurs, une interface repensée, aucun surcoût." }],

  /* ══════════ Campagne : club sportif et saison ══════════ */

  ["ecusson", "logo", "sombre", "Marque & logo", "Club — écusson", { gros: "ASR", meta: "EST. 1962", titre: "AS Rivière", sous: "Ne rien lâcher" }],
  ["recrute", "a3", "vif", "Sport & bien-être", "Club — affiche d'inscriptions", { sur: "INSCRIPTIONS OUVERTES", titre: "Rejoignez\nle club", sous: "Saison 2026-2027 — de 6 à 60 ans — deux entraînements par semaine", items: ["Licence 120 € l'année, tout compris", "Équipement fourni la première année", "Aide de la mairie possible"], meta: "Permanences les samedis de juin, 10 h à 12 h — stade municipal" }],
  ["score", "carre", "vif", "Sport & bien-être", "Club — résultat de match", { sur: "CHAMPIONNAT — J18", items: ["AS Rivière", "US Combe"], gros: "4-0", titre: "Maintien assuré à deux journées de la fin", meta: "SAMEDI 20 H — STADE MUNICIPAL" }],
  ["tableau", "a4", "sombre", "Sport & bien-être", "Club — classement", { titre: "Classement\nde la poule", sous: "Après dix-huit journées.", sur: "ÉQUIPE|POINTS", items: ["AS Rivière|42", "US Combe|39", "FC Port|35", "Halles FC|31", "AS Forges|24", "US Marché|19"], meta: "Deux premiers montent — dernier relégué" }],
  ["horaires", "a4", "vif", "Sport & bien-être", "Club — planning d'entraînement", { sur: "Entraînements", titre: "Planning\nde la semaine", items: ["Lundi|U11, 17 h 30", "Mardi|Seniors, 19 h 30", "Mercredi|U15, 14 h", "Jeudi|Seniors, 19 h 30", "Vendredi|U13, 17 h 30", "Samedi|Matchs, horaires variables"], meta: "PLANNING SUSPENDU PENDANT LES VACANCES SCOLAIRES" }],
  ["calendrier", "carre", "vif", "Sport & bien-être", "Club — tournoi", { sur: "DIMANCHE 7 JUIN", gros: "07", titre: "Tournoi\nde printemps", items: ["Dès 9 h, stade municipal", "Douze équipes, catégorie U15", "Buvette tenue par les parents", "Remise des prix à 17 h"] }],

];
