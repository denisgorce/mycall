const SECRET_ROOM = "salon-prive-unique-789"; 
let localStream;
const status = document.getElementById('status');

async function start() {
    try {
        // 1. Demander le micro
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        status.innerText = "🎤 Micro OK. Connexion...";
        
        // 2. Tenter d'être l'Hôte
        const peer = new Peer(SECRET_ROOM + '-host');

        peer.on('open', () => {
            status.innerText = "🟢 En ligne (Hôte). En attente de l'autre...";
        });

        peer.on('call', (call) => {
            status.innerText = "📢 Appel reçu !";
            call.answer(localStream);
            call.on('stream', stream => playStream(stream));
        });

        // 3. Si l'Hôte existe déjà, devenir Invité
        peer.on('error', (err) => {
            if (err.type === 'id-taken') {
                const guest = new Peer();
                guest.on('open', () => {
                    const call = guest.call(SECRET_ROOM + '-host', localStream);
                    call.on('stream', stream => playStream(stream));
                });
            }
        });
    } catch (e) {
        status.innerText = "❌ Erreur : " + e.message;
    }
}

function playStream(remoteStream) {
    const audio = new Audio();
    audio.srcObject = remoteStream;
    audio.play();
    status.innerText = "✅ CONNECTÉ !";
}

start();
