require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { GenerativeModel, GoogleGenerativeAI } = require("@google/generative-ai");
const DocumentManager = require('./documentManager');

const MODEL_NAME = "gemini-pro";
const API_KEY = process.env.GOOGLE_API_KEY;

const documentManager = new DocumentManager();

async function loadPrompt() {
  const promptPath = path.join(__dirname, 'prompt.txt');
  try {
    const promptContent = await fs.promises.readFile(promptPath, 'utf-8');
    return promptContent;
  } catch (error) {
    console.error('Erro ao carregar o prompt:', error);
    return '';
  }
}

async function runChat(userMessage, promptContent) {
  // Adiciona a mensagem ao histórico
  await documentManager.addToHistory(userMessage, true);

  // Se for uma saudação, responde diretamente
  if (documentManager.isGreeting(userMessage)) {
    const response = "Olá! Sou o chatbot do Instituto Terra e Trabalho (ITT). Como posso ajudar você hoje?";
    await documentManager.addToHistory(response, false);
    return response;
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  // Obtém contexto relevante dos documentos
  const documentContext = documentManager.getContext(userMessage);
  
  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: promptContent }],
      },
      {
        role: "model",
        parts: [{ text: "Entendido. Vou responder suas perguntas baseado apenas nos documentos fornecidos." }],
      },
    ],
  });

  // Adiciona o contexto dos documentos à pergunta do usuário
  const messageWithContext = `${documentContext}\n\nPergunta do usuário: ${userMessage}\n\nPor favor, responda usando apenas as informações fornecidas acima. Se não houver informações relevantes nos documentos, diga que não encontrou informações sobre o assunto.`;

  const result = await chat.sendMessage(messageWithContext);
  const response = await result.response;
  const responseText = response.text();
  
  // Adiciona a resposta ao histórico
  await documentManager.addToHistory(responseText, false);
  
  return responseText;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(async () => {
  try {
    await documentManager.loadAllDocuments();
    console.log('Documentos carregados com sucesso!');
  } catch (error) {
    console.error('Erro ao carregar documentos:', error);
  }

  createWindow();

  ipcMain.handle('send-message', async (event, message) => {
    const promptContent = await loadPrompt();
    const response = await runChat(message, promptContent);
    return response;
  });

  ipcMain.handle('get-history', async () => {
    return documentManager.getHistory();
  });

  ipcMain.handle('clear-history', async () => {
    return documentManager.clearHistory();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});