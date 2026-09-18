import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { api } from "../../api";
import { getFieldErrors, parseApiError } from "../../utils/errorUtils";
import { toast } from "sonner";
import {
  User,
  ShieldCheck,
  HeartPulse,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  School,
  AlertTriangle,
  UserPlus,
  Phone,
  CreditCard,
  CheckCircle2,
} from "lucide-react";

export function StudentRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  onProceedToEnrollment,
}) {
  // 1. Student State
  const [studentData, setStudentData] = useState({
    first_name: "",
    last_name: "",
    first_name_en: "",
    last_name_en: "",
    father_name: "",
    mother_name: "",
    birth_date: "",
    gender: "male",
  });

  // 2. Guardian State
  const [includeGuardian, setIncludeGuardian] = useState(true);
  const [guardianData, setGuardianData] = useState({
    national_id: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    relationship: "أب",
  });

  // 3. Health Profile State
  const [showHealthSection, setShowHealthSection] = useState(false);
  const [healthData, setHealthData] = useState({
    blood_type: "",
    chronic_diseases: "",
    allergies: "",
    permanent_medications: "",
    special_health_needs: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    health_notes: "",
  });

  // Flow & Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Success Result State
  const [registrationResult, setRegistrationResult] = useState(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStudentData({
        first_name: "",
        last_name: "",
        first_name_en: "",
        last_name_en: "",
        father_name: "",
        mother_name: "",
        birth_date: "",
        gender: "male",
      });
      setIncludeGuardian(true);
      setGuardianData({
        national_id: "",
        first_name: "",
        last_name: "",
        phone_number: "",
        relationship: "أب",
      });
      setShowHealthSection(false);
      setHealthData({
        blood_type: "",
        chronic_diseases: "",
        allergies: "",
        permanent_medications: "",
        special_health_needs: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        health_notes: "",
      });
      setGeneralError(null);
      setFieldErrors({});
      setRegistrationResult(null);
      setCopiedCredentials(false);
    }
  }, [isOpen]);

  const handleStudentChange = (e) => {
    const { name, value } = e.target;
    setStudentData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name, `student.${name}`);
  };

  const handleGuardianChange = (e) => {
    const { name, value } = e.target;
    setGuardianData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name, `guardian.${name}`);
  };

  const handleHealthChange = (e) => {
    const { name, value } = e.target;
    setHealthData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name, `health_profile.${name}`);
  };

  const clearFieldError = (key1, key2) => {
    setFieldErrors((prev) => {
      if (!prev[key1] && !prev[key2]) return prev;
      const next = { ...prev };
      delete next[key1];
      delete next[key2];
      return next;
    });
  };

  const handleCopyCredentials = (username, tempPassword) => {
    const textToCopy = `بيانات حساب ولي الأمر:\nاسم المستخدم: ${username}\nكلمة المرور المؤقتة: ${tempPassword}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedCredentials(true);
      toast.success("تم نسخ بيانات حساب ولي الأمر إلى الحافظة");
      setTimeout(() => setCopiedCredentials(false), 3000);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Basic Client Validations
    if (!studentData.first_name.trim() || !studentData.last_name.trim()) {
      setGeneralError("يرجى إدخال الاسم الأول واسم العائلة للطالب.");
      return;
    }
    if (!studentData.birth_date) {
      setGeneralError("يرجى تحديد تاريخ ميلاد الطالب.");
      return;
    }

    if (includeGuardian) {
      if (!guardianData.national_id.trim()) {
        setGeneralError("يرجى إدخال الرقم الوطني لولي الأمر.");
        return;
      }
      if (!guardianData.first_name.trim() || !guardianData.last_name.trim()) {
        setGeneralError("يرجى إدخال الاسم الأول واسم العائلة لولي الأمر.");
        return;
      }
      if (!guardianData.relationship.trim()) {
        setGeneralError("يرجى تحديد صلة القرابة لولي الأمر.");
        return;
      }
    }

    // Build payload strictly adhering to the backend specification
    const payload = {
      student: {
        first_name: studentData.first_name.trim(),
        last_name: studentData.last_name.trim(),
        birth_date: studentData.birth_date,
        gender: studentData.gender,
      },
    };

    if (studentData.first_name_en.trim()) {
      payload.student.first_name_en = studentData.first_name_en.trim();
    }
    if (studentData.last_name_en.trim()) {
      payload.student.last_name_en = studentData.last_name_en.trim();
    }
    if (studentData.father_name.trim()) {
      payload.student.father_name = studentData.father_name.trim();
    }
    if (studentData.mother_name.trim()) {
      payload.student.mother_name = studentData.mother_name.trim();
    }

    // Guardian Object (Optional)
    if (includeGuardian) {
      payload.guardian = {
        national_id: guardianData.national_id.trim(), // Kept as string, preserving leading zeroes
        first_name: guardianData.first_name.trim(),
        last_name: guardianData.last_name.trim(),
        relationship: guardianData.relationship.trim(),
      };
      if (guardianData.phone_number.trim()) {
        payload.guardian.phone_number = guardianData.phone_number.trim(); // Kept as string
      }
    }

    // Health Profile Object (Optional - send if any field is populated)
    const hasHealthData = Object.values(healthData).some((val) => val && val.trim());
    if (hasHealthData) {
      payload.health_profile = { ...healthData };
    }

    setIsSubmitting(true);
    try {
      const res = await api.students.registerStudent(payload);
      const studentObj = res.data?.student || res.student || {};
      const guardianAccount = res.data?.guardian_account || res.guardian_account || {
        status: includeGuardian ? "created" : "not_created",
      };

      toast.success(res.message || "تم تسجيل الطالب بنجاح في النظام.");

      setRegistrationResult({
        student: studentObj,
        guardian_account: guardianAccount,
      });

      if (onSuccess) {
        onSuccess(studentObj);
      }
    } catch (err) {
      const extractedErrors = getFieldErrors(err);
      setFieldErrors(extractedErrors);
      setGeneralError(parseApiError(err, "تعذر إتمام تسجيل الطالب. يرجى مراجعة البيانات المدخلة."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={registrationResult ? "تم تسجيل الطالب بنجاح" : "تسجيل طالب جديد في المدرسة"}
      maxWidth="max-w-3xl"
    >
      {/* SUCCESS RESULT SCREEN */}
      {registrationResult ? (
        <div className="space-y-6 text-right dir-rtl py-2" dir="rtl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              تم تسجيل الطالب ({registrationResult.student?.full_name || registrationResult.student?.first_name}) بنجاح!
            </h3>
            <p className="text-xs text-slate-500">
              تم حفظ سجل الطالب والملف الصحي تلقائياً في قاعدة البيانات.
            </p>
          </div>

          {/* GUARDIAN ACCOUNT STATUS HANDLING */}
          {registrationResult.guardian_account?.status === "created" && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    تم إنشاء حساب جديد لولي الأمر تلقائياً
                  </h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    تم ربط الطالب بحساب ولي الأمر الجديد بالرقم الوطني المدخل.
                  </p>
                </div>
              </div>

              {/* Credentials Box */}
              <div className="bg-white border border-amber-300/80 rounded-xl p-4 shadow-inner space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <span className="text-xs text-slate-500">اسم المستخدم (الرقم الوطني):</span>
                  <span className="font-mono font-bold text-slate-900 text-sm dir-ltr">
                    {registrationResult.guardian_account.username}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">كلمة المرور المؤقتة:</span>
                  <span className="font-mono font-bold text-rose-600 text-base bg-rose-50 px-3 py-1 rounded-lg border border-rose-200 dir-ltr">
                    {registrationResult.guardian_account.temporary_password}
                  </span>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleCopyCredentials(
                        registrationResult.guardian_account.username,
                        registrationResult.guardian_account.temporary_password
                      )
                    }
                    className="gap-2 text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-100/50"
                  >
                    {copiedCredentials ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">تم النسخ بنجاح!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ بيانات الحساب</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Crucial Reminder Note */}
              <div className="flex items-start gap-2 text-amber-800 text-xs bg-amber-100/70 p-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>تنبيه هام جداً:</strong> احفظ أو سلّم بيانات الحساب لولي الأمر الآن، لأن كلمة المرور المؤقتة لن تظهر لاحقاً لأسباب أمنية.
                </p>
              </div>
            </div>
          )}

          {registrationResult.guardian_account?.status === "linked_existing" && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-teal-900">
                  تم ربط الطالب بحساب ولي الأمر الموجود مسبقاً
                </h4>
                <p className="text-xs text-teal-700 mt-1">
                  عُثر على حساب ولي أمر مسجل بالرقم الوطني (
                  <span className="font-mono font-bold">
                    {registrationResult.guardian_account.username}
                  </span>
                  ) وتم ربط الطالب به مباشرة دون تعديل بيانات الحساب أو كلمة المرور القديمة.
                </p>
              </div>
            </div>
          )}

          {registrationResult.guardian_account?.status === "not_created" && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600">
              تم تسجيل الطالب دون ربط حساب ولي أمر في هذه المرحلة. يمكنك ربط ولي أمر في أي وقت لاحقاً من تبويب روابط أولياء الأمور.
            </div>
          )}

          {/* Academic Enrollment Continuation Prompt */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <School className="w-4 h-4 text-teal-600" />
              <span>الخطوة التالية: التسجيل الأكاديمي وتحديد الشعبة</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              تسجيل الطالب لا يربطه بشعبة أو صف دراسي تلقائياً. يرجى المتابعة الآن لتحديد الشعبة والعام الدراسي للطالب لتمكينه من بدء الدوام ورصد العلامات.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              إنهاء والإغلاق
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                const createdStudent = registrationResult.student;
                onClose();
                if (onProceedToEnrollment) {
                  onProceedToEnrollment(createdStudent);
                }
              }}
              className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              <School className="w-4 h-4" />
              <span>متابعة لتحديد الشعبة (Enrollment)</span>
            </Button>
          </div>
        </div>
      ) : (
        /* REGISTRATION FORM */
        <form onSubmit={handleSubmit} className="space-y-6 text-right dir-rtl max-h-[75vh] overflow-y-auto px-1" dir="rtl">
          {generalError && <Alert type="error">{generalError}</Alert>}

          {/* ========================================================= */}
          {/* SECTION 1: STUDENT INFORMATION */}
          {/* ========================================================= */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <User className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-900">
                1. بيانات الطالب الأساسية
              </h3>
            </div>

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
                  placeholder="مثال: رامي"
                  value={studentData.first_name}
                  onChange={handleStudentChange}
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 ${
                    fieldErrors["student.first_name"] || fieldErrors.first_name
                      ? "border-rose-400 focus:ring-rose-400"
                      : "border-slate-300 focus:ring-teal-500"
                  }`}
                />
                {(fieldErrors["student.first_name"] || fieldErrors.first_name) && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {fieldErrors["student.first_name"] || fieldErrors.first_name}
                  </p>
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
                  placeholder="مثال: اختبار"
                  value={studentData.last_name}
                  onChange={handleStudentChange}
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 ${
                    fieldErrors["student.last_name"] || fieldErrors.last_name
                      ? "border-rose-400 focus:ring-rose-400"
                      : "border-slate-300 focus:ring-teal-500"
                  }`}
                />
                {(fieldErrors["student.last_name"] || fieldErrors.last_name) && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {fieldErrors["student.last_name"] || fieldErrors.last_name}
                  </p>
                )}
              </div>
            </div>

            {/* English Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  الاسم الأول (بالإنكليزية)
                  <span className="text-[10px] text-slate-400 font-normal mr-1">(اختياري)</span>
                </label>
                <input
                  type="text"
                  name="first_name_en"
                  placeholder="مثال: Rami"
                  value={studentData.first_name_en}
                  onChange={handleStudentChange}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  الكنية (بالإنكليزية)
                  <span className="text-[10px] text-slate-400 font-normal mr-1">(اختياري)</span>
                </label>
                <input
                  type="text"
                  name="last_name_en"
                  placeholder="مثال: Test"
                  value={studentData.last_name_en}
                  onChange={handleStudentChange}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 dir-ltr text-right"
                />
              </div>
            </div>

            {/* Parents Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم الأب
                </label>
                <input
                  type="text"
                  name="father_name"
                  placeholder="مثال: ماهر"
                  value={studentData.father_name}
                  onChange={handleStudentChange}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اسم الأم
                </label>
                <input
                  type="text"
                  name="mother_name"
                  placeholder="مثال: هند"
                  value={studentData.mother_name}
                  onChange={handleStudentChange}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Birth Date & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ الميلاد <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  name="birth_date"
                  required
                  value={studentData.birth_date}
                  onChange={handleStudentChange}
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 ${
                    fieldErrors["student.birth_date"] || fieldErrors.birth_date
                      ? "border-rose-400 focus:ring-rose-400"
                      : "border-slate-300 focus:ring-teal-500"
                  }`}
                />
                {(fieldErrors["student.birth_date"] || fieldErrors.birth_date) && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {fieldErrors["student.birth_date"] || fieldErrors.birth_date}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الجنس <span className="text-rose-500">*</span>
                </label>
                <select
                  name="gender"
                  value={studentData.gender}
                  onChange={handleStudentChange}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="male">ذكر (Male)</option>
                  <option value="female">أنثى (Female)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 2: GUARDIAN INFORMATION (OPTIONAL TOGGLE) */}
          {/* ========================================================= */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  2. بيانات ولي الأمر
                </h3>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeGuardian}
                  onChange={(e) => setIncludeGuardian(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <span className="text-xs font-bold text-teal-800">
                  إضافة / ربط ولي أمر مع الطالب
                </span>
              </label>
            </div>

            {includeGuardian ? (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 leading-relaxed bg-teal-50/60 p-2.5 rounded-xl border border-teal-100">
                  💡 سيقوم النظام بالبحث عن ولي الأمر بالرقم الوطني تلقائياً؛ فإذا وُجد حسابه سيربط الطالب به، وإذا لم يوجد فسيتم إنشاء حساب ولي أمر جديد وتوليد كلمة مرور مؤقتة دون الحاجة لإنشاء الحساب يدوياً.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* National ID (String, preserved) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الرقم الوطني لولي الأمر <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        name="national_id"
                        required={includeGuardian}
                        placeholder="مثال: 01234567891"
                        value={guardianData.national_id}
                        onChange={handleGuardianChange}
                        className={`w-full pr-8 pl-3 py-2 bg-white border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 ${
                          fieldErrors["guardian.national_id"] || fieldErrors.national_id
                            ? "border-rose-400 focus:ring-rose-400"
                            : "border-slate-300 focus:ring-teal-500"
                        }`}
                      />
                    </div>
                    {(fieldErrors["guardian.national_id"] || fieldErrors.national_id) && (
                      <p className="text-[11px] text-rose-600 mt-1">
                        {fieldErrors["guardian.national_id"] || fieldErrors.national_id}
                      </p>
                    )}
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      صلة القرابة <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="relationship"
                      value={guardianData.relationship}
                      onChange={handleGuardianChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="أب">أب</option>
                      <option value="أم">أم</option>
                      <option value="ولي أمر">ولي أمر</option>
                      <option value="أخ">أخ</option>
                      <option value="أخت">أخت</option>
                      <option value="عم">عم</option>
                      <option value="عمة">عمة</option>
                      <option value="خال">خال</option>
                      <option value="خالة">خالة</option>
                      <option value="جد">جد</option>
                      <option value="جدة">جدة</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Guardian First Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الاسم الأول لولي الأمر <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      required={includeGuardian}
                      placeholder="مثال: ماهر"
                      value={guardianData.first_name}
                      onChange={handleGuardianChange}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 ${
                        fieldErrors["guardian.first_name"]
                          ? "border-rose-400 focus:ring-rose-400"
                          : "border-slate-300 focus:ring-teal-500"
                      }`}
                    />
                    {fieldErrors["guardian.first_name"] && (
                      <p className="text-[11px] text-rose-600 mt-1">
                        {fieldErrors["guardian.first_name"]}
                      </p>
                    )}
                  </div>

                  {/* Guardian Last Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم العائلة (الكنية) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      required={includeGuardian}
                      placeholder="مثال: اختبار"
                      value={guardianData.last_name}
                      onChange={handleGuardianChange}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs focus:outline-none focus:ring-2 ${
                        fieldErrors["guardian.last_name"]
                          ? "border-rose-400 focus:ring-rose-400"
                          : "border-slate-300 focus:ring-teal-500"
                      }`}
                    />
                    {fieldErrors["guardian.last_name"] && (
                      <p className="text-[11px] text-rose-600 mt-1">
                        {fieldErrors["guardian.last_name"]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Guardian Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رقم الهاتف المحمول لولي الأمر
                    <span className="text-[10px] text-slate-400 font-normal mr-1">(اختياري)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      name="phone_number"
                      placeholder="مثال: 0933111222"
                      value={guardianData.phone_number}
                      onChange={handleGuardianChange}
                      className="w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-1">
                تم استبعاد إضافة ولي أمر حالياً. يمكنك تفعيل الخيار أعلاه لربطه مباشرة.
              </p>
            )}
          </div>

          {/* ========================================================= */}
          {/* SECTION 3: HEALTH PROFILE (COLLAPSIBLE / OPTIONAL) */}
          {/* ========================================================= */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowHealthSection((prev) => !prev)}
              className="w-full flex items-center justify-between text-right"
            >
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  3. الملف الصحي للطالب
                </h3>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                  اختياري
                </span>
              </div>
              <div className="text-slate-500 hover:text-slate-800">
                {showHealthSection ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {showHealthSection && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <p className="text-[11px] text-slate-500">
                  يمكن تعبئة البيانات الصحية للطالب الآن أو تعديلها لاحقاً من سجل الطالب.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Blood Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      زمرة الدم
                    </label>
                    <select
                      name="blood_type"
                      value={healthData.blood_type}
                      onChange={handleHealthChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
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
                  </div>

                  {/* Allergies */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الحساسية (أطعمة، أدوية، موسمية...)
                    </label>
                    <input
                      type="text"
                      name="allergies"
                      placeholder="مثال: حساسية البنسلين، حساسية الفول السوداني"
                      value={healthData.allergies}
                      onChange={handleHealthChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Chronic Diseases */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الأمراض المزمنة
                    </label>
                    <input
                      type="text"
                      name="chronic_diseases"
                      placeholder="مثال: ربو، سكري الأطفال..."
                      value={healthData.chronic_diseases}
                      onChange={handleHealthChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Permanent Medications */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الأدوية الدائمة
                    </label>
                    <input
                      type="text"
                      name="permanent_medications"
                      placeholder="مثال: بخاخ فينتولين عند اللزوم"
                      value={healthData.permanent_medications}
                      onChange={handleHealthChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Emergency Contact Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      اسم جهة اتصال الطوارئ
                    </label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      placeholder="مثال: ماهر اختبار"
                      value={healthData.emergency_contact_name}
                      onChange={handleHealthChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* Emergency Contact Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      هاتف جهة اتصال الطوارئ
                    </label>
                    <input
                      type="text"
                      name="emergency_contact_phone"
                      placeholder="مثال: 0944000000"
                      value={healthData.emergency_contact_phone}
                      onChange={handleHealthChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Special Needs & Health Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    احتياجات صحية خاصة أو ملاحظات طبية للمدرسة
                  </label>
                  <textarea
                    rows={2}
                    name="health_notes"
                    placeholder="أي ملاحظات إضافية تخص صحة الطالب..."
                    value={healthData.health_notes}
                    onChange={handleHealthChange}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
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
              disabled={isSubmitting}
              className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? "جاري تسجيل الطالب..." : "تأكيد تسجيل الطالب"}</span>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
