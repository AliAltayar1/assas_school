import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";
import { toast } from "sonner";
import { parseApiError, extractPaginatedList } from "../../utils/errorUtils";
import { canDecideAppointments } from "../../utils/permissionUtils";
import {
  CalendarDays,
  CalendarCheck,
  Search,
  RefreshCw,
  X,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Calendar,
  Eye,
  Info,
  ShieldCheck,
  FileText,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

export function AppointmentManagement() {
  const { user, hasPermission, isSuperuser } = useAuthStore();
  const canDecide = hasPermission("appointments.decide_appointment_request") || isSuperuser;

  // Appointments Data States
  const [appointments, setAppointments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search States
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" | "pending" | "approved" | "rejected"
  const [requestedDateFilter, setRequestedDateFilter] = useState("");
  const [orderingFilter, setOrderingFilter] = useState("-created_at");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Modals States
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Decision Modal (Approve / Reject)
  const [decisionModalType, setDecisionModalType] = useState(null); // 'approve' | 'reject' | null
  const [targetAppointment, setTargetAppointment] = useState(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionModalError, setDecisionModalError] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch Appointments List
  const fetchAppointments = useCallback(
    async (page = currentPage) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = {
          page: page,
          ordering: orderingFilter,
        };

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (statusFilter) params.status = statusFilter;
        if (requestedDateFilter) params.requested_date = requestedDateFilter;

        const data = await api.appointments.getAll(params);
        const { results, count, next, previous } = extractPaginatedList(data);

        setAppointments(results);
        setTotalCount(count);
        setHasNext(Boolean(next));
        setHasPrevious(Boolean(previous));
      } catch (err) {
        setError(
          parseApiError(
            err,
            "حدث خطأ أثناء استرجاع قائمة طلبات مواعيد حضور أولياء الأمور."
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, debouncedSearch, statusFilter, requestedDateFilter, orderingFilter]
  );

  useEffect(() => {
    fetchAppointments(currentPage);
  }, [fetchAppointments, currentPage]);

  // Date & Time Formatter Helpers
  const formatDateTime = (isoString) => {
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
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return "-";
    try {
      const [year, month, day] = dateString.split("-");
      if (year && month && day) {
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString("ar-EG", {
          weekday: "long",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const formatTimeOnly = (timeString) => {
    if (!timeString) return "-";
    try {
      const parts = String(timeString).split(":");
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        if (!isNaN(hours)) {
          const isPm = hours >= 12;
          const period = isPm ? "مساءً" : "صباحاً";
          hours = hours % 12 || 12;
          return `${hours}:${minutes} ${period}`;
        }
      }
      return timeString;
    } catch {
      return timeString;
    }
  };

  // Quick Stats Calculation
  const stats = useMemo(() => {
    const total = totalCount || appointments.length;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    appointments.forEach((item) => {
      if (item.status === "pending") pendingCount++;
      else if (item.status === "approved") approvedCount++;
      else if (item.status === "rejected") rejectedCount++;
    });

    return {
      total,
      pendingCount,
      approvedCount,
      rejectedCount,
    };
  }, [totalCount, appointments]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("");
    setRequestedDateFilter("");
    setOrderingFilter("-created_at");
    setCurrentPage(1);
    toast.info("تمت استعادة خيارات التصفية الافتراضية.");
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    Boolean(statusFilter) ||
    Boolean(requestedDateFilter) ||
    orderingFilter !== "-created_at";

  // Open Details Modal
  const handleOpenDetails = async (appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);

    // Fetch fresh single details in background to ensure sync
    if (appointment?.id) {
      try {
        const freshData = await api.appointments.getById(appointment.id);
        const singleData = freshData?.data || freshData;
        if (singleData && typeof singleData === "object") {
          setSelectedAppointment(singleData);
        }
      } catch (_) {
        // Fallback to already loaded data if single get fails
      }
    }
  };

  // Open Decision Dialog (Approve / Reject)
  const handleOpenDecisionDialog = (appointment, type) => {
    if (appointment.status !== "pending") {
      toast.error("تم اتخاذ قرار بشأن هذا الطلب مسبقاً ولا يمكن تعديله.");
      return;
    }
    setTargetAppointment(appointment);
    setDecisionModalType(type);
    setDecisionReason("");
    setApprovalNote("");
    setDecisionModalError(null);
  };

  // Submit Decision (Approve or Reject)
  const handleSubmitDecision = async (e) => {
    if (e) e.preventDefault();
    if (!targetAppointment?.id || !decisionModalType) return;

    if (decisionModalType === "reject") {
      const trimmedReason = decisionReason.trim();
      if (!trimmedReason) {
        setDecisionModalError("سبب الرفض إجباري. يرجى كتابة سبب الرفض للمتابعة.");
        return;
      }
    }

    if (targetAppointment.status !== "pending") {
      setDecisionModalError("تم اتخاذ قرار بشأن هذا الطلب مسبقاً.");
      return;
    }

    setIsSubmittingDecision(true);
    setDecisionModalError(null);

    try {
      let res;
      if (decisionModalType === "approve") {
        const trimmedNote = approvalNote.trim();
        res = await api.appointments.approve(targetAppointment.id, trimmedNote);
        toast.success(res?.message || "تم قبول طلب الموعد بنجاح.");
      } else {
        const trimmedReason = decisionReason.trim();
        res = await api.appointments.reject(targetAppointment.id, trimmedReason);
        toast.success(res?.message || "تم رفض طلب الموعد بنجاح.");
      }

      // Close decision dialog
      setDecisionModalType(null);
      setTargetAppointment(null);
      setDecisionReason("");
      setApprovalNote("");

      // If details modal was open for this appointment, close it or refresh it
      if (selectedAppointment?.id === targetAppointment.id) {
        setIsDetailsModalOpen(false);
      }

      // Refetch appointments from backend (Source of Truth)
      fetchAppointments(currentPage);
    } catch (err) {
      const parsed = parseApiError(
        err,
        decisionModalType === "approve"
          ? "فشل قبول طلب الموعد. يرجى التحقق والمحاولة مجدداً."
          : "فشل رفض طلب الموعد. يرجى التحقق والمحاولة مجدداً."
      );
      setDecisionModalError(parsed);
      toast.error(parsed);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Render Status Badge Helper
  const renderStatusBadge = (status, statusDisplay) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{statusDisplay || "مقبول"}</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{statusDisplay || "مرفوض"}</span>
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>{statusDisplay || "قيد الانتظار"}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-right dir-rtl" dir="rtl">
      {/* 1. Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">
              مواعيد حضور أولياء الأمور (Guardian Appointments)
            </h2>
            {totalCount > 0 && (
              <span className="bg-teal-50 text-teal-700 text-xs px-2.5 py-0.5 rounded-full border border-teal-200 font-bold">
                {totalCount} طلب
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 pr-1 leading-relaxed">
            متابعة طلبات حضور أولياء الأمور إلى المدرسة واتخاذ قرار القبول أو الرفض مع تدوين السبب الرسمي.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1 sm:pt-0 self-start sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAppointments(currentPage)}
            disabled={isLoading}
            title="تحديث القائمة"
            className="h-9 px-3 gap-1.5 text-xs font-semibold w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* 2. Quick KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Appointments */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              إجمالي الطلبات
            </span>
            <span className="text-lg sm:text-xl font-bold text-slate-900">
              {stats.total}
            </span>
          </div>
        </div>

        {/* Pending Appointments */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              قيد الانتظار (Pending)
            </span>
            <span className="text-lg sm:text-xl font-bold text-amber-700">
              {stats.pendingCount}
            </span>
          </div>
        </div>

        {/* Approved Appointments */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              المقبولة (Approved)
            </span>
            <span className="text-lg sm:text-xl font-bold text-emerald-700">
              {stats.approvedCount}
            </span>
          </div>
        </div>

        {/* Rejected Appointments */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              المرفوضة (Rejected)
            </span>
            <span className="text-lg sm:text-xl font-bold text-rose-700">
              {stats.rejectedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Global Error Alert */}
      {error && (
        <Alert variant="danger" title="تعذر جلب البيانات" className="text-xs">
          {error}
        </Alert>
      )}

      {/* 3. Search & Filters Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="البحث باسم ولي الأمر..."
              className="w-full h-9 sm:h-10 pr-9 pl-8 text-xs border border-slate-200 rounded-xl bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all placeholder:text-slate-400"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 sm:h-10 text-xs border border-slate-200 rounded-xl px-3 bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium text-slate-700"
            >
              <option value="">جميع الحالات</option>
              <option value="pending">قيد الانتظار (Pending)</option>
              <option value="approved">مقبول (Approved)</option>
              <option value="rejected">مرفوض (Rejected)</option>
            </select>

            {/* Advanced Filters Toggle */}
            <Button
              variant={isFilterDrawerOpen ? "primary" : "outline"}
              size="sm"
              onClick={() => setIsFilterDrawerOpen((prev) => !prev)}
              className="h-9 sm:h-10 px-3 text-xs gap-1.5 shrink-0"
              title="خيارات الفلترة المتقدمة"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>فلاتر إضافية</span>
            </Button>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 sm:h-10 px-2.5 sm:px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 shrink-0"
                title="إلغاء جميع الفلاتر"
              >
                <X className="w-3.5 h-3.5 ml-1" />
                <span>إعادة ضبط</span>
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters Drawer */}
        {isFilterDrawerOpen && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Requested Date Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                تاريخ الحضور المطلوب:
              </label>
              <input
                type="date"
                value={requestedDateFilter}
                onChange={(e) => {
                  setRequestedDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2.5 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Ordering Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                ترتيب النتائج:
              </label>
              <select
                value={orderingFilter}
                onChange={(e) => {
                  setOrderingFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2.5 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium"
              >
                <option value="-created_at">تاريخ الإرسال (الأحدث أولاً)</option>
                <option value="created_at">تاريخ الإرسال (الأقدم أولاً)</option>
                <option value="requested_date">تاريخ الموعد المطلوب (الأقرب أولاً)</option>
                <option value="-requested_date">تاريخ الموعد المطلوب (الأبعد أولاً)</option>
                <option value="requested_time">الساعة المطلوبة (الأبكر أولاً)</option>
                <option value="-requested_time">الساعة المطلوبة (الأحدث أولاً)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4. Appointments List / Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 sm:py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
            <p className="text-xs font-semibold text-slate-600">
              جاري تحميل قائمة طلبات المواعيد...
            </p>
          </div>
        ) : appointments.length === 0 ? (
          /* Empty State */
          <div className="py-12 sm:py-16 px-4 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-teal-100 shadow-sm">
              <CalendarDays className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            {hasActiveFilters ? (
              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  لم يتم العثور على أي مواعيد تطابق الفلاتر المحددة
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  يرجى تجربة تعديل معايير البحث أو اختيار حالة وتاريخ آخر.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="text-xs"
                  >
                    مسح جميع الفلاتر
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-w-md mx-auto">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  لا توجد طلبات مواعيد حتى الآن
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  هذه الشاشة مخصصة لعرض وإدارة مواعيد حضور أولياء الأمور إلى المدرسة واتخاذ قرارات القبول والرفض.
                </p>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-right text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Info className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>ملاحظة تقنية:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    الـ Backend لوحدة المواعيد جاهز بالكامل. طلبات المواعيد الجديدة ستصل من أولياء الأمور عبر تطبيق الهاتف عند إرسالها وتظهر هنا فوراً.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View (md and up) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">ولي الأمر</th>
                    <th className="py-3.5 px-4">التاريخ المطلوب</th>
                    <th className="py-3.5 px-4">الساعة المطلوبة</th>
                    <th className="py-3.5 px-4 min-w-[180px]">سبب طلب الحضور</th>
                    <th className="py-3.5 px-4">الحالة</th>
                    <th className="py-3.5 px-4">تاريخ إرسال الطلب</th>
                    <th className="py-3.5 px-4">قرار الإدارة</th>
                    <th className="py-3.5 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        item.status === "pending" ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Guardian Info */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {item.guardian_display || item.guardian_username || "ولي أمر"}
                            </span>
                            {item.guardian_username && item.guardian_display && (
                              <span className="text-[10px] text-slate-400 block dir-ltr text-right">
                                @{item.guardian_username}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Requested Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{item.requested_date}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block pr-5">
                          {formatDateOnly(item.requested_date)}
                        </span>
                      </td>

                      {/* Requested Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-teal-800">
                          <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{formatTimeOnly(item.requested_time)}</span>
                        </div>
                        {item.requested_time && (
                          <span className="text-[10px] text-slate-400 block pr-5 font-mono">
                            {String(item.requested_time).slice(0, 5)}
                          </span>
                        )}
                      </td>

                      {/* Request Reason */}
                      <td className="py-3.5 px-4">
                        <p
                          className="text-slate-700 font-medium line-clamp-2 max-w-xs cursor-pointer hover:text-teal-700 transition-colors"
                          title={item.request_reason}
                          onClick={() => handleOpenDetails(item)}
                        >
                          {item.request_reason}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(item.status, item.status_display)}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-medium">
                        {formatDateTime(item.created_at)}
                      </td>

                      {/* Decision Details Column */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                        {item.status !== "pending" ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="font-semibold text-slate-800">
                                {item.decided_by_display || item.decided_by_username || "الإدارة"}
                              </span>
                              {item.decided_at && (
                                <span className="text-slate-400 text-[10px]">
                                  ({formatDateTime(item.decided_at)})
                                </span>
                              )}
                            </div>
                            {item.status === "approved" && item.approval_note && (
                              <p
                                className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 line-clamp-1"
                                title={`ملاحظة الإدارة: ${item.approval_note}`}
                              >
                                ملاحظة: {item.approval_note}
                              </p>
                            )}
                            {item.status === "rejected" && item.decision_reason && (
                              <p
                                className="text-[11px] text-rose-800 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 line-clamp-1"
                                title={`سبب الرفض: ${item.decision_reason}`}
                              >
                                السبب: {item.decision_reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Details Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetails(item)}
                            className="h-8 px-2.5 text-xs gap-1 font-medium text-slate-700 hover:text-teal-700 hover:border-teal-300"
                            title="عرض كامل التفاصيل"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض</span>
                          </Button>

                          {/* If Pending & Allowed: Approve & Reject Buttons */}
                          {item.status === "pending" && canDecide && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenDecisionDialog(item, "approve")}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                                title="قبول طلب الموعد"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>قبول</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDecisionDialog(item, "reject")}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1"
                                title="رفض طلب الموعد"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>رفض</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {appointments.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 space-y-3 transition-colors ${
                    item.status === "pending" ? "bg-amber-50/20" : "hover:bg-slate-50/60"
                  }`}
                >
                  {/* Card Header: Guardian & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">
                          {item.guardian_display || item.guardian_username || "ولي أمر"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          إرسال: {formatDateTime(item.created_at)}
                        </span>
                      </div>
                    </div>

                    <div>{renderStatusBadge(item.status, item.status_display)}</div>
                  </div>

                  {/* Requested Date & Time Highlight */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500 font-medium text-[10px] block mb-0.5">
                        التاريخ المطلوب:
                      </span>
                      <div className="flex items-center gap-1 font-bold text-teal-800">
                        <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{item.requested_date}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium text-[10px] block mb-0.5">
                        الساعة المطلوبة:
                      </span>
                      <div className="flex items-center gap-1 font-bold text-teal-700">
                        <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{formatTimeOnly(item.requested_time)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Request Reason */}
                  <div
                    onClick={() => handleOpenDetails(item)}
                    className="cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200/70 hover:border-teal-300 transition-colors"
                  >
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                      سبب طلب الحضور:
                    </span>
                    <p className="text-xs text-slate-700 font-medium line-clamp-3 leading-relaxed">
                      {item.request_reason}
                    </p>
                  </div>

                  {/* If Decided: Decision Details Box */}
                  {item.status !== "pending" && (
                    <div
                      className={`p-2.5 rounded-xl text-xs space-y-1.5 border ${
                        item.status === "approved"
                          ? "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                          : "bg-rose-50/50 border-rose-100 text-rose-900"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span>
                          {item.status === "approved" ? "تم القبول بواسطة:" : "سبب الرفض:"}
                        </span>
                        <span className="text-[10px] font-normal text-slate-500">
                          {item.decided_by_display || item.decided_by_username}
                        </span>
                      </div>
                      {item.status === "rejected" && item.decision_reason && (
                        <p className="text-xs font-medium leading-relaxed">
                          {item.decision_reason}
                        </p>
                      )}
                      {item.status === "approved" && item.approval_note && (
                        <div className="pt-1.5 border-t border-emerald-100">
                          <span className="text-[10px] text-emerald-700 font-bold block mb-0.5">
                            ملاحظة الإدارة لولي الأمر:
                          </span>
                          <p className="text-xs font-medium leading-relaxed text-emerald-950">
                            {item.approval_note}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetails(item)}
                      className="flex-1 h-8 text-xs font-semibold gap-1.5 justify-center"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>عرض التفاصيل</span>
                    </Button>

                    {item.status === "pending" && canDecide && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenDecisionDialog(item, "approve")}
                          className="flex-1 h-8 inline-flex items-center justify-center gap-1 px-3 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>قبول</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDecisionDialog(item, "reject")}
                          className="flex-1 h-8 inline-flex items-center justify-center gap-1 px-3 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>رفض</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Controls */}
        {appointments.length > 0 && (
          <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/40">
            <Pagination
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={20}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. Details Modal (عرض تفاصيل طلب الموعد) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedAppointment(null);
        }}
        title="تفاصيل طلب الموعد"
        maxWidth="max-w-lg"
      >
        {selectedAppointment && (
          <div className="space-y-4 text-right">
            {/* Header Status & Date */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {renderStatusBadge(
                  selectedAppointment.status,
                  selectedAppointment.status_display
                )}
              </div>
              <span className="text-xs text-slate-400 font-medium">
                تاريخ الإرسال: {formatDateTime(selectedAppointment.created_at)}
              </span>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
              {/* Guardian Info */}
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">
                  اسم ولي الأمر:
                </span>
                <span className="font-bold text-slate-900 block text-sm">
                  {selectedAppointment.guardian_display ||
                    selectedAppointment.guardian_username ||
                    "غير محدد"}
                </span>
                {selectedAppointment.guardian_username && (
                  <span className="text-[11px] text-slate-500 block dir-ltr text-right">
                    @{selectedAppointment.guardian_username}
                  </span>
                )}
              </div>

              {/* Requested Date & Time */}
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">
                  الموعد المطلوب للحضور:
                </span>
                <div className="flex items-center gap-1.5 font-bold text-teal-800 text-sm">
                  <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{selectedAppointment.requested_date}</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-teal-700 text-xs mt-1">
                  <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>الساعة: {formatTimeOnly(selectedAppointment.requested_time)}</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {formatDateOnly(selectedAppointment.requested_date)}
                </span>
              </div>
            </div>

            {/* Request Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                <span>سبب طلب الحضور:</span>
              </label>
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 text-xs text-slate-800 leading-relaxed min-h-[70px] whitespace-pre-wrap">
                {selectedAppointment.request_reason || "لا يوجد نص مدخل"}
              </div>
            </div>

            {/* If Decided: Decision Information */}
            {selectedAppointment.status !== "pending" && (
              <div
                className={`p-3.5 rounded-2xl space-y-2 border ${
                  selectedAppointment.status === "approved"
                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                    : "bg-rose-50/60 border-rose-200 text-rose-950"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold border-b border-black/5 pb-2">
                  <span className="flex items-center gap-1.5">
                    {selectedAppointment.status === "approved" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>
                      {selectedAppointment.status === "approved"
                        ? "بيانات قبول الطلب"
                        : "بيانات رفض الطلب"}
                    </span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-600">
                    {formatDateTime(selectedAppointment.decided_at)}
                  </span>
                </div>

                {selectedAppointment.status === "rejected" ? (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                      سبب الرفض:
                    </span>
                    <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap text-rose-800">
                      {selectedAppointment.decision_reason || "لم يذكر سبب"}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                      حالة القرار:
                    </span>
                    <p className="text-xs font-medium leading-relaxed text-emerald-800">
                      {selectedAppointment.decision_reason || "تم قبول وتأكيد طلب الموعد بنجاح"}
                    </p>
                    {selectedAppointment.approval_note && (
                      <div className="mt-2.5 pt-2 border-t border-emerald-200/60">
                        <span className="text-[11px] font-bold text-emerald-900 block mb-1">
                          ملاحظة الإدارة لولي الأمر:
                        </span>
                        <div className="bg-white/85 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-950 leading-relaxed whitespace-pre-wrap font-medium">
                          {selectedAppointment.approval_note}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-slate-600 pt-1 flex items-center justify-between">
                  <span>صاحب القرار:</span>
                  <span className="font-bold text-slate-800">
                    {selectedAppointment.decided_by_display ||
                      selectedAppointment.decided_by_username ||
                      "الإدارة"}
                  </span>
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedAppointment(null);
                }}
                className="text-xs"
              >
                إغلاق
              </Button>

              {/* If Pending and allowed, quick decision action buttons */}
              {selectedAppointment.status === "pending" && canDecide && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenDecisionDialog(selectedAppointment, "reject");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>رفض الطلب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleOpenDecisionDialog(selectedAppointment, "approve");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>قبول الطلب</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* 6. Decision Confirmation Dialog (قبول أو رفض طلب الموعد) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(decisionModalType && targetAppointment)}
        onClose={() => {
          if (!isSubmittingDecision) {
            setDecisionModalType(null);
            setTargetAppointment(null);
            setDecisionReason("");
            setDecisionModalError(null);
          }
        }}
        title={
          decisionModalType === "approve"
            ? "قبول طلب الموعد (Approve Appointment)"
            : "رفض طلب الموعد (Reject Appointment)"
        }
        maxWidth="max-w-md"
      >
        {targetAppointment && (
          <form onSubmit={handleSubmitDecision} className="space-y-4 text-right">
            {/* Header Callout */}
            <div
              className={`p-3.5 rounded-2xl flex items-start gap-3 border ${
                decisionModalType === "approve"
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                  : "bg-rose-50/80 border-rose-200 text-rose-950"
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  decisionModalType === "approve"
                    ? "bg-emerald-600 text-white"
                    : "bg-rose-600 text-white"
                }`}
              >
                {decisionModalType === "approve" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1 text-xs">
                <span className="font-bold block text-sm">
                  {decisionModalType === "approve"
                    ? "تأكيد الموافقة على الموعد"
                    : "تأكيد رفض طلب الموعد"}
                </span>
                <p className="text-slate-600 leading-relaxed">
                  طلب ولي الأمر:{" "}
                  <strong className="text-slate-900">
                    {targetAppointment.guardian_display ||
                      targetAppointment.guardian_username}
                  </strong>{" "}
                  بتاريخ{" "}
                  <strong className="text-slate-900">
                    {targetAppointment.requested_date}
                  </strong>
                  {targetAppointment.requested_time && (
                    <>
                      {" "}الساعة{" "}
                      <strong className="text-slate-900">
                        {formatTimeOnly(targetAppointment.requested_time)}
                      </strong>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Error in Decision Modal */}
            {decisionModalError && (
              <Alert variant="danger" title="خطأ في الإدخال" className="text-xs">
                {decisionModalError}
              </Alert>
            )}

            {/* Decision Reason Input (Only for reject, confirmation & optional note for approve) */}
            {decisionModalType === "reject" ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="decision_reason"
                  className="block text-xs font-bold text-slate-800"
                >
                  سبب الرفض <span className="text-rose-500">* (إجباري)</span>
                </label>
                <textarea
                  id="decision_reason"
                  rows={3}
                  value={decisionReason}
                  onChange={(e) => {
                    setDecisionReason(e.target.value);
                    if (decisionModalError) setDecisionModalError(null);
                  }}
                  placeholder="اكتب سبب الرفض لولي الأمر (مثال: يرجى اختيار موعد آخر بسبب عدم توفر الإدارة في هذا التاريخ)..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none placeholder:text-slate-400 leading-relaxed resize-none font-medium"
                  required
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 leading-relaxed">
                  سيتم تغيير حالة الطلب مباشرة إلى <strong>مقبول</strong> وتوثيق القرار باسمك.
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="approval_note"
                    className="block text-xs font-bold text-slate-800"
                  >
                    ملاحظة لولي الأمر <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <textarea
                    id="approval_note"
                    rows={3}
                    value={approvalNote}
                    onChange={(e) => {
                      setApprovalNote(e.target.value);
                      if (decisionModalError) setDecisionModalError(null);
                    }}
                    placeholder="مثال: يرجى الحضور لمكتب الإدارة في الدور الأرضي مع إحضار الأوراق المطلوبة..."
                    className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 leading-relaxed resize-none font-medium"
                  />
                  <p className="text-[11px] text-slate-400">
                    يمكنك كتابة توجيهات إضافية ستظهر لولي الأمر في حسابه عند قبول الموعد.
                  </p>
                </div>
              </div>
            )}

            {/* Modal Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDecisionModalType(null);
                  setTargetAppointment(null);
                  setDecisionReason("");
                  setDecisionModalError(null);
                }}
                disabled={isSubmittingDecision}
                className="text-xs font-semibold px-4"
              >
                إلغاء
              </Button>

              <button
                type="submit"
                disabled={isSubmittingDecision}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold rounded-xl text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                  decisionModalType === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                    : "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500"
                }`}
              >
                {isSubmittingDecision && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>
                  {decisionModalType === "approve"
                    ? "تأكيد القبول"
                    : "تأكيد الرفض"}
                </span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
export default AppointmentManagement;
