const SECRET_ID = "votre-code-unique-2026"; // CHANGEZ MOI !
const btn = document.getElementById('start-btn');
const status = document.getElementById('status');
let localStream;

btn.onclick = async () => {
    btn.disabled = true;
    status.innerText = "Accès micro...";
    
    try {
        // 1. Capturer le micro (obligatoire avant d'appeler)
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        btn.innerText = "CONNEXION...";
        initPeer();
    } catch (e) {
        status.innerText = "Erreur micro : " + e.message;
        btn.disabled = false;
    }
};

function initPeer() {
    // On tente de prendre l'ID fixe
    const peer = new Peer(SECRET_ID);

    peer.on('open', (id) => {
        status.innerText = "En attente de l'autre...";
        btn.innerText = "À L'ÉCOUTE";
    });

    // Si on reçoit un appel
    peer.on('call', (call) => {
        status.innerText = "Appel reçu !";
        call.answer(localStream);
        connectAudio(call);
    });

    // SI L'ID EST DÉJÀ PRIS (L'autre est déjà connecté)
    peer.on('error', (err) => {
        if (err.type === 'id-taken') {
            status.innerText = "L'autre est là, je l'appelle...";
            // On crée un peer avec un ID aléatoire pour appeler l'ID fixe
            const guest = new Peer();
            guest.on('open', () => {
                const call = guest.call(SECRET_ID, localStream);
                connectAudio(call);
            });
        } else {
            status.innerText = "Erreur : " + err.type;
            btn.disabled = false;
        }
    });
}

function connectAudio(call) {
    call.on('stream', (remoteStream) => {
        status.innerText = "✅ CONNECTÉ";
        btn.innerText = "EN LIGNE";
        btn.classList.add('active');

        // Création de l'élément audio pour Android
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play().catch(() => {
            status.innerText = "Cliquez pour activer le son";
            document.body.onclick = () => audio.play();
        });
    });
}
