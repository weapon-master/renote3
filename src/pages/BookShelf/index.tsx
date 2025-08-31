import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookItem from './components/BookItem';
import { Book } from '../../types';
import { useBookStore } from '@/store/book';
import Button from '@/components/base/button';
import ImportBook from '@/components/base/button/ImportBook';
import Loading from '@/components/base/Loading';
import Empty from '@/components/base/Empty';

const BookShelf: React.FC = () => {
  //   const [books, setBooks] = useState<Book[]>([]);
  const books = useBookStore((state) => state.books);
  const loadBooks = useBookStore((state) => state.loadBooks);
  const isLoading = useBookStore((state) => state.loading);
  const importBooks = useBookStore((state) => state.importBooks);
  const deleteBook = useBookStore((state) => state.deleteBook);
  const updateBook = useBookStore((state) => state.updateBook);
  const navigate = useNavigate();

  // 组件挂载时加载书籍数据
  useEffect(() => {
    loadBooks();
  }, []);

  // 移除示例书籍的useEffect，因为我们现在从本地存储加载

  const handleImportBooks = () => {
    console.log('Window object:', window);
    console.log('Window.electron:', (window as any).electron);

    const electron = (window as any).electron;
    if (electron && electron.ipcRenderer) {
      console.log('Sending import-books message to main process');
      electron.ipcRenderer.send('import-books');
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      await deleteBook(bookId);
    } catch (error) {
      console.error('删除书籍时出错:', error);
    }
  };

  const handleEditBookTitle = async (bookId: string, newTitle: string) => {
    try {
      const electron = (window as any).electron;
      await updateBook(bookId, { title: newTitle });
    } catch (error) {
      console.error('更新书籍时出错:', error);
    }
  };

  const handleReorderBooks = (draggedId: string, targetId: string) => {
    const draggedIndex = books.findIndex((book) => book.id === draggedId);
    const targetIndex = books.findIndex((book) => book.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newBooks = [...books];
    const [movedBook] = newBooks.splice(draggedIndex, 1);
    newBooks.splice(targetIndex, 0, movedBook);
    // reorder is disabled
    // setBooks(newBooks);
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
        importBooks(importedBooks);
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

  const handleBookSelect = (book: Book) => {
    navigate(`/reader/${encodeURIComponent(book.id)}`);
  };

  if (isLoading) {
    return (
      <div className="h-full" id="book-shelf">
        <Loading text="Loading..." />
      </div>
    );
  }
  if (books.length === 0) {
    return (
      <div className="h-full" id="book-shelf">
        <Empty text="Book Shelf is empty. Import books now!" />
      </div>
    );
  }
  return (
    <div className="h-full" id="book-shelf">
      <div
        id="books-container"
        className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5 py-5 content-start justify-center min-h-fit overflow-y-auto max-w-full"
      >
        {books.map((book, index) => (
          <BookItem
            key={book.id}
            book={book}
            index={index}
            onBookSelect={handleBookSelect}
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
