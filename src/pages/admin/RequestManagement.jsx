import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";
import { toast } from "sonner";
import { parseApiError, extractPaginatedList } from "../../utils/errorUtils";
import {
  Inbox,
  Search,
  RefreshCw,
  X,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
  Clock,
  MessageSquare,
  MessageSquareReply,
  AlertCircle,
  Lightbulb,
  HelpCircle,
  User,
  GraduationCap,
  Calendar,
  Send,
  Sparkles,
  Info,
  ShieldCheck,
  FileText,
  Eye,
  ArrowRight,
} from "lucide-react";

export function RequestManagement() {
  const { user, hasPermission, isSuperuser } = useAuthStore();
  const canReply =
    hasPermission("school_requests.reply_to_request") || isSuperuser;

  // Requests Data States
  const [requests, setRequests] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search States
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(""); // "" | "complaint" | "suggestion" | "inquiry"
  const [statusFilter, setStatusFilter] = useState(""); // "" | "new" | "answered"
  const [createdFromFilter, setCreatedFromFilter] = useState("");
  const [createdToFilter, setCreatedToFilter] = useState("");
  const [orderingFilter, setOrderingFilter] = useState("-created_at");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Modals & Selected Request States
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch Requests List
  const fetchRequests = useCallback(
    async (page = currentPage) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = {
          page: page,
          ordering: orderingFilter,
        };

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (typeFilter) params.request_type = typeFilter;
        if (statusFilter) params.status = statusFilter;
        if (createdFromFilter) params.created_from = createdFromFilter;
        if (createdToFilter) params.created_to = createdToFilter;

        const data = await api.requests.getAll(params);
        const { results, count, next, previous } = extractPaginatedList(data);

        setRequests(results);
        setTotalCount(count);
        setHasNext(Boolean(next));
        setHasPrevious(Boolean(previous));
      } catch (err) {
        setError(
          parseApiError(
            err,
            "حدث خطأ أثناء استرجاع قائمة الشكاوى والاقتراحات والاستفسارات.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentPage,
      debouncedSearch,
      typeFilter,
      statusFilter,
      createdFromFilter,
      createdToFilter,
      orderingFilter,
    ],
  );

  useEffect(() => {
    fetchRequests(currentPage);
  }, [fetchRequests, currentPage]);

  // Date Formatter Helper
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

  // Quick Stats Calculation
  const stats = useMemo(() => {
    const total = totalCount || requests.length;
    let newCount = 0;
    let answeredCount = 0;
    let complaintsCount = 0;
    let suggestionsCount = 0;
    let inquiriesCount = 0;

    requests.forEach((r) => {
      if (r.status === "new") newCount++;
      if (r.status === "answered") answeredCount++;

      if (r.request_type === "complaint") complaintsCount++;
      else if (r.request_type === "suggestion") suggestionsCount++;
      else if (r.request_type === "inquiry") inquiriesCount++;
    });

    return {
      total,
      newCount,
      answeredCount,
      complaintsCount,
      suggestionsCount,
      inquiriesCount,
    };
  }, [totalCount, requests]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setCreatedFromFilter("");
    setCreatedToFilter("");
    setOrderingFilter("-created_at");
    setCurrentPage(1);
    toast.info("تمت استعادة خيارات التصفية الافتراضية.");
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    Boolean(typeFilter) ||
    Boolean(statusFilter) ||
    Boolean(createdFromFilter) ||
    Boolean(createdToFilter);

  // Open Details & Answer Modal
  const handleOpenRequest = async (req) => {
    setSelectedRequest(req);
    setResponseText("");
    setModalError(null);
    setIsDetailsModalOpen(true);

    try {
      const freshReq = await api.requests.getById(req.id);
      if (freshReq) {
        const data = freshReq.data || freshReq;
        setSelectedRequest(data);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setIsDetailsModalOpen(false);
        setSelectedRequest(null);
        toast.error(
          "هذا الطلب غير متاح أو يقع خارج نطاق الصلاحيات والمراحل المقررة لك.",
        );
        fetchRequests(currentPage);
      } else {
        console.warn("Could not fetch latest request details:", err);
      }
    }
  };

  // Submit Answer to Request Handler
  const handleSubmitAnswer = async (e) => {
    if (e) e.preventDefault();
    if (!selectedRequest?.id) return;

    if (!responseText.trim()) {
      setModalError("يرجى كتابة نص رد المدرسة قبل الإرسال.");
      return;
    }

    if (selectedRequest.status === "answered") {
      setModalError(
        "هذا الطلب تمت الإجابة عليه مسبقاً ولا يمكن الرد عليه مجدداً.",
      );
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const response = await api.requests.answer(
        selectedRequest.id,
        responseText.trim(),
      );

      toast.success("تم إرسال رد المدرسة بنجاح واكتمال معالجة الطلب.");

      // If backend returned updated request object, update local state
      const updatedData = response?.data || response;
      const updatedItem = {
        ...selectedRequest,
        status: "answered",
        status_display: "تمت الإجابة",
        school_response: responseText.trim(),
        handled_by_username: user?.username || "الإدارة",
        answered_at: new Date().toISOString(),
        ...(typeof updatedData === "object" ? updatedData : {}),
      };

      setRequests((prev) =>
        prev.map((item) =>
          item.id === selectedRequest.id ? updatedItem : item,
        ),
      );
      setSelectedRequest(updatedItem);
      setIsDetailsModalOpen(false);

      // Re-fetch to guarantee synchronized state
      fetchRequests(currentPage);
    } catch (err) {
      if (err?.response?.status === 404) {
        setIsDetailsModalOpen(false);
        setSelectedRequest(null);
        toast.error(
          "هذا الطلب غير متاح أو أصبح خارج نطاق الصلاحيات والمراحل المقررة لك.",
        );
        fetchRequests(currentPage);
      } else {
        const parsed = parseApiError(
          err,
          "فشل إرسال رد المدرسة. يرجى المحاولة لاحقاً.",
        );
        setModalError(parsed);
        toast.error(parsed);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Response Template Inserter
  const handleApplyTemplate = (templateText) => {
    setResponseText(templateText);
    setModalError(null);
  };

  // Render Type Badge Helper
  const renderTypeBadge = (type, display) => {
    switch (type) {
      case "complaint":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>{display || "شكوى"}</span>
          </span>
        );
      case "suggestion":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Lightbulb className="w-3.5 h-3.5 text-sky-500" />
            <span>{display || "اقتراح"}</span>
          </span>
        );
      case "inquiry":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
            <span>{display || "استفسار"}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>{display || type || "طلب"}</span>
          </span>
        );
    }
  };

  // Render Status Badge Helper
  const renderStatusBadge = (status, display) => {
    if (status === "answered") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{display || "تمت الإجابة"}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
        <span>{display || "جديد (بانتظار الرد)"}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-right dir-rtl" dir="rtl">
      {/* 1. Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
              <Inbox className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">
              الشكاوى والاقتراحات والاستفسارات (School Requests)
            </h2>
            {totalCount > 0 && (
              <span className="bg-teal-50 text-teal-700 text-xs px-2.5 py-0.5 rounded-full border border-teal-200 font-bold">
                {totalCount} طلب
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 pr-1 leading-relaxed">
            استقبال ومتابعة طلبات ورسائل أولياء الأمور الواردة من تطبيق الهاتف
            والرد الرسمي عليها بدقة وفاعلية.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1 sm:pt-0 self-start sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRequests(currentPage)}
            disabled={isLoading}
            title="تحديث القائمة"
            className="h-9 px-3 gap-1.5 text-xs font-semibold w-full sm:w-auto"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* 2. Quick KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Requests */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
            <Inbox className="w-5 h-5" />
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

        {/* New / Pending Requests */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              جديدة بانتظار الرد
            </span>
            <span className="text-lg sm:text-xl font-bold text-amber-700">
              {stats.newCount}
            </span>
          </div>
        </div>

        {/* Answered Requests */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              تمت الإجابة عليها
            </span>
            <span className="text-lg sm:text-xl font-bold text-emerald-700">
              {stats.answeredCount}
            </span>
          </div>
        </div>

        {/* Breakdown Summary */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="text-[11px] space-y-1 flex-1 min-w-0">
            <span className="text-slate-500 block font-medium">
              توزيع الأنواع
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-bold text-slate-700">
              <span className="text-rose-600 whitespace-nowrap" title="شكاوى">
                {stats.complaintsCount} شكوى
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-sky-600 whitespace-nowrap" title="اقتراحات">
                {stats.suggestionsCount} اقتراح
              </span>
              <span className="text-slate-300">•</span>
              <span
                className="text-purple-600 whitespace-nowrap"
                title="استفسارات"
              >
                {stats.inquiriesCount} استفسار
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert type="error" title="تنبيه">
          {error}
        </Alert>
      )}

      {/* 3. Search and Filters Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث في تفاصيل الطلب أو رد المدرسة..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pr-9 pl-8 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 hover:bg-white transition-colors"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Request Type Selector */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 sm:flex-initial h-9 text-xs border border-slate-200 rounded-xl px-2.5 sm:px-3 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium min-w-[130px]"
            >
              <option value="">جميع الأنواع</option>
              <option value="complaint">شكاوى (Complaints)</option>
              <option value="suggestion">اقتراحات (Suggestions)</option>
              <option value="inquiry">استفسارات (Inquiries)</option>
            </select>

            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 sm:flex-initial h-9 text-xs border border-slate-200 rounded-xl px-2.5 sm:px-3 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium min-w-[110px]"
            >
              <option value="">جميع الحالات</option>
              <option value="new">جديد (New)</option>
              <option value="answered">تمت الإجابة (Answered)</option>
            </select>

            {/* Toggle Advanced Filters Drawer */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className={`h-9 px-2.5 sm:px-3 text-xs gap-1.5 shrink-0 ${
                hasActiveFilters
                  ? "border-teal-500 text-teal-700 bg-teal-50/50"
                  : ""
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">فلاتر متقدمة</span>
              <span className="sm:hidden">فلاتر</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${
                  isFilterDrawerOpen ? "rotate-180" : ""
                }`}
              />
            </Button>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2.5 sm:px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 shrink-0"
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
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Created From Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                تاريخ الإرسال (من):
              </label>
              <input
                type="date"
                value={createdFromFilter}
                onChange={(e) => {
                  setCreatedFromFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2.5 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Created To Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                تاريخ الإرسال (إلى):
              </label>
              <input
                type="date"
                value={createdToFilter}
                onChange={(e) => {
                  setCreatedToFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 text-xs border border-slate-200 rounded-lg px-2.5 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Ordering Selector */}
            <div className="sm:col-span-2 lg:col-span-1">
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
                <option value="-created_at">
                  تاريخ الإرسال (الأحدث أولاً)
                </option>
                <option value="created_at">تاريخ الإرسال (الأقدم أولاً)</option>
                <option value="-answered_at">تاريخ الرد (الأحدث أولاً)</option>
                <option value="answered_at">تاريخ الرد (الأقدم أولاً)</option>
                <option value="status">الحالة</option>
                <option value="request_type">نوع الطلب</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4. Requests List / Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 sm:py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
            <p className="text-xs font-semibold text-slate-600">
              جاري تحميل قائمة الطلبات والشكاوى...
            </p>
          </div>
        ) : requests.length === 0 ? (
          /* Empty State */
          <div className="py-12 sm:py-16 px-4 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-teal-100 shadow-sm">
              <Inbox className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            {hasActiveFilters ? (
              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  لم يتم العثور على أي طلبات تطابق الفلاتر
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  يرجى تجربة تعديل معايير البحث أو تصفية التاريخ والنوع.
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
                  لا توجد طلبات واردة حتى الآن
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  هذه الشاشة مخصصة لعرض ومعالجة الشكاوى والاقتراحات والاستفسارات
                  التي يرسلها أولياء الأمور عبر تطبيق الهاتف.
                </p>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-right text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Info className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>ملاحظة تقنية:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    الـ Backend جاهز بالكامل لاستقبال الطلبات ومعالجتها. بمجرد
                    تفعيل تسجيل دخول الأهالي في تطبيق Flutter وإرسال الطلبات،
                    ستظهر هنا فوراً.
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
                    <th className="py-3.5 px-4">نوع الطلب</th>
                    <th className="py-3.5 px-4">ولي الأمر</th>
                    <th className="py-3.5 px-4">الطالب المعني</th>
                    <th className="py-3.5 px-4 min-w-[220px]">تفاصيل الطلب</th>
                    <th className="py-3.5 px-4">الحالة</th>
                    <th className="py-3.5 px-4">تاريخ الإرسال</th>
                    <th className="py-3.5 px-4">المسؤول عن الرد</th>
                    <th className="py-3.5 px-4 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        item.status === "new" ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Request Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderTypeBadge(
                          item.request_type,
                          item.request_type_display,
                        )}
                      </td>

                      {/* Guardian Info */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.guardian_full_name || "ولي أمر"}</span>
                        </div>
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.student_display ? (
                          <div className="flex items-center gap-1.5 font-medium text-slate-700">
                            <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                            <span>{item.student_display.name}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            طلب عام (غير مخصص لطالب)
                          </span>
                        )}
                      </td>

                      {/* Details Snippet */}
                      <td className="py-3.5 px-4">
                        <p
                          className="text-slate-700 font-medium line-clamp-2 max-w-xs cursor-pointer hover:text-teal-700"
                          title={item.details}
                          onClick={() => handleOpenRequest(item)}
                        >
                          {item.details}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(item.status, item.status_display)}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-medium">
                        {formatDateTime(item.created_at)}
                      </td>

                      {/* Answered By & Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {item.status === "answered" ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-800 block">
                              {item.handled_by_username || "الإدارة"}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {formatDateTime(item.answered_at)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        {item.status === "new" && canReply ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenRequest(item)}
                            className="h-8 px-3 text-xs gap-1.5 font-bold shadow-sm"
                          >
                            <MessageSquareReply className="w-3.5 h-3.5" />
                            <span>عرض والرد</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRequest(item)}
                            className="h-8 px-3 text-xs gap-1.5 font-medium text-slate-700 hover:text-teal-700 hover:border-teal-300"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض التفاصيل</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {requests.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 space-y-3 transition-colors ${
                    item.status === "new"
                      ? "bg-amber-50/20"
                      : "hover:bg-slate-50/60"
                  }`}
                >
                  {/* Card Header: Type Badge, Status Badge, Date */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {renderTypeBadge(
                        item.request_type,
                        item.request_type_display,
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDateTime(item.created_at)}
                      </span>
                    </div>
                    <div>
                      {renderStatusBadge(item.status, item.status_display)}
                    </div>
                  </div>

                  {/* Guardian & Student Info */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <div className="flex items-center gap-1 text-slate-700 font-medium truncate">
                      <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{item.guardian_username || "ولي أمر"}</span>
                    </div>
                    {item.student_display ? (
                      <div className="flex items-center gap-1 text-slate-700 font-medium truncate">
                        <GraduationCap className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{item.student_display.name}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        طلب عام
                      </span>
                    )}
                  </div>

                  {/* Request Content Snippet */}
                  <div
                    onClick={() => handleOpenRequest(item)}
                    className="cursor-pointer bg-slate-50/80 hover:bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/60 transition-colors"
                  >
                    <p className="text-xs text-slate-700 font-medium line-clamp-3 leading-relaxed">
                      {item.details}
                    </p>
                  </div>

                  {/* If Answered: Answer Summary */}
                  {item.status === "answered" && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2 text-[11px] text-emerald-800 flex items-center justify-between">
                      <span className="font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        رد: {item.handled_by_username || "الإدارة"}
                      </span>
                      {item.answered_at && (
                        <span className="text-[10px] text-slate-500">
                          {formatDateTime(item.answered_at)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Mobile Action Button */}
                  <div>
                    {item.status === "new" && canReply ? (
                      <Button
                        size="sm"
                        onClick={() => handleOpenRequest(item)}
                        className="w-full h-8.5 text-xs gap-1.5 font-bold shadow-sm"
                      >
                        <MessageSquareReply className="w-3.5 h-3.5" />
                        <span>عرض والرد على الطلب</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRequest(item)}
                        className="w-full h-8.5 text-xs gap-1.5 font-medium text-slate-700 hover:text-teal-700 hover:border-teal-300"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض تفاصيل الطلب</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {requests.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={pageSize}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
            itemName="طلب"
            onPageChange={(page) => setCurrentPage(page)}
          />
        )}
      </div>

      {/* 5. Request Details & Answer Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="تفاصيل ومعالجة طلب ولي الأمر"
        maxWidth="max-w-2xl"
      >
        {selectedRequest && (
          <div className="space-y-4 sm:space-y-5 text-right dir-rtl" dir="rtl">
            {/* Modal Error Alert */}
            {modalError && (
              <Alert type="error" title="تنبيه">
                {modalError}
              </Alert>
            )}

            {/* Request Summary Metadata Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {renderTypeBadge(
                    selectedRequest.request_type,
                    selectedRequest.request_type_display,
                  )}
                  {renderStatusBadge(
                    selectedRequest.status,
                    selectedRequest.status_display,
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    تاريخ الإرسال: {formatDateTime(selectedRequest.created_at)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                {/* Guardian Info */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium shrink-0">
                    ولي الأمر:
                  </span>
                  <span className="font-bold text-slate-900 flex items-center gap-1 truncate">
                    <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    {selectedRequest.guardian_username || "ولي أمر مسجل"}
                  </span>
                </div>

                {/* Student Info */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium shrink-0">
                    الطالب المعني:
                  </span>
                  {selectedRequest.student_display ? (
                    <span className="font-bold text-slate-900 flex items-center gap-1 truncate">
                      <GraduationCap className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      {selectedRequest.student_display.name}
                    </span>
                  ) : (
                    <span className="text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      طلب عام (غير مخصص لطالب)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Full Request Details */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                تفاصيل ومحتوى الطلب:
              </label>
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium break-words">
                {selectedRequest.details}
              </div>
            </div>

            {/* Dynamic Section: IF ANSWERED -> Display School Response */}
            {selectedRequest.status === "answered" ? (
              <div className="space-y-3 pt-2">
                <div className="border-t border-slate-200 pt-3">
                  <label className="block text-xs font-bold text-emerald-800 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>رد المدرسة الرسمي:</span>
                  </label>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium shadow-inner break-words">
                    {selectedRequest.school_response ||
                      "تمت مراجعة الطلب واعتماده."}
                  </div>
                </div>

                {/* Handled By Info */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>تم الرد بواسطة:</span>
                    <strong className="text-slate-900">
                      {selectedRequest.handled_by_username || "المسؤول المختص"}
                    </strong>
                  </div>

                  {selectedRequest.answered_at && (
                    <div className="flex items-center gap-1 text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        تاريخ الرد:{" "}
                        {formatDateTime(selectedRequest.answered_at)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="w-full sm:w-auto text-xs px-5"
                  >
                    إغلاق النافذة
                  </Button>
                </div>
              </div>
            ) : canReply ? (
              /* Dynamic Section: IF NEW -> School Answer Form */
              <form
                onSubmit={handleSubmitAnswer}
                className="space-y-3 pt-2 border-t border-slate-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageSquareReply className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>كتابة رد المدرسة على الطلب:</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {responseText.length} حرف
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    placeholder="اكتب هنا رد المدرسة الرسمي الموجه لولي الأمر..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
                  />
                </div>

                {/* Quick Response Templates */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>قوالب ردود مقترحة وسريعة:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyTemplate(
                          "تمت مراجعة طلبكم بعناية وسيتم اتخاذ الإجراء الإداري المناسب في أقرب وقت. نشكر تعاونكم وحرصكم الدائم.",
                        )
                      }
                      className="text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 hover:border-teal-300 px-2.5 py-1 rounded-lg transition-colors font-medium text-right"
                    >
                      مراجعة عامة واتخاذ إجراء
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyTemplate(
                          "نشكركم على مقترحكم البنّاء، ونفيدكم بأنه قد تم تحويله إلى إدارة المدرسة لدراسة إمكانية تنفيذه وتطوير البيئة المدرسية.",
                        )
                      }
                      className="text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 hover:border-teal-300 px-2.5 py-1 rounded-lg transition-colors font-medium text-right"
                    >
                      شكر على اقتراح وتحويل للإدارة
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyTemplate(
                          "أهلاً بكم، رداً على استفساركم نود إفادتكم بالتفاصيل التالية: ",
                        )
                      }
                      className="text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 hover:border-teal-300 px-2.5 py-1 rounded-lg transition-colors font-medium text-right"
                    >
                      رد على استفسار
                    </button>
                  </div>
                </div>

                {/* Action Confirmation & Warning Note */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-right text-xs text-amber-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>تنبيه:</strong> بمجرد إرسال الرد، سيتم تحويل حالة
                    الطلب تلقائياً إلى <strong>(تمت الإجابة)</strong> وتسجيل
                    اسمك كمسؤول عن الرد، ولن يمكن تعديل أو حذف الرد لاحقاً.
                  </p>
                </div>

                {/* Form Buttons */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDetailsModalOpen(false)}
                    disabled={isSubmitting}
                    className="text-xs px-4"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isSubmitting}
                    disabled={isSubmitting || !responseText.trim()}
                    className="text-xs px-5 font-bold gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5 ml-1" />
                    <span>إرسال الرد واعتماد الطلب</span>
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-2 border-t border-slate-200">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    الطلب قيد المراجعة ولا تملك صلاحية الرد على الطلبات
                    المدرسية.
                  </span>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="w-full sm:w-auto text-xs px-5"
                  >
                    إغلاق النافذة
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
