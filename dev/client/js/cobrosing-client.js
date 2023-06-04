prepareLibs()
const host = "127.0.0.1:8080"
let chatId
let sessionId

let chatSocket

let currantRecordingStatus
let recordingStartedByUser
let stopRecordingFunction

const settings = syncRequest('GET', '/sessions/mask-settings')

document.addEventListener('DOMContentLoaded', async function () {
    loadParams()
    await addStyles()

    if (getCookie("chatOpened", "false") == "true") {
        await loadChatWindow()
    } else {
        await loadOpenChatButton()
    }
})

function loadParams() {
    chatId = getCookieOrCreate("chatId", () => { return syncRequest('POST', '/chats/create').value })
    sessionId = getCookie("sessionId")

    chatSocket = new WebSocket(`ws://${host}/chats/${chatId}`);
    currantRecordingStatus = "STOPPED"
    recordingStartedByUser = getCookie("recordingStartedByUser", "false")

    if (recordingStartedByUser == "true") {
        startRecording()
    }
}

async function loadAcceptWindow() {
    const confirmForm = document.createElement("div")
    confirmForm.id = "confirm-form"

    const closeConfirmForm = document.createElement("div")
    closeConfirmForm.id = "close-confirm-form"
    confirmForm.appendChild(closeConfirmForm)

    const confirmFormText = document.createElement("div")
    confirmFormText.id = "confirm-form-text"
    confirmFormText.innerText = "При включении функцияи демонстрации Вашей страницы оператор сможет получить доступ к просмотру копии вашей страницы, в которой:\n" +
        " - оператор видит все объекты на странице;\n" + 
        " - оператор видит движение курсора мыши, если он находится на странице;\n" + 
        " - оператор НЕ видит личные данные (например, ФИО, номер, почта);\n" +
        " - оператор НЕ может воздействовать на Вашу страницу;\n" +
        " - оператор видит ТОЛЬКО страницу текущего сайта."
    confirmForm.appendChild(confirmFormText)

    const checkbox1input = document.createElement("input")
    const checkbox2input = document.createElement("input")
    const acceptButton = document.createElement("button")

    const checkbox1 = document.createElement("div")
    checkbox1input.id = "confirm-form-checked-read"
    checkbox1input.type = "checkbox"
    checkbox1input.addEventListener("change", function (event) {
        if (checkbox1input.checked && checkbox2input.checked) {
            acceptButton.disabled = false
        } else {
            acceptButton.disabled = true
        }
    })
    const checkbox1label = document.createElement("label")
    checkbox1label.id = "confirm-form-checked-label-read"
    checkbox1label.htmlFor = "confirm-form-checked-read"
    checkbox1label.innerText = "Я прочитал условия"
    checkbox1.appendChild(checkbox1input)
    checkbox1.appendChild(checkbox1label)
    confirmForm.appendChild(checkbox1)

    const checkbox2 = document.createElement("div")
    checkbox2input.id = "confirm-form-checked-accept"
    checkbox2input.type = "checkbox"
    checkbox2input.addEventListener("change", function (event) {
        if (checkbox1input.checked && checkbox2input.checked) {
            acceptButton.disabled = false
        } else {
            acceptButton.disabled = true
        }
    })
    const checkbox2label = document.createElement("label")
    checkbox2label.id = "confirm-form-checked-label-accept"
    checkbox2label.htmlFor = "confirm-form-checked-accept"
    checkbox2label.innerText = "Я согласен с условиями"
    checkbox2.appendChild(checkbox2input)
    checkbox2.appendChild(checkbox2label)
    confirmForm.appendChild(checkbox2)

    const cancelButton = document.createElement("button")
    cancelButton.id = "confirm-form-cancel-button"
    cancelButton.innerText = "Продолжить без демонстрации"
    cancelButton.addEventListener("click", function (event) {
        if (event.button != 0) return // ЛКМ

        document.body.removeChild(confirmForm)
    })

    confirmForm.appendChild(cancelButton)

    acceptButton.id = "confirm-form-accept-button"
    acceptButton.disabled = true
    acceptButton.innerText = "Предоставить доступ к просмотру страницы"
    acceptButton.addEventListener("click", function (event) {
        if (event.button != 0) return // ЛКМ

        syncRequest('POST', `/chats/${chatId}/accept-sharing`)
        document.body.removeChild(confirmForm)

        startRecording(true, {})
    })
    confirmForm.appendChild(acceptButton)

    document.body.appendChild(confirmForm)
}

async function loadOpenChatButton() {
    const openChatButton = document.createElement("div")
    openChatButton.id = "chat-open-button"
    openChatButton.innerText = "Помощь оператора"

    document.body.appendChild(openChatButton)

    openChatButton.addEventListener("click", function (event) {
        if (event.button != 0) return // ЛКМ

        document.body.removeChild(openChatButton)
        loadChatWindow()
        setCookie("chatOpened", "true")
    })
}

async function loadChatWindow() {
    loadElements()
    await loadOldMessages()
    startListenToNewMessages()
}

function loadElements() {
    function createFooter() {
        const chatRectangleFooter = document.createElement("div")
        chatRectangleFooter.id = "chat-rectangle-footer"
        const chatRectangleFooterInput = document.createElement("textarea")
        chatRectangleFooterInput.id = "footer-input-message"
        chatRectangleFooterInput.addEventListener("keypress", function (event) {
            if (event.key != "Enter") return
            event.preventDefault();

            sendMessage(this.value)
            this.value = ""
        })
        const chatRectangleFooterSendMessageButton = document.createElement("button")
        chatRectangleFooterSendMessageButton.id = "footer-send-message"
        chatRectangleFooterSendMessageButton.innerText = "✉"
        chatRectangleFooterSendMessageButton.addEventListener("click", function (event) {
            if (event.button != 0) return // ЛКМ

            sendMessage(chatRectangleFooterInput.value)
            chatRectangleFooterInput.value = ""
        })

        chatRectangleFooter.appendChild(chatRectangleFooterInput)
        chatRectangleFooter.appendChild(chatRectangleFooterSendMessageButton)

        return chatRectangleFooter
    }

    const chatRectangle = document.createElement("div")
    chatRectangle.id = "chat-rectangle"
    chatRectangle.className = "rrweb-block"

    const chatRectangleHeader = document.createElement("div")
    chatRectangleHeader.id = "chat-rectangle-header"
    chatRectangleHeader.innerText = "Чат с оператором"

    const chatRectangleHeaderCloseChat = document.createElement("div")
    chatRectangleHeaderCloseChat.id = "close-chat-rectangle"
    chatRectangleHeaderCloseChat.addEventListener("click", function (event) {
        if (event.button != 0) return // ЛКМ

        document.body.removeChild(chatRectangle)
        loadOpenChatButton()
        setCookie("chatOpened", "false")
    })
    chatRectangleHeader.appendChild(chatRectangleHeaderCloseChat)

    const chatRectangleBody = document.createElement("div")
    chatRectangleBody.id = "chat-rectangle-body"
    const chatRectangleFooter = createFooter()

    chatRectangle.appendChild(chatRectangleHeader)
    chatRectangle.appendChild(chatRectangleBody)
    chatRectangle.appendChild(chatRectangleFooter)

    document.body.appendChild(chatRectangle)
}

async function sendMessage(value) {
    const messagesContainer = document.getElementById("chat-rectangle-body")
    const message = {
        text: value
    }
    chatSocket.send(JSON.stringify(message))
    messagesContainer.appendChild(createRightTextMessage(message.text))
    messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
}

async function loadOldMessages() {
    const messagesContainer = document.getElementById("chat-rectangle-body")

    const response = await fetch(`http://${host}/chats/${chatId}/messages/list`)
    const messages = await response.json()

    for (const message of messages) {
        messagesContainer.appendChild(createMessage(message))
    }

    messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
}

function createMessage(message) {
    switch (message.type) {
        case "TEXT":
            return createTextMessage(message)
        case "SHARE_PAGE":
            return createShareButtonMessage(message)
        case "CLOSE_CONNECT":
            return createCloseButtonMessage(message)
        case "CONNECTION_CLOSED":
            return createInfoMessage(message)
        case "ERROR":
            return createErrorMessage(message.text)
        default:
            return document.createElement("div")
    }
}

function createShareButtonMessage(message) {
    const container = document.createElement("div")
    container.className = "container-message"

    const button = document.createElement("button")
    button.className = "active-button"
    button.innerText = "Поделиться страницей"
    button.addEventListener("click", async function (event) {
        const accepted = syncRequest('GET', `/chats/${chatId}/is-sharing-accepted`).value

        if (accepted) {
            await startRecording(true, message)
        } else {
            await loadAcceptWindow()
        }
    })

    container.appendChild(button)

    return container
}

async function startRecording(createNewSession = false, message = undefined) {
    if (currantRecordingStatus == "STARTED") return;

    if (createNewSession) {
        sessionId = syncRequest('POST', `/sessions/create`, { chatId: chatId }).id
        setCookie("sessionId", sessionId)
    }

    const socket = new WebSocket(`ws://${host}/sessions/${sessionId}`);

    function recording(socket, command) {
        if (recordingStartedByUser == "true" && command == "CONNECTED" && currantRecordingStatus != "STARTED") {
            currantRecordingStatus = "STARTED"

            stopRecordingFunction = rrweb.record({
                emit(event) {
                    socket.send(JSON.stringify({
                        command: "TRANSPORT",
                        content: event
                    }));
                },
                maskTextClass: new RegExp(settings.maskTextClass),
                maskAllInputs: settings.maskAllInputs,
                blockClass: new RegExp(settings.blockClass)
            });
        } else if (command == "DISCONNECTED") {
            stopRecordingFunction()
            currantRecordingStatus = "STOPPED"
        }
    }

    recordingStartedByUser = "true"
    setCookie("recordingStartedByUser", "true")

    if (createNewSession && message) {
        createTempCloseButtonMessage(message)
        chatSocket.send(JSON.stringify({
            text: sessionId,
            type: "CONNECT_PAGE"
        }))
    }

    socket.onopen = function (e) {
        recording(socket, "CONNECTED")
    };
    socket.onmessage = function (e) {
        const data = JSON.parse(e.data)
        console.log(data)
        recording(socket, data.command)
    };
}

function createTempCloseButtonMessage(message) {
    const messagesContainer = document.getElementById("chat-rectangle-body")
    const container = document.createElement("div")
    container.className = "container-message"

    const button = document.createElement("button")
    button.className = "active-negative-button"
    button.innerText = "Прекратить доступ к странице"
    button.addEventListener("click", async function () {
        if (recordingStartedByUser == "true") {
            recordingStartedByUser = "false"
            setCookie("recordingStartedByUser", "false")
            currantRecordingStatus = "STOPPED"
            stopRecordingFunction()
            const message = {
                text: sessionId,
                type: "CONNECTION_CLOSED"
            }
            chatSocket.send(JSON.stringify(message))
            messagesContainer.appendChild(createInfoMessage(message))
            messagesContainer.scrollTo(0, messagesContainer.scrollHeight)

            syncRequest('POST', `/sessions/${sessionId}/finish`)
        }
    })

    const closeMessage = {
        text: "Прекратить доступ к странице",
        type: "CLOSE_CONNECT"
    }
    chatSocket.send(JSON.stringify(closeMessage))
    container.appendChild(button)

    messagesContainer.appendChild(container)
    messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
}

function createCloseButtonMessage(message) {
    const container = document.createElement("div")
    container.className = "container-message"

    const button = document.createElement("button")
    button.className = "active-negative-button"
    button.innerText = "Прекратить доступ к странице"
    button.addEventListener("click", async function () {
        if (recordingStartedByUser == "true") {
            recordingStartedByUser = "false"
            setCookie("recordingStartedByUser", "false")
            currantRecordingStatus = "STOPPED"
            stopRecordingFunction()
            const message = {
                text: sessionId,
                type: "CONNECTION_CLOSED"
            }
            chatSocket.send(JSON.stringify(message))

            const messagesContainer = document.getElementById("chat-rectangle-body")
            messagesContainer.appendChild(createInfoMessage(message))
            messagesContainer.scrollTo(0, messagesContainer.scrollHeight)

            syncRequest('POST', `/sessions/${sessionId}/finish`)
        }
    })

    container.appendChild(button)

    return container
}

function createTextMessage(message) {
    if (message.authorId) {
        return createLeftTextMessage(message.text)
    } else {
        return createRightTextMessage(message.text)
    }
}

function createRightTextMessage(text) {
    const div = document.createElement("div")
    div.className = "right-message"
    div.innerText = text

    return div
}

function createLeftTextMessage(text) {
    const div = document.createElement("div")
    div.className = "left-message"
    div.innerText = text

    return div
}

function createErrorMessage(error) {
    const div = document.createElement("div")
    div.className = "container-message-red"
    div.innerHTML = `<b><u class="notification-text">${error}</u></b>`

    return div
}

function createInfoMessage(message) {
    const div = document.createElement("div")
    div.className = "container-message-green"
    // if (message.type = "CLOSE_CONNECT") {
    //     div.innerHTML = `<b><u class="notification-text">Доступ к просмотру страницы был закрыт</u></b>`
    // }
    if (message.type = "CONNECTION_CLOSED") {
        div.innerHTML = `<b><u class="notification-text">Доступ к просмотру страницы был закрыт</u></b>`
    }

    return div
}

function startListenToNewMessages() {
    const messagesContainer = document.getElementById("chat-rectangle-body")

    chatSocket.onmessage = function (event) {
        const newMessage = JSON.parse(event.data)
        messagesContainer.appendChild(createMessage(newMessage));
        messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
    }

    chatSocket.onclose = function (event) {
        messagesContainer.appendChild(createErrorMessage("Отключён от сервера"));
        messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
    }
}









function prepareLibs() {
    const rrwebStyle = document.createElement("link")
    rrwebStyle.rel = "stylesheet"
    rrwebStyle.href = "https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.css"

    const rrweb = document.createElement("script")
    rrweb.src = "https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"

    document.head.appendChild(rrwebStyle)
    document.head.appendChild(rrweb)
}

async function addStyles() {
    const styleSheet = document.createElement("style")
    styleSheet.innerText = styles
    document.head.appendChild(styleSheet)
}

const styles = `
:root {
    --chat-rectangle-width: 350px;
    --chat-message-width: 275px;
}


body {
    font-family: "Times New Roman", Times, serif;
    font-size: 16px;
}

#confirm-form {
    position: fixed;
    width: 500px;
    height: 300px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: aliceblue;
    border: 2px solid rgb(174, 174, 255);
    border-radius: 10px 10px 10px 10px;
    font-family: "Times New Roman", Times, serif;
    /* line-height: 16px; */
    font-size: 16px;
}

#close-confirm-form {
    position: absolute;
    background-color: rgb(255, 72, 72);
    right: -2px;
    top: -2px;
    width: 25px;
    height: 25px;
    border-radius: 0px 10px 0px 10px;
}

#close-confirm-form:hover {
    background-color: red;
}

#confirm-form-text {
    position: absolute;
    top: 28px;
    left: 17px;
    right: 17px;
    bottom: 100px;
    padding: 5px;
    border: 2px solid rgb(174, 174, 255);
    border-radius: 10px 5px 5px 10px;
    background-color: rgb(255, 255, 255);
    word-break: break-word;
    overflow-y: scroll;
    overflow-x: hidden;
}

#confirm-form-checked-read {
    position: absolute;
    bottom: 70px;
    left: 30px;
}

#confirm-form-checked-label-read {
    position: absolute;
    bottom: 70px;
    left: 60px;
}

#confirm-form-checked-accept {
    position: absolute;
    bottom: 50px;
    left: 30px;
}

#confirm-form-checked-label-accept {
    position: absolute;
    bottom: 50px;
    left: 60px;
}

#confirm-form-accept-button{
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 25px;
    width: 300px;
    border-radius: 10px;
    color: white;
    background-color: rgb(49, 110, 241);
}

#confirm-form-accept-button:hover:enabled{
    background-color: rgb(17, 84, 230);
}

#confirm-form-accept-button:active:enabled {
    color: #1d59fc;
    background-color: rgb(180, 200, 245);
}

#confirm-form-accept-button:disabled {
    color: #1d59fc;
    color: black;
    background-color: grey;
}

#confirm-form-cancel-button{
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: 0px;
    border-radius: 10px;
    color: white;
    background-color: rgb(255, 72, 72);
}

#confirm-form-cancel-button:hover{
    background-color: red;
}

#confirm-form-cancel-button:active {
    color: #fc1d1d;
    background-color: rgb(245, 180, 180);
}

#chat-open-button {
    position: fixed;
    right: 0;
    bottom: 30%;
    background-color: rgb(161, 195, 245);
    transform: translateX(86px) rotate(-90deg);
    width: 200px;
    height: 24px;
    font-family: "Times New Roman", Times, serif;
    font-size: 20px;
    text-align: center;
    border-radius: 10px 10px 0px 0px;
}

#chat-open-button:hover {
    cursor: pointer;
}

#close-chat-rectangle {
    position: absolute;
    background-color: rgb(255, 72, 72);
    right: -2px;
    top: -2px;
    width: 25px;
    height: 25px;
    border-radius: 0px 10px 0px 10px;
}

#close-chat-rectangle:hover {
    background-color: red;
}

#chat-rectangle {
    position: fixed;
    z-index: 9998!important;
    right: 10px;
    bottom: 10px;
    background-color: aliceblue;
    width: var(--chat-rectangle-width);
    height: 400px;
    border: 2px solid rgb(174, 174, 255);
    border-radius: 10px 10px 0px 0px;
}

#chat-rectangle-header {
    width: var(--chat-rectangle-width);
    height: 30px;
    background-color: rgb(189, 224, 255);
    font-size: 24px;
    font-weight: bold;
    color: rgb(19, 51, 122);
    text-align: center;
    border-radius: 10px 10px 0px 0px;
}

#chat-rectangle-body {
    display: flex;
    flex-direction: column;
    justify-content: start;
    overflow-y: scroll;
    overflow-x: hidden;
    height: 337px;
    width: 100%;
}

#chat-rectangle-footer {
    position: relative;
    width: var(--chat-rectangle-width);
}

#footer-input-message {
    width: 300px;
    height: 28px;
    font-size: 16px;
    word-break: break-word;
    resize: none;
    line-height: 10px;
}

#footer-send-message {
    position: absolute;
    height: 34px;
    width: 44px;
    /* font-size: 20px; */
    text-align: center;
}

.left-message {
    position: relative;
    text-align: left;
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    border: 1px solid rgb(17, 70, 150);
    margin: 2px 0px 2px;
    padding: 0px 7px 0px;
    background-color: rgb(161, 195, 245);
    width: var(--chat-message-width);
    left: 2px;
    border-radius: 0px 15px 15px 15px;
    word-break: break-all;
}

.right-message {
    position: relative;
    text-align: left;
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    border: 1px solid rgb(17, 70, 150);
    margin: 2px 0px 2px;
    padding: 0px 7px 0px;
    background-color: rgb(103, 157, 238);
    width: var(--chat-message-width);
    left: 47px;
    border-radius: 15px 0px 15px 15px;
    word-break: break-all;
}

.container-message {
    position: relative;
    margin: 3px;
    justify-content: center;
    text-align: center;
    align-items: center;
    background-color: rgb(226, 233, 240);
    border: 0px;
}

.container-message-green{
    position: relative;
    margin: 3px;
    justify-content: center;
    text-align: center;
    align-items: center;
    background-color: rgb(197, 253, 197);
    border: 0px;
}

.container-message-red{
    position: relative;
    margin: 3px;
    justify-content: center;
    text-align: center;
    align-items: center;
    background-color: rgb(253, 197, 197);
    border: 0px;
}

.active-button {
    position: relative;
    margin: 0;
    top: 50%;
    /* left: 50%; */
    -ms-transform: translate(0%, -50%);
    transform: translate(0%, -50%);

    color: #ffffff;
    background-color: rgb(49, 110, 241);
    border-radius: 10px;
}

.active-button:hover {
    color: #ffffff;
    background-color: rgb(17, 84, 230);
}

.active-button:active {
    color: #1d59fc;
    background-color: rgb(180, 200, 245);
}

.active-negative-button {
    position: relative;
    margin: 0;
    top: 50%;
    /* left: 50%; */
    -ms-transform: translate(0%, -50%);
    transform: translate(0%, -50%);

    color: #ffffff;
    background-color: rgb(255, 72, 72);
    border-radius: 10px;
}

.active-negative-button:hover {
    color: #ffffff;
    background-color: rgb(230, 17, 17);
}

.active-negative-button:active {
    color: #fc1d1d;
    background-color: rgb(245, 180, 180);
}

.notification-text {
    width: 100%;
    color: #0d2569;
    font-size: 16px;
    font-style: italic;
}


/* width */
::-webkit-scrollbar {
    width: 10px;
}

/* Track */
::-webkit-scrollbar-track {
    background: #d1d5ff;
}

/* Handle */
::-webkit-scrollbar-thumb {
    background: rgb(142, 167, 250);
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
    background: rgb(82, 113, 255);
}
`

// возвращает куки с указанным name,
// или undefined, если ничего не найдено
function getCookie(name, defaultValue = undefined) {
    let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));

    if (matches) {
        return decodeURIComponent(matches[1])
    }

    return setCookie(name, defaultValue);
}
// возвращает куки с указанным name,
// или undefined, если ничего не найдено
function getCookieOrCreate(name, lambda) {
    let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));

    if (matches) {
        return decodeURIComponent(matches[1])
    }

    newValue = lambda()
    return setCookie(name, newValue);
}

function setCookie(name, value, options = {}) {
    options = {
        // значения по умолчанию
        path: '/',
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

    return value
}

function deleteCookie(name) {
    setCookie(name, "", {
        'max-age': 0
    })
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function syncRequest(method, uri, body = null) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, `http://${host}${uri}`, false);

    if (body != null) {
        xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8')
        body = JSON.stringify(body)
    }

    xhr.send(body);

    if (xhr.response != "") {
        return JSON.parse(xhr.response)
    }
}
