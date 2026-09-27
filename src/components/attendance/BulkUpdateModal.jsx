import React, { useState } from 'react';
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
  DEFAULT_ARRIVAL_TIME,
  DEFAULT_DEPARTURE_TIME,
} from './attendanceConstants';
import { CheckSquare, Square, Users, Sparkles, AlertCircle } from 'lucide-react';

export function BulkUpdateModal({ isOpen, onClose, sheet, onSuccess }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [actionType, setActionType] = useState('mark_present'); // 'mark_present' | 'mark_absent' | 'set_departure' | 'update_notes'

  // Values to apply to selected
  const [arrivalTime, setArrivalTime] = useState(DEFAULT_ARRIVAL_TIME);
  const [arrivalMethod, setArrivalMethod] = useState('school_bus');
  const [departureTime, setDepartureTime] = useState(DEFAULT_DEPARTURE_TIME);
  const [departureMethod, setDepartureMethod] = useState('school_bus');
  const [absenceType, setAbsenceType] = useState(ABSENCE_TYPE.UNEXCUSED);
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceReasonSource, setAbsenceReasonSource] = useState('guardian');
  const [bulkNotes, setBulkNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!sheet || !Array.isArray(sheet.records)) return null;

  const records = sheet.records;

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map((r) => r.id)));
    }
  };

  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (selectedIds.size === 0) {
      setError('يرجى تحديد طالب واحد على الأقل لتطبيق التعديل.');
      return;
    }

    if (actionType === 'mark_absent' && absenceType === ABSENCE_TYPE.EXCUSED) {
      if (!absenceReason.trim()) {
        setError('يرجى إدخال سبب الغياب عند تحديد الغياب بعذر.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const recordsToUpdate = Array.from(selectedIds).map((id) => {
        const item = { id };

        if (actionType === 'mark_present') {
          item.status = ATTENDANCE_STATUS.PRESENT;
          item.arrival_time = arrivalTime || DEFAULT_ARRIVAL_TIME;
          item.arrival_method = arrivalMethod;
        } else if (actionType === 'mark_absent') {
          item.status = ATTENDANCE_STATUS.ABSENT;
          item.absence_type = absenceType;
          item.absence_reason = absenceType === ABSENCE_TYPE.EXCUSED ? absenceReason.trim() : '';
          item.absence_reason_source = absenceType === ABSENCE_TYPE.EXCUSED ? absenceReasonSource : '';
        } else if (actionType === 'set_departure') {
          item.departure_time = departureTime;
          item.departure_method = departureMethod;
        } else if (actionType === 'update_notes') {
          item.notes = bulkNotes.trim();
        }

        return item;
      });

      const res = await api.attendance.bulkUpdateSheet(sheet.id, { records: recordsToUpdate });
      toast.success(res.message || 'تم تصحيح سجلات الحضور بنجاح.');
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      const msg = parseApiError(err, 'تعذر تطبيق التعديلات الجماعية.');
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
      title="تعديل عدة سجلات دفعة واحدة"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Action Type Tabs */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">نوع الإجراء الجماعي</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'mark_present', label: 'تحويل إلى حاضر' },
              { id: 'mark_absent', label: 'تحويل إلى غائب' },
              { id: 'set_departure', label: 'تسجيل انصراف' },
              { id: 'update_notes', label: 'تحديث الملاحظات' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActionType(tab.id)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                  actionType === tab.id
                    ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Specific Fields */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          {actionType === 'mark_present' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">وقت الوصول</label>
                <input
                  type="time"
                  step="1"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">طريقة الوصول</label>
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
          )}

          {actionType === 'mark_absent' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAbsenceType(ABSENCE_TYPE.UNEXCUSED)}
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg border ${
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
                  className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg border ${
                    absenceType === ABSENCE_TYPE.EXCUSED
                      ? 'border-amber-400 bg-amber-100 text-amber-900'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  بعذر
                </button>
              </div>

              {absenceType === ABSENCE_TYPE.EXCUSED && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">مصدر العذر</label>
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
                    <label className="block text-xs font-medium text-slate-700 mb-1">سبب الغياب</label>
                    <input
                      type="text"
                      value={absenceReason}
                      onChange={(e) => setAbsenceReason(e.target.value)}
                      placeholder="سبب الغياب..."
                      className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {actionType === 'set_departure' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">وقت الانصراف</label>
                <input
                  type="time"
                  step="1"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">طريقة الانصراف</label>
                <select
                  value={departureMethod}
                  onChange={(e) => setDepartureMethod(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {DEPARTURE_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {actionType === 'update_notes' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">الملاحظات الجديدة</label>
              <textarea
                rows="2"
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="أدخل الملاحظة لتطبيقها على الطلاب المحددين..."
                className="w-full text-xs font-medium p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
              />
            </div>
          )}
        </div>

        {/* Student Selector List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-teal-600" />
              <span>اختر الطلاب لتطبيق التعديل ({selectedIds.size} من {records.length})</span>
            </label>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
            >
              {selectedIds.size === records.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
            {records.map((r) => {
              const isSelected = selectedIds.has(r.id);
              return (
                <div
                  key={r.id}
                  onClick={() => toggleSelectOne(r.id)}
                  className={`flex items-center justify-between p-2.5 cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-teal-50/70 text-teal-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-teal-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                    <span>{r.student_display}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {r.status_display}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={selectedIds.size === 0}>
            تطبيق التعديلات ({selectedIds.size})
          </Button>
        </div>
      </form>
    </Modal>
  );
}
