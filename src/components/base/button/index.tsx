import React from 'react';
import clsx from 'clsx';
interface Props {
  type?: 'default' | 'icon' | 'text' | 'link';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onClick: () => void;
}

export default function Button({ children, type = 'default', icon, onClick }: Props) {
  const defaultClasses =
    'px-4 py-2 rounded-md cursor-pointer text-sm font-medium transition-all border border-gray-400';
  const linkClasses = 'rounded-md cursor-pointer text-sm font-medium transition-all text-blue-500 hover:text-blue-700 border-none';
  const iconClasses = 'cursor-pointer hover:text-light-orange';
  return (
    <button
      className={clsx({
        [defaultClasses]: (type === 'default'),
        [linkClasses]: (type === 'link'),
        [iconClasses]: (type === 'icon'),
      })}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}
