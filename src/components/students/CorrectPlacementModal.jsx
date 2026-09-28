import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { AlertTriangle, Layers, BookOpen, User, Calendar, CheckCircle2 } from "lucide-react";
import { getFieldErrors, parseApiError, getApiErrorCode, extractPaginatedList } from "../../utils/errorUtils";
import { SearchableSelect } from "../ui/SearchableSelect";
import { api } from "../../api";
import { toast } from "sonner";

const SPECIFIC_ERROR_MESSAGES = {
  STUDENT_ALREADY_IN_SECTION: "الطالب مسجل بالفعل في الشعبة المحددة.",
  SECTION_ACADEMIC_YEAR_MISMATCH: "يجب اختيار صف وشعبة من السنة الدراسية نفسها.",
  PLACEMENT_CORRECTION_BLOCKED_BY_ATTENDANCE: "لا يمكن تصحيح صف الطالب لوجود سجلات حضور مرتبطة بتسجيله.",
  PLACEMENT_CORRECTION_BLOCKED_BY_GRADES: "لا يمكن تصحيح صف الطالب لوجود علامات مرتبطة بتسجيله.",
  PLACEMENT_CORRECTION_BLOCKED_BY_TRANSFER: "لا يمكن تصحيح التسجيل لوجود عملية نقل سابقة للطالب.",
  ENROLLMENT_CORRECTION_HAS_PAYMENTS: "لا يمكن تغيير صف الطالب بعد تسجيل دفعات مالية.",
  TARGET_GRADE_TUITION_PLAN_NOT_FOUND: "لا يمكن تغيير صف الطالب لعدم وجود خطة أقساط للصف المستهدف.",
  PLACEMENT_CORRECTION_REASON_REQUIRED: "سبب التصحيح إلزامي ولا يقبل نصاً فارغاً.",
};

export function CorrectPlacementModal({
  isOpen,
  onClose,
  onCorrectPlacement,
  enrollment = null,
  sections = [],
  gradeLevels = [],
  onSuccess,
}) {
  const [internalSections, setInternalSections] = useState([]);
  const [internalGradeLevels, setInternalGradeLevels] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedGradeId, setSelectedGradeId] = useState("");
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

  // Load sections and grade levels if not passed via props
  const fetchMetadata = useCallback(async () => {
    if (!isOpen) return;

    const needSections = !sections || sections.length === 0;
    const needGrades = !gradeLevels || gradeLevels.length === 0;

    if (!needSections && !needGrades) {
      setInternalSections(sections);
      setInternalGradeLevels(gradeLevels);
      return;
    }

    setLoadingData(true);
    try {
      const promises = [];
      if (needSections) promises.push(api.academics.getSections({ page_size: 1000 }));
      if (needGrades) promises.push(api.academics.getGradeLevels({ page_size: 100 }));

      const results = await Promise.all(promises);
      let idx = 0;
      if (needSections) {
        const { results: secList } = extractPaginatedList(results[idx++]);
        setInternalSections(secList || []);
      } else {
        setInternalSections(sections);
      }
      if (needGrades) {
        const { results: grList } = extractPaginatedList(results[idx++]);
        setInternalGradeLevels(grList || []);
      } else {
        setInternalGradeLevels(gradeLevels);
      }
    } catch (err) {
      console.error("Failed to load academic metadata for placement correction:", err);
    } finally {
      setLoadingData(false);
    }
  }, [sections, gradeLevels, isOpen]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  const allSections = sections && sections.length > 0 ? sections : internalSections;
  const allGrades = gradeLevels && gradeLevels.length > 0 ? gradeLevels : internalGradeLevels;

  // Derive consolidated grade levels
  const availableGradeOptions = useMemo(() => {
    const map = new Map();
    // From grades list
    (allGrades || []).forEach((g) => {
      if (g && g.id) {
        map.set(String(g.id), {
          value: g.id,
          label: g.name || `الصف ${g.order || ""}`,
          order: g.order ?? 999,
        });
      }
    });
    // From sections list if any grades missing
    (allSections || []).forEach((sec) => {
      const gId = typeof sec.grade_level === "object" ? sec.grade_level?.id : sec.grade_level;
      const gName = sec.grade_level_display || sec.grade_level?.name;
      if (gId && !map.has(String(gId)) && gName) {
        map.set(String(gId), {
          value: gId,
          label: gName,
          order: 999,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [allGrades, allSections]);

  // Reset state when modal opens or enrollment changes
  useEffect(() => {
    if (isOpen && enrollment) {
      // Default selected grade to current grade so user can choose another or stay on same grade
      const initialGrade = currentGradeId ? String(currentGradeId) : "";
      setSelectedGradeId(initialGrade);
      setTargetSectionId("");
      setReason("");
      setGeneralError(null);
      setFieldErrors({});
    }
  }, [isOpen, enrollment, currentGradeId]);

  // Filter sections strictly to the selected target grade and student's academic year
  const availableTargetSections = useMemo(() => {
    if (!selectedGradeId) return [];

    return allSections.filter((sec) => {
      const secYearId =
        typeof sec.academic_year === "object"
          ? sec.academic_year?.id
          : sec.academic_year;
      const secGradeId =
        typeof sec.grade_level === "object"
          ? sec.grade_level?.id
          : sec.grade_level;

      // Must match academic year of enrollment if available
      if (currentYearId && secYearId && String(secYearId) !== String(currentYearId)) {
        return false;
      }

      // Must match selected grade level
      if (String(secGradeId) !== String(selectedGradeId)) {
        return false;
      }

      // If the selected grade is the student's current grade, exclude current section
      if (
        String(selectedGradeId) === String(currentGradeId) &&
        String(sec.id) === String(currentSectionId)
      ) {
        return false;
      }

      return true;
    });
  }, [allSections, selectedGradeId, currentYearId, currentGradeId, currentSectionId]);

  const targetSectionOptions = useMemo(() => {
    return availableTargetSections.map((sec) => ({
      value: sec.id,
      label: `شعبة (${sec.name}) - ${sec.grade_level_display || ""}`,
      subtext: sec.academic_year_display || sec.academic_year?.name || currentYearName,
    }));
  }, [availableTargetSections, currentYearName]);

  // When grade selection changes, reset section
  const handleGradeChange = (newGradeId) => {
    setSelectedGradeId(newGradeId);
    setTargetSectionId("");
    if (fieldErrors.grade_level) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.grade_level;
        return next;
      });
    }
    if (fieldErrors.section) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.section;
        return next;
      });
    }
  };

  if (!enrollment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const errors = {};
    if (!selectedGradeId) {
      errors.grade_level = "يرجى اختيار الصف الدراسي الجديد.";
    }
    if (!targetSectionId) {
      errors.section = "يرجى اختيار الشعبة الدراسية الصحيحة.";
    }
    if (!reason || !reason.trim()) {
      errors.reason = "سبب التصحيح إلزامي ولا يقبل نصاً فارغاً.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (String(targetSectionId) === String(currentSectionId)) {
      setGeneralError("الطالب مسجل بالفعل في الشعبة المحددة.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        section: targetSectionId,
        reason: reason.trim(),
      };

      let res;
      if (onCorrectPlacement) {
        res = await onCorrectPlacement(enrollment.id, payload);
      } else {
        res = await api.students.correctPlacement(enrollment.id, payload);
        toast.success(res?.message || "تم تصحيح شعبة تسجيل الطالب بنجاح.");
      }

      onClose();
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      const errorCode = getApiErrorCode(err);
      const extractedErrors = getFieldErrors(err);

      // Handle reason validation error
      if (errorCode === "PLACEMENT_CORRECTION_REASON_REQUIRED" || extractedErrors.reason) {
        extractedErrors.reason =
          SPECIFIC_ERROR_MESSAGES.PLACEMENT_CORRECTION_REASON_REQUIRED ||
          extractedErrors.reason;
      }

      setFieldErrors(extractedErrors);

      // Map specific error codes as requested
      if (errorCode && SPECIFIC_ERROR_MESSAGES[errorCode]) {
        setGeneralError(SPECIFIC_ERROR_MESSAGES[errorCode]);
      } else {
        const serverMessage = parseApiError(
          err,
          "فشل تصحيح صف وشعبة الطالب. يرجى مراجعة البيانات المدخلة."
        );
        setGeneralError(serverMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title="تصحيح صف وشعبة الطالب"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right dir-rtl" dir="rtl">
        {/* Warning Notice */}
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 space-y-1.5 text-xs leading-relaxed text-amber-900">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>تنبيه هام حول تصحيح التسجيل:</span>
          </div>
          <p className="text-[11px] text-amber-800">
            هذه العملية مخصصة لتصحيح خطأ في تسجيل الطالب، وليست لنقل الطالب الاعتيادي بين الشعب.
          </p>
          <p className="text-[11px] text-amber-800 font-medium">
            قد يؤدي تغيير الصف إلى تحديث خطة الأقساط المرتبطة بحساب الطالب.
          </p>
        </div>

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

            <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80">
              <span className="text-slate-500 font-medium">الشعبة الحالية:</span>
              <strong className="font-bold text-amber-800">{currentSectionName}</strong>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>السنة الدراسية: {currentYearName}</span>
          </div>
        </div>

        {generalError && (
          <Alert type="error" className="whitespace-pre-line text-xs font-medium">
            {generalError}
          </Alert>
        )}

        {/* Step 1: Select Target Grade */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            الصف الجديد <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            options={availableGradeOptions}
            value={selectedGradeId}
            onChange={handleGradeChange}
            placeholder="-- اختر الصف الدراسي الجديد --"
            searchPlaceholder="اكتب اسم الصف للبحث..."
            emptyMessage="لا يوجد صف مطابق للبحث"
            noOptionsMessage="لا توجد صفوف دراسية معرفة"
            disabled={isSubmitting || loadingData}
            inputClassName={
              fieldErrors.grade_level
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:ring-teal-500"
            }
          />
          {fieldErrors.grade_level && (
            <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.grade_level}</p>
          )}
        </div>

        {/* Step 2: Select Target Section */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            الشعبة الجديدة <span className="text-rose-500">*</span>
          </label>
          {!selectedGradeId ? (
            <div className="p-3 bg-slate-50 text-slate-400 text-xs rounded-xl border border-dashed border-slate-200 text-center">
              يرجى اختيار الصف الدراسي أولاً لعرض الشعب المتاحة التابعة له.
            </div>
          ) : availableTargetSections.length === 0 ? (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
              لا توجد شعب دراسية متاحة لهذا الصف في السنة الدراسية الحالية ({currentYearName}).
            </div>
          ) : (
            <SearchableSelect
              options={targetSectionOptions}
              value={targetSectionId}
              onChange={(val) => {
                setTargetSectionId(val);
                if (fieldErrors.section) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.section;
                    return next;
                  });
                }
              }}
              placeholder="-- اختر الشعبة الجديدة --"
              searchPlaceholder="اكتب اسم الشعبة للبحث..."
              emptyMessage="لا توجد شعب مطابقة للبحث"
              disabled={isSubmitting}
              inputClassName={
                fieldErrors.section
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-slate-300 focus:ring-teal-500"
              }
            />
          )}
          {fieldErrors.section && (
            <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.section}</p>
          )}
        </div>

        {/* Step 3: Reason for Correction */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
            <span>
              سبب التصحيح <span className="text-rose-500">*</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">إلزامي للتوثيق والتدقيق</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (fieldErrors.reason) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.reason;
                  return next;
                });
              }
            }}
            placeholder="مثال: تم تسجيل الطالب في الصف الخامس بدل الصف السادس خطأً أثناء التسجيل المبدئي..."
            disabled={isSubmitting}
            className={`w-full rounded-xl border p-3 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
              fieldErrors.reason ? "border-rose-400 bg-rose-50/20" : "border-slate-300 bg-white"
            }`}
          />
          {fieldErrors.reason && (
            <p className="text-[11px] text-rose-600 font-medium mt-1">{fieldErrors.reason}</p>
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
            variant="teal"
            size="sm"
            isLoading={isSubmitting}
            disabled={isSubmitting || !selectedGradeId || availableTargetSections.length === 0}
            className="gap-1.5 font-bold"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأكيد تصحيح الصف والشعبة</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
