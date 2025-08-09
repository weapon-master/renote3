export interface Book {
  id: string;
  title: string;
  coverPath?: string;
  filePath: string;
  author?: string;
  description?: string;
  annotations?: Annotation[];
}

export interface Annotation {
  id: string;
  cfiRange: string;
  text: string; // selected text snapshot
  note: string;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
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
      epub: {
        readContent: (filePath: string) => Promise<{
          success: boolean;
          metadata?: {
            title: string;
            creator: string;
            language: string;
            identifier: string;
          };
          chapters?: Array<{
            id: string;
            title: string;
            href: string;
            content: string;
          }>;
          error?: string;
        }>;
        getLocalFileUrl: (filePath: string) => string;
      };
    };
  }
}