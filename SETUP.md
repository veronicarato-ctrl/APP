# Mise en place, Supabase et Vercel

Ce guide se suit dans l'ordre, une seule fois. Aucune clé n'est à coller dans le code, les deux réglages publics de Supabase se saisissent uniquement dans Vercel. La clé « service_role » ou « secret » de Supabase ne doit jamais être copiée nulle part.

## 1. Supabase (base de données, comptes, fichiers)

1. Ouvrir [supabase.com](https://supabase.com), cliquer sur « Start your project » et se connecter avec le compte GitHub.
2. Créer un projet avec « New project », en le nommant par exemple `travel-guide`, en choisissant une région européenne proche (Francfort ou Zurich si elle est proposée) et en enregistrant le mot de passe de la base dans un gestionnaire de mots de passe, l'application n'en ayant pas besoin.
3. Attendre que le projet soit prêt, puis ouvrir « SQL Editor », créer une requête avec « New query », y coller tout le contenu du fichier `supabase/migrations/0001_sync.sql` du dépôt et cliquer sur « Run ». Recommencer avec `supabase/migrations/0002_storage.sql`. Chaque exécution doit se terminer par « Success ».
4. Aucun modèle d'e‑mail n'est à modifier. Depuis le 3 juin 2026, les nouveaux projets gratuits ne peuvent plus changer ces modèles ([journal Supabase](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)), et l'application se connecte donc par adresse e‑mail et mot de passe, ce qui fonctionne aussi dans l'application installée sur iPhone. Le premier compte reçoit un e‑mail de confirmation à ouvrir une seule fois, sur n'importe quel appareil.
5. Ouvrir « Project Settings » puis « API » (ou « API Keys »), et noter l'adresse du projet (« Project URL ») ainsi que la clé publique (« anon » ou « publishable »). Ces deux valeurs sont publiques par conception, l'accès aux données étant protégé par les règles de sécurité créées à l'étape 3.

## 2. Vercel (mise en ligne)

1. Ouvrir [vercel.com](https://vercel.com), choisir « Sign Up », l'offre « Hobby », et se connecter avec GitHub.
2. Cliquer sur « Add New » puis « Project », autoriser Vercel à accéder au dépôt `veronicarato-ctrl/APP` et l'importer.
3. Avant de cliquer sur « Deploy », ouvrir « Environment Variables » et ajouter deux variables, `VITE_SUPABASE_URL` avec l'adresse du projet et `VITE_SUPABASE_ANON_KEY` avec la clé publique notées à l'étape 1.5.
4. Cliquer sur « Deploy ». Vercel publie la branche principale (`main`). Tant que le travail n'y est pas fusionné, chaque envoi sur la branche de travail produit une adresse de prévisualisation, visible dans l'onglet « Deployments ».
5. Copier l'adresse obtenue (par exemple `https://app-xxxx.vercel.app`), revenir dans Supabase, ouvrir « Authentication » puis « URL Configuration », la coller dans « Site URL » et l'ajouter aussi dans « Redirect URLs ».

## 3. Sur les deux téléphones

1. Ouvrir l'adresse Vercel dans Safari (iPhone) ou Chrome (Android), puis choisir « Partager » et « Sur l'écran d'accueil » (iPhone) ou « Installer l'application » (Android).
2. Au premier lancement, l'application propose « Create a trip » ou « Add the Brazil 2026 example trip ». Pour le voyage de décembre, la première personne choisit l'exemple Brésil. La seconde personne ne charge rien, elle reçoit le voyage par invitation. Ensuite, dans l'application, ouvrir « Practical » puis « Sync and sharing », saisir son adresse e‑mail et un mot de passe d'au moins huit caractères, puis toucher « Create account ». Ouvrir l'e‑mail de confirmation reçu, cliquer sur le lien, revenir dans l'application et toucher « Sign in ». Le premier compte connecté devient propriétaire du voyage.
3. Toujours dans « Sync and sharing », inviter l'adresse e‑mail de la seconde personne. Celle‑ci installe l'application sur son téléphone, crée son compte avec cette même adresse de la même manière, se connecte et reçoit le voyage.

## 4. Si la synchronisation affiche « Server unreachable »

Un projet Supabase gratuit est mis en pause après une période sans activité, et Supabase prévient par e‑mail environ une semaine avant. Les données du téléphone ne sont pas touchées. Pour relancer le serveur, ouvrir le tableau de bord Supabase, choisir le projet et cliquer sur « Resume project », puis revenir dans l'application et toucher « Sync now » ([documentation Supabase, Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)).

## 5. Assistant (IA), essai à l'aveugle et vérification des lieux

L'assistant fonctionne dans une fonction serveur Vercel (`/api/assistant`). Les clés d'IA se saisissent uniquement dans Vercel, sans le préfixe `VITE_`, ce qui les garde sur le serveur et hors de l'application installée sur les téléphones. Seules les personnes connectées à leur compte de l'application peuvent utiliser l'assistant, si bien que personne d'autre ne peut consommer vos crédits.

1. **Claude (Anthropic).** Ouvrir [platform.claude.com](https://platform.claude.com), créer un compte ou se connecter, puis aller dans « Settings » et « API keys » et cliquer sur « Create key » ([documentation Anthropic, Get an API key](https://platform.claude.com/docs/en/get-api-key)). La clé commence par `sk-ant-` et ne s'affiche qu'une fois, il faut donc la copier aussitôt. Ajouter des crédits dans la facturation de la console.
2. **Saisie dans Vercel.** Dans le projet Vercel, ouvrir « Settings » puis « Environment Variables » et ajouter `ANTHROPIC_API_KEY` avec la clé. Ne jamais la coller ailleurs, ni dans le code, ni dans un message.
3. **Autres IA pour l'essai à l'aveugle, facultatif.** Pour comparer, ajouter de la même façon `OPENAI_API_KEY` et `OPENAI_MODEL` (ChatGPT), ou `MISTRAL_API_KEY` et `MISTRAL_MODEL` (Mistral). Le nom exact du modèle se recopie depuis la documentation du fournisseur au moment de l'essai, l'application n'en invente aucun. `AI_PROVIDER` (valeur `anthropic`, `openai` ou `mistral`) choisit l'IA utilisée par défaut une fois l'essai tranché.
4. **Vérification des lieux, facultatif.** Pour que chaque hôtel, restaurant ou musée proposé soit vérifié avant d'être affiché, créer dans Google Cloud une clé pour « Places API (New) » et l'ajouter sous `GOOGLE_PLACES_API_KEY`. Ce service est facturé à l'usage, ses tarifs se lisent sur la page de facturation de Google Maps Platform avant activation. Sans cette clé, les lieux proposés s'affichent comme « non vérifiés » avec un lien de recherche.
5. **Redéployer.** Les variables ne s'appliquent qu'aux nouveaux déploiements, il faut donc ouvrir « Deployments », choisir le dernier, puis « Redeploy ».
6. **Essai.** Dans l'application, se connecter (« Practical » puis « Sync and sharing »), ouvrir l'onglet « Assistant », puis « AI blind test » pour comparer les IA configurées, ou « Propose a complete trip » pour un premier voyage.
