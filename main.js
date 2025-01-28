require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { GenerativeModel, GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL_NAME = "gemini-pro";
const API_KEY = process.env.GOOGLE_API_KEY; // Substitua pelo seu API_KEY

async function loadPrompt() {
  const promptPath = path.join(__dirname, 'prompt.txt');
  try {
    const promptContent = await fs.promises.readFile(promptPath, 'utf-8');
    return promptContent;
  } catch (error) {
    console.error('Erro ao carregar o prompt:', error);
    return ''; // Retorna uma string vazia em caso de erro
  }
}

async function runChat(userMessage, promptContent) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: promptContent }],
      },
      {
        role: "model",
        parts: [{ text: "Eu sou um chatbot de IA. Estou aqui para ajudar a responder às suas perguntas e gerar texto semelhante ao humano." }],
      },
    ],
   
  });

  const result = await chat.sendMessage(userMessage);
  const response = await result.response;
  return response.text();
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

app.whenReady().then(() => {
  ipcMain.handle('send-message', async (event, message) => {
    const promptContent = await loadPrompt();
    const response = await runChat(message, promptContent);
    return response;
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});