const SECRET_ROOM = "salon-prive-789"; 
let localStream;
const status = document.getElementById('status');
const btnPlay = document.getElementById('btn-play');

// Création d'un élément audio unique
const remoteAudio = new Audio();
remoteAudio.autoplay = true;

async function start() {
    try {
        // 1. Capture du micro
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        status.innerText = "🎤 Micro prêt. Connexion...";

        const peer = new Peer();

        peer.on('open', () => {
            const call = peer.call(SECRET_ROOM + '-host', localStream);
            if (call) handleCall(call);

            setTimeout(() => {
                if (status.innerText.includes("Connexion")) becomeHost();
            }, 3000);
        });

        peer.on('error', () => becomeHost());
    } catch (e) {
        status.innerText = "❌ Autorisez le micro !";
    }
}

function becomeHost() {
    const hostPeer = new Peer(SECRET_ROOM + '-host');
    hostPeer.on('open', () => status.innerText = "🟢 En attente de l'ami...");
    hostPeer.on('call', (call) => {
        call.answer(localStream);
        handleCall(call);
    });
}

function handleCall(call) {
    call.on('stream', (stream) => {
        status.innerText = "⚠️ Quelqu'un parle ! Cliquez sur le bouton.";
        btnPlay.style.display = "block";
        
        // On attache le flux à notre objet audio
        remoteAudio.srcObject = stream;

        btnPlay.onclick = () => {
            remoteAudio.play().then(() => {
                status.innerText = "✅ EN LIGNE (Son actif)";
                btnPlay.style.display = "none";
            }).catch(err => {
                console.error("Erreur lecture :", err);
                status.innerText = "❌ Erreur son : " + err.message;
            });
        };
    });
}

start();
