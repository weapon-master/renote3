export interface Book {
    id: string;
    title: string;
    coverPath?: string;
    filePath: string;
    author?: string;
    description?: string;
    topic?: string;
    readingProgress?: string; // CFI string for current reading position
  }
  
  export interface Annotation {
    id: string;
    bookId: string;
    cfiRange: string;
    text: string; // selected text snapshot
    title: string;
    note: string;
    color: {
      rgba: string;
      category: string;
    }
    createdAt: number; // timestamp
    updatedAt?: number; // timestamp
  }
  
  export interface Card {
    id: string; 
    annotationId: string;
    position?: { x: number; y: number }; // Visual position for note cards
    width?: number; // Card width
    height?: number; // Card height
  }
  
  export interface NoteConnection {
    id: string;
    bookId: string;
    fromCardId: string;
    toCardId: string;
    description?: string;
  }
  