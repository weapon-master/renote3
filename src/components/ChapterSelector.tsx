import React from 'react';


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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-lg max-h-4/5 overflow-hidden">
        <div className="flex justify-between items-center p-5 pb-6 border-b border-gray-200">
          <h3 className="m-0 text-lg font-semibold text-gray-800">选择章节生成书籍描述</h3>
          <button 
            className="bg-none border-none text-2xl cursor-pointer text-gray-500 p-0 w-7.5 h-7.5 flex items-center justify-center rounded transition-colors hover:bg-gray-100"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="p-5 pt-6">
          <p className="m-0 mb-4 text-gray-600 text-sm leading-relaxed">请选择一个章节来生成书籍描述（建议选择前言、序言或第一章）：</p>
          <div className="max-h-100 overflow-y-auto">
            {chapters.map((chapter) => (
              <div
                key={chapter.index}
                className="flex items-center p-3 px-4 border border-gray-200 rounded-md mb-2 cursor-pointer transition-all hover:bg-gray-50 hover:border-blue-500 last:mb-0"
                onClick={() => onSelectChapter(chapter)}
              >
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mr-3 flex-shrink-0">{chapter.index}</span>
                <span className="text-sm text-gray-800 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{chapter.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterSelector;
