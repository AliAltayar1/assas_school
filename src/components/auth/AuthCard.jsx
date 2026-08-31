import React from 'react';
import { School } from 'lucide-react';

export function AuthCard({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden dir-rtl" dir="rtl">
      {/* Background Decorative Blur Gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center font-bold text-2xl shadow-xl shadow-teal-500/20">
            <School className="w-7 h-7 text-slate-950" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-white tracking-tight">
          منصة مدرسة أساس الأكاديمية
        </h2>
        <p className="mt-1 text-center text-xs text-teal-400 font-medium">
          Asas School Academic Web Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl border border-slate-800/20 sm:px-10">
          <div className="mb-6 text-center">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
