import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Clock,
  CalendarCheck,
  DollarSign,
  Inbox,
  ArrowLeft,
  CalendarDays,
} from 'lucide-react';

export function PendingActionsWidget({
  pendingRequestsCount = 0,
  pendingAppointmentsCount = 0,
  isAttendanceRecorded = true,
  overduePaymentsCount = 0,
  role = 'school_admin',
}) {
  const isAdmin = role === 'school_admin' || role === 'admin';

  const items = [
    {
      id: 'requests',
      title: 'استفسارات وشكاوى معلقة',
      desc: `${pendingRequestsCount} رسالة من أولياء الأمور بانتظار الرد الرسمي`,
      count: pendingRequestsCount,
      icon: Inbox,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      btnText: 'الرد على الرسائل',
      link: isAdmin ? '/admin/requests' : '/secretariat/requests',
      urgent: pendingRequestsCount > 0,
    },
    {
      id: 'appointments',
      title: 'طلبات مواعيد مقابلة جديدة',
      desc: `${pendingAppointmentsCount} طلب حضور ومقابلة بحاجة للاعتماد وتحديد الموعد`,
      count: pendingAppointmentsCount,
      icon: CalendarDays,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      btnText: 'مراجعة المواعيد',
      link: isAdmin ? '/admin/appointments' : '/secretariat/appointments',
      urgent: pendingAppointmentsCount > 0,
    },
    {
      id: 'attendance',
      title: 'حالة الحضور الصباحي اليوم',
      desc: isAttendanceRecorded
        ? 'تم استلام وتدقيق سجلات الحضور الصباحي لجميع الشعب بنجاح'
        : 'يوجد شعب دراسية لم يتم رصد حضورها الصباحي بعد',
      count: isAttendanceRecorded ? null : 'غير مكتمل',
      icon: CalendarCheck,
      color: isAttendanceRecorded
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-rose-50 text-rose-700 border-rose-200',
      btnText: 'سجل الحضور اليومي',
      link: isAdmin ? '/admin/attendance' : '/supervisor/attendance',
      urgent: !isAttendanceRecorded,
    },
    {
      id: 'finance',
      title: 'متابعة الأقساط والدفعات',
      desc: overduePaymentsCount > 0
        ? `${overduePaymentsCount} حسابات طلاب لم يتم تسجيل دفعة القسط الأول لها`
        : 'سير التحصيل المالي منتظم وفق الخطط المعتمدة',
      count: overduePaymentsCount > 0 ? `${overduePaymentsCount} متأخر` : null,
      icon: DollarSign,
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      btnText: 'سجل المقبوضات',
      link: isAdmin ? '/admin/financials' : '/secretariat/payments',
      urgent: overduePaymentsCount > 5,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">تنبيهات المتابعة والمهام العاجلة</h3>
            <p className="text-xs text-slate-500">العناصر التي تتطلب إجراءً إدارياً فورياً اليوم</p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                item.urgent ? 'bg-slate-50/90 border-slate-200' : 'bg-white border-slate-100 opacity-80'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                    {item.count && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800">
                        {item.count}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{item.desc}</p>
                </div>
              </div>

              <Link
                to={item.link}
                className="self-end sm:self-center shrink-0 flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors"
              >
                <span>{item.btnText}</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
