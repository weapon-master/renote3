import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { Book, Annotation } from '../types';

// Database file path
const DB_PATH = path.join(app.getPath('userData'), 'books.db');
console.log('Database will be created at:', DB_PATH);
console.log('User data path:', app.getPath('userData'));

// Database instance
let db: Database.Database | null = null;

// Initialize database
export function initDatabase(): void {
  try {
    console.log('Initializing database at:', DB_PATH);
    db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create books table
    db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        cover_path TEXT,
        file_path TEXT NOT NULL UNIQUE,
        author TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create annotations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS annotations (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        cfi_range TEXT NOT NULL,
        text TEXT NOT NULL,
        note TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);

    // Create note connections table
    db.exec(`
      CREATE TABLE IF NOT EXISTS note_connections (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        from_annotation_id TEXT NOT NULL,
        to_annotation_id TEXT NOT NULL,
        direction TEXT DEFAULT 'none',
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (from_annotation_id) REFERENCES annotations(id) ON DELETE CASCADE,
        FOREIGN KEY (to_annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
      )
    `);
    console.log('note_connections table created/verified');
    
    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_annotations_book_id ON annotations(book_id);
      CREATE INDEX IF NOT EXISTS idx_books_file_path ON books(file_path);
      CREATE INDEX IF NOT EXISTS idx_note_connections_book_id ON note_connections(book_id);
      CREATE INDEX IF NOT EXISTS idx_note_connections_annotations ON note_connections(from_annotation_id, to_annotation_id);
    `);
    console.log('Database indexes created/verified');
    
    // Check if database file exists
    const fs = require('fs');
    if (fs.existsSync(DB_PATH)) {
      console.log('Database file exists at:', DB_PATH);
      const stats = fs.statSync(DB_PATH);
      console.log('Database file size:', stats.size, 'bytes');
    } else {
      console.error('Database file does not exist at:', DB_PATH);
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Get database instance
function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Close database connection
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Book operations
export function getAllBooks(): Book[] {
  const database = getDatabase();
  
  const booksStmt = database.prepare(`
    SELECT id, title, cover_path, file_path, author, description, created_at, updated_at
    FROM books
    ORDER BY created_at DESC
  `);
  
  const annotationsStmt = database.prepare(`
    SELECT id, cfi_range, text, note, created_at, updated_at
    FROM annotations
    WHERE book_id = ?
    ORDER BY created_at ASC
  `);
  
  const books = booksStmt.all() as any[];
  
  return books.map(book => ({
    id: book.id,
    title: book.title,
    coverPath: book.cover_path,
    filePath: book.file_path,
    author: book.author,
    description: book.description,
    annotations: annotationsStmt.all(book.id).map((ann: any) => ({
      id: ann.id,
      cfiRange: ann.cfi_range,
      text: ann.text,
      note: ann.note,
      createdAt: ann.created_at,
      updatedAt: ann.updated_at
    }))
  }));
}

export function getBookById(id: string): Book | null {
  const database = getDatabase();
  
  const bookStmt = database.prepare(`
    SELECT id, title, cover_path, file_path, author, description, created_at, updated_at
    FROM books
    WHERE id = ?
  `);
  
  const annotationsStmt = database.prepare(`
    SELECT id, cfi_range, text, note, created_at, updated_at
    FROM annotations
    WHERE book_id = ?
    ORDER BY created_at ASC
  `);
  
  const book = bookStmt.get(id) as any;
  
  if (!book) {
    return null;
  }
  
  return {
    id: book.id,
    title: book.title,
    coverPath: book.cover_path,
    filePath: book.file_path,
    author: book.author,
    description: book.description,
    annotations: annotationsStmt.all(id).map((ann: any) => ({
      id: ann.id,
      cfiRange: ann.cfi_range,
      text: ann.text,
      note: ann.note,
      createdAt: ann.created_at,
      updatedAt: ann.updated_at
    }))
  };
}

export function createBook(book: Omit<Book, 'id' | 'annotations'>): Book {
  const database = getDatabase();
  
  const insertStmt = database.prepare(`
    INSERT INTO books (id, title, cover_path, file_path, author, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const bookId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${book.filePath}`;
  
  insertStmt.run(
    bookId,
    book.title,
    book.coverPath,
    book.filePath,
    book.author,
    book.description
  );
  
  return {
    id: bookId,
    title: book.title,
    coverPath: book.coverPath,
    filePath: book.filePath,
    author: book.author,
    description: book.description,
    annotations: []
  };
}

export function updateBook(id: string, updates: Partial<Omit<Book, 'id' | 'annotations'>>): boolean {
  const database = getDatabase();
  
  const fields = [];
  const values = [];
  
  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.coverPath !== undefined) {
    fields.push('cover_path = ?');
    values.push(updates.coverPath);
  }
  if (updates.filePath !== undefined) {
    fields.push('file_path = ?');
    values.push(updates.filePath);
  }
  if (updates.author !== undefined) {
    fields.push('author = ?');
    values.push(updates.author);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  
  if (fields.length === 0) {
    return false;
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const updateStmt = database.prepare(`
    UPDATE books
    SET ${fields.join(', ')}
    WHERE id = ?
  `);
  
  const result = updateStmt.run(...values);
  return result.changes > 0;
}

export function deleteBook(id: string): boolean {
  const database = getDatabase();
  
  const deleteStmt = database.prepare('DELETE FROM books WHERE id = ?');
  const result = deleteStmt.run(id);
  
  return result.changes > 0;
}

// Annotation operations
export function getAnnotationsByBookId(bookId: string): Annotation[] {
  const database = getDatabase();
  
  const stmt = database.prepare(`
    SELECT id, cfi_range, text, note, created_at, updated_at
    FROM annotations
    WHERE book_id = ?
    ORDER BY created_at ASC
  `);
  
  return stmt.all(bookId).map((ann: any) => ({
    id: ann.id,
    cfiRange: ann.cfi_range,
    text: ann.text,
    note: ann.note,
    createdAt: ann.created_at,
    updatedAt: ann.updated_at
  }));
}

export function createAnnotation(bookId: string, annotation: Omit<Annotation, 'id'>): Annotation {
  const database = getDatabase();
  
  const insertStmt = database.prepare(`
    INSERT INTO annotations (id, book_id, cfi_range, text, note)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const annotationId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  insertStmt.run(
    annotationId,
    bookId,
    annotation.cfiRange,
    annotation.text,
    annotation.note
  );
  
  return {
    id: annotationId,
    cfiRange: annotation.cfiRange,
    text: annotation.text,
    note: annotation.note,
    createdAt: annotation.createdAt,
    updatedAt: annotation.updatedAt
  };
}

export function updateAnnotation(id: string, updates: Partial<Omit<Annotation, 'id' | 'createdAt'>>): boolean {
  const database = getDatabase();
  
  const fields = [];
  const values = [];
  
  if (updates.cfiRange !== undefined) {
    fields.push('cfi_range = ?');
    values.push(updates.cfiRange);
  }
  if (updates.text !== undefined) {
    fields.push('text = ?');
    values.push(updates.text);
  }
  if (updates.note !== undefined) {
    fields.push('note = ?');
    values.push(updates.note);
  }
  
  if (fields.length === 0) {
    return false;
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const updateStmt = database.prepare(`
    UPDATE annotations
    SET ${fields.join(', ')}
    WHERE id = ?
  `);
  
  const result = updateStmt.run(...values);
  return result.changes > 0;
}

export function deleteAnnotation(id: string): boolean {
  const database = getDatabase();
  
  const deleteStmt = database.prepare('DELETE FROM annotations WHERE id = ?');
  const result = deleteStmt.run(id);
  
  return result.changes > 0;
}

// Batch operations for better performance
export function updateBookAnnotations(bookId: string, annotations: Annotation[]): void {
  const database = getDatabase();
  
  // Use transaction for atomicity
  const transaction = database.transaction(() => {
    // Delete existing annotations
    const deleteStmt = database.prepare('DELETE FROM annotations WHERE book_id = ?');
    deleteStmt.run(bookId);
    
    // Insert new annotations
    const insertStmt = database.prepare(`
      INSERT INTO annotations (id, book_id, cfi_range, text, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const annotation of annotations) {
      insertStmt.run(
        annotation.id,
        bookId,
        annotation.cfiRange,
        annotation.text,
        annotation.note,
        annotation.createdAt,
        annotation.updatedAt || annotation.createdAt
      );
    }
  });
  
  transaction();
}

// Migration helper (for converting from JSON to SQLite)
export function migrateFromJson(books: Book[]): void {
  const database = getDatabase();
  
  const transaction = database.transaction(() => {
    // Clear existing data
    database.exec('DELETE FROM annotations');
    database.exec('DELETE FROM books');
    
    // Insert books
    const bookInsertStmt = database.prepare(`
      INSERT INTO books (id, title, cover_path, file_path, author, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Insert annotations
    const annotationInsertStmt = database.prepare(`
      INSERT INTO annotations (id, book_id, cfi_range, text, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const book of books) {
      bookInsertStmt.run(
        book.id,
        book.title,
        book.coverPath,
        book.filePath,
        book.author,
        book.description
      );
      
      if (book.annotations) {
        for (const annotation of book.annotations) {
          annotationInsertStmt.run(
            annotation.id,
            book.id,
            annotation.cfiRange,
            annotation.text,
            annotation.note,
            annotation.createdAt,
            annotation.updatedAt || annotation.createdAt
          );
        }
      }
    }
  });
  
  transaction();
  console.log(`Migrated ${books.length} books to SQLite database`);
}

// Utility functions
export function getDatabaseStats(): { books: number; annotations: number } {
  const database = getDatabase();
  
  const booksCount = database.prepare('SELECT COUNT(*) as count FROM books').get() as any;
  const annotationsCount = database.prepare('SELECT COUNT(*) as count FROM annotations').get() as any;
  
  return {
    books: booksCount.count,
    annotations: annotationsCount.count
  };
}

export function backupDatabase(backupPath: string): void {
  const database = getDatabase();
  database.backup(backupPath);
}

export function vacuumDatabase(): void {
  const database = getDatabase();
  database.exec('VACUUM');
}

// Note Connection operations
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

export function getNoteConnectionsByBookId(bookId: string): NoteConnection[] {
  const database = getDatabase();
  
  console.log('Getting note connections for bookId:', bookId);
  
  // First, check if the table exists
  const tableCheck = database.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='note_connections'
  `);
  const tableExists = tableCheck.get();
  console.log('note_connections table exists:', !!tableExists);
  
  if (!tableExists) {
    console.error('note_connections table does not exist!');
    return [];
  }
  
  const stmt = database.prepare(`
    SELECT id, book_id, from_annotation_id, to_annotation_id, direction, description, created_at, updated_at
    FROM note_connections
    WHERE book_id = ?
    ORDER BY created_at ASC
  `);
  
  const results = stmt.all(bookId);
  console.log('Raw database results:', results);
  
  const connections = results.map((conn: any) => ({
    id: conn.id,
    bookId: conn.book_id,
    fromAnnotationId: conn.from_annotation_id,
    toAnnotationId: conn.to_annotation_id,
    direction: conn.direction,
    description: conn.description,
    createdAt: conn.created_at,
    updatedAt: conn.updated_at
  }));
  
  console.log('Mapped connections:', connections);
  return connections;
}

export function createNoteConnection(connection: Omit<NoteConnection, 'id' | 'createdAt' | 'updatedAt'>): NoteConnection {
  const database = getDatabase();
  // check whether the note connection already exists by checking bookId, fromAnnotationId, toAnnotationId
  const existingConnection = database.prepare(`
    SELECT id FROM note_connections WHERE book_id = ? AND from_annotation_id = ? AND to_annotation_id = ?
  `).get(connection.bookId, connection.fromAnnotationId, connection.toAnnotationId) as NoteConnection | undefined;

  if (existingConnection) {
    return existingConnection;
  }
  const insertStmt = database.prepare(`
    INSERT INTO note_connections (id, book_id, from_annotation_id, to_annotation_id, direction, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const connectionId = `conn-${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  insertStmt.run(
    connectionId,
    connection.bookId,
    connection.fromAnnotationId,
    connection.toAnnotationId,
    connection.direction,
    connection.description
  );
  
  return {
    id: connectionId,
    bookId: connection.bookId,
    fromAnnotationId: connection.fromAnnotationId,
    toAnnotationId: connection.toAnnotationId,
    direction: connection.direction,
    description: connection.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function updateNoteConnection(id: string, updates: Partial<Omit<NoteConnection, 'id' | 'bookId' | 'fromAnnotationId' | 'toAnnotationId' | 'createdAt'>>): boolean {
  const database = getDatabase();
  
  const fields = [];
  const values = [];
  
  if (updates.direction !== undefined) {
    fields.push('direction = ?');
    values.push(updates.direction);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  
  if (fields.length === 0) {
    return false;
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const updateStmt = database.prepare(`
    UPDATE note_connections
    SET ${fields.join(', ')}
    WHERE id = ?
  `);
  
  const result = updateStmt.run(...values);
  return result.changes > 0;
}

export function deleteNoteConnection(id: string): boolean {
  const database = getDatabase();
  
  const deleteStmt = database.prepare('DELETE FROM note_connections WHERE id = ?');
  const result = deleteStmt.run(id);
  
  return result.changes > 0;
}

export function deleteNoteConnectionsByBookId(bookId: string): boolean {
  const database = getDatabase();
  
  const deleteStmt = database.prepare('DELETE FROM note_connections WHERE book_id = ?');
  const result = deleteStmt.run(bookId);
  
  return result.changes > 0;
}

export function batchUpdateNoteConnections(bookId: string, connections: NoteConnection[]): void {
  const database = getDatabase();
  
  console.log('batchUpdateNoteConnections called with bookId:', bookId, 'connections:', connections);
  
  // First, check if the table exists
  const tableCheck = database.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='note_connections'
  `);
  const tableExists = tableCheck.get();
  console.log('note_connections table exists for saving:', !!tableExists);
  
  if (!tableExists) {
    console.error('note_connections table does not exist for saving!');
    return;
  }
  
  // Use transaction for atomicity
  const transaction = database.transaction(() => {
    // Delete existing connections for this book
    const deleteStmt = database.prepare('DELETE FROM note_connections WHERE book_id = ?');
    const deleteResult = deleteStmt.run(bookId);
    console.log('Deleted existing connections:', deleteResult.changes);
    
    // Insert new connections
    const insertStmt = database.prepare(`
      INSERT INTO note_connections (id, book_id, from_annotation_id, to_annotation_id, direction, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const connection of connections) {
      console.log('Inserting connection:', connection);
      const insertResult = insertStmt.run(
        connection.id,
        bookId,
        connection.fromAnnotationId,
        connection.toAnnotationId,
        connection.direction,
        connection.description,
        connection.createdAt,
        connection.updatedAt || connection.createdAt
      );
      console.log('Insert result:', insertResult);
    }
  });
  
  transaction();
  console.log('Transaction completed');
}
