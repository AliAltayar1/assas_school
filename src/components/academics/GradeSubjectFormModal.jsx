import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { parseApiError } from '../../utils/errorUtils';

export function GradeSubjectFormModal({
  isOpen,
  onClose,
  onSubmit,
  years = [],
  gradeLevels = [],
  subjects = [],
  initialGradeSubject = null,
}) {
  const isEditing = Boolean(initialGradeSubject);

  const [academicYear, setAcademicYear] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialGradeSubject) {
      setAcademicYear(initialGradeSubject.academic_year || '');
      setGradeLevel(initialGradeSubject.grade_level || '');
      setSubject(initialGradeSubject.subject || '');
      setIsActive(Boolean(initialGradeSubject.is_active));
    } else {
      setAcademicYear(years[0]?.id || '');
      setGradeLevel(gradeLevels[0]?.id || '');
      setSubject(subjects[0]?.id || '');
      setIsActive(true);
    }
    setErrors({});
    setFormError(null);
  }, [initialGradeSubject, isOpen, years, gradeLevels, subjects]);

  const validate = () => {
    const errs = {};
    if (!academicYear) errs.academicYear = 'السنة الدراسية مطلوبة';
    if (!gradeLevel) errs.gradeLevel = 'الصف الدراسي مطلوب';
    if (!subject) errs.subject = 'المادة التعليمية مطلوبة';
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
        subject: subject,
        is_active: isActive,
      });

      onClose();
    } catch (err) {
      setFormError(parseApiError(err, 'حدث خطأ أثناء ربط المادة بالصف الدراسي. يرجى التثبت من المدخلات.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل ربط المادة بالصف' : 'ربط مادة تعليمية بصف دراسي'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {formError && <Alert type="error">{formError}</Alert>}

        {/* Academic Year */}
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

        {/* Grade Level */}
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

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            المادة التعليمية (Subject)
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isSubmitting || isEditing}
            className="w-full rounded-lg border border-slate-300 bg-white text-xs px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          >
            <option value="">اختر المادة التعليمية...</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="gs_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isSubmitting}
            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
          />
          <label htmlFor="gs_active" className="text-xs font-semibold text-slate-700">
            ربط المادة مفعل في الخطة الدراسية (Active)
          </label>
        </div>

        <div className="pt-3 flex gap-3">
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {isEditing ? 'حفظ التعديلات' : 'ربط المادة بالصف'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}
