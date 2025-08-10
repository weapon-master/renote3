# Annotation and Note Card Consolidation

## Overview

This document describes the consolidation of annotations and note cards into a single model to eliminate data duplication and simplify the codebase.

## Problem

Previously, the application had two separate models:
- **Annotations**: Stored in the database with fields like `id`, `book_id`, `cfi_range`, `text`, `note`, `created_at`, `updated_at`
- **Note Cards**: Visual representations in the NotesView component with additional UI properties like `position`, `width`, `height`

This created unnecessary duplication since every annotation should have a corresponding note card, and they essentially represent the same concept.

## Solution

### Database Schema Changes

The `annotations` table has been extended to include visual properties:

```sql
CREATE TABLE annotations (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  cfi_range TEXT NOT NULL,
  text TEXT NOT NULL,
  note TEXT NOT NULL,
  position_x REAL DEFAULT 0,        -- NEW: X position for visual layout
  position_y REAL DEFAULT 0,        -- NEW: Y position for visual layout
  width REAL DEFAULT 200,           -- NEW: Card width
  height REAL DEFAULT 120,          -- NEW: Card height
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
)
```

### Type Changes

The `Annotation` interface has been updated to include visual properties:

```typescript
export interface Annotation {
  id: string;
  cfiRange: string;
  text: string;
  note: string;
  position?: { x: number; y: number };  // NEW: Visual position
  width?: number;                       // NEW: Card width
  height?: number;                      // NEW: Card height
  createdAt: string;
  updatedAt?: string;
}
```

### Database Operations

New functions have been added to handle visual properties:

- `updateAnnotation(id, updates)`: Updates annotation properties including visual ones
- `batchUpdateAnnotationVisuals(bookId, annotations)`: Batch updates visual properties for multiple annotations

### Component Changes

The `NotesView` component has been refactored to:
- Work directly with annotations instead of separate note cards
- Remove the `NoteCard` interface
- Use annotation visual properties for positioning and sizing
- Save position changes directly to the database

### Migration

A migration function `migrateAnnotationsToIncludeVisuals()` automatically adds the new columns to existing databases during initialization.

## Benefits

1. **Eliminates Data Duplication**: No need to maintain separate data structures for the same concept
2. **Simplified Data Model**: Single source of truth for annotation data
3. **Better Persistence**: Visual layout is now persisted in the database
4. **Reduced Complexity**: Fewer interfaces and data transformations
5. **Consistent State**: Visual properties are always in sync with annotation data

## Backward Compatibility

- Existing annotations will automatically get default visual properties (position: 0,0; width: 200; height: 120)
- The migration is automatic and non-destructive
- All existing functionality continues to work

## API Changes

### New Electron API Functions

```typescript
// Update a single annotation
electron.db.updateAnnotation(id: string, updates: Partial<Annotation>): Promise<{ success: boolean; error?: string }>

// Batch update visual properties
electron.db.batchUpdateAnnotationVisuals(bookId: string, annotations: Array<{ id: string; position?: { x: number; y: number }; width?: number; height?: number }>): Promise<{ success: boolean; error?: string }>
```

## Usage

The consolidated model is transparent to the rest of the application. Annotations now include visual properties by default, and the NotesView component automatically uses these properties for layout.

When creating new annotations, you can optionally specify visual properties:

```typescript
const annotation = {
  cfiRange: "epubcfi(/6/4[chapter-1]!/4/2/1:0)",
  text: "Selected text",
  note: "My note",
  position: { x: 100, y: 200 },
  width: 250,
  height: 150
};
```

If visual properties are not specified, default values will be used.
