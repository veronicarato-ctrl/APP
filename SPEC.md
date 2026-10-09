# Prompt pour Claude Code, application « Guião de viagem » (version 2)

Mode d'emploi. Le dépôt contient ce fichier (`SPEC.md`) et le prototype de référence du voyage au Brésil, `guiao-viagem-brasil.jsx`. Ouvrir Claude Code dans ce dossier et écrire « Lis SPEC.md et le prototype, puis commence par la section 15 ».

---

## 1. Contexte et objectif

Je veux construire une application personnelle de voyage, utilisée d'abord par deux adultes sur téléphone, qui accompagne un voyage depuis l'idée jusqu'au retour, en co‑construisant l'itinéraire avec l'utilisateur, en le gardant fiable et cohérent, et en l'adaptant pendant le voyage, y compris sans réseau.

La promesse est la suivante, l'utilisateur choisit l'expérience qu'il veut vivre, l'application construit le voyage avec lui, veille sur son déroulement et l'adapte avec lui jusqu'au retour, mais ne décide jamais à sa place.

Le fichier `guiao-viagem-brasil.jsx` est un prototype fonctionnel construit dans Claude, à utiliser comme spécification de référence pour le modèle de données, le moteur de règles, l'assistant et le design, sans le copier tel quel puisqu'il repose sur un stockage propre à Claude. Le premier voyage chargé est le Brésil (14 au 26 décembre 2026, Ceará puis Amazonie), dont les données se trouvent dans les constantes `PLACES`, `BOOKINGS`, `DAYS`, `SRC`, `BX`, `SX`, `NOTES`, `PREP` et `NEWCHECKS`, et tu dois les reprendre exactement, sans rien inventer ni compléter. Le fichier `bresil-2026.jsx`, version antérieure du guide, est exclu et ne sert de source ni pour les données ni pour le design.

**L'application est construite en anglais.** Toute l'interface (libellés, boutons, messages, alertes, textes générés par l'IA) est en anglais, avec une architecture de traduction (i18n) dès le départ pour pouvoir ajouter ensuite le portugais européen et le français sans toucher au code. Le code, les noms de variables, les commentaires et le fichier `CLAUDE.md` sont aussi en anglais. Les données déjà saisies du voyage au Brésil (titres, notes) sont importées telles quelles en portugais, sans traduction automatique, et un champ `lang` indique la langue de chaque contenu.

## 2. Principes non négociables

1. **Une seule source de vérité.** Chaque écran est calculé à partir d'un modèle de données unique, et une information (référence, adresse, date) n'existe qu'à un seul endroit. Les jours de la semaine sont calculés à partir des dates, jamais stockés.
2. **L'IA propose, l'utilisateur décide.** Aucune modification venant de l'IA n'est appliquée sans validation explicite, opération par opération.
3. **Les réservations confirmées sont intouchables.** Les activités liées sont verrouillées (marqueur 🔴) et ne peuvent être ni modifiées, ni déplacées, ni supprimées tant que la réservation n'a pas été déverrouillée par l'utilisateur.
4. **Rien n'est supprimé ni déplacé de jour sans confirmation**, et tout est inscrit dans l'historique.
5. **Transparence sur la nature de chaque information**, classée en vérifié (avec source et date de vérification), estimé, préconisation, ou proposé par l'IA. Un prix est confirmé, estimé ou exprimé en fourchette.
6. **Aucune invention factuelle.** Horaires de vol, prix, adresses, règles d'entrée, informations de santé ou fréquences de transport sans source restent vides et donnent lieu à une question.
7. **Ordre de priorité de toute proposition**, sécurité, obligations légales, réservations confirmées, incontournables, budget, préférences, rythme, cohérence géographique, optimisation.

## 3. Stack technique

1. Vite, React et TypeScript, Tailwind, application web progressive installable (vite-plugin-pwa, manifeste, service worker).
2. Hors ligne d'abord, avec copie locale complète du voyage dans IndexedDB (Dexie) et mise en cache de l'application.
3. Supabase (offre gratuite) pour l'authentification par lien magique, la base de données, la synchronisation entre deux comptes partageant un voyage et le stockage des photos et billets. Résolution des conflits par champ, avec alerte visible si une réservation confirmée a été modifiée des deux côtés. Prévoir la remise en route si le projet gratuit est mis en pause après une semaine d'inactivité.
4. Vercel (offre Hobby) pour l'hébergement, déployé automatiquement depuis GitHub.
5. Fonctions serveur Vercel pour tous les appels à l'API Claude, la clé restant dans une variable d'environnement secrète et n'atteignant jamais le téléphone.
6. Carte Leaflet avec tuiles OpenStreetMap, en respectant leur politique d'usage (pas de téléchargement massif de tuiles).
7. Météo et taux de change par des services gratuits sans clé (par exemple Open‑Meteo et Frankfurter, à vérifier avant usage), avec date de dernière mise à jour affichée.
8. Identifiants en UUID, fuseaux horaires gérés explicitement (chaque lieu porte son fuseau IANA, par exemple America/Fortaleza et America/Manaus), horaires de transport toujours en heure locale du lieu.

## 4. Modèle de données

1. **Trip**, `name`, `start`, `end`, `travellers` (adultes, enfants et âges), `origin`, `homeTz` (Europe/Zurich), `homePlug` (types C et J, 230 V), `homeCurrency` (CHF), `budget` (montant total), `modes` (liste de modes avec importance de 1 à 5), `pace` (tranquille, équilibré, soutenu), `returnFeeling` (comment rentrer, voir 6.1), `mustDo` (liste), `constraints` (texte), `transports` (modes acceptés), `rules` (`maxHeavy`, `siesta`, `checkoutBy`, `minMarginMin`), `theme` (couleurs d'identité et couleurs de région, voir 10.3), `v` (version du schéma).
2. **Place**, `id`, `name`, `lat`, `lng`, `tz`, `region`, `approx` (coordonnées approximatives), `kind` (hébergement, gare, aéroport, restaurant, activité, autre), `plug` (types de prise), `voltage`, avec source pour ces deux derniers champs.
3. **Booking**, `id`, `kind`, `title`, `status` (todo, urgent, confirmed), `ref`, `tel`, `addr`, `checkIn`, `checkOut`, `from`, `to`, `date`, `time`, `placeId`, `note`, `links`, `sources`, `opDays` (jours où un vol opère), `noRoute`, `warn`, `price` (montant, devise, nature confirmé, estimé ou fourchette), `files` (billets, QR codes).
4. **Slot**, `id`, `type` (transporte, alojamento, refeição, cultura, natureza, espectáculo, descanso, ritual), `title`, `detail`, `start`, `end`, `durationMin`, `placeId`, `bookingId`, `heavy`, `who`, `desc`, `tips`, `price`, `sources`, `origin` (utilisateur ou IA), `info` (vérifié, estimé, préconisation, proposé). L'ordre des slots dans la journée est significatif.
5. **Day**, indexé par date, avec `note`, `mood` (curseurs du jour, voir 7.5) et la liste ordonnée des slots.
6. **Source**, `id`, `title`, `url`, `checkedAt`.
7. **Expense**, `id`, `date`, `amount`, `currency`, `rate`, `category`, `slotId`, `note`.
8. **Postcard**, voir 7.6.
9. **SafetyItem**, `id`, `region` (pays, État ou étape), `category` (criminalité, catastrophe naturelle, animaux, maladies, routes et transports, eau et baignade, autre), `level` (information, vigilance, danger), `text`, `doList`, `dontList`, `season`, `sources`, `checkedAt`.
10. **EmergencyContact**, `id`, `scope` (pays, étape, voyage), `kind` (police, ambulance, pompiers, police touristique, ambassade, consulat, assurance, hébergement, autre), `name`, `phone`, `address`, `hours`, `sources`, `checkedAt`.
11. **Check**, **Log** (qui, quand, quoi) et **Settings**.

## 5. Navigation, cinq onglets

1. **Aujourd'hui**, écran d'ouverture pendant le voyage (avant le départ, il affiche le compte à rebours et les tâches urgentes). Il montre toujours l'hébergement du soir (nom, adresse, téléphone, référence, heure de check‑in, bouton d'appel et d'itinéraire) et les transports du jour avec leurs références.
2. **Itinéraire**, avec la barre des jours et le programme jour par jour.
3. **Carte**.
4. **Pratique**, page d'accueil en grandes tuiles visibles d'un coup d'œil, Hébergements, Transports, Réservations, Budget, Préparer (documents, santé, électricité, argent, téléphone, équipement), Sécurité, Urgences, Traduire, Vérification. Chaque tuile affiche un résumé (par exemple « 3 réservations urgentes » ou « 2 adaptateurs à prévoir ») et s'ouvre en page complète. Une recherche globale permet de retrouver une adresse ou une référence en une saisie.
5. **Assistant**, avec la co‑construction, les propositions de modification et l'historique.

Les hébergements et transports sont aussi accessibles directement depuis chaque jour de l'itinéraire et depuis la carte, de sorte qu'aucune information pratique ne soit à plus de deux touchers.

Trois boutons flottants sont accessibles partout pendant le voyage, « Surprise me », « Postcard » et un bouton **SOS** rouge, discret mais toujours présent, qui ouvre la fiche d'urgence (section 7.12).

## 6. Co‑construction du voyage

### 6.1 Départ par une phrase
L'utilisateur commence par une phrase libre, par exemple « Nous sommes deux, dix jours au Brésil en décembre avec environ 6 000 CHF, nous voulons des plages sauvages, la forêt amazonienne et rencontrer une communauté indigène ». L'IA en extrait destination, dates ou période, voyageurs, budget et devise, modes, rythme, incontournables et contraintes, puis affiche ce qu'elle a compris sous forme de fiches modifiables, chaque élément déduit étant marqué comme tel.

### 6.2 Questions d'affinage
L'IA ne pose ensuite que les questions réellement nécessaires, par tours courts (trois questions au plus par tour, avec réponses à choix et champ libre), en commençant par ce qui change le plus le parcours. Les questions possibles portent sur les modes et leur importance de 1 à 5 (gastronomie, farniente, randonnée, culture, nature, rural et producteurs, vie locale, romantique, luxe, famille, vie nocturne, shopping), le rythme, les transports acceptés, les incontournables, les contraintes, et la question « Comment voulez‑vous rentrer de ce voyage ? » (reposés, dépaysés, cultivés, surpris, rassasiés, transformés, avec des souvenirs partagés, avec l'impression d'avoir vécu comme des locaux). Cette dernière réponse règle le moteur, par exemple « reposés » abaisse `maxHeavy` à 1 et active la sieste. L'utilisateur peut à tout moment répondre « je ne sais pas » ou « propose ».

### 6.3 Construction par étages
1. L'IA propose une ossature (étapes, nombre de nuits, transports entre étapes), si possible en deux ou trois variantes expliquées, chacune avec ses compromis.
2. L'utilisateur choisit, modifie ou demande une autre variante, et rien n'est créé dans le voyage avant validation.
3. L'IA détaille ensuite jour par jour, étape par étape, sous forme d'opérations proposées (section 8), validées une à une.
4. Tout fait non vérifié reste marqué « proposé » ou « estimé » jusqu'à vérification ou réservation.

Le voyage au Brésil, déjà construit, est importé directement et ne passe pas par cette étape.

## 7. Fonctionnalités

### 7.1 Barre des jours
Barre horizontale montrant tous les jours d'un coup d'œil, colorée par région selon les couleurs de région du voyage (section 10.3, pour le Brésil jaune pour le Ceará, vert pour l'Amazonie, case partagée en diagonale pour un jour de transition), avec un point rouge en cas d'erreur et un défilement vers le jour touché. Élément central à conserver.

### 7.2 Itinéraire et éditeurs
Fiches par jour (numéro, date calculée, ville, région, note, problèmes du jour, score de sérénité), slots dépliables (description, prix avec sa nature, conseils, liens, sources avec date de vérification, bouton Modifier). Éditeur de slot et éditeur de réservation en feuille glissante depuis le bas, avec confirmation pour tout changement de jour, toute suppression, toute confirmation sans référence et tout déverrouillage.

### 7.3 Heure locale et écart avec la maison
L'heure locale et l'écart avec la maison (Genève) sont affichés partout où ils comptent, en haut de l'écran Aujourd'hui (par exemple « 14h05 à Manaus · 19h05 à Genève · −5 h » en décembre), dans l'en‑tête de chaque jour, sur chaque étape de la carte, et sur chaque transport qui change de fuseau (« départ 18h30 heure de Fortaleza, arrivée 21h00 heure de Manaus, −1 h »). Un changement de fuseau dans la journée est signalé par une alerte douce la veille. Les écarts sont toujours calculés à partir des fuseaux IANA du lieu et de la maison à la date concernée, jamais saisis à la main, pour tenir compte automatiquement des changements d'heure en Europe et d'éventuels changements de règles au Brésil. Un petit outil « appeler la maison » indique si l'heure à Genève est raisonnable pour téléphoner.

### 7.4 Écran Aujourd'hui
Heure locale du lieu et heure à la maison, météo du jour, prochaine activité et temps restant avant le prochain départ, budget disponible aujourd'hui, score de sérénité expliqué, alerte éventuelle, puis des boutons rapides, « continuer mon programme », « je suis fatigué », « il pleut », « j'ai moins de temps », « j'ai plus de temps », « bien manger », « dépenser moins ». Chaque bouton envoie à l'assistant une demande prédéfinie qui ne recalcule que le nécessaire et conserve les réservations, la réponse étant une proposition à valider.

### 7.5 Humeur du jour
Curseurs rapides (repos, découverte, gastronomie, marche, dépense), qui ne modifient que la journée en cours ou les prochaines heures, et alimentent les propositions de l'assistant et de « Surprise me ».

### 7.6 Carte postale
À tout moment du voyage, l'utilisateur crée une carte postale numérique et l'envoie à un ami.
1. Choix d'une photo prise sur le moment ou dans la galerie.
2. Texte écrit par l'utilisateur, avec une aide facultative de l'IA qui propose deux ou trois formulations à partir du lieu, du jour et de quelques mots‑clés, toujours modifiables. Le texte est celui de l'utilisateur, l'IA ne l'envoie jamais elle‑même.
3. Habillage automatique en image (format carte postale, recto photo, verso texte, nom du lieu, date, petit timbre graphique et cachet du jour), avec deux ou trois styles visuels cohérents avec le design de l'app.
4. Envoi par la feuille de partage native du téléphone (Web Share API), donc par WhatsApp, message, e‑mail ou autre, avec repli en téléchargement de l'image si le partage n'est pas disponible.
5. Le lieu indiqué est celui de l'étape du jour par défaut, jamais la position GPS exacte sans choix explicite.
6. Hors ligne, la carte est préparée et mise en file d'attente, puis proposée à l'envoi au retour du réseau.
7. Toutes les cartes sont conservées dans un carnet de voyage consultable (destinataire, date, lieu), qui pourra plus tard servir de souvenir du voyage. L'envoi d'une carte imprimée par la poste est une piste ultérieure, hors de cette version.

### 7.7 Surprise me
Une proposition d'expérience non prévue, sans désorganiser le voyage.
1. Entrées, lieu de l'étape (ou position si l'utilisateur l'autorise), heure locale, temps disponible jusqu'à la prochaine activité verrouillée ou réservée, modes et importance, humeur du jour, budget restant, météo.
2. Le serveur demande à Claude, avec recherche web, une à trois propositions concrètes, chacune avec distance ou temps de trajet, horaires d'ouverture, coût et sa nature (confirmé, estimé), correspondance avec les préférences, marge restante avant le prochain engagement, et source avec date.
3. Règle stricte, une proposition qui ne laisse pas la marge minimale (`minMarginMin`) avant la prochaine activité réservée est écartée, et une information non sourcée est marquée « à vérifier sur place ».
4. Hors ligne, l'app puise dans une réserve d'idées préparée avant le départ pour chaque étape (générée par l'IA, sourcée, validée par l'utilisateur), en indiquant qu'elle n'est pas actualisée.
5. Accepter une surprise l'ajoute comme slot « proposé » après validation, jamais automatiquement.

### 7.8 Carte intégrée (remplace l'export Google My Maps)
Aucun export KML ni Google My Maps. La carte est intégrée à l'application.
1. Tracé de l'itinéraire complet, coloré par région, avec les étapes numérotées.
2. Filtre par jour (toucher un jour sur la barre centre la carte sur ce jour et affiche le tracé du jour dans l'ordre des slots).
3. Calques activables, hébergements, transports (gares, aéroports, ports), activités, restaurants, propositions de l'IA.
4. Marqueur touché, fiche avec horaire, statut de réservation, prix, lien vers le slot, et bouton « Itinéraire » ouvrant la navigation dans Google Maps ou Apple Plans.
5. Indicateur du jour, temps passé en déplacements comparé au temps passé sur place.
6. Mention « coordonnées approximatives » quand c'est le cas.
7. Hors ligne, la carte reste utilisable avec les tuiles déjà consultées en cache, et à défaut un plan simplifié des lieux avec coordonnées et adresses.

### 7.9 Budget vivant et double devise
Budget total, dépensé, reste, projection jusqu'au retour, budget journalier conseillé, en devise locale et en francs suisses, avec date du dernier taux téléchargé. Saisie rapide d'une dépense (montant, devise, catégorie) et contextualisation simple (« ce dîner représente environ 7 % du budget restant »). Si l'on est sous le budget prévu, l'app propose des options (garder la marge, améliorer une nuit, ajouter une expérience), l'utilisateur restant décisionnaire.

### 7.10 Préparer
Contenu de `PREP` pour le Brésil, enrichi d'une fiche courte (documents, santé, argent, téléphone et besoin de données, électricité, équipement, spécialités à goûter et à rapporter avec restrictions douanières éventuelles).

La rubrique Électricité est calculée à partir des lieux du voyage et des prises de la maison, et affiche pour chaque étape le type de prise et la tension (par exemple Ceará 220 V, Amazonas 127 V, prise brésilienne type N), puis une conclusion pratique, quels adaptateurs emporter et combien, si les fiches suisses type J nécessitent un adaptateur, si les fiches européennes type C entrent ou non dans les prises locales, et un rappel de vérifier sur chaque chargeur la mention « 100‑240 V » avant de le brancher, un appareil prévu uniquement pour 230 V (sèche‑cheveux, fer, certains rasoirs) ne devant pas être branché en 127 V. Une liste de contrôle des chargeurs (téléphones, montres, appareil photo, ordinateur, batterie externe, lampe frontale) se coche avant le départ, avec la suggestion d'une multiprise de voyage pour n'avoir qu'un adaptateur par chambre. Chaque affirmation technique porte sa source. Santé et documents affichent toujours la source, la date de vérification et le statut (obligatoire, recommandé, à vérifier individuellement), avec la mention que ces informations ne remplacent pas un avis médical individuel.

### 7.11 Sécurité par zone
Une fiche de sécurité par pays et par étape, construite uniquement à partir de sources officielles (avis aux voyageurs du DFAE suisse en priorité, complétés si utile par d'autres gouvernements ou par les autorités locales et sanitaires), chaque élément affichant sa source, sa date de vérification et son niveau (information, vigilance, danger).
1. **Criminalité**, zones et horaires à éviter, risques typiques (vols, arnaques, enlèvements express), conduite à tenir.
2. **Catastrophes naturelles**, séismes, cyclones et typhons, crues, glissements de terrain, incendies, selon ce qui existe réellement dans la zone et à la saison du voyage, avec les gestes à connaître. L'app n'affiche rien pour un risque absent de la zone plutôt que de remplir par défaut.
3. **Animaux**, risques réels de la zone (par exemple serpents, raies, moustiques, animaux en liberté), précautions et conduite en cas de morsure ou de piqûre.
4. **Maladies**, risques importants et mesures de prévention, renvoyant à la rubrique santé de Préparer avec la mention que cela ne remplace pas un avis médical.
5. **Baignade, routes et transports**, courants, conduite de nuit, transports déconseillés.
Chaque fiche commence par trois points essentiels, le détail venant ensuite. Avant le départ, l'assistant peut préparer ces fiches par recherche web, mais elles restent au statut « proposé » tant que l'utilisateur ne les a pas relues. Aucune information de sécurité n'est inventée, et l'app ne prétend jamais à l'exhaustivité.

### 7.12 Urgences
Une fiche d'urgence accessible en un toucher depuis le bouton SOS et disponible hors ligne.
1. Numéros d'urgence du pays, chacun avec un bouton d'appel direct (pour le Brésil, 190 police, 192 SAMU ambulance, 193 pompiers, à confirmer et sourcer dans l'app, ainsi que la police touristique si elle existe dans la ville).
2. Ambassade et consulat le plus proche de l'étape pour chaque nationalité des voyageurs (pour la Suisse, représentation compétente au Brésil), avec adresse, téléphone, horaires et numéro d'urgence hors heures, uniquement depuis les sites officiels.
3. Assurance voyage (numéro d'assistance 24 h sur 24, numéro de contrat) et hôpital ou centre de santé le plus proche de chaque étape.
4. Adresse de l'hébergement du soir en portugais, affichable en grand pour la montrer à un chauffeur ou à un secours.
5. Phrases d'urgence prêtes à montrer (« J'ai besoin d'un médecin », « Appelez une ambulance », « Je suis allergique à… ») en langue locale avec leur traduction.
6. Bouton « partager ma position » vers un contact choisi, uniquement sur action de l'utilisateur.
Chaque numéro porte sa source et sa date de vérification, et l'app signale clairement un numéro non vérifié.

### 7.13 Traduire
Accès direct à Google Traduction depuis Pratique, depuis l'écran Aujourd'hui et depuis chaque slot.
1. Lien profond pré‑rempli vers Google Traduction (`https://translate.google.com/?sl=auto&tl=pt&op=translate`, en remplaçant `tl` par la langue de l'étape), qui ouvre l'application Google Traduction si elle est installée, ou le site sinon.
2. Bouton « traduire » sur l'adresse, le nom et la note d'un slot, ouvrant Google Traduction avec le texte déjà rempli (paramètre `text`).
3. Dans Préparer, rappel de télécharger le pack de langue hors ligne dans l'application Google Traduction avant le départ.
4. Un petit lexique hors ligne intégré à l'app (salutations, chiffres, directions, restaurant, santé, urgences), qui reste utilisable sans réseau ni Google Traduction.

### 7.14 Météo et perturbations
Météo par étape, avec préconisations éventuelles (déplacer une activité de plein air) présentées comme propositions à valider. Grèves et perturbations uniquement avec une source nationale reconnue, si possible une seconde source indépendante, la date de publication, la zone concernée et l'impact sur le programme, sans jamais prétendre à l'exhaustivité.

### 7.15 Pack hors ligne
Planning, adresses, coordonnées, réservations, billets et QR codes, budget, fiche d'urgence complète, fiches de sécurité, lexique, informations essentielles et réserve d'idées « Surprise me », avec la mention « dernière synchronisation » et le signalement visuel de toute donnée dynamique non actualisée.

### 7.16 Import de confirmations
Champ où l'on colle le texte d'un e‑mail de confirmation, ou photo d'un billet, l'IA extrayant les champs d'une réservation, présentés champ par champ, rien n'étant enregistré sans validation.

### 7.17 Exports
Export PDF du guide jour par jour, export et import JSON complet pour sauvegarde.

## 8. Moteur de règles et score de sérénité

Le moteur s'exécute à chaque modification et produit des erreurs et des avertissements.

1. Chevauchement de deux slots sans indication de qui fait quoi, erreur.
2. Check‑in qui ne suit pas immédiatement le dernier transport du jour d'arrivée, erreur.
3. Check‑out après `checkoutBy` (10h par défaut), avertissement.
4. Plus de `maxHeavy` activités lourdes, avertissement.
5. Si `siesta` est activée, journée intense sans repos entre 13h et 15h, avertissement.
6. Nuit non couverte ou couverte par plusieurs hébergements, erreur.
7. Réservation confirmée sans référence, ou hébergement sans adresse ni téléphone, avertissement.
8. Slot pointant vers une réservation inexistante, erreur.
9. Vol non confirmé avec `noRoute`, erreur, vol hors de ses `opDays`, erreur avec les jours d'opération, vol avec `warn`, avertissement.
10. Marge inférieure à `minMarginMin` entre une arrivée et l'activité suivante, avertissement.

Le score de sérénité du jour (sur 100) est dérivé de ces résultats et de la météo, toujours expliqué ligne par ligne, présenté comme un indicateur et non comme une mesure scientifique, avec un bouton « optimiser ma journée » qui demande une proposition à l'assistant.

Tests automatisés pour chaque règle. Avec les données du Brésil, le résultat attendu au démarrage est exactement deux erreurs le 20 décembre (pas de vol régulier Jericoacoara vers Fortaleza, vol Gol Fortaleza Manaus uniquement le samedi alors que le 20 est un dimanche) et trois avertissements (vols São Gabriel du 23 et du 25 à confirmer, fréquence Manaus Lisbonne à confirmer).

## 9. Protocole de l'assistant

1. Le serveur envoie à Claude l'état compact du voyage (slots avec indicateur `locked`, réservations, lieux, règles, préférences, humeur du jour) et la demande.
2. Claude répond uniquement en JSON, `{"summary": "...", "ops": [{"op":"add","date":"AAAA-MM-JJ","after":"id","slot":{...}}, {"op":"update","id":"...","date":"(si changement de jour)","patch":{...}}, {"op":"delete","id":"...","reason":"..."}], "questions": ["..."]}`.
3. Le prompt système contient les principes de la section 2 et l'ordre de priorité.
4. L'app valide chaque opération, refuse automatiquement celles qui touchent un slot verrouillé, laisse décochées par défaut les suppressions, signale les changements de jour, et montre les nouveaux problèmes que les opérations cochées créeraient.
5. Rien n'est appliqué sans un toucher sur « Apply », et chaque opération appliquée est inscrite dans l'historique, avec possibilité d'annuler la dernière application.
6. `max_tokens` suffisant (au moins 4000), gestion des réponses tronquées ou non JSON avec message clair et relance possible.

## 10. Design

### 10.1 Structure
Mobile d'abord (380 px), cibles tactiles de 44 px au moins, police système, mode sombre. En‑tête en dégradé des deux fonds foncés d'identité, avec mot en filigrane et sur‑titre en majuscules espacées dans l'accent vif. Fiches blanches aux coins de 14 px avec filet de 3 px en haut dans la couleur de la région. Couleur par type d'activité. Notes et alertes à fond teinté avec filet gauche (jaune d'identité pour avertissement, rouge pour erreur). Toutes les couleurs sont des variables (jetons CSS), jamais des valeurs écrites dans les composants, de sorte qu'un nouveau voyage ne change que les données de `Trip.theme`.

### 10.2 Couleurs générales (identiques pour tous les voyages, jamais modifiées)
Ce sont les couleurs de structure de l'interface, indépendantes de la destination.

1. **Surfaces claires**, fond de page `#f4f7f0`, cartes `#ffffff`, bordures fines `rgba(0,0,0,0.1)`.
2. **Texte**, principal `#1a1410` (presque noir chaud) sur fond clair, secondaire `#5a6a52`, libellés de section sur blanc `#a8780a`.
3. **Texte clair sur fond foncé**, `rgba(205,232,212,0.75)` pour le texte courant, `#ffffff` pour les titres.
4. **Types d'activité**, toujours les mêmes pour que l'œil les reconnaisse d'un voyage à l'autre, car ils encodent un sens et non une destination. Chaque type a quatre valeurs (fond, bordure, texte, point).

| Type | Teinte | Fond | Bordure | Texte | Point |
|---|---|---|---|---|---|
| transporte | bleu | `#e8f2ff` | `#90b8e0` | `#1e4976` | `#2a6fa8` |
| refeição | orange | `#fff2e8` | `#e0a878` | `#7a3520` | `#b05030` |
| cultura | violet | `#f5f0ff` | `#b8a0e0` | `#42286a` | `#6a45a0` |
| espectáculo et ritual | rose | `#fff0f8` | `#e088b8` | `#7a1f45` | `#b03065` |
| natureza | vert | `#edf8ee` | `#88c090` | `#285c2e` | `#3d8a46` |
| alojamento | doré | `#fdf5e8` | `#c8a870` | `#8d6508` | `#a8780a` |
| descanso | gris | `#f5f5f5` | `#c8c0b8` | `#6a6060` | `#9a9090` |
| technologie et autre | bleu‑gris | `#f0f4f8` | `#a8b8cc` | `#2a3a50` | `#4a6080` |

5. **Statuts**, réservé ou confirmé en vert `#2a7d4f`, à réserver en rouge `#b5322a`, urgent en `#e0a815` (pastille à fond `#e0a815` et texte `#114027`, jamais de texte jaune sur blanc).
6. **Signalements**, erreur avec filet et texte `#b5322a` sur fond `rgba(181,50,42,0.07)`, avertissement avec filet `#e0a815`, texte `#1a1410` et fond `rgba(224,168,21,0.10)`, point d'erreur de la barre des jours `#b5322a`, bouton SOS à fond `#b5322a` et texte `#ffffff`. Le rouge est une couleur fonctionnelle de danger, présente dans tous les voyages quel que soit le drapeau.

### 10.3 Couleurs d'identité (changent selon le voyage, d'après le drapeau du pays)
Ce sont les couleurs d'accent et les fonds foncés, dérivées du drapeau de la destination. Pour chaque nouveau voyage, seules ces valeurs sont redéfinies, dans `Trip.theme`.

1. **Fonds foncés** (en‑tête, tableaux, bandeaux, bloc météo, sections de liste de contrôle), teinte foncée du drapeau. Brésil, vert `#114027` et `#0d3d24`.
2. **Accent vif sur fond foncé**, couleur vive du drapeau. Brésil, jaune `#e0a815`.
3. **Accent lisible sur fond blanc**, version plus foncée de cette couleur vive. Brésil, `#a8780a`.
4. **Couleurs de région** (barre des jours, filet des fiches, tracé de la carte), deux ou trois couleurs tirées du drapeau, distinctes des fonds foncés pour rester visibles sur eux. Brésil, Ceará en jaune (`#e0a815` sur fond foncé, `#a8780a` sur blanc), Amazonie en vert moyen `#2a7d4f`, et bleu `#1e4976` disponible pour une troisième région. Un jour de transition affiche les deux couleurs en diagonale.
5. Appliquer partout. Aucun fond noir ni brun résiduel d'un thème précédent ne doit subsister.

### 10.4 Règle de lisibilité
Une couleur vive (jaune, orange) ne va jamais en texte sur blanc, on réserve pour cela sa version foncée, et la version vive reste pour les fonds foncés. Tout couple texte et fond vise le contraste minimal de 4,5 pour 1 des WCAG 2.1 pour le texte courant, et 3 pour 1 pour le texte de grande taille (au moins 18,66 px en gras). Un test automatisé vérifie ces contrastes pour les jetons de chaque voyage.

### 10.5 Mode sombre
Le mode sombre reprend les fonds foncés d'identité, sans noir. Fond de page `#0d3d24`, cartes `#114027`, bordures `rgba(255,255,255,0.1)`, titres `#ffffff`, texte courant `rgba(205,232,212,0.75)`, accents en `#e0a815`. Les types d'activité utilisent leur couleur de point sur fond `rgba(255,255,255,0.06)`. Le mode suit le réglage du téléphone, avec un interrupteur manuel dans les réglages.

## 11. Ce qui fonctionne déjà dans le prototype (à conserver)

Modèle unique et vues dérivées, jours de la semaine calculés, barre des jours, moteur de règles dont les jours d'opération des vols (qui a détecté deux vols inexistants), verrouillage des réservations confirmées, assistant qui propose sans appliquer avec aperçu des effets, slots dépliables avec sources, historique et migration des données sans perte.

## 12. Ce qui ne fonctionne pas encore (à résoudre)

Stockage limité à Claude et sans synchronisation, aucun mode hors ligne, carte schématique, clé API gérée par Claude, réponses de l'assistant tronquées à 1000 tokens, pas d'annulation, identifiants fragiles, pas de fuseaux horaires, pas de budget, pas de co‑construction, pas d'écran Aujourd'hui.

## 13. Ce qu'il faut éviter

1. Coder des données de voyage en dur dans les composants.
2. Laisser l'IA réécrire le voyage ou écrire directement dans la base.
3. Inventer ou compléter une information factuelle sans source.
4. Dupliquer une information dans plusieurs collections.
5. Utiliser localStorage comme stockage principal.
6. Exposer la clé API dans le frontend.
7. Générer un export KML ou Google My Maps.
8. Envoyer une carte postale ou partager une position sans action explicite de l'utilisateur.
9. Construire un GPS, un moteur de réservation, un réseau social ou une traduction universelle, qui existent déjà ailleurs.
10. Changer le design, la langue ou la stack sans me le demander.
11. Afficher un numéro d'urgence, une adresse d'ambassade ou un conseil de sécurité sans source officielle et date de vérification.
12. Écrire une couleur en dur dans un composant, ou laisser un fond noir ou brun.

## 14. Méthode de travail pour Claude Code

1. Créer un fichier `CLAUDE.md` reprenant les principes de la section 2 et les règles de la section 13, pour qu'ils s'appliquent à chaque session.
2. Travailler dans un dépôt Git, avec un commit par étape cohérente.
3. Écrire les tests avant de considérer une règle comme terminée.
4. Me montrer le résultat à la fin de chaque phase et attendre mon accord avant la suivante.
5. Me guider pas à pas, en langage simple, pour la création des comptes GitHub, Vercel, Supabase et Anthropic, et pour le placement des clés, sans jamais me demander de coller une clé dans le code.
6. Quand je signale une erreur, s'arrêter, relire tout le contexte concerné, puis corriger.

## 15. Ordre de construction et critères de validation

1. **Phase 1**, projet, modèle de données, import du Brésil, onglets Itinéraire (barre des jours, programme, éditeurs) et Pratique (hébergements, transports, réservations, préparer, vérification), moteur de règles et tests. Validation, les deux erreurs et trois avertissements attendus apparaissent, aucune donnée du prototype n'est altérée et toute l'interface est en anglais.
2. **Phase 2**, carte intégrée (section 7.8), heure locale et écart avec la maison (section 7.3), écran Aujourd'hui sans IA.
3. **Phase 3**, PWA hors ligne, Supabase, synchronisation à deux comptes, déploiement Vercel. Validation, en mode avion l'app s'ouvre, affiche tout et accepte des modifications qui se synchronisent au retour du réseau.
4. **Phase 4**, assistant (fonction serveur), boutons rapides, humeur du jour, score de sérénité et optimisation.
5. **Phase 5**, carte postale et Surprise me (avec réserve hors ligne).
6. **Phase 6**, budget vivant et double devise, météo, Préparer enrichi, Sécurité, Urgences et bouton SOS, Traduire. Le bouton SOS et la fiche d'urgence peuvent être avancés en phase 2 s'ils sont simples, car ils doivent exister même si le reste n'est pas terminé.
7. **Phase 7**, co‑construction d'un nouveau voyage à partir d'une phrase, import de confirmations, exports PDF et JSON.

Avant de commencer, pose‑moi les questions dont tu as besoin.
