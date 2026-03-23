/**
 * mycall — Firebase Cloud Functions
 * ══════════════════════════════════════════
 * Deux fonctions :
 *
 * 1. onCallCreated   → notifie tous les utilisateurs quand un appel démarre
 * 2. onMessageSent   → notifie le destinataire d'un DM (app fermée)
 *
 * Plan Spark Firebase (GRATUIT) suffisant :
 *  - appels sortants vers FCM = services Google → autorisés
 *  - 125 000 invocations/mois gratuites
 */

const functions = require("firebase-functions");
const admin     = require("firebase-admin");

admin.initializeApp();

const db  = admin.database();
const fcm = admin.messaging();

/* ══════════════════════════════════════════════
   1. NOTIFICATION D'APPEL ENTRANT
   Déclenchée quand calls/{callId} est créé
══════════════════════════════════════════════ */
exports.onCallCreated = functions
  .region("europe-west1")          // même région que votre DB
  .database.ref("/calls/{callId}")
  .onCreate(async (snap, context) => {
    const call = snap.val();
    if (!call) return null;

    const { callerUid, callerName, type, roomName, jitsiRoom, callId } = call;

    // Récupérer tous les tokens FCM sauf celui de l'appelant
    const tokensSnap = await db.ref("fcmTokens").once("value");
    if (!tokensSnap.exists()) return null;

    const tokens   = [];
    const tokenMap = {}; // token → uid (pour nettoyer les tokens invalides)

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

    // Payload de notification
    const message = {
      notification: {
        title: `📞 ${callLabel} de ${callerName}`,
        body:  `Salon : ${roomName || "mycall"}`,
      },
      data: {
        type:       "incoming_call",
        callId,
        callerUid,
        callerName,
        callType:   type,
        roomName:   roomName || "",
        jitsiRoom,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      android: {
        priority: "high",
        notification: {
          channelId:  "mycall_calls",
          priority:   "max",
          visibility: "public",
          // Son et vibration gérés côté app
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
      tokens, // multicast jusqu'à 500 tokens
    };

    try {
      const response = await fcm.sendEachForMulticast(message);
      console.log(`[onCallCreated] envoyé à ${tokens.length} appareils.`);

      // Nettoyer les tokens invalides (désinstallations, tokens expirés)
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

    // Ignorer les salons publics (seulement les DM commencent par "dm-")
    if (!roomId.startsWith("dm-")) return null;
    // Ignorer les messages système
    if (!msg || msg.uid === "system") return null;

    const senderUid  = msg.uid;
    const senderName = msg.username || "Quelqu'un";
    const text       = msg.type === "image" ? "🖼 Photo" : (msg.text || "Message");

    // Récupérer les deux participants du DM depuis userDMs
    // Le roomId = "dm-uid1-uid2" (uids triés)
    // On cherche tous les tokens de la conv SAUF l'expéditeur
    const tokensSnap = await db.ref("fcmTokens").once("value");
    if (!tokensSnap.exists()) return null;

    const tokens   = [];
    const tokenMap = {};

    // On envoie à tous les participants sauf l'expéditeur
    // (fiable : si l'app est ouverte, la notif est silencieuse / ignorée)
    tokensSnap.forEach(child => {
      const data = child.val();
      // On n'envoie qu'aux UIDs qui font partie du DM
      if (
        data.token &&
        child.key !== senderUid &&
        roomId.includes(child.key)   // l'uid est dans le roomId du DM
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
        type:     "new_message",
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

      // Nettoyage tokens invalides
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
   de plus de 2 heures pour éviter l'accumulation
══════════════════════════════════════════════ */
exports.cleanupOldCalls = functions
  .region("europe-west1")
  .pubsub.schedule("every 60 minutes")
  .onRun(async () => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000; // 2h
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
