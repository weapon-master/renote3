import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book, Annotation } from '../../types';
import EpubReader from './components/EpubReader';
import NotesView from '../../components/NotesView';
import './Reader.css';

const Reader: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotesView, setShowNotesView] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [notesViewWidth, setNotesViewWidth] = useState(() => {
    const saved = localStorage.getItem('notes-view-width');
    return saved ? parseInt(saved, 10) : 400;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [showHeader, setShowHeader] = useState(false);

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
            setAnnotations(foundBook.annotations || []);
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

  // Load annotations from database when book changes
  useEffect(() => {
    const loadAnnotations = async () => {
      if (book && window.electron?.db?.getAnnotationsByBookId) {
        try {
          const loadedAnnotations = await window.electron.db.getAnnotationsByBookId(book.id);
          setAnnotations(loadedAnnotations);
        } catch (error) {
          console.error('Failed to load annotations:', error);
        }
      }
    };
    
    loadAnnotations();
  }, [book?.id]);

  const handleBack = () => {
    navigate('/bookshelf');
  };

  const handleNotesViewToggle = () => {
    setShowNotesView(!showNotesView);
  };

  const handleCardClick = (annotation: Annotation) => {
    // Navigate to the annotation location in the reader
    if ((window as any).navigateToAnnotation) {
      (window as any).navigateToAnnotation(annotation);
    }
  };

  const handleAnnotationsChange = (newAnnotations: Annotation[]) => {
    setAnnotations(newAnnotations);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const containerWidth = window.innerWidth;
    const minWidth = 200;
    const maxWidth = containerWidth * 0.8;
    const newWidth = containerWidth - e.clientX;
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setNotesViewWidth(newWidth);
      localStorage.setItem('notes-view-width', newWidth.toString());
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleMouseEnter = () => {
    setShowHeader(true);
  };

  const handleMouseLeave = () => {
    setShowHeader(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing]);

  if (isLoading) {
    return (
      <div 
        className="page" 
        id="reader"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <header className={`reader-header ${showHeader ? 'show' : 'hide'}`}>
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
      <div 
        className="page" 
        id="reader"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <header className={`reader-header ${showHeader ? 'show' : 'hide'}`}>
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
    <div 
      className="page" 
      id="reader"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleMouseLeave}
    >
      <header className={`reader-header ${showHeader ? 'show' : 'hide'}`}>
        <button id="back-btn" onClick={handleBack}>返回书架</button>
        <h1 id="reader-title">{book.title}</h1>
        <button 
          id="notes-toggle-btn" 
          onClick={handleNotesViewToggle}
          className={showNotesView ? 'active' : ''}
        >
          {showNotesView ? '📝 隐藏笔记' : '📝 显示笔记'}
        </button>
      </header>
      <div id="reader-content" className={`${showNotesView ? 'with-notes' : ''} ${isResizing ? 'resizing' : ''}`}>
        <div className="reader-main">
          {book.filePath.toLowerCase().endsWith('.epub') ? (
            <EpubReader 
              book={book} 
              onAnnotationClick={handleCardClick}
              onAnnotationsChange={handleAnnotationsChange}
            />
          ) : (
            <div className="unsupported-format">
              <p>📖 书籍 "{book.title}" 的内容将显示在这里。</p>
              <p>文件路径: {book.filePath}</p>
              <p className="format-info">
                当前文件格式: {book.filePath.split('.').pop()?.toUpperCase()}
              </p>
              <p className="support-info">
                目前支持 EPUB 格式的阅读。其他格式将在后续版本中支持。
              </p>
            </div>
          )}
        </div>
        {showNotesView && (
          <>
            <div 
              className="resize-handle"
              onMouseDown={handleResizeStart}
              onDoubleClick={() => {
                setNotesViewWidth(400);
                localStorage.setItem('notes-view-width', '400');
              }}
              style={{ cursor: 'col-resize' }}
              title="Drag to resize, double-click to reset"
            />
            <NotesView 
              annotations={annotations}
              onCardClick={handleCardClick}
              isVisible={showNotesView}
              width={notesViewWidth}
              bookId={bookId!}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Reader;