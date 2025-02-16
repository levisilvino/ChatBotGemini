const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatHistory = document.getElementById('chat-history');
const clearHistoryButton = document.getElementById('clear-history');
const themeToggleButton = document.getElementById('theme-toggle');

// Carrega o tema salvo
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.setAttribute('data-theme', savedTheme);
const darkTheme = document.getElementById('dark-code-theme');
if (darkTheme) {
    darkTheme.disabled = savedTheme !== 'dark';
}

// Auto-resize do textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Função para copiar texto
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Feedback visual temporário
        const notification = document.createElement('div');
        notification.textContent = 'Copiado!';
        notification.className = 'system-message';
        chatHistory.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    });
}

// Função para criar botão de copiar
function createCopyButton(text) {
    const button = document.createElement('button');
    button.className = 'copy-button';
    button.title = 'Copiar mensagem';
    button.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/></svg>';
    button.onclick = () => copyText(text);
    return button;
}

// Função para criar elemento de mensagem
function createMessageElement(message, isUser = true) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';
    
    if (isUser) {
        contentElement.textContent = message;
    } else {
        contentElement.className += ' markdown-content';
        contentElement.innerHTML = message;
    }
    
    messageElement.appendChild(contentElement);
    messageElement.appendChild(createCopyButton(message));
    
    return messageElement;
}

// Carrega o histórico ao iniciar
async function loadHistory() {
    try {
        const history = await window.electronAPI.getHistory();
        history.forEach(message => {
            const messageElement = createMessageElement(message.content, message.role === 'user');
            chatHistory.appendChild(messageElement);
        });
        chatHistory.scrollTop = chatHistory.scrollHeight;
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
    }
}

loadHistory();

// Função para enviar mensagem
async function sendMessage() {
    const userMessage = messageInput.value.trim();
    if (!userMessage) return;
    
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Adiciona a mensagem do usuário
    const userMessageElement = createMessageElement(userMessage, true);
    chatHistory.appendChild(userMessageElement);
    
    // Adiciona indicador de digitação
    const typingElement = document.createElement('div');
    typingElement.className = 'message ai-message typing';
    typingElement.textContent = 'IA está digitando';
    chatHistory.appendChild(typingElement);
    
    // Rola para a última mensagem
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    try {
        const response = await window.electronAPI.sendMessage(userMessage);
        
        // Remove o indicador de digitação
        typingElement.remove();
        
        // Adiciona a resposta da IA
        const aiResponseElement = createMessageElement(response, false);
        chatHistory.appendChild(aiResponseElement);
    } catch (error) {
        typingElement.remove();
        const errorElement = document.createElement('div');
        errorElement.className = 'message error-message';
        errorElement.textContent = 'Erro ao processar mensagem: ' + error.message;
        chatHistory.appendChild(errorElement);
    }
    
    // Rola para a última mensagem
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Event Listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

clearHistoryButton.addEventListener('click', async () => {
    try {
        const result = await window.electronAPI.clearHistory();
        chatHistory.innerHTML = '';
        const notification = document.createElement('div');
        notification.className = 'system-message';
        notification.textContent = result.message;
        chatHistory.appendChild(notification);
    } catch (error) {
        const errorElement = document.createElement('div');
        errorElement.className = 'message error-message';
        errorElement.textContent = 'Erro ao limpar histórico: ' + error.message;
        chatHistory.appendChild(errorElement);
    }
});

themeToggleButton.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    const darkTheme = document.getElementById('dark-code-theme');
    if (darkTheme) {
        darkTheme.disabled = newTheme !== 'dark';
    }
    localStorage.setItem('theme', newTheme);
});