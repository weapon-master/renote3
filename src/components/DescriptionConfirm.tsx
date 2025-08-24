import React from 'react';
import './DescriptionConfirm.css';

interface DescriptionConfirmProps {
  isOpen: boolean;
  description: string;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

const DescriptionConfirm: React.FC<DescriptionConfirmProps> = ({
  isOpen,
  description,
  onAccept,
  onReject,
  onClose,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="description-confirm-overlay">
      <div className="description-confirm-modal">
        <div className="description-confirm-header">
          <h3>确认书籍描述</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="description-confirm-content">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>正在生成书籍描述...</p>
            </div>
          ) : (
            <>
              <p>以下是基于所选章节生成的书籍描述：</p>
              <div className="description-text">
                {description}
              </div>
              <div className="description-actions">
                <button 
                  className="accept-button" 
                  onClick={onAccept}
                >
                  接受描述
                </button>
                <button 
                  className="reject-button" 
                  onClick={onReject}
                >
                  重新生成
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DescriptionConfirm;
