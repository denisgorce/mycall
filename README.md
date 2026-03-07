# NEXUS — Guide de déploiement

## Ce que fait l'application

- **Messagerie** : chat de groupe en temps réel
- **Appels vidéo** : appel entre membres avec sonnerie
- **PWA** : s'installe sur l'écran d'accueil comme une vraie app
- **Notifications push** : recevoir un appel même navigateur en arrière-plan
- **4 membres fixes** : Denis, Eugenia, Maryse, André

Au lancement, on choisit son prénom parmi les 4 boutons. La liste de contacts affiche les membres en ligne (🟢) et hors ligne (⚫) en temps réel.

---

## Architecture

```
smartphones / PC
      │
      │  WebRTC (audio/vidéo direct, P2P chiffré)
      │  WebSocket (signaling + chat + notifications)
      │
      └──────────────► server.js  (Render.com)
```

---

## Fichiers à déployer

| Fichier | Où | Rôle |
|---|---|---|
| `server.js` | Render.com | Signaling + push notifications |
| `package.json` | Render.com | Dépendances Node.js |
| `index.html` | GitHub Pages | Application cliente |
| `sw.js` | GitHub Pages | Service Worker (PWA + push) |
| `manifest.json` | GitHub Pages | Config PWA (icône, nom…) |
| `icon-192.png` | GitHub Pages | Icône app 192×192 |
| `icon-512.png` | GitHub Pages | Icône app 512×512 |

---

## Étape 1 — Déployer le serveur sur Render.com

### 1.1 Créer un repo GitHub pour le serveur

Créez un repo (ex: `nexus-server`) contenant uniquement :
- `server.js`
- `package.json`

### 1.2 Déployer sur Render.com

1. [render.com](https://render.com) → **New + → Web Service**
2. Connectez le repo `nexus-server`
3. Paramètres :
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `node server.js`
   - **Plan** : Free
4. Dans **Environment → Add Environment Variable** :
   - `VAPID_PRIVATE_KEY` → `pv1sorrQvGasxr3gHs7ORmdFKMzpyM62NGEby28eVhA`
   - `VAPID_EMAIL` → `mailto:votre@email.com`
5. **Create Web Service** → attendez ~2 min
6. Vous obtenez : `https://mycall-utj5.onrender.com`

> ⚠️ **Plan gratuit Render** : le serveur dort après 15 min d'inactivité.
> Configurez [UptimeRobot](https://uptimerobot.com) (gratuit) pour pinger
> `https://mycall-utj5.onrender.com` toutes les 5 minutes.

---

## Étape 2 — Déployer le client sur GitHub Pages

1. Créez un repo GitHub (ex: `nexus-app`)
2. Uploadez tous les fichiers client à la racine :
   `index.html`, `sw.js`, `manifest.json`, `icon-192.png`, `icon-512.png`
3. **Settings → Pages → Source : Deploy from branch → main / root**
4. URL : `https://votre-username.github.io/nexus-app/`

---

## Étape 3 — Installation sur smartphone

### Android (Chrome)
Un bouton **"⬇ Installer l'application"** apparaît automatiquement dans le lobby.
Appuyez dessus → confirmez → l'app s'ajoute à l'écran d'accueil.

### iPhone/iPad (Safari)
Le lobby affiche les instructions :
**Safari → icône Partager → "Sur l'écran d'accueil"**

> ⚠️ Sur iOS, ouvrir le lien dans **Safari** (pas Chrome ni Firefox).
> Les notifications push et l'installation PWA ne fonctionnent que dans Safari sur iOS.

---

## Étape 4 — Activer les notifications push

Une fois l'app ouverte et le prénom choisi, une bannière propose d'activer les notifications.
→ Appuyez sur la bannière → Autoriser

Cela permet de recevoir une sonnerie même quand l'app est en arrière-plan.

> **Limite iOS** : Apple suspend les onglets après quelques minutes en arrière-plan.
> Pour les appels entrants fiables, laisser l'app ouverte est recommandé.

---

## Modifier les membres

Pour changer les prénoms, modifiez ces deux lignes dans `index.html` :

```javascript
// Ligne ~260 : liste pour la logique online/offline
const CONTACTS = ['Denis', 'Eugenia', 'Maryse', 'André'];
```

```html
<!-- Vers la ligne ~180 : boutons du lobby -->
<button class="nbtn" onclick="enterAs('Denis')">Denis</button>
<button class="nbtn" onclick="enterAs('Eugenia')">Eugenia</button>
<button class="nbtn" onclick="enterAs('Maryse')">Maryse</button>
<button class="nbtn" onclick="enterAs('André')">André</button>
```

---

## Clés VAPID (notifications push)

Les clés sont déjà générées et intégrées. Ne les changez pas sauf si vous redeployez
sur un nouveau domaine — dans ce cas régénérez avec `npx web-push generate-vapid-keys`.

| Clé | Valeur |
|---|---|
| Publique | `BPD4U8JbtKKc0DPpz8zj4y2I-pf6DMNt8wZ1gjRsAJwGeRSFGMMDH7ynZkmaz7aBvZ7utdtWDnhKhj0T6KvKKGU` |
| Privée | Dans les variables d'env Render (ne pas exposer) |

---

## Compatibilité

| Navigateur | Appels | Chat | PWA | Push |
|---|---|---|---|---|
| Chrome Android | ✅ | ✅ | ✅ | ✅ |
| Safari iOS 16.4+ | ✅ | ✅ | ✅ | ✅ |
| Chrome desktop | ✅ | ✅ | ✅ | ✅ |
| Firefox desktop | ✅ | ✅ | ❌ | ❌ |
| Samsung Internet | ✅ | ✅ | ✅ | ✅ |
