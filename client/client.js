let currantStatus
let stopFn


function onClickButtonClient() {
    setCookie("user", "Den")
    setCookie("user2", "Den2")
    setCookie("user", "Den1")
    deleteCookie("user")
    alert(document.cookie);


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

// возвращает куки с указанным name,
// или undefined, если ничего не найдено
function getCookie(name) {
    let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

function setCookie(name, value, options = {}) {
    options = {
        path: '/',
        // при необходимости добавьте другие значения по умолчанию
        expires: "Tue, 19 Jan 2038 03:14:07 GMT"
    };

    let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

    for (let optionKey in options) {
        updatedCookie += "; " + optionKey;
        let optionValue = options[optionKey];
        if (optionValue !== true) {
            updatedCookie += "=" + optionValue;
        }
    }

    document.cookie = updatedCookie;
}

function deleteCookie(name) {
    setCookie(name, "", {
        'max-age': 0
    })
}

