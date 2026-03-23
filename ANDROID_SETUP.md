# 📱 mycall — Guide Android : ne pas tuer l'app

La plupart des problèmes de notifications sur Android viennent du **gestionnaire
d'énergie** qui tue les apps en arrière-plan. Ce guide explique comment
configurer l'app et le téléphone pour garantir la réception des appels.

---

## Ce qui est déjà implémenté dans mycall

| Mécanisme | Rôle | Fonctionne si app… |
|---|---|---|
| **Cloud Function FCM** | Notif push système | Fermée ✅ |
| **Heartbeat toutes 4 min** | Garde la connexion WebSocket | Ouverte en fond ✅ |
| **Token refresh au retour** | Token FCM toujours valide | Rouverte ✅ |
| **onTokenRefresh listener** | Renouvellement automatique | Ouverte ✅ |
| **onDisconnect Firebase** | Présence correcte si crash | Toujours ✅ |

---

## Configuration à faire sur le téléphone (une fois par utilisateur)

### Samsung (One UI)
```
Paramètres → Applications → mycall
→ Batterie → "Sans restriction"

Paramètres → Gestion globale → Batterie
→ Optimisation de la batterie → mycall → "Ne pas optimiser"
```

### Xiaomi / MIUI (le plus restrictif)
```
Paramètres → Applications → mycall
→ Économiseur d'énergie → "Aucune restriction"
→ Démarrage automatique → Activer ✅

Paramètres → Batterie → Application économie batterie
→ mycall → Désactiver
```

### Huawei / EMUI
```
Paramètres → Applications → mycall
→ Lancement de l'application → Gérer manuellement
→ Activer : Démarrage automatique, Démarrage secondaire, Exécution en arrière-plan
```

### OnePlus / Oxygen OS
```
Paramètres → Batterie → Optimisation de la batterie
→ mycall → "Ne pas optimiser"
```

### Tous les Android (universel)
```
Paramètres → Applications → mycall → Batterie
→ "Utilisation de la batterie en arrière-plan" → Autoriser
```

---

## Ajout dans le code Android (Capacitor)

Le fichier `android/app/src/main/res/xml/` doit contenir la déclaration
des canaux de notification. Elle est générée automatiquement par Capacitor,
mais vous pouvez la personnaliser dans `android/app/src/main/AndroidManifest.xml` :

```xml
<!-- Dans <application> -->
<meta-data
  android:name="com.google.firebase.messaging.default_notification_channel_id"
  android:value="mycall_calls" />

<meta-data
  android:name="com.google.firebase.messaging.default_notification_icon"
  android:resource="@drawable/ic_notification" />

<meta-data
  android:name="com.google.firebase.messaging.default_notification_color"
  android:resource="@color/colorAccent" />
```

---

## Résumé : fiabilité selon la situation

| Situation | Avec Cloud Function FCM | Sans |
|---|---|---|
| App ouverte | ✅ Bannière in-app | ✅ Bannière in-app |
| App en fond (normal) | ✅ Notif système | ⚠️ Souvent raté |
| App en fond (MIUI agressif) | ✅ Si "sans restriction" | ❌ Jamais |
| App fermée | ✅ Notif push | ❌ Jamais |
| Téléphone éteint | ⏳ À rallumage | ❌ |
| Mode avion | ❌ Impossible | ❌ |
