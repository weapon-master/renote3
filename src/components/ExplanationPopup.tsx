import React, { useState } from 'react';
import './ExplanationPopup.css';

interface ExplanationPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onAccept: (explanation: string) => void;
  onReject: () => void;
  onRegenerate: () => void;
  explanation: string;
  isLoading: boolean;
  selectedText: string;
}

const ExplanationPopup: React.FC<ExplanationPopupProps> = ({
  isVisible,
  onClose,
  onAccept,
  onReject,
  onRegenerate,
  explanation,
  isLoading,
  selectedText,
}) => {
  if (!isVisible) return null;

  return (
    <div className="explanation-popup-overlay" onClick={onClose}>
      <div className="explanation-popup" onClick={(e) => e.stopPropagation()}>
        <div className="explanation-popup-header">
          <h3>AI 解释</h3>
          <button className="explanation-popup-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="explanation-popup-content">
          <div className="selected-text-section">
            <h4>选中的文本：</h4>
            <div className="selected-text">{selectedText}</div>
          </div>
          
          <div className="explanation-section">
            <h4>解释内容：</h4>
            {isLoading ? (
              <div className="loading-indicator">
                <div className="spinner"></div>
                <span>正在生成解释...</span>
              </div>
            ) : (
              <div className="explanation-text">{explanation}</div>
            )}
          </div>
        </div>
        
        <div className="explanation-popup-actions">
          <button 
            className="explanation-btn accept-btn"
            onClick={() => onAccept(explanation)}
            disabled={isLoading || !explanation}
          >
            接受并创建笔记
          </button>
          <button 
            className="explanation-btn reject-btn"
            onClick={onReject}
            disabled={isLoading}
          >
            拒绝
          </button>
          <button 
            className="explanation-btn regenerate-btn"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            重新生成
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExplanationPopup;
