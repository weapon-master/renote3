import { Book } from "./$schema";
import { getDatabase } from "./common";


export function getAllBooks(): Book[] {
  const database = getDatabase();
  
  const booksStmt = database.prepare(`
    SELECT id, title, cover_path, file_path, author, description, reading_progress, created_at, updated_at
    FROM books
    ORDER BY created_at DESC
  `);

  
  const books = booksStmt.all() as any[];
  
  return books.map(book => ({
    id: book.id,
    title: book.title,
    coverPath: book.cover_path,
    filePath: book.file_path,
    author: book.author,
    description: book.description,
    readingProgress: book.reading_progress || undefined,
  }));
}

export function getBookById(id: string): Book | null {
  const database = getDatabase();
  
  const bookStmt = database.prepare(`
    SELECT id, title, cover_path, file_path, author, description, reading_progress, created_at, updated_at
    FROM books
    WHERE id = ?
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
    readingProgress: book.reading_progress || undefined,
  };
}

export function createBook(book: Omit<Book, 'id' | 'annotations'>): Book {
  const database = getDatabase();
  
  const insertStmt = database.prepare(`
    INSERT INTO books (id, title, cover_path, file_path, author, description, topic, reading_progress)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const bookId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${book.filePath}`;
  
  insertStmt.run(
    bookId,
    book.title,
    book.coverPath,
    book.filePath,
    book.author,
    book.description,
    book.topic,
    book.readingProgress || null
  );
  
  return {
    id: bookId,
    title: book.title,
    coverPath: book.coverPath,
    filePath: book.filePath,
    author: book.author,
    description: book.description,
    readingProgress: book.readingProgress,
  };
}

export function updateBook(id: string, updates: Partial<Omit<Book, 'id'>>): boolean {
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
  if (updates.topic !== undefined) {
    fields.push('topic = ?');
    values.push(updates.topic);
  }
  if (updates.readingProgress !== undefined) {
    fields.push('reading_progress = ?');
    values.push(updates.readingProgress);
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

export function updateReadingProgress(bookId: string, progress: string): boolean {
  const database = getDatabase();
  
  const updateStmt = database.prepare(`
    UPDATE books
    SET reading_progress = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  const result = updateStmt.run(progress, bookId);
  return result.changes > 0;
}
