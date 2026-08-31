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
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4 text-right">
      {/* Search Bar */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="البحث باسم المستخدم، البريد، أو الاسم..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
      </div>

      {/* Filters & Ordering */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium"
        >
          <option value="">جميع الأدوار والحسابات</option>
          <option value="guardian">أولياء الأمور (guardian)</option>
          <option value="teacher">المعلمين (teacher)</option>
          <option value="supervisor">الموجهين التربويين (supervisor)</option>
          <option value="secretariat">أمانة السر والمسجل (secretariat)</option>
          <option value="school_admin">إدارة المدرسة (school_admin)</option>
          <option value="tech_support">الدعم التقني (tech_support)</option>
        </select>

        {/* Active Status Filter */}
        <select
          value={activeFilter}
          onChange={(e) => onActiveFilterChange(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium"
        >
          <option value="">جميع الحالات</option>
          <option value="true">حسابات مفعلة فقط</option>
          <option value="false">حسابات معطلة فقط</option>
        </select>

        {/* Ordering Select */}
        <select
          value={ordering}
          onChange={(e) => onOrderingChange(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium"
        >
          <option value="-date_joined">الأحدث انضماماً أولاً</option>
          <option value="date_joined">الأقدم انضماماً أولاً</option>
          <option value="username">اسم المستخدم (أ-ي)</option>
          <option value="-username">اسم المستخدم (ي-أ)</option>
          <option value="first_name">الاسم الأول (أ-ي)</option>
        </select>
      </div>
    </div>
  );
}
