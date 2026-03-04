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
    // On tente de se connecter avec l'ID Maître
    const peer = new Peer(SECRET_ID);

    peer.on('open', function(id) {
        status.innerText = "Mode Hôte : En attente...";
        btn.innerText = "À L'ÉCOUTE";
    });

    peer.on('call', function(call) {
        status.innerText = "Appel reçu !";
        call.answer(localStream);
        setupAudio(call);
    });

    // C'EST ICI QUE ÇA SE JOUE
    peer.on('error', function(err) {
        // Si l'ID est déjà pris OU indisponible
        if (err.type === 'id-taken' || err.type === 'unavailable-id') {
            status.innerText = "L'autre est déjà connecté, je l'appelle...";
            
            // On crée un ID aléatoire pour nous-mêmes (Invité)
            const guest = new Peer(); 
            
            guest.on('open', function() {
                // On appelle l'ID Maître (le SECRET_ID)
                const call = guest.call(SECRET_ID, localStream);
                
                if (call) {
                    setupAudio(call);
                } else {
                    status.innerText = "Échec de l'appel. Réessayez.";
                }
            });

            guest.on('error', (e) => alert("Erreur Invité: " + e.type));
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
