// ═══════════════════════════════════════════════════════════
//  NEXUS — Serveur signaling + Push notifications
//  Dépendances : ws, web-push
// ═══════════════════════════════════════════════════════════
//
//  Variables d'env à configurer sur Render.com :
//    VAPID_PUBLIC_KEY   (déjà dans le code, peut rester)
//    VAPID_PRIVATE_KEY  (mettre dans Render env vars — SECRET)
//    VAPID_EMAIL        ex: mailto:vous@gmail.com
//
// ═══════════════════════════════════════════════════════════

const { WebSocketServer } = require('ws');
const http    = require('http');
const webpush = require('web-push');

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || 'BPD4U8JbtKKc0DPpz8zj4y2I-pf6DMNt8wZ1gjRsAJwGeRSFGMMDH7ynZkmaz7aBvZ7utdtWDnhKhj0T6KvKKGU';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'pv1sorrQvGasxr3gHs7ORmdFKMzpyM62NGEby28eVhA';
const VAPID_EMAIL       = process.env.VAPID_EMAIL       || 'mailto:nexus@example.com';

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const PORT = process.env.PORT || 3000;
const httpServer = http.createServer((req, res) => {
  if (req.url === '/vapid-public-key') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    return res.end(VAPID_PUBLIC_KEY);
  }
  res.writeHead(200); res.end('NEXUS OK');
});

// members[name] = { ws, pushSub, name, id }
const members = new Map();
// contacts: liste partagée persistante (en mémoire tant que le serveur tourne)
let contacts = ['Denis', 'Eugenia', 'Maryse', 'André'];
const log = (...a) => console.log(new Date().toISOString().slice(11,19), ...a);

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  let myName = null, myId = null;

  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'register') {
      myName = msg.name; myId = msg.id;
      if (!myName || !myId) return;
      members.set(myName, { ws, pushSub: null, name: myName, id: myId });
      const list = [];
      members.forEach((m, n) => { if (n !== myName) list.push({ name: m.name, id: m.id }); });
      ws.send(JSON.stringify({ type: 'members', members: list }));
      ws.send(JSON.stringify({ type: 'contacts', contacts }));
      broadcast(myName, { type: 'member_joined', name: myName, id: myId });
      log(`JOIN name=${myName} total=${members.size}`);
      return;
    }

    if (msg.type === 'push_subscribe' && myName) {
      const m = members.get(myName);
      if (m) m.pushSub = msg.subscription;
      log(`PUSH_SUB name=${myName}`);
      return;
    }

    if (msg.type === 'call_request' && myName) {
      const target = members.get(msg.to);
      if (!target) return;
      if (target.ws.readyState === 1) {
        target.ws.send(JSON.stringify({ type:'incoming_call', from:myName, fromId:myId }));
      }
      if (target.pushSub) {
        webpush.sendNotification(target.pushSub, JSON.stringify({
          title: `📞 Appel de ${myName}`,
          body:  'Appuyez pour répondre',
          data:  { caller: myName, callerId: myId },
        })).catch(err => {
          log(`PUSH_ERR ${err.statusCode}`);
          if (err.statusCode === 410) { const m = members.get(msg.to); if (m) m.pushSub = null; }
        });
      }
      return;
    }

    if (msg.type === 'call_response' && myName) {
      sendTo(msg.to, { type:'call_response', from:myName, fromId:myId, accepted:msg.accepted });
      return;
    }

    if (msg.type === 'relay' && myName) {
      sendTo(msg.to, { type:msg.relay_type, from:myName, fromId:myId, payload:msg.payload });
      return;
    }

    if (msg.type === 'add_contact' && myName) {
      const name = (msg.name || '').trim().slice(0, 24);
      if (name && !contacts.includes(name)) {
        contacts.push(name);
        broadcast(null, { type: 'contacts', contacts });
        log(`CONTACT_ADD name=${name} by=${myName}`);
      }
      return;
    }

    if (msg.type === 'remove_contact' && myName) {
      const name = msg.name;
      contacts = contacts.filter(c => c !== name);
      broadcast(null, { type: 'contacts', contacts });
      log(`CONTACT_DEL name=${name} by=${myName}`);
      return;
    }

    if (msg.type === 'hangup' && myName) {
      sendTo(msg.to, { type:'hangup', from:myName });
      return;
    }

    if (msg.type === 'chat' && myName) {
      broadcast(null, { type:'chat', from:myName, text:msg.text, ts:Date.now() });
      return;
    }
  });

  ws.on('close', () => {
    if (!myName) return;
    members.delete(myName);
    broadcast(myName, { type:'member_left', name:myName });
    log(`LEAVE name=${myName} total=${members.size}`);
  });

  ws.on('error', () => {});
});

function sendTo(name, msg) {
  const m = members.get(name);
  if (m && m.ws.readyState === 1) m.ws.send(JSON.stringify(msg));
}
function broadcast(excludeName, msg) {
  const raw = JSON.stringify(msg);
  members.forEach((m, n) => { if (n !== excludeName && m.ws.readyState === 1) m.ws.send(raw); });
}

httpServer.listen(PORT, () => log(`Listening on ${PORT}`));
