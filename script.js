// On définit un nom de salon unique et fixe pour vous deux
const SECRET_ROOM = "salon-prive-unique-789"; 

let localStream;
const status = document.getElementById('status');

// Lancer l'application immédiatement au chargement
window.onload = initVoiceChat;

async function initVoiceChat() {
    try {
        // 1. On demande le micro
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        status.innerText = "🎤 Micro activé. Recherche de l'autre personne...";
        
        // 2. On essaie d'être l'HÔTE
        connectAsHost();
    } catch (err) {
        status.innerText = "❌ Erreur micro : " + err.message;
    }
}

function connectAsHost() {
    const peer = new Peer(SECRET_ROOM + '-host');

    peer.on('open', () => {
        status.innerText = "🟢 En attente de votre ami...";
    });

    peer.on('call', (call) => {
        status.innerText = "📞 Appel entrant, connexion...";
        call.answer(localStream);
        handleStream(call);
    });

    // 3. SI L'HÔTE EXISTE DÉJÀ (votre ami est déjà là)
    peer.on('error', (err) => {
        if (err.type === 'id-taken') {
            status.innerText = "🤝 Ami trouvé ! Connexion en cours...";
            connectAsGuest();
        }
    });
}

function connectAsGuest() {
    // On prend un ID temporaire pour l'invité
    const guestPeer = new Peer(); 
    
    guestPeer.on('open', () => {
        const call = guestPeer.call(SECRET_ROOM + '-host', localStream);
        handleStream(call);
    });
}

function handleStream(call) {
    call.on('stream', (remoteStream) => {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play();
        status.innerText = "✅ EN LIGNE ! Vous pouvez parler.";
    });
}
