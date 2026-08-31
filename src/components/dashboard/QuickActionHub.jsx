import React from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  DollarSign,
  CalendarCheck,
  CalendarDays,
  Inbox,
  UserCog,
  FileSpreadsheet,
  Megaphone,
  History,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export function QuickActionHub({ role = 'school_admin', badges = {} }) {
  const isAdmin = role === 'school_admin' || role === 'admin';

  const adminActions = [
    {
      to: '/admin/students',
      title: 'تسجيل طالب جديد',
      desc: 'إضافة ملف طالب، الرقم الوطني والوثائق',
      icon: UserPlus,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 group-hover:border-emerald-400',
      badge: badges.newStudents ? `+${badges.newStudents}` : null,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      to: '/admin/financials',
      title: 'الرسوم والمقبوضات',
      desc: 'تسجيل دفعات، أقساط، وخصومات USD/SYP',
      icon: DollarSign,
      color: 'bg-teal-500/10 text-teal-600 border-teal-200 group-hover:border-teal-400',
      badge: badges.pendingPayments ? `${badges.pendingPayments} دفعة` : null,
      badgeColor: 'bg-teal-100 text-teal-800',
    },
    {
      to: '/admin/attendance',
      title: 'حضور وغياب اليوم',
      desc: 'رصد قوائم الحضور والانصراف الصباحي',
      icon: CalendarCheck,
      color: 'bg-sky-500/10 text-sky-600 border-sky-200 group-hover:border-sky-400',
      badge: badges.attendanceWarning ? 'مطلوب الرصد' : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      to: '/admin/appointments',
      title: 'مواعيد أولياء الأمور',
      desc: 'مراجعة وقبول طلبات الحضور والمقابلات',
      icon: CalendarDays,
      color: 'bg-purple-500/10 text-purple-600 border-purple-200 group-hover:border-purple-400',
      badge: badges.pendingAppointments ? `${badges.pendingAppointments} جديد` : null,
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      to: '/admin/requests',
      title: 'استفسارات وشكاوى الأهالي',
      desc: 'الرد الرسمي ومتابعة طلبات أولياء الأمور',
      icon: Inbox,
      color: 'bg-amber-500/10 text-amber-600 border-amber-200 group-hover:border-amber-400',
      badge: badges.pendingRequests ? `${badges.pendingRequests} بانتظار الرد` : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      to: '/admin/users',
      title: 'إدارة الكوادر والحسابات',
      desc: 'تفعيل وتعيين المعلمين والمشرفين والموظفين',
      icon: UserCog,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 group-hover:border-indigo-400',
    },
    {
      to: '/admin/announcements',
      title: 'إعلان أو تعميم جديد',
      desc: 'نشر إعلانات عاجلة للطلاب والأهالي والمعلمين',
      icon: Megaphone,
      color: 'bg-rose-500/10 text-rose-600 border-rose-200 group-hover:border-rose-400',
    },
    {
      to: '/admin/audit-logs',
      title: 'سجل العمليات Audit Log',
      desc: 'تدقيق كافة النشاطات والتعديلات الحساسة',
      icon: History,
      color: 'bg-slate-500/10 text-slate-700 border-slate-200 group-hover:border-slate-400',
    },
  ];

  const secretariatActions = [
    {
      to: '/secretariat/students',
      title: 'دليل وشؤون الطلاب',
      desc: 'إضافة وتعديل بيانات الطلاب والأولياء',
      icon: GraduationCap,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 group-hover:border-emerald-400',
    },
    {
      to: '/secretariat/payments',
      title: 'تسجيل المقبوضات النقدية',
      desc: 'إصدار سندات قبض فوري وطباعة الإيصالات',
      icon: DollarSign,
      color: 'bg-teal-500/10 text-teal-600 border-teal-200 group-hover:border-teal-400',
    },
    {
      to: '/secretariat/appointments',
      title: 'مواعيد أولياء الأمور',
      desc: 'جدولة وحجز واعتماد مقابلات الأهالي',
      icon: CalendarDays,
      color: 'bg-purple-500/10 text-purple-600 border-purple-200 group-hover:border-purple-400',
      badge: badges.pendingAppointments ? `${badges.pendingAppointments} جديد` : null,
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      to: '/secretariat/requests',
      title: 'صندوق رسائل الأهالي',
      desc: 'متابعة استفسارات وشكاوى أولياء الأمور',
      icon: Inbox,
      color: 'bg-amber-500/10 text-amber-600 border-amber-200 group-hover:border-amber-400',
      badge: badges.pendingRequests ? `${badges.pendingRequests} بانتظار الرد` : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      to: '/secretariat/excel-import',
      title: 'استيراد الطلاب Excel',
      desc: 'تعبئة ونقل بيانات الشعب من جداول إكسل',
      icon: FileSpreadsheet,
      color: 'bg-sky-500/10 text-sky-600 border-sky-200 group-hover:border-sky-400',
    },
    {
      to: '/secretariat/announcements',
      title: 'التعاميم المدرسية',
      desc: 'نشر التعاميم الإدارية وتبليغات الدوام',
      icon: Megaphone,
      color: 'bg-rose-500/10 text-rose-600 border-rose-200 group-hover:border-rose-400',
    },
  ];

  const actions = isAdmin ? adminActions : secretariatActions;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">مركز الإجراءات والروابط السريعة (Quick Action Hub)</h3>
            <p className="text-xs text-slate-500">الوصول الفوري والمباشر لأهم العمليات المدرسية اليومية</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <Link
              key={idx}
              to={action.to}
              className="group relative flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-150 active:scale-[0.99]"
            >
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${action.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors truncate">
                    {action.title}
                  </h4>
                  {action.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${action.badgeColor || 'bg-slate-100 text-slate-700'}`}
                    >
                      {action.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                  {action.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
