// 1. On récupère le nom du salon dans l'URL (ex: #mon-salon-prive)
// Si pas de hash dans l'URL, on en génère un au hasard et on recharge
if (!window.location.hash) {
    const randomRoom = Math.random().toString(36).substring(7);
    window.location.hash = randomRoom;
}

const roomName = window.location.hash.replace('#', '');
initVoiceChat(); // On lance directement la fonction
if (!roomName) {
    document.body.innerHTML = "<h1>Erreur</h1><p>Veuillez ajouter un nom de salon à l'URL, ex: index.html#le-nom-du-salon</p>";
} else {
    initVoiceChat();
}

async function initVoiceChat() {
    const status = document.getElementById('status');
    let localStream;

    try {
        // Demander l'accès au micro
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        status.innerText = "Micro activé. Connexion au salon : " + roomName;
    } catch (err) {
        status.innerText = "Erreur micro : " + err.message;
        return;
    }

    // On tente de se connecter en tant qu'HÔTE (le premier arrivé)
    const peer = new Peer(roomName + '-host');

    peer.on('open', (id) => {
        status.innerText = "En attente de votre ami sur le salon : " + roomName;
    });

    // Si quelqu'un nous appelle (on est l'hôte)
    peer.on('call', (call) => {
        status.innerText = "Appel entrant...";
        call.answer(localStream);
        handleStream(call);
    });

    // SI L'ID EST DÉJÀ PRIS (on est le deuxième arrivé)
    peer.on('error', (err) => {
        if (err.type === 'id-taken') {
            status.innerText = "Salon occupé, tentative de connexion en cours...";
            
            // On se connecte avec un ID "invité" et on appelle l'hôte
            const guestPeer = new Peer(roomName + '-guest');
            guestPeer.on('open', () => {
                const call = guestPeer.call(roomName + '-host', localStream);
                handleStream(call);
            });
        } else {
            console.error(err);
        }
    });
}

function handleStream(call) {
    call.on('stream', (remoteStream) => {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play();
        document.getElementById('status').innerText = "✅ Connecté ! Vous pouvez parler.";
    });
}
