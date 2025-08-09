import React, { useMemo, useState } from 'react';
import { Book } from '../types';
import { ReactReader } from 'react-reader';
import './EpubReader.css';

interface EpubReaderProps {
  book: Book;
}

const EpubReader: React.FC<EpubReaderProps> = ({ book }) => {
  const [location, setLocation] = useState<string | number>(0);

  const epubUrl = useMemo(() => {
    if (window.electron?.epub?.getLocalFileUrl) {
      return window.electron.epub.getLocalFileUrl(book.filePath);
    }
    return undefined;
  }, [book.filePath]);

  const handleLocationChange = (epubcfi: string) => {
    setLocation(epubcfi);
  };

  if (!epubUrl) {
    return (
      <div className="epub-error">
        <p>无法生成EPUB读取地址</p>
        <p>文件路径: {book.filePath}</p>
      </div>
    );
  }

  return (
    <div className="epub-reader">
      <ReactReader
        url={epubUrl}
        location={location}
        locationChanged={handleLocationChange}
        swipeable
        showToc
      />
    </div>
  );
};

export default EpubReader;
