import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ size = 'md', text, className = '' }) => {
  const spinnerSizes = {
    sm: 'h-4.5 w-4.5 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-coral-500 border-t-transparent ${spinnerSizes[size]}`}></div>
      {text && (
        <span className={`mt-2.5 font-bold text-zinc-400 dark:text-zinc-550 ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
          {text}
        </span>
      )}
    </div>
  );
};

export default Loader;
