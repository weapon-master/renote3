import React, { useState, useEffect } from 'react';
import BookItem from './BookItem';
import { Book } from '../types';
import '../components/BookShelf.css';

interface BookShelfProps {
  onBookSelect: (book: Book) => void;
}

const BookShelf: React.FC<BookShelfProps> = ({ onBookSelect }) => {
  const [books, setBooks] = useState<Book[]>([]);

  // Load sample books for demonstration
  useEffect(() => {
    const sampleBooks: Book[] = [];
    setBooks(sampleBooks);
  }, []);

  const handleImportBooks = () => {
    console.log('Window object:', window);
    console.log('Window.electron:', (window as any).electron);
    
    const electron = (window as any).electron;
    if (electron && electron.ipcRenderer) {
      console.log('Sending import-books message to main process');
      electron.ipcRenderer.send('import-books');
    } else {
      // Fallback for demonstration without Electron
      console.warn('Electron integration not available, using mock data');
      const newBook: Book = {
        id: Date.now().toString(),
        title: `新书籍 ${books.length + 1}`,
        filePath: `/path/to/newbook${books.length + 1}.epub`
      };
      setBooks([...books, newBook]);
    }
  };

  const handleDeleteBook = (bookId: string) => {
    setBooks(books.filter(book => book.id !== bookId));
  };

  const handleEditBookTitle = (bookId: string, newTitle: string) => {
    setBooks(books.map(book => 
      book.id === bookId ? { ...book, title: newTitle } : book
    ));
  };

  const handleReorderBooks = (draggedId: string, targetId: string) => {
    const draggedIndex = books.findIndex(book => book.id === draggedId);
    const targetIndex = books.findIndex(book => book.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newBooks = [...books];
    const [movedBook] = newBooks.splice(draggedIndex, 1);
    newBooks.splice(targetIndex, 0, movedBook);
    
    setBooks(newBooks);
  };

  // Listen for IPC messages from the main process
  useEffect(() => {
    console.log('Setting up IPC listeners');
    console.log('Window object:', window);
    console.log('Window.electron:', (window as any).electron);
    
    const electron = (window as any).electron;
    if (electron && electron.ipcRenderer) {
      console.log('IPC renderer available, setting up listener');
      const handler = (importedBooks: Book[]) => {
        console.log('Received books from main process:', importedBooks);
        setBooks(prevBooks => [...prevBooks, ...importedBooks]);
      };
      
      electron.ipcRenderer.on('import-books-result', handler);
      
      // Cleanup listener on component unmount
      return () => {
        console.log('Cleaning up IPC listeners');
        electron.ipcRenderer.removeListener('import-books-result', handler);
      };
    } else {
      console.warn('Electron IPC renderer not available');
    }
  }, []);

  return (
    <div className="page" id="book-shelf">
      <header>
        <h1>书架</h1>
        <button id="import-btn" onClick={handleImportBooks}>导入书籍</button>
      </header>
      
      <div id="books-container">
        {books.map((book, index) => (
          <BookItem
            key={book.id}
            book={book}
            index={index}
            onBookSelect={onBookSelect}
            onDelete={handleDeleteBook}
            onEditTitle={handleEditBookTitle}
            onReorder={handleReorderBooks}
          />
        ))}
      </div>
    </div>
  );
};

export default BookShelf;