const SECRET_ID = "votre-code-unique-2026"; 
const btn = document.getElementById('start-btn');
const status = document.getElementById('status');

btn.onclick = function() {
    status.innerText = "Demande micro...";
    
    // Test de compatibilité
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Votre navigateur ne supporte pas l'audio (vérifiez le HTTPS)");
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
            status.innerText = "Micro OK. Connexion Peer...";
            startPeer(stream);
        })
        .catch(function(err) {
            alert("Erreur micro : " + err.name);
            status.innerText = "Accès refusé.";
        });
};

function startPeer(localStream) {
    // On charge PeerJS dynamiquement si besoin, mais ici on suppose qu'il est là
    const peer = new Peer(SECRET_ID);

    peer.on('open', function() {
        status.innerText = "En attente de l'autre...";
        btn.innerText = "PRÊT";
        btn.style.background = "#555";
    });

    peer.on('call', function(call) {
        status.innerText = "Appel reçu !";
        call.answer(localStream);
        setupAudio(call);
    });

    peer.on('error', function(err) {
        if (err.type === 'id-taken') {
            status.innerText = "L'autre est là, connexion...";
            const guest = new Peer();
            guest.on('open', function() {
                const call = guest.call(SECRET_ID, localStream);
                setupAudio(call);
            });
        } else {
            alert("Erreur PeerJS : " + err.type);
        }
    });
}

function setupAudio(call) {
    call.on('stream', function(remoteStream) {
        status.innerText = "✅ CONNECTÉ";
        btn.innerText = "EN LIGNE";
        btn.style.background = "#28a745";

        const audio = document.createElement('audio');
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.controls = false;
        document.body.appendChild(audio);
        
        // Force la lecture pour Android
        audio.play().catch(function() {
            status.innerText = "Appuyez ici pour entendre";
            document.body.onclick = function() { audio.play(); };
        });
    });
}
