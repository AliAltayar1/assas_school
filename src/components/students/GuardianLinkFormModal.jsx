import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { getFieldErrors, parseApiError } from "../../utils/errorUtils";
import { UserCheck, AlertCircle } from "lucide-react";

export function GuardianLinkFormModal({
  isOpen,
  onClose,
  onSubmit,
  students = [],
  guardians = [],
}) {
  // Strictly filter only accounts that have guardian / parent role
  const onlyParentGuardians = guardians.filter(
    (g) =>
      g.role === "guardian" ||
      g.role_code === "guardian" ||
      g.role_name === "guardian" ||
      !g.role // fallback if API only returns guardians
  );

  const [formData, setFormData] = useState({
    guardian: "",
    student: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setFormData({
      guardian: onlyParentGuardians[0]?.id || "",
      student: students[0]?.id || "",
    });
    setGeneralError(null);
    setFieldErrors({});
  }, [isOpen, students, guardians]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!formData.guardian || !formData.student) {
      setGeneralError("يرجى اختيار حساب ولي الأمر والطالب المستهدف للربط.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      const extractedErrors = getFieldErrors(err);
      setFieldErrors(extractedErrors);
      setGeneralError(parseApiError(err, "تعذر ربط ولي الأمر بالطالب."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasNoGuardians = onlyParentGuardians.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="ربط ولي أمر بطالب"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right dir-rtl" dir="rtl">
        {generalError && <Alert type="error">{generalError}</Alert>}

        {hasNoGuardians && (
          <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">لا توجد حسابات أولياء أمور مسجلة حالياً (Role: guardian)</p>
              <p className="text-[11px] text-amber-700">
                يمكنك إنشاء حساب جديد لولي الأمر من صفحة &quot;إدارة الحسابات والموظفين&quot; واختيار الدور &quot;ولي أمر&quot;.
              </p>
            </div>
          </div>
        )}

        {/* Guardian Selector (Only accounts with guardian role) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            حساب ولي الأمر (أولياء الأمور المسجلين فقط) <span className="text-rose-500">*</span>
          </label>
          <select
            name="guardian"
            required
            disabled={hasNoGuardians}
            value={formData.guardian}
            onChange={handleChange}
            className={`w-full px-3 py-2.5 bg-white border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:cursor-not-allowed ${
              fieldErrors.guardian
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:ring-teal-500"
            }`}
          >
            <option value="">-- اختر ولي الأمر (حسابات أولياء الأمور فقط) --</option>
            {onlyParentGuardians.map((g) => (
              <option key={g.id} value={g.id}>
                {g.full_name || `${g.first_name || ""} ${g.last_name || ""}`.trim() || g.username} (@{g.username})
              </option>
            ))}
          </select>
          {fieldErrors.guardian && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.guardian}</p>
          )}
        </div>

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
            className={`w-full px-3 py-2.5 bg-white border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 ${
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

        <p className="text-[11px] text-slate-500 leading-relaxed">
          * يمكّن هذا الرابط ولي الأمر من متابعة الحضور والتقييمات الخاصة بهذا الطالب من خلال حسابه.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || hasNoGuardians}
          >
            {isSubmitting ? "جاري الحفظ..." : "تأكيد الربط"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
