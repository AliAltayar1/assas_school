import React from 'react';
import { Search } from 'lucide-react';

export function UserFilters({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  activeFilter,
  onActiveFilterChange,
  ordering,
  onOrderingChange,
}) {
  return (
    <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3 text-right">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
        {/* Search Bar */}
        <div className="relative sm:col-span-2 lg:col-span-5">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="البحث باسم المستخدم، البريد، الاسم، الرقم الوطني، أو الهاتف..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-xs"
          />
        </div>

        {/* Role Filter */}
        <div className="sm:col-span-1 lg:col-span-3">
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium shadow-xs"
          >
            <option value="">جميع الأدوار والحسابات</option>
            <option value="guardian">أولياء الأمور (guardian)</option>
            <option value="teacher">المعلمين (teacher)</option>
            <option value="supervisor">الموجهين التربويين (supervisor)</option>
            <option value="accountant">المحاسبين (accountant)</option>
            <option value="secretariat">أمانة السر والمسجل (secretariat)</option>
            <option value="school_admin">إدارة المدرسة (school_admin)</option>
            <option value="tech_support">الدعم التقني (tech_support)</option>
          </select>
        </div>

        {/* Active Status Filter */}
        <div className="sm:col-span-1 lg:col-span-2">
          <select
            value={activeFilter}
            onChange={(e) => onActiveFilterChange(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium shadow-xs"
          >
            <option value="">جميع الحالات</option>
            <option value="true">حسابات مفعلة فقط</option>
            <option value="false">حسابات معطلة فقط</option>
          </select>
        </div>

        {/* Ordering Select */}
        <div className="sm:col-span-2 lg:col-span-2">
          <select
            value={ordering}
            onChange={(e) => onOrderingChange(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium shadow-xs"
          >
            <option value="-date_joined">الأحدث انضماماً أولاً</option>
            <option value="date_joined">الأقدم انضماماً أولاً</option>
            <option value="username">اسم المستخدم (أ-ي)</option>
            <option value="-username">اسم المستخدم (ي-أ)</option>
            <option value="first_name">الاسم الأول (أ-ي)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
