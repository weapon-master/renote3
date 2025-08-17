import { Annotation } from './$schema';
import { getDatabase } from './common';

export function getAnnotationsByBookId(bookId: string): Annotation[] {
  const database = getDatabase();

  const stmt = database.prepare(`
      SELECT id, book_id, cfi_range, text, title, note, color_rgba, color_category, created_at, updated_at
      FROM annotations
      WHERE book_id = ?
      ORDER BY created_at ASC
    `);

  return stmt.all(bookId).map((ann: any) => ({
    id: ann.id,
    bookId: ann.book_id,
    cfiRange: ann.cfi_range,
    text: ann.text,
    title: ann.title,
    note: ann.note,
    color: {
      rgba: ann.color_rgba || 'rgba(255, 255, 0, 0.4)',
      category: ann.color_category || 'default'
    },
    createdAt: ann.created_at,
    updatedAt: ann.updated_at,
  }));
}

export function createAnnotation(bookId: string, annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Annotation {
    const database = getDatabase();

    const insertStmt = database.prepare(`
        INSERT INTO annotations (id, book_id, cfi_range, text, title, note, color_rgba, color_category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const annotationId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    insertStmt.run(
        annotationId,
        bookId,
        annotation.cfiRange,
        annotation.text,
        annotation.title,
        annotation.note,
        annotation.color.rgba,
        annotation.color.category,
        Date.now(),
        Date.now()
    );

    return {
        id: annotationId,
        bookId,
        cfiRange: annotation.cfiRange,
        text: annotation.text,
        title: annotation.title,
        note: annotation.note,
        color: annotation.color,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }
}

export function updateAnnotation(id: string, updates: Partial<Pick<Annotation, 'note' | 'title' | 'color'>>): boolean {
    const database = getDatabase();

    const stmt = database.prepare(`
        UPDATE annotations
        SET note = ?, title = ?, color_rgba = ?, color_category = ?, updated_at = ?
        WHERE id = ?
    `);

    const result = stmt.run(
        updates.note, 
        updates.title, 
        updates.color?.rgba, 
        updates.color?.category, 
        Date.now(),
        id
    );

    return result.changes > 0;  
}

export function deleteAnnotation(id: string): boolean {
    const database = getDatabase();

    const stmt = database.prepare(`
        DELETE FROM annotations
        WHERE id = ?
    `);

    const result = stmt.run(id);

    return result.changes > 0;
}