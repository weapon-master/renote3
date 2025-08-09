export interface Book {
  id: string;
  title: string;
  coverPath?: string;
  filePath: string;
  author?: string;
  description?: string;
}

// Electron API 类型声明
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, func: (...args: any[]) => void) => void;
        removeListener: (channel: string, func: (...args: any[]) => void) => void;
      };
      books: {
        load: () => Promise<Book[]>;
        save: (books: Book[]) => Promise<{ success: boolean }>;
        delete: (bookId: string) => Promise<{ success: boolean; error?: string }>;
        update: (bookId: string, updates: Partial<Book>) => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}