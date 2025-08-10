import { getDatabase } from './common'

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
    // Only delete and insert if we have connections to save
    // This prevents deleting existing connections when the component is just loading
    if (connections.length > 0) {
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
    } else {
      console.log('No connections to save, skipping database update');
    }
  });
  
  transaction();
  console.log('Transaction completed');
}
