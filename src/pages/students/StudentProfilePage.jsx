import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import {
  canViewStudentProfile,
  getHomeRouteForRole,
} from "../../utils/permissionUtils";
import { parseApiError } from "../../utils/errorUtils";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";
import { toast } from "sonner";
import {
  User,
  Users,
  HeartPulse,
  CalendarCheck,
  BookOpen,
  ShieldAlert,
  DollarSign,
  Calendar,
  School,
  ArrowRight,
  RefreshCw,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Percent,
  Receipt,
  Check,
  Ban,
  Activity,
  Award,
  Sparkles,
  ChevronLeft,
  Copy,
} from "lucide-react";

// =========================================================================
// Format Utilities
// =========================================================================
function formatUSD(val) {
  if (val === null || val === undefined || val === "") return "$0.00";
  const num = parseFloat(val);
  if (isNaN(num)) return `$${val}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

function formatSYP(val) {
  if (val === null || val === undefined || val === "") return "0 ل.س";
  const num = parseFloat(val);
  if (isNaN(num)) return `${val} ل.س`;
  return `${new Intl.NumberFormat("ar-SY").format(num)} ل.س`;
}

function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatDateTime(isoString) {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function StudentProfilePage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user, requesterRole, permissions } = useAuthStore();

  const isAllowed = canViewStudentProfile(user, requesterRole, permissions);
  const basePath = getHomeRouteForRole(user);

  // =========================================================================
  // State
  // =========================================================================
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isYearSwitching, setIsYearSwitching] = useState(false);
  const [error, setError] = useState(null);

  // Academic Years List for Dropdown Selector
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState("");

  // Active Tab: 'personal' | 'guardians' | 'health' | 'attendance' | 'grades' | 'behavior' | 'finance'
  const [activeTab, setActiveTab] = useState("personal");

  // Finance Subtab: 'payments' | 'discounts'
  const [financeSubTab, setFinanceSubTab] = useState("payments");

  // Independent Pagination States (Defaults to page 1, size 10)
  const [attendancePage, setAttendancePage] = useState(1);
  const [gradesPage, setGradesPage] = useState(1);
  const [behaviorPage, setBehaviorPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [discountsPage, setDiscountsPage] = useState(1);

  // =========================================================================
  // 1. Fetch Academic Years
  // =========================================================================
  useEffect(() => {
    let isMounted = true;
    async function loadAcademicYears() {
      try {
        const res = await api.academics.getYears({ page_size: 100 });
        const list = Array.isArray(res) ? res : res?.results || [];
        if (isMounted) {
          setAcademicYears(list);
        }
      } catch (err) {
        console.warn("Could not load academic years list:", err);
      }
    }
    loadAcademicYears();
    return () => {
      isMounted = false;
    };
  }, []);

  // =========================================================================
  // 2. Fetch Comprehensive Profile Data
  // =========================================================================
  const fetchProfile = useCallback(
    async (paramsOverride = {}, isYearChange = false) => {
      if (!studentId) return;

      if (isYearChange) {
        setIsYearSwitching(true);
      } else if (!profileData) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params = {
          academic_year: selectedYearId || undefined,
          attendance_page: attendancePage,
          attendance_page_size: 10,
          grades_page: gradesPage,
          grades_page_size: 10,
          behavior_page: behaviorPage,
          behavior_page_size: 10,
          payments_page: paymentsPage,
          payments_page_size: 10,
          discounts_page: discountsPage,
          discounts_page_size: 10,
          ...paramsOverride,
        };

        const res = await api.students.getStudentProfile(studentId, params);

        if (res && res.data) {
          setProfileData(res.data);
          // If no specific year was selected initially, sync with backend's returned active year
          if (!selectedYearId && res.data.academic_year?.id) {
            setSelectedYearId(res.data.academic_year.id);
          }
        }
      } catch (err) {
        const parsed = parseApiError(err);
        setError(parsed);
        toast.error(parsed || "حدث خطأ أثناء تحميل الملف الشامل للطالب.");
      } finally {
        setIsLoading(false);
        setIsYearSwitching(false);
      }
    },
    [
      studentId,
      selectedYearId,
      attendancePage,
      gradesPage,
      behaviorPage,
      paymentsPage,
      discountsPage,
      profileData,
    ]
  );

  // Initial fetch on mount or studentId change
  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Handle Academic Year Selector Change
  const handleYearChange = (newYearId) => {
    setSelectedYearId(newYearId);
    // Reset all pagination to page 1 on year change
    setAttendancePage(1);
    setGradesPage(1);
    setBehaviorPage(1);
    setPaymentsPage(1);
    setDiscountsPage(1);

    fetchProfile(
      {
        academic_year: newYearId || undefined,
        attendance_page: 1,
        grades_page: 1,
        behavior_page: 1,
        payments_page: 1,
        discounts_page: 1,
      },
      true
    );
  };

  // Independent Pagination Handlers
  const handleAttendancePageChange = (newPage) => {
    setAttendancePage(newPage);
    fetchProfile({ attendance_page: newPage });
  };

  const handleGradesPageChange = (newPage) => {
    setGradesPage(newPage);
    fetchProfile({ grades_page: newPage });
  };

  const handleBehaviorPageChange = (newPage) => {
    setBehaviorPage(newPage);
    fetchProfile({ behavior_page: newPage });
  };

  const handlePaymentsPageChange = (newPage) => {
    setPaymentsPage(newPage);
    fetchProfile({ payments_page: newPage });
  };

  const handleDiscountsPageChange = (newPage) => {
    setDiscountsPage(newPage);
    fetchProfile({ discounts_page: newPage });
  };

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    toast.success("تم نسخ معرّف الطالب بنجاح");
  };

  // =========================================================================
  // 3. Security Guard (Role & Permission)
  // =========================================================================
  if (!isAllowed) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-right dir-rtl" dir="rtl">
        <Alert type="error" title="غير مصرح بالوصول">
          ليس لديك الصلاحية الكافية لعرض الملف الشامل للطالب. تقتصر هذه الصفحة
          على الإدارة المدرسية وأمانة السر والمشرفين المخولين.
        </Alert>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => navigate(basePath)}>
            العودة إلى الصفحة الرئيسية
          </Button>
        </div>
      </div>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4 text-slate-500 dir-rtl" dir="rtl">
        <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-700">جاري تحميل الملف الشامل للطالب...</p>
        <p className="text-xs text-slate-400">يتم جلب السجل الأكاديمي، الصحي، المالي، والحضور</p>
      </div>
    );
  }

  // Error State
  if (error || !profileData) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4 text-right dir-rtl" dir="rtl">
        <Alert type="error" title="تعذر عرض ملف الطالب">
          {error || "لم يتم العثور على بيانات هذا الطالب أو تم حذفه."}
        </Alert>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(`${basePath}/students`)}>
            العودة لدليل الطلاب
          </Button>
          <Button onClick={() => fetchProfile()}>إعادة المحاولة</Button>
        </div>
      </div>
    );
  }

  const {
    student = {},
    guardians = [],
    health_profile = null,
    academic_year = null,
    enrollment = null,
    attendance = {},
    grades = {},
    behavior = {},
    finance = {},
  } = profileData;

  const attendanceSummary = attendance?.summary || {};
  const attendanceRecords = attendance?.records || { results: [], count: 0 };

  const gradesRecords = grades || { results: [], count: 0 };

  const behaviorSummary = behavior?.summary || {};
  const behaviorNotes = behavior?.notes || { results: [], count: 0 };

  const financeAccount = finance?.account || null;
  const financeSummary = finance?.summary || null;
  const paymentsRecords = finance?.payments || { results: [], count: 0 };
  const discountsRecords = finance?.discounts || { results: [], count: 0 };

  return (
    <div className="space-y-6 text-right dir-rtl pb-12" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & BREADCRUMBS                                                */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link
              to={`${basePath}/students`}
              className="hover:text-teal-700 transition-colors"
            >
              دليل الطلاب والتسجيل
            </Link>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-teal-800 font-bold">الملف الشامل للطالب</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <span>{student?.full_name || `${student?.first_name} ${student?.last_name}`}</span>
            {student?.is_active !== false ? (
              <Badge variant="success" size="sm">
                نشط
              </Badge>
            ) : (
              <Badge variant="danger" size="sm">
                معطل
              </Badge>
            )}
          </h1>
          {Boolean(student?.first_name_en || student?.last_name_en) && (
            <p className="text-xs font-mono text-slate-400 dir-ltr text-right">
              {[student?.first_name_en, student?.last_name_en].filter(Boolean).join(" ")}
            </p>
          )}
        </div>

        {/* Action Controls: Year Selector & Back Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Academic Year Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-teal-600" />
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
              السنة الدراسية:
            </label>
            <select
              value={selectedYearId || academic_year?.id || ""}
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={isYearSwitching}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            >
              {academicYears.length > 0 ? (
                academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name || `${y.start_date} / ${y.end_date}`}{" "}
                    {y.status === "active" ? "(الفعالة)" : ""}
                  </option>
                ))
              ) : academic_year ? (
                <option value={academic_year.id}>
                  {academic_year.name}{" "}
                  {academic_year.status === "active" ? "(الفعالة)" : ""}
                </option>
              ) : (
                <option value="">لا توجد سنوات مسجلة</option>
              )}
            </select>
            {isYearSwitching && (
              <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin" />
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProfile({}, true)}
            isLoading={isYearSwitching}
            className="gap-1.5 text-xs font-bold text-slate-700 hover:text-teal-700"
            title="تحديث بيانات الملف"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تحديث</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`${basePath}/students`)}
            className="gap-1.5 text-xs font-bold"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للدليل</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. IDENTITY HEADER CARD                                                   */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 -ml-12 -mt-12 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-300 font-black text-xl sm:text-2xl shadow-inner shrink-0">
              {student?.first_name ? student.first_name[0] : "ط"}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg sm:text-xl font-black text-white">
                  {student?.full_name}
                </span>
                <Badge variant={student?.gender === "male" ? "info" : "purple"} size="sm">
                  {student?.gender_display || (student?.gender === "male" ? "ذكر" : "أنثى")}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span>
                  اسم الأب:{" "}
                  <strong className="text-white font-bold">
                    {student?.father_name || "-"}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  اسم الأم:{" "}
                  <strong className="text-white font-bold">
                    {student?.mother_name || "-"}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  تاريخ الميلاد:{" "}
                  <strong className="text-white font-bold font-mono">
                    {student?.birth_date || "-"}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
                <span>معرّف الطالب:</span>
                <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                  {student?.id}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyId(student?.id)}
                  className="text-slate-400 hover:text-teal-300 transition-colors p-1"
                  title="نسخ المعرّف"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Academic Enrollment Pill */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs">
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-400 font-medium block">
                التسجيل في سنة ({academic_year?.name || "المحددة"}):
              </span>
              {enrollment ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">
                    {enrollment.grade_level?.name || "الصف غير محدد"}
                  </span>
                  <span className="bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded-md border border-teal-500/30">
                    الشعبة: {enrollment.section?.name || "-"}
                  </span>
                </div>
              ) : (
                <span className="font-bold text-amber-400">
                  غير مسجل في هذه السنة
                </span>
              )}
            </div>

            {enrollment && (
              <div className="border-t sm:border-t-0 sm:border-r border-slate-700 pt-2 sm:pt-0 sm:pr-4 space-y-0.5 text-slate-300">
                <div>
                  الوصول:{" "}
                  <strong className="text-white">
                    {enrollment.usual_arrival_method_display || "-"}
                  </strong>
                </div>
                <div>
                  المغادرة:{" "}
                  <strong className="text-white">
                    {enrollment.usual_departure_method_display || "-"}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. QUICK STATS KPI CARDS (8 CARDS)                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. نسبة الحضور */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>نسبة الحضور</span>
            <Activity className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {attendanceSummary.attendance_rate_percentage
              ? `${attendanceSummary.attendance_rate_percentage}%`
              : "-"}
          </p>
          <span className="text-[10px] text-slate-400 block truncate">
            {attendanceSummary.total_recorded_days
              ? `من ${attendanceSummary.total_recorded_days} يوم`
              : "لا توجد سجلات"}
          </span>
        </div>

        {/* 2. أيام الحضور */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>أيام الحضور</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-emerald-700 font-mono">
            {attendanceSummary.present_count ?? 0}
          </p>
          <span className="text-[10px] text-emerald-600/80 font-bold block">
            حضور فعلي
          </span>
        </div>

        {/* 3. أيام الغياب */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>أيام الغياب</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-rose-700 font-mono">
            {attendanceSummary.absent_count ?? 0}
          </p>
          <span
            className="text-[10px] text-slate-400 block truncate"
            title={`بعذر: ${attendanceSummary.excused_absence_count ?? 0} | دون عذر: ${attendanceSummary.unexcused_absence_count ?? 0}`}
          >
            عذر: {attendanceSummary.excused_absence_count ?? 0} | بدون: {attendanceSummary.unexcused_absence_count ?? 0}
          </span>
        </div>

        {/* 4. السلوك الإيجابي */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>إيجابيات</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-emerald-700 font-mono">
            {behaviorSummary.positive_notes_count ?? 0}
          </p>
          <span className="text-[10px] text-emerald-600/80 font-bold block">
            ملاحظة إيجابية
          </span>
        </div>

        {/* 5. السلوك السلبي */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>سلبيات</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-rose-700 font-mono">
            {behaviorSummary.negative_notes_count ?? 0}
          </p>
          <span className="text-[10px] text-rose-600/80 font-bold block">
            ملاحظة سلبية
          </span>
        </div>

        {/* 6. القسط الأساسي */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>القسط (USD)</span>
            <DollarSign className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900 font-mono truncate">
            {financeSummary
              ? formatUSD(financeSummary.base_tuition_usd)
              : "-"}
          </p>
          <span className="text-[10px] text-slate-400 block truncate">
            {financeSummary ? "القسط السنوي" : "لا يوجد حساب"}
          </span>
        </div>

        {/* 7. إجمالي المدفوع */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>المدفوع (USD)</span>
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-emerald-700 font-mono truncate">
            {financeSummary
              ? formatUSD(financeSummary.total_paid_usd)
              : "-"}
          </p>
          <span className="text-[10px] text-emerald-600/80 font-bold block">
            المسدد نقدًا
          </span>
        </div>

        {/* 8. المتبقي */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>المتبقي (USD)</span>
            <DollarSign className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-base sm:text-lg font-black text-amber-700 font-mono truncate">
            {financeSummary
              ? formatUSD(financeSummary.remaining_usd)
              : "-"}
          </p>
          <span className="text-[10px] text-slate-400 block truncate">
            {financeSummary ? "الذمة المالية" : "لا يوجد حساب"}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TABS NAVIGATION (7 SECTIONS)                                           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none bg-slate-50/70 p-1.5 gap-1">
          {/* Tab 1: Personal */}
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "personal"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <User className="w-4 h-4 text-teal-600" />
            <span>المعلومات الشخصية</span>
          </button>

          {/* Tab 2: Guardians */}
          <button
            type="button"
            onClick={() => setActiveTab("guardians")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "guardians"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4 text-sky-600" />
            <span>أولياء الأمور</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {guardians.length}
            </span>
          </button>

          {/* Tab 3: Health */}
          <button
            type="button"
            onClick={() => setActiveTab("health")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "health"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <HeartPulse className="w-4 h-4 text-rose-600" />
            <span>الملف الصحي</span>
            {health_profile && (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>

          {/* Tab 4: Attendance & Enrollment */}
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "attendance"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-teal-600" />
            <span>الحضور والتسجيل</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {attendanceRecords?.count || 0}
            </span>
          </button>

          {/* Tab 5: Grades */}
          <button
            type="button"
            onClick={() => setActiveTab("grades")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "grades"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>العلامات والتقييمات</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {gradesRecords?.count || 0}
            </span>
          </button>

          {/* Tab 6: Behavior */}
          <button
            type="button"
            onClick={() => setActiveTab("behavior")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "behavior"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            <span>السلوك والملاحظات</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {behaviorNotes?.count || 0}
            </span>
          </button>

          {/* Tab 7: Finance */}
          <button
            type="button"
            onClick={() => setActiveTab("finance")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "finance"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>المالية والحسابات</span>
            {financeAccount ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            ) : (
              <span className="text-[10px] text-slate-400">(لا يوجد)</span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6">
          {/* ========================================================================= */}
          {/* TAB 1: PERSONAL INFO                                                      */}
          {/* ========================================================================= */}
          {activeTab === "personal" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-teal-600" />
                  <span>البيانات الشخصية للطالب</span>
                </h3>
                <p className="text-xs text-slate-500">
                  البيانات العامة الثابتة للطالب في النظام المدرسي (لا تتغير بتغير
                  السنة الدراسية)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    الاسم الكامل:
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {student?.full_name || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    الاسم الأول:
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {student?.first_name || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    اسم الأب:
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {student?.father_name || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    اسم الأم:
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {student?.mother_name || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    الكنية / اسم العائلة:
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {student?.last_name || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    الجنس:
                  </span>
                  <div>
                    <Badge variant={student?.gender === "male" ? "info" : "purple"}>
                      {student?.gender_display || (student?.gender === "male" ? "ذكر" : "أنثى")}
                    </Badge>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    تاريخ الميلاد:
                  </span>
                  <p className="text-sm font-bold text-slate-900 font-mono">
                    {student?.birth_date || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    حالة القيد في النظام:
                  </span>
                  <div>
                    {student?.is_active !== false ? (
                      <Badge variant="success">نشط</Badge>
                    ) : (
                      <Badge variant="danger">معطل</Badge>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    الاسم بالإنكليزية:
                  </span>
                  <p className="text-sm font-bold text-slate-900 font-mono dir-ltr text-right">
                    {[student?.first_name_en, student?.last_name_en]
                      .filter(Boolean)
                      .join(" ") || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: GUARDIANS                                                          */}
          {/* ========================================================================= */}
          {activeTab === "guardians" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-sky-600" />
                  <span>أولياء الأمور المرتبطين بالطالب</span>
                </h3>
                <p className="text-xs text-slate-500">
                  قائمة أولياء الأمور وحساباتهم المسجلة للتواصل والإشعارات
                </p>
              </div>

              {guardians.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2 text-slate-500">
                  <Users className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    لا يوجد أولياء أمور مرتبطين بهذا الطالب حتى الآن.
                  </p>
                  <p className="text-[11px]">
                    يمكنك ربط ولي أمر بالطالب من خلال تبويب "روابط أولياء الأمور" في
                    صفحة إدارة الطلاب.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guardians.map((g) => (
                    <div
                      key={g.id}
                      className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-sm">
                            {g.full_name ? g.full_name[0] : "و"}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">
                              {g.full_name || g.username || "ولي أمر"}
                            </h4>
                            <span className="text-[11px] text-slate-500">
                              اسم المستخدم: {g.username || "-"}
                            </span>
                          </div>
                        </div>

                        <Badge variant="teal" size="sm">
                          {g.relationship || "ولي أمر"}
                        </Badge>
                      </div>

                      <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>رقم الهاتف:</span>
                          {g.phone_number ? (
                            <a
                              href={`tel:${g.phone_number}`}
                              className="font-mono text-teal-700 font-bold hover:underline dir-ltr text-right"
                            >
                              {g.phone_number}
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>البريد الإلكتروني:</span>
                          {g.email ? (
                            <a
                              href={`mailto:${g.email}`}
                              className="text-teal-700 font-medium hover:underline font-mono text-[11px]"
                            >
                              {g.email}
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <span>حالة الحساب:</span>
                          {g.is_active !== false ? (
                            <Badge variant="success" size="sm">
                              نشط
                            </Badge>
                          ) : (
                            <Badge variant="danger" size="sm">
                              معطل
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: HEALTH PROFILE                                                     */}
          {/* ========================================================================= */}
          {activeTab === "health" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                  <span>الملف الصحي للطالب</span>
                </h3>
                <p className="text-xs text-slate-500">
                  المعلومات والاحتياجات الصحية وسجل الحساسية وجهات الاتصال في حالات
                  الطوارئ
                </p>
              </div>

              {!health_profile ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2 text-slate-500">
                  <HeartPulse className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    لا يوجد ملف صحي مسجل لهذا الطالب.
                  </p>
                  <p className="text-[11px]">
                    يمكن لإدارة المدرسة تسجيل أو تحديث الملف الصحي من خلال زر أيقونة
                    النبض في دليل الطلاب.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Blood Type & Emergency Contact Banner */}
                  <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-rose-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
                        {health_profile.blood_type || "؟"}
                      </div>
                      <div>
                        <span className="text-xs text-rose-700 font-bold block">
                          زمرة دم الطالب
                        </span>
                        <p className="text-xs text-slate-600">
                          {health_profile.blood_type
                            ? `فصيلة الدم المعتمدة: ${health_profile.blood_type}`
                            : "غير محددة في السجل"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white px-4 py-2.5 rounded-xl border border-rose-200/80 space-y-1 text-xs">
                      <span className="text-[11px] font-bold text-rose-800 block">
                        جهة الاتصال في حالات الطوارئ:
                      </span>
                      <div className="flex flex-wrap items-center gap-3 font-medium text-slate-700">
                        <span>
                          الاسم:{" "}
                          <strong>
                            {health_profile.emergency_contact_name || "-"}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          الهاتف:{" "}
                          <strong className="font-mono text-rose-700 dir-ltr inline-block">
                            {health_profile.emergency_contact_phone || "-"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Medical Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs font-bold text-slate-800 block">
                        الحساسيات الدوائية أو الغذائية:
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {health_profile.allergies || "لا توجد حساسية مسجلة"}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs font-bold text-slate-800 block">
                        الأمراض المزمنة:
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {health_profile.chronic_diseases || "لا توجد أمراض مزمنة مسجلة"}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs font-bold text-slate-800 block">
                        الأدوية الدائمة والمستمرة:
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {health_profile.permanent_medications ||
                          "لا توجد أدوية دائمة مسجلة"}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs font-bold text-slate-800 block">
                        الاحتياجات الصحية الخاصة:
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {health_profile.special_health_needs ||
                          "لا توجد احتياجات خاصة مسجلة"}
                      </p>
                    </div>
                  </div>

                  {/* Health Notes */}
                  {health_profile.health_notes && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs font-bold text-slate-800 block">
                        ملاحظات صحية إضافية:
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {health_profile.health_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: ATTENDANCE & ENROLLMENT                                            */}
          {/* ========================================================================= */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              {/* Enrollment Info Card */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <School className="w-4 h-4 text-teal-600" />
                  <span>
                    بيانات التسجيل الدراسي في سنة ({academic_year?.name || "المحددة"})
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  تفاصيل تسجيل وقيد الطالب والشعبة وطرق الحضور والانصراف
                </p>
              </div>

              {!enrollment ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>الطالب غير مسجل في السنة الدراسية المحددة.</strong> لن
                    تتوفر بيانات دوام أو حضور لهذه السنة.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      السنة الدراسية:
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {enrollment.academic_year?.name || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      الصف الدراسي:
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {enrollment.grade_level?.name || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      الشعبة المقيد بها:
                    </span>
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {enrollment.section?.name || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      تاريخ التسجيل:
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-800">
                      {enrollment.enrollment_date || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      طريقة الوصول المعتادة:
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {enrollment.usual_arrival_method_display || "-"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      طريقة المغادرة المعتادة:
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {enrollment.usual_departure_method_display || "-"}
                    </span>
                  </div>
                </div>
              )}

              {/* Attendance Records Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-teal-600" />
                    <span>سجلات الحضور والغياب اليومية</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    ملاحظة: تُعرض الشعبة التاريخية التي كان الطالب بها وقت أخذ
                    التفقد
                  </span>
                </div>

                {attendanceRecords.results.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-1 text-slate-500 text-xs">
                    <CalendarCheck className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                    <p className="font-bold text-slate-700">
                      لا توجد سجلات حضور أو غياب مسجلة للطالب في هذه السنة.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">التاريخ</th>
                            <th className="py-2.5 px-3">الشعبة</th>
                            <th className="py-2.5 px-3">الحالة</th>
                            <th className="py-2.5 px-3">طريقة الحضور / الوقت</th>
                            <th className="py-2.5 px-3">طريقة الانصراف / الوقت</th>
                            <th className="py-2.5 px-3">نوع الغياب</th>
                            <th className="py-2.5 px-3">سبب الغياب والمصدر</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {attendanceRecords.results.map((rec) => {
                            const isPresent = rec.status === "present";
                            const isLate = rec.status === "late";
                            const isExcused = rec.absence_type === "excused";

                            return (
                              <tr
                                key={rec.id}
                                className="hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-900">
                                  {rec.attendance_date}
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap font-bold text-teal-800">
                                  <span className="bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                                    {rec.section?.name || "-"}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {isPresent ? (
                                    <Badge variant="success">
                                      {rec.status_display || "حاضر"}
                                    </Badge>
                                  ) : isLate ? (
                                    <Badge variant="warning">
                                      {rec.status_display || "متأخر"}
                                    </Badge>
                                  ) : (
                                    <Badge variant="danger">
                                      {rec.status_display || "غائب"}
                                    </Badge>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                                  {rec.arrival_method_display || rec.arrival_time ? (
                                    <span>
                                      {rec.arrival_method_display || "-"}
                                      {rec.arrival_time ? ` (${rec.arrival_time})` : ""}
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                                  {rec.departure_method_display ||
                                  rec.departure_time ? (
                                    <span>
                                      {rec.departure_method_display || "-"}
                                      {rec.departure_time
                                        ? ` (${rec.departure_time})`
                                        : ""}
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>

                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {rec.status === "absent" ? (
                                    <Badge
                                      variant={isExcused ? "info" : "danger"}
                                      size="sm"
                                    >
                                      {rec.absence_type_display ||
                                        (isExcused ? "مبرر" : "غير مبرر")}
                                    </Badge>
                                  ) : (
                                    "-"
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-slate-600 max-w-[200px]">
                                  {rec.absence_reason ? (
                                    <div>
                                      <span>{rec.absence_reason}</span>
                                      {rec.absence_reason_source_display && (
                                        <span className="block text-[10px] text-slate-400">
                                          المصدر: {rec.absence_reason_source_display}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <Pagination
                      currentPage={attendanceRecords.page || 1}
                      totalCount={attendanceRecords.count || 0}
                      pageSize={attendanceRecords.page_size || 10}
                      onPageChange={handleAttendancePageChange}
                      hasNext={Boolean(attendanceRecords.next)}
                      hasPrevious={Boolean(attendanceRecords.previous)}
                      itemName="سجل حضور"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: GRADES                                                             */}
          {/* ========================================================================= */}
          {activeTab === "grades" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>العلامات والتقييمات الأكاديمية</span>
                </h3>
                <p className="text-xs text-slate-500">
                  عرض درجات الطالب في الاختبارات والمذاكرات المسجلة وحالة نشر كل علامة
                </p>
              </div>

              {gradesRecords.results.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-1 text-slate-500 text-xs">
                  <Award className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                  <p className="font-bold text-slate-700">
                    لا توجد علامات مسجلة للطالب في هذه السنة الدراسية.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">عنوان التقييم</th>
                          <th className="py-2.5 px-3">تاريخ التقييم</th>
                          <th className="py-2.5 px-3">الفصل</th>
                          <th className="py-2.5 px-3">المادة</th>
                          <th className="py-2.5 px-3">الشعبة</th>
                          <th className="py-2.5 px-3 text-center">الدرجة المستحقة</th>
                          <th className="py-2.5 px-3 text-center">حالة النشر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {gradesRecords.results.map((gr) => {
                          const isPublished = gr.publication_status === "published";
                          const scoreNum = parseFloat(gr.score);
                          const maxNum = parseFloat(gr.max_score);
                          const percentage =
                            !isNaN(scoreNum) && !isNaN(maxNum) && maxNum > 0
                              ? Math.round((scoreNum / maxNum) * 100)
                              : null;

                          return (
                            <tr
                              key={gr.id}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900">
                                {gr.assessment_title || gr.assessment || "تقييم"}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-600">
                                {gr.assessment_date || "-"}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                                {gr.term?.number_display
                                  ? `الفصل ${gr.term.number_display}`
                                  : "-"}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap font-bold text-indigo-900">
                                {gr.subject?.name || "-"}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap text-teal-800 font-bold">
                                <span className="bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                                  {gr.recorded_section?.name || "-"}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap text-center">
                                <div className="inline-flex items-baseline gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                  <span className="font-black text-slate-900 font-mono text-sm">
                                    {gr.score}
                                  </span>
                                  <span className="text-slate-400 font-mono text-xs">
                                    / {gr.max_score}
                                  </span>
                                  {percentage !== null && (
                                    <span
                                      className={`text-[10px] font-bold mr-1 ${
                                        percentage >= 60
                                          ? "text-emerald-600"
                                          : "text-rose-600"
                                      }`}
                                    >
                                      ({percentage}%)
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap text-center">
                                {isPublished ? (
                                  <Badge variant="success" size="sm">
                                    منشور
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" size="sm">
                                    مسودة
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={gradesRecords.page || 1}
                    totalCount={gradesRecords.count || 0}
                    pageSize={gradesRecords.page_size || 10}
                    onPageChange={handleGradesPageChange}
                    hasNext={Boolean(gradesRecords.next)}
                    hasPrevious={Boolean(gradesRecords.previous)}
                    itemName="علامة"
                  />
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: BEHAVIOR NOTES                                                     */}
          {/* ========================================================================= */}
          {activeTab === "behavior" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                  <span>سجل الملاحظات السلوكية</span>
                </h3>
                <p className="text-xs text-slate-500">
                  الملاحظات التوجيهية والسلوكية المسجلة على الطالب خلال العام
                  الدراسي
                </p>
              </div>

              {/* Summary Badges */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                <span>
                  إجمالي الملاحظات:{" "}
                  <strong className="text-slate-900">
                    {behaviorSummary.total_notes_count ?? 0}
                  </strong>
                </span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">
                  إيجابية: {behaviorSummary.positive_notes_count ?? 0}
                </span>
                <span>•</span>
                <span className="text-rose-700 font-bold">
                  سلبية: {behaviorSummary.negative_notes_count ?? 0}
                </span>
              </div>

              {behaviorNotes.results.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-1 text-slate-500 text-xs">
                  <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                  <p className="font-bold text-slate-700">
                    لا توجد ملاحظات سلوكية مسجلة للطالب في هذه السنة.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    {behaviorNotes.results.map((note) => {
                      const isPositive = note.note_type === "positive";

                      return (
                        <div
                          key={note.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isPositive
                              ? "bg-emerald-50/40 border-emerald-200"
                              : "bg-rose-50/40 border-rose-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isPositive ? (
                                <Sparkles className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                              )}
                              <h4 className="text-xs font-black text-slate-900">
                                {note.title || (isPositive ? "سلوك إيجابي" : "ملاحظة سلبية")}
                              </h4>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge
                                variant={isPositive ? "success" : "danger"}
                                size="sm"
                              >
                                {note.note_type_display ||
                                  (isPositive ? "إيجابية" : "سلبية")}
                              </Badge>
                              <span className="text-[11px] font-mono text-slate-500">
                                {note.occurred_on}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {note.description || "لا يوجد وصف إضافي"}
                          </p>

                          {note.created_at && (
                            <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
                              سُجلت بتاريخ: {formatDateTime(note.created_at)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Pagination
                    currentPage={behaviorNotes.page || 1}
                    totalCount={behaviorNotes.count || 0}
                    pageSize={behaviorNotes.page_size || 10}
                    onPageChange={handleBehaviorPageChange}
                    hasNext={Boolean(behaviorNotes.next)}
                    hasPrevious={Boolean(behaviorNotes.previous)}
                    itemName="ملاحظة"
                  />
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: FINANCE                                                            */}
          {/* ========================================================================= */}
          {activeTab === "finance" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>الحساب المالي والمدفوعات</span>
                </h3>
                <p className="text-xs text-slate-500">
                  عرض القسط الدراسي الأساسي، الحسومات، المقبوضات النقدية، والرصيد المتبقي
                </p>
              </div>

              {/* No Financial Account Empty State */}
              {!financeAccount && !financeSummary ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2 text-slate-500 text-xs">
                  <DollarSign className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">
                    لم يتم إنشاء حساب مالي للطالب في هذه السنة الدراسية.
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    يتم إنشاء الحسابات المالية للطلاب تلقائيًا عند اعتماد خطة الأقساط
                    المدرسية وتعيين القسط لصف الطالب.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Financial Summary Metric Cards */}
                  {financeSummary && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] text-slate-500 font-bold block">
                          القسط الأساسي:
                        </span>
                        <p className="text-base font-black text-slate-900 font-mono mt-1">
                          {formatUSD(financeSummary.base_tuition_usd)}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] text-slate-500 font-bold block">
                          إجمالي الخصومات:
                        </span>
                        <p className="text-base font-black text-rose-700 font-mono mt-1">
                          {formatUSD(financeSummary.total_discounts_usd)}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] text-slate-500 font-bold block">
                          صافي القسط:
                        </span>
                        <p className="text-base font-black text-teal-800 font-mono mt-1">
                          {formatUSD(financeSummary.net_tuition_usd)}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] text-slate-500 font-bold block">
                          إجمالي المدفوع:
                        </span>
                        <p className="text-base font-black text-emerald-700 font-mono mt-1">
                          {formatUSD(financeSummary.total_paid_usd)}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                        <span className="text-[11px] text-slate-500 font-bold block">
                          المبلغ المتبقي:
                        </span>
                        <p className="text-base font-black text-amber-700 font-mono mt-1">
                          {formatUSD(financeSummary.remaining_usd)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subtabs for Payments vs Discounts */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex border-b border-slate-200 bg-slate-50/80 p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => setFinanceSubTab("payments")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          financeSubTab === "payments"
                            ? "bg-white text-teal-800 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>سجل المقبوضات والدفعات ({paymentsRecords.count})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFinanceSubTab("discounts")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          financeSubTab === "discounts"
                            ? "bg-white text-teal-800 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Percent className="w-3.5 h-3.5" />
                        <span>سجل الخصومات والتخفيضات ({discountsRecords.count})</span>
                      </button>
                    </div>

                    <div className="p-4">
                      {/* Subtab 1: Payments */}
                      {financeSubTab === "payments" && (
                        <div>
                          {paymentsRecords.results.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">
                              لا توجد دفعات مسجلة لهذا الحساب.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-right text-xs">
                                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                      <th className="py-2.5 px-3">التاريخ</th>
                                      <th className="py-2.5 px-3">المبلغ المقبوض</th>
                                      <th className="py-2.5 px-3">العملة</th>
                                      <th className="py-2.5 px-3">سعر الصرف</th>
                                      <th className="py-2.5 px-3">المكافئ بالدولار</th>
                                      <th className="py-2.5 px-3">الملاحظة</th>
                                      <th className="py-2.5 px-3">الحالة</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {paymentsRecords.results.map((p) => {
                                      const isCancelled = p.is_cancelled === true;
                                      const isSyp =
                                        (p.currency || "").toLowerCase() === "syp";

                                      return (
                                        <tr
                                          key={p.id}
                                          className={`transition-colors ${
                                            isCancelled
                                              ? "bg-rose-50/30 text-slate-400"
                                              : "hover:bg-slate-50/80"
                                          }`}
                                        >
                                          <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                                            {formatDate(p.created_at || p.payment_date || p.paid_at)}
                                          </td>

                                          <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                                            {isCancelled ? (
                                              <del>
                                                {isSyp
                                                  ? formatSYP(p.amount)
                                                  : formatUSD(p.amount)}
                                              </del>
                                            ) : isSyp ? (
                                              formatSYP(p.amount)
                                            ) : (
                                              formatUSD(p.amount)
                                            )}
                                          </td>

                                          <td className="py-2.5 px-3 whitespace-nowrap uppercase font-bold text-[11px]">
                                            {p.currency || "USD"}
                                          </td>

                                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-medium">
                                            {p.exchange_rate_syp_per_usd
                                              ? `${new Intl.NumberFormat("ar-SY").format(
                                                  p.exchange_rate_syp_per_usd
                                                )} ل.س`
                                              : "-"}
                                          </td>

                                          <td className="py-2.5 px-3 whitespace-nowrap font-bold text-emerald-700">
                                            {isCancelled ? (
                                              <del className="text-slate-400">
                                                {formatUSD(
                                                  p.equivalent_usd || p.amount
                                                )}
                                              </del>
                                            ) : (
                                              formatUSD(
                                                p.equivalent_usd || p.amount
                                              )
                                            )}
                                          </td>

                                          <td className="py-2.5 px-3 max-w-[180px]">
                                            {p.note && p.note.trim() !== "" ? (
                                              <span
                                                className="inline-block text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 font-medium truncate max-w-full"
                                                title={p.note}
                                              >
                                                {p.note}
                                              </span>
                                            ) : (
                                              <span className="text-slate-300 text-[11px]">-</span>
                                            )}
                                          </td>

                                          <td className="py-2.5 px-3 whitespace-nowrap">
                                            {isCancelled ? (
                                              <div className="space-y-0.5">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                                  <Ban className="w-3 h-3" />
                                                  <span>ملغاة</span>
                                                </span>
                                                {p.cancellation_reason && (
                                                  <p
                                                    className="text-[10px] text-rose-600 max-w-[150px] truncate"
                                                    title={p.cancellation_reason}
                                                  >
                                                    السبب: {p.cancellation_reason}
                                                  </p>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                                <Check className="w-3 h-3" />
                                                <span>نشطة</span>
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              <Pagination
                                currentPage={paymentsRecords.page || 1}
                                totalCount={paymentsRecords.count || 0}
                                pageSize={paymentsRecords.page_size || 10}
                                onPageChange={handlePaymentsPageChange}
                                hasNext={Boolean(paymentsRecords.next)}
                                hasPrevious={Boolean(paymentsRecords.previous)}
                                itemName="دفعة"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Subtab 2: Discounts */}
                      {financeSubTab === "discounts" && (
                        <div>
                          {discountsRecords.results.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">
                              لا توجد حسومات مسجلة لهذا الحساب.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-right text-xs">
                                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                      <th className="py-2.5 px-3">التاريخ</th>
                                      <th className="py-2.5 px-3">نوع الخصم</th>
                                      <th className="py-2.5 px-3">القيمة الأصلية</th>
                                      <th className="py-2.5 px-3">المكافئ بالدولار</th>
                                      <th className="py-2.5 px-3">سبب الخصم</th>
                                      <th className="py-2.5 px-3">الحالة</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {discountsRecords.results.map((d) => {
                                      const isCancelled = d.is_cancelled === true;
                                      const isPercentage =
                                        d.discount_type === "percentage";

                                      return (
                                        <tr
                                          key={d.id}
                                          className={`transition-colors ${
                                            isCancelled
                                              ? "bg-rose-50/30 text-slate-400"
                                              : "hover:bg-slate-50/80"
                                          }`}
                                        >
                                          <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                                            {formatDate(d.created_at)}
                                          </td>

                                          <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                                            {isPercentage ? (
                                              <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                                نسبة مئوية ({d.value}%)
                                              </span>
                                            ) : (
                                              <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                                مبلغ ثابت
                                              </span>
                                            )}
                                          </td>

                                          <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                                            {isPercentage
                                              ? `${d.value}%`
                                              : (d.currency || "").toLowerCase() === "syp"
                                              ? formatSYP(d.value)
                                              : formatUSD(d.value)}
                                          </td>

                                          <td className="py-2.5 px-3 whitespace-nowrap font-bold text-rose-700">
                                            {isCancelled ? (
                                              <del className="text-slate-400">
                                                {formatUSD(
                                                  d.discount_usd ||
                                                    d.equivalent_usd ||
                                                    d.value
                                                )}
                                              </del>
                                            ) : (
                                              formatUSD(
                                                d.discount_usd ||
                                                  d.equivalent_usd ||
                                                  d.value
                                              )
                                            )}
                                          </td>

                                          <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate">
                                            {d.reason || "-"}
                                          </td>

                                          <td className="py-2.5 px-3 whitespace-nowrap">
                                            {isCancelled ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                                <Ban className="w-3 h-3" />
                                                <span>ملغاة</span>
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                                <Check className="w-3 h-3" />
                                                <span>نشطة</span>
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              <Pagination
                                currentPage={discountsRecords.page || 1}
                                totalCount={discountsRecords.count || 0}
                                pageSize={discountsRecords.page_size || 10}
                                onPageChange={handleDiscountsPageChange}
                                hasNext={Boolean(discountsRecords.next)}
                                hasPrevious={Boolean(discountsRecords.previous)}
                                itemName="خصم"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
