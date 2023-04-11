

function onClick() {
    let socket = new WebSocket("ws://localhost:8080/sessions/94d58bd0-3c60-471d-9fdf-a8a8d9864475?access_token=abc123");

    const replayer = new rrweb.Replayer([], {
        liveMode: true,
    });
    replayer.startLive();

    socket.onmessage = function (event) {
        replayer.addEvent(JSON.parse(event.data));
    };

    // socket.onopen = function (e) {
    //     socket.send("asd");
    // };
}