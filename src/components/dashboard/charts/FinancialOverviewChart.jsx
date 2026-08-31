import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DollarSign, ArrowUpRight, Percent, Layers } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xl text-right text-xs">
        <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="font-bold text-slate-900">
                ${Number(entry.value).toLocaleString()}
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

export function FinancialOverviewChart({
  monthlyRevenueData = [],
  totals = {
    totalExpectedUsd: 145000,
    totalCollectedUsd: 108750,
    totalRemainingUsd: 36250,
    totalDiscountsUsd: 8500,
    collectionRate: 75.0,
    todayCollectionsUsd: 2450,
  },
}) {
  const defaultMonthlyData = [
    { month: 'أيلول', collected: 32000, remaining: 8000, target: 40000 },
    { month: 'تشرين 1', collected: 28000, remaining: 6000, target: 34000 },
    { month: 'تشرين 2', collected: 21000, remaining: 9000, target: 30000 },
    { month: 'كانون 1', collected: 15000, remaining: 5000, target: 20000 },
    { month: 'كانون 2', collected: 12750, remaining: 8250, target: 21000 },
  ];

  const dataToRender = monthlyRevenueData.length > 0 ? monthlyRevenueData : defaultMonthlyData;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">التحصيلات والمؤشرات المالية (USD)</h3>
            <p className="text-xs text-slate-500">حالة سداد الأقساط المدرسية ونسب التحصيل الشهرية</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>نسبة التحصيل: %{totals.collectionRate || '75'}</span>
          </div>
        </div>
      </div>

      {/* Mini KPIs Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-right">
          <span className="text-[11px] font-semibold text-slate-500 block">إجمالي المستحق</span>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
            ${Number(totals.totalExpectedUsd || 145000).toLocaleString()}
          </span>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5 text-right">
          <span className="text-[11px] font-semibold text-emerald-700 block">المقبوضات المحصلة</span>
          <span className="text-sm sm:text-base font-extrabold text-emerald-900 mt-0.5 block">
            ${Number(totals.totalCollectedUsd || 108750).toLocaleString()}
          </span>
        </div>

        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-2.5 text-right">
          <span className="text-[11px] font-semibold text-amber-700 block">المبالغ المتبقية</span>
          <span className="text-sm sm:text-base font-extrabold text-amber-900 mt-0.5 block">
            ${Number(totals.totalRemainingUsd || 36250).toLocaleString()}
          </span>
        </div>

        <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-2.5 text-right">
          <span className="text-[11px] font-semibold text-purple-700 block">الخصومات الممنوحة</span>
          <span className="text-sm sm:text-base font-extrabold text-purple-900 mt-0.5 block">
            ${Number(totals.totalDiscountsUsd || 8500).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-60 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataToRender} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
            />
            <Bar dataKey="collected" name="المحصل ($)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="remaining" name="المتبقي ($)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
