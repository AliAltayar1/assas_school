import React, { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { api } from "../../api";
import { extractPaginatedList } from "../../utils/errorUtils";

// Subcomponents
import { StatCard } from "./StatCard";
import { QuickActionHub } from "./QuickActionHub";
import { LiveActivityFeed } from "./LiveActivityFeed";

// Icons
import {
  School,
  GraduationCap,
  DollarSign,
  Inbox,
  CalendarDays,
  RefreshCw,
  Download,
  Calendar,
  Sparkles,
  UserCheck,
  CreditCard,
  Wallet,
  BadgePercent,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

/**
 * Format currency in USD with commas and negative-value awareness
 */
const formatUsd = (val) => {
  if (val === null || val === undefined || val === "") return "$0";
  const num = typeof val === "string" ? parseFloat(val) : Number(val);
  if (isNaN(num)) return `$${val}`;
  if (num < 0) {
    return `-$${Math.abs(num).toLocaleString("en-US")}`;
  }
  return `$${num.toLocaleString("en-US")}`;
};

/**
 * Format standard count integer with commas
 */
const formatNumber = (val) => {
  if (val === null || val === undefined || val === "") return "0";
  const num = Number(val);
  return isNaN(num) ? val : num.toLocaleString("en-US");
};

/**
 * Format date string (e.g., "2026-08-29") into Arabic readable format
 */
const formatDateArabic = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export function DashboardStatistics({ role = "school_admin" }) {
  const { user } = useAuthStore();
  const isAdmin = role === "school_admin" || role === "admin";

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Overview data matching backend endpoint /api/v1/dashboard/overview/
  const [overview, setOverview] = useState({
    students_count: 0,
    active_teachers_count: 0,
    sections_count: 0,
    pending_appointments_count: 0,
    unanswered_guardian_requests_count: 0,
    total_tuition_usd: "0",
    total_discounts_usd: "0",
    total_paid_usd: "0",
    total_remaining_usd: "0",
    active_academic_year: "",
    current_term: "",
    today: "",
  });

  const [recentLogs, setRecentLogs] = useState([]);

  // Fetch real data from /api/v1/dashboard/overview/ and recent audit logs
  const fetchDashboardData = useCallback(async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const [overviewRes, logsRes] = await Promise.allSettled([
        api.dashboard.getOverview(),
        api.auditLogs.getLogs({ page_size: 6 }).catch(() => null),
      ]);

      if (overviewRes.status === "fulfilled" && overviewRes.value) {
        // console.log(overviewRes);
        setOverview(overviewRes.value.data);
      }

      if (logsRes.status === "fulfilled" && logsRes.value) {
        const logsList = extractPaginatedList(logsRes.value);
        setRecentLogs(logsList);
      }

      if (showToast) {
        toast.success("تم تحديث مؤشرات وبيانات المدرسة بنجاح");
      }
    } catch (err) {
      console.error("Failed to load dashboard overview data:", err);
      if (showToast) {
        toast.error("حدث خطأ أثناء تحديث بيانات اللوحة");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-right pb-10">
      {/* 1. Header Banner & Academic Context */}
      <div className="relative overflow-hidden bg-gradient-to-l from-teal-900 via-teal-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-teal-700/40">
        {/* Decorative Glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                <span>
                  {isAdmin
                    ? "منصة الإشراف والقيادة الأكاديمية - School Admin"
                    : "لوحة أمانة السر والمسجل العام - Secretariat Dashboard"}
                </span>
              </span>
              {console.log(overview)}
              {overview.active_academic_year && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-teal-100 text-xs font-medium">
                  <Calendar className="w-3.5 h-3.5 text-teal-300" />
                  <span>العام: {overview.active_academic_year}</span>
                </span>
              )}

              {overview.current_term && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-teal-100 text-xs font-medium">
                  <Layers className="w-3.5 h-3.5 text-teal-300" />
                  <span>الفصل: {overview.current_term}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>
                مرحباً،{" "}
                {user?.first_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.username || "مدير المدرسة"}
              </span>
            </h1>

            <p className="text-sm text-teal-100/80 max-w-2xl leading-relaxed">
              {overview.today ? (
                <span>
                  تاريخ اليوم: {formatDateArabic(overview.today)}. متابعة شاملة
                  للطلاب، المعلمين، الشعب، المالية والمواعيد.
                </span>
              ) : (
                <span>
                  مؤشرات وإحصائيات مباشرة ودقيقة للمنظومة التعليمية والإدارية
                  والمالية.
                </span>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="تحديث البيانات الفورية"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span>تحديث البيانات</span>
            </button>

            {/* Print Summary Button */}
            <button
              type="button"
              onClick={handlePrintSummary}
              className="bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>طباعة ملخص</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Core Operational Metrics Cards (From Real Overview Endpoint) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        <StatCard
          title="إجمالي الطلاب"
          value={formatNumber(overview.students_count)}
          subtitle="الطلاب المقيدين في النظام"
          icon={GraduationCap}
          color="teal"
          isLoading={isLoading}
          linkTo={isAdmin ? "/admin/students" : "/secretariat/students"}
        />

        <StatCard
          title="الكوادر التعليمية"
          value={formatNumber(overview.active_teachers_count)}
          subtitle="المعلمين النشطين بالخدمة"
          icon={UserCheck}
          color="purple"
          isLoading={isLoading}
          linkTo={isAdmin ? "/admin/teachers" : undefined}
        />

        <StatCard
          title="الشعب الدراسية"
          value={formatNumber(overview.sections_count)}
          subtitle="الشعب الصفية المعتمدة"
          icon={School}
          color="indigo"
          isLoading={isLoading}
          linkTo={isAdmin ? "/admin/academics" : "/secretariat/academics"}
        />

        <StatCard
          title="مواعيد المقابلات المعلقة"
          value={formatNumber(overview.pending_appointments_count)}
          subtitle="طلبات بحاجة للاعتماد"
          icon={CalendarDays}
          color="rose"
          badgeText={
            Number(overview.pending_appointments_count) > 0
              ? "مطلوب إجراء"
              : "محدث"
          }
          isLoading={isLoading}
          linkTo={isAdmin ? "/admin/appointments" : "/secretariat/appointments"}
        />

        <StatCard
          title="استفسارات الأهالي المعلقة"
          value={formatNumber(overview.unanswered_guardian_requests_count)}
          subtitle="رسائل بانتظار الرد الرسمي"
          icon={Inbox}
          color="amber"
          badgeText={
            Number(overview.unanswered_guardian_requests_count) > 0
              ? "بانتظار الرد"
              : "مكتمل"
          }
          isLoading={isLoading}
          linkTo={isAdmin ? "/admin/requests" : "/secretariat/requests"}
        />
      </div>

      {/* 3. Real Financial Summary (USD) Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                المؤشرات والذمم المالية العامة (USD)
              </h2>
              <p className="text-xs text-slate-500">
                البيانات المالية المحتسبة من سجلات وأقساط الطلاب
              </p>
            </div>
          </div>

          <Link
            to={isAdmin ? "/admin/financials" : "/secretariat/payments"}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 transition-colors"
          >
            <span>إدارة الحسابات المالية</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Tuition */}
          <div className="relative overflow-hidden bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 p-4 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                إجمالي الأقساط المقررة
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-100/80 text-sky-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-7 bg-slate-200 rounded w-28 animate-pulse" />
              ) : (
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {formatUsd(overview.total_tuition_usd)}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                الرسوم المستحقة وفق الخطط الأكاديمية
              </p>
            </div>
          </div>

          {/* Total Discounts */}
          <div className="relative overflow-hidden bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 p-4 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                إجمالي الخصومات والمنح
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center">
                <BadgePercent className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-7 bg-slate-200 rounded w-28 animate-pulse" />
              ) : (
                <div className="text-xl sm:text-2xl font-extrabold text-amber-700 tracking-tight">
                  {formatUsd(overview.total_discounts_usd)}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-1">
                حسم الأخوة والمنح والتفوق الدراسي
              </p>
            </div>
          </div>

          {/* Total Paid */}
          <div className="relative overflow-hidden bg-emerald-50/40 hover:bg-emerald-50/60 rounded-2xl border border-emerald-200/70 p-4 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">
                إجمالي المقبوضات النقدية
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-7 bg-emerald-200/60 rounded w-28 animate-pulse" />
              ) : (
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-800 tracking-tight">
                  {formatUsd(overview.total_paid_usd)}
                </div>
              )}
              <p className="text-[11px] text-emerald-700 mt-1">
                المبالغ المسددة فعلياً في الصندوق
              </p>
            </div>
          </div>

          {/* Total Remaining */}
          <div className="relative overflow-hidden bg-rose-50/40 hover:bg-rose-50/60 rounded-2xl border border-rose-200/70 p-4 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900">
                إجمالي الرصيد المتبقي
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-7 bg-rose-200/60 rounded w-28 animate-pulse" />
              ) : (
                <div className="text-xl sm:text-2xl font-extrabold text-rose-800 tracking-tight">
                  {formatUsd(overview.total_remaining_usd)}
                </div>
              )}
              <p className="text-[11px] text-rose-700 mt-1">
                الذمم والأرصدة المستحقة للتحصيل
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Quick Action Hub (Retained) */}
      <QuickActionHub
        role={role}
        badges={{
          pendingRequests:
            Number(overview.unanswered_guardian_requests_count) || null,
          pendingAppointments:
            Number(overview.pending_appointments_count) || null,
        }}
      />

      {/* 5. Live Activity Feed / Audit Logs Section (Retained) */}
      <LiveActivityFeed role={role} logs={recentLogs} isLoading={isLoading} />
    </div>
  );
}
