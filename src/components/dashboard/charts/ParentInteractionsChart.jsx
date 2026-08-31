import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Inbox, CalendarDays, CheckCircle, MessageSquare, AlertCircle } from 'lucide-react';

const REQUEST_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-lg text-right text-xs">
        <p className="font-bold text-slate-800 mb-1">{item.name}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="font-extrabold text-slate-900">{item.value} طلب</span>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill || item.color }} />
        </div>
      </div>
    );
  }
  return null;
};

export function ParentInteractionsChart({
  requestsByType = [],
  requestsStatus = { pending: 4, answered: 38, total: 42 },
  appointmentsStatus = { pending: 3, approved: 12, completed: 25, rejected: 2, total: 42 },
}) {
  const defaultRequestsByType = [
    { name: 'استفسارات عامة', value: 20 },
    { name: 'شكاوى وملاحظات', value: 7 },
    { name: 'اقتراحات تطويرية', value: 9 },
    { name: 'طلبات أوراق رسمية', value: 6 },
  ];

  const typesData = requestsByType.length > 0 ? requestsByType : defaultRequestsByType;
  const totalRequests = typesData.reduce((acc, curr) => acc + curr.value, 0) || requestsStatus.total;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">تواصل ومقابلات أولياء الأمور</h3>
            <p className="text-xs text-slate-500">حالة الاستفسارات، الشكاوى، وطلبات المقابلة</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-bold">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{requestsStatus.pending || 0} بانتظار الرد</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Left: Pie Chart for Request Types */}
        <div className="flex flex-col items-center justify-center p-3 bg-slate-50/50 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-700 mb-1">تصنيف رسائل وطلبات الأهالي</span>
          <div className="h-32 w-32 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={typesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={34}
                  outerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {typesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={REQUEST_COLORS[index % REQUEST_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-extrabold text-slate-800">{totalRequests}</span>
              <span className="text-[9px] text-slate-400">طلب</span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 w-full mt-2">
            {typesData.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: REQUEST_COLORS[idx] }} />
                  <span className="text-slate-600 truncate">{t.name}</span>
                </div>
                <span className="font-bold text-slate-800 shrink-0 mr-1">{t.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Appointment Pipeline & Key Rates */}
        <div className="space-y-3">
          <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-purple-900">مواعيد المقابلات</span>
              </div>
              <span className="text-[11px] font-semibold text-purple-700">
                إجمالي: {appointmentsStatus.total || 42}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">بانتظار الموافقة:</span>
                <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {appointmentsStatus.pending || 3} طلبات
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">مواعيد مقبولة ومجدولة:</span>
                <span className="font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                  {appointmentsStatus.approved || 12} موعد
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">مقابلات مكتملة:</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {appointmentsStatus.completed || 25} مكتملة
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-slate-700 font-medium">معدل الإجابة على الاستفسارات</span>
            </div>
            <span className="font-extrabold text-emerald-800">
              %{Math.round(((requestsStatus.answered || 38) / (requestsStatus.total || 42)) * 100)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
