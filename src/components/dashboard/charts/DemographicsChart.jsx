import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Users, GraduationCap } from 'lucide-react';

const GENDER_COLORS = ['#0ea5e9', '#ec4899'];
const GRADE_BAR_COLOR = '#6366f1';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-lg text-right text-xs">
        <p className="font-bold text-slate-800 mb-1">{label || item.name}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="font-extrabold text-slate-900">{item.value} طالب</span>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill || item.color }} />
        </div>
      </div>
    );
  }
  return null;
};

export function DemographicsChart({
  gradeDistribution = [],
  genderData = [],
  totalStudents = 438,
  activeCount = 432,
  inactiveCount = 6,
}) {
  const defaultGradeDistribution = [
    { name: 'الأول', count: 72 },
    { name: 'الثاني', count: 75 },
    { name: 'الثالث', count: 68 },
    { name: 'الرابع', count: 78 },
    { name: 'الخامس', count: 71 },
    { name: 'السادس', count: 74 },
  ];

  const defaultGenderData = [
    { name: 'ذكور (بنين)', value: 230 },
    { name: 'إناث (بنات)', value: 208 },
  ];

  const grades = gradeDistribution.length > 0 ? gradeDistribution : defaultGradeDistribution;
  const genders = genderData.length > 0 ? genderData : defaultGenderData;

  const totalCalculated = genders.reduce((sum, item) => sum + item.value, 0) || totalStudents;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">توزيع الطلاب والديموغرافيا</h3>
            <p className="text-xs text-slate-500">حسب الصفوف والمراحل الدراسية وتوزيع الجنسين</p>
          </div>
        </div>

        <div className="text-left hidden sm:block">
          <span className="text-[11px] text-slate-400 block">إجمالي المسجلين</span>
          <span className="text-base font-extrabold text-slate-900">{totalStudents} طالب</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
        {/* Left 2 Cols: Grade Bar Chart */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">عدد الطلاب بكل صف دراسي</span>
            <span className="text-[11px] text-slate-400">سعة استيعابية متوازنة</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grades} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={GRADE_BAR_COLOR} radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Col: Gender Donut Chart & Status */}
        <div className="flex flex-col items-center justify-center p-3 bg-slate-50/60 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-700 mb-1">النسبة بين الجنسين</span>
          <div className="h-32 w-32 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={genders}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={52}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {genders.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <Users className="w-4 h-4 text-slate-400 mb-0.5" />
              <span className="text-[10px] font-extrabold text-slate-800">{totalCalculated}</span>
            </div>
          </div>

          <div className="w-full space-y-1.5 mt-2">
            {genders.map((g, idx) => {
              const pct = totalCalculated ? Math.round((g.value / totalCalculated) * 100) : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GENDER_COLORS[idx] }} />
                    <span className="text-slate-600 font-medium">{g.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    {g.value} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>

          <div className="w-full mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>النشطون: <strong className="text-emerald-600 font-bold">{activeCount}</strong></span>
            <span>المعلقون: <strong className="text-rose-600 font-bold">{inactiveCount}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
