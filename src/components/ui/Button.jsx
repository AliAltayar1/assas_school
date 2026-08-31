import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  isLoading = false,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  type = 'button',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:
      'bg-teal-600 hover:bg-teal-700 text-white focus:ring-teal-500 shadow-sm shadow-teal-600/20 active:bg-teal-800',
    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-400 active:bg-slate-300',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-sm shadow-rose-600/20 active:bg-rose-800',
    outline:
      'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-teal-500',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-base px-6 py-3',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
          <span>جاري التحميل...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
