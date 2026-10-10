# Mise en place, Supabase et Vercel

Ce guide se suit dans l'ordre, une seule fois. Aucune clé n'est à coller dans le code, les deux réglages publics de Supabase se saisissent uniquement dans Vercel. La clé « service_role » ou « secret » de Supabase ne doit jamais être copiée nulle part.

## 1. Supabase (base de données, comptes, fichiers)

1. Ouvrir [supabase.com](https://supabase.com), cliquer sur « Start your project » et se connecter avec le compte GitHub.
2. Créer un projet avec « New project », en le nommant par exemple `travel-guide`, en choisissant une région européenne proche (Francfort ou Zurich si elle est proposée) et en enregistrant le mot de passe de la base dans un gestionnaire de mots de passe, l'application n'en ayant pas besoin.
3. Attendre que le projet soit prêt, puis ouvrir « SQL Editor », créer une requête avec « New query », y coller tout le contenu du fichier `supabase/migrations/0001_sync.sql` du dépôt et cliquer sur « Run ». Recommencer avec `supabase/migrations/0002_storage.sql`. Chaque exécution doit se terminer par « Success ».
4. Dans le menu de gauche, ouvrir « Authentication », puis dans sa colonne la rubrique « Emails » (ou « Email Templates » selon la version), onglet « Templates ». Ouvrir le modèle « Confirm signup », puis dans le champ « Message body » ajouter la ligne `<p>Code de connexion {{ .Token }}</p>` sous le lien existant, sans rien supprimer, et cliquer sur « Save changes ». Faire exactement la même chose dans le modèle « Magic Link ». Le premier e‑mail reçu par une nouvelle adresse peut venir de l'un ou l'autre modèle, d'où la modification des deux. Ce code à six chiffres permet de se connecter depuis l'application installée sur l'iPhone, où le lien s'ouvrirait sinon dans Safari plutôt que dans l'application ([documentation Supabase](https://supabase.com/docs/guides/auth/auth-email-templates)).
5. Ouvrir « Project Settings » puis « API » (ou « API Keys »), et noter l'adresse du projet (« Project URL ») ainsi que la clé publique (« anon » ou « publishable »). Ces deux valeurs sont publiques par conception, l'accès aux données étant protégé par les règles de sécurité créées à l'étape 3.

## 2. Vercel (mise en ligne)

1. Ouvrir [vercel.com](https://vercel.com), choisir « Sign Up », l'offre « Hobby », et se connecter avec GitHub.
2. Cliquer sur « Add New » puis « Project », autoriser Vercel à accéder au dépôt `veronicarato-ctrl/APP` et l'importer.
3. Avant de cliquer sur « Deploy », ouvrir « Environment Variables » et ajouter deux variables, `VITE_SUPABASE_URL` avec l'adresse du projet et `VITE_SUPABASE_ANON_KEY` avec la clé publique notées à l'étape 1.5.
4. Cliquer sur « Deploy ». Vercel publie la branche principale (`main`). Tant que le travail n'y est pas fusionné, chaque envoi sur la branche de travail produit une adresse de prévisualisation, visible dans l'onglet « Deployments ».
5. Copier l'adresse obtenue (par exemple `https://app-xxxx.vercel.app`), revenir dans Supabase, ouvrir « Authentication » puis « URL Configuration », la coller dans « Site URL » et l'ajouter aussi dans « Redirect URLs ».

## 3. Sur les deux téléphones

1. Ouvrir l'adresse Vercel dans Safari (iPhone) ou Chrome (Android), puis choisir « Partager » et « Sur l'écran d'accueil » (iPhone) ou « Installer l'application » (Android).
2. Dans l'application, ouvrir « Practical » puis « Sync and sharing », saisir son adresse e‑mail et taper le code reçu. Le premier compte connecté devient propriétaire du voyage.
3. Toujours dans « Sync and sharing », inviter l'adresse e‑mail de la seconde personne. Celle‑ci installe l'application sur son téléphone, se connecte avec cette adresse et reçoit le voyage.

## 4. Si la synchronisation affiche « Server unreachable »

Un projet Supabase gratuit est mis en pause après une période sans activité, et Supabase prévient par e‑mail environ une semaine avant. Les données du téléphone ne sont pas touchées. Pour relancer le serveur, ouvrir le tableau de bord Supabase, choisir le projet et cliquer sur « Resume project », puis revenir dans l'application et toucher « Sync now » ([documentation Supabase, Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)).
