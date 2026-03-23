# ☁️ mycall — Guide Cloud Functions (Notifications push)

Ce guide explique comment activer les notifications push quand l'app est **fermée** :
appels entrants et messages directs.

---

## Architecture

```
Appelant démarre un appel
        ↓
Firebase Realtime DB écrit dans /calls/{callId}
        ↓
Cloud Function onCallCreated() se déclenche
        ↓
Lit tous les tokens FCM enregistrés
        ↓
Envoie notification push via FCM
        ↓
Android affiche la notification (app fermée = OK)
        ↓
Tap → ouvre mycall → bannière d'appel entrant
```

---

## Prérequis

- Avoir suivi le guide principal (Firebase configuré)
- Node.js 20+ installé localement
- Firebase CLI installé : `npm install -g firebase-tools`

---

## Étape 1 — Passer au plan Blaze (GRATUIT jusqu'aux limites)

Les Cloud Functions nécessitent le plan **Blaze** (pay-as-you-go).

> ⚠️ Aucun frais pour ce projet : les appels FCM sont vers des services Google
> (toujours gratuits), et le plan Spark offre 125 000 invocations/mois gratuites.
> Le plan Blaze ne coûte rien tant que vous restez sous les limites gratuites.

Firebase Console → votre projet → **Upgrade** → Plan Blaze → Ajouter une carte bancaire
(aucun débit automatique sans dépassement des quotas gratuits)

---

## Étape 2 — Créer un compte de service pour GitHub Actions

Firebase Console → **Paramètres du projet** → **Comptes de service**
→ **Générer une nouvelle clé privée** → télécharger le fichier JSON

Dans GitHub → **Settings → Secrets → Actions → New secret** :

| Nom                        | Valeur                                           |
|----------------------------|--------------------------------------------------|
| `FIREBASE_SERVICE_ACCOUNT` | Contenu entier du fichier JSON (copier/coller)   |

---

## Étape 3 — Déploiement local (première fois)

```bash
# Dans le dossier racine du projet
firebase login
firebase use --add    # sélectionner votre projet Firebase

# Installer les dépendances des fonctions
cd functions
npm install
cd ..

# Déployer les fonctions + les règles de sécurité
firebase deploy --only functions,database
```

Résultat attendu :
```
✔ functions[onCallCreated(europe-west1)]: Successful
✔ functions[onMessageSent(europe-west1)]: Successful
✔ functions[cleanupOldCalls(europe-west1)]: Successful
✔ database: Rules updated
```

---

## Étape 4 — Déploiement automatique via GitHub Actions

Après avoir ajouté le secret `FIREBASE_SERVICE_ACCOUNT`, chaque push sur `main`
déploie automatiquement les fonctions via le job `deploy-functions`.

---

## Étape 5 — Tester

1. Ouvrez mycall sur l'appareil A, acceptez les notifications
2. Fermez complètement mycall sur l'appareil B
3. Depuis A, lancez un appel vocal ou vidéo
4. L'appareil B doit recevoir une notification push en moins de 2 secondes

---

## Logs & debugging

```bash
# Voir les logs des fonctions en temps réel
firebase functions:log --follow

# Tester localement avec l'émulateur
firebase emulators:start --only functions,database
```

---

## Quotas gratuits Firebase Functions (plan Blaze)

| Ressource           | Quota gratuit/mois | Usage mycall estimé |
|---------------------|--------------------|---------------------|
| Invocations         | 2 000 000          | ~1000 (usage normal)|
| Temps de calcul     | 400 000 GB-sec     | Négligeable         |
| Appels sortants     | Illimité (Google)  | FCM = gratuit       |

---

## Structure des fichiers

```
mycall/
├── functions/
│   ├── index.js          ← Les 3 Cloud Functions
│   └── package.json
├── firebase.json         ← Config projet Firebase
├── database.rules.json   ← Règles de sécurité DB
└── www/                  ← Application web
```
