# Carnet de préparation — Retour au handball

Application web personnelle de préparation physique sur 16 semaines : séances guidées, suivi des blessures et de la récupération, autorégulation des charges, statistiques.

- **Fonctionne partout** : ordinateur et téléphone, installable sur l'écran d'accueil, utilisable hors ligne.
- **Données synchronisées** entre appareils via un dépôt GitHub **privé**, séparé du code.
- **Mises à jour sans risque** : le code (ce dépôt) et les données (dépôt privé) sont séparés.

> Outil de suivi et d'autorégulation. Il ne pose aucun diagnostic et ne remplace pas l'avis d'un kiné ou d'un médecin.

---

## 1. Utiliser l'application

Adresse : `https://yoannfavreau.github.io/Balonmano/`

**Installer sur le téléphone**
- iPhone (Safari) : bouton Partager → « Sur l'écran d'accueil ».
- Android (Chrome) : menu ⋮ → « Installer l'application ».

**Les 3 écrans principaux**
1. **Aujourd'hui** : la séance du jour → *Commencer*, *Déjà faite* ou *Déplacer*.
2. **Questions** : suivi du matin, bilans de séance, propositions de charge (une question par écran).
3. **Mes données** : chiffres clés et graphiques. L'analyse complète est dans « Plus ».

## 2. Activer la synchronisation (une seule fois)

1. Sur GitHub : **New repository** → nom `carnet-handball-data` → **Private** → cocher « Add a README » → *Create*.
2. **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
   - Repository access : *Only select repositories* → `carnet-handball-data`
   - Permissions → Repository permissions → **Contents : Read and write** (rien d'autre)
   - Expiration : 1 an (à renouveler)
3. Dans l'app : **Paramètres → Données & synchro** → pseudo GitHub + jeton → *Activer*.
4. Refaire l'étape 3 sur chaque appareil (même jeton).

Le jeton reste sur l'appareil ; il n'est jamais écrit dans les données synchronisées.

## 3. Comment les données sont protégées

| Où | Quoi | Rôle |
|---|---|---|
| Navigateur de chaque appareil (localStorage) | Copie complète | Fonctionne hors ligne, enregistrement immédiat |
| Dépôt privé `carnet-handball-data` → `carnet.json` | Copie de référence | Synchronisation entre appareils |
| Historique Git du dépôt de données | Une version par sauvegarde | Retour possible à n'importe quelle date |

- **Fusion sans perte** : à chaque synchronisation, les séances, suivis et événements des deux appareils sont **réunis** (jamais écrasés). Pour les réglages, la modification la plus récente l'emporte. Les suppressions sont propagées.
- **Un nouvel appareil** adopte les réglages du dépôt et y ajoute ses éventuelles données locales.
- **Export manuel** à tout moment : Paramètres → Données → JSON ou CSV.
- **Mode démo** : données fictives en mémoire uniquement, jamais enregistrées ni synchronisées.

## 4. Mettre à jour l'application

```bash
# modifier les sources dans src/, puis :
bash build/build.sh      # régénère docs/ (site) et dist/index.html (fichier unique)
git add -A && git commit -m "…" && git push
```

GitHub Pages publie `docs/` en une minute. Les appareils affichent « Nouvelle version disponible → Mettre à jour ».

**Règles pour ne jamais perdre de données lors d'une mise à jour**
- Ne jamais renommer ni supprimer un champ des données sans l'ajouter à `migrate()` (`src/logic.js`) : cette fonction complète les anciennes données avec les nouveaux champs et conserve tout le reste.
- Le format des données est versionné (`v: 2`). En cas de changement incompatible : incrémenter `v` et écrire la conversion dans `migrate()`.
- Le service worker (`src/sw.js`) ne met en cache que le code ; il ne touche jamais aux données.

## 5. Structure

```
src/            sources
  index.html      squelette + styles
  data.js         programme, exercices, phases, critères, tests, seuils
  logic.js        stockage local, calendrier, vigilance, autorégulation, statistiques, migrate()
  gh.js           synchronisation GitHub et fusion sans perte
  ui.js           composants et graphiques
  views1-5.js     écrans
  main.js         actions, démarrage
  sw.js           mode hors ligne
  manifest.webmanifest, icons/   installation sur l'écran d'accueil
build/          build.sh + configuration Tailwind
docs/           site publié par GitHub Pages (généré)
dist/           version fichier unique (généré)
```

Activer GitHub Pages : **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/docs`**.
