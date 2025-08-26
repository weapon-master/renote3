import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import BookShelf from './pages/BookShelf';
import Reader from './pages/Reader';
import Settings from './pages/Settings';

const App: React.FC = () => {

  return (
    <Router>
      <div className="flex flex-col h-screen font-sans m-0 p-0 bg-gray-100">
        <Navigation />
        <Routes>
          <Route path="/" element={<Navigate to="/bookshelf" replace />} />
          <Route path="/bookshelf" element={<BookShelf />} />
          <Route path="/reader/:bookId" element={<Reader />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        

      </div>
    </Router>
  );
};

export default App;