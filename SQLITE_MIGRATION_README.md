# SQLite Database Migration

## Overview

This document describes the migration from JSON file storage to SQLite database for the EPUB reader application. The migration provides better performance, data integrity, and scalability.

## Database Design

### Tables

#### 1. Books Table
```sql
CREATE TABLE books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  cover_path TEXT,
  file_path TEXT NOT NULL UNIQUE,
  author TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id`: Unique identifier for the book
- `title`: Book title
- `cover_path`: Path to cover image (optional)
- `file_path`: Path to the book file (unique)
- `author`: Book author (optional)
- `description`: Book description (optional)
- `created_at`: Timestamp when book was added
- `updated_at`: Timestamp when book was last modified

#### 2. Annotations Table
```sql
CREATE TABLE annotations (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  cfi_range TEXT NOT NULL,
  text TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

**Fields:**
- `id`: Unique identifier for the annotation
- `book_id`: Foreign key reference to books table
- `cfi_range`: EPUB CFI range for the annotation location
- `text`: Selected text snapshot
- `note`: User's note for the annotation
- `created_at`: Timestamp when annotation was created
- `updated_at`: Timestamp when annotation was last modified

### Indexes
```sql
CREATE INDEX idx_annotations_book_id ON annotations(book_id);
CREATE INDEX idx_books_file_path ON books(file_path);
```

### Foreign Key Constraints
- Annotations are automatically deleted when their associated book is deleted (CASCADE)

## Migration Process

### Automatic Migration
1. When the application starts, it checks for the existence of `books.json`
2. If found, a migration dialog appears
3. User can choose to migrate or cancel
4. Migration creates a backup of the JSON file before proceeding
5. All data is transferred to SQLite database
6. Application restarts to use the new database

### Manual Migration
If automatic migration fails, you can manually trigger migration:

```typescript
// Check migration status
const status = await window.electron.migration.check();

// Perform migration
const result = await window.electron.migration.perform();
```

## Database API

### Book Operations

```typescript
// Get all books with annotations
const books = getAllBooks();

// Get book by ID
const book = getBookById(bookId);

// Create new book
const newBook = createBook({
  title: "Book Title",
  filePath: "/path/to/book.epub",
  author: "Author Name",
  description: "Book description"
});

// Update book
const success = updateBook(bookId, {
  title: "New Title"
});

// Delete book (annotations are automatically deleted)
const success = deleteBook(bookId);
```

### Annotation Operations

```typescript
// Get annotations for a book
const annotations = getAnnotationsByBookId(bookId);

// Create annotation
const annotation = createAnnotation(bookId, {
  cfiRange: "epubcfi(/6/4[chapter-1]!/4/2/1:0)",
  text: "Selected text",
  note: "User's note",
  createdAt: new Date().toISOString()
});

// Update annotation
const success = updateAnnotation(annotationId, {
  note: "Updated note"
});

// Delete annotation
const success = deleteAnnotation(annotationId);

// Batch update annotations for a book
updateBookAnnotations(bookId, annotationsArray);
```

### Utility Functions

```typescript
// Get database statistics
const stats = getDatabaseStats();
// Returns: { books: number, annotations: number }

// Backup database
backupDatabase('/path/to/backup.db');

// Optimize database
vacuumDatabase();

// Migrate from JSON (for development/testing)
migrateFromJson(booksArray);
```

## File Locations

### Database File
- **Windows**: `%APPDATA%\renote3\books.db`
- **macOS**: `~/Library/Application Support/renote3/books.db`
- **Linux**: `~/.config/renote3/books.db`

### Backup Files
- JSON backup: `books.json.backup` (created during migration)
- Database backup: Can be created using `backupDatabase()` function

## Performance Benefits

1. **Faster Queries**: Indexed queries are much faster than JSON parsing
2. **Memory Efficiency**: Only load data when needed, not entire JSON file
3. **Concurrent Access**: Better handling of multiple operations
4. **Data Integrity**: Foreign key constraints and ACID compliance
5. **Scalability**: Handles large numbers of books and annotations efficiently

## Error Handling

The database operations include comprehensive error handling:

- Database connection failures
- Constraint violations
- File system errors
- Migration failures

All errors are logged and appropriate fallback mechanisms are in place.

## Migration Safety

1. **Backup Creation**: Original JSON file is backed up before migration
2. **Transaction Safety**: Migration uses database transactions for atomicity
3. **Rollback Capability**: Can restore from backup if needed
4. **Validation**: Data integrity is verified during migration

## Troubleshooting

### Migration Fails
1. Check if the JSON file is corrupted
2. Verify file permissions
3. Check available disk space
4. Review application logs for specific errors

### Database Errors
1. Check database file permissions
2. Verify database file integrity
3. Try running `vacuumDatabase()` to optimize
4. Restore from backup if necessary

### Performance Issues
1. Check database file size
2. Run `vacuumDatabase()` to optimize
3. Verify indexes are created properly
4. Monitor query performance

## Development Notes

### Adding New Fields
To add new fields to the database:

1. Update the table schema in `db.ts`
2. Add migration logic for existing data
3. Update TypeScript interfaces
4. Test with existing data

### Database Versioning
Consider implementing database versioning for future schema changes:

```typescript
// Check database version
const version = getDatabaseVersion();

// Run migrations if needed
if (version < CURRENT_VERSION) {
  runMigrations(version, CURRENT_VERSION);
}
```

## Testing

### Unit Tests
- Test all CRUD operations
- Test foreign key constraints
- Test migration process
- Test error conditions

### Integration Tests
- Test with real EPUB files
- Test annotation creation and retrieval
- Test concurrent operations
- Test migration from JSON

### Performance Tests
- Test with large datasets
- Test query performance
- Test memory usage
- Test concurrent access
