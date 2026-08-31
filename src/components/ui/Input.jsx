import React from 'react';

export function Input({
  label,
  error,
  icon: Icon,
  className = '',
  type = 'text',
  ...props
}) {
  return (
    <div className="w-full space-y-1.5 text-right">
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}

      <div className="relative rounded-lg shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}

        <input
          type={type}
          className={`block w-full rounded-lg border text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
            Icon ? 'pr-9 pl-3' : 'px-3'
          } py-2.5 ${
            error
              ? 'border-red-300 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-300 bg-white text-slate-900 focus:border-teal-500 focus:ring-teal-100'
          } ${className}`}
          {...props}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}
