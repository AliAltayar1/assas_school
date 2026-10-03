import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { toast } from 'sonner';
import { api } from '../../api';
import { parseApiError } from '../../utils/errorUtils';
import {
  ATTENDANCE_STATUS,
  ABSENCE_TYPE,
  ABSENCE_REASON_SOURCE_OPTIONS,
  ARRIVAL_METHODS,
  DEPARTURE_METHODS,
  COMMON_ABSENCE_REASONS,
  DEFAULT_ARRIVAL_TIME,
  formatArabicDate,
} from './attendanceConstants';
import { User, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export function RecordEditModal({ isOpen, onClose, record, onSuccess }) {
  const [status, setStatus] = useState(ATTENDANCE_STATUS.PRESENT);
  const [arrivalTime, setArrivalTime] = useState(DEFAULT_ARRIVAL_TIME);
  const [arrivalMethod, setArrivalMethod] = useState('school_bus');
  const [departureTime, setDepartureTime] = useState('');
  const [departureMethod, setDepartureMethod] = useState('');
  const [absenceType, setAbsenceType] = useState(ABSENCE_TYPE.UNEXCUSED);
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceReasonSource, setAbsenceReasonSource] = useState('guardian');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (record && isOpen) {
      setError(null);
      setStatus(record.status || ATTENDANCE_STATUS.PRESENT);
      setArrivalTime(record.arrival_time || DEFAULT_ARRIVAL_TIME);
      setArrivalMethod(record.arrival_method || 'school_bus');
      setDepartureTime(record.departure_time || '');
      setDepartureMethod(record.departure_method || '');
      setAbsenceType(record.absence_type || ABSENCE_TYPE.UNEXCUSED);
      setAbsenceReason(record.absence_reason || '');
      setAbsenceReasonSource(record.absence_reason_source || 'guardian');
      setNotes(record.notes || '');
    }
  }, [record, isOpen]);

  if (!record) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Form validation
    if (status === ATTENDANCE_STATUS.ABSENT && absenceType === ABSENCE_TYPE.EXCUSED) {
      if (!absenceReason.trim()) {
        setError('يرجى كتابة سبب الغياب عند تحديد الغياب بعذر.');
        return;
      }
      if (!absenceReasonSource) {
        setError('يرجى تحديد مصدر سبب الغياب.');
        return;
      }
    }

    // Departure time vs Arrival time check if both present
    if (status === ATTENDANCE_STATUS.PRESENT && departureTime && arrivalTime) {
      if (departureTime < arrivalTime) {
        setError('وقت المغادرة لا يمكن أن يكون قبل وقت الوصول.');
        return;
      }
    }

    setIsLoading(true);

    try {
      let payload = {};

      if (status === ATTENDANCE_STATUS.ABSENT) {
        // Backend zeroes arrival & departure automatically
        payload = {
          status: ATTENDANCE_STATUS.ABSENT,
          absence_type: absenceType,
          absence_reason: absenceType === ABSENCE_TYPE.EXCUSED ? absenceReason.trim() : '',
          absence_reason_source: absenceType === ABSENCE_TYPE.EXCUSED ? absenceReasonSource : '',
          notes: notes.trim(),
        };
      } else {
        // Backend zeroes absence details automatically
        payload = {
          status: ATTENDANCE_STATUS.PRESENT,
          arrival_time: arrivalTime || DEFAULT_ARRIVAL_TIME,
          arrival_method: arrivalMethod || 'school_bus',
          notes: notes.trim(),
        };

        if (departureTime) {
          payload.departure_time = departureTime;
          payload.departure_method = departureMethod || 'school_bus';
        } else {
          payload.departure_time = null;
          payload.departure_method = '';
        }
      }

      const res = await api.attendance.updateRecord(record.id, payload);
      toast.success(res.message || 'تم تحديث سجل حضور الطالب بنجاح.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = parseApiError(err, 'تعذر تحديث سجل الطالب.');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تعديل سجل الحضور: ${record.student_display}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Student Header Info */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-slate-800 text-sm truncate">{record.student_display}</h4>
              {(record.attendance_date || record.created_at) && (
                <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-semibold border border-teal-200 shrink-0">
                  {formatArabicDate(record.attendance_date || record.created_at)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              الحالة الحالية: <span className="font-semibold text-slate-700">{record.status_display}</span>
            </p>
          </div>
        </div>

        {/* Status Selection (Present / Absent) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">حالة الحضور</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStatus(ATTENDANCE_STATUS.PRESENT)}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                status === ATTENDANCE_STATUS.PRESENT
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 ${status === ATTENDANCE_STATUS.PRESENT ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>حاضر</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus(ATTENDANCE_STATUS.ABSENT)}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                status === ATTENDANCE_STATUS.ABSENT
                  ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <XCircle className={`w-4 h-4 ${status === ATTENDANCE_STATUS.ABSENT ? 'text-rose-600' : 'text-slate-400'}`} />
              <span>غائب</span>
            </button>
          </div>
        </div>

        {/* Conditional Fields: Present */}
        {status === ATTENDANCE_STATUS.PRESENT && (
          <div className="space-y-4 p-4 bg-slate-50/70 border border-slate-200 rounded-xl">
            <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>بيانات الوصول والانصراف</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">وقت الوصول</label>
                <input
                  type="time"
                  step="1"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">طريقة الوصول</label>
                <select
                  value={arrivalMethod}
                  onChange={(e) => setArrivalMethod(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {ARRIVAL_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">وقت الانصراف (اختياري)</label>
                <input
                  type="time"
                  step="1"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  placeholder="لم ينصرف بعد"
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">طريقة الانصراف</label>
                <select
                  value={departureMethod}
                  onChange={(e) => setDepartureMethod(e.target.value)}
                  disabled={!departureTime}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">-- اختر طريقة الانصراف --</option>
                  {DEPARTURE_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Conditional Fields: Absent */}
        {status === ATTENDANCE_STATUS.ABSENT && (
          <div className="space-y-4 p-4 bg-rose-50/50 border border-rose-200 rounded-xl">
            <h5 className="text-xs font-bold text-rose-800 flex items-center gap-1.5 border-b border-rose-200 pb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>تفاصيل الغياب</span>
            </h5>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">نوع الغياب</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAbsenceType(ABSENCE_TYPE.UNEXCUSED)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                    absenceType === ABSENCE_TYPE.UNEXCUSED
                      ? 'border-rose-400 bg-rose-100 text-rose-900'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  دون عذر
                </button>
                <button
                  type="button"
                  onClick={() => setAbsenceType(ABSENCE_TYPE.EXCUSED)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                    absenceType === ABSENCE_TYPE.EXCUSED
                      ? 'border-amber-400 bg-amber-100 text-amber-900'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  بعذر
                </button>
              </div>
            </div>

            {absenceType === ABSENCE_TYPE.EXCUSED && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    مصدر سبب الغياب <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={absenceReasonSource}
                    onChange={(e) => setAbsenceReasonSource(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {ABSENCE_REASON_SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    سبب الغياب <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={absenceReason}
                    onChange={(e) => setAbsenceReason(e.target.value)}
                    placeholder="مثال: مراجعة طبيب، ظرف عائلي، مرض..."
                    className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  {/* Quick suggestion tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {COMMON_ABSENCE_REASONS.map((reason) => (
                      <button
                        type="button"
                        key={reason}
                        onClick={() => setAbsenceReason(reason)}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* General Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">ملاحظات إضافية (اختياري)</label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات حول الطالب أو انصرافه..."
            className="w-full text-xs font-medium p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            حفظ التعديلات
          </Button>
        </div>
      </form>
    </Modal>
  );
}
