const roomName = window.location.hash.replace('#', '') || 'salon-defaut';
document.getElementById('room-id').innerText = roomName;

const btn = document.getElementById('start-btn');
const status = document.getElementById('status');

btn.addEventListener('click', () => {
    btn.style.display = 'none'; // On cache le bouton après le clic
    initVoiceChat();
});

async function initVoiceChat() {
    let localStream;
    try {
        // Demande explicite du micro
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        status.innerText = "Micro OK. Connexion...";
    } catch (err) {
        status.innerText = "Erreur Micro : " + err.message;
        return;
    }

    const peer = new Peer(roomName + '-host');

    peer.on('open', () => {
        status.innerText = "En attente d'un ami...";
    });

    peer.on('call', (call) => {
        call.answer(localStream);
        handleStream(call);
    });

    peer.on('error', (err) => {
        if (err.type === 'id-taken') {
            const guestPeer = new Peer(); // ID aléatoire pour l'invité
            guestPeer.on('open', () => {
                const call = guestPeer.call(roomName + '-host', localStream);
                handleStream(call);
            });
        }
    });
}

function handleStream(call) {
    call.on('stream', (remoteStream) => {
        status.innerText = "✅ EN DIRECT";
        const audio = new Audio();
        audio.srcObject = remoteStream;
        // Sur mobile, play() doit être appelé suite à une interaction utilisateur
        audio.play().catch(e => {
            status.innerText = "Cliquez n'importe où pour entendre le son";
            document.body.addEventListener('click', () => audio.play(), {once: true});
        });
    });
}
