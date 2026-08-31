import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const colorThemes = {
  teal: {
    bg: 'bg-teal-500/10',
    border: 'border-teal-100',
    iconBg: 'bg-teal-50 text-teal-600',
    accent: 'from-teal-500 to-emerald-500',
    pill: 'bg-teal-50 text-teal-700 border-teal-200',
    gradientBg: 'hover:border-teal-300',
  },
  sky: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-100',
    iconBg: 'bg-sky-50 text-sky-600',
    accent: 'from-sky-500 to-blue-500',
    pill: 'bg-sky-50 text-sky-700 border-sky-200',
    gradientBg: 'hover:border-sky-300',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-100',
    iconBg: 'bg-emerald-50 text-emerald-600',
    accent: 'from-emerald-500 to-teal-500',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    gradientBg: 'hover:border-emerald-300',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-100',
    iconBg: 'bg-amber-50 text-amber-600',
    accent: 'from-amber-500 to-orange-500',
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    gradientBg: 'hover:border-amber-300',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-100',
    iconBg: 'bg-purple-50 text-purple-600',
    accent: 'from-purple-500 to-indigo-500',
    pill: 'bg-purple-50 text-purple-700 border-purple-200',
    gradientBg: 'hover:border-purple-300',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-100',
    iconBg: 'bg-rose-50 text-rose-600',
    accent: 'from-rose-500 to-pink-500',
    pill: 'bg-rose-50 text-rose-700 border-rose-200',
    gradientBg: 'hover:border-rose-300',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-100',
    iconBg: 'bg-indigo-50 text-indigo-600',
    accent: 'from-indigo-500 to-purple-500',
    pill: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    gradientBg: 'hover:border-indigo-300',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'teal',
  linkTo,
  badgeText,
  isLoading = false,
  extraDetails,
}) {
  const theme = colorThemes[color] || colorThemes.teal;

  const CardContent = (
    <div
      className={`relative overflow-hidden bg-white rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col justify-between h-full ${theme.border} ${theme.gradientBg}`}
    >
      {/* Top subtle gradient line */}
      <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-r ${theme.accent}`} />

      {/* Header section with Icon & Title */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${theme.iconBg}`}
              >
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                {title}
              </span>
              {badgeText && (
                <span className="inline-block text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full mt-0.5">
                  {badgeText}
                </span>
              )}
            </div>
          </div>

          {trend && (
            <div
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                trend.isNeutral
                  ? 'bg-slate-50 text-slate-600 border-slate-200'
                  : trend.isPositive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {trend.isNeutral ? (
                <Minus className="w-3 h-3" />
              ) : trend.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="mt-3.5">
          {isLoading ? (
            <div className="h-8 bg-slate-100 rounded-lg w-28 animate-pulse mb-1" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {value ?? '0'}
              </span>
              {trend?.label && (
                <span className="text-[11px] text-slate-400 font-normal">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Subtitle / Extra info */}
      {(subtitle || extraDetails) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate">{subtitle}</span>
          {extraDetails && (
            <span className="font-semibold text-slate-700 shrink-0 mr-2">{extraDetails}</span>
          )}
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="block transition-transform active:scale-[0.98]">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}
