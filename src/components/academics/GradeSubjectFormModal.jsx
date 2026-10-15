import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { SearchableSelect } from '../ui/SearchableSelect';
import { parseApiError, fetchAllPaginated } from '../../utils/errorUtils';
import { api } from '../../api';
import { BookOpen } from 'lucide-react';

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

  const [internalSubjects, setInternalSubjects] = useState([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  // If subjects were not passed or empty from parent, fetch them all directly
  useEffect(() => {
    if (isOpen && (!subjects || subjects.length === 0)) {
      let active = true;
      setIsLoadingSubjects(true);
      fetchAllPaginated(api.academics.getSubjects, { ordering: 'name' })
        .then((data) => {
          if (active && Array.isArray(data)) {
            const sorted = [...data].sort((a, b) =>
              (a.name || '').localeCompare(b.name || '', 'ar')
            );
            setInternalSubjects(sorted);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setIsLoadingSubjects(false);
        });

      return () => {
        active = false;
      };
    }
  }, [isOpen, subjects]);

  const effectiveSubjects = subjects && subjects.length > 0 ? subjects : internalSubjects;

  const subjectOptions = useMemo(() => {
    const list = (effectiveSubjects || []).map((sub) => ({
      value: sub.id,
      label: sub.name,
      subtext: sub.code ? `رمز: ${sub.code}` : undefined,
    }));

    // If editing and subject is missing from list, prepend it
    if (
      initialGradeSubject &&
      initialGradeSubject.subject &&
      !list.some((opt) => String(opt.value) === String(initialGradeSubject.subject))
    ) {
      list.unshift({
        value: initialGradeSubject.subject,
        label:
          initialGradeSubject.subject_display ||
          initialGradeSubject.subject_name ||
          `المادة (#${String(initialGradeSubject.subject).slice(0, 8)})`,
      });
    }

    return list;
  }, [effectiveSubjects, initialGradeSubject]);

  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setFormError(null);
      return;
    }

    if (initialGradeSubject) {
      setAcademicYear(initialGradeSubject.academic_year || '');
      setGradeLevel(initialGradeSubject.grade_level || '');
      setSubject(initialGradeSubject.subject || '');
      setIsActive(Boolean(initialGradeSubject.is_active));
    } else {
      setAcademicYear(years[0]?.id || '');
      setGradeLevel(gradeLevels[0]?.id || '');
      setSubject('');
      setIsActive(true);
    }
    setErrors({});
    setFormError(null);
  }, [initialGradeSubject, isOpen, years, gradeLevels]);

  const validate = () => {
    const errs = {};
    if (!academicYear) errs.academicYear = 'السنة الدراسية مطلوبة';
    if (!gradeLevel) errs.gradeLevel = 'الصف الدراسي مطلوب';
    if (!subject) errs.subject = 'يرجى اختيار أو البحث عن المادة التعليمية';
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
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right min-h-[350px] flex flex-col justify-between">
        <div className="space-y-4">
          {formError && <Alert type="error">{formError}</Alert>}

          {/* Academic Year */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              السنة الدراسية (Academic Year)
            </label>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                if (errors.academicYear) setErrors((prev) => ({ ...prev, academicYear: null }));
              }}
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
            {errors.academicYear && (
              <p className="text-[11px] text-rose-600 font-medium">{errors.academicYear}</p>
            )}
          </div>

          {/* Grade Level */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              الصف الدراسي (Grade Level)
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => {
                setGradeLevel(e.target.value);
                if (errors.gradeLevel) setErrors((prev) => ({ ...prev, gradeLevel: null }));
              }}
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
            {errors.gradeLevel && (
              <p className="text-[11px] text-rose-600 font-medium">{errors.gradeLevel}</p>
            )}
          </div>

          {/* Subject with SearchableSelect */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                المادة التعليمية (Subject) <span className="text-rose-500">*</span>
              </label>
              {effectiveSubjects.length > 0 && (
                <span className="text-[11px] text-slate-400 font-medium">
                  ({effectiveSubjects.length} مادة مسجلة)
                </span>
              )}
            </div>

            <SearchableSelect
              options={subjectOptions}
              value={subject}
              onChange={(val) => {
                setSubject(val || '');
                if (errors.subject) {
                  setErrors((prev) => ({ ...prev, subject: null }));
                }
              }}
              placeholder={
                isLoadingSubjects
                  ? 'جاري تحميل قائمة المواد...'
                  : '-- ابحث أو اختر المادة التعليمية --'
              }
              searchPlaceholder="اكتب اسم المادة للبحث السريع..."
              emptyMessage="لا توجد مادة تعليمية مطابقة للبحث"
              noOptionsMessage={
                isLoadingSubjects
                  ? 'جاري تحميل المواد...'
                  : '-- لا توجد مواد تعليمية مسجلة --'
              }
              disabled={isSubmitting || isEditing || isLoadingSubjects}
              icon={BookOpen}
              inputClassName={
                errors.subject
                  ? 'border-rose-400 focus:ring-rose-400'
                  : 'border-slate-300 focus:ring-teal-500'
              }
            />
            {errors.subject && (
              <p className="text-[11px] text-rose-600 font-medium">{errors.subject}</p>
            )}
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
            <label htmlFor="gs_active" className="text-xs font-semibold text-slate-700 cursor-pointer">
              ربط المادة مفعل في الخطة الدراسية (Active)
            </label>
          </div>
        </div>

        <div className="pt-4 flex gap-3 border-t border-slate-100 mt-2">
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
