import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import { useAuthStore } from '../../store/useAuthStore';
import { parseApiError } from '../../utils/errorUtils';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Pagination } from '../ui/Pagination';
import {
  ATTENDANCE_PERMS,
  formatArabicDate,
} from './attendanceConstants';
import {
  Calendar,
  Building,
  RefreshCw,
  Plus,
  Eye,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  X,
  Search,
} from 'lucide-react';

export function AttendanceSheetsList({ onSelectSheet, onTakeAttendance }) {
  const { hasPermission } = useAuthStore();
  const canAddSheet = hasPermission(ATTENDANCE_PERMS.ADD_SHEET);

  // Filter options
  const [academicYears, setAcademicYears] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [sections, setSections] = useState([]);

  // Selected filters
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [ordering, setOrdering] = useState('-attendance_date');

  // Pagination & Data state
  const [sheets, setSheets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Filter Dropdown Options
  useEffect(() => {
    let isMounted = true;
    async function loadOptions() {
      try {
        const [yearsRes, gradesRes] = await Promise.all([
          api.academics.getYears({ ordering: '-is_current' }),
          api.academics.getGradeLevels(),
        ]);
        if (!isMounted) return;

        const years = yearsRes.data?.results || yearsRes.results || yearsRes.data || (Array.isArray(yearsRes) ? yearsRes : []);
        const grades = gradesRes.data?.results || gradesRes.results || gradesRes.data || (Array.isArray(gradesRes) ? gradesRes : []);

        setAcademicYears(years);
        setGradeLevels(grades);
      } catch (err) {
        console.error('Failed to load filter options', err);
      }
    }
    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load sections when grade changes
  useEffect(() => {
    let isMounted = true;
    async function loadSections() {
      if (!selectedGrade) {
        setSections([]);
        setSelectedSection('');
        return;
      }
      try {
        const params = { grade_level: selectedGrade };
        if (selectedYear) params.academic_year = selectedYear;

        const res = await api.academics.getSections(params);
        if (!isMounted) return;

        const secs = res.data?.results || res.results || res.data || (Array.isArray(res) ? res : []);
        setSections(secs);
      } catch (err) {
        console.error('Failed to load sections', err);
      }
    }
    loadSections();
    return () => {
      isMounted = false;
    };
  }, [selectedGrade, selectedYear]);

  // Fetch Sheets List
  const fetchSheets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        ordering: ordering,
      };

      if (selectedYear) params.academic_year = selectedYear;
      if (selectedGrade) params.grade_level = selectedGrade;
      if (selectedSection) params.section = selectedSection;
      if (selectedDate) params.attendance_date = selectedDate;

      const res = await api.attendance.getSheets(params);

      // Backend format: { success: true, data: { count, next, previous, results: [...] } }
      const dataObj = res.data || res;
      const results = dataObj.results || [];

      setSheets(results);
      setTotalCount(dataObj.count || results.length);
      setHasNext(Boolean(dataObj.next));
      setHasPrev(Boolean(dataObj.previous));
    } catch (err) {
      const msg = parseApiError(err, 'تعذر جلب كشوفات الحضور.');
      setError(msg);
      setSheets([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, ordering, selectedYear, selectedGrade, selectedSection, selectedDate]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const handleResetFilters = () => {
    setSelectedYear('');
    setSelectedGrade('');
    setSelectedSection('');
    setSelectedDate('');
    setOrdering('-attendance_date');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(selectedYear || selectedGrade || selectedSection || selectedDate || ordering !== '-attendance_date');

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-600" />
            <span>كشوفات الحضور اليومية</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            استعراض سجلات وكشوف الحضور للشعب والصفوف الدراسية.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSheets} isLoading={isLoading}>
            <RefreshCw className="w-4 h-4 ml-1.5" />
            تحديث
          </Button>

          {canAddSheet && onTakeAttendance && (
            <Button variant="primary" size="sm" onClick={onTakeAttendance}>
              <Plus className="w-4 h-4 ml-1.5" />
              أخذ حضور جديد
            </Button>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>فلترة الكشوفات</span>
          </h3>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Year */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">السنة الدراسية</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">-- كل السنوات --</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_current ? '(الحالية)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الصف الدراسي</label>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">-- كل الصفوف --</option>
              {gradeLevels.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الشعبة</label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setCurrentPage(1);
              }}
              disabled={!selectedGrade || sections.length === 0}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">-- كل الشعب --</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">التاريخ</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Ordering */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الترتيب</label>
            <select
              value={ordering}
              onChange={(e) => {
                setOrdering(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="-attendance_date">التاريخ (الأحدث أولاً)</option>
              <option value="attendance_date">التاريخ (الأقدم أولاً)</option>
              <option value="-created_at">تاريخ الإنشاء (الأحدث)</option>
              <option value="created_at">تاريخ الإنشاء (الأقدم)</option>
            </select>
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Sheets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading && sheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-xs font-semibold text-slate-500">جاري تحميل كشوف الحضور...</p>
          </div>
        ) : sheets.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">لا توجد كشوفات حضور مطابقة</p>
            <p className="text-xs text-slate-400 mt-1">
              جرب تغيير معايير البحث أو أنشئ كشف حضور جديد للشعبة.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3.5 px-4 w-12">#</th>
                  <th className="py-3.5 px-4">تاريخ الكشف</th>
                  <th className="py-3.5 px-4">الصف والشعبة</th>
                  <th className="py-3.5 px-4">المسؤول عن الرصد</th>
                  <th className="py-3.5 px-4">تاريخ الإنشاء</th>
                  <th className="py-3.5 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sheets.map((sheet, idx) => (
                  <tr
                    key={sheet.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => onSelectSheet(sheet.id)}
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">
                        {formatArabicDate(sheet.attendance_date)}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {sheet.attendance_date}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 block">
                        {sheet.section_display || 'شعبة'}
                      </span>
                      <span className="text-[11px] text-teal-700 font-semibold">
                        {sheet.grade_level_display || 'الصف'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {sheet.created_by_display || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {sheet.created_at ? new Date(sheet.created_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onSelectSheet(sheet.id)}
                        className="text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 ml-1.5 text-teal-600" />
                        عرض وتعديل
                      </Button>
                    </td>
                  </tr>
                ))}
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
              itemName="كشف"
            />
          </div>
        )}
      </div>
    </div>
  );
}
