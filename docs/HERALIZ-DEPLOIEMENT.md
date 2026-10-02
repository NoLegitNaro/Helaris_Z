# Préparer HeraliZ et ses futurs mods

L’adresse du serveur, la version exacte de Forge 47.x, l’invitation Discord et l’hébergement HTTPS du pack restent à renseigner. Le launcher ne les remplace pas par des valeurs fictives.

## Générer le pack

Le moteur attend une distribution Helios complète. Pour Forge 1.20.1, un lien vers le JAR de l’installeur ne suffit pas : bibliothèques, manifeste de version et fichiers générés par Forge sont nécessaires. Utiliser [Nebula, le générateur officiel](https://github.com/dscalzi/Nebula), avec Java 17 et la version exacte du serveur.

Dans un projet Nebula séparé, configurer `ROOT`, `BASE_URL` (HTTPS) et `JAVA_EXECUTABLE`, puis suivre son README. Exemple, en remplaçant `47.x.y` :

```sh
npm run start -- init root
npm run start -- generate server heraliz 1.20.1 --forge 47.x.y
npm run start -- generate distro
```

Vérifier l’identifiant généré : `heraliz-1.20.1`. Ajuster `app/heraliz.json` et le manifeste ensemble si un autre identifiant est employé. La distribution doit contenir un seul serveur avec l’adresse exacte de `serverAddress`, `minecraftVersion: "1.20.1"`, `autoconnect: true` et un module `ForgeHosted` `net.minecraftforge:forge:1.20.1-47.…`.

Héberger le manifeste et ses fichiers en HTTPS. Chaque module doit fournir son empreinte MD5 de compatibilité Helios, sa taille et son URL HTTPS. Chemins absolus et traversées `..` sont refusés. Java est fixé à 17. Les empreintes assurent la cohérence avec le manifeste ; elles ne remplacent pas une signature du manifeste.

Renseigner `distributionUrl`, `serverAddress` et éventuellement `discordUrl` dans `app/heraliz.json`, puis reconstruire le launcher.

## Ajouter les mods plus tard

Le pack peut initialement contenir Forge seul. Ajouter ensuite les mods clients dans les emplacements `forgemods` de Nebula, les configurations dans ses dossiers `files`, régénérer et téléverser la distribution. Ne pas modifier les JAR après génération de leurs empreintes.

Les mods obligatoires restent obligatoires. Les mods optionnels suivent les valeurs par défaut du manifeste ; cette refonte n’inclut pas de sélecteur de mods optionnels. Les fichiers sont vérifiés à chaque lancement. Tout téléchargement est contrôlé avant traitement et lancement.

Les modules strictement serveur ne doivent jamais apparaître dans la distribution client. Ne pas publier les sources et JAR serveur privés dans ce dépôt GitHub public.

## Authentification

Une session par pseudo ne peut pas rejoindre un serveur exigeant une session Microsoft authentifiée. Un serveur acceptant des profils hors ligne doit disposer de sa propre authentification. Changer seulement `online-mode` ne protège ni les identités ni les doubles comptes. Vérifier également le chat signé avec la configuration Forge retenue.

Prévoir une inscription ou connexion côté serveur, des limites d’essais, des réservations de pseudos et une protection des comptes staff. Aucun identifiant fourni par le client n’est une preuve de confiance.

## Vérification avant publication

1. Tester avec un profil Windows vierge : pseudo, Java 17, installation Forge et connexion au bon serveur.
2. Corrompre un fichier du pack : le launcher doit réparer ou arrêter le lancement.
3. Tester une panne réseau, le redémarrage, la RAM, le plein écran et la fermeture du jeu.
4. Vérifier côté serveur l’usurpation de pseudo, les droits staff et les sanctions.
5. Signer l’installeur avec le certificat de l’éditeur avant diffusion publique. Aucun certificat n’est intégré au dépôt.

Les tests automatisés couvrent les profils, arguments Minecraft, erreurs, chemins, protections IPC et contrôles d’intégrité. Ils ne remplacent pas un essai sur le vrai serveur, impossible tant que ses paramètres sont absents.
