const SECRET_KEY = "votre-nom-unique-ici"; 
const status = document.getElementById('status');
const callBtn = document.getElementById('call-btn');
const hangupBtn = document.getElementById('hangup-btn');
const ringtone = document.getElementById('ringtone');
const outputSelect = document.getElementById('audio-output');

let peer, localStream, currentCall, dataConn;

// 1. Initialisation au chargement
window.onload = () => {
    peer = new Peer(SECRET_KEY + '-host');

    peer.on('open', () => { status.innerText = "Prêt (Hôte)"; });

    // Si on est le deuxième (l'invité)
    peer.on('error', (err) => {
        if (err.type === 'id-taken') {
            peer = new Peer(SECRET_KEY + '-guest');
            peer.on('open', () => { status.innerText = "Prêt (Invité)"; });
        }
    });

    // Écouter les appels entrants
    peer.on('call', (call) => {
        ringtone.play();
        status.innerText = "Appel entrant...";
        callBtn.innerText = "RÉPONDRE";
        callBtn.classList.add('ringing');
        currentCall = call;
    });

    // Lister les sorties audio (si supporté par le navigateur)
    if (navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            devices.filter(d => d.kind === 'audiooutput').forEach(device => {
                const opt = document.createElement('option');
                opt.value = device.deviceId;
                opt.text = device.label || `Haut-parleur ${outputSelect.length + 1}`;
                outputSelect.add(opt);
            });
        });
    }
};

// 2. Bouton Appeler / Répondre
callBtn.onclick = async () => {
    ringtone.pause();
    callBtn.classList.remove('ringing');
    
    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    if (currentCall && !currentCall.open) {
        // On répond à un appel
        currentCall.answer(localStream);
        setupStream(currentCall);
    } else {
        // On lance un nouvel appel
        const target = peer.id.includes('-host') ? SECRET_KEY + '-guest' : SECRET_KEY + '-host';
        const call = peer.call(target, localStream);
        if (call) {
            status.innerText = "Appel en cours...";
            setupStream(call);
        }
    }
};

function setupStream(call) {
    currentCall = call;
    call.on('stream', (remoteStream) => {
        status.innerText = "✅ EN COMMUNICATION";
        callBtn.style.display = 'none';
        hangupBtn.style.display = 'block';
        
        const audio = new Audio();
        audio.srcObject = remoteStream;
        
        // Changer la sortie audio si sélectionnée
        if (outputSelect.value && audio.setSinkId) {
            audio.setSinkId(outputSelect.value);
        }
        
        audio.play();
    });
}

// 3. Bouton Raccrocher
hangupBtn.onclick = () => {
    if (currentCall) currentCall.close();
    location.reload(); // Moyen le plus propre de réinitialiser PeerJS
};

// Changement de sortie audio en direct
outputSelect.onchange = () => {
    const audios = document.querySelectorAll('audio');
    audios.forEach(a => {
        if (a.setSinkId) a.setSinkId(outputSelect.value);
    });
};
