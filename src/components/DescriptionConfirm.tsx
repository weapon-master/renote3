import React from 'react';


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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-2xl max-h-4/5 overflow-hidden">
        <div className="flex justify-between items-center p-5 pb-6 border-b border-gray-200">
          <h3 className="m-0 text-lg font-semibold text-gray-800">确认书籍描述</h3>
          <button 
            className="bg-none border-none text-2xl cursor-pointer text-gray-500 p-0 w-7.5 h-7.5 flex items-center justify-center rounded transition-colors hover:bg-gray-100"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="p-5 pt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 px-5">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="m-0 text-gray-600 text-sm">正在生成书籍描述...</p>
            </div>
          ) : (
            <>
              <p className="m-0 mb-4 text-gray-600 text-sm leading-relaxed">以下是基于所选章节生成的书籍描述：</p>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-5 text-sm leading-relaxed text-gray-800 max-h-50 overflow-y-auto">
                {description}
              </div>
              <div className="flex gap-3 justify-end">
                <button 
                  className="py-2.5 px-5 border-none rounded-md text-sm font-medium cursor-pointer transition-all bg-green-500 text-white hover:bg-green-600"
                  onClick={onAccept}
                >
                  接受描述
                </button>
                <button 
                  className="py-2.5 px-5 border-none rounded-md text-sm font-medium cursor-pointer transition-all bg-gray-500 text-white hover:bg-gray-600"
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
