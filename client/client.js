
function onClickButtonClient() {
    let socket = new WebSocket("ws://localhost:8080/sessions/63966b24-a191-4f68-995d-fb76b5d0be7c/client");

    socket.onopen = function (e) {
        const snapshot = $('body').clone();
        body = JSON.stringify(snapshot);
        socket.send(body);
        rrweb.record({
            emit(event) {
                socket.send(JSON.stringify(event));
            },
        });
    };
}

