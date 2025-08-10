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
  position?: { x: number; y: number };  // Visual position for note cards
  width?: number;                       // Card width
  height?: number;                      // Card height
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface NoteConnection {
  id: string;
  bookId: string;
  fromAnnotationId: string;
  toAnnotationId: string;
  direction: 'none' | 'bidirectional' | 'unidirectional-forward' | 'unidirectional-backward';
  description?: string;
  createdAt: string;
  updatedAt: string;
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

      db: {
        getNoteConnectionsByBookId: (bookId: string) => Promise<NoteConnection[]>;
        createNoteConnection: (connection: Omit<NoteConnection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<NoteConnection>;
        updateNoteConnection: (id: string, updates: Partial<Omit<NoteConnection, 'id' | 'bookId' | 'fromAnnotationId' | 'toAnnotationId' | 'createdAt'>>) => Promise<{ success: boolean; error?: string }>;
        deleteNoteConnection: (id: string) => Promise<{ success: boolean; error?: string }>;
        batchUpdateNoteConnections: (bookId: string, connections: NoteConnection[]) => Promise<{ success: boolean; error?: string }>;
        updateAnnotation: (id: string, updates: Partial<Omit<Annotation, 'id' | 'createdAt'>>) => Promise<{ success: boolean; error?: string }>;
        batchUpdateAnnotationVisuals: (bookId: string, annotations: Array<{ id: string; position?: { x: number; y: number }; width?: number; height?: number }>) => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}