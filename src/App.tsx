import React, { useState } from 'react';
import BookShelf from './components/BookShelf';
import Reader from './components/Reader';
import './App.css';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'bookshelf' | 'reader'>('bookshelf');
  const [selectedBook, setSelectedBook] = useState<any>(null);

  const showBookShelf = () => {
    setCurrentView('bookshelf');
  };

  const showReader = (book: any) => {
    setSelectedBook(book);
    setCurrentView('reader');
  };

  return (
    <div className="app">
      {currentView === 'bookshelf' ? (
        <BookShelf onBookSelect={showReader} />
      ) : (
        <Reader book={selectedBook} onBack={showBookShelf} />
      )}
    </div>
  );
};

export default App;