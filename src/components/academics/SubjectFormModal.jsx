import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { parseApiError } from '../../utils/errorUtils';
import { BookOpen } from 'lucide-react';

export function SubjectFormModal({ isOpen, onClose, onSubmit, initialSubject = null }) {
  const isEditing = Boolean(initialSubject);

  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialSubject) {
      setName(initialSubject.name || '');
      setIsActive(Boolean(initialSubject.is_active));
    } else {
      setName('');
      setIsActive(true);
    }
    setErrors({});
    setFormError(null);
  }, [initialSubject, isOpen]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'اسم المادة التعليمية مطلوب';
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
        name: name.trim(),
        is_active: isActive,
      });

      onClose();
    } catch (err) {
      setFormError(parseApiError(err, 'حدث خطأ أثناء حفظ المادة التعليمية. يرجى التثبت من المدخلات.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل المادة التعليمية' : 'إضافة مادة تعليمية جديدة'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {formError && <Alert type="error">{formError}</Alert>}

        <Input
          label="اسم المادة التعليمية (Subject Name)"
          placeholder="مثال: الرياضيات، اللغة العربية، الفيزياء"
          icon={BookOpen}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          disabled={isSubmitting}
          required
        />

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="subject_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isSubmitting}
            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
          />
          <label htmlFor="subject_active" className="text-xs font-semibold text-slate-700">
            المادة مفعلة ومتاحة للتدريس (Active)
          </label>
        </div>

        <div className="pt-3 flex gap-3">
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {isEditing ? 'حفظ التعديلات' : 'إضافة المادة'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}
