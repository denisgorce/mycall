const SECRET_ROOM = "salon-unique-radio-123"; 
let localStream;
let remoteAudio = new Audio(); // On crée l'objet audio globalement
const status = document.getElementById('status');
const btnSpeaker = document.getElementById('btn-speaker');
const btnStart = document.getElementById('btn-start');

async function start() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        status.innerText = "🎤 Micro prêt. Recherche du partenaire...";
        
        const peer = new Peer(); 
        peer.on('open', () => {
            const call = peer.call(SECRET_ROOM + '-host', localStream);
            call.on('stream', stream => setupRemoteAudio(stream));

            setTimeout(() => {
                if (status.innerText.indexOf("✅") === -1) becomeHost();
            }, 3000);
        });

        peer.on('error', () => becomeHost());
    } catch (e) {
        status.innerText = "❌ Erreur Micro : " + e.message;
    }
}

function becomeHost() {
    const hostPeer = new Peer(SECRET_ROOM + '-host');
    hostPeer.on('open', () => { status.innerText = "🟢 En attente de l'ami..."; });
    hostPeer.on('call', (call) => {
        call.answer(localStream);
        call.on('stream', stream => setupRemoteAudio(stream));
    });
}

function setupRemoteAudio(stream) {
    remoteAudio.srcObject = stream;
    status.innerText = "👉 CLIQUEZ SUR LE BOUTON VERT";
    btnStart.style.display = "block";

    btnStart.onclick = () => {
        remoteAudio.play();
        status.innerText = "✅ CONNECTÉ !";
        btnStart.style.display = "none";
        checkSpeakerOptions(); // On vérifie si on peut changer de haut-parleur
    };
}

async function checkSpeakerOptions() {
    // Si le navigateur supporte le changement de sortie audio
    if (typeof remoteAudio.setSinkId !== 'undefined') {
        btnSpeaker.style.display = "block";
        let isLoudspeaker = false;

        btnSpeaker.onclick = async () => {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const speakers = devices.filter(d => d.kind === 'audiooutput');
            
            // On bascule entre les périphériques trouvés
            isLoudspeaker = !isLoudspeaker;
            if (speakers.length > 1) {
                // Sur certains Android, l'index 0 est le petit et 1 est le grand
                await remoteAudio.setSinkId(speakers[isLoudspeaker ? 1 : 0].deviceId);
            }
            btnSpeaker.innerText = isLoudspeaker ? "MODE DISCRET (OREILLE) 👂" : "GRAND HAUT-PARLEUR 📢";
        };
    }
}

start();
