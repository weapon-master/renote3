import React from 'react';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/bookshelf');
  };

  return (
    <div className="flex-1 flex flex-col p-5 min-h-0 overflow-hidden max-w-4xl mx-auto" id="settings">
      <header className="flex items-center mb-7 border-b-2 border-gray-300 pb-4">
        <button 
          className="bg-blue-500 text-white border-none py-2.5 px-5 rounded cursor-pointer text-base transition-colors hover:bg-blue-600"
          id="back-btn" 
          onClick={handleBack}
        >
          返回书架
        </button>
        <h1 className="m-0 ml-5 text-gray-800 text-3xl">设置</h1>
      </header>
      <div className="bg-white rounded-lg p-7 shadow-lg" id="settings-content">
        <div className="mb-10 pb-7 border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0">
          <h2 className="text-gray-800 mb-5 text-2xl border-l-4 border-blue-500 pl-4">阅读设置</h2>
          <div className="flex items-center mb-5 p-4 bg-gray-50 rounded-lg transition-colors hover:bg-gray-200">
            <label htmlFor="font-size" className="flex-1 font-medium text-gray-600 mr-5">字体大小:</label>
            <select 
              id="font-size" 
              defaultValue="medium"
              className="p-2 px-3 border border-gray-400 rounded bg-white text-sm min-w-30 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(0,123,255,0.25)]"
            >
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
          </div>
          <div className="flex items-center mb-5 p-4 bg-gray-50 rounded-lg transition-colors hover:bg-gray-200">
            <label htmlFor="theme" className="flex-1 font-medium text-gray-600 mr-5">主题:</label>
            <select 
              id="theme" 
              defaultValue="light"
              className="p-2 px-3 border border-gray-400 rounded bg-white text-sm min-w-30 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(0,123,255,0.25)]"
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="sepia">护眼</option>
            </select>
          </div>
        </div>
        
        <div className="mb-10 pb-7 border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0">
          <h2 className="text-gray-800 mb-5 text-2xl border-l-4 border-blue-500 pl-4">书架设置</h2>
          <div className="flex items-center mb-5 p-4 bg-gray-50 rounded-lg transition-colors hover:bg-gray-200">
            <label htmlFor="sort-by" className="flex-1 font-medium text-gray-600 mr-5">排序方式:</label>
            <select 
              id="sort-by" 
              defaultValue="title"
              className="p-2 px-3 border border-gray-400 rounded bg-white text-sm min-w-30 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(0,123,255,0.25)]"
            >
              <option value="title">按标题</option>
              <option value="date">按日期</option>
              <option value="size">按大小</option>
            </select>
          </div>
        </div>

        <div className="mb-10 pb-7 border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0">
          <h2 className="text-gray-800 mb-5 text-2xl border-l-4 border-blue-500 pl-4">关于</h2>
          <div className="text-center text-gray-600 leading-relaxed">
            <p className="my-1">Renote3 - 电子书阅读器</p>
            <p className="my-1">版本: 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
