const host = "127.0.0.1:8080"
const chatId = "94d58bd0-3c60-471d-9fdf-a8a8d9864475"
const authToken = 'abc123';

document.cookie = `Authorization=Bearer ${authToken}; path=/`;
const chatRectangle = document.createElement("div")
// const options = document.createElement("div")

const socket = new WebSocket(`ws://localhost:8080/chats/${chatId}?access_token=${authToken}`);

document.addEventListener('DOMContentLoaded', async function () {
    await prepareLibs()
    await addStyles()
    await loadChatWindow()
})

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
        chatRectangleFooterSendMessageButton.addEventListener("mouseover", function (event) {
            cursorOnButton = true
            showSendOptions()
        })
        chatRectangleFooterSendMessageButton.addEventListener("mouseout", function (event) {
            cursorOnButton = false
            hideSendOptions()
        })

        chatRectangleFooter.appendChild(chatRectangleFooterInput)
        chatRectangleFooter.appendChild(chatRectangleFooterSendMessageButton)

        return chatRectangleFooter
    }

    // const chatRectangle = document.createElement("div")
    chatRectangle.id = "chat-rectangle"

    const chatRectangleHeader = document.createElement("div")
    chatRectangleHeader.id = "chat-rectangle-header"
    chatRectangleHeader.innerText = "Чат с клиентом"
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
    socket.send(JSON.stringify(message))
    messagesContainer.appendChild(createRightTextMessage(message.text))
    messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
}

async function loadOldMessages() {
    const messagesContainer = document.getElementById("chat-rectangle-body")

    const response = await fetch(`http://${host}/chats/${chatId}/messages/list`, {
        headers: {
            Authentication: authToken
        }
    })
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
            return createInfoMessage(message)
        case "CONNECT_PAGE":
            return createConnectButtonMessage(message)
        case "ERROR":
            return createErrorMessage(message.text)
        default:
            return document.createElement("div")
    }
}

function createInfoMessage(message) {
    const div = document.createElement("div")
    div.className = "container-message-green"
    div.innerHTML = `<b><u class="notification-text">Предложение поделиться страницей отправлено</u></b>`

    return div
}

function createConnectButtonMessage() {
    const container = document.createElement("div")
    container.className = "container-message"

    const button = document.createElement("button")
    button.className = "active-button"
    button.innerText = "Просмотреть страницу"
    button.addEventListener("click", async function () {
        const socket = new WebSocket(`ws://localhost:8080/sessions/${chatId}/operator?access_token=${authToken}`);
        const replayer = new rrweb.Replayer([], {
            liveMode: true,
        })
        socket.onopen = function (e) {

            replayer.startLive();
        }

        socket.onmessage = function (event) {
            replayer.addEvent(JSON.parse(event.data));
        }
    })

    container.appendChild(button)

    return container
}

function createTextMessage(message) {
    if (message.authorId) {
        return createRightTextMessage(message.text)
    } else {
        return createLeftTextMessage(message.text)
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

function startListenToNewMessages() {
    const messagesContainer = document.getElementById("chat-rectangle-body")

    socket.onmessage = function (event) {
        const newMessage = JSON.parse(event.data)
        messagesContainer.appendChild(createMessage(newMessage))
        messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
    }

    socket.onclose = function (event) {
        messagesContainer.appendChild(createErrorMessage("Отключён от сервера"))
        messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
    }
}

const options = document.createElement("div")
options.id = "send-message-options"
options.innerText = "Отправить предложение поделиться страницей"
options.addEventListener("click", async function (event) {
    const messagesContainer = document.getElementById("chat-rectangle-body")
    messagesContainer.appendChild(createConnectButtonMessage())
    messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
})
let cursorOnButton = false
let cursorOnOptions = false

function showSendOptions() {
    options.addEventListener("mouseover", optionsMouseOver)
    options.addEventListener("mouseout", optionsMouseOut)
    chatRectangle.appendChild(options)
}

async function hideSendOptions() {
    await sleep(1500)
    if (!cursorOnButton & !cursorOnOptions) {
        options.removeEventListener("mouseover", optionsMouseOver)
        options.removeEventListener("mouseout", optionsMouseOut)
        chatRectangle.removeChild(options)
    }
}

function optionsMouseOver(event) {
    cursorOnOptions = true
}

function optionsMouseOut(event) {
    cursorOnOptions = false
    hideSendOptions()
}








function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function prepareLibs() {
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
    background-color: gray;
    font-family: "Times New Roman", Times, serif;
    font-size: 16px;
}

#chat-rectangle {
    position: absolute;
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

.notification-text {
    width: 100%;
    color: #0d2569;
    font-size: 16px;
    font-style: italic;
}

#send-message-options {
    position: absolute;
    height: 38px;
    width: 180px;
    bottom: 30px;
    right: -1px;
    color: #001c69;
    background-color: rgb(226, 233, 240);
    text-align: center;
    align-items: center;
    border: 3px solid rgb(17, 70, 150);
    border-radius: 15px 15px 0px 15px;
    margin: 5px;
    cursor: default;
}

#send-message-options:hover {
    color: rgb(226, 233, 240);
    background-color: #001c69;
    border: 3px solid rgb(226, 233, 240);
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