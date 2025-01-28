const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatHistory = document.getElementById('chat-history');

let userMessage = '';

sendButton.addEventListener('click', async () => {
  userMessage = messageInput.value;
  messageInput.value = '';

  // Adiciona a mensagem do usuário ao histórico do chat
  const userMessageElement = document.createElement('p');
  userMessageElement.classList.add('user-message');
  userMessageElement.textContent = `Você: ${userMessage}`;
  chatHistory.appendChild(userMessageElement);

  // Envia a mensagem do usuário para o processo principal
  const response = await window.electronAPI.sendMessage(userMessage);
  console.log("Resposta recebida no renderer:", response); // Log da resposta

  // Adiciona a resposta da IA ao histórico do chat
  const aiResponseElement = document.createElement('p');
  aiResponseElement.classList.add('ai-message');
  aiResponseElement.textContent = `IA: ${response}`;
  chatHistory.appendChild(aiResponseElement);
});

window.electronAPI.getResponse((response) => {
  console.log("Resposta recebida no renderer (via getResponse):", response); // Log da resposta

  // Adiciona a resposta da IA ao histórico do chat
  const aiResponseElement = document.createElement('p');
  aiResponseElement.classList.add('ai-message');
  aiResponseElement.textContent = `IA: ${response}`;
  chatHistory.appendChild(aiResponseElement);
});