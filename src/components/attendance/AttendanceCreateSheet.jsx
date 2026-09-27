import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api';
import { useAuthStore } from '../../store/useAuthStore';
import { parseApiError } from '../../utils/errorUtils';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { toast } from 'sonner';
import {
  ATTENDANCE_STATUS,
  ABSENCE_TYPE,
  ABSENCE_REASON_SOURCE_OPTIONS,
  ARRIVAL_METHODS,
  COMMON_ABSENCE_REASONS,
  DEFAULT_ARRIVAL_TIME,
  formatArabicDate,
  getTodayDateStr,
  isWeekendDate,
} from './attendanceConstants';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Building,
  Calendar,
  AlertTriangle,
  Info,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';

export function AttendanceCreateSheet({ onSuccess, onCancel }) {
  const { user } = useAuthStore();
  const todayStr = useMemo(() => getTodayDateStr(), []);
  const isWeekend = useMemo(() => isWeekendDate(todayStr), [todayStr]);

  // Academic Dropdowns State
  const [academicYears, setAcademicYears] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [sections, setSections] = useState([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // Roster State
  const [roster, setRoster] = useState([]);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState(null);

  // Global batch arrival time
  const [batchArrivalTime, setBatchArrivalTime] = useState(DEFAULT_ARRIVAL_TIME);

  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Fetch academic years & grades on mount
  useEffect(() => {
    let isMounted = true;
    async function loadAcademicStructure() {
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

        // Auto-select current academic year if available
        const currentYear = years.find((y) => y.is_current) || years[0];
        if (currentYear) {
          setSelectedYear(currentYear.id);
        }
      } catch (err) {
        console.error('Failed to load academic options', err);
      }
    }
    loadAcademicStructure();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch sections when grade level changes
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
        setSelectedSection('');
      } catch (err) {
        console.error('Failed to load sections', err);
      }
    }
    loadSections();
    return () => {
      isMounted = false;
    };
  }, [selectedGrade, selectedYear]);

  // Fetch Roster when section is selected
  const fetchRoster = useCallback(async () => {
    if (!selectedSection) {
      setRoster([]);
      return;
    }

    setIsRosterLoading(true);
    setRosterError(null);
    setSubmitError(null);

    try {
      const res = await api.attendance.getRoster(selectedSection);
      const studentList = res.data || [];

      // Initialize roster state for creation
      const initialized = studentList.map((s) => ({
        enrollment: s.enrollment,
        student: s.student,
        student_display: s.student_display,
        usual_arrival_method: s.usual_arrival_method,
        usual_arrival_method_display: s.usual_arrival_method_display,
        status: ATTENDANCE_STATUS.UNMARKED,
        arrival_time: DEFAULT_ARRIVAL_TIME,
        arrival_method: s.usual_arrival_method || 'school_bus',
        absence_type: ABSENCE_TYPE.UNEXCUSED,
        absence_reason: '',
        absence_reason_source: 'guardian',
        notes: '',
      }));

      setRoster(initialized);
    } catch (err) {
      const msg = parseApiError(err, 'تعذر جلب طلاب الشعبة المحددة.');
      setRosterError(msg);
      setRoster([]);
    } finally {
      setIsRosterLoading(false);
    }
  }, [selectedSection]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Bulk quick setters
  const setAllStatus = (newStatus) => {
    setRoster((prev) =>
      prev.map((s) => ({
        ...s,
        status: newStatus,
        arrival_time: s.arrival_time || batchArrivalTime || DEFAULT_ARRIVAL_TIME,
      }))
    );
  };

  const applyBatchArrivalTimeToPresent = () => {
    setRoster((prev) =>
      prev.map((s) => ({
        ...s,
        arrival_time: batchArrivalTime || DEFAULT_ARRIVAL_TIME,
      }))
    );
    toast.success(`تم تعيين وقت الوصول (${batchArrivalTime}) لجميع الطلاب.`);
  };

  // Row field updaters
  const updateStudentRecord = (enrollmentId, updates) => {
    setRoster((prev) =>
      prev.map((s) => (s.enrollment === enrollmentId ? { ...s, ...updates } : s))
    );
  };

  // Validation check
  const unmarkedCount = useMemo(
    () => roster.filter((s) => s.status === ATTENDANCE_STATUS.UNMARKED).length,
    [roster]
  );

  const presentCount = useMemo(
    () => roster.filter((s) => s.status === ATTENDANCE_STATUS.PRESENT).length,
    [roster]
  );

  const absentCount = useMemo(
    () => roster.filter((s) => s.status === ATTENDANCE_STATUS.ABSENT).length,
    [roster]
  );

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedSection) {
      setSubmitError('يرجى اختيار الشعبة الدراسية أولاً.');
      return;
    }

    if (roster.length === 0) {
      setSubmitError('لا يوجد طلاب في قائمة هذه الشعبة لإنشاء كشف الحضور.');
      return;
    }

    if (unmarkedCount > 0) {
      setSubmitError(
        `يجب تحديد حالة حضور جميع طلاب الشعبة أولاً (${unmarkedCount} طالب غير محدد).`
      );
      return;
    }

    // Check for any excused absence without a reason
    const invalidExcused = roster.find(
      (s) => s.status === ATTENDANCE_STATUS.ABSENT && s.absence_type === ABSENCE_TYPE.EXCUSED && !s.absence_reason?.trim()
    );

    if (invalidExcused) {
      setSubmitError(
        `الطالب (${invalidExcused.student_display}) تم تسجيل غيابه بعذر دون كتابة السبب. يرجى توضيح سبب الغياب.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Build clean payload according to backend specification:
      // Note: Do NOT send attendance_date (server determines it via timezone.localdate()).
      // Note: Do NOT send departure fields on morning sheet creation.
      const payload = {
        section: selectedSection,
        records: roster.map((s) => {
          if (s.status === ATTENDANCE_STATUS.PRESENT) {
            return {
              enrollment: s.enrollment,
              status: ATTENDANCE_STATUS.PRESENT,
              arrival_time: s.arrival_time || DEFAULT_ARRIVAL_TIME,
              arrival_method: s.arrival_method || 'school_bus',
              notes: s.notes ? s.notes.trim() : '',
            };
          } else {
            // Absent
            if (s.absence_type === ABSENCE_TYPE.EXCUSED) {
              return {
                enrollment: s.enrollment,
                status: ATTENDANCE_STATUS.ABSENT,
                absence_type: ABSENCE_TYPE.EXCUSED,
                absence_reason: s.absence_reason.trim(),
                absence_reason_source: s.absence_reason_source || 'guardian',
                notes: s.notes ? s.notes.trim() : '',
              };
            } else {
              return {
                enrollment: s.enrollment,
                status: ATTENDANCE_STATUS.ABSENT,
                absence_type: ABSENCE_TYPE.UNEXCUSED,
                absence_reason: '',
                absence_reason_source: '',
                notes: s.notes ? s.notes.trim() : '',
              };
            }
          }
        }),
      };

      const res = await api.attendance.createSheet(payload);
      toast.success(res.message || 'تم حفظ كشف الحضور بنجاح.');

      const createdSheetId = res.data?.id;
      if (onSuccess) {
        onSuccess(createdSheetId);
      }
    } catch (err) {
      const msg = parseApiError(err, 'تعذر حفظ كشف الحضور.');
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <span>أخذ حضور الشعبة لليوم</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-teal-50 text-teal-800 border border-teal-200">
              {formatArabicDate(todayStr)}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            اختر الشعبة ليتم جلب قائمة الطلاب تلقائياً وفق سجلات القيد الفعالة.
          </p>
        </div>

        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            <ArrowRight className="w-4 h-4 ml-1.5" />
            إلغاء والعودة
          </Button>
        )}
      </div>

      {/* Weekend Alert Warning */}
      {isWeekend && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">تنبيه عطلة نهاية الأسبوع:</p>
            <p className="text-amber-800">
              اليوم هو عطلة رسمية (جمعة أو سبت). تنص لوائح النظام على منع إنشاء كشوف حضور جديدة في أيام العطل.
            </p>
          </div>
        </div>
      )}

      {/* Step 1: Section Selector Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <Building className="w-4 h-4 text-teal-600" />
          <span>تحديد المرحلة والشعبة</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Academic Year */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">السنة الدراسية</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">-- اختر السنة الدراسية --</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_current ? '(الحالية)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Level */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الصف الدراسي</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">-- اختر الصف الدراسي --</option>
              {gradeLevels.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              الشعبة <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedGrade || sections.length === 0}
              className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {sections.length === 0 && selectedGrade ? '-- لا توجد شعب متاحة لهذا الصف --' : '-- اختر الشعبة --'}
              </option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {rosterError && <Alert type="error" message={rosterError} />}
      {submitError && <Alert type="error" message={submitError} onClose={() => setSubmitError(null)} />}

      {/* Roster Loading */}
      {isRosterLoading && (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-xs font-semibold text-slate-500">جاري جلب طلاب الشعبة...</p>
        </div>
      )}

      {/* Roster Student Table */}
      {!isRosterLoading && selectedSection && roster.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Bulk Actions Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setAllStatus(ATTENDANCE_STATUS.PRESENT)}
                className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              >
                <CheckCircle2 className="w-4 h-4 ml-1.5 text-emerald-600" />
                تحديد الكل حاضر
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setAllStatus(ATTENDANCE_STATUS.ABSENT)}
                className="bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200"
              >
                <XCircle className="w-4 h-4 ml-1.5 text-rose-600" />
                تحديد الكل غائب
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAllStatus(ATTENDANCE_STATUS.UNMARKED)}
              >
                إعادة ضبط (تصفير)
              </Button>
            </div>

            {/* Quick Batch Arrival Time Setting */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Clock className="w-4 h-4 text-slate-500" />
              <label className="text-xs font-semibold text-slate-600">وقت الوصول الافتراضي:</label>
              <input
                type="time"
                step="1"
                value={batchArrivalTime}
                onChange={(e) => setBatchArrivalTime(e.target.value)}
                className="text-xs font-bold px-2 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={applyBatchArrivalTimeToPresent}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 transition-colors"
                title="تطبيق الوقت على كل الطلاب"
              >
                تطبيق
              </button>
            </div>
          </div>

          {/* Quick Counter Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 font-semibold block">إجمالي طلاب الشعبة</span>
              <span className="text-lg font-black text-slate-800">{roster.length}</span>
            </div>
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-center">
              <span className="text-[11px] text-emerald-700 font-semibold block">الحاضرون</span>
              <span className="text-lg font-black text-emerald-800">{presentCount}</span>
            </div>
            <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 text-center">
              <span className="text-[11px] text-rose-700 font-semibold block">الغائبون</span>
              <span className="text-lg font-black text-rose-800">{absentCount}</span>
            </div>
            <div className={`p-3 rounded-xl border text-center transition-colors ${
              unmarkedCount > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[11px] text-slate-600 font-semibold block">غير محدد</span>
              <span className={`text-lg font-black ${unmarkedCount > 0 ? 'text-amber-800' : 'text-slate-400'}`}>
                {unmarkedCount}
              </span>
            </div>
          </div>

          {/* Students List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4 min-w-[180px]">الطالب</th>
                    <th className="py-3 px-4 min-w-[200px]">حالة الحضور</th>
                    <th className="py-3 px-4 min-w-[320px]">التفاصيل (وصول / عذر غياب)</th>
                    <th className="py-3 px-4 min-w-[160px]">الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roster.map((s, idx) => {
                    const isPresent = s.status === ATTENDANCE_STATUS.PRESENT;
                    const isAbsent = s.status === ATTENDANCE_STATUS.ABSENT;
                    const isUnmarked = s.status === ATTENDANCE_STATUS.UNMARKED;

                    return (
                      <tr
                        key={s.enrollment}
                        className={`transition-colors ${
                          isUnmarked ? 'bg-amber-50/20' : isPresent ? 'hover:bg-emerald-50/20' : 'hover:bg-rose-50/20'
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{s.student_display}</span>
                          {s.usual_arrival_method_display && (
                            <span className="text-[10px] text-slate-400">
                              المعتاد: {s.usual_arrival_method_display}
                            </span>
                          )}
                        </td>

                        {/* Status Toggle Switcher */}
                        <td className="py-3 px-4">
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                            <button
                              type="button"
                              onClick={() => updateStudentRecord(s.enrollment, { status: ATTENDANCE_STATUS.PRESENT })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                                isPresent
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-emerald-700'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>حاضر</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateStudentRecord(s.enrollment, { status: ATTENDANCE_STATUS.ABSENT })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                                isAbsent
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-rose-700'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>غائب</span>
                            </button>
                          </div>
                        </td>

                        {/* Conditional Details Column */}
                        <td className="py-3 px-4">
                          {isUnmarked && (
                            <span className="text-amber-600 font-medium text-[11px]">
                              بانتظار تحديد الحالة...
                            </span>
                          )}

                          {isPresent && (
                            <div className="flex flex-wrap items-center gap-2">
                              <div>
                                <input
                                  type="time"
                                  step="1"
                                  value={s.arrival_time}
                                  onChange={(e) =>
                                    updateStudentRecord(s.enrollment, { arrival_time: e.target.value })
                                  }
                                  className="text-xs px-2 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                                  title="وقت الوصول"
                                />
                              </div>

                              <div>
                                <select
                                  value={s.arrival_method}
                                  onChange={(e) =>
                                    updateStudentRecord(s.enrollment, { arrival_method: e.target.value })
                                  }
                                  className="text-xs px-2 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                                  title="طريقة الوصول"
                                >
                                  {ARRIVAL_METHODS.map((m) => (
                                    <option key={m.value} value={m.value}>
                                      {m.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {isAbsent && (
                            <div className="space-y-2 py-1">
                              <div className="flex items-center gap-2">
                                <div className="inline-flex rounded border border-slate-200 bg-white p-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateStudentRecord(s.enrollment, { absence_type: ABSENCE_TYPE.UNEXCUSED })
                                    }
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      s.absence_type === ABSENCE_TYPE.UNEXCUSED
                                        ? 'bg-purple-100 text-purple-900'
                                        : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                  >
                                    دون عذر
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateStudentRecord(s.enrollment, { absence_type: ABSENCE_TYPE.EXCUSED })
                                    }
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      s.absence_type === ABSENCE_TYPE.EXCUSED
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                  >
                                    بعذر
                                  </button>
                                </div>

                                {s.absence_type === ABSENCE_TYPE.EXCUSED && (
                                  <select
                                    value={s.absence_reason_source}
                                    onChange={(e) =>
                                      updateStudentRecord(s.enrollment, { absence_reason_source: e.target.value })
                                    }
                                    className="text-xs px-2 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                                  >
                                    {ABSENCE_REASON_SOURCE_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>

                              {s.absence_type === ABSENCE_TYPE.EXCUSED && (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={s.absence_reason}
                                    onChange={(e) =>
                                      updateStudentRecord(s.enrollment, { absence_reason: e.target.value })
                                    }
                                    placeholder="سبب الغياب (مطلوب)..."
                                    required
                                    className="text-xs px-2 py-1 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 w-full max-w-xs"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Notes Column */}
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={s.notes}
                            onChange={(e) =>
                              updateStudentRecord(s.enrollment, { notes: e.target.value })
                            }
                            placeholder="ملاحظات..."
                            className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 w-full"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20">
            <div className="text-xs text-slate-600">
              {unmarkedCount > 0 ? (
                <span className="font-bold text-amber-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  متبقي {unmarkedCount} طالب غير محدد، يرجى تحديد حالتهم لإتمام الحفظ.
                </span>
              ) : (
                <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  تم تحديد حالة جميع الطلاب بنجاح. الكشف جاهز للحفظ.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {onCancel && (
                <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
                  إلغاء
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={unmarkedCount > 0 || roster.length === 0}
                className="w-full sm:w-auto"
              >
                <CheckCircle2 className="w-4 h-4 ml-1.5" />
                حفظ كشف الحضور اليومي
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Selected section has no students */}
      {!isRosterLoading && selectedSection && roster.length === 0 && !rosterError && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">لا يوجد طلاب فعالون في هذه الشعبة</p>
          <p className="text-xs text-slate-400 mt-1">تأكد من وجود تسجيلات طلاب فعالة في الشعبة المحددة.</p>
        </div>
      )}
    </div>
  );
}
