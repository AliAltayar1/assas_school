import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CheckCircle2, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xl text-right text-xs">
        <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-900">
                {entry.value}
                {entry.unit || ''}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600">{entry.name}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: entry.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function AttendanceTrendsChart({
  weeklyData = [],
  gradeComparisonData = [],
  summary = { rate: 96.4, presentCount: 420, absentCount: 12, lateCount: 6 },
}) {
  const [chartMode, setChartMode] = useState('trend'); // 'trend' | 'grades'

  // Default fallback realistic data if empty
  const defaultWeeklyData = [
    { day: 'الأحد', present: 97.2, absent: 1.8, late: 1.0, count: 425 },
    { day: 'الإثنين', present: 96.5, absent: 2.3, late: 1.2, count: 422 },
    { day: 'الثلاثاء', present: 95.8, absent: 2.8, late: 1.4, count: 419 },
    { day: 'الأربعاء', present: 97.8, absent: 1.5, late: 0.7, count: 428 },
    { day: 'الخميس', present: 94.9, absent: 3.5, late: 1.6, count: 415 },
  ];

  const defaultGradeData = [
    { grade: 'الصف الأول', rate: 98.5, present: 68, absent: 1 },
    { grade: 'الصف الثاني', rate: 97.1, present: 72, absent: 2 },
    { grade: 'الصف الثالث', rate: 96.0, present: 65, absent: 3 },
    { grade: 'الصف الرابع', rate: 95.4, present: 74, absent: 4 },
    { grade: 'الصف الخامس', rate: 96.8, present: 69, absent: 2 },
    { grade: 'الصف السادس', rate: 94.2, present: 72, absent: 5 },
  ];

  const dataToRender = weeklyData.length > 0 ? weeklyData : defaultWeeklyData;
  const gradeDataToRender = gradeComparisonData.length > 0 ? gradeComparisonData : defaultGradeData;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">مؤشرات الحضور والالتزام اليومي</h3>
            <p className="text-xs text-slate-500">تتبع نسب الحضور وغياب الطلاب على مدار الأسبوع</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setChartMode('trend')}
            className={`px-3 py-1 rounded-lg transition-all ${
              chartMode === 'trend'
                ? 'bg-white text-teal-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المسار الأسبوعي
          </button>
          <button
            type="button"
            onClick={() => setChartMode('grades')}
            className={`px-3 py-1 rounded-lg transition-all ${
              chartMode === 'grades'
                ? 'bg-white text-teal-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            مقارنة الصفوف
          </button>
        </div>
      </div>

      {/* Mini KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-2.5 text-right">
          <span className="text-[11px] font-bold text-teal-700 block">نسبة الحضور اليوم</span>
          <div className="flex items-center gap-1 text-teal-900 font-extrabold text-base sm:text-lg mt-0.5">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span>%{summary.rate || '96.4'}</span>
          </div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 text-right">
          <span className="text-[11px] font-bold text-emerald-700 block">الحاضرون</span>
          <span className="text-emerald-900 font-extrabold text-base sm:text-lg mt-0.5 block">
            {summary.presentCount || '420'} طالب
          </span>
        </div>

        <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-2.5 text-right">
          <span className="text-[11px] font-bold text-rose-700 block">الغياب اليومي</span>
          <div className="flex items-center gap-1 text-rose-900 font-extrabold text-base sm:text-lg mt-0.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{summary.absentCount || '12'} طالب</span>
          </div>
        </div>

        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-2.5 text-right">
          <span className="text-[11px] font-bold text-amber-700 block">تأخير صباحي</span>
          <div className="flex items-center gap-1 text-amber-900 font-extrabold text-base sm:text-lg mt-0.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>{summary.lateCount || '6'} حالات</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full pt-2">
        {chartMode === 'trend' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dataToRender} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[85, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
              />
              <Area
                type="monotone"
                dataKey="present"
                name="نسبة الحضور (%)"
                stroke="#0d9488"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#presentGradient)"
              />
              <Area
                type="monotone"
                dataKey="absent"
                name="نسبة الغياب (%)"
                stroke="#f43f5e"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#absentGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gradeDataToRender} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="grade" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
              />
              <Bar dataKey="rate" name="معدل الحضور (%)" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
