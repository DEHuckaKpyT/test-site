

function onClick() {
    let socket = new WebSocket("ws://localhost:8080/sessions/63966b24-a191-4f68-995d-fb76b5d0be7c/operator");

    const replayer = new rrweb.Replayer([], {
        liveMode: true,
    });
    replayer.startLive();

    socket.onmessage = function (event) {
        replayer.addEvent(JSON.parse(event.data));
    };
}