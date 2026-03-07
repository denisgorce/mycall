# NEXUS — Guide de déploiement

## Architecture

```
smartphones / PC
      │
      │  WebRTC (audio/vidéo direct, P2P chiffré)
      │
      └──── WebSocket ────► server.js  (signaling)
                            hébergé sur Render.com (gratuit)
```

Le **server.js** sert uniquement à mettre les participants en contact.
Une fois connectés, l'audio et la vidéo passent **directement** entre les appareils.

---

## Étape 1 — Déployer le serveur de signaling (5 minutes, gratuit)

### 1.1 Créer un repo GitHub

1. Allez sur github.com → **New repository**
2. Nom : `nexus-signaling` (public ou privé, peu importe)
3. Ajoutez les deux fichiers dans ce repo :
   - `server.js`
   - `package.json`

### 1.2 Déployer sur Render.com

1. Créez un compte gratuit sur **render.com**
2. Tableau de bord → **New +** → **Web Service**
3. Connectez votre repo GitHub `nexus-signaling`
4. Paramètres :
   - **Name** : `nexus-signal` (ou ce que vous voulez)
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `node server.js`
   - **Plan** : Free
5. Cliquez **Create Web Service**
6. Attendez ~2 minutes → vous obtenez une URL :
   ```
   https://nexus-signal.onrender.com
   ```

> ⚠️ Sur le plan gratuit Render, le serveur "dort" après 15 min d'inactivité.
> La première connexion peut prendre 30–60 secondes si le serveur est endormi.
> Pour éviter ça : passez en plan Starter ($7/mois) ou ajoutez un ping toutes les 10 min
> via UptimeRobot (gratuit).

---

## Étape 2 — Configurer le client (index.html)

Ouvrez `index.html` et remplacez à la ligne indiquée :

```javascript
// AVANT
const SIGNAL_SERVER = 'wss://VOTRE-APP.onrender.com';

// APRÈS (adaptez avec votre URL Render)
const SIGNAL_SERVER = 'wss://nexus-signal.onrender.com';
```

> Note : HTTPS → `wss://`  (WebSocket sécurisé, obligatoire depuis GitHub Pages)

---

## Étape 3 — Héberger le client sur GitHub Pages

1. Créez un deuxième repo GitHub : `nexus-conf` (ou un seul repo avec tout)
2. Uploadez `index.html` à la racine
3. **Settings → Pages → Source : Deploy from branch → main / root**
4. Votre URL client : `https://votre-username.github.io/nexus-conf/`

---

## Résumé des URLs

| Composant | URL |
|-----------|-----|
| Serveur signaling | `wss://nexus-signal.onrender.com` |
| Application client | `https://votre-username.github.io/nexus-conf/` |
| Lien de salle | `https://...github.io/nexus-conf/?room=nexus-abc12` |

---

## Fonctionnement technique

1. Les deux participants ouvrent le même lien (`?room=xxx`)
2. Chacun se connecte au serveur WebSocket
3. Le serveur leur indique mutuellement leur existence
4. Ils échangent une **offre SDP** et une **réponse SDP** via le serveur
5. Ils échangent des **candidats ICE** (adresses réseau) via le serveur
6. Une fois la route trouvée (via STUN/TURN si nécessaire), la connexion est **directe**
7. Le serveur n'intervient plus — audio et vidéo transitent P2P

## Compatibilité

| Navigateur | Support |
|------------|---------|
| Chrome (Android/desktop) | ✅ Complet |
| Safari (iOS 15+) | ✅ Fonctionne |
| Firefox (desktop) | ✅ Fonctionne |
| Edge (desktop) | ✅ Complet |
| Samsung Internet | ✅ Fonctionne |
| Chrome iOS | ✅ Fonctionne |
