import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  School,
  Calendar,
  CalendarDays,
  UserCheck,
  GraduationCap,
  ClipboardList,
  CheckCircle,
  BookOpen,
  Award,
  Megaphone,
  Inbox,
  Users,
  DollarSign,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';

export function Sidebar() {
  const { user } = useAuthStore();
  const location = useLocation();

  const roleNavItems = {
    school_admin: [
      { path: '/admin', label: 'الرئيسية والإحصائيات', icon: School },
      { path: '/admin/academics', label: 'الهيكل الأكاديمي والسنوات', icon: Calendar },
      { path: '/admin/users', label: 'إدارة الحسابات والموظفين', icon: Users },
      { path: '/admin/teachers', label: 'المعلمين والتكليفات', icon: UserCheck },
      { path: '/admin/students', label: 'دليل الطلاب والتسجيل', icon: GraduationCap },
      { path: '/admin/behavior', label: 'الملاحظات السلوكية والتربوية', icon: Award },
      { path: '/admin/homework', label: 'الواجبات اليومية', icon: ClipboardList },
      { path: '/admin/attendance', label: 'الحضور والغياب اليومي', icon: CheckCircle },
      { path: '/admin/grades', label: 'العلامات والتقييمات', icon: BookOpen },
      { path: '/admin/announcements', label: 'الإعلانات العامة', icon: Megaphone },
      { path: '/admin/requests', label: 'طلبات واستفسارات الأهالي', icon: Inbox },
      { path: '/admin/appointments', label: 'مواعيد حضور أولياء الأمور', icon: CalendarDays },
      { path: '/admin/financials', label: 'الرسوم والمالية (USD)', icon: DollarSign },
      { path: '/admin/audit-logs', label: 'سجل النشاطات Audit Log', icon: FileText },
    ],
    secretariat: [
      { path: '/secretariat', label: 'الرئيسية والإحصائيات', icon: School },
      { path: '/secretariat/students', label: 'إدارة الطلاب وأولياء الأمور', icon: GraduationCap },
      { path: '/secretariat/academics', label: 'الهيكل الأكاديمي والسنوات', icon: Calendar },
      { path: '/secretariat/announcements', label: 'الإعلانات والتعاميم', icon: Megaphone },
      { path: '/secretariat/requests', label: 'طلبات واستفسارات الأهالي', icon: Inbox },
      { path: '/secretariat/appointments', label: 'مواعيد حضور أولياء الأمور', icon: CalendarDays },
      { path: '/secretariat/excel-import', label: 'استيراد الطلاب Excel', icon: FileSpreadsheet },
      { path: '/secretariat/payments', label: 'تسجيل الدفعات المقبوضة', icon: DollarSign },
    ],
    supervisor: [
      { path: '/supervisor', label: 'الرئيسية والتكليفات', icon: School },
      { path: '/supervisor/attendance', label: 'الحضور والغياب اليومي', icon: CheckCircle },
      { path: '/supervisor/teaching-assignments', label: 'توزيع تكليفات المعلمين', icon: UserCheck },
      { path: '/supervisor/students', label: 'شؤون الطلاب والتسجيل', icon: GraduationCap },
      { path: '/supervisor/academics', label: 'الهيكل الأكاديمي والسنوات', icon: Calendar },
      { path: '/supervisor/homework', label: 'متابعة الواجبات اليومية', icon: ClipboardList },
      { path: '/supervisor/announcements', label: 'الإعلانات والتعاميم', icon: Megaphone },
      { path: '/supervisor/behavior-notes', label: 'الملاحظات السلوكية والتربوية', icon: Award },
      { path: '/supervisor/requests', label: 'الشكاوى والاستفسارات', icon: Inbox },
      { path: '/supervisor/grade-approvals', label: 'اعتماد العلامات والتقييمات', icon: BookOpen },
    ],
    teacher: [
      { path: '/teacher', label: 'الرئيسية والشعب الدراسية', icon: School },
      { path: '/teacher/assignments', label: 'تكليفاتي الأكاديمية', icon: UserCheck },
      { path: '/teacher/students', label: 'طلاب الشعب المكلف بها', icon: GraduationCap },
      { path: '/teacher/grades', label: 'رصد العلامات والتقييمات', icon: BookOpen },
      { path: '/teacher/homework', label: 'إدارة الواجبات اليومية', icon: ClipboardList },
      { path: '/teacher/announcements', label: 'الإعلانات والتعاميم', icon: Megaphone },
    ],
  };

  const currentRole = (user?.role || user?.role_code || user?.role_name || 'school_admin').toLowerCase();
  const navItems = roleNavItems[currentRole] || roleNavItems.school_admin;

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-2.5 sm:p-4 h-fit lg:sticky lg:top-20">
      <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0 lg:space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path === '/admin' && location.pathname === '/admin/statistics') ||
            (item.path === '/secretariat' && location.pathname === '/secretariat/statistics') ||
            (item.path !== '/admin' &&
              item.path !== '/secretariat' &&
              item.path !== '/supervisor' &&
              item.path !== '/teacher' &&
              location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2.5 sm:space-x-3 space-x-reverse px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 lg:shrink transition-all duration-150 ${
                isActive
                  ? 'bg-teal-50 text-teal-800 border-b-2 lg:border-b-0 lg:border-r-4 border-teal-600 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
