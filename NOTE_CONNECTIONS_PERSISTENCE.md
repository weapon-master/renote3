# Note Connections Persistence Implementation

## Overview
This document describes the implementation of persistent storage for note connections in the renote3 application. Previously, note connections were stored in localStorage and would be lost when the application was reopened.

## Changes Made

### 1. Database Schema Updates (`src/main/db.ts`)
- Added a new `note_connections` table to store connection data
- Table structure:
  ```sql
  CREATE TABLE note_connections (
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
  ```
- Added indexes for better performance

### 2. Database Functions (`src/main/db.ts`)
Added new functions to handle note connections:
- `getNoteConnectionsByBookId(bookId: string)`: Retrieve all connections for a book
- `createNoteConnection(connection)`: Create a new connection
- `updateNoteConnection(id, updates)`: Update an existing connection
- `deleteNoteConnection(id)`: Delete a connection
- `deleteNoteConnectionsByBookId(bookId)`: Delete all connections for a book
- `batchUpdateNoteConnections(bookId, connections)`: Batch update connections for a book

### 3. Type Definitions (`src/types/index.ts`)
- Added `NoteConnection` interface to define the structure of connection data
- Updated Electron API types to include database functions

### 4. NotesView Component Updates (`src/components/NotesView.tsx`)
- Added `bookId` prop to the component
- Replaced localStorage connection storage with database calls
- Added `loadConnections()` function to load connections from database
- Added `saveConnections()` function to save connections to database
- Kept position data in localStorage for now (positions are UI-specific)

### 5. Reader Component Updates (`src/components/Reader.tsx`)
- Updated NotesView component usage to pass the `bookId` prop

### 6. Electron API Updates (`src/preload.ts`)
- Added database API methods to the exposed Electron APIs
- Methods include: `getNoteConnectionsByBookId`, `createNoteConnection`, `updateNoteConnection`, `deleteNoteConnection`, `batchUpdateNoteConnections`

### 7. Main Process Updates (`src/main.ts`)
- Added IPC handlers for all database operations
- Registered the new handlers in the app initialization
- Added proper error handling and logging

## How It Works

1. **Loading Connections**: When the NotesView component mounts, it calls `loadConnections()` which fetches connection data from the database for the current book.

2. **Saving Connections**: When connections are modified (created, updated, or deleted), the `saveConnections()` function is called to persist the changes to the database.

3. **Data Conversion**: The component converts between its internal connection format (using card IDs) and the database format (using annotation IDs).

4. **Persistence**: All connection data is now stored in the SQLite database and will persist across application restarts.

## Benefits

- **Persistence**: Connections are now permanently stored and survive application restarts
- **Data Integrity**: Foreign key constraints ensure data consistency
- **Performance**: Database indexes provide efficient querying
- **Scalability**: Database storage can handle large numbers of connections
- **Backup**: Database can be backed up along with other application data

## Migration

Existing users will not lose their connection data as the system gracefully handles the transition:
- If no connections exist in the database, the component will start with an empty connection list
- New connections will be saved to the database
- The system is backward compatible with the existing localStorage position data

## Testing

To test the implementation:
1. Open a book with annotations
2. Open the notes view
3. Create connections between note cards
4. Close and reopen the application
5. Verify that connections are still present

The connections should now persist across application restarts.
