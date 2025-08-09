import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/Settings.css';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/bookshelf');
  };

  return (
    <div className="page" id="settings">
      <header>
        <button id="back-btn" onClick={handleBack}>返回书架</button>
        <h1>设置</h1>
      </header>
      <div id="settings-content">
        <div className="settings-section">
          <h2>阅读设置</h2>
          <div className="setting-item">
            <label htmlFor="font-size">字体大小:</label>
            <select id="font-size" defaultValue="medium">
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
          </div>
          <div className="setting-item">
            <label htmlFor="theme">主题:</label>
            <select id="theme" defaultValue="light">
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="sepia">护眼</option>
            </select>
          </div>
        </div>
        
        <div className="settings-section">
          <h2>书架设置</h2>
          <div className="setting-item">
            <label htmlFor="sort-by">排序方式:</label>
            <select id="sort-by" defaultValue="title">
              <option value="title">按标题</option>
              <option value="date">按日期</option>
              <option value="size">按大小</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2>关于</h2>
          <p>Renote3 - 电子书阅读器</p>
          <p>版本: 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
