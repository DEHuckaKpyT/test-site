let currantStatus
let stopFn

function onClickButtonClient() {
    let socket = new WebSocket("ws://localhost:8080/sessions/94d58bd0-3c60-471d-9fdf-a8a8d9864475");

    socket.onopen = function (e) {
        recording(socket, "START")
    };
    socket.onmessage = function (e) {
        console.log(e.data)
        recording(socket, e.data)
    };
}

function recording(socket, command) {
    if (command == "START" && currantStatus != "STARTED") {
        currantStatus = "STARTED"
        stopFn = rrweb.record({
            emit(event) {
                socket.send(JSON.stringify(event));
            },
            // maskTextClass: new RegExp(".*ret")
        });
    } else if (command == "STOP") {
        stopFn()
        currantStatus = "STOPPED"
    }
}

