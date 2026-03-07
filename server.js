// ═══════════════════════════════════════════════════════════
//  NEXUS — Serveur de signaling WebSocket
//  Déploiement gratuit sur Render.com (voir README ci-dessous)
//  Node.js pur, zéro dépendance externe sauf "ws"
// ═══════════════════════════════════════════════════════════
//
//  DÉPLOIEMENT RENDER.COM (gratuit, ~2 minutes) :
//  1. Créez un compte sur render.com
//  2. New → Web Service → "Deploy from a public Git repo"
//  3. Créez un repo GitHub avec ce server.js et package.json
//  4. Build Command : npm install
//     Start Command : node server.js
//  5. Vous obtenez une URL wss://votre-app.onrender.com
//  6. Collez cette URL dans index.html (variable SIGNAL_SERVER)
//
// ═══════════════════════════════════════════════════════════

const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3000;

// Serveur HTTP minimal (requis par Render pour health check)
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('NEXUS Signaling Server OK');
});

const wss = new WebSocketServer({ server: httpServer });

// rooms[roomId] = Map<peerId, WebSocket>
const rooms = new Map();

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

wss.on('connection', (ws) => {
  let myRoom = null;
  let myId   = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // ── JOIN : un pair rejoint une salle ──
    if (msg.type === 'join') {
      myId   = msg.id;
      myRoom = msg.room;
      if (!myId || !myRoom) return;

      if (!rooms.has(myRoom)) rooms.set(myRoom, new Map());
      const room = rooms.get(myRoom);

      // Envoyer la liste des pairs déjà présents
      const peers = [];
      room.forEach((_, pid) => peers.push(pid));
      ws.send(JSON.stringify({ type: 'peers', peers }));

      // Informer les autres de notre arrivée
      room.forEach((sock) => {
        if (sock.readyState === 1) {
          sock.send(JSON.stringify({ type: 'peer_joined', id: myId }));
        }
      });

      room.set(myId, ws);
      log(`JOIN  room=${myRoom} id=${myId} peers=${peers.length}`);
      return;
    }

    // ── RELAY : transmettre offer/answer/ice à un pair précis ──
    if (msg.type === 'relay' && myRoom) {
      const room = rooms.get(myRoom);
      if (!room) return;
      const target = room.get(msg.to);
      if (target && target.readyState === 1) {
        target.send(JSON.stringify({
          type:    msg.relay_type,   // 'offer' | 'answer' | 'ice'
          from:    myId,
          payload: msg.payload,
        }));
      }
      return;
    }
  });

  ws.on('close', () => {
    if (!myRoom || !myId) return;
    const room = rooms.get(myRoom);
    if (!room) return;
    room.delete(myId);
    // Prévenir les autres
    room.forEach((sock) => {
      if (sock.readyState === 1) {
        sock.send(JSON.stringify({ type: 'peer_left', id: myId }));
      }
    });
    if (room.size === 0) rooms.delete(myRoom);
    log(`LEAVE room=${myRoom} id=${myId}`);
  });

  ws.on('error', () => {});
});

httpServer.listen(PORT, () => {
  log(`Signaling server listening on port ${PORT}`);
});
