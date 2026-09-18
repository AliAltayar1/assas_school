import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { SearchableSelect } from "../ui/SearchableSelect";
import { getFieldErrors, parseApiError } from "../../utils/errorUtils";

export function EnrollmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialEnrollment = null,
  students = [],
  years = [],
  sections = [],
}) {
  const [formData, setFormData] = useState({
    student: "",
    academic_year: "",
    section: "",
    enrollment_date: new Date().toISOString().split("T")[0],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialEnrollment?.id) {
      setFormData({
        student:
          typeof initialEnrollment.student === "object"
            ? initialEnrollment.student?.id
            : initialEnrollment.student || "",
        academic_year:
          typeof initialEnrollment.academic_year === "object"
            ? initialEnrollment.academic_year?.id
            : initialEnrollment.academic_year || "",
        section:
          typeof initialEnrollment.section === "object"
            ? initialEnrollment.section?.id
            : initialEnrollment.section || "",
        enrollment_date:
          initialEnrollment.enrollment_date ||
          new Date().toISOString().split("T")[0],
      });
    } else {
      setFormData({
        student: initialEnrollment?.student || students[0]?.id || "",
        academic_year: initialEnrollment?.academic_year || years[0]?.id || "",
        section: initialEnrollment?.section || sections[0]?.id || "",
        enrollment_date: new Date().toISOString().split("T")[0],
      });
    }
    setGeneralError(null);
    setFieldErrors({});
  }, [initialEnrollment, isOpen, students, years, sections]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Ensure the target student is available in the dropdown even if students list is still loading
  const availableStudents = React.useMemo(() => {
    if (
      initialEnrollment?.student &&
      !students.some((s) => s.id === initialEnrollment.student)
    ) {
      return [
        {
          id: initialEnrollment.student,
          full_name: initialEnrollment.student_display || "الطالب المسجل حديثاً",
          father_name: initialEnrollment.father_name || "",
        },
        ...students,
      ];
    }
    return students;
  }, [students, initialEnrollment]);

  // Options for SearchableSelect
  const studentOptions = React.useMemo(() => {
    return availableStudents.map((st) => ({
      value: st.id,
      label: st.full_name || `${st.first_name || ""} ${st.last_name || ""}`.trim() || st.id,
      subtext: st.father_name ? `اسم الأب: ${st.father_name}` : "",
    }));
  }, [availableStudents]);

  // Filter sections by selected academic year if selected
  const filteredSections = formData.academic_year
    ? sections.filter((s) => {
        const secYearId =
          typeof s.academic_year === "object" ? s.academic_year?.id : s.academic_year;
        return !secYearId || secYearId === formData.academic_year;
      })
    : sections;

  const sectionOptions = React.useMemo(() => {
    return filteredSections.map((sec) => ({
      value: sec.id,
      label: `شعبة (${sec.name}) - ${sec.grade_level_display || sec.grade_level_name || "الصف"}`,
      subtext: sec.academic_year_display || sec.academic_year?.name || "",
    }));
  }, [filteredSections]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!formData.student || !formData.academic_year || !formData.section || !formData.enrollment_date) {
      setGeneralError("يرجى اختيار الطالب والعام الدراسي والشعبة وتاريخ التسجيل.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      const extractedErrors = getFieldErrors(err);
      setFieldErrors(extractedErrors);
      setGeneralError(parseApiError(err, "تعذر حفظ تسجيل الطالب."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={initialEnrollment?.id ? "تعديل تسجيل الطالب" : "تسجيل طالب جديد في شعبة"}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right dir-rtl" dir="rtl">
        {generalError && <Alert type="error">{generalError}</Alert>}

        {/* Student Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            الطالب المستهدف <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            options={studentOptions}
            value={formData.student}
            onChange={(val) => {
              setFormData((prev) => ({ ...prev, student: val }));
              if (fieldErrors.student) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.student;
                  return next;
                });
              }
            }}
            disabled={Boolean(initialEnrollment?.id)}
            placeholder="-- اختر الطالب (اكتب للبحث السريع) --"
            searchPlaceholder="اكتب اسم الطالب للبحث..."
            emptyMessage="لا يوجد طلاب مطابقين للبحث"
            noOptionsMessage="-- لا يوجد طلاب متاحين --"
            inputClassName={
              fieldErrors.student
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:ring-teal-500"
            }
          />
          {fieldErrors.student && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.student}</p>
          )}
        </div>

        {/* Academic Year Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            العام الدراسي <span className="text-rose-500">*</span>
          </label>
          <select
            name="academic_year"
            required
            value={formData.academic_year}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 ${
              fieldErrors.academic_year
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:ring-teal-500"
            }`}
          >
            <option value="">-- اختر العام الدراسي --</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name || `${y.start_date} / ${y.end_date}`}
              </option>
            ))}
          </select>
          {fieldErrors.academic_year && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.academic_year}</p>
          )}
        </div>

        {/* Section Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            الشعبة والصف الدراسي <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            options={sectionOptions}
            value={formData.section}
            onChange={(val) => {
              setFormData((prev) => ({ ...prev, section: val }));
              if (fieldErrors.section) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.section;
                  return next;
                });
              }
            }}
            placeholder="-- اختر الشعبة (اكتب للبحث السريع) --"
            searchPlaceholder="اكتب اسم الشعبة أو الصف للبحث..."
            emptyMessage="لا توجد شعب مطابقة للبحث"
            noOptionsMessage="-- لا توجد شعب متاحة لهذا العام --"
            inputClassName={
              fieldErrors.section
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:ring-teal-500"
            }
          />
          {fieldErrors.section && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.section}</p>
          )}
        </div>

        {/* Enrollment Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            تاريخ التسجيل <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            name="enrollment_date"
            required
            value={formData.enrollment_date}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 ${
              fieldErrors.enrollment_date
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:ring-teal-500"
            }`}
          />
          {fieldErrors.enrollment_date && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.enrollment_date}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>

          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting
              ? "جاري الحفظ..."
              : initialEnrollment?.id
              ? "حفظ التعديل"
              : "إتمام تسجيل الطالب"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
