/**
 * mycall — Firebase Cloud Functions
 * ══════════════════════════════════════════
 * Quatre fonctions :
 *
 * 1. onCallCreated   → notifie tous les utilisateurs quand un appel démarre
 * 2. onMessageSent   → notifie le destinataire d'un DM (app fermée)
 * 3. cleanupOldCalls → supprime les vieux appels (cron horaire)
 * 4. getJitsiToken   → [NOUVEAU] génère un JWT modérateur pour JaaS/8x8.vc
 *
 * Plan Spark Firebase (GRATUIT) suffisant pour les fonctions 1-3.
 * La fonction getJitsiToken nécessite le plan Blaze (pay-as-you-go) car elle
 * utilise Firebase Secrets. Le free tier reste très généreux
 * (125 000 invocations gratuites/mois).
 */

const functions = require("firebase-functions");
const admin     = require("firebase-admin");
const jwt       = require("jsonwebtoken");

admin.initializeApp();

const db  = admin.database();
const fcm = admin.messaging();

/* ══════════════════════════════════════════════
   1. NOTIFICATION D'APPEL ENTRANT
   Déclenchée quand calls/{callId} est créé
══════════════════════════════════════════════ */
exports.onCallCreated = functions
  .region("europe-west1")
  .database.ref("/calls/{callId}")
  .onCreate(async (snap, context) => {
    const call = snap.val();
    if (!call) return null;

    const { callerUid, callerName, type, roomName, jitsiRoom, callId } = call;

    const tokensSnap = await db.ref("fcmTokens").once("value");
    if (!tokensSnap.exists()) return null;

    const tokens   = [];
    const tokenMap = {};

    tokensSnap.forEach(child => {
      const data = child.val();
      if (data.token && child.key !== callerUid) {
        tokens.push(data.token);
        tokenMap[data.token] = child.key;
      }
    });

    if (tokens.length === 0) return null;

    const isVideo   = type === "video";
    const callLabel = isVideo ? "Appel vidéo" : "Appel vocal";

    const message = {
      notification: {
        title: `📞 ${callLabel} de ${callerName}`,
        body:  `Salon : ${roomName || "mycall"}`,
      },
      data: {
        type:         "incoming_call",
        callId,
        callerUid,
        callerName,
        callType:     type,
        roomName:     roomName || "",
        jitsiRoom,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      android: {
        priority: "high",
        notification: {
          channelId:  "mycall_calls",
          priority:   "max",
          visibility: "public",
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            sound:            "default",
            contentAvailable: true,
          },
        },
      },
      tokens,
    };

    try {
      const response = await fcm.sendEachForMulticast(message);
      console.log(`[onCallCreated] envoyé à ${tokens.length} appareils.`);

      const cleanupPromises = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            const uid = tokenMap[tokens[idx]];
            if (uid) {
              console.log(`[onCallCreated] token invalide supprimé pour uid: ${uid}`);
              cleanupPromises.push(db.ref(`fcmTokens/${uid}`).remove());
            }
          }
        }
      });
      await Promise.all(cleanupPromises);
    } catch (err) {
      console.error("[onCallCreated] Erreur FCM:", err);
    }

    return null;
  });

/* ══════════════════════════════════════════════
   2. NOTIFICATION DE MESSAGE DIRECT
   Déclenchée quand messages/dm-{roomId}/{messageId} est créé
   N'envoie QUE pour les conversations DM
══════════════════════════════════════════════ */
exports.onMessageSent = functions
  .region("europe-west1")
  .database.ref("/messages/{roomId}/{messageId}")
  .onCreate(async (snap, context) => {
    const msg    = snap.val();
    const roomId = context.params.roomId;

    if (!roomId.startsWith("dm-")) return null;
    if (!msg || msg.uid === "system") return null;

    const senderUid  = msg.uid;
    const senderName = msg.username || "Quelqu'un";
    const text       = msg.type === "image" ? "🖼 Photo" : (msg.text || "Message");

    const tokensSnap = await db.ref("fcmTokens").once("value");
    if (!tokensSnap.exists()) return null;

    const tokens   = [];
    const tokenMap = {};

    tokensSnap.forEach(child => {
      const data = child.val();
      if (
        data.token &&
        child.key !== senderUid &&
        roomId.includes(child.key)
      ) {
        tokens.push(data.token);
        tokenMap[data.token] = child.key;
      }
    });

    if (tokens.length === 0) return null;

    const message = {
      notification: {
        title: `🗨️ ${senderName}`,
        body:  text.length > 80 ? text.slice(0, 80) + "…" : text,
      },
      data: {
        type:         "new_message",
        roomId,
        senderUid,
        senderName,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "mycall_messages",
          priority:  "default",
        },
      },
      apns: {
        payload: { aps: { sound: "default" } },
      },
      tokens,
    };

    try {
      const response = await fcm.sendEachForMulticast(message);
      console.log(`[onMessageSent] envoyé à ${tokens.length} destinataire(s).`);

      const cleanupPromises = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            const uid = tokenMap[tokens[idx]];
            if (uid) cleanupPromises.push(db.ref(`fcmTokens/${uid}`).remove());
          }
        }
      });
      await Promise.all(cleanupPromises);
    } catch (err) {
      console.error("[onMessageSent] Erreur FCM:", err);
    }

    return null;
  });

/* ══════════════════════════════════════════════
   3. NETTOYAGE AUTOMATIQUE DES APPELS EXPIRÉS
   Cron : toutes les heures, supprime les appels
   de plus de 2 heures
══════════════════════════════════════════════ */
exports.cleanupOldCalls = functions
  .region("europe-west1")
  .pubsub.schedule("every 60 minutes")
  .onRun(async () => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    const snap   = await db.ref("calls")
      .orderByChild("startedAt")
      .endAt(cutoff)
      .once("value");

    if (!snap.exists()) return null;

    const updates = {};
    snap.forEach(child => { updates[child.key] = null; });
    await db.ref("calls").update(updates);
    console.log(`[cleanupOldCalls] ${Object.keys(updates).length} appel(s) supprimé(s).`);
    return null;
  });

/* ══════════════════════════════════════════════
   4. [NOUVEAU] GÉNÉRATION DU TOKEN JWT MODÉRATEUR
   ──────────────────────────────────────────────
   Appelée depuis l'app avant chaque ouverture Jitsi.
   Génère un JWT signé RS256 avec moderator: true,
   valable 2 heures.

   Prérequis (à faire une seule fois) :
     firebase functions:secrets:set JAAS_APP_ID
     firebase functions:secrets:set JAAS_KEY_ID
     firebase functions:secrets:set JAAS_PRIVATE_KEY
══════════════════════════════════════════════ */
exports.getJitsiToken = functions
  .region("europe-west1")
  .runWith({
    // Déclare les secrets — Firebase les injecte dans process.env au runtime
    secrets: ["JAAS_APP_ID", "JAAS_KEY_ID", "JAAS_PRIVATE_KEY"],
  })
  .https.onCall(async (data, context) => {

    // ── 1. Vérification : l'utilisateur doit être connecté ──────────────────
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Vous devez être connecté pour rejoindre un appel."
      );
    }

    // ── 2. Récupérer les paramètres ──────────────────────────────────────────
    const { room, displayName } = data;

    if (!room || typeof room !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Le paramètre 'room' est requis."
      );
    }

    // ── 3. Lire les secrets depuis l'environnement Firebase ──────────────────
    const appId      = process.env.JAAS_APP_ID;
    const keyId      = process.env.JAAS_KEY_ID;
    const privateKey = process.env.JAAS_PRIVATE_KEY;

    if (!appId || !keyId || !privateKey) {
      console.error("[getJitsiToken] Secrets manquants — vérifiez JAAS_APP_ID, JAAS_KEY_ID, JAAS_PRIVATE_KEY");
      throw new functions.https.HttpsError(
        "internal",
        "Configuration serveur incomplète."
      );
    }

    // ── 4. Construire le payload JWT JaaS ────────────────────────────────────
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      // Champs standard JWT
      iss: "chat",               // Émetteur (fixe pour JaaS)
      aud: "jitsi",              // Audience (fixe pour JaaS)
      sub: appId,                // Votre App ID JaaS
      iat: now - 10,             // Issued at (avec 10s de marge horaire)
      nbf: now - 10,             // Not before
      exp: now + (2 * 60 * 60), // Expiration : 2 heures

      // Contexte utilisateur JaaS
      context: {
        features: {
          livestreaming:        false,
          "outbound-call":      false,
          "sip-outbound-call":  false,
          transcription:        false,
        },
        user: {
          "hidden-from-recorder": false,
          moderator: true,                        // ◄── CLÉ : hôte automatique
          name:   displayName || context.auth.token.name || "Utilisateur",
          id:     context.auth.uid,
          avatar: "",
          email:  context.auth.token.email || "",
        },
      },

      // Accès à tous les salons (wildcard)
      room: "*",
    };

    // ── 5. Signer le JWT avec RS256 ──────────────────────────────────────────
    let token;
    try {
      token = jwt.sign(payload, privateKey, {
        algorithm: "RS256",
        header: {
          alg: "RS256",
          kid: keyId,  // Key ID visible dans le dashboard JaaS
          typ: "JWT",
        },
      });
    } catch (err) {
      console.error("[getJitsiToken] Erreur de signature JWT:", err.message);
      throw new functions.https.HttpsError(
        "internal",
        "Impossible de générer le token d'appel."
      );
    }

    // ── 6. Journal (sans données sensibles) ──────────────────────────────────
    console.log(
      `[getJitsiToken] Token généré ` +
      `uid=${context.auth.uid} room=${room} ` +
      `exp=${new Date(payload.exp * 1000).toISOString()}`
    );

    // ── 7. Retourner token + nom de salle préfixé ────────────────────────────
    // JaaS exige le format : {appId}/{nomDuSalon}
    return {
      token,
      jitsiRoom: `${appId}/${room}`,
    };
  });
