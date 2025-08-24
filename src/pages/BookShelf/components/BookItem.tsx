import React, { useState, useRef } from 'react';
import { Book } from '../../../types';
import '../components/BookItem.css';

interface BookItemProps {
  book: Book;
  index: number;
  onBookSelect: (book: Book) => void;
  onDelete: (bookId: string) => void;
  onEditTitle: (bookId: string, newTitle: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
}

const BookItem: React.FC<BookItemProps> = ({ 
  book, 
  index, 
  onBookSelect, 
  onDelete, 
  onEditTitle,
  onReorder
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(book.title);
  const bookRef = useRef<HTMLDivElement>(null);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(book.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(book.title);
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditTitle(book.id, editTitle);
    setIsEditing(false);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditTitle(book.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit(e as any);
    } else if (e.key === 'Escape') {
      handleCancelEdit(e as any);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('bookId', book.id);
    setTimeout(() => {
      if (bookRef.current) {
        bookRef.current.classList.add('dragging');
      }
    }, 0);
  };

  const handleDragEnd = () => {
    if (bookRef.current) {
      bookRef.current.classList.remove('dragging');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('bookId');
    if (draggedId && draggedId !== book.id) {
      onReorder(draggedId, book.id);
    }
    
    if (bookRef.current) {
      bookRef.current.classList.remove('drag-over');
    }
  };

  const handleDragEnter = () => {
    if (bookRef.current) {
      bookRef.current.classList.add('drag-over');
    }
  };

  const handleDragLeave = () => {
    if (bookRef.current) {
      bookRef.current.classList.remove('drag-over');
    }
  };

  return (
    <div
      ref={bookRef}
      className="book"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDoubleClick={() => onBookSelect(book)}
    >
      <div className="book-cover">
        {book.coverPath ? (
          <img src={book.coverPath} alt={book.title} />
        ) : (
          <div className="book-cover-placeholder">{book.title.charAt(0)}</div>
        )}
      </div>
      
      {isEditing ? (
        <div className="book-title-edit">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div className="edit-actions">
            <button onClick={handleSaveEdit}>✓</button>
            <button onClick={handleCancelEdit}>✕</button>
          </div>
        </div>
      ) : (
        <p className="book-title">{book.title}</p>
      )}
      
      <div className="book-actions">
        <button onClick={handleEdit}>✏</button>
        <button onClick={handleDelete}>✕</button>
      </div>
    </div>
  );
};

export default BookItem;