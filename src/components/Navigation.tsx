import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 flex justify-between items-center h-15">
        <div 
          className="flex items-center cursor-pointer transition-transform hover:scale-105"
          onClick={() => navigate('/bookshelf')}
        >
          <span className="text-2xl mr-2.5">📚</span>
          <span className="text-xl font-bold text-gray-800">Renote3</span>
        </div>
        
        <div className="flex gap-2.5">
          <button 
            className={`px-4 py-2 rounded-md cursor-pointer text-sm font-medium transition-all ${
              isActive('/bookshelf') 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-800'
            }`}
            onClick={() => navigate('/bookshelf')}
          >
            书架
          </button>
          <button 
            className={`px-4 py-2 rounded-md cursor-pointer text-sm font-medium transition-all ${
              isActive('/settings') 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-800'
            }`}
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
