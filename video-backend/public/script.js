const socket = io("/");
const videoGrid = document.getElementById('video-grid');

const peer = new Peer(undefined, {
    host: "/",
    port: "3001"
});

const video = document.createElement('video');
const peers = {};
video.muted = true;

socket.on("user-disconnected", userID => {
    if (peers[userID]) {
        peers[userID].close();
        return;
    }
})

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    addVideoStream(video, stream, true);
    peer.on("call", call => {
        call.answer(stream);
        const video = document.createElement("video");
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream, false);
        })
    })
    socket.on("user-connected", userID => {
        connectToNewUser(userID, stream);
    });
})

peer.on('open', tempID => {
    socket.emit("join-room", ROOM_ID, tempID);
});

function addVideoStream(video, stream, isLocal = false) {
    video.srcObject = stream;
    if (isLocal) {
        video.classList.add("local-video");
    }
    video.addEventListener("loadedmetadata", () => {
        video.play();
    });
    videoGrid.append(video);
}

function connectToNewUser(userID, stream) {
    const call = peer.call(userID, stream);
    const video = document.createElement('video');
    call.on("stream", userVideoStream => {
        addVideoStream(video, userVideoStream, false);
    });
    call.on("close", () => {
        video.remove();
    });
    peers[userID] = call;
}