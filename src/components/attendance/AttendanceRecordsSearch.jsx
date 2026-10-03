import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import { parseApiError } from "../../utils/errorUtils";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { Pagination } from "../ui/Pagination";
import { RecordEditModal } from "./RecordEditModal";
import {
  ATTENDANCE_PERMS,
  ATTENDANCE_STATUS,
  ABSENCE_TYPE,
  formatArabicDate,
  formatDateOnly,
  formatTimeDisplay,
} from "./attendanceConstants";
import {
  Search,
  Filter,
  RefreshCw,
  Edit,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  UserCheck,
  Calendar,
} from "lucide-react";

export function AttendanceRecordsSearch() {
  const { hasPermission } = useAuthStore();
  const canChangeRecord = hasPermission(ATTENDANCE_PERMS.CHANGE_RECORD);

  // Filters State
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [absenceTypeFilter, setAbsenceTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [ordering, setOrdering] = useState("-sheet__attendance_date");

  // Pagination & Records State
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Modal
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        ordering: ordering,
      };

      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter) params.status = statusFilter;
      if (absenceTypeFilter) params.absence_type = absenceTypeFilter;
      if (dateFilter) params.attendance_date = dateFilter;

      const res = await api.attendance.getRecords(params);
      const dataObj = res.data || res;
      const results = dataObj.results || [];

      setRecords(results);
      setTotalCount(dataObj.count || results.length);
      setHasNext(Boolean(dataObj.next));
      setHasPrev(Boolean(dataObj.previous));
    } catch (err) {
      const msg = parseApiError(err, "تعذر جلب سجلات حضور الطلاب.");
      setError(msg);
      setRecords([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    ordering,
    debouncedSearch,
    statusFilter,
    absenceTypeFilter,
    dateFilter,
  ]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("");
    setAbsenceTypeFilter("");
    setDateFilter("");
    setOrdering("-sheet__attendance_date");
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchInput ||
    statusFilter ||
    absenceTypeFilter ||
    dateFilter ||
    ordering !== "-sheet__attendance_date",
  );

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-600" />
            <span>البحث في سجلات حضور الطلاب</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ابحث بالاسم الكامل للطالب، أو الأب، أو الأم، وتتبع سجلات الحضور
            والغياب.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchRecords}
          isLoading={isLoading}
        >
          <RefreshCw className="w-4 h-4 ml-1.5" />
          تحديث
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>خيارات البحث والفلترة</span>
          </h3>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Name Search */}
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              اسم الطالب أو الوالدين
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="اكتب للبحث..."
                className="w-full text-xs font-semibold pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              حالة الحضور
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">-- كل الحالات --</option>
              <option value="present">حاضر</option>
              <option value="absent">غائب</option>
            </select>
          </div>

          {/* Absence Type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              نوع الغياب
            </label>
            <select
              value={absenceTypeFilter}
              onChange={(e) => {
                setAbsenceTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              disabled={statusFilter === "present"}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">-- كل الأنواع --</option>
              <option value="excused">بعذر</option>
              <option value="unexcused">دون عذر</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              التاريخ
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Ordering */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              الترتيب
            </label>
            <select
              value={ordering}
              onChange={(e) => {
                setOrdering(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="-sheet__attendance_date">
                تاريخ الحضور (الأحدث)
              </option>
              <option value="sheet__attendance_date">
                تاريخ الحضور (الأقدم)
              </option>
              <option value="-created_at">تاريخ الرصد (الأحدث)</option>
              <option value="created_at">تاريخ الرصد (الأقدم)</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading && records.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-xs font-semibold text-slate-500">
              جاري تحميل السجلات...
            </p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 px-4">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">
              لا توجد سجلات مطابقة
            </p>
            <p className="text-xs text-slate-400 mt-1">
              تأكد من كتابة الاسم بدقة أو تغيير فلاتر البحث.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">الطالب</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">الوصول</th>
                  <th className="py-3 px-4">المغادرة</th>
                  <th className="py-3 px-4">الغياب / العذر</th>
                  <th className="py-3 px-4">الملاحظات</th>
                  {canChangeRecord && (
                    <th className="py-3 px-4 text-center">تعديل</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r, idx) => {
                  console.log("Record:", r); // Debugging line to check the record data
                  const recordDate =
                    r.attendance_date ||
                    r.sheet_attendance_date ||
                    r.sheet_date ||
                    r.created_at;
                  const isPresent = r.status === ATTENDANCE_STATUS.PRESENT;
                  const isAbsent = r.status === ATTENDANCE_STATUS.ABSENT;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-400">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">
                          {r.student_display}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {recordDate ? (
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {formatArabicDate(recordDate)}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              {formatDateOnly(recordDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isPresent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {r.status_display || "حاضر"}
                          </span>
                        )}
                        {isAbsent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" />
                            {r.status_display || "غائب"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {isPresent ? (
                          <div>
                            <span className="font-semibold">
                              {formatTimeDisplay(r.arrival_time) || "-"}
                            </span>
                            {r.arrival_method_display && (
                              <span className="block text-[10px] text-slate-400">
                                {r.arrival_method_display}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {isPresent ? (
                          r.departure_time ? (
                            <div>
                              <span className="font-semibold text-sky-700">
                                {formatTimeDisplay(r.departure_time)}
                              </span>
                              {r.departure_method_display && (
                                <span className="block text-[10px] text-slate-400">
                                  {r.departure_method_display}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              لم ينصرف بعد
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isAbsent ? (
                          <div>
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                                r.absence_type === ABSENCE_TYPE.EXCUSED
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-purple-50 text-purple-800 border border-purple-200"
                              }`}
                            >
                              {r.absence_type_display ||
                                (r.absence_type === ABSENCE_TYPE.EXCUSED
                                  ? "بعذر"
                                  : "دون عذر")}
                            </span>
                            {r.absence_reason && (
                              <p className="text-[11px] text-slate-700 font-medium mt-0.5">
                                {r.absence_reason}
                                {r.absence_reason_source_display && (
                                  <span className="text-slate-400 mr-1">
                                    ({r.absence_reason_source_display})
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td
                        className="py-3 px-4 text-slate-600 max-w-xs truncate"
                        title={r.notes}
                      >
                        {r.notes || <span className="text-slate-300">-</span>}
                      </td>
                      {canChangeRecord && (
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(r)}
                            className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                            title="تعديل السجل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > pageSize && (
          <div className="p-3 border-t border-slate-200">
            <Pagination
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              hasNext={hasNext}
              hasPrevious={hasPrev}
              itemName="سجل حضور"
            />
          </div>
        )}
      </div>

      {/* Edit Record Modal */}
      {selectedRecord && (
        <RecordEditModal
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          record={selectedRecord}
          onSuccess={fetchRecords}
        />
      )}
    </div>
  );
}
