import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book, Annotation } from '../../types';
import EpubReader from './components/EpubReader';
import NotesView from '../../components/NotesView';
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
    e.stopPropagation();
    console.log('Resize started');
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;

    // 获取容器的位置信息
    const container = document.getElementById('reader-content');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const containerLeft = containerRect.left;
    const containerWidth = containerRect.width;
    
    // 计算NotesView的新宽度
    const newWidth = containerLeft + containerWidth - e.clientX;
    const minWidth = 200;
    const maxWidth = containerWidth * 0.8;

    console.log('Resize move:', { 
      clientX: e.clientX, 
      containerLeft, 
      containerWidth, 
      newWidth, 
      minWidth, 
      maxWidth 
    });

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
        className="flex-1 flex flex-col p-5 min-h-0 overflow-hidden relative"
        id="reader"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <header className={`flex items-center gap-4 p-4 bg-white border-b border-gray-300 flex-shrink-0 absolute top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out shadow-lg ${
          showHeader ? 'translate-y-0' : '-translate-y-full'
        }`}>
          <button 
            className="bg-blue-500 border-none text-white py-2.5 px-5 text-center no-underline inline-block text-base m-1 cursor-pointer rounded hover:bg-blue-600"
            id="back-btn" 
            onClick={handleBack}
          >
            返回书架
          </button>
          <h1 className="m-0 text-2xl">加载中...</h1>
        </header>
        <div className="flex-1 bg-white rounded-lg p-5 shadow-md overflow-y-auto flex flex-col mt-0 transition-mt duration-300 ease-in-out" id="reader-content">
          <p>正在加载书籍...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div
        className="flex-1 flex flex-col p-5 min-h-0 overflow-hidden relative"
        id="reader"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <header className={`flex items-center gap-4 p-4 bg-white border-b border-gray-300 flex-shrink-0 absolute top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out shadow-lg ${
          showHeader ? 'translate-y-0' : '-translate-y-full'
        }`}>
          <button 
            className="bg-blue-500 border-none text-white py-2.5 px-5 text-center no-underline inline-block text-base m-1 cursor-pointer rounded hover:bg-blue-600"
            id="back-btn" 
            onClick={handleBack}
          >
            返回书架
          </button>
          <h1 className="m-0 text-2xl">书籍阅读器</h1>
        </header>
        <div className="flex-1 bg-white rounded-lg p-5 shadow-md overflow-y-auto flex flex-col mt-0 transition-mt duration-300 ease-in-out" id="reader-content">
          <p>未找到书籍。</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col p-5 min-h-0 overflow-hidden relative before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-15 before:h-1 before:bg-black before:bg-opacity-10 before:rounded-b before:z-40 before:opacity-0 before:transition-opacity before:duration-300 before:ease-in-out hover:before:opacity-100"
      id="reader"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleMouseLeave}
    >
      <header className={`flex items-center gap-4 p-4 bg-white border-b border-gray-300 flex-shrink-0 absolute top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out shadow-lg ${
        showHeader ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <button 
          className="bg-blue-500 border-none text-white py-2.5 px-5 text-center no-underline inline-block text-base m-1 cursor-pointer rounded hover:bg-blue-600"
          id="back-btn" 
          onClick={handleBack}
        >
          返回书架
        </button>
        <h1 className="m-0 text-2xl" id="reader-title">{book.title}</h1>
        <button
          className={`ml-auto px-4 py-2 bg-blue-500 text-white border-none rounded cursor-pointer text-sm transition-colors hover:bg-blue-600 ${
            showNotesView ? 'bg-green-500 hover:bg-green-600' : ''
          }`}
          id="notes-toggle-btn"
          onClick={handleNotesViewToggle}
        >
          {showNotesView ? '📝 隐藏笔记' : '📝 显示笔记'}
        </button>
      </header>
      <div className={`flex-1 bg-white rounded-lg shadow-md overflow-hidden flex mt-0 transition-all duration-300 ease-in-out ${
        showNotesView ? 'flex-row p-0 gap-0' : 'flex-col'
      } ${isResizing ? 'select-none' : ''}`} id="reader-content">
        <div className="flex-1 overflow-hidden h-full">
          {book.filePath.toLowerCase().endsWith('.epub') ? (
            <EpubReader
              book={book}
              onAnnotationClick={handleCardClick}
              onAnnotationsChange={handleAnnotationsChange}
            />
          ) : (
            <div className="text-center py-10 px-5 bg-gray-50 rounded-lg m-5">
              <p className="my-2.5 text-gray-700">📖 书籍 "{book.title}" 的内容将显示在这里。</p>
              <p className="my-2.5 text-gray-700">文件路径: {book.filePath}</p>
              <p className="font-bold text-gray-600 font-mono bg-gray-200 py-2 px-4 rounded inline-block">
                当前文件格式: {book.filePath.split('.').pop()?.toUpperCase()}
              </p>
              <p className="text-gray-600 italic max-w-lg mx-auto my-5 leading-relaxed">
                目前支持 EPUB 格式的阅读。其他格式将在后续版本中支持。
              </p>
            </div>
          )}
        </div>
        {showNotesView && (
          <>
            <div
              className="w-2 bg-gray-300 cursor-col-resize relative flex-shrink-0 transition-all duration-200 hover:bg-blue-500 hover:w-3 active:bg-blue-600 group"
              onMouseDown={handleResizeStart}
              onDoubleClick={() => {
                setNotesViewWidth(400);
                localStorage.setItem('notes-view-width', '400');
              }}
              title="拖拽调整大小，双击重置"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-0.5 h-8 bg-gray-400 group-hover:bg-white rounded-full opacity-60 group-hover:opacity-100"></div>
              </div>
            </div>
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