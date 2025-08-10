import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import BookShelf from './components/BookShelf';
import Reader from './components/Reader';
import Settings from './components/Settings';
import MigrationDialog from './components/MigrationDialog';
import './App.css';

const App: React.FC = () => {
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);

  useEffect(() => {
    // Check if migration is needed when app starts
    const checkMigration = async () => {
      try {
        const migrationInfo = await window.electron.migration.check();
        if (migrationInfo.needsMigration) {
          setShowMigrationDialog(true);
        }
      } catch (error) {
        console.error('Failed to check migration status:', error);
      }
    };

    checkMigration();
  }, []);

  const handleMigrationComplete = () => {
    // Refresh the page to ensure all components use the new database
    window.location.reload();
  };

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
        
        <MigrationDialog
          isOpen={showMigrationDialog}
          onClose={() => setShowMigrationDialog(false)}
          onMigrationComplete={handleMigrationComplete}
        />
      </div>
    </Router>
  );
};

export default App;