const SECRET_ROOM = "salon-unique-radio-123"; 
let localStream;
const status = document.getElementById('status');

async function start() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        status.innerText = "🎤 Micro prêt. Recherche du partenaire...";
        
        // On essaie d'abord de voir si l'hôte existe
        const peer = new Peer(); // On prend un ID aléatoire au départ

        peer.on('open', () => {
            // On tente d'appeler l'hôte
            const call = peer.call(SECRET_ROOM + '-host', localStream);
            
            // Si on reçoit une réponse, on est l'invité
            call.on('stream', stream => playStream(stream));

            // Si après 3 secondes on n'a pas de réponse, on essaie de devenir l'Hôte
            setTimeout(() => {
                if (status.innerText !== "✅ CONNECTÉ !") {
                    becomeHost();
                }
            }, 3000);
        });

        peer.on('error', (err) => {
            console.log("Erreur tentative :", err.type);
            becomeHost();
        });

    } catch (e) {
        status.innerText = "❌ Erreur Micro : " + e.message;
    }
}

function becomeHost() {
    const hostPeer = new Peer(SECRET_ROOM + '-host');
    
    hostPeer.on('open', () => {
        status.innerText = "🟢 Vous êtes l'HÔTE. En attente de l'ami...";
    });

    hostPeer.on('call', (call) => {
        status.innerText = "📞 Appel entrant...";
        call.answer(localStream);
        call.on('stream', stream => playStream(stream));
    });

    hostPeer.on('error', (err) => {
        if (err.type === 'id-taken') {
            status.innerText = "🤝 Salon occupé, réessai...";
            setTimeout(start, 2000); // On recommence la boucle
        }
    });
}

function playStream(remoteStream) {
    const audio = new Audio();
    audio.srcObject = remoteStream;
    audio.play().catch(() => {
        status.innerText = "⚠️ Cliquez ici pour activer le son !";
    });
    status.innerText = "✅ CONNECTÉ !";
}

// On démarre
start();
