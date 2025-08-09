import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../components/Navigation.css';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => navigate('/bookshelf')}>
          <span className="brand-icon">📚</span>
          <span className="brand-text">Renote3</span>
        </div>
        
        <div className="nav-links">
          <button 
            className={`nav-link ${isActive('/bookshelf') ? 'active' : ''}`}
            onClick={() => navigate('/bookshelf')}
          >
            书架
          </button>
          <button 
            className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
          >
            设置
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
