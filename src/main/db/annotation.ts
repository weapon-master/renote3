import { getDatabase } from "./common";
import { Annotation } from "../../types";

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