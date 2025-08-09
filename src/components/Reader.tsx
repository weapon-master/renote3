import React from 'react';
import { Book } from '../types';
import '../components/Reader.css';

interface ReaderProps {
  book: Book | null;
  onBack: () => void;
}

const Reader: React.FC<ReaderProps> = ({ book, onBack }) => {
  if (!book) {
    return (
      <div className="page" id="reader">
        <header>
          <button id="back-btn" onClick={onBack}>返回书架</button>
          <h1>书籍阅读器</h1>
        </header>
        <div id="reader-content">
          <p>未选择书籍。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page" id="reader">
      <header>
        <button id="back-btn" onClick={onBack}>返回书架</button>
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