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
  },
  // 新增的持久化API
  books: {
    load: () => ipcRenderer.invoke('load-books'),
    save: (books: any[]) => ipcRenderer.invoke('save-books', books),
    delete: (bookId: string) => ipcRenderer.invoke('delete-book', bookId),
    update: (bookId: string, updates: any) => ipcRenderer.invoke('update-book', bookId, updates)
  },
  // EPUB阅读API
  epub: {
    readContent: (filePath: string) => {
      console.log('Preload: 调用EPUB readContent:', filePath);
      return ipcRenderer.invoke('read-epub-content', filePath);
    },
    getLocalFileUrl: (filePath: string) => {
      // 对路径进行编码，避免 Windows 路径中的特殊字符导致解析错误
      const encoded = encodeURIComponent(filePath);
      return `epub-local:///${encoded}`;
    }
  }
});

console.log('Electron APIs exposed');
