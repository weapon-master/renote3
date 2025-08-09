import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book } from '../types';
import '../components/Reader.css';

const Reader: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBook = async () => {
      if (!bookId) {
        navigate('/bookshelf');
        return;
      }

      try {
        setIsLoading(true);
        const electron = (window as any).electron;
        if (electron && electron.books) {
          const savedBooks = await electron.books.load();
          const foundBook = savedBooks.find((b: Book) => b.id === bookId);
          if (foundBook) {
            setBook(foundBook);
          } else {
            console.error('未找到指定的书籍');
            navigate('/bookshelf');
          }
        } else {
          console.error('Electron API不可用');
          navigate('/bookshelf');
        }
      } catch (error) {
        console.error('加载书籍时出错:', error);
        navigate('/bookshelf');
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();
  }, [bookId, navigate]);

  const handleBack = () => {
    navigate('/bookshelf');
  };

  if (isLoading) {
    return (
      <div className="page" id="reader">
        <header>
          <button id="back-btn" onClick={handleBack}>返回书架</button>
          <h1>加载中...</h1>
        </header>
        <div id="reader-content">
          <p>正在加载书籍...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="page" id="reader">
        <header>
          <button id="back-btn" onClick={handleBack}>返回书架</button>
          <h1>书籍阅读器</h1>
        </header>
        <div id="reader-content">
          <p>未找到书籍。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page" id="reader">
      <header>
        <button id="back-btn" onClick={handleBack}>返回书架</button>
        <h1 id="reader-title">{book.title}</h1>
      </header>
      <div id="reader-content">
        <p>书籍 "{book.title}" 的内容将显示在这里。</p>
        <p>文件路径: {book.filePath}</p>
      </div>
    </div>
  );
};

export default Reader;