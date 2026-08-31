import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export function Alert({ type = 'error', title, children, className = '' }) {
  const styles = {
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: AlertCircle,
      iconColor: 'text-rose-500',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
    },
    info: {
      bg: 'bg-sky-50 border-sky-200 text-sky-800',
      icon: Info,
      iconColor: 'text-sky-500',
    },
  };

  const config = styles[type] || styles.error;
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 text-right ${config.bg} ${className}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 text-xs sm:text-sm">
        {title && <h4 className="font-bold mb-1">{title}</h4>}
        <div className="leading-relaxed whitespace-pre-line">{children}</div>
      </div>
    </div>
  );
}
