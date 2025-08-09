import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload script loaded');

// Safe expose Electron APIs to renderer process
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => {
      console.log('IPC send:', channel, args);
      const validChannels = ['import-books'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      }
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      console.log('IPC on:', channel);
      const validChannels = ['import-books-result'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    removeListener: (channel: string, func: (...args: any[]) => void) => {
      console.log('IPC removeListener:', channel);
      ipcRenderer.removeListener(channel, func);
    }
  }
});

console.log('Electron APIs exposed');
