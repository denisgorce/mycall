const SECRET_ROOM = "salon-unique-radio-123"; 
let localStream;
const status = document.getElementById('status');

async function start() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        status.innerText = "🎤 Micro OK. Tentative de connexion...";
        
        // On essaie d'être l'hôte
        const peer = new Peer(SECRET_ROOM + '-host');

        peer.on('open', (id) => {
            status.innerText = "🟢 Vous êtes l'HÔTE. En attente de l'ami...";
        });

        peer.on('call', (call) => {
            status.innerText = "📞 Appel reçu ! Connexion audio...";
            call.answer(localStream);
            setupAudio(call);
        });

        peer.on('error', (err) => {
            if (err.type === 'id-taken') {
                status.innerText = "🤝 Salon trouvé. Connexion comme INVITÉ...";
                connectAsGuest();
            } else {
                status.innerText = "❌ Erreur Peer : " + err.type;
            }
        });
    } catch (e) {
        status.innerText = "❌ Erreur Micro : " + e.message;
    }
}

function connectAsGuest() {
    const guest = new Peer(); // ID aléatoire pour l'invité
    guest.on('open', () => {
        const call = guest.call(SECRET_ROOM + '-host', localStream);
        setupAudio(call);
    });
}

function setupAudio(call) {
    call.on('stream', (remoteStream) => {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play().catch(e => {
            status.innerText = "⚠️ Cliquez sur la page pour activer le son !";
        });
        status.innerText = "✅ EN CONVERSATION !";
    });
}

start();
