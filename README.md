# HeraliZ Launcher

Launcher de survie Minecraft DayZ pour **Minecraft 1.20.1 / Forge / Java 17**.

Interface française, logos HeraliZ, profil local par pseudo, règlement, réglages de mémoire et vérification des fichiers. Aucune connexion Microsoft dans l’application.

## Démarrer

Avec Node.js 24 et npm :

```sh
npm ci
npm start
```

Le launcher s’ouvre même sans serveur configuré. Il affiche alors « Serveur en préparation » et refuse le lancement, sans télécharger la distribution de démonstration de Helios.

## Configurer le serveur avant diffusion

Renseigner `app/heraliz.json` :

- `serverAddress` : domaine ou IPv4, avec le port si nécessaire.
- `distributionUrl` : URL HTTPS du manifeste Helios/Nebula complet.
- `discordUrl` : invitation HTTPS Discord, ou `null`.
- `serverId` : `heraliz-1.20.1`, identique à celui du manifeste.

L’adresse et le pack ne sont pas encore fournis. La version exacte de Forge doit correspondre au serveur. Ne pas diffuser cette version comme un accès opérationnel avant configuration et test de la connexion réelle.

Voir [la configuration du pack](docs/HERALIZ-DEPLOIEMENT.md) et [les protections et limites de sécurité](docs/HERALIZ-SECURITE.md).

## Vérifier et construire

```sh
npm test
npm run lint
npm run dist:win
```

L’installeur Windows est créé dans `dist/`. Les builds ne publient aucune release automatiquement. GitHub Actions teste et construit les trois plateformes, puis conserve les installeurs comme artefacts à examiner. Les mises à jour du launcher passent par le lien GitHub dans les paramètres ; le pack est actualisé au lancement du jeu.

Le profil et le jeu sont enregistrés dans le dossier de données de l’application HeraliZ. L’ancien dossier Helios et `.minecraft` ne sont pas réutilisés automatiquement.

## Architecture

- `index.js` : fenêtre Electron isolée, permissions et commandes IPC limitées.
- `app/preload.js` : API étroite exposée à l’interface.
- `app/index.html`, `app/assets/css/heraliz.css`, `app/assets/js/renderer.js` : interface locale, sans contenu web distant.
- `launcher-service.js` : profil, état serveur, Java, téléchargements et cycle de vie de Minecraft.
- `processbuilder.js` : arguments Minecraft/Forge, conservés depuis Helios et adaptés aux profils locaux.

Les anciens templates EJS et scripts Helios restent comme référence dans les sources. Ils ne sont ni chargés ni inclus dans l’application construite. Le manifeste de construction énumère les fichiers actifs.

## Identité et doubles comptes

Un seul profil est mémorisé. Les pseudos acceptent 3 à 16 caractères ASCII (lettres, chiffres, `_`). L’UUID correspond au calcul Minecraft hors ligne et respecte la casse.

**Un pseudo seul n’est pas une preuve d’identité.** Le message de bannissement exprime le règlement ; le launcher ne détecte pas et ne bannit pas automatiquement les doubles comptes. L’authentification, les permissions et les sanctions doivent être appliquées côté serveur. Ne jamais accorder des droits administrateur sur la seule base d’un pseudo libre.

## Crédits

Basé sur [Helios Launcher](https://github.com/dscalzi/HeliosLauncher) de Daniel Scalzi, avec `helios-core`. La licence originale est conservée dans `LICENSE.txt`. Les logos ont été fournis par le propriétaire du projet.
