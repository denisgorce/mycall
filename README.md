# ⚡ mycall

Application de messagerie instantanée avec appels vocaux/vidéo Jitsi Meet.  
L'APK est **compilé automatiquement via GitHub Actions** à chaque push.

---

## 🚀 Démarrage rapide via GitHub

### 1. Fork / Clone ce dépôt

```bash
git clone https://github.com/VOTRE_PSEUDO/mycall.git
cd mycall
```

---

### 2. Configurer Firebase

1. Allez sur https://console.firebase.google.com/
2. Créez un projet (ex : `mycall-app`)
3. **Authentication** → Activer `Email / Mot de passe`
4. **Realtime Database** → Créer → Région `europe-west1` (Frankfurt)
5. Appliquez ces **règles de sécurité** :

```json
{
  "rules": {
    "rooms":     { ".read": "auth != null", ".write": "auth != null" },
    "messages":  { "$r": { ".read": "auth != null", ".write": "auth != null" } },
    "presence":  { ".read": "auth != null", "$uid": { ".write": "auth.uid == $uid" } },
    "typing":    { "$r": { ".read": "auth != null", "$uid": { ".write": "auth.uid == $uid" } } },
    "users":     { ".read": "auth != null", "$uid": { ".write": "auth.uid == $uid" } },
    "calls":     { ".read": "auth != null", ".write": "auth != null" },
    "fcmTokens": { ".read": false, "$uid": { ".write": "auth.uid == $uid" } },
    "reads":     { "$r": { ".read": "auth != null", "$uid": { ".write": "auth.uid == $uid" } } },
    "userDMs":   { "$uid": { ".read": "auth.uid == $uid", ".write": "auth != null" } }
  }
}
```

6. **Paramètres du projet** → **Vos applications** → ➕ Web → Récupérez votre config.

---

### 3. Ajouter les secrets GitHub

Dans votre dépôt : **Settings → Secrets and variables → Actions → New repository secret**

| Nom du secret                  | Valeur (depuis Firebase)                                | Obligatoire |
|--------------------------------|---------------------------------------------------------|-------------|
| `FIREBASE_API_KEY`             | `AIzaSy...`                                             | ✅ |
| `FIREBASE_AUTH_DOMAIN`         | `mycall-app.firebaseapp.com`                       | ✅ |
| `FIREBASE_DATABASE_URL`        | `https://mycall-app-default-rtdb.europe-west1...`  | ✅ |
| `FIREBASE_PROJECT_ID`          | `mycall-app`                                       | ✅ |
| `FIREBASE_MESSAGING_SENDER_ID` | `123456789012`                                          | ✅ |
| `FIREBASE_APP_ID`              | `1:123:web:abc...`                                      | ✅ |
| `FIREBASE_VAPID_KEY`           | Clé publique Web Push (voir ci-dessous)                 | ⚡ Notifications |

**Obtenir la VAPID key :**  
Firebase Console → Paramètres du projet → Cloud Messaging → Certificats Web push → **Générer une paire de clés** → copier la clé publique.

---

### 4. Activer GitHub Pages (version web)

**Settings → Pages → Source → GitHub Actions**  
L'app sera sur `https://VOTRE_PSEUDO.github.io/mycall/`

---

### 5. Pousser le code → APK compilé automatiquement

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

→ Onglet **Actions** → `Build & Release APK` → téléchargez l'APK dans **Artifacts**.

---

### 6. Créer une Release avec l'APK en pièce jointe

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub crée une **Release** avec l'APK téléchargeable directement.

---

## 📁 Structure

```
mycall/
├── .github/workflows/build.yml   ← CI/CD automatique
├── www/index.html                ← Application complète
├── capacitor.config.json
├── package.json
└── README.md
```

---

## ✅ Fonctionnalités

- 💬 Messagerie temps réel (Firebase Realtime Database)
- 🟢 Présence en ligne + indicateur de frappe
- 🎙️ Appels vocaux via Jitsi Meet
- 📹 Appels vidéo via Jitsi Meet
- 🏠 Salons publics + création personnalisée
- 🔐 Auth email/mot de passe
- 📱 APK Android compilé via GitHub Actions
- 🌐 Version web déployée sur GitHub Pages
- 🇷🇺 Compatible Russie (région Firebase europe-west1)

---

## 🔧 Jitsi privé (optionnel)

Modifiez dans `www/index.html` :
```javascript
const JITSI_SERVER = "meet.votre-domaine.com";
```
Guide : https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart
