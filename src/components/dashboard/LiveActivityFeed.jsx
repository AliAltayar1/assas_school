import React from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  DollarSign,
  UserPlus,
  CalendarCheck,
  Award,
  BookOpen,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';

const getActionIcon = (module, action) => {
  if (module?.includes('finance') || module?.includes('payment')) return DollarSign;
  if (module?.includes('student') || module?.includes('enrollment')) return UserPlus;
  if (module?.includes('attendance')) return CalendarCheck;
  if (module?.includes('grade')) return BookOpen;
  if (module?.includes('behavior')) return Award;
  return History;
};

const getActionColor = (action) => {
  const act = String(action || '').toLowerCase();
  if (act.includes('create') || act.includes('post') || act.includes('add')) {
    return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  }
  if (act.includes('update') || act.includes('patch') || act.includes('edit')) {
    return 'bg-sky-50 text-sky-600 border-sky-200';
  }
  if (act.includes('delete') || act.includes('cancel') || act.includes('deactivate')) {
    return 'bg-rose-50 text-rose-600 border-rose-200';
  }
  return 'bg-teal-50 text-teal-600 border-teal-200';
};

export function LiveActivityFeed({
  logs = [],
  isLoading = false,
  role = 'school_admin',
}) {
  const logsToRender = logs.slice(0, 6);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">سجل المعاملات والنشاطات الحديثة</h3>
            <p className="text-xs text-slate-500">متابعة فورية ومباشرة لكافة العمليات الإدارية والمالية</p>
          </div>
        </div>

        {role === 'school_admin' && (
          <Link
            to="/admin/audit-logs"
            className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
          >
            <span>السجل الشامل</span>
            <ArrowLeft className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Activity List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : logsToRender.length > 0 ? (
          logsToRender.map((log, idx) => {
            const Icon = getActionIcon(log.module || log.module_name, log.action);
            const colorClass = getActionColor(log.action);

            return (
              <div
                key={log.id || idx}
                className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors"
              >
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {log.actor_name || log.actor?.username || log.actor || 'مستخدم النظام'}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {log.timestamp_display || (log.created_at ? new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'الآن')}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium mt-0.5 line-clamp-1">
                    {log.description || log.action_display || `${log.action} على ${log.module || ''}`}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs">
            <History className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
            <p className="font-semibold text-slate-600">لا توجد نشاطات مسجلة حالياً</p>
            <p className="text-[11px] text-slate-400 mt-0.5">سيتم رصد وعرض كافة العمليات والتعديلات فور إجرائها في النظام</p>
          </div>
        )}
      </div>
    </div>
  );
}
