import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { SearchableSelect } from "../ui/SearchableSelect";
import { getFieldErrors, parseApiError, extractPaginatedList } from "../../utils/errorUtils";
import { api } from "../../api";
import { RefreshCw } from "lucide-react";

export function EnrollmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialEnrollment = null,
  students = [],
  years = [],
  sections = [],
  gradeLevels = [],
}) {
  const [formData, setFormData] = useState({
    student: "",
    academic_year: "",
    section: "",
    enrollment_date: new Date().toISOString().split("T")[0],
  });

  const [selectedGrade, setSelectedGrade] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // All students loaded from the database (not limited to table pagination)
  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Set of student IDs who already have enrollments in the selected academic year
  const [enrolledStudentIds, setEnrolledStudentIds] = useState(new Set());
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  // 1. Fetch ALL active students from backend with pagination loop (bypassing the 20-item table pagination)
  const loadAllStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      let accumulated = [];
      let page = 1;
      let hasMore = true;
      while (hasMore && page <= 10) {
        const res = await api.students.getStudents({
          page,
          page_size: 1000,
          is_active: true,
        });
        const { results, next } = extractPaginatedList(res);
        accumulated = [...accumulated, ...results];
        hasMore = Boolean(next);
        page++;
      }
      setAllStudents(accumulated);
    } catch (err) {
      console.error("Failed to load students list for enrollment:", err);
      if (students?.length > 0) {
        setAllStudents(students);
      }
    } finally {
      setLoadingStudents(false);
    }
  }, [students]);

  // 2. Fetch all enrollments for the selected academic year to identify already registered students
  const loadEnrollmentsForYear = useCallback(async (yearId) => {
    if (!yearId) {
      setEnrolledStudentIds(new Set());
      return;
    }
    setLoadingEnrollments(true);
    try {
      let accumulatedEnrollments = [];
      let page = 1;
      let hasMore = true;
      while (hasMore && page <= 10) {
        const res = await api.students.getEnrollments({
          academic_year: yearId,
          page,
          page_size: 1000,
        });
        const { results, next } = extractPaginatedList(res);
        accumulatedEnrollments = [...accumulatedEnrollments, ...results];
        hasMore = Boolean(next);
        page++;
      }

      const idSet = new Set();
      accumulatedEnrollments.forEach((enr) => {
        const sId =
          typeof enr.student === "object" ? enr.student?.id : enr.student;
        if (sId) idSet.add(String(sId));
      });
      setEnrolledStudentIds(idSet);
    } catch (err) {
      console.error("Failed to load enrollments for year:", err);
    } finally {
      setLoadingEnrollments(false);
    }
  }, []);

  // Trigger loading when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAllStudents();
    }
  }, [isOpen, loadAllStudents]);

  // Trigger enrollment fetching whenever academic_year changes or modal opens
  useEffect(() => {
    if (isOpen && formData.academic_year) {
      loadEnrollmentsForYear(formData.academic_year);
    }
  }, [isOpen, formData.academic_year, loadEnrollmentsForYear]);

  // Form initialization
  useEffect(() => {
    if (initialEnrollment?.id) {
      const enrSecId =
        typeof initialEnrollment.section === "object"
          ? initialEnrollment.section?.id
          : initialEnrollment.section || "";

      const matchingSec = sections.find((s) => String(s.id) === String(enrSecId));
      const detectedGrade =
        (typeof initialEnrollment.grade_level === "object"
          ? initialEnrollment.grade_level?.id
          : initialEnrollment.grade_level) ||
        (matchingSec
          ? typeof matchingSec.grade_level === "object"
            ? matchingSec.grade_level?.id
            : matchingSec.grade_level
          : "");

      setSelectedGrade(detectedGrade ? String(detectedGrade) : "");

      setFormData({
        student:
          typeof initialEnrollment.student === "object"
            ? initialEnrollment.student?.id
            : initialEnrollment.student || "",
        academic_year:
          typeof initialEnrollment.academic_year === "object"
            ? initialEnrollment.academic_year?.id
            : initialEnrollment.academic_year || "",
        section: enrSecId,
        enrollment_date:
          initialEnrollment.enrollment_date ||
          new Date().toISOString().split("T")[0],
      });
    } else {
      setSelectedGrade("");
      setFormData({
        student: initialEnrollment?.student || "",
        academic_year: initialEnrollment?.academic_year || years[0]?.id || "",
        section: "",
        enrollment_date: new Date().toISOString().split("T")[0],
      });
    }
    setGeneralError(null);
    setFieldErrors({});
  }, [initialEnrollment, isOpen, years, sections]);

  // Sync grade if sections load asynchronously while editing
  useEffect(() => {
    if (formData.section && !selectedGrade && sections.length > 0) {
      const matchingSec = sections.find((s) => String(s.id) === String(formData.section));
      if (matchingSec) {
        const detectedGrade =
          typeof matchingSec.grade_level === "object"
            ? matchingSec.grade_level?.id
            : matchingSec.grade_level;
        if (detectedGrade) {
          setSelectedGrade(String(detectedGrade));
        }
      }
    }
  }, [formData.section, selectedGrade, sections]);

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

  const handleYearChange = (e) => {
    const newYear = e.target.value;
    setFormData((prev) => {
      let newSection = prev.section;
      if (newSection) {
        const sec = sections.find((s) => String(s.id) === String(newSection));
        const secYearId =
          typeof sec?.academic_year === "object" ? sec?.academic_year?.id : sec?.academic_year;
        if (secYearId && String(secYearId) !== String(newYear)) {
          newSection = "";
        }
      }
      return { ...prev, academic_year: newYear, section: newSection };
    });
    if (fieldErrors.academic_year) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.academic_year;
        return next;
      });
    }
  };

  const handleGradeChange = (gradeId) => {
    setSelectedGrade(gradeId);
    if (fieldErrors.grade_level) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.grade_level;
        return next;
      });
    }
    // If the currently chosen section doesn't belong to the newly selected grade, reset it
    if (formData.section) {
      const sec = sections.find((s) => String(s.id) === String(formData.section));
      const secGradeId =
        typeof sec?.grade_level === "object" ? sec?.grade_level?.id : sec?.grade_level;
      if (!gradeId || String(secGradeId) !== String(gradeId)) {
        setFormData((prev) => ({ ...prev, section: "" }));
      }
    }
  };

  // Determine currently edited student ID (to always permit them in the dropdown during edit)
  const currentEditingStudentId = useMemo(() => {
    if (!initialEnrollment) return null;
    const s = initialEnrollment.student;
    return s ? String(typeof s === "object" ? s.id : s) : null;
  }, [initialEnrollment]);

  // Combine full fetched list with fallback props
  const baseStudentsList = useMemo(() => {
    if (allStudents.length > 0) return allStudents;
    return students || [];
  }, [allStudents, students]);

  // Filter students who are NOT already enrolled in this academic year
  const unenrolledStudents = useMemo(() => {
    return baseStudentsList.filter((st) => {
      const stId = String(st.id);
      // In edit mode, always keep the student being edited
      if (currentEditingStudentId && stId === currentEditingStudentId) {
        return true;
      }
      // If already enrolled in the selected academic year, exclude
      if (enrolledStudentIds.has(stId)) {
        return false;
      }
      return true;
    });
  }, [baseStudentsList, enrolledStudentIds, currentEditingStudentId]);

  // Ensure newly registered student passed from other screens is included
  const availableStudents = useMemo(() => {
    let list = unenrolledStudents;
    if (
      initialEnrollment?.student &&
      !list.some((s) => String(s.id) === String(initialEnrollment.student))
    ) {
      return [
        {
          id: initialEnrollment.student,
          full_name: initialEnrollment.student_display || "الطالب المسجل حديثاً",
          father_name: initialEnrollment.father_name || "",
        },
        ...list,
      ];
    }
    return list;
  }, [unenrolledStudents, initialEnrollment]);

  // Options for Student SearchableSelect
  const studentOptions = useMemo(() => {
    return availableStudents.map((st) => ({
      value: st.id,
      label: st.full_name || `${st.first_name || ""} ${st.last_name || ""}`.trim() || st.id,
      subtext: [
        st.father_name ? `اسم الأب: ${st.father_name}` : "",
        st.national_id ? `الرقم الوطني: ${st.national_id}` : "",
      ]
        .filter(Boolean)
        .join(" • "),
    }));
  }, [availableStudents]);

  // Filter sections by selected academic year
  const sectionsForYear = useMemo(() => {
    if (!formData.academic_year) return sections;
    return sections.filter((s) => {
      const secYearId =
        typeof s.academic_year === "object" ? s.academic_year?.id : s.academic_year;
      return !secYearId || String(secYearId) === String(formData.academic_year);
    });
  }, [sections, formData.academic_year]);

  // Combine grades from gradeLevels prop and any grade levels present in sections
  const availableGradeLevels = useMemo(() => {
    const map = new Map();
    (gradeLevels || []).forEach((lvl) => {
      if (lvl?.id) {
        map.set(String(lvl.id), {
          id: lvl.id,
          name: lvl.name || lvl.name_ar || `الصف ${lvl.id}`,
          order: lvl.order ?? 999,
        });
      }
    });

    (sections || []).forEach((sec) => {
      const gId =
        typeof sec.grade_level === "object" ? sec.grade_level?.id : sec.grade_level;
      const gName =
        sec.grade_level?.name ||
        sec.grade_level_name ||
        sec.grade_level_display ||
        (gId ? `الصف ${gId}` : null);
      if (gId && !map.has(String(gId))) {
        map.set(String(gId), {
          id: gId,
          name: gName || `الصف ${gId}`,
          order: sec.grade_level?.order ?? 999,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.order !== b.order) return (a.order || 0) - (b.order || 0);
      return String(a.name).localeCompare(String(b.name), "ar");
    });
  }, [gradeLevels, sections]);

  // Grade Options for SearchableSelect
  const gradeOptions = useMemo(() => {
    return availableGradeLevels.map((lvl) => {
      const count = sectionsForYear.filter((s) => {
        const gId =
          typeof s.grade_level === "object" ? s.grade_level?.id : s.grade_level;
        return String(gId) === String(lvl.id);
      }).length;
      return {
        value: lvl.id,
        label: lvl.name,
        subtext: count > 0 ? `(${count} شعب متاحة)` : "(لا توجد شعب لهذا العام)",
      };
    });
  }, [availableGradeLevels, sectionsForYear]);

  // Filter sections strictly to the chosen grade level
  const availableSections = useMemo(() => {
    if (!selectedGrade) return [];
    return sectionsForYear.filter((sec) => {
      const secGradeId =
        typeof sec.grade_level === "object" ? sec.grade_level?.id : sec.grade_level;
      return String(secGradeId) === String(selectedGrade);
    });
  }, [sectionsForYear, selectedGrade]);

  // Section Options for SearchableSelect
  const sectionOptions = useMemo(() => {
    return availableSections.map((sec) => {
      const secName = sec.name?.startsWith("شعبة") ? sec.name : `شعبة (${sec.name})`;
      return {
        value: sec.id,
        label: secName,
        subtext: sec.academic_year_display || sec.academic_year?.name || "",
      };
    });
  }, [availableSections]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const errors = {};
    if (!formData.student) errors.student = "يرجى اختيار الطالب.";
    if (!formData.academic_year) errors.academic_year = "يرجى اختيار العام الدراسي.";
    if (!selectedGrade) errors.grade_level = "يرجى اختيار الصف الدراسي أولاً.";
    if (!formData.section) errors.section = "يرجى اختيار الشعبة الدراسية.";
    if (!formData.enrollment_date) errors.enrollment_date = "يرجى تحديد تاريخ التسجيل.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError("يرجى ملء كافة الحقول المطلوبة بشكل صحيح.");
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

  const isDataSyncing = loadingStudents || loadingEnrollments;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={initialEnrollment?.id ? "تعديل تسجيل الطالب" : "تسجيل طالب جديد في شعبة"}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right dir-rtl" dir="rtl">
        {generalError && <Alert type="error">{generalError}</Alert>}

        {/* Academic Year Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            العام الدراسي <span className="text-rose-500">*</span>
          </label>
          <select
            name="academic_year"
            required
            value={formData.academic_year}
            onChange={handleYearChange}
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

        {/* Student Selector */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              الطالب المستهدف <span className="text-rose-500">*</span>
            </label>
            {isDataSyncing ? (
              <span className="flex items-center gap-1 text-[11px] text-teal-600 font-medium">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>جاري استبعاد المسجلين وجلب الطلاب...</span>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                {studentOptions.length} طالب غير مسجل
              </span>
            )}
          </div>
          <SearchableSelect
            options={studentOptions}
            value={formData.student}
            onChange={(val) => {
              setFormData((prev) => ({ ...prev, student: val }));
              if (fieldErrors.student) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.student;
                  return next;
                });
              }
            }}
            disabled={Boolean(initialEnrollment?.id)}
            placeholder={
              isDataSyncing
                ? "-- جاري تحميل وفلترة الطلاب غير المسجلين... --"
                : studentOptions.length === 0
                ? "-- جميع الطلاب مسجلون في هذا العام الدراسي --"
                : `-- اختر الطالب (متاح ${studentOptions.length} طالباً غير مسجل) --`
            }
            searchPlaceholder="اكتب اسم الطالب أو اسم الأب للبحث السريع..."
            emptyMessage="لا يوجد طلاب غير مسجلين مطابقين للبحث"
            noOptionsMessage={
              isDataSyncing
                ? "جاري فحص الطلاب..."
                : "-- جميع الطلاب مسجلون بالفعل في هذا العام الدراسي --"
            }
            inputClassName={
              fieldErrors.student
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:ring-teal-500"
            }
          />
          {fieldErrors.student && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.student}</p>
          )}
          {!initialEnrollment?.id && !fieldErrors.student && (
            <p className="text-[10px] text-slate-400 mt-1">
              يتم تلقائياً إخفاء أي طالب مسجل مسبقاً في هذا العام الدراسي منعاً للتكرار.
            </p>
          )}
        </div>

        {/* Grade Level Selector (الصف الدراسي) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            الصف الدراسي <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            options={gradeOptions}
            value={selectedGrade}
            onChange={handleGradeChange}
            placeholder="-- اختر الصف الدراسي (اكتب للبحث السريع) --"
            searchPlaceholder="اكتب اسم الصف للبحث..."
            emptyMessage="لا توجد صفوف مطابقة للبحث"
            noOptionsMessage="-- لا توجد صفوف دراسية متاحة --"
            inputClassName={
              fieldErrors.grade_level
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:ring-teal-500"
            }
          />
          {fieldErrors.grade_level && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.grade_level}</p>
          )}
        </div>

        {/* Section Selector (الشعبة الدراسية - مفلترة حسب الصف المختار) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            الشعبة الدراسية <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            options={sectionOptions}
            value={formData.section}
            onChange={(val) => {
              setFormData((prev) => ({ ...prev, section: val }));
              if (fieldErrors.section) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.section;
                  return next;
                });
              }
            }}
            disabled={!selectedGrade}
            placeholder={
              !selectedGrade
                ? "-- اختر الصف الدراسي أولاً لعرض الشعب --"
                : sectionOptions.length === 0
                ? "-- لا توجد شعب متاحة لهذا الصف في هذا العام --"
                : "-- اختر الشعبة --"
            }
            searchPlaceholder="اكتب اسم الشعبة للبحث..."
            emptyMessage="لا توجد شعب مطابقة للبحث"
            noOptionsMessage={
              !selectedGrade
                ? "-- يرجى اختيار الصف الدراسي أولاً --"
                : "-- لا توجد شعب متاحة لهذا الصف في هذا العام --"
            }
            inputClassName={
              fieldErrors.section
                ? "border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:ring-teal-500"
            }
          />
          {fieldErrors.section && (
            <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.section}</p>
          )}
          {!selectedGrade && !fieldErrors.section && (
            <p className="text-[11px] text-slate-400 mt-1">
              اختر الصف الدراسي في الحقل السابق لتظهر الشعب التابعة له فقط.
            </p>
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
              : initialEnrollment?.id
              ? "حفظ التعديل"
              : "إتمام تسجيل الطالب"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
