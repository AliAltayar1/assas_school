import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { parseApiError } from '../../utils/errorUtils';

export function SectionFormModal({ isOpen, onClose, onSubmit, years = [], gradeLevels = [], initialSection = null }) {
  const isEditing = Boolean(initialSection);

  const [academicYear, setAcademicYear] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [name, setName] = useState('أ');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialSection) {
      setAcademicYear(initialSection.academic_year || '');
      setGradeLevel(initialSection.grade_level || '');
      setName(initialSection.name || 'أ');
      setIsActive(Boolean(initialSection.is_active));
    } else {
      setAcademicYear(years[0]?.id || '');
      setGradeLevel(gradeLevels[0]?.id || '');
      setName('أ');
      setIsActive(true);
    }
    setErrors({});
    setFormError(null);
  }, [initialSection, isOpen, years, gradeLevels]);

  const validate = () => {
    const errs = {};
    if (!academicYear) errs.academicYear = 'السنة الدراسية مطلوبة';
    if (!gradeLevel) errs.gradeLevel = 'الصف الدراسي مطلوب';
    if (!name.trim()) errs.name = 'رمز/اسم الشعبة مطلوب';
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
        grade_level: gradeLevel,
        name: name.trim(),
        is_active: isActive,
      });

      onClose();
    } catch (err) {
      setFormError(parseApiError(err, 'حدث خطأ أثناء حفظ الشعبة الصفية. يرجى التثبت من المدخلات.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل الشعبة الصفية' : 'إضافة شعبة صفية جديدة'}
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
                {y.name || `${y.start_date} / ${y.end_date}`}
              </option>
            ))}
          </select>
        </div>

        {/* Grade Level Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            الصف الدراسي (Grade Level)
          </label>
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            disabled={isSubmitting || isEditing}
            className="w-full rounded-lg border border-slate-300 bg-white text-xs px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          >
            <option value="">اختر الصف الدراسي...</option>
            {gradeLevels.map((gl) => (
              <option key={gl.id} value={gl.id}>
                {gl.name} ({gl.stage_display || gl.stage})
              </option>
            ))}
          </select>
        </div>

        <Input
          label="اسم/رمز الشعبة (Section Name)"
          placeholder="مثال: أ، ب، 1، 2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          disabled={isSubmitting}
          required
        />

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="section_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isSubmitting}
            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
          />
          <label htmlFor="section_active" className="text-xs font-semibold text-slate-700">
            الشعبة مفعلة (Active)
          </label>
        </div>

        <div className="pt-3 flex gap-3">
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {isEditing ? 'حفظ التعديلات' : 'إضافة الشعبة'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}
