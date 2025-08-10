import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookItem from './BookItem';
import { Book } from '../types';
import '../components/BookShelf.css';

const BookShelf: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // 从数据库加载书籍数据
  const loadBooksFromDatabase = async () => {
    try {
      setIsLoading(true);
      const electron = (window as any).electron;
      if (electron && electron.books) {
        const savedBooks = await electron.books.load();
        console.log('从数据库加载的书籍:', savedBooks);
        setBooks(savedBooks || []);
      }
    } catch (error) {
      console.error('加载书籍数据时出错:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 组件挂载时加载书籍数据
  useEffect(() => {
    loadBooksFromDatabase();
  }, []);

  // 移除示例书籍的useEffect，因为我们现在从本地存储加载

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
        id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: `新书籍 ${books.length + 1}`,
        filePath: `/path/to/newbook${books.length + 1}.epub`
      };
      
      // 检查是否已经存在相同的书籍
      const existingBook = books.find(book => book.title === newBook.title);
      if (!existingBook) {
        const updatedBooks = [...books, newBook];
        setBooks(updatedBooks);
        // 书籍现在通过数据库自动保存，无需手动保存
      } else {
        console.log('Book already exists, not adding duplicate');
      }
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      const electron = (window as any).electron;
      if (electron && electron.books) {
        const result = await electron.books.delete(bookId);
        if (result.success) {
          setBooks(books.filter(book => book.id !== bookId));
        } else {
          console.error('删除书籍失败:', result.error);
        }
      } else {
        // 如果没有Electron API，直接更新本地状态
        setBooks(books.filter(book => book.id !== bookId));
      }
    } catch (error) {
      console.error('删除书籍时出错:', error);
    }
  };

  const handleEditBookTitle = async (bookId: string, newTitle: string) => {
    try {
      const electron = (window as any).electron;
      if (electron && electron.books) {
        const result = await electron.books.update(bookId, { title: newTitle });
        if (result.success) {
          setBooks(books.map(book => 
            book.id === bookId ? { ...book, title: newTitle } : book
          ));
        } else {
          console.error('更新书籍失败:', result.error);
        }
      } else {
        // 如果没有Electron API，直接更新本地状态
        setBooks(books.map(book => 
          book.id === bookId ? { ...book, title: newTitle } : book
        ));
      }
    } catch (error) {
      console.error('更新书籍时出错:', error);
    }
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
        setBooks(prevBooks => {
          // 过滤掉已经存在的书籍（基于filePath）
          const existingFilePaths = new Set(prevBooks.map(book => book.filePath));
          const newBooks = importedBooks.filter(book => !existingFilePaths.has(book.filePath));
          
          if (newBooks.length > 0) {
            console.log(`Adding ${newBooks.length} new books to shelf`);
            return [...prevBooks, ...newBooks];
          } else {
            console.log('No new books to add');
            return prevBooks;
          }
        });
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
      <div className="page" id="book-shelf">
        <header>
          <h1>书架</h1>
          <button id="import-btn" onClick={handleImportBooks}>导入书籍</button>
        </header>
        <div className="loading">正在加载书籍...</div>
      </div>
    );
  }

  return (
    <div className="page" id="book-shelf">
      <header>
        <h1>书架</h1>
        <div className="header-buttons">
          <button id="import-btn" onClick={handleImportBooks}>导入书籍</button>
          <button id="settings-btn" onClick={() => navigate('/settings')}>设置</button>
        </div>
      </header>
      
      <div id="books-container">
        {books.length === 0 ? (
          <div className="empty-state">
            <p>书架还是空的，点击"导入书籍"开始添加你的第一本书吧！</p>
          </div>
        ) : (
          books.map((book, index) => (
            <BookItem
              key={book.id}
              book={book}
              index={index}
              onBookSelect={handleBookSelect}
              onDelete={handleDeleteBook}
              onEditTitle={handleEditBookTitle}
              onReorder={handleReorderBooks}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default BookShelf;