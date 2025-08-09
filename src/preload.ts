// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import { promises as fs } from 'fs';
import { dialog } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, data: any) => {
      // List of valid channels
      const validChannels = ['import-books'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      const validChannels = ['import-books-result'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once: (channel: string, func: (...args: any[]) => void) => {
      const validChannels = ['import-books-result'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    }
  },
  dialog: {
    showOpenDialog: (options: any) => dialog.showOpenDialog(options)
  },
  fs: {
    readFile: (path: string) => fs.readFile(path),
    access: (path: string) => fs.access(path)
  }
});
