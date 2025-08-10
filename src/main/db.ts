
import { getDatabase } from './db/common';

export * from './db/book';
export * from './db/annotation';
export * from './db/connection';

export { getDatabase, initDatabase, closeDatabase } from './db/common';



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

