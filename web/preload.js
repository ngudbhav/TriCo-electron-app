const { ipcRenderer, contextBridge, shell } = require('electron');
const { Titlebar, Color } = require('custom-electron-titlebar');

contextBridge.exposeInMainWorld(
  "api", {
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    receive: (channel, func) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    buyMeACoffee: () => {
      shell.openExternal('https://www.buymeacoffee.com/ngudbhav').then();
    },
    showError: error => {
      ipcRenderer.send('error', error);
    },
  }
);

window.addEventListener('DOMContentLoaded', () => {
  console.log(process.platform);
  if (process.platform !== 'darwin') {
    console.log('Init Titlebar');
    new Titlebar({
      backgroundColor: Color.fromHex('#0069d9'),
      icon: '../images/icons/png/1024x1024.png',
      menu: null,
      titleHorizontalAlignment:'left',
      shadow:true
    });
  }
});
