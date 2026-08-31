import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { parseApiError } from '../../utils/errorUtils';

export function GradeLevelFormModal({ isOpen, onClose, onSubmit, initialLevel = null }) {
  const isEditing = Boolean(initialLevel);

  const [stage, setStage] = useState('primary');
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialLevel) {
      setStage(initialLevel.stage || 'primary');
      setName(initialLevel.name || '');
      setIsActive(Boolean(initialLevel.is_active));
    } else {
      setStage('primary');
      setName('');
      setIsActive(true);
    }
    setErrors({});
    setFormError(null);
  }, [initialLevel, isOpen]);

  const validate = () => {
    const errs = {};
    if (!stage) errs.stage = 'المرحلة التعليمية مطلوبة';
    if (!name.trim()) errs.name = 'اسم الصف مطلوب';
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
        stage,
        name: name.trim(),
        is_active: isActive,
      });

      onClose();
    } catch (err) {
      setFormError(parseApiError(err, 'حدث خطأ أثناء حفظ الصف الدراسي. يرجى التثبت من المدخلات.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل الصف الدراسي' : 'إضافة صف دراسي جديد'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {formError && <Alert type="error">{formError}</Alert>}

        {/* Stage Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            المرحلة التعليمية (Stage)
          </label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 bg-white text-xs px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          >
            <option value="kindergarten">الروضة (kindergarten)</option>
            <option value="primary">الابتدائية (primary)</option>
            <option value="preparatory">الإعدادية (preparatory)</option>
            <option value="secondary">الثانوية (secondary)</option>
          </select>
        </div>

        <Input
          label="اسم الصف الدراسي (Grade Name)"
          placeholder="مثال: الصف الأول، الصف الخامس"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          disabled={isSubmitting}
          required
        />

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="grade_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isSubmitting}
            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
          />
          <label htmlFor="grade_active" className="text-xs font-semibold text-slate-700">
            الصف مفعل في الهيكل الأكاديمي (Active)
          </label>
        </div>

        <div className="pt-3 flex gap-3">
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {isEditing ? 'حفظ التعديلات' : 'إضافة الصف'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}
