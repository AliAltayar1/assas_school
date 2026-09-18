import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { getHomeRouteForRole, normalizeRole } from "../routes/ProtectedRoute";
import {
  ACADEMICS_PERMISSIONS,
  TEACHING_PERMISSIONS,
  STUDENT_PERMISSIONS,
  ATTENDANCE_PERMISSIONS,
  BEHAVIOR_PERMISSIONS,
  HOMEWORK_PERMISSIONS,
  ANNOUNCEMENT_PERMISSIONS,
  REQUEST_PERMISSIONS,
  APPOINTMENT_PERMISSIONS,
  FINANCE_PERMISSIONS,
  GRADES_PERMISSIONS,
  AUDIT_LOG_PERMISSIONS,
  USER_PERMISSIONS,
} from "../utils/permissionUtils";
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
} from "lucide-react";

export function Sidebar() {
  const { user, hasAnyPermission, requesterRole } = useAuthStore();
  const location = useLocation();

  const isSuperuser = Boolean(
    user?.is_superuser || requesterRole?.code === "superuser"
  );
  const rawRole = user?.role || user?.role_code || user?.role_name || "";
  const currentRole = normalizeRole(rawRole);
  const basePath = getHomeRouteForRole(user);

  // 1. Overview Item based on current role space (Dashboard Overview preserved)
  const overviewLabels = {
    school_admin: "الرئيسية والإحصائيات",
    secretariat: "الرئيسية والإحصائيات",
    supervisor: "الرئيسية والتكليفات",
    teacher: "الرئيسية والشعب الدراسية",
  };

  const navItems = [
    {
      path: basePath,
      label: overviewLabels[currentRole] || "الرئيسية والإحصائيات",
      icon: School,
      show: true,
    },
    {
      path: `${basePath}/students`,
      label: currentRole === "teacher" ? "طلاب الشعب المكلف بها" : "دليل الطلاب والتسجيل",
      icon: GraduationCap,
      show: isSuperuser || hasAnyPermission(STUDENT_PERMISSIONS),
    },
    {
      path: `${basePath}/academics`,
      label: "الهيكل الأكاديمي والسنوات",
      icon: Calendar,
      show: isSuperuser || hasAnyPermission(ACADEMICS_PERMISSIONS),
    },
    {
      path: `${basePath}/users`,
      label: "إدارة الحسابات والموظفين",
      icon: Users,
      show: isSuperuser || hasAnyPermission(USER_PERMISSIONS),
    },
    {
      path: currentRole === "teacher" ? `${basePath}/assignments` : `${basePath}/teachers`,
      label: currentRole === "teacher" ? "تكليفاتي الأكاديمية" : "المعلمين والتكليفات",
      icon: UserCheck,
      show: isSuperuser || hasAnyPermission(TEACHING_PERMISSIONS),
    },
    {
      path: `${basePath}/attendance`,
      label: "الحضور والغياب اليومي",
      icon: CheckCircle,
      show: isSuperuser || hasAnyPermission(ATTENDANCE_PERMISSIONS),
    },
    {
      path: `${basePath}/grades`,
      label: currentRole === "teacher" ? "رصد العلامات والتقييمات" : "العلامات والتقييمات",
      icon: BookOpen,
      show: isSuperuser || hasAnyPermission(GRADES_PERMISSIONS),
    },
    {
      path: `${basePath}/homework`,
      label: currentRole === "teacher" ? "إدارة الواجبات اليومية" : "الواجبات اليومية",
      icon: ClipboardList,
      show: isSuperuser || hasAnyPermission(HOMEWORK_PERMISSIONS),
    },
    {
      path: `${basePath}/behavior`,
      label: "الملاحظات السلوكية والتربوية",
      icon: Award,
      show: isSuperuser || hasAnyPermission(BEHAVIOR_PERMISSIONS),
    },
    {
      path: `${basePath}/announcements`,
      label: "الإعلانات العامة والتعاميم",
      icon: Megaphone,
      show: isSuperuser || hasAnyPermission(ANNOUNCEMENT_PERMISSIONS),
    },
    {
      path: `${basePath}/requests`,
      label: "طلبات واستفسارات الأهالي",
      icon: Inbox,
      show: isSuperuser || hasAnyPermission(REQUEST_PERMISSIONS),
    },
    {
      path: `${basePath}/appointments`,
      label: "مواعيد حضور أولياء الأمور",
      icon: CalendarDays,
      show: isSuperuser || hasAnyPermission(APPOINTMENT_PERMISSIONS),
    },
    {
      path: `${basePath}/financials`,
      label: "الرسوم والمالية (USD)",
      icon: DollarSign,
      show: isSuperuser || hasAnyPermission(FINANCE_PERMISSIONS),
    },
    {
      path: `${basePath}/audit-logs`,
      label: "سجل النشاطات Audit Log",
      icon: FileText,
      show: isSuperuser || hasAnyPermission(AUDIT_LOG_PERMISSIONS),
    },
  ].filter((item) => item.show);

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-2.5 sm:p-4 h-fit lg:sticky lg:top-20">
      <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0 lg:space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path === basePath && location.pathname === `${basePath}/statistics`) ||
            (item.path !== basePath && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2.5 sm:space-x-3 space-x-reverse px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl rounded-s-none text-xs font-semibold whitespace-nowrap shrink-0 lg:shrink transition-all duration-150 ${
                isActive
                  ? "bg-teal-50 text-teal-800 border-b-2 lg:border-b-0 lg:border-r-4 border-teal-600 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`me-1 w-4 h-4 shrink-0 ${isActive ? "text-teal-600" : "text-slate-400"}`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
