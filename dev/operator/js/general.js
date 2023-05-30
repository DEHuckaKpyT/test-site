const host = "127.0.0.1:8080"
const authToken = 'abc123';

let socket

document.addEventListener('DOMContentLoaded', async function () {
    await prepareLibs()
    await addStyles()
    switch (getCookie("chatPosition", "OPEN_CHATS_BUTTON")) {
        case "OPEN_CHATS_BUTTON":
            await loadOpenChatsListButton();
            break;
        case "CHATS_LIST":
            await loadChatsList();
            break;
        case "CHAT_WINDOW":
            await loadChatWindow(getCookie("lastOpenedChatId"));
            break;
    }
})

async function loadOpenChatsListButton() {
    const openChatButton = document.createElement("div")
    openChatButton.id = "chat-open-button"
    openChatButton.innerText = "Чаты с пользователями"

    document.body.appendChild(openChatButton)

    openChatButton.addEventListener("click", async function (event) {
        if (event.button != 0) return // ЛКМ

        document.body.removeChild(openChatButton)
        await loadChatsList()
        setCookie("chatPosition", "CHATS_LIST")
    })
}

async function loadChatsList() {
    const chatsList = document.createElement("div")
    chatsList.id = "chats-list"
    const chatsListHeader = document.createElement("div")
    chatsListHeader.id = "chats-list-header"
    const chatsListBody = document.createElement("div")
    chatsListBody.id = "chats-list-body"
    const closeChatsList = document.createElement("div")
    closeChatsList.id = "close-chats-list"
    closeChatsList.addEventListener("click", async function (event) {
        if (event.button != 0) return // ЛКМ

        document.body.removeChild(chatsList)
        await loadOpenChatsListButton()
        setCookie("chatPosition", "OPEN_CHATS_BUTTON")
    })

    chatsListHeader.appendChild(closeChatsList)
    chatsList.appendChild(chatsListHeader)
    chatsList.appendChild(chatsListBody)
    document.body.appendChild(chatsList)

    await loadLastChatsMessages()
}

async function loadLastChatsMessages() {
    const chatsListBody = document.getElementById("chats-list-body")

    const response = await fetch(`http://${host}/chats/last-messages`, {
        headers: {
            Authentication: authToken
        }
    })
    const messages = await response.json()

    for (const message of messages) {
        const messageContainer = document.createElement("div")
        messageContainer.className = "chats-list-container-message"
        const textMessage = document.createElement("div")
        textMessage.innerText = message.text
        if (message.authorId) {
            textMessage.className = "chats-list-right-message"
        } else {
            textMessage.className = "chats-list-left-message"
        }
        textMessage.addEventListener("click", async function (event) {
            if (event.button != 0) return // ЛКМ

            await loadChatWindow(message.chatId)
            document.body.removeChild(chatsListBody.parentNode)
            setCookie("chatPosition", "CHAT_WINDOW")
            setCookie("lastOpenedChatId", message.chatId)
        })

        messageContainer.appendChild(textMessage)
        chatsListBody.appendChild(messageContainer)
    }
}

async function loadChatWindow(chatId) {
    loadElements(chatId)
    await loadOldMessages(chatId)
    startListenToNewMessages(chatId)
}

function loadElements(chatId) {
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

        const options = document.createElement("div")
        options.id = "send-message-options"
        options.innerText = "Отправить предложение поделиться страницей"
        options.addEventListener("click", async function (event) {
            // const messagesContainer = document.getElementById("chat-rectangle-body")
            // messagesContainer.appendChild(createConnectButtonMessage(chatId))
            // messagesContainer.scrollTo(0, messagesContainer.scrollHeight)
            const message = {
                text: "Просмотреть страницу",
                type: "SHARE_PAGE"
            }
            socket.send(JSON.stringify(message))
        })
        let cursorOnButton = false
        let cursorOnOptions = false

        function showSendOptions() {
            options.addEventListener("mouseover", optionsMouseOver)
            options.addEventListener("mouseout", optionsMouseOut)
            const chatRectangle = document.getElementById("chat-rectangle")
            chatRectangle.appendChild(options)
        }

        async function hideSendOptions() {
            await sleep(1500)
            if (!cursorOnButton & !cursorOnOptions) {
                options.removeEventListener("mouseover", optionsMouseOver)
                options.removeEventListener("mouseout", optionsMouseOut)
                const chatRectangle = document.getElementById("chat-rectangle")
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

        chatRectangleFooter.appendChild(chatRectangleFooterInput)
        chatRectangleFooter.appendChild(chatRectangleFooterSendMessageButton)

        return chatRectangleFooter
    }

    const chatRectangle = document.createElement("div")
    chatRectangle.id = "chat-rectangle"

    const chatRectangleHeader = document.createElement("div")
    chatRectangleHeader.id = "chat-rectangle-header"
    chatRectangleHeader.innerText = "Чат с клиентом"
    const chatRectangleBody = document.createElement("div")
    chatRectangleBody.id = "chat-rectangle-body"

    const chatRectangleHeaderCloseChat = document.createElement("div")
    chatRectangleHeaderCloseChat.id = "close-chat-rectangle"
    chatRectangleHeaderCloseChat.addEventListener("click", async function (event) {
        if (event.button != 0) return // ЛКМ

        document.body.removeChild(chatRectangle)
        await loadChatsList()
        setCookie("chatPosition", "CHATS_LIST")
    })
    chatRectangleHeader.appendChild(chatRectangleHeaderCloseChat)

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

async function loadOldMessages(chatId) {
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
        // case "SHARE_PAGE":
        //     return createConnectButtonMessage(message.chatId)
        case "CONNECT_PAGE":
            return createConnectButtonMessage(message)
        case "CONNECTION_CLOSED":
            return createInfoMessage(message)
        case "ERROR":
            return createErrorMessage(message.text)
        default:
            return document.createElement("div")
    }
}

function createInfoMessage(message) {
    const div = document.createElement("div")
    div.className = "container-message-green"
    if (message.type == "CONNECTION_CLOSED") {
        let notification = document.createElement("u")
        notification.className = "notification-text"
        notification.innerText =
            div.innerHTML = `<b><u class="notification-text">Доступ к просмотру страницы был закрыт\n
        <a href="http://${host}/replayer?sessionId=${message.text}">Посмотреть запись</a></u></b>`
    }

    return div
}

function createConnectButtonMessage(message) {
    const container = document.createElement("div")
    container.className = "container-message"

    const button = document.createElement("button")
    button.className = "active-button"
    button.innerText = "Просмотреть страницу"
    button.addEventListener("click", async function () {
        const socket = new WebSocket(`ws://${host}/sessions/${message.text}?access_token=${authToken}`);
        const replayer = new rrweb.Replayer([], {
            liveMode: true,
        })

        replayer.startLive();

        socket.onopen = function (e) {
            socket.send(JSON.stringify({
                command: "CONNECTED"
            }));
        }

        socket.onmessage = function (event) {
            const data = JSON.parse(event.data)
            if (data.command == "TRANSPORT") {
                replayer.addEvent(data.content);
            }
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

function startListenToNewMessages(chatId) {
    const messagesContainer = document.getElementById("chat-rectangle-body")
    socket = new WebSocket(`ws://${host}/chats/${chatId}?access_token=${authToken}`)

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
    font-family: "Times New Roman", Times, serif;
    font-size: 16px;
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

#chats-list-open-button {
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

#chats-list-open-button:hover {
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

#close-chats-list {
    position: absolute;
    background-color: rgb(255, 72, 72);
    right: -2px;
    top: -2px;
    width: 25px;
    height: 25px;
    border-radius: 0px 10px 0px 10px;
}

#close-chats-list:hover {
    background-color: red;
}

#chats-list {
    position: fixed;
    z-index: 9998 !important;
    right: 10px;
    bottom: 10px;
    top: 10px;
    background-color: aliceblue;
    width: var(--chat-rectangle-width);
    border: 2px solid rgb(174, 174, 255);
    border-radius: 10px 10px 0px 0px;
}

#chats-list-header {
    position: absolute;
    width: var(--chat-rectangle-width);
    height: 30px;
    background-color: rgb(189, 224, 255);
    font-size: 24px;
    font-weight: bold;
    color: rgb(19, 51, 122);
    text-align: center;
    border-radius: 10px 10px 0px 0px;
}

#chats-list-body {
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: start;
    overflow-y: scroll;
    overflow-x: hidden;
    top: 30px;
    bottom: 0px;
    width: 100%;
    /* height: 100%; */
}

.chats-list-container-message {
    position: relative;
    margin: 1px;
    justify-content: center;
    text-align: center;
    align-items: center;
    background-color: rgb(210, 233, 255);
    border: 1px solid rgb(137, 198, 255);
}

.chats-list-container-message:hover {
    cursor: pointer;
    background-color: rgb(78, 170, 255);
    border-color: rgb(0, 65, 126);
}

.chats-list-left-message {
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

.chats-list-right-message {
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

#chat-rectangle {
    position: fixed;
    z-index: 9998 !important;
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

.container-message-green {
    position: relative;
    margin: 3px;
    justify-content: center;
    text-align: center;
    align-items: center;
    background-color: rgb(197, 253, 197);
    border: 0px;
}

.container-message-red {
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

.replayer-wrapper{
    position: absolute;
    top: -4px;
    left: -4px;
    margin: 0px;
    padding: 0px;
    border-width: 0px;
}

/* width */
#chat-rectangle *::-webkit-scrollbar {
    width: 10px;
}

/* Track */
#chat-rectangle *::-webkit-scrollbar-track {
    background: #d1d5ff;
}

/* Handle */
#chat-rectangle *::-webkit-scrollbar-thumb {
    background: rgb(142, 167, 250);
}

/* Handle on hover */
#chat-rectangle *::-webkit-scrollbar-thumb:hover {
    background: rgb(82, 113, 255);
}

/* width */
#chats-list *::-webkit-scrollbar {
    width: 10px;
}

/* Track */
#chats-list *::-webkit-scrollbar-track {
    background: #d1d5ff;
}

/* Handle */
#chats-list *::-webkit-scrollbar-thumb {
    background: rgb(142, 167, 250);
}

/* Handle on hover */
#chats-list *::-webkit-scrollbar-thumb:hover {
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

function syncRequest(method, uri) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, `http://${host}${uri}`, false);
    xhr.send();

    return JSON.parse(xhr.response)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}