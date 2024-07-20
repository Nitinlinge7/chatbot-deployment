document.addEventListener("DOMContentLoaded", function() {
    openChat(); // Open chatbot on page load
    loadChatHistory();
    checkAndFetchGreetingMessage();
});

let readAloudEnabled = false;
let selectedVoice = null;

function checkAndFetchGreetingMessage() {
    const greetingSent = localStorage.getItem("greetingSent");
    if (!greetingSent) {
        fetchGreetingMessage();
    }
}

function fetchGreetingMessage() {
    fetch('http://localhost:5000/greeting')
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data)) {
                data.forEach(response => handleBotResponse(response));
            } else {
                handleBotResponse(data);
            }
            localStorage.setItem("greetingSent", "true");
        })
        .catch(error => console.error('Error fetching greeting:', error));
}

function loadChatHistory() {
    try {
        const chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
        chatHistory.forEach(item => {
            displayMessage(item.message, item.sender, false, item.type);
        });
    } catch (e) {
        console.error('Error loading chat history:', e);
    }
}

function openChat() {
    let chatbotContainer = document.getElementById("chatbot-container");
    chatbotContainer.style.display = "block";
    setTimeout(() => {
        chatbotContainer.classList.add("show");
        chatbotContainer.setAttribute("aria-hidden", "false");
    }, 10);
}

function sendMessage() {
    let userInput = document.getElementById("user-input").value;
    if (userInput.trim() === "") return;

    displayMessage(userInput, "user");
    handleUserInput(userInput);
}

function handleUserInput(userInput) {
    document.getElementById("user-input").value = "";

    displayTypingAnimation();

    fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userInput })
    })
    .then(response => response.json())
    .then(data => {
        hideTypingAnimation();
        if (Array.isArray(data)) {
            data.forEach(response => handleBotResponse(response));
        } else {
            handleBotResponse(data);
        }
    })
    .catch(error => {
        hideTypingAnimation();
        console.error('Error:', error);
        displayMessage("Sorry, something went wrong. Please try again.", "bot");
    });
}

function displayTypingAnimation() {
    let typingElement = document.createElement("div");
    typingElement.classList.add("message", "bot", "typing-indicator");
    typingElement.innerHTML = `
        <div id="typing-window">
            <span class="typing"></span>
            <span class="typing"></span>
            <span class="typing"></span>
        </div>
    `;
    document.getElementById("chatbot-messages").appendChild(typingElement);
    scrollToBottom();
}

function hideTypingAnimation() {
    let typingElement = document.querySelector(".typing-indicator");
    if (typingElement) {
        typingElement.remove();
    }
}

function handleBotResponse(response) {
    if (response.type === "dropdown") {
        displayDropdownMessage(response.message, response.options);
    } else if (response.type === "image") {
        displayMediaMessage(response.message, "image");
    } else if (response.type === "video") {
        displayMediaMessage(response.message, "video");
    } else if (response.type === "youtube") {
        displayYouTubeMessage(response.message);
    } else if (response.type === "buttons") {
        displayButtonResponse(response.message, response.buttons);
    } else {
        displayMessage(response.message, "bot");
    }
}

function displayMessage(message, sender, shouldSpeak = true, type = "text") {
    let messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);

    if (type === "image") {
        let imgElement = document.createElement("img");
        imgElement.src = message;
        imgElement.alt = "Image";
        imgElement.style.maxWidth = "50%";
        messageElement.appendChild(imgElement);
    } else if (type === "video") {
        let videoElement = document.createElement("video");
        videoElement.src = message;
        videoElement.controls = true;
        videoElement.style.maxWidth = "100%";
        messageElement.appendChild(videoElement);
    } else {
        messageElement.innerHTML = message;
    }

    document.getElementById("chatbot-messages").appendChild(messageElement);
    scrollToBottom();
    storeChatHistory();

    if (shouldSpeak && readAloudEnabled && sender === "bot" && type === "text") {
        speakMessage(message);
    }
}

function displayDropdownMessage(message, options) {
    let messageElement = document.createElement("div");
    messageElement.classList.add("message", "bot");

    let dropdownContainer = document.createElement("div");
    dropdownContainer.classList.add("dropdown-container");

    let dropdownMessage = document.createElement("div");
    dropdownMessage.classList.add("dropdown-message");
    dropdownMessage.textContent = message;

    let optionsButton = document.createElement("button");
    optionsButton.classList.add("options-button");
    optionsButton.textContent = "☰";
    optionsButton.onclick = function() {
        toggleOptionsList(dropdownContainer);
    };

    let optionsList = document.createElement("div");
    optionsList.classList.add("options-list");

    options.forEach(option => {
        let optionElement = document.createElement("div");
        optionElement.textContent = option;
        optionElement.onclick = function() {
            selectOption(option);
        };
        optionsList.appendChild(optionElement);
    });

    dropdownContainer.appendChild(dropdownMessage);
    dropdownContainer.appendChild(optionsButton);
    dropdownContainer.appendChild(optionsList);
    messageElement.appendChild(dropdownContainer);
    document.getElementById("chatbot-messages").appendChild(messageElement);
    scrollToBottom();
    storeChatHistory();
}

function displayButtonResponse(message, buttons) {
    let messageElement = document.createElement("div");
    messageElement.classList.add("message", "bot");

    let messageText = document.createElement("div");
    messageText.innerText = message;
    messageElement.appendChild(messageText);

    let buttonContainer = document.createElement("div");
    buttonContainer.classList.add("button-response");

    buttons.forEach(button => {
        let buttonElement = document.createElement("button");
        buttonElement.innerText = button;
        buttonElement.onclick = function() {
            displayMessage(button, "user");
            handleUserInput(button);
        };
        buttonContainer.appendChild(buttonElement);
    });

    messageElement.appendChild(buttonContainer);
    document.getElementById("chatbot-messages").appendChild(messageElement);
    scrollToBottom();
    storeChatHistory();
}

function displayMediaMessage(url, type) {
    displayMessage(url, "bot", false, type);
}

function displayYouTubeMessage(url) {
    let messageElement = document.createElement("div");
    messageElement.classList.add("message", "bot");

    let iframeElement = document.createElement("iframe");
    iframeElement.src = url.replace("watch?v=", "embed/");
    iframeElement.width = "100%";
    iframeElement.height = "315";
    iframeElement.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
    iframeElement.allowFullscreen = true;
    messageElement.appendChild(iframeElement);

    document.getElementById("chatbot-messages").appendChild(messageElement);
    scrollToBottom();
    storeChatHistory(url, "bot", "youtube");

    if (readAloudEnabled) {
        speakMessage(url);
    }
}

function toggleOptionsList(dropdownContainer) {
    let optionsList = dropdownContainer.querySelector(".options-list");
    optionsList.style.display = optionsList.style.display === "flex" ? "none" : "flex";
}

function selectOption(option) {
    displayMessage(option, "user");
    handleUserInput(option);
}

function scrollToBottom() {
    let messagesContainer = document.getElementById("chatbot-messages");
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function storeChatHistory() {
    try {
        const chatHistory = [];
        document.querySelectorAll("#chatbot-messages .message").forEach(messageElement => {
            const message = messageElement.innerHTML;
            const sender = messageElement.classList.contains("user") ? "user" : "bot";
            const type = messageElement.querySelector("img") ? "image" :
                         messageElement.querySelector("video") ? "video" :
                         messageElement.querySelector("iframe") ? "youtube" : "text";
            chatHistory.push({ message, sender, type });
        });
        localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    } catch (e) {
        console.error('Error storing chat history:', e);
    }
}

function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Your browser does not support speech recognition. Please try Google Chrome.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = function() {
        console.log("Voice recognition started. Speak into the microphone.");
        document.getElementById("voice-input-button").classList.add("active");
    };

    recognition.onerror = function(event) {
        console.error("Voice recognition error", event.error);
        document.getElementById("voice-input-button").classList.remove("active");
    };

    recognition.onend = function() {
        console.log("Voice recognition ended.");
        document.getElementById("voice-input-button").classList.remove("active");
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        console.log("Voice input:", transcript);
        document.getElementById("user-input").value = transcript;
        sendMessage();
    };

    recognition.start();
}

function speakMessage(message) {
    if (!('speechSynthesis' in window)) {
        alert("Your browser does not support speech synthesis. Please try Google Chrome.");
        return;
    }

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "en-US";

    // Select female voice
    let voices = window.speechSynthesis.getVoices();
    for (let voice of voices) {
        if (voice.name === 'Google UK English Female' || voice.name === 'Microsoft Zira Desktop - English (United States)') {
            selectedVoice = voice;
            break;
        }
    }
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    speechSynthesis.speak(utterance);
}

function toggleReadAloud() {
    readAloudEnabled = !readAloudEnabled;
    const button = document.getElementById("read-aloud-toggle");
    button.style.backgroundColor = readAloudEnabled ? "#28a745" : "#007bff";
    button.setAttribute("aria-pressed", readAloudEnabled);
}

function toggleSettingsMenu() {
    const settingsMenu = document.getElementById("settings-menu");
    settingsMenu.style.display = settingsMenu.style.display === "block" ? "none" : "block";
}

function resetChat() {
    localStorage.removeItem("chatHistory");
    localStorage.removeItem("greetingSent");
    document.getElementById("chatbot-messages").innerHTML = '';

    fetch('http://localhost:5000/reset', {
        method: 'POST',
    })
    .then(response => {
        if (response.ok) {
            console.log("Chat history reset on server");
            fetchGreetingMessage();
            toggleSettingsMenu();
        } else {
            console.error("Error resetting chat history on server");
        }
    })
    .catch(error => console.error('Error:', error));
}
