const SECRET_ROOM = "salon-unique-radio-123"; 
let localStream;
let remoteVideo = document.createElement('video'); // Utilisation de <video> pour forcer le HP sur mobile
remoteVideo.setAttribute('playsinline', 'true');

const status = document.getElementById('status');
const btnStart = document.getElementById('btn-start');
const speakerBox = document.getElementById('speaker-box');
const speakerSelect = document.getElementById('speaker-select');

// Initialisation
async function init() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        status.innerText = "🎤 Micro OK. Recherche du partenaire...";
        
        const peer = new Peer(); 

        peer.on('open', () => {
            // Tentative d'appel vers l'hôte
            const call = peer.call(SECRET_ROOM + '-host', localStream);
            call.on('stream', stream => setupStream(stream));

            // Si pas de réponse après 3s, on devient l'hôte
            setTimeout(() => {
                if (status.innerText.includes("Recherche")) becomeHost();
            }, 3000);
        });

        peer.on('error', () => becomeHost());
    } catch (e) {
        status.innerText = "❌ Erreur micro : " + e.message;
    }
}

function becomeHost() {
    const hostPeer = new Peer(SECRET_ROOM + '-host');
    hostPeer.on('open', () => { status.innerText = "🟢 En attente de l'ami..."; });
    hostPeer.on('call', (call) => {
        call.answer(localStream);
        call.on('stream', stream => setupStream(stream));
    });
}

function setupStream(stream) {
    remoteVideo.srcObject = stream;
    status.innerText = "⚠️ Quelqu'un est en ligne !";
    btnStart.style.display = "block";

    btnStart.onclick = async () => {
        await remoteVideo.play();
        status.innerText = "✅ EN LIGNE";
        btnStart.style.display = "none";
        loadSpeakers();
    };
}

// Gestion des haut-parleurs
async function loadSpeakers() {
    if (!navigator.mediaDevices.enumerateDevices) return;

    const devices = await navigator.mediaDevices.enumerateDevices();
    const outputs = devices.filter(d => d.kind === 'audiooutput');

    if (outputs.length > 0) {
        speakerSelect.innerHTML = '';
        outputs.forEach(device => {
            const opt = document.createElement('option');
            opt.value = device.deviceId;
            opt.text = device.label || `Sortie ${speakerSelect.length + 1}`;
            speakerSelect.appendChild(opt);
        });
        speakerBox.style.display = 'block';
    }
}

speakerSelect.onchange = async () => {
    if (remoteVideo.setSinkId) {
        try {
            await remoteVideo.setSinkId(speakerSelect.value);
        } catch (err) {
            alert("Erreur de changement de sortie : " + err);
        }
    } else {
        alert("Votre navigateur ne permet pas de choisir la sortie audio.");
    }
};

init();
