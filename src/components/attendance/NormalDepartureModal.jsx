import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { toast } from 'sonner';
import { api } from '../../api';
import { parseApiError } from '../../utils/errorUtils';
import { DEPARTURE_METHODS, DEFAULT_DEPARTURE_TIME } from './attendanceConstants';
import { LogOut, Info, AlertTriangle, Users } from 'lucide-react';

export function NormalDepartureModal({ isOpen, onClose, sheet, eligibleCount, onSuccess }) {
  const [departureTime, setDepartureTime] = useState(DEFAULT_DEPARTURE_TIME);
  const [departureMethod, setDepartureMethod] = useState('school_bus');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!sheet) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!departureTime) {
      setError('يرجى تحديد وقت المغادرة والانصراف.');
      return;
    }

    if (!departureMethod) {
      setError('يرجى تحديد طريقة المغادرة.');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        departure_time: departureTime,
        departure_method: departureMethod,
      };

      const res = await api.attendance.normalDeparture(sheet.id, payload);
      toast.success(res.message || 'تم تسجيل المغادرة الطبيعية للطلاب بنجاح.');
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      const msg = parseApiError(err, 'تعذر تسجيل المغادرة الطبيعية.');
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
      title="تسجيل المغادرة الطبيعية لجميع الطلاب الحاضرين"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {/* Informative Banner */}
        <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">ملاحظة تنظيمية:</p>
            <p className="text-sky-800 leading-relaxed">
              سيتم تسجيل وقت وطريقة المغادرة لجميع الطلاب الحاضرين الذين لم تُسجل لهم مغادرة خاصة مسبقاً. لن يتم تعديل الطلاب الغائبين أو من سُجل انصرافهم مسبقاً.
            </p>
          </div>
        </div>

        {/* Count Preview */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="w-4 h-4 text-teal-600" />
            <span>عدد الطلاب المؤهلين للمغادرة:</span>
          </div>
          <span className="font-bold text-teal-800 text-sm bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg">
            {eligibleCount} طالب
          </span>
        </div>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              وقت الانصراف <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              step="1"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              required
              className="w-full text-xs font-semibold px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              طريقة الانصراف <span className="text-rose-500">*</span>
            </label>
            <select
              value={departureMethod}
              onChange={(e) => setDepartureMethod(e.target.value)}
              required
              className="w-full text-xs font-semibold px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              {DEPARTURE_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={eligibleCount === 0}>
            <LogOut className="w-4 h-4 ml-1.5" />
            تأكيد تسجيل المغادرة
          </Button>
        </div>
      </form>
    </Modal>
  );
}
