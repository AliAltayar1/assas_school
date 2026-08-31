import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col dir-rtl" dir="rtl">
      <Header />

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 gap-4 sm:gap-6">
        <Sidebar />

        <main className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-3.5 sm:p-5 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
