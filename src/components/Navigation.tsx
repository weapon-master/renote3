import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from './base/button';
import { GiBookshelf } from 'react-icons/gi';
import { IoIosSettings } from 'react-icons/io';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

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
          <Button
            onClick={() => navigate('/bookshelf')}
            type="icon"
            icon={<GiBookshelf size={24} />}
          />

          <Button
            type="icon"
            onClick={() => navigate('/settings')}
            icon={<IoIosSettings size={24} />}
          />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
