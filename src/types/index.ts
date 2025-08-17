import type { Book, Annotation, Card, NoteConnection } from '../main/db/$schema.d';
export type { Book, Annotation, Card, NoteConnection };

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

      db: {
        // 书籍相关
        getAllBooks: () => Promise<Book[]>;
        createBook: (book: Omit<Book, 'id'>) => Promise<Book>;
        updateBook: (id: string, updates: Partial<Omit<Book, 'id'>>) => Promise<{ success: boolean; error?: string }>;
        deleteBook: (id: string) => Promise<{ success: boolean; error?: string }>;
        updateReadingProgress: (bookId: string, progress: string) => Promise<{ success: boolean; error?: string }>;
        
        // 注释相关
        getAnnotationsByBookId: (bookId: string) => Promise<Annotation[]>;
        createAnnotation: (bookId: string, annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Annotation>;
        updateAnnotation: (id: string, updates: Partial<Pick<Annotation, 'note' | 'title' | 'color'>>) => Promise<{ success: boolean; error?: string }>;
        deleteAnnotation: (id: string) => Promise<{ success: boolean; error?: string }>;
        
        // 卡片相关
        getCardsByAnnotationIds: (annotationIds: string[]) => Promise<Card[]>;
        createCard: (annotationId: string, card: Omit<Card, 'id'>) => Promise<Card>;
        updateCard: (id: string, updates: Partial<Pick<Card, 'position' | 'width' | 'height'>>) => Promise<{ success: boolean; error?: string }>;
        batchUpdateCards: (cards: Card[]) => Promise<{ success: boolean; error?: string }>;
        deleteCardsByAnnotationId: (annotationId: string) => Promise<{ success: boolean; error?: string }>;
        deleteCards: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
        
        // 笔记连接相关
        getNoteConnectionsByBookId: (bookId: string) => Promise<NoteConnection[]>;
        createNoteConnection: (connection: Omit<NoteConnection, 'id'>) => Promise<NoteConnection>;
        updateNoteConnection: (id: string, updates: Partial<Pick<NoteConnection, 'description'>>) => Promise<{ success: boolean; error?: string }>;
        deleteNoteConnection: (id: string) => Promise<{ success: boolean; error?: string }>;
        batchUpdateNoteConnections: (bookId: string, connections: NoteConnection[]) => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}