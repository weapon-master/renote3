import React from 'react';


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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-11/12 max-w-2xl max-h-4/5 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 pb-6 border-b border-gray-200 bg-gray-50">
          <h3 className="m-0 text-lg font-semibold text-gray-800">AI 解释</h3>
          <button 
            className="bg-none border-none text-xl cursor-pointer text-gray-500 p-1 rounded transition-all hover:bg-gray-200 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-5">
            <h4 className="m-0 mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wider">选中的文本：</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm leading-relaxed text-gray-700 max-h-25 overflow-y-auto">{selectedText}</div>
          </div>
          
          <div className="mb-5">
            <h4 className="m-0 mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wider">解释内容：</h4>
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 py-10 px-5 text-gray-500 text-sm">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                <span>正在生成解释...</span>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm leading-relaxed text-gray-800 min-h-30 whitespace-pre-wrap">{explanation}</div>
            )}
          </div>
        </div>
        
        <div className="flex gap-3 p-5 pt-6 border-t border-gray-200 bg-gray-50">
          <button 
            className="flex-1 py-3 px-4 border-none rounded-lg text-sm font-medium cursor-pointer transition-all text-center bg-green-500 text-white hover:bg-green-600 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => onAccept(explanation)}
            disabled={isLoading || !explanation}
          >
            接受并创建笔记
          </button>
          <button 
            className="flex-1 py-3 px-4 border-none rounded-lg text-sm font-medium cursor-pointer transition-all text-center bg-red-500 text-white hover:bg-red-600 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onReject}
            disabled={isLoading}
          >
            拒绝
          </button>
          <button 
            className="flex-1 py-3 px-4 border-none rounded-lg text-sm font-medium cursor-pointer transition-all text-center bg-blue-500 text-white hover:bg-blue-600 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
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
