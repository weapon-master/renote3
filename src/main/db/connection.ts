import { NoteConnection } from './$schema';
import { getDatabase } from './common';

export function getNoteConnectionsByBookId(bookId: string): NoteConnection[] {
    const database = getDatabase();

    const stmt = database.prepare(`
        SELECT id, book_id, from_annotation_id, to_annotation_id, description, created_at, updated_at
        FROM note_connections
        WHERE book_id = ?
    `);

    return stmt.all(bookId).map((conn: any) => ({
        id: conn.id,
        bookId: conn.book_id,
        fromCardId: conn.from_annotation_id,
        toCardId: conn.to_annotation_id,
        description: conn.description,
    }));
}

export function createNoteConnection(connection: Omit<NoteConnection, 'id'>): NoteConnection {
    const database = getDatabase();

    const insertStmt = database.prepare(`
        INSERT INTO note_connections (id, book_id, from_annotation_id, to_annotation_id, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const connectionId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    insertStmt.run(
        connectionId,
        connection.bookId, 
        connection.fromCardId, 
        connection.toCardId, 
        connection.description,
        Date.now(),
        Date.now()
    );

    return {
        id: connectionId,
        bookId: connection.bookId,
        fromCardId: connection.fromCardId,
        toCardId: connection.toCardId,
        description: connection.description,
    }
}

export function updateNoteConnection(id: string, updates: Partial<Pick<NoteConnection, 'description'>>): boolean {
    const database = getDatabase();

    const stmt = database.prepare(`
        UPDATE note_connections
        SET description = ?, updated_at = ?
        WHERE id = ?
    `);

    const result = stmt.run(updates.description, Date.now(), id);

    return result.changes > 0;
}

export function deleteNoteConnection(id: string): boolean {
    const database = getDatabase();

    const stmt = database.prepare(`
        DELETE FROM note_connections
        WHERE id = ?
    `);

    const result = stmt.run(id);

    return result.changes > 0;
}

export function batchUpdateNoteConnections(bookId: string, connections: NoteConnection[]): boolean {
    const database = getDatabase();
    
    const transaction = database.transaction(() => {
        // Delete existing connections for this book
        const deleteStmt = database.prepare('DELETE FROM note_connections WHERE book_id = ?');
        deleteStmt.run(bookId);
        
        // Insert new connections
        const insertStmt = database.prepare(`
            INSERT INTO note_connections (id, book_id, from_annotation_id, to_annotation_id, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const connection of connections) {
            insertStmt.run(
                connection.id,
                connection.bookId,
                connection.fromCardId,
                connection.toCardId,
                connection.description,
                Date.now(),
                Date.now()
            );
        }
    });
    
    transaction();
    return true;
}