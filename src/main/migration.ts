import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { Book } from '../types';
import { initDatabase, migrateFromJson, getDatabaseStats } from './db';

// Migration utility to convert from JSON to SQLite
export async function migrateFromJsonFile(): Promise<{ success: boolean; message: string }> {
  const BOOKS_DATA_FILE = path.join(app.getPath('userData'), 'books.json');
  
  try {
    // Check if JSON file exists
    if (!fs.existsSync(BOOKS_DATA_FILE)) {
      return { 
        success: true, 
        message: 'No JSON file found. Starting with empty database.' 
      };
    }
    
    // Initialize database
    initDatabase();
    
    // Read JSON file
    const jsonData = fs.readFileSync(BOOKS_DATA_FILE, 'utf8');
    const books: Book[] = JSON.parse(jsonData);
    
    if (!Array.isArray(books)) {
      return { 
        success: false, 
        message: 'Invalid JSON format. Expected an array of books.' 
      };
    }
    
    // Migrate data to SQLite
    migrateFromJson(books);
    
    // Get migration stats
    const stats = getDatabaseStats();
    
    // Create backup of JSON file
    const backupPath = BOOKS_DATA_FILE + '.backup';
    fs.copyFileSync(BOOKS_DATA_FILE, backupPath);
    
    return { 
      success: true, 
      message: `Successfully migrated ${stats.books} books and ${stats.annotations} annotations to SQLite database. JSON file backed up to ${backupPath}` 
    };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return { 
      success: false, 
      message: `Migration failed: ${error.message}` 
    };
  }
}

// Check if migration is needed
export function needsMigration(): boolean {
  const BOOKS_DATA_FILE = path.join(app.getPath('userData'), 'books.json');
  return fs.existsSync(BOOKS_DATA_FILE);
}

// Get migration info
export function getMigrationInfo(): { hasJsonFile: boolean; jsonFileSize?: number; bookCount?: number } {
  const BOOKS_DATA_FILE = path.join(app.getPath('userData'), 'books.json');
  
  if (!fs.existsSync(BOOKS_DATA_FILE)) {
    return { hasJsonFile: false };
  }
  
  try {
    const stats = fs.statSync(BOOKS_DATA_FILE);
    const jsonData = fs.readFileSync(BOOKS_DATA_FILE, 'utf8');
    const books: Book[] = JSON.parse(jsonData);
    
    return {
      hasJsonFile: true,
      jsonFileSize: stats.size,
      bookCount: Array.isArray(books) ? books.length : 0
    };
  } catch (error) {
    return {
      hasJsonFile: true,
      jsonFileSize: 0,
      bookCount: 0
    };
  }
}
