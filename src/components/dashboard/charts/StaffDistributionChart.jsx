import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { UserCheck, Shield, BookOpen, HeartHandshake } from 'lucide-react';

const ROLE_COLORS = {
  'معلم': '#0d9488',
  'موجه تربوي': '#8b5cf6',
  'أمانة سر': '#0284c7',
  'إدارة مدرسية': '#d97706',
  'دعم تقني': '#64748b',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-lg text-right text-xs">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        <span className="font-extrabold text-slate-900">{payload[0].value} موظف / حساب</span>
      </div>
    );
  }
  return null;
};

export function StaffDistributionChart({
  staffData = [],
  totalStaff = 34,
  totalTeachers = 22,
  totalAssignments = 58,
  teacherStudentRatio = '1 : 19',
}) {
  const defaultStaffData = [
    { role: 'معلم', count: 22, color: '#0d9488' },
    { role: 'موجه تربوي', count: 4, color: '#8b5cf6' },
    { role: 'أمانة سر', count: 3, color: '#0284c7' },
    { role: 'إدارة مدرسية', count: 3, color: '#d97706' },
    { role: 'دعم تقني', count: 2, color: '#64748b' },
  ];

  const dataToRender = staffData.length > 0 ? staffData : defaultStaffData;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">توزيع الكوادر والهيئة التعليمية</h3>
            <p className="text-xs text-slate-500">حسب الأدوار والتكليفات ونسب التغطية</p>
          </div>
        </div>

        <div className="text-left hidden sm:block">
          <span className="text-[11px] text-slate-400 block">إجمالي الكادر</span>
          <span className="text-base font-extrabold text-slate-900">{totalStaff} موظف</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
        {/* Bar Chart */}
        <div className="lg:col-span-2">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataToRender} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="role" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {dataToRender.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#0d9488'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Info Card */}
        <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-teal-600" />
              <span>معلمون نشطون:</span>
            </span>
            <span className="font-extrabold text-slate-900">{totalTeachers} معلم</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>التكليفات الأكاديمية:</span>
            </span>
            <span className="font-extrabold text-purple-700">{totalAssignments} حصة/شعبة</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
            <span className="text-slate-600 flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
              <span>معدل طالب لكل معلم:</span>
            </span>
            <span className="font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-100">
              {teacherStudentRatio}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
