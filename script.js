const peer = new Peer(); // Crée un nouvel utilisateur Peer
let localStream;

// 1. Récupérer le micro dès le départ
navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
        localStream = stream;
        document.getElementById('status').innerText = "Micro activé, prêt à appeler.";
    });

// 2. Afficher votre ID à partager
peer.on('open', (id) => {
    document.getElementById('my-id').innerText = id;
});

// 3. Recevoir un appel
peer.on('call', (call) => {
    call.answer(localStream); // Répondre avec notre micro
    handleStream(call);
});

// 4. Passer un appel
document.getElementById('call-btn').addEventListener('click', () => {
    const remoteId = document.getElementById('peer-id').value;
    const call = peer.call(remoteId, localStream);
    handleStream(call);
});

function handleStream(call) {
    call.on('stream', (remoteStream) => {
        // Créer un élément audio invisible pour entendre l'autre
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play();
        document.getElementById('status').innerText = "En communication !";
    });
}
