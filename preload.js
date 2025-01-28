const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  getResponse: (callback) => ipcRenderer.on('receive-response', (event, response) => callback(response))
})