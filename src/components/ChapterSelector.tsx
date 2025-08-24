import React from 'react';
import './ChapterSelector.css';

interface Chapter {
  index: number;
  title: string;
  href: string;
}

interface ChapterSelectorProps {
  isOpen: boolean;
  chapters: Chapter[];
  onSelectChapter: (chapter: Chapter) => void;
  onClose: () => void;
}

const ChapterSelector: React.FC<ChapterSelectorProps> = ({
  isOpen,
  chapters,
  onSelectChapter,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="chapter-selector-overlay">
      <div className="chapter-selector-modal">
        <div className="chapter-selector-header">
          <h3>选择章节生成书籍描述</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="chapter-selector-content">
          <p>请选择一个章节来生成书籍描述（建议选择前言、序言或第一章）：</p>
          <div className="chapter-list">
            {chapters.map((chapter) => (
              <div
                key={chapter.index}
                className="chapter-item"
                onClick={() => onSelectChapter(chapter)}
              >
                <span className="chapter-index">{chapter.index}</span>
                <span className="chapter-title">{chapter.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterSelector;
