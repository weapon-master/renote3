import React, { useEffect, useState } from 'react';
import { Book } from '../types';
import './EpubReader.css';

interface EpubReaderProps {
  book: Book;
}

interface EpubChapter {
  id: string;
  title: string;
  href: string;
  content: string;
}

interface EpubMetadata {
  title: string;
  creator: string;
  language: string;
  identifier: string;
}

const EpubReader: React.FC<EpubReaderProps> = ({ book }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [metadata, setMetadata] = useState<EpubMetadata | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  useEffect(() => {
    const loadEpubContent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 通过IPC从主进程读取EPUB内容
        console.log('尝试调用EPUB API:', book.filePath);
        console.log('EPUB API可用性:', !!window.electron?.epub?.readContent);
        
        if (!window.electron?.epub?.readContent) {
          throw new Error('EPUB API不可用');
        }
        
        const result = await window.electron.epub.readContent(book.filePath);
        
        if (result.success) {
          setChapters(result.chapters || []);
          setMetadata(result.metadata || null);
          setCurrentChapterIndex(0);
        } else {
          setError(result.error || '无法读取EPUB内容');
        }
      } catch (err) {
        console.error('加载EPUB内容时出错:', err);
        setError('加载EPUB文件时发生错误');
      } finally {
        setIsLoading(false);
      }
    };

    loadEpubContent();
  }, [book.filePath]);

  const handlePreviousChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
    }
  };

  const handleChapterSelect = (index: number) => {
    setCurrentChapterIndex(index);
  };

  if (isLoading) {
    return (
      <div className="epub-loading">
        <div className="loading-spinner"></div>
        <p>正在加载EPUB内容...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="epub-error">
        <p>❌ {error}</p>
        <p>文件路径: {book.filePath}</p>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="epub-error">
        <p>📖 未找到可读取的章节内容</p>
        <p>文件路径: {book.filePath}</p>
      </div>
    );
  }

  const currentChapter = chapters[currentChapterIndex];

  return (
    <div className="epub-reader">
      <div className="epub-header">
        <div className="epub-info">
          <h2>{metadata?.title || book.title}</h2>
          {metadata?.creator && <p className="author">作者: {metadata.creator}</p>}
        </div>
        <div className="epub-navigation">
          <button 
            onClick={handlePreviousChapter} 
            disabled={currentChapterIndex === 0}
            className="nav-btn"
          >
            上一章
          </button>
          <span className="chapter-info">
            第 {currentChapterIndex + 1} 章 / 共 {chapters.length} 章
          </span>
          <button 
            onClick={handleNextChapter} 
            disabled={currentChapterIndex === chapters.length - 1}
            className="nav-btn"
          >
            下一章
          </button>
        </div>
      </div>
      
      <div className="epub-content">
        <div className="chapter-title">
          <h3>{currentChapter.title}</h3>
        </div>
        <div 
          className="chapter-content"
          dangerouslySetInnerHTML={{ __html: currentChapter.content }}
        />
      </div>

      <div className="epub-sidebar">
        <h4>目录</h4>
        <div className="chapter-list">
          {chapters.map((chapter, index) => (
            <button
              key={chapter.id}
              onClick={() => handleChapterSelect(index)}
              className={`chapter-item ${index === currentChapterIndex ? 'active' : ''}`}
              title={chapter.title}
            >
              {chapter.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EpubReader;
