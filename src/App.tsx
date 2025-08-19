import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import BookShelf from './pages/BookShelf';
import Reader from './pages/Reader';
import Settings from './pages/Settings';
import './App.css';

const App: React.FC = () => {

  return (
    <Router>
      <div className="app">
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