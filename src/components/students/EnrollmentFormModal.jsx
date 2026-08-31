import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
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
    if (initialEnrollment) {
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
        student: students[0]?.id || "",
        academic_year: years[0]?.id || "",
        section: sections[0]?.id || "",
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

  // Filter sections by selected academic year if selected
  const filteredSections = formData.academic_year
    ? sections.filter((s) => {
        const secYearId =
          typeof s.academic_year === "object" ? s.academic_year?.id : s.academic_year;
        return !secYearId || secYearId === formData.academic_year;
      })
    : sections;

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
      title={initialEnrollment ? "تعديل تسجيل الطالب" : "تسجيل طالب جديد في شعبة"}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right dir-rtl" dir="rtl">
        {generalError && <Alert type="error">{generalError}</Alert>}

        {/* Student Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            الطالب المستهدف <span className="text-rose-500">*</span>
          </label>
          <select
            name="student"
            required
            value={formData.student}
            onChange={handleChange}
            disabled={!!initialEnrollment}
            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 ${
              fieldErrors.student
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:ring-teal-500"
            }`}
          >
            <option value="">-- اختر الطالب --</option>
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.full_name || `${st.first_name} ${st.last_name}`} (الأب: {st.father_name || "-"})
              </option>
            ))}
          </select>
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
          <select
            name="section"
            required
            value={formData.section}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 ${
              fieldErrors.section
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:ring-teal-500"
            }`}
          >
            <option value="">-- اختر الشعبة --</option>
            {filteredSections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                شعبة ({sec.name}) - {sec.grade_level_display || sec.grade_level_name || "الصف"}
              </option>
            ))}
          </select>
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
              : initialEnrollment
              ? "حفظ التعديل"
              : "إتمام تسجيل الطالب"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
