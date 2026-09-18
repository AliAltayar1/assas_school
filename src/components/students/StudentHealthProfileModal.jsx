import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { api } from "../../api";
import { getFieldErrors, parseApiError, getApiSuccessMessage } from "../../utils/errorUtils";
import { toast } from "sonner";
import { HeartPulse, Phone, User, Activity, AlertCircle } from "lucide-react";

export function StudentHealthProfileModal({ isOpen, onClose, student }) {
  const [formData, setFormData] = useState({
    blood_type: "",
    chronic_diseases: "",
    allergies: "",
    permanent_medications: "",
    special_health_needs: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    health_notes: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Fetch health profile when student changes or modal opens
  useEffect(() => {
    if (isOpen && student?.id) {
      const fetchProfile = async () => {
        setIsLoading(true);
        setGeneralError(null);
        setFieldErrors({});
        try {
          const res = await api.students.getHealthProfile(student.id);
          const data = res.data || res;
          setFormData({
            blood_type: data.blood_type || "",
            chronic_diseases: data.chronic_diseases || "",
            allergies: data.allergies || "",
            permanent_medications: data.permanent_medications || "",
            special_health_needs: data.special_health_needs || "",
            emergency_contact_name: data.emergency_contact_name || "",
            emergency_contact_phone: data.emergency_contact_phone || "",
            health_notes: data.health_notes || "",
          });
        } catch (err) {
          // If 404 or empty, backend may not have created it or returning error
          setGeneralError(parseApiError(err, "تعذر تحميل بيانات الملف الصحي للطالب."));
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfile();
    }
  }, [isOpen, student?.id]);

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

    setIsSubmitting(true);
    try {
      // Send PATCH request with updated fields
      const res = await api.students.updateHealthProfile(student.id, formData);
      toast.success(getApiSuccessMessage(res, "تم تحديث الملف الصحي للطالب بنجاح."));
      onClose();
    } catch (err) {
      const extracted = getFieldErrors(err);
      setFieldErrors(extracted);
      setGeneralError(parseApiError(err, "تعذر حفظ تعديلات الملف الصحي. يرجى مراجعة الحقول."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!student) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={`الملف الصحي للطالب: ${student.full_name || student.first_name}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right dir-rtl" dir="rtl">
        {generalError && <Alert type="error">{generalError}</Alert>}

        {isLoading ? (
          <div className="p-8 text-center text-slate-500 space-y-2">
            <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs">جاري جلب الملف الصحي من السيرفر...</p>
          </div>
        ) : (
          <>
            {/* Header info banner */}
            <div className="bg-teal-50/70 border border-teal-100 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-teal-600" />
                <span className="font-bold text-teal-900">
                  سجل الحالة الصحية والإسعافات الأولية
                </span>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">
                معرف الطالب: {student.id?.slice(0, 8)}...
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Blood Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  زمرة الدم (Blood Type)
                </label>
                <select
                  name="blood_type"
                  value={formData.blood_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- غير محدد --</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
                {fieldErrors.blood_type && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.blood_type}</p>
                )}
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الحساسية (أطعمة، أدوية، حشرات...)
                </label>
                <input
                  type="text"
                  name="allergies"
                  placeholder="مثال: حساسية موسمية، حساسية حليب..."
                  value={formData.allergies}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {fieldErrors.allergies && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.allergies}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Chronic Diseases */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الأمراض المزمنة
                </label>
                <input
                  type="text"
                  name="chronic_diseases"
                  placeholder="مثال: ربو، صرع، سكري..."
                  value={formData.chronic_diseases}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {fieldErrors.chronic_diseases && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.chronic_diseases}</p>
                )}
              </div>

              {/* Permanent Medications */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الأدوية الدائمة
                </label>
                <input
                  type="text"
                  name="permanent_medications"
                  placeholder="مثال: بخاخ سالبوتامول..."
                  value={formData.permanent_medications}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {fieldErrors.permanent_medications && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {fieldErrors.permanent_medications}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Emergency Contact Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم جهة اتصال الطوارئ
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    name="emergency_contact_name"
                    placeholder="مثال: ماهر اختبار"
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                    className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {fieldErrors.emergency_contact_name && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {fieldErrors.emergency_contact_name}
                  </p>
                )}
              </div>

              {/* Emergency Contact Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  هاتف جهة اتصال الطوارئ
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    name="emergency_contact_phone"
                    placeholder="مثال: 0944000000"
                    value={formData.emergency_contact_phone}
                    onChange={handleChange}
                    className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {fieldErrors.emergency_contact_phone && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {fieldErrors.emergency_contact_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Special Health Needs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                احتياجات صحية خاصة (Special Health Needs)
              </label>
              <textarea
                rows={2}
                name="special_health_needs"
                placeholder="مثال: صعوبات في الرؤية أو السمع، مقعد قريب من السبورة..."
                value={formData.special_health_needs}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
              {fieldErrors.special_health_needs && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {fieldErrors.special_health_needs}
                </p>
              )}
            </div>

            {/* Health Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات وتوصيات طبية إضافية
              </label>
              <textarea
                rows={2}
                name="health_notes"
                placeholder="أي توجيهات إضافية لإدارة المدرسة أو الكادر التعليمي..."
                value={formData.health_notes}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
              {fieldErrors.health_notes && (
                <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.health_notes}</p>
              )}
            </div>
          </>
        )}

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
            disabled={isSubmitting || isLoading}
            className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold"
          >
            <Activity className="w-4 h-4" />
            <span>{isSubmitting ? "جاري الحفظ..." : "حفظ التعديلات الصحية"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
