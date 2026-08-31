import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { parseApiError } from '../../utils/errorUtils';
import { Calendar } from 'lucide-react';

export function YearFormModal({ isOpen, onClose, onSubmit, initialYear = null }) {
  const isEditing = Boolean(initialYear);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('draft');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialYear) {
      setStartDate(initialYear.start_date || '');
      setEndDate(initialYear.end_date || '');
      setStatus(initialYear.status || 'draft');
    } else {
      setStartDate('');
      setEndDate('');
      setStatus('draft');
    }
    setErrors({});
    setFormError(null);
  }, [initialYear, isOpen]);

  const validate = () => {
    const errs = {};
    if (!startDate) errs.startDate = 'تاريخ البداية مطلوب';
    if (!endDate) errs.endDate = 'تاريخ النهاية مطلوب';
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      errs.endDate = 'يجب أن يكون تاريخ النهاية بعد تاريخ البداية';
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
        start_date: startDate,
        end_date: endDate,
        status: status,
      });

      onClose();
    } catch (err) {
      setFormError(parseApiError(err, 'حدث خطأ أثناء حفظ السنة الدراسية. يرجى التثبت من المدخلات.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `تعديل السنة الدراسية (${initialYear?.name || ''})` : 'إنشاء سنة دراسية جديدة'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {formError && <Alert type="error">{formError}</Alert>}

        <Input
          label="تاريخ بداية السنة الدراسية (Start Date)"
          type="date"
          icon={Calendar}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          error={errors.startDate}
          disabled={isSubmitting}
          required
        />

        <Input
          label="تاريخ نهاية السنة الدراسية (End Date)"
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
            حالة السنة الدراسية (Status)
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 bg-white text-xs px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="draft">مسودة (draft)</option>
            <option value="active">مفعلة وحالية (active) - مسموح واحدة فقط</option>
            <option value="closed">مغلقة ومؤرشفة (closed)</option>
          </select>
        </div>

        <div className="pt-3 flex gap-3">
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {isEditing ? 'حفظ التعديلات' : 'إنشاء السنة الدراسية'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}
