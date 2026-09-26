import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ShieldAlert, AlertTriangle, Layers, BookOpen, User, CheckCircle2 } from "lucide-react";
import { getFieldErrors, parseApiError } from "../../utils/errorUtils";
import { SearchableSelect } from "../ui/SearchableSelect";

export function CorrectPlacementModal({
  isOpen,
  onClose,
  onCorrectPlacement,
  enrollment = null,
  sections = [],
}) {
  const [targetSectionId, setTargetSectionId] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Current enrollment properties
  const currentSectionId =
    typeof enrollment?.section === "object"
      ? enrollment?.section?.id
      : enrollment?.section;
  const currentYearId =
    typeof enrollment?.academic_year === "object"
      ? enrollment?.academic_year?.id
      : enrollment?.academic_year;
  const currentGradeId =
    typeof enrollment?.grade_level === "object"
      ? enrollment?.grade_level?.id
      : enrollment?.grade_level;

  // Filter sections strictly to the same academic year and grade level, excluding current section
  const availableTargetSections = sections.filter((sec) => {
    if (sec.id === currentSectionId) return false;

    const secYearId =
      typeof sec.academic_year === "object"
        ? sec.academic_year?.id
        : sec.academic_year;
    const secGradeId =
      typeof sec.grade_level === "object"
        ? sec.grade_level?.id
        : sec.grade_level;

    // Must match year and grade if present on section
    if (currentYearId && secYearId && secYearId !== currentYearId) return false;
    if (currentGradeId && secGradeId && secGradeId !== currentGradeId) return false;

    return true;
  });

  const targetSectionOptions = React.useMemo(() => {
    return availableTargetSections.map((sec) => ({
      value: sec.id,
      label: `شعبة (${sec.name}) - ${sec.grade_level_display || "الصف الدراسي"}`,
      subtext: sec.academic_year_display || sec.academic_year?.name || "",
    }));
  }, [availableTargetSections]);

  useEffect(() => {
    if (availableTargetSections.length > 0) {
      setTargetSectionId(availableTargetSections[0].id);
    } else {
      setTargetSectionId("");
    }
    setReason("");
    setGeneralError(null);
    setFieldErrors({});
  }, [enrollment, isOpen, sections]);

  if (!enrollment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!targetSectionId) {
      setGeneralError("يرجى اختيار الشعبة الصحيحة المستهدفة للتصحيح.");
      return;
    }

    if (targetSectionId === currentSectionId) {
      setGeneralError("لا يمكن اختيار نفس الشعبة الحالية.");
      return;
    }

    if (!reason.trim()) {
      setFieldErrors({ reason: "سبب تصحيح الشعبة مطلوب وإجباري لإتمام العملية." });
      setGeneralError("يرجى توضيح سبب تصحيح الشعبة.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCorrectPlacement(enrollment.id, {
        section: targetSectionId,
        reason: reason.trim(),
      });
      onClose();
    } catch (err) {
      const extractedErrors = getFieldErrors(err);
      setFieldErrors(extractedErrors);
      // Display the exact backend error message to user
      const serverMessage = parseApiError(
        err,
        "فشل تصحيح شعبة الطالب. تأكد من عدم وجود سجلات تاريخية (غيابات، درجات، نقل سابق) تمنع التصحيح."
      );
      setGeneralError(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تصحيح الشعبة الدراسية (Enrollment Placement Correction)"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right dir-rtl" dir="rtl">
        {generalError && (
          <Alert type="error" className="whitespace-pre-line text-xs font-medium">
            {generalError}
          </Alert>
        )}

        {/* Business Rules Notice */}
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed space-y-1">
            <p className="font-bold">ضوابط تصحيح الشعبة الدراسية:</p>
            <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
              <li>هذا الإجراء مخصص لمعالجة الخطأ الإدخالي أثناء التسجيل المبدئي فقط.</li>
              <li>يقتصر التصحيح ضمن نفس الصف الدراسي ونفس العام الدراسي.</li>
              <li>
                <strong className="text-amber-950 font-bold">حظر النظام:</strong> يمنع السيرفر التصحيح قطعياً إذا وُجدت سجلات تاريخية للطالب (حضور وغياب، درجات تقييم، أو تاريخ نقل سابق).
              </li>
            </ul>
          </div>
        </div>

        {/* Current Student & Enrollment Summary */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              الطالب:
            </span>
            <span className="font-bold text-slate-800">
              {enrollment.student_display || enrollment.student?.full_name || "طالب"}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              الصف الدراسي والعام:
            </span>
            <span className="font-semibold text-slate-700">
              {enrollment.grade_level_display || enrollment.grade_level?.name || "الصف"}
              {" — "}
              {enrollment.academic_year_display || enrollment.academic_year?.name || "العام الحالي"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              الشعبة الحالية (المسجل بها خطأً):
            </span>
            <span className="font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200 font-mono">
              {enrollment.section_display || enrollment.section?.name || "الشعبة الحالية"}
            </span>
          </div>
        </div>

        {/* Target Section Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            الشعبة الصحيحة المستهدفة <span className="text-rose-500">*</span>
          </label>

          {availableTargetSections.length === 0 ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              لا توجد شعب دراسية أخرى بديلة متاحة لنفس هذا الصف والعام الدراسي لتصحيح القيد إليها.
            </div>
          ) : (
            <SearchableSelect
              options={targetSectionOptions}
              value={targetSectionId}
              onChange={setTargetSectionId}
              placeholder="-- حدد الشعبة الصحيحة --"
              error={fieldErrors.section}
              disabled={isSubmitting}
            />
          )}
        </div>

        {/* Reason for Correction */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
            <span>سبب تصحيح الشعبة <span className="text-rose-500">*</span></span>
            <span className="text-[10px] text-slate-400 font-normal">إجباري للتوثيق والتدقيق</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (fieldErrors.reason) {
                setFieldErrors((prev) => ({ ...prev, reason: undefined }));
              }
            }}
            placeholder="مثال: تسجيل الطالب خطأً في الشعبة أ بدلاً من الشعبة ب أثناء عملية التسجيل المبدئي..."
            disabled={isSubmitting}
            className={`w-full rounded-xl border p-3 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              fieldErrors.reason ? "border-rose-400 bg-rose-50/20" : "border-slate-300 bg-white"
            }`}
          />
          {fieldErrors.reason && (
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">{fieldErrors.reason}</p>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            size="sm"
          >
            إلغاء
          </Button>

          <Button
            type="submit"
            variant="teal"
            size="sm"
            isLoading={isSubmitting}
            disabled={isSubmitting || availableTargetSections.length === 0}
            className="gap-1.5 font-bold"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأكيد تصحيح الشعبة</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
