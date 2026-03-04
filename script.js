// 1. Si pas de salon dans l'URL, on en crée un au hasard
if (!window.location.hash) {
    const randomRoom = Math.random().toString(36).substring(7);
    window.location.hash = randomRoom;
}

const roomName = window.location.hash.replace('#', '');
let localStream;
let isMuted = false;

// On lance l'application
initVoiceChat();

async function initVoiceChat() {
    const status = document.getElementById('status');

    try {
        // Demander l'accès au micro
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        status.innerText = "Connecté au salon : " + roomName;
    } catch (err) {
        status.innerText = "Erreur micro : " + err.message;
        return;
    }

    // Tentative de connexion (Hôte)
    const peer = new Peer(roomName + '-host');

    peer.on('open', () => {
        status.innerText = "🟢 En attente de votre ami sur : #" + roomName;
    });

    peer.on('call', (call) => {
        status.innerText = "📞 Appel en cours...";
        call.answer(localStream);
        handleStream(call);
    });

    // Si le salon 'host' existe déjà, on devient 'guest'
    peer.on('error', (err) => {
        if (err.type === 'id-taken') {
            const guestPeer = new Peer(roomName + '-guest-' + Math.floor(Math.random() * 100));
            guestPeer.on('open', () => {
                const call = guestPeer.call(roomName + '-host', localStream);
                handleStream(call);
            });
        }
    });
}

function handleStream(call) {
    call.on('stream', (remoteStream) => {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play();
        document.getElementById('status').innerText = "✅ En ligne !";
    });
}

// Fonction pour couper/activer le micro (à lier à un bouton si vous voulez)
function toggleMute() {
    isMuted = !isMuted;
    localStream.getAudioTracks()[0].enabled = !isMuted;
    alert(isMuted ? "Micro coupé" : "Micro activé");
}
