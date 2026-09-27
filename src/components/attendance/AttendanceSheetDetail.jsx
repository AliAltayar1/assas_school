import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api';
import { useAuthStore } from '../../store/useAuthStore';
import { parseApiError } from '../../utils/errorUtils';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { RecordEditModal } from './RecordEditModal';
import { NormalDepartureModal } from './NormalDepartureModal';
import { BulkUpdateModal } from './BulkUpdateModal';
import {
  ATTENDANCE_PERMS,
  formatArabicDate,
  formatTimeDisplay,
  ATTENDANCE_STATUS,
  ABSENCE_TYPE,
} from './attendanceConstants';
import {
  ArrowRight,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  Edit,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

export function AttendanceSheetDetail({ sheetId, onBack }) {
  const { hasPermission } = useAuthStore();
  const canChangeRecord = hasPermission(ATTENDANCE_PERMS.CHANGE_RECORD);
  const canNormalDeparture = hasPermission(ATTENDANCE_PERMS.CHANGE_SHEET);

  const [sheet, setSheet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter within sheet records
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'present' | 'absent' | 'departed' | 'not_departed'

  // Modals state
  const [editingRecord, setEditingRecord] = useState(null);
  const [isDepartureModalOpen, setIsDepartureModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const fetchSheetDetails = useCallback(async () => {
    if (!sheetId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.attendance.getSheetById(sheetId);
      // Backend response: { success: true, data: { ...sheet, records: [...] } }
      setSheet(res.data || res);
    } catch (err) {
      const msg = parseApiError(err, 'تعذر تحميل تفاصيل كشف الحضور.');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [sheetId]);

  useEffect(() => {
    fetchSheetDetails();
  }, [fetchSheetDetails]);

  // Compute Statistics from records as specified in backend guide
  const records = useMemo(() => (sheet?.records ? sheet.records : []), [sheet]);

  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === ATTENDANCE_STATUS.PRESENT);
    const absent = records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT);
    const excused = absent.filter((r) => r.absence_type === ABSENCE_TYPE.EXCUSED);
    const unexcused = absent.filter((r) => r.absence_type === ABSENCE_TYPE.UNEXCUSED);
    const departed = present.filter((r) => Boolean(r.departure_time));
    const pendingDeparture = present.filter((r) => !r.departure_time);

    return {
      total,
      presentCount: present.length,
      absentCount: absent.length,
      excusedCount: excused.length,
      unexcusedCount: unexcused.length,
      departedCount: departed.length,
      eligibleDepartureCount: pendingDeparture.length,
    };
  }, [records]);

  // Filtered records for table view
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        if (!r.student_display?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter === 'present') return r.status === ATTENDANCE_STATUS.PRESENT;
      if (statusFilter === 'absent') return r.status === ATTENDANCE_STATUS.ABSENT;
      if (statusFilter === 'departed') return r.status === ATTENDANCE_STATUS.PRESENT && Boolean(r.departure_time);
      if (statusFilter === 'not_departed') return r.status === ATTENDANCE_STATUS.PRESENT && !r.departure_time;

      return true;
    });
  }, [records, searchQuery, statusFilter]);

  if (isLoading && !sheet) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
        <div className="w-9 h-9 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-xs font-semibold text-slate-500">جاري تحميل تفاصيل الكشف...</p>
      </div>
    );
  }

  if (error && !sheet) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowRight className="w-4 h-4 ml-1.5" />
          رجوع لكشوف الحضور
        </Button>
        <Alert type="error" message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="رجوع للقائمة"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {sheet.section_display || 'شعبة غير محددة'}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-teal-50 text-teal-800 border border-teal-200">
                {sheet.grade_level_display || 'الصف'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatArabicDate(sheet.attendance_date)}</span>
              <span>•</span>
              <span>أُنشئ بواسطة: {sheet.created_by_display || 'غير محدد'}</span>
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSheetDetails} isLoading={isLoading}>
            <RefreshCw className="w-4 h-4 ml-1.5" />
            تحديث
          </Button>

          {canNormalDeparture && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsDepartureModalOpen(true)}
              disabled={stats.eligibleDepartureCount === 0}
              className="bg-sky-600 hover:bg-sky-700 focus:ring-sky-500 shadow-sky-600/20"
            >
              <LogOut className="w-4 h-4 ml-1.5" />
              تسجيل المغادرة الطبيعية ({stats.eligibleDepartureCount})
            </Button>
          )}

          {canChangeRecord && (
            <Button variant="secondary" size="sm" onClick={() => setIsBulkModalOpen(true)}>
              <Edit className="w-4 h-4 ml-1.5" />
              تعديل جماعي
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1">إجمالي الطلاب</span>
          <span className="text-xl font-black text-slate-900">{stats.total}</span>
        </div>

        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 block mb-1">الحاضرون</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-800">{stats.presentCount}</span>
            <span className="text-[10px] text-emerald-600 font-bold">
              ({stats.total > 0 ? Math.round((stats.presentCount / stats.total) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-700 block mb-1">الغائبون</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-rose-800">{stats.absentCount}</span>
            <span className="text-[10px] text-rose-600 font-bold">
              ({stats.total > 0 ? Math.round((stats.absentCount / stats.total) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 block mb-1">غياب بعذر</span>
          <span className="text-xl font-black text-amber-800">{stats.excusedCount}</span>
        </div>

        <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-purple-700 block mb-1">غياب دون عذر</span>
          <span className="text-xl font-black text-purple-800">{stats.unexcusedCount}</span>
        </div>

        <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-sky-700 block mb-1">تم انصرافهم</span>
          <span className="text-xl font-black text-sky-800">{stats.departedCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الطالب..."
            className="w-full text-xs pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Status Filter Pill Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'present', label: 'حاضر' },
            { id: 'absent', label: 'غائب' },
            { id: 'departed', label: 'غادر' },
            { id: 'not_departed', label: 'لم يغادر بعد' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                statusFilter === pill.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Student Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">الطالب</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4">الوصول</th>
                <th className="py-3.5 px-4">المغادرة</th>
                <th className="py-3.5 px-4">بيانات الغياب</th>
                <th className="py-3.5 px-4">الملاحظات</th>
                {canChangeRecord && <th className="py-3.5 px-4 text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={canChangeRecord ? 8 : 7} className="py-10 text-center text-slate-500">
                    لا توجد سجلات تطابق الفلتر أو البحث.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => {
                  const isPresent = r.status === ATTENDANCE_STATUS.PRESENT;
                  const isAbsent = r.status === ATTENDANCE_STATUS.ABSENT;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {r.student_display}
                      </td>
                      <td className="py-3 px-4">
                        {isPresent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {r.status_display || 'حاضر'}
                          </span>
                        )}
                        {isAbsent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" />
                            {r.status_display || 'غائب'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {isPresent ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold">{formatTimeDisplay(r.arrival_time) || '-'}</span>
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
                            <div className="space-y-0.5">
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
                            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              لم ينصرف بعد
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isAbsent ? (
                          <div className="space-y-0.5">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                              r.absence_type === ABSENCE_TYPE.EXCUSED
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-purple-50 text-purple-800 border border-purple-200'
                            }`}>
                              {r.absence_type_display || (r.absence_type === ABSENCE_TYPE.EXCUSED ? 'بعذر' : 'دون عذر')}
                            </span>
                            {r.absence_reason && (
                              <p className="text-[11px] text-slate-700 font-medium">
                                {r.absence_reason}
                                {r.absence_reason_source_display && (
                                  <span className="text-slate-400 mr-1">({r.absence_reason_source_display})</span>
                                )}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={r.notes}>
                        {r.notes || <span className="text-slate-300">-</span>}
                      </td>
                      {canChangeRecord && (
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setEditingRecord(r)}
                            className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                            title="تعديل السجل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {editingRecord && (
        <RecordEditModal
          isOpen={Boolean(editingRecord)}
          onClose={() => setEditingRecord(null)}
          record={editingRecord}
          onSuccess={fetchSheetDetails}
        />
      )}

      {isDepartureModalOpen && (
        <NormalDepartureModal
          isOpen={isDepartureModalOpen}
          onClose={() => setIsDepartureModalOpen(false)}
          sheet={sheet}
          eligibleCount={stats.eligibleDepartureCount}
          onSuccess={(updatedSheet) => {
            if (updatedSheet) setSheet(updatedSheet);
            else fetchSheetDetails();
          }}
        />
      )}

      {isBulkModalOpen && (
        <BulkUpdateModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          sheet={sheet}
          onSuccess={(updatedSheet) => {
            if (updatedSheet) setSheet(updatedSheet);
            else fetchSheetDetails();
          }}
        />
      )}
    </div>
  );
}
