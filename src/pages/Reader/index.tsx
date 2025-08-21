import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book, Annotation } from '../../types';
import EpubReader from './components/EpubReader';
import NotesView from '../../components/NotesView';
import './Reader.css';
import { useBookStore } from '@/store/book';
import { useAnnotationStore } from '@/store/annotation';

const Reader: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const book = useBookStore(state => state.currBook);
  const isLoading = useBookStore(state => state.loading)
  const loadBooks = useBookStore(state => state.loadBooks)
  const savedBooks = useBookStore(state => state.books)
  const selectBook = useBookStore(state => state.selectBook)
  const annotations = useAnnotationStore(state => state.annotations)
  const loadAnnotationsByBook = useAnnotationStore(state => state.loadAnnotationsByBook)
  // const [book, setBook] = useState<Book | null>(null);
  const [showNotesView, setShowNotesView] = useState(false);
  // const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [notesViewWidth, setNotesViewWidth] = useState(() => {
    const saved = localStorage.getItem('notes-view-width');
    return saved ? parseInt(saved, 10) : 400;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [showHeader, setShowHeader] = useState(false);

  useEffect(() => {
    loadBooks()
  }, []);
  useEffect(() => {
    book?.id && loadAnnotationsByBook(book.id)
  }, [book])

  useEffect(() => {
    const loadBook = async () => {
      if (!bookId) {
        navigate('/bookshelf');
        return;
      }
      const foundBook = savedBooks.find((b: Book) => b.id === bookId);
      if (foundBook) {
        selectBook(bookId);
      } else {
        console.error('未找到指定的书籍');
        navigate('/bookshelf');
      }
    };

    loadBook();
  }, [bookId, savedBooks, navigate]);


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
    console.log('update annotations', newAnnotations)
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