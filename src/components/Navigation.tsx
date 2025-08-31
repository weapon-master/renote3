import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NavBookShelf from './base/button/NavBookShelf';
import NavSettings from './base/button/NavSettings';
import ImportBook from './base/button/ImportBook';
import ToggleNoteView from './base/button/ToggleNoteView';
const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  return (
    <nav className="navigation">
      <div className="nav-container flex justify-between items-center border-b border-gray-200">
        <div
          className="nav-brand text-2xl font-bold"
          onClick={() => navigate('/bookshelf')}
        >
          <span className="brand-icon">📚</span>
          <span className="brand-text">Renote3</span>
        </div>

        <div className="nav-links flex items-center gap-2 px-4 py-2">
          { pathname === '/bookshelf' && <ImportBook /> }
          { pathname.startsWith('/reader') && <ToggleNoteView /> }
          { pathname !== '/bookshelf' && <NavBookShelf /> }
          <NavSettings   />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
