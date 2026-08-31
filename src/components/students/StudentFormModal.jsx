import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { getFieldErrors, parseApiError } from "../../utils/errorUtils";

export function StudentFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialStudent = null,
}) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    father_name: "",
    mother_name: "",
    birth_date: "",
    gender: "male",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialStudent) {
      setFormData({
        first_name: initialStudent.first_name || "",
        last_name: initialStudent.last_name || "",
        father_name: initialStudent.father_name || "",
        mother_name: initialStudent.mother_name || "",
        birth_date: initialStudent.birth_date || "",
        gender: initialStudent.gender || "male",
      });
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        father_name: "",
        mother_name: "",
        birth_date: "",
        gender: "male",
      });
    }
    setGeneralError(null);
    setFieldErrors({});
  }, [initialStudent, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear specific field error on typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Basic frontend check
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setGeneralError("يرجى إدخال الاسم الأول واسم العائلة للطالب.");
      return;
    }
    if (!formData.father_name.trim() || !formData.mother_name.trim()) {
      setGeneralError("يرجى إدخال اسم الأب واسم الأم.");
      return;
    }
    if (!formData.birth_date) {
      setGeneralError("يرجى تحديد تاريخ ميلاد الطالب.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      const extractedErrors = getFieldErrors(err);
      setFieldErrors(extractedErrors);
      setGeneralError(parseApiError(err, "تعذر حفظ بيانات الطالب. يرجى مراجعة الحقول."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={initialStudent ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right dir-rtl" dir="rtl">
        {generalError && <Alert type="error">{generalError}</Alert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* First Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الاسم الأول <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="first_name"
              required
              placeholder="مثال: أحمد"
              value={formData.first_name}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 ${
                fieldErrors.first_name
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-slate-300 focus:ring-teal-500"
              }`}
            />
            {fieldErrors.first_name && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.first_name}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم العائلة (الكنية) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="last_name"
              required
              placeholder="مثال: العلي"
              value={formData.last_name}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 ${
                fieldErrors.last_name
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-slate-300 focus:ring-teal-500"
              }`}
            />
            {fieldErrors.last_name && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.last_name}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Father Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الأب <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="father_name"
              required
              placeholder="مثال: محمد"
              value={formData.father_name}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 ${
                fieldErrors.father_name
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-slate-300 focus:ring-teal-500"
              }`}
            />
            {fieldErrors.father_name && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.father_name}</p>
            )}
          </div>

          {/* Mother Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              اسم الأم <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="mother_name"
              required
              placeholder="مثال: فاطمة"
              value={formData.mother_name}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 ${
                fieldErrors.mother_name
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-slate-300 focus:ring-teal-500"
              }`}
            />
            {fieldErrors.mother_name && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.mother_name}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Birth Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تاريخ الميلاد <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              name="birth_date"
              required
              value={formData.birth_date}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 ${
                fieldErrors.birth_date
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-slate-300 focus:ring-teal-500"
              }`}
            />
            {fieldErrors.birth_date && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.birth_date}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الجنس <span className="text-rose-500">*</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 ${
                fieldErrors.gender
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-slate-300 focus:ring-teal-500"
              }`}
            >
              <option value="male">ذكر (Male)</option>
              <option value="female">أنثى (Female)</option>
            </select>
            {fieldErrors.gender && (
              <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.gender}</p>
            )}
          </div>
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
              : initialStudent
              ? "حفظ التعديلات"
              : "إنشاء الطالب"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
