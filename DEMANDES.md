# Demandes de changements en attente

Ce fichier garde les demandes de Vicky à appliquer plus tard, lorsqu'elle demandera de les ressortir. Rien n'est encore modifié dans l'application. Chaque demande garde la formulation d'origine, suivie de ce qu'elle implique dans le code et des points à trancher au moment de la réaliser.

## Demande du 10 octobre 2026, formulaire de création d'un voyage

### 1. Retirer le fuseau principal de la destination
« Main time zone and destination. Je vois pas la raison de mettre ça. »
Le champ disparaît du formulaire. Les fuseaux restent portés par chaque lieu (`Place.tz`), qui suffisent au calcul des heures, et `Trip.destTz` devient inutile à la saisie.

### 2. Déduire le fuseau de la maison de la ville de départ
« Home time zone. Elle doit être déduite en fonction de la ville de départ. »
Le formulaire demande la ville de départ (`Trip.origin`, déjà prévu par la SPEC section 4) et en déduit `homeTz`. Point à trancher, la source de cette déduction, qui doit être une base de villes et de fuseaux reconnue et non une liste inventée, ou le fuseau du téléphone proposé par défaut et confirmé par la ville.

### 3. Retirer le choix des couleurs
« Et couleur. Pas de raison de mettre ça. »
Le sélecteur de thème disparaît du formulaire. Les couleurs d'identité restent calculées pour chaque voyage (SPEC section 10.3) sans que l'utilisateur ait à les choisir.

### 4. Zone libre pour dicter ses envies
« Le client qui utilise cette application doit avoir une zone où il doit dicter ses envies, sa destination, ce qu'il aimerait faire, son feeling. »
Grand champ de texte libre au début de la création, avec la dictée vocale du clavier du téléphone, conforme à la SPEC section 6.1 (départ par une phrase). Le texte est gardé tel quel dans le voyage. L'extraction automatique de la destination, des dates et des envies par l'assistant dépend de la phase 4, l'IA proposant et l'utilisateur validant chaque élément.

### 5. Garder le nom du voyage
« Tu peux garder le trip name. »

### 6. Ajouter le budget
« Il n'y a pas le budget. On va rajouter le budget. »
Champ montant et devise dans le formulaire (`Trip.budget`, prévu par la SPEC section 4). Point à trancher, la devise par défaut pour des voyageurs résidant en France, euro ou franc suisse.

### 7. Thèmes du voyage avec jauges
« Il faudra rajouter le thème du voyage. On avait dit soit gastronome, soit farniente, sportif, culturel, découverte, hôtel 5 étoiles, luxe. Il faut créer des catégories dans ce genre-là. 7 devraient suffire. Le client doit être capable de mettre une jauge 10 % de luxe, 20 % de gastronomie, 50 % de traditionnel. »
Sept catégories avec une jauge en pourcentage chacune, enregistrées dans `Trip.modes`. Points à trancher, la liste définitive des sept catégories (les mots cités sont gastronomie, farniente, sportif, culturel, découverte, hôtel cinq étoiles ou luxe, traditionnel, ce qui fait sept si hôtel cinq étoiles et luxe ne forment qu'une catégorie), si le total des jauges doit faire 100 %, et le remplacement de l'échelle de 1 à 5 et des douze modes de la SPEC section 6.2, qu'il faudra mettre à jour en conséquence.

### 8. Couleurs et photos pour donner envie
« Le mieux c'est de mettre des couleurs, des photos. Au début, tu ne pourras pas mettre des photos en fonction du pays ou du voyage choisi, mais on peut mettre des photos de paysages connus pour donner envie. Après, quand le voyage est configuré, paramétré, on pourra allier des photos au voyage demandé. »
Écran d'accueil et formulaire illustrés de photos de paysages célèbres, puis, une fois le voyage paramétré, des photos liées à sa destination. Points à trancher, la provenance des photos, qui doivent avoir une licence permettant l'usage commercial prévu en phase 8 avec le crédit de l'auteur, et leur poids, l'application devant rester rapide et utilisable hors ligne.
