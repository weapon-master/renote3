import React, { useState, useRef } from 'react';
import { CiEdit } from "react-icons/ci";
import { IoMdClose } from "react-icons/io";
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
        bookRef.current.classList.add('opacity-50', 'scale-105');
      }
    }, 0);
  };

  const handleDragEnd = () => {
    if (bookRef.current) {
      bookRef.current.classList.remove('opacity-50', 'scale-105');
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
      bookRef.current.classList.remove('border-2', 'border-dashed', 'border-green-500');
    }
  };

  const handleDragEnter = () => {
    if (bookRef.current) {
      bookRef.current.classList.add('border-2', 'border-dashed', 'border-green-500');
    }
  };

  const handleDragLeave = () => {
    if (bookRef.current) {
      bookRef.current.classList.remove('border-2', 'border-dashed', 'border-green-500');
    }
  };

  return (
    <div
      ref={bookRef}
      className="flex flex-col items-center p-2.5 bg-white rounded-lg shadow-md cursor-pointer transition-transform duration-200 relative select-none h-55 min-h-55 max-h-55 box-border hover:-translate-y-1 group"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDoubleClick={() => onBookSelect(book)}
    >
      <div className="w-25 h-32.5 bg-gray-300 border border-gray-300 flex items-center justify-center mb-2.5 rounded overflow-hidden flex-shrink-0">
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
            className="w-11/12 p-1.5 mb-1.5 border border-gray-300 rounded"
          />
          <div className="flex gap-1.5">
            <button onClick={handleSaveEdit} className="px-2 py-0.5 text-xs">✓</button>
            <button onClick={handleCancelEdit} className="px-2 py-0.5 text-xs">✕</button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-center m-0 px-1.5 break-words overflow-hidden flex-1 flex items-center justify-center min-h-10 line-clamp-2">{book.title}</p>
      )}
      
      <div className="absolute top-1.5 right-1.5 hidden group-hover:flex">
        <button onClick={handleEdit} className="p-1.5 text-s mx-0.5 cursor-pointer bg-black bg-opacity-50 text-white rounded"><CiEdit /></button>
        <button onClick={handleDelete} className="p-1.5 text-s mx-0.5 cursor-pointer bg-black bg-opacity-50 text-white rounded"><IoMdClose /></button>
      </div>
    </div>
  );
};

export default BookItem;