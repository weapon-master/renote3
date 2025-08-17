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
        reading_progress TEXT,
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
        title TEXT NOT NULL,
        note TEXT NOT NULL,
        color_rgba TEXT,
        color_category TEXT,
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
    
    // Create cards table
    db.exec(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        annotation_id TEXT NOT NULL,
        position_x REAL DEFAULT 0,
        position_y REAL DEFAULT 0,
        width REAL DEFAULT 200,
        height REAL DEFAULT 120,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
      )
    `);
    console.log('cards table created/verified');
    
    // Create indexes for better performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_annotations_book_id ON annotations(book_id);
      CREATE INDEX IF NOT EXISTS idx_books_file_path ON books(file_path);
      CREATE INDEX IF NOT EXISTS idx_note_connections_book_id ON note_connections(book_id);
      CREATE INDEX IF NOT EXISTS idx_note_connections_annotations ON note_connections(from_annotation_id, to_annotation_id);
      CREATE INDEX IF NOT EXISTS idx_cards_annotation_id ON cards(annotation_id);
    `);
    console.log('Database indexes created/verified');
    
    // Migrate existing annotations table to include new fields
    try {
      const columns = db.prepare("PRAGMA table_info(annotations)").all();
      const columnNames = columns.map((col: any) => col.name);
      
      if (!columnNames.includes('title')) {
        console.log('Migrating annotations table to include title...');
        db.exec(`ALTER TABLE annotations ADD COLUMN title TEXT NOT NULL DEFAULT '';`);
      }
      
      if (!columnNames.includes('color_rgba')) {
        console.log('Migrating annotations table to include color fields...');
        db.exec(`
          ALTER TABLE annotations ADD COLUMN color_rgba TEXT;
          ALTER TABLE annotations ADD COLUMN color_category TEXT;
        `);
      }
      
      // Remove old position columns if they exist (moved to cards table)
      if (columnNames.includes('position_x')) {
        console.log('Removing old position columns from annotations table...');
        // Note: SQLite doesn't support DROP COLUMN directly, so we'll create a new table
        db.exec(`
          CREATE TABLE annotations_new (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL,
            cfi_range TEXT NOT NULL,
            text TEXT NOT NULL,
            title TEXT NOT NULL,
            note TEXT NOT NULL,
            color_rgba TEXT,
            color_category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
          )
        `);
        db.exec(`
          INSERT INTO annotations_new 
          SELECT id, book_id, cfi_range, text, title, note, color_rgba, color_category, created_at, updated_at
          FROM annotations
        `);
        db.exec('DROP TABLE annotations');
        db.exec('ALTER TABLE annotations_new RENAME TO annotations');
      }
      
      console.log('Annotations table migration completed');
    } catch (error) {
      console.warn('Annotations table migration failed:', error);
    }

    // Migrate existing books table to include reading progress
    try {
      const hasReadingProgress = db.prepare("PRAGMA table_info(books)").all().some((col: any) => col.name === 'reading_progress');
      if (!hasReadingProgress) {
        console.log('Migrating books table to include reading progress...');
        db.exec(`
          ALTER TABLE books ADD COLUMN reading_progress TEXT;
        `);
        console.log('Books table migration completed');
      }
    } catch (error) {
      console.warn('Books table migration failed (column may already exist):', error);
    }
    
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