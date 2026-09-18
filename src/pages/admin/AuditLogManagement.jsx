import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";
import { toast } from "sonner";
import { parseApiError, extractPaginatedList } from "../../utils/errorUtils";
import { canAccessAuditLogs } from "../../utils/permissionUtils";
import {
  ShieldAlert,
  History,
  RefreshCw,
  Search,
  ChevronDown,
  X,
  Calendar,
  User,
  Layers,
  Eye,
  Clock,
  Tag,
  Copy,
  Check,
  Globe,
  Database,
} from "lucide-react";

export function AuditLogManagement() {
  const { user, hasPermission, isSuperuser } = useAuthStore();
  const hasAccess = hasPermission("audit_logs.view_auditlog") || isSuperuser;

  // Data State
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // Filter States
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedActor, setSelectedActor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Staff Users for Actor Filter
  const [usersList, setUsersList] = useState([]);

  // Details Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isCopiedJson, setIsCopiedJson] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load Users for Actor Filter
  useEffect(() => {
    if (!hasAccess) return;
    const fetchUsers = async () => {
      try {
        const res = await api.users.getUsers({ page_size: 100 });
        const list = extractPaginatedList(res);
        setUsersList(list);
      } catch (err) {
        console.error("Failed to load users for audit log filter:", err);
      }
    };
    fetchUsers();
  }, [hasAccess]);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    if (!hasAccess) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        actor: selectedActor || undefined,
        module: selectedModule || undefined,
        action: selectedAction || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: debouncedSearch || undefined,
        ordering: ordering || undefined,
        page: currentPage > 1 ? currentPage : undefined,
      };

      const res = await api.auditLogs.getLogs(params);
      console.log(res);
      const list = extractPaginatedList(res);

      const count = res?.data?.count ?? res?.count ?? list.length;
      const nextUrl = res?.data?.next ?? res?.next ?? list.next ?? null;
      const prevUrl =
        res?.data?.previous ?? res?.previous ?? list.previous ?? null;

      setLogs(list);
      setTotalCount(count);
      setHasNext(Boolean(nextUrl));
      setHasPrevious(Boolean(prevUrl));

      if (currentPage === 1 && list.length > 0) {
        setPageSize(list.length);
      }
    } catch (err) {
      // Auto-fallback if page 404
      if (
        currentPage > 1 &&
        (err.response?.status === 404 ||
          String(err?.message || "").includes("صفحة غير صحيحة") ||
          String(err?.response?.data?.detail || "").includes("صفحة غير صحيحة"))
      ) {
        setCurrentPage(1);
        return;
      }
      const parsed = parseApiError(err, "فشل في تحميل سجل النشاطات الإدارية");
      setError(parsed);
      toast.error(parsed);
    } finally {
      setIsLoading(false);
    }
  }, [
    hasAccess,
    selectedActor,
    selectedModule,
    selectedAction,
    dateFrom,
    dateTo,
    debouncedSearch,
    ordering,
    currentPage,
  ]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Open Details Modal
  const handleOpenDetails = (log) => {
    setSelectedLog(log);
    setIsCopiedJson(false);
    setIsDetailsModalOpen(true);
  };

  // Copy Raw JSON to Clipboard
  const handleCopyJson = () => {
    if (!selectedLog) return;
    try {
      navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
      setIsCopiedJson(true);
      toast.success("تم نسخ بيانات السجل إلى الحافظة بنجاح.");
      setTimeout(() => setIsCopiedJson(false), 2000);
    } catch {
      toast.error("تعذر النسخ إلى الحافظة.");
    }
  };

  // Reset All Filters
  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedModule("");
    setSelectedAction("");
    setSelectedActor("");
    setDateFrom("");
    setDateTo("");
    setOrdering("-created_at");
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchInput ||
    selectedModule ||
    selectedAction ||
    selectedActor ||
    dateFrom ||
    dateTo ||
    ordering !== "-created_at",
  );

  // Module Badge Styler
  const getModuleBadgeStyle = (mod) => {
    switch (mod) {
      case "accounts":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "students":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "academics":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "grades":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "finance":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "attendance":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Action Badge Styler
  const getActionBadgeStyle = (act) => {
    switch (act) {
      case "CREATE":
      case "APPROVE":
      case "PUBLISH":
        return "bg-emerald-50 text-emerald-800 border-emerald-300 font-black";
      case "UPDATE":
      case "RESET_PASSWORD":
      case "CHANGE_ROLE":
        return "bg-amber-50 text-amber-800 border-amber-300 font-bold";
      case "TRANSFER":
      case "ACTIVATE":
      case "REOPEN":
        return "bg-sky-50 text-sky-800 border-sky-300 font-bold";
      case "DELETE":
      case "DEACTIVATE":
      case "CLOSE":
      case "END":
      case "CANCEL":
        return "bg-rose-50 text-rose-800 border-rose-300 font-black";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300 font-bold";
    }
  };

  // Date Formatter
  const formatDateTime = (isoString) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("ar-SY", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    } catch {
      return isoString;
    }
  };

  // Access Control Guard
  if (!hasAccess) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-red-900">غير مصرح بالدخول</h2>
          <p className="text-sm text-red-700 max-w-md mx-auto">
            عفواً، لا تملك الصلاحية للوصول إلى سجل النشاطات العام. يقتصر الوصول
            على إدارة المدرسة والمسؤولين المخولين فقط.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-5 sm:p-7 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
            <History className="w-7 h-7 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                سجل النشاطات العام (Audit Log)
              </h1>
              <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-200 border border-teal-400/30 rounded-full text-[11px] font-black">
                للقراءة والتدقيق فقط
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              مراقبة وتتبع العمليات والأنشطة الإدارية الحساسة المنفذة داخل
              النظام مع تفاصيل التاريخ والمنفذين.
            </p>
          </div>
        </div>

        {/* Refresh Action */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            onClick={fetchAuditLogs}
            disabled={isLoading}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>تحديث السجل</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
          <span className="block text-xs font-bold text-slate-500">
            إجمالي الأنشطة المسجلة
          </span>
          <span className="text-xl font-black text-slate-900">
            {totalCount}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
          <span className="block text-xs font-bold text-slate-500">
            الأنشطة بالصفحة الحالية
          </span>
          <span className="text-xl font-black text-teal-700">
            {logs.length}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
          <span className="block text-xs font-bold text-slate-500">
            الوحدة المفلترة
          </span>
          <span className="text-sm font-black text-indigo-800 truncate block mt-1">
            {selectedModule ? selectedModule.toUpperCase() : "كافة الوحدات"}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
          <span className="block text-xs font-bold text-slate-500">
            الترتيب الزمني
          </span>
          <span className="text-sm font-black text-slate-800 mt-1 block">
            {ordering === "-created_at" ? "الأحدث أولاً" : "الأقدم أولاً"}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Module Filter */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              الوحدة (Module)
            </label>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">كافة الوحدات</option>
              <option value="accounts">إدارة الحسابات (accounts)</option>
              <option value="students">شؤون الطلاب (students)</option>
              <option value="academics">الشؤون الأكاديمية (academics)</option>
              <option value="grades">العلامات والتقييمات (grades)</option>
              <option value="finance">المالية والرسوم (finance)</option>
              <option value="attendance">الحضور والغياب (attendance)</option>
              <option value="other">أخرى (other)</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              نوع العملية (Action)
            </label>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">كافة العمليات</option>
              <option value="CREATE">إنشاء (CREATE)</option>
              <option value="UPDATE">تعديل (UPDATE)</option>
              <option value="DELETE">حذف (DELETE)</option>
              <option value="TRANSFER">نقل (TRANSFER)</option>
              <option value="ACTIVATE">تفعيل (ACTIVATE)</option>
              <option value="DEACTIVATE">تعطيل (DEACTIVATE)</option>
              <option value="APPROVE">اعتماد (APPROVE)</option>
              <option value="PUBLISH">نشر (PUBLISH)</option>
              <option value="CHANGE_ROLE">تغيير دور (CHANGE_ROLE)</option>
              <option value="RESET_PASSWORD">
                إعادة تعيين كلمة مرور (RESET_PASSWORD)
              </option>
              <option value="CLOSE">إغلاق (CLOSE)</option>
              <option value="END">إنهاء (END)</option>
              <option value="REOPEN">إعادة فتح (REOPEN)</option>
              <option value="CANCEL">إلغاء (CANCEL)</option>
            </select>
          </div>

          {/* Actor / User Filter */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              المنفّذ (المستخدم)
            </label>
            <select
              value={selectedActor}
              onChange={(e) => {
                setSelectedActor(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">كافة المنفذين</option>
              {usersList.map((u) => {
                const name =
                  [u.first_name, u.last_name].filter(Boolean).join(" ") ||
                  u.username ||
                  "مستخدم";
                return (
                  <option key={u.id} value={u.id}>
                    {name} ({u.role_display || u.role})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Ordering Filter */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              الترتيب الزمني
            </label>
            <select
              value={ordering}
              onChange={(e) => {
                setOrdering(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="-created_at">الأحدث أولاً (Default)</option>
              <option value="created_at">الأقدم أولاً</option>
            </select>
          </div>
        </div>

        {/* Search & Actions Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث في نص النشاط، اسم المنفّذ، أو العنصر المتأثر..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-teal-500"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            className={`text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 border-slate-200 ${
              isFilterDrawerOpen
                ? "bg-teal-50 text-teal-700 border-teal-300"
                : "text-slate-700"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>نطاق التاريخ</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${isFilterDrawerOpen ? "rotate-180" : ""}`}
            />
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl font-bold"
            >
              إعادة ضبط
            </Button>
          )}
        </div>

        {/* Date Range Collapsible Drawer */}
        {isFilterDrawerOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3 border-t border-slate-100 bg-slate-50 p-3.5 rounded-xl">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">
                من تاريخ (date_from)
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">
                إلى تاريخ (date_to)
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium"
              />
            </div>

            <div className="space-y-1 flex flex-col justify-end">
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split("T")[0];
                    setDateFrom(today);
                    setDateTo(today);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 7);
                    setDateFrom(d.toISOString().split("T")[0]);
                    setDateTo(new Date().toISOString().split("T")[0]);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200"
                >
                  آخر 7 أيام
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-slate-200"
                >
                  مسح
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">
            جارٍ جلب سجل النشاطات...
          </p>
        </div>
      ) : error ? (
        <Alert variant="danger" title="خطأ في تحميل سجل النشاطات">
          {error}
        </Alert>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto border border-slate-200">
            <History className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">
              لا توجد نشاطات مسجلة
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              لم يتم العثور على أي عمليات إدارية تطابق معايير البحث والفلترة
              المحددة.
            </p>
          </div>
          {hasActiveFilters && (
            <Button
              onClick={handleResetFilters}
              variant="outline"
              className="text-xs font-bold px-4 py-2 rounded-xl"
            >
              إلغاء الفلاتر
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-white font-black">
                  <tr>
                    <th className="p-3.5 w-44">التاريخ والوقت</th>
                    <th className="p-3.5 w-40">المنفّذ (المستخدم)</th>
                    <th className="p-3.5 w-32 text-center">الوحدة</th>
                    <th className="p-3.5 w-28 text-center">نوع العملية</th>
                    <th className="p-3.5">النشاط الإداري (Message)</th>
                    <th className="p-3.5 w-44">العنصر المتأثر</th>
                    <th className="p-3.5 w-24 text-center">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {logs.map((log) => {
                    const actorName = log.actor_display || "مستخدم غير معروف";
                    const moduleName =
                      log.module_display || log.module || "عام";
                    const actionName =
                      log.action_display || log.action || "عملية";
                    const targetName = log.target_display || "—";

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-teal-50/30 transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="p-3.5 text-slate-600 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDateTime(log.created_at)}</span>
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <span
                              className="font-bold text-slate-900 block truncate max-w-[140px]"
                              title={actorName}
                            >
                              {actorName}
                            </span>
                          </div>
                        </td>

                        {/* Module */}
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border inline-block ${getModuleBadgeStyle(
                              log.module,
                            )}`}
                          >
                            {moduleName}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] border inline-block ${getActionBadgeStyle(
                              log.action,
                            )}`}
                          >
                            {actionName}
                          </span>
                        </td>

                        {/* Activity Message (Source of Truth) */}
                        <td className="p-3.5">
                          <p className="font-semibold text-slate-900 text-xs leading-relaxed">
                            {log.message}
                          </p>
                        </td>

                        {/* Target Display */}
                        <td className="p-3.5 text-slate-700 font-medium">
                          <span
                            className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md text-[11px] inline-block max-w-[160px] truncate"
                            title={targetName}
                          >
                            {targetName}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(log)}
                            className="p-1.5 text-teal-700 hover:text-teal-900 hover:bg-teal-100 rounded-lg transition-all"
                            title="عرض تفاصيل السجل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="pt-2 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={pageSize}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              onPageChange={(page) => setCurrentPage(page)}
              itemName="نشاط"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILS MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="تفاصيل السجل الإداري"
        maxWidth="max-w-3xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-right">
            {/* Primary Banner Message */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-4 shadow-md space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-200 border border-teal-400/30 rounded-lg text-[11px] font-black">
                  {selectedLog.module_display || selectedLog.module}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {formatDateTime(selectedLog.created_at)}
                </span>
              </div>
              <p className="text-sm sm:text-base font-black text-white leading-relaxed">
                {selectedLog.message}
              </p>
            </div>

            {/* Core Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Actor */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span>المنفّذ (المستخدم):</span>
                </span>
                <span className="text-xs font-black text-slate-900 block">
                  {selectedLog.actor_display || "مستخدم غير معروف"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  معرف المنفّذ: {selectedLog.actor || "null (تم حذف الحساب)"}
                </span>
              </div>

              {/* Action */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>نوع العملية (Action):</span>
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs ${getActionBadgeStyle(selectedLog.action)}`}
                  >
                    {selectedLog.action_display || selectedLog.action}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ({selectedLog.action})
                  </span>
                </div>
              </div>

              {/* Target Display */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>العنصر المتأثر (Target):</span>
                </span>
                <span className="text-xs font-black text-slate-900 block">
                  {selectedLog.target_display || "—"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  النوع: {selectedLog.target_type || "—"}
                </span>
              </div>

              {/* Technical & IP */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-teal-600" />
                  <span>عنوان IP & المعرف:</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-800 block">
                  IP: {selectedLog.ip_address || "غير متوفر"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  UUID: {selectedLog.id}
                </span>
              </div>
            </div>

            {/* Structured Metadata View */}
            {selectedLog.metadata &&
            typeof selectedLog.metadata === "object" &&
            Object.keys(selectedLog.metadata).length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-teal-700" />
                    <span>التفاصيل الإضافية (Metadata):</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg transition-colors"
                  >
                    {isCopiedJson ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{isCopiedJson ? "تم النسخ!" : "نسخ JSON"}</span>
                  </button>
                </div>

                {/* Key-Value Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  {Object.entries(selectedLog.metadata).map(([key, val]) => (
                    <div
                      key={key}
                      className="bg-white p-2 rounded-lg border border-slate-100 text-xs"
                    >
                      <span className="block text-[10px] font-bold text-slate-400 font-mono uppercase">
                        {key}
                      </span>
                      <span className="font-bold text-slate-800 block break-words">
                        {typeof val === "object"
                          ? JSON.stringify(val)
                          : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-400 italic">
                  لا توجد بيانات Metadata إضافية لهذا السجل.
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-xs px-5 py-2 rounded-xl font-bold"
              >
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AuditLogManagement;
