// Import the database driver
import Database, { ColumnDefinition } from 'better-sqlite3';
// Connect to the database


// ---- The Robust Way to Add a Column ----

export function addTopicColumnToBooks(DB_PATH: string) {
  const tableName = 'books';
  const columnName = 'topic';
    const db = new Database(DB_PATH, { verbose: console.log });
  try {
    // 1. Check if the column already exists using PRAGMA table_info
    const columns: ColumnDefinition[] = db.prepare(`PRAGMA table_info(${tableName})`).all() as ColumnDefinition[];
    const columnExists = columns.some((col) => col.name === columnName);

    // 2. If the column does not exist, add it
    if (!columnExists) {
      console.log(`Column "${columnName}" not found in table "${tableName}". Adding it...`);
      db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} TEXT`).run();
      console.log(`Successfully added "${columnName}" column.`);
    } else {
      console.log(`Column "${columnName}" already exists in table "${tableName}".`);
    }
  } catch (err) {
    console.error('An error occurred:', err.message);
  }
  db.close();
}

// Example usage:
// Let's assume you have a 'users' table already.
// If not, you can create one like this:
// db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)");
// db.exec("INSERT INTO users (name) VALUES ('Alice')");

// Now, run the function to add the column
// addEmailColumn();
// Close the database connection
