import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ArrowLeftRight, School, User, Calendar, BookOpen, AlertCircle } from "lucide-react";
import { getFieldErrors, parseApiError } from "../../utils/errorUtils";

export function TransferModal({
  isOpen,
  onClose,
  onTransfer,
  enrollment = null,
  sections = [],
}) {
  const [targetSectionId, setTargetSectionId] = useState("");
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

  useEffect(() => {
    if (availableTargetSections.length > 0) {
      setTargetSectionId(availableTargetSections[0].id);
    } else {
      setTargetSectionId("");
    }
    setGeneralError(null);
    setFieldErrors({});
  }, [enrollment, isOpen, sections]);

  if (!enrollment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!targetSectionId) {
      setGeneralError("يرجى اختيار الشعبة المستهدفة للنقل.");
      return;
    }

    if (targetSectionId === currentSectionId) {
      setGeneralError("لا يمكن نقل الطالب إلى نفس الشعبة الحالية.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onTransfer(enrollment.id, targetSectionId);
      onClose();
    } catch (err) {
      const extractedErrors = getFieldErrors(err);
      setFieldErrors(extractedErrors);
      setGeneralError(
        parseApiError(err, "فشل تنفيذ عملية نقل الطالب. يرجى مراجعة الشعبة المختارة.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="نقل الطالب إلى شعبة أخرى"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right dir-rtl" dir="rtl">
        {/* Info Card */}
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
            <User className="w-4 h-4 text-teal-600" />
            <span>
              الطالب: {enrollment.student_display || enrollment.student?.full_name || enrollment.student}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                العام: {enrollment.academic_year_display || enrollment.academic_year?.name || "-"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>
                الصف: {enrollment.grade_level_display || enrollment.grade_level?.name || "-"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200/80">
            <School className="w-3.5 h-3.5" />
            <span>
              الشعبة الحالية:{" "}
              <strong>
                {enrollment.section_display || enrollment.section?.name || enrollment.section}
              </strong>
            </span>
          </div>
        </div>

        {generalError && <Alert type="error">{generalError}</Alert>}

        {/* Target Section Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            الشعبة الجديدة المستهدفة (نفس العام والصف الدراسي) <span className="text-rose-500">*</span>
          </label>
          {availableTargetSections.length === 0 ? (
            <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>لا توجد شعب أخرى متاحة في نفس العام والصف الدراسي لنقل الطالب إليها.</span>
            </div>
          ) : (
            <select
              required
              value={targetSectionId}
              onChange={(e) => {
                setTargetSectionId(e.target.value);
                setFieldErrors({});
              }}
              className={`w-full px-3 py-2.5 bg-white border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 ${
                fieldErrors.section
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-slate-300 focus:ring-teal-500"
              }`}
            >
              <option value="">-- اختر الشعبة الجديدة --</option>
              {availableTargetSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  شعبة ({sec.name}) - {sec.grade_level_display || "الصف الدراسي"}
                </option>
              ))}
            </select>
          )}
          {fieldErrors.section && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.section}</p>
          )}
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          * سيتم نقل سجل تسجيل الطالب وتحديث الشعبة الدراسية الخاصة به تلقائياً في سجلات المدرسة والـAudit Log.
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
            disabled={isSubmitting || availableTargetSections.length === 0}
            className="gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "جاري النقل..." : "تأكيد نقل الطالب"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
