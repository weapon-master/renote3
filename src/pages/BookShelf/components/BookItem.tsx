import React, { useState, useRef } from 'react';
import { Book } from '../../../types';

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
  onBookSelect, 
  onDelete, 
  onEditTitle,
  onReorder
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(book.title);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
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
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
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
    setIsDragOver(false);
  };

  const handleDragEnter = () => {
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div
      ref={bookRef}
      className={`group flex flex-col items-center p-2.5 bg-white rounded-lg shadow-md cursor-pointer transition-transform relative select-none h-55 min-h-55 max-h-55 box-border ${
        isDragging ? 'opacity-50 scale-105' : 'hover:-translate-y-1'
      } ${isDragOver ? 'border-2 border-dashed border-green-500' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDoubleClick={() => onBookSelect(book)}
    >
      <div className="w-25 h-32.5 bg-gray-300 border border-gray-400 flex items-center justify-center mb-2.5 rounded overflow-hidden flex-shrink-0">
        {book.coverPath ? (
          <img src={book.coverPath} alt={book.title} className="max-w-full max-h-full object-cover" />
        ) : (
          <div className="text-5xl font-bold text-gray-500">{book.title.charAt(0)}</div>
        )}
      </div>
      
      {isEditing ? (
        <div className="flex flex-col w-full items-center">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-11/12 p-1.5 mb-1.5 border border-gray-400 rounded"
          />
          <div className="flex gap-1.5">
            <button 
              onClick={handleSaveEdit}
              className="px-2 py-0.5 text-xs bg-green-500 text-white border-none rounded hover:bg-green-600"
            >
              ✓
            </button>
            <button 
              onClick={handleCancelEdit}
              className="px-2 py-0.5 text-xs bg-red-500 text-white border-none rounded hover:bg-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-center m-0 px-1.5 break-words overflow-hidden flex-1 flex items-center justify-center min-h-10 line-clamp-2">{book.title}</p>
      )}
      
      <div className="absolute top-1.5 right-1.5 hidden group-hover:flex">
        <button 
          onClick={handleEdit}
          className="p-1.5 text-xs m-0.5 bg-black bg-opacity-50 text-white border-none rounded hover:bg-opacity-70"
        >
          ✏
        </button>
        <button 
          onClick={handleDelete}
          className="p-1.5 text-xs m-0.5 bg-black bg-opacity-50 text-white border-none rounded hover:bg-opacity-70"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default BookItem;