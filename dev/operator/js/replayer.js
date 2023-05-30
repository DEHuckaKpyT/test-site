prepareLibs()
const host = "127.0.0.1:8080"
const authToken = 'abc123';

document.addEventListener('DOMContentLoaded', async function () {
    await loadReplayer()
})

function prepareLibs() {
    const rrwebStyle = document.createElement("link")
    rrwebStyle.rel = "stylesheet"
    rrwebStyle.href = "https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/style.css"

    const rrweb = document.createElement("script")
    rrweb.src = "https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/index.js"

    document.head.appendChild(rrwebStyle)
    document.head.appendChild(rrweb)
}

async function loadReplayer() {

    const url = new URL(window.location.href)
    const sessionId = url.searchParams.get('sessionId')

    const response = await fetch(`http://${host}/session-events/contents/list?sessionId=${sessionId}`, {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            Authentication: authToken
            // 'Content-Type': 'application/json'
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *client
    });
    const strEvents = await response.json();
    const events = strEvents.map(str => JSON.parse(str))
        .filter(event => event.command == 'TRANSPORT')
        .map(event => event.content)

    new rrwebPlayer({
        // target: document.body, // customizable root element
        props: {
            events
        },
    });
}