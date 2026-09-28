import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ArrowLeftRight, School, User, Calendar, BookOpen, AlertCircle } from "lucide-react";
import { getFieldErrors, parseApiError, extractPaginatedList } from "../../utils/errorUtils";
import { SearchableSelect } from "../ui/SearchableSelect";
import { api } from "../../api";
import { toast } from "sonner";

export function TransferModal({
  isOpen,
  onClose,
  onTransfer,
  enrollment = null,
  sections = [],
  onSuccess,
}) {
  const [internalSections, setInternalSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);
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

  const studentName =
    enrollment?.student_display ||
    enrollment?.student?.full_name ||
    (enrollment?.student?.first_name
      ? `${enrollment.student.first_name} ${enrollment.student.last_name || ""}`.trim()
      : typeof enrollment?.student === "string"
      ? enrollment.student
      : "طالب");

  const currentGradeName =
    enrollment?.grade_level_display ||
    enrollment?.grade_level?.name ||
    (typeof enrollment?.grade_level === "string" ? enrollment.grade_level : "-");

  const currentSectionName =
    enrollment?.section_display ||
    enrollment?.section?.name ||
    (typeof enrollment?.section === "string" ? enrollment.section : "-");

  const currentYearName =
    enrollment?.academic_year_display ||
    enrollment?.academic_year?.name ||
    (typeof enrollment?.academic_year === "string" ? enrollment.academic_year : "-");

  // Fetch sections if not passed in props
  const fetchSections = useCallback(async () => {
    if (sections && sections.length > 0) {
      setInternalSections(sections);
      return;
    }
    if (!isOpen) return;
    setLoadingSections(true);
    try {
      const res = await api.academics.getSections({ page_size: 1000 });
      const { results } = extractPaginatedList(res);
      setInternalSections(results || []);
    } catch (err) {
      console.error("Failed to load sections for transfer:", err);
    } finally {
      setLoadingSections(false);
    }
  }, [sections, isOpen]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const allSections = sections && sections.length > 0 ? sections : internalSections;

  // Filter sections strictly to the same academic year and grade level, excluding current section
  const availableTargetSections = useMemo(() => {
    return allSections.filter((sec) => {
      if (String(sec.id) === String(currentSectionId)) return false;

      const secYearId =
        typeof sec.academic_year === "object"
          ? sec.academic_year?.id
          : sec.academic_year;
      const secGradeId =
        typeof sec.grade_level === "object"
          ? sec.grade_level?.id
          : sec.grade_level;

      // Must match year and grade if present on section
      if (currentYearId && secYearId && String(secYearId) !== String(currentYearId)) {
        return false;
      }
      if (currentGradeId && secGradeId && String(secGradeId) !== String(currentGradeId)) {
        return false;
      }

      return true;
    });
  }, [allSections, currentSectionId, currentYearId, currentGradeId]);

  const targetSectionOptions = useMemo(() => {
    return availableTargetSections.map((sec) => ({
      value: sec.id,
      label: `شعبة (${sec.name}) - ${sec.grade_level_display || currentGradeName}`,
      subtext: sec.academic_year_display || sec.academic_year?.name || currentYearName,
    }));
  }, [availableTargetSections, currentGradeName, currentYearName]);

  useEffect(() => {
    if (availableTargetSections.length > 0) {
      setTargetSectionId(availableTargetSections[0].id);
    } else {
      setTargetSectionId("");
    }
    setGeneralError(null);
    setFieldErrors({});
  }, [enrollment, isOpen, availableTargetSections.length]);

  if (!enrollment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!targetSectionId) {
      setGeneralError("يرجى اختيار الشعبة المستهدفة للنقل.");
      return;
    }

    if (String(targetSectionId) === String(currentSectionId)) {
      setGeneralError("لا يمكن نقل الطالب إلى نفس الشعبة الحالية.");
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (onTransfer) {
        res = await onTransfer(enrollment.id, targetSectionId);
      } else {
        res = await api.students.transferEnrollment(enrollment.id, targetSectionId);
        toast.success(res?.message || "تم نقل الطالب إلى الشعبة الجديدة بنجاح.");
      }
      onClose();
      if (onSuccess) {
        onSuccess(res);
      }
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
        {/* Info Card (عرض فقط) */}
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              الطالب:
            </span>
            <span className="font-bold text-slate-800 text-xs">
              {studentName}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80">
              <span className="text-slate-500 font-medium">الصف الحالي:</span>
              <strong className="text-slate-900">{currentGradeName}</strong>
            </div>

            <div className="flex items-center justify-between bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200/80 text-amber-800">
              <span className="font-medium">الشعبة الحالية:</span>
              <strong className="font-bold">{currentSectionName}</strong>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>السنة الدراسية: {currentYearName}</span>
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="bg-blue-50/80 border border-blue-200/90 rounded-xl p-3 text-xs leading-relaxed flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-blue-900">
            <p className="font-bold">هل أنت متأكد من نقل الطالب إلى الشعبة المحددة؟</p>
            <p className="text-[11px] text-blue-700">سيتم تسجيل العملية كحركة نقل رسمية.</p>
          </div>
        </div>

        {generalError && <Alert type="error">{generalError}</Alert>}

        {/* Target Section Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            الشعبة الجديدة <span className="text-rose-500">*</span>
          </label>
          {loadingSections ? (
            <div className="p-3 bg-slate-50 text-slate-500 text-xs rounded-xl border border-slate-200 text-center">
              جاري تحميل الشعب المتاحة...
            </div>
          ) : availableTargetSections.length === 0 ? (
            <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>لا توجد شعب أخرى متاحة في نفس العام والصف الدراسي لنقل الطالب إليها.</span>
            </div>
          ) : (
            <SearchableSelect
              options={targetSectionOptions}
              value={targetSectionId}
              onChange={(val) => {
                setTargetSectionId(val);
                setFieldErrors({});
              }}
              placeholder="-- اختر الشعبة الجديدة --"
              searchPlaceholder="اكتب اسم الشعبة للبحث..."
              emptyMessage="لا توجد شعب مطابقة للبحث"
              noOptionsMessage="-- لا توجد شعب متاحة لهذا الصف --"
              inputClassName={
                fieldErrors.section
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-slate-300 focus:ring-teal-500"
              }
            />
          )}
          {fieldErrors.section && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.section}</p>
          )}
        </div>

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
            disabled={isSubmitting || availableTargetSections.length === 0 || loadingSections}
            className="gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "جاري النقل..." : "تأكيد النقل"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
