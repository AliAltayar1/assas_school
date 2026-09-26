import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { SearchableSelect } from "../ui/SearchableSelect";
import { behaviorService } from "../../api/behaviorService";
import { parseApiError } from "../../utils/errorUtils";
import { toast } from "sonner";
import { Award, Plus, Sparkles, Calendar, Edit2, CheckCircle2 } from "lucide-react";

/**
 * Modal to Add or Edit Student Positive Points
 * Adheres strictly to the Backend contract:
 * - points: 1 to 100
 * - note: required, non-empty
 * - occurred_on: YYYY-MM-DD
 * - enrollment: ENROLLMENT_UUID (sent only on create)
 * - student and created_by are NOT sent
 */
export function StudentPointModal({
  isOpen,
  onClose,
  onSuccess,
  pointRecord = null,
  enrollmentId = "",
  studentName = "",
  enrollmentOptions = [],
}) {
  const isEdit = Boolean(pointRecord?.id);

  const [selectedEnrollment, setSelectedEnrollment] = useState(enrollmentId || "");
  const [points, setPoints] = useState(10);
  const [note, setNote] = useState("");
  const [occurredOn, setOccurredOn] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync state with pointRecord or enrollmentId when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (pointRecord) {
        setPoints(pointRecord.points || 10);
        setNote(pointRecord.note || "");
        setOccurredOn(
          pointRecord.occurred_on || new Date().toISOString().split("T")[0]
        );
        setSelectedEnrollment(pointRecord.enrollment || enrollmentId || "");
      } else {
        setPoints(10);
        setNote("");
        setOccurredOn(new Date().toISOString().split("T")[0]);
        setSelectedEnrollment(enrollmentId || "");
      }
    }
  }, [isOpen, pointRecord, enrollmentId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const numPoints = parseInt(points, 10);
    if (isNaN(numPoints) || numPoints < 1 || numPoints > 100) {
      setError("عدد النقاط يجب أن يكون رقمًا صحيحًا بين 1 و 100.");
      return;
    }

    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setError("سبب منح النقاط إلزامي ولا يمكن تركه فارغًا.");
      return;
    }

    if (!occurredOn) {
      setError("يرجى تحديد تاريخ منح النقاط.");
      return;
    }

    const targetEnrollment = selectedEnrollment || enrollmentId;
    if (!isEdit && !targetEnrollment) {
      setError("يرجى اختيار القيد المدرسي للطالب.");
      return;
    }

    setIsLoading(true);
    try {
      if (isEdit) {
        // PATCH only points, note, occurred_on
        const patchData = {
          points: numPoints,
          note: trimmedNote,
          occurred_on: occurredOn,
        };
        const res = await behaviorService.updatePoint(pointRecord.id, patchData);
        toast.success(res?.message || "تم تعديل سجل النقاط بنجاح.");
        onSuccess?.(res?.data || res);
      } else {
        // POST with enrollment, points, note, occurred_on
        const postData = {
          enrollment: targetEnrollment,
          points: numPoints,
          note: trimmedNote,
          occurred_on: occurredOn,
        };
        const res = await behaviorService.createPoint(postData);
        toast.success(res?.message || "تمت إضافة نقاط الطالب بنجاح.");
        onSuccess?.(res?.data || res);
      }
      onClose();
    } catch (err) {
      const parsedMsg = parseApiError(err);
      setError(parsedMsg || "حدث خطأ أثناء حفظ نقاط الطالب.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick points increment chips
  const quickPoints = [5, 10, 15, 20, 25, 50];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "تعديل نقاط الطالب" : "إضافة نقاط تحفيزية للطالب"}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right dir-rtl" dir="rtl">
        {error && (
          <Alert type="error" title="تنبيه">
            {error}
          </Alert>
        )}

        {/* Display student info if available */}
        {(studentName || isEdit) && (
          <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-teal-600 shrink-0" />
              <div>
                <p className="text-xs text-teal-900 font-bold">
                  {studentName ||
                    pointRecord?.student?.full_name ||
                    pointRecord?.student_name ||
                    "الطالب المستفيد"}
                </p>
                <p className="text-[11px] text-teal-700">
                  {isEdit
                    ? `تعديل السجل الحالي (#${pointRecord.id.slice(0, 8)})`
                    : "منح نقاط تحفيزية للسنة الدراسية الحالية"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enrollment Selection (only if not pre-set and creating) */}
        {!enrollmentId && !isEdit && enrollmentOptions.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              اختر الطالب / القيد المدرسي <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              options={enrollmentOptions}
              value={selectedEnrollment}
              onChange={setSelectedEnrollment}
              placeholder="ابحث عن اسم الطالب أو الشعبة..."
            />
            <p className="text-[10px] text-slate-400">
              ترتبط النقاط بقيد الطالب في السنة الدراسية الحالية
            </p>
          </div>
        )}

        {/* Points Field & Quick Chips */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            عدد النقاط (1 - 100) <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              required
              className="w-28 px-3 py-2 bg-white border border-slate-300 rounded-xl text-center font-black text-lg text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-xs font-bold text-slate-500">نقطة إيجابية</span>
          </div>

          {/* Quick Select Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-slate-400 ml-1">خيارات سريعة:</span>
            {quickPoints.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setPoints(val)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  parseInt(points, 10) === val
                    ? "bg-teal-700 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                +{val}
              </button>
            ))}
          </div>
        </div>

        {/* Note / Reason Field */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">
            سبب منح النقاط <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
            placeholder="مثال: تميز في المشاركة الصفية، إنجاز نشاط متميز، سلوك تعاوني..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400"
          />
        </div>

        {/* Date Field */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">
            تاريخ منح النقاط <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            required
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading ? (
              <span>جاري الحفظ...</span>
            ) : isEdit ? (
              <>
                <Edit2 className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>إضافة النقاط</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
