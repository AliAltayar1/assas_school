import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { parseApiError } from '../../utils/errorUtils';
import { Calendar } from 'lucide-react';

export function TermFormModal({ isOpen, onClose, onSubmit, years = [], initialTerm = null }) {
  const isEditing = Boolean(initialTerm);

  const [academicYear, setAcademicYear] = useState('');
  const [number, setNumber] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('draft');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialTerm) {
      setAcademicYear(initialTerm.academic_year || '');
      setNumber(initialTerm.number || 1);
      setStartDate(initialTerm.start_date || '');
      setEndDate(initialTerm.end_date || '');
      setStatus(initialTerm.status || 'draft');
    } else {
      setAcademicYear(years[0]?.id || '');
      setNumber(1);
      setStartDate('');
      setEndDate('');
      setStatus('draft');
    }
    setErrors({});
    setFormError(null);
  }, [initialTerm, isOpen, years]);

  const validate = () => {
    const errs = {};
    if (!academicYear) errs.academicYear = 'السنة الدراسية مطلوبة';
    if (!startDate) errs.startDate = 'تاريخ البداية مطلوب';
    if (!endDate) errs.endDate = 'تاريخ النهاية مطلوب';
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      errs.endDate = 'تاريخ النهاية يجب أن يكون بعد بداية الفصل';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await onSubmit({
        academic_year: academicYear,
        number: Number(number),
        start_date: startDate,
        end_date: endDate,
        status: status,
      });

      onClose();
    } catch (err) {
      setFormError(parseApiError(err, 'حدث خطأ أثناء حفظ الفصل الدراسي. يرجى التثبت من المدخلات.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل الفصل الدراسي' : 'إنشاء فصل دراسي جديد'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {formError && <Alert type="error">{formError}</Alert>}

        {/* Academic Year Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            السنة الدراسية (Academic Year)
          </label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            disabled={isSubmitting || isEditing}
            className="w-full rounded-lg border border-slate-300 bg-white text-xs px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          >
            <option value="">اختر السنة الدراسية...</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name || `${y.start_date} / ${y.end_date}`} ({y.status_display || y.status})
              </option>
            ))}
          </select>
          {errors.academicYear && <p className="text-xs text-rose-600">{errors.academicYear}</p>}
        </div>

        {/* Term Number (1 or 2) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            رقم الفصل الدراسي (Term Number)
          </label>
          <select
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
            disabled={isSubmitting || isEditing}
            className="w-full rounded-lg border border-slate-300 bg-white text-xs px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value={1}>الفصل الأول (1)</option>
            <option value={2}>الفصل الثاني (2)</option>
          </select>
        </div>

        <Input
          label="تاريخ بداية الفصل الدراسي (Start Date)"
          type="date"
          icon={Calendar}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          error={errors.startDate}
          disabled={isSubmitting}
          required
        />

        <Input
          label="تاريخ نهاية الفصل الدراسي (End Date)"
          type="date"
          icon={Calendar}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          error={errors.endDate}
          disabled={isSubmitting}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            حالة الفصل الدراسي (Status)
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 bg-white text-xs px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="draft">مسودة (draft)</option>
            <option value="active">مفعل (active) - مسموح واحد فقط للسنة</option>
            <option value="closed">مغلق (closed)</option>
          </select>
        </div>

        <div className="pt-3 flex gap-3">
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {isEditing ? 'حفظ التعديلات' : 'إنشاء الفصل الدراسي'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}
