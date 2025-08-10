import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

const DB_PATH = path.join(app.getPath('userData'), 'books.db');
console.log('Database will be created at:', DB_PATH);
console.log('User data path:', app.getPath('userData'));

export let db: Database.Database | null = null;

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
export function getDatabase(): Database.Database {
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