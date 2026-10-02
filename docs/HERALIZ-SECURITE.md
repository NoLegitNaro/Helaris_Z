# Sécurité : protections et limites

## Empêcher la récupération des mods

On ne peut pas garantir la confidentialité d’un mod exécuté sur le PC du joueur. Il faut fournir le code à sa JVM ; il peut récupérer le JAR ou le code en mémoire. Dossier caché, archive chiffrée avec clé dans le launcher ou suppression après lancement ne résolvent pas ce problème.

La protection utile consiste à séparer les composants :

- Garder côté serveur les règles de loot, l’économie, les validations de combat, données sensibles et permissions lorsque la conception le permet.
- Envoyer au client seulement ce qui est nécessaire au rendu, aux interfaces et au protocole.
- Conserver sources et modules serveur dans des dépôts privés. Ce dépôt est public.
- L’obfuscation augmente le coût de lecture sans empêcher la copie ; vérifier sa compatibilité avec Forge et les mixins.
- Des liens temporaires ou téléchargements autorisés limitent la distribution initiale, pas la redistribution par un joueur autorisé.

La séparation dépend de chaque mod : des blocs ou objets supplémentaires requièrent souvent une partie cliente. Référence : [client et serveur dans Forge](https://docs.minecraftforge.net/en/1.20.x/concepts/sides/).

## Pseudos et doubles comptes

Le launcher mémorise un profil, valide le pseudo, calcule l’UUID hors ligne Minecraft et demande l’acceptation du règlement. Le bannissement immédiat affiché est une règle, pas une détection automatique.

Le joueur peut modifier ses fichiers ou utiliser un autre launcher. L’UUID est calculable et ne prouve pas l’identité ; la casse du pseudo le modifie. Le serveur doit réserver les identités et traiter leurs variantes de manière cohérente.

La détection et les sanctions nécessitent des contrôles serveur. Une IP ou empreinte matérielle seule peut confondre des personnes ou être contournée ; aucune collecte de ce type n’a été ajoutée. Les comptes staff nécessitent une authentification fiable.

## Protections ajoutées

- Sandbox, isolation de contexte et Node.js désactivé dans l’interface.
- Passerelle IPC limitée, vérification de la fenêtre et de sa frame principale.
- Refus de la navigation, nouvelles fenêtres, webviews et permissions web.
- Politique CSP locale stricte et aucune injection de contenu distant.
- Liens externes HTTPS choisis dans une liste limitée ; aucune commande système libre exposée.
- Validation principale des pseudos et réglages, profil unique et verrou de lancement.
- Suppression des anciens credentials Microsoft/Mojang s’ils figurent dans la configuration chargée.
- Distribution liée à HeraliZ ; refus des chemins dangereux, types inconnus, HTTP et empreintes absentes.
- Contrôle de chaque téléchargement, même de taille correcte, avant traitement. Java est vérifié avant extraction.
- Mise à jour d’Electron et des dépendances ; compilation sans publication automatique.

Référence : [recommandations de sécurité Electron](https://www.electronjs.org/docs/latest/tutorial/security).

## Limites restantes

Cette refonte n’ajoute pas d’authentification serveur, d’anti-triche, de bannissement automatique, de certificat Windows ni de signature cryptographique du manifeste. HTTPS et les empreintes n’empêchent pas un hébergeur compromis de publier ensemble un manifeste et des fichiers malveillants.

Les mises à jour du launcher sont manuelles via les releases HeraliZ ; le pack est actualisé au lancement. Avant diffusion, tester le serveur réel, signer l’installeur et protéger les comptes pouvant modifier le pack et les releases.
