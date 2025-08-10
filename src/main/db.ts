import { Book } from '../types';
import { getDatabase } from './db/common';

export * from './db/book';
export * from './db/annotation';
export * from './db/connection';

export { getDatabase, initDatabase, closeDatabase } from './db/common';

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

