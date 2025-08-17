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
  },

  // 数据库API
  db: {
    // 书籍相关
    getAllBooks: () => ipcRenderer.invoke('get-all-books'),
    createBook: (book: any) => ipcRenderer.invoke('create-book', book),
    updateBook: (id: string, updates: any) => ipcRenderer.invoke('update-book', id, updates),
    deleteBook: (id: string) => ipcRenderer.invoke('delete-book', id),
    updateReadingProgress: (bookId: string, progress: string) => ipcRenderer.invoke('update-reading-progress', bookId, progress),
    
    // 注释相关
    getAnnotationsByBookId: (bookId: string) => ipcRenderer.invoke('get-annotations-by-book-id', bookId),
    createAnnotation: (bookId: string, annotation: any) => ipcRenderer.invoke('create-annotation', bookId, annotation),
    updateAnnotation: (id: string, updates: any) => ipcRenderer.invoke('update-annotation', id, updates),
    deleteAnnotation: (id: string) => ipcRenderer.invoke('delete-annotation', id),
    
    // 卡片相关
    getCardsByAnnotationIds: (annotationIds: string[]) => ipcRenderer.invoke('get-cards-by-annotation-ids', annotationIds),
    createCard: (annotationId: string, card: any) => ipcRenderer.invoke('create-card', annotationId, card),
    updateCard: (id: string, updates: any) => ipcRenderer.invoke('update-card', id, updates),
    batchUpdateCards: (cards: any[]) => ipcRenderer.invoke('batch-update-cards', cards),
    deleteCardsByAnnotationId: (annotationId: string) => ipcRenderer.invoke('delete-cards-by-annotation-id', annotationId),
    deleteCards: (ids: string[]) => ipcRenderer.invoke('delete-cards', ids),
    
    // 笔记连接相关
    getNoteConnectionsByBookId: (bookId: string) => ipcRenderer.invoke('get-note-connections-by-book-id', bookId),
    createNoteConnection: (connection: any) => ipcRenderer.invoke('create-note-connection', connection),
    updateNoteConnection: (id: string, updates: any) => ipcRenderer.invoke('update-note-connection', id, updates),
    deleteNoteConnection: (id: string) => ipcRenderer.invoke('delete-note-connection', id),
    batchUpdateNoteConnections: (bookId: string, connections: any[]) => ipcRenderer.invoke('batch-update-note-connections', bookId, connections)
  }
});

console.log('Electron APIs exposed');
