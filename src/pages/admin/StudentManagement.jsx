import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import {
  isTeacher,
  canManageStudents,
  canViewStudentProfile,
  canAccessStudentImport,
  getBaseRouteForRole,
} from "../../utils/permissionUtils";
import {
  parseApiError,
  getApiErrorCode,
  getApiSuccessMessage,
  extractPaginatedList,
} from "../../utils/errorUtils";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { StudentFormModal } from "../../components/students/StudentFormModal";
import { StudentRegistrationModal } from "../../components/students/StudentRegistrationModal";
import { StudentHealthProfileModal } from "../../components/students/StudentHealthProfileModal";
import { EnrollmentFormModal } from "../../components/students/EnrollmentFormModal";
import { TransferModal } from "../../components/students/TransferModal";
import { CorrectPlacementModal } from "../../components/students/CorrectPlacementModal";
import { GuardianLinkFormModal } from "../../components/students/GuardianLinkFormModal";
import { toast } from "sonner";
import {
  GraduationCap,
  Users,
  Link as LinkIcon,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  ArrowLeftRight,
  PowerOff,
  CheckCircle,
  Calendar,
  Layers,
  School,
  Lock,
  UserCheck,
  HeartPulse,
  FileText,
  FileSpreadsheet,
  Download,
  X,
} from "lucide-react";
import { exportStudentsToExcel } from "../../utils/studentExportUtils";

export function StudentManagement() {
  const { user, requesterRole, permissions, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const basePath = getBaseRouteForRole(user);
  const canViewProfile = canViewStudentProfile(user, requesterRole, permissions);
  const canImportStudents = canAccessStudentImport(user, requesterRole, permissions);

  // Student permissions
  const canAddStudent = hasPermission("students.add_student");
  const canChangeStudent = hasPermission("students.change_student");
  const canDeleteStudent = hasPermission("students.delete_student");

  // Enrollment permissions
  const canAddEnrollment = hasPermission("students.add_enrollment");
  const canChangeEnrollment = hasPermission("students.change_enrollment");
  const canTransferStudent = hasPermission("students.transfer_student");
  const canCorrectPlacement = hasPermission("students.correct_enrollment_placement");
  const canDeleteEnrollment = hasPermission("students.delete_enrollment");

  // Guardian permissions
  const canAddGuardianLink = hasPermission("students.add_guardianstudent");
  const canDeleteGuardianLink = hasPermission("students.delete_guardianstudent");

  const canManageAny =
    canAddStudent ||
    canChangeStudent ||
    canDeleteStudent ||
    canAddEnrollment ||
    canChangeEnrollment ||
    canTransferStudent ||
    canCorrectPlacement ||
    canDeleteEnrollment ||
    canAddGuardianLink ||
    canDeleteGuardianLink;
  const isReadOnly = !canManageAny;

  // Active Tab: 'students' | 'enrollments' | 'guardians'
  const [activeTab, setActiveTab] = useState("students");

  // =========================================================
  // 1. STUDENTS DIRECTORY STATE
  // =========================================================
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentGenderFilter, setStudentGenderFilter] = useState("");
  const [studentActiveFilter, setStudentActiveFilter] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentHasNext, setStudentHasNext] = useState(false);
  const [studentHasPrev, setStudentHasPrev] = useState(false);
  const [isExportingStudents, setIsExportingStudents] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);

  // Registration & Health Profile Modals State
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [selectedHealthStudent, setSelectedHealthStudent] = useState(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // =========================================================
  // 2. ENROLLMENTS & TRANSFERS STATE
  // =========================================================
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentsError, setEnrollmentsError] = useState(null);
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [enrollmentYearFilter, setEnrollmentYearFilter] = useState("");
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [enrollmentTotal, setEnrollmentTotal] = useState(0);

  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferringEnrollment, setTransferringEnrollment] = useState(null);
  const [isCorrectPlacementModalOpen, setIsCorrectPlacementModalOpen] = useState(false);
  const [correctingEnrollment, setCorrectingEnrollment] = useState(null);

  // =========================================================
  // 3. GUARDIAN LINKS STATE
  // =========================================================
  const [guardianLinks, setGuardianLinks] = useState([]);
  const [guardiansLoading, setGuardiansLoading] = useState(false);
  const [guardiansError, setGuardiansError] = useState(null);
  const [guardianSearch, setGuardianSearch] = useState("");
  const [guardianPage, setGuardianPage] = useState(1);
  const [guardianTotal, setGuardianTotal] = useState(0);

  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false);

  // Dropdowns data (Years, Sections, Users/Guardians, Grade Levels)
  const [years, setYears] = useState([]);
  const [sections, setSections] = useState([]);
  const [guardianUsers, setGuardianUsers] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);

  // =========================================================
  // 4. CONFIRMATION MODALS STATE
  // =========================================================
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    variant: "danger",
    onConfirm: () => {},
    isLoading: false,
  });

  // Special Blocked Deactivation Modal State
  const [deactivateFallbackConfig, setDeactivateFallbackConfig] = useState({
    isOpen: false,
    student: null,
    backendMessage: "",
    isLoading: false,
  });

  // =========================================================
  // FETCH DROPDOWN METADATA
  // =========================================================
  const fetchMetadata = useCallback(async () => {
    try {
      const [yearsRes, sectionsRes, usersRes, gradesRes] = await Promise.all([
        api.academics.getYears().catch(() => ({ results: [] })),
        api.academics.getSections().catch(() => ({ results: [] })),
        api.users.getUsers({ role: "guardian" }).catch(() => ({ results: [] })),
        api.academics.getGradeLevels().catch(() => ({ results: [] })),
      ]);

      const yearsList = extractPaginatedList(yearsRes).results;
      const sectionsList = extractPaginatedList(sectionsRes).results;
      const usersList = extractPaginatedList(usersRes).results;
      const gradesList = extractPaginatedList(gradesRes).results;

      // Filter strictly to guardian / parent role accounts only
      const onlyGuardians = usersList.filter(
        (u) =>
          u.role === "guardian" ||
          u.role_code === "guardian" ||
          u.role_name === "guardian"
      );

      setYears(yearsList);
      setSections(sectionsList);
      setGuardianUsers(onlyGuardians);
      setGradeLevels(gradesList);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // =========================================================
  // 1. FETCH STUDENTS
  // =========================================================
  const fetchStudents = useCallback(
    async (page = studentPage) => {
      setStudentsLoading(true);
      setStudentsError(null);
      try {
        const params = { page };
        if (studentSearch.trim()) params.search = studentSearch.trim();
        if (studentGenderFilter) params.gender = studentGenderFilter;
        if (studentActiveFilter) params.is_active = studentActiveFilter;

        const res = await api.students.getStudents(params);
        const { results, count, next, previous } = extractPaginatedList(res);

        setStudents(results);
        setStudentTotal(count);
        setStudentHasNext(Boolean(next));
        setStudentHasPrev(Boolean(previous));
      } catch (err) {
        setStudentsError(parseApiError(err, "تعذر تحميل قائمة الطلاب."));
      } finally {
        setStudentsLoading(false);
      }
    },
    [studentPage, studentSearch, studentGenderFilter, studentActiveFilter]
  );

  const handleExportStudents = async () => {
    try {
      setIsExportingStudents(true);
      setExportProgress(null);

      const params = { page: 1, page_size: 1500 };
      if (studentSearch.trim()) params.search = studentSearch.trim();
      if (studentGenderFilter) params.gender = studentGenderFilter;
      if (studentActiveFilter) params.is_active = studentActiveFilter;

      let exportList = [];
      try {
        const res = await api.students.getStudents(params);
        exportList = extractPaginatedList(res).results;
      } catch (_) {
        exportList = students;
      }

      if (!exportList || exportList.length === 0) {
        toast.info("لا توجد بيانات طلاب لتصديرها.");
        return;
      }

      const toastId = toast.loading(
        `جاري تجهيز وتجميع البيانات الشاملة لـ ${exportList.length} طالب...`
      );

      await exportStudentsToExcel(exportList, {
        fileName: `بيانات_الطلاب_الشاملة_${new Date().toISOString().split("T")[0]}.xlsx`,
        autoHydrate: true,
        concurrency: 6,
        onProgress: (current, total) => {
          setExportProgress({ current, total });
          toast.loading(
            `جاري جلب الملفات والبيانات الشاملة (${current}/${total})...`,
            { id: toastId }
          );
        },
      });

      toast.success(
        `تم تصدير ملف Excel بنجاح لـ ${exportList.length} طالب مع كافة البيانات الشاملة!`,
        { id: toastId }
      );
    } catch (err) {
      toast.error(parseApiError(err, "حدث خطأ أثناء تصدير ملف Excel."));
    } finally {
      setIsExportingStudents(false);
      setExportProgress(null);
    }
  };

  useEffect(() => {
    if (activeTab === "students") {
      fetchStudents(studentPage);
    }
  }, [fetchStudents, activeTab, studentPage]);

  // =========================================================
  // ARABIC NORMALIZATION HELPER FOR ROBUST SEARCH
  // =========================================================
  const normalizeSearchText = (text) => {
    if (!text || typeof text !== "string") return "";
    return text
      .toLowerCase()
      .trim()
      .replace(/[\u064B-\u065F\u0670]/g, "") // Diacritics (tashkeel)
      .replace(/[إأآٱ]/g, "ا") // Alef normalization
      .replace(/ى/g, "ي") // Ya / Alef Maqsura
      .replace(/ة/g, "ه") // Ta marbuta normalization
      .replace(/[\u0640]/g, ""); // Tatweel
  };

  // =========================================================
  // 2. FETCH ENROLLMENTS
  // =========================================================
  const fetchEnrollments = useCallback(async () => {
    setEnrollmentsLoading(true);
    setEnrollmentsError(null);
    try {
      const baseParams = {};
      if (enrollmentYearFilter) baseParams.academic_year = enrollmentYearFilter;

      let allResults = [];
      let totalCount = 0;

      try {
        const res = await api.students.getEnrollments({
          ...baseParams,
          page: 1,
          page_size: 1000,
        });
        const paginated = extractPaginatedList(res);
        allResults = paginated.results || [];
        totalCount = paginated.count || allResults.length;

        let nextPage = 2;
        let hasMore = Boolean(paginated.next) && allResults.length < totalCount;
        while (hasMore && nextPage <= 25) {
          try {
            const nextRes = await api.students.getEnrollments({
              ...baseParams,
              page: nextPage,
              page_size: 1000,
            });
            const nextPaginated = extractPaginatedList(nextRes);
            if (Array.isArray(nextPaginated.results) && nextPaginated.results.length > 0) {
              allResults = [...allResults, ...nextPaginated.results];
            }
            if (!nextPaginated.next || allResults.length >= (nextPaginated.count || totalCount)) {
              hasMore = false;
            } else {
              nextPage++;
            }
          } catch (_) {
            hasMore = false;
          }
        }
      } catch (_) {
        const fallbackRes = await api.students.getEnrollments(baseParams);
        const fallbackData = extractPaginatedList(fallbackRes);
        allResults = fallbackData.results || [];
        totalCount = fallbackData.count || allResults.length;
      }

      setEnrollments(allResults);
      setEnrollmentTotal(totalCount);
    } catch (err) {
      setEnrollmentsError(parseApiError(err, "تعذر تحميل قائمة تسجيلات الطلاب."));
    } finally {
      setEnrollmentsLoading(false);
    }
  }, [enrollmentYearFilter]);

  useEffect(() => {
    if (activeTab === "enrollments") {
      fetchEnrollments();
    }
  }, [fetchEnrollments, activeTab]);

  // Client-side filtering for Enrollments & Transfers (instant, robust, supports Arabic normalization)
  const filteredEnrollments = useMemo(() => {
    if (!enrollmentSearch.trim()) return enrollments;

    const rawTerm = enrollmentSearch.trim().toLowerCase();
    const normTerm = normalizeSearchText(enrollmentSearch);

    return enrollments.filter((enr) => {
      const studentName = String(
        enr.student_display ||
        enr.student?.full_name ||
        (typeof enr.student === "object"
          ? `${enr.student?.first_name || ""} ${enr.student?.last_name || ""}`.trim()
          : enr.student) ||
        ""
      );
      const sectionName = String(
        enr.section_display ||
        enr.section?.name ||
        (typeof enr.section === "string" ? enr.section : "") ||
        ""
      );
      const gradeLevel = String(
        enr.grade_level_display ||
        enr.grade_level?.name ||
        ""
      );
      const academicYear = String(
        enr.academic_year_display ||
        enr.academic_year?.name ||
        ""
      );
      const enrollmentDate = String(enr.enrollment_date || "");

      if (
        studentName.toLowerCase().includes(rawTerm) ||
        sectionName.toLowerCase().includes(rawTerm) ||
        gradeLevel.toLowerCase().includes(rawTerm) ||
        academicYear.toLowerCase().includes(rawTerm) ||
        enrollmentDate.toLowerCase().includes(rawTerm)
      ) {
        return true;
      }

      const normStudent = normalizeSearchText(studentName);
      const normSection = normalizeSearchText(sectionName);
      const normGrade = normalizeSearchText(gradeLevel);
      const normYear = normalizeSearchText(academicYear);

      return (
        normStudent.includes(normTerm) ||
        normSection.includes(normTerm) ||
        normGrade.includes(normTerm) ||
        normYear.includes(normTerm)
      );
    });
  }, [enrollments, enrollmentSearch]);

  const ENROLLMENT_PAGE_SIZE = 20;
  const enrollmentTotalPages = Math.ceil(filteredEnrollments.length / ENROLLMENT_PAGE_SIZE) || 1;
  const paginatedEnrollments = useMemo(() => {
    const start = (enrollmentPage - 1) * ENROLLMENT_PAGE_SIZE;
    return filteredEnrollments.slice(start, start + ENROLLMENT_PAGE_SIZE);
  }, [filteredEnrollments, enrollmentPage]);

  // =========================================================
  // 3. FETCH GUARDIAN LINKS
  // =========================================================
  const fetchGuardianLinks = useCallback(async () => {
    setGuardiansLoading(true);
    setGuardiansError(null);
    try {
      let allResults = [];
      let totalCount = 0;

      try {
        const res = await api.students.getGuardianLinks({ page: 1, page_size: 1000 });
        const paginated = extractPaginatedList(res);
        allResults = paginated.results || [];
        totalCount = paginated.count || allResults.length;

        let nextPage = 2;
        let hasMore = Boolean(paginated.next) && allResults.length < totalCount;
        while (hasMore && nextPage <= 25) {
          try {
            const nextRes = await api.students.getGuardianLinks({ page: nextPage, page_size: 1000 });
            const nextPaginated = extractPaginatedList(nextRes);
            if (Array.isArray(nextPaginated.results) && nextPaginated.results.length > 0) {
              allResults = [...allResults, ...nextPaginated.results];
            }
            if (!nextPaginated.next || allResults.length >= (nextPaginated.count || totalCount)) {
              hasMore = false;
            } else {
              nextPage++;
            }
          } catch (_) {
            hasMore = false;
          }
        }
      } catch (_) {
        const fallbackRes = await api.students.getGuardianLinks({ page: 1 });
        const fallbackData = extractPaginatedList(fallbackRes);
        allResults = fallbackData.results || [];
        totalCount = fallbackData.count || allResults.length;
      }

      setGuardianLinks(allResults);
      setGuardianTotal(totalCount);
    } catch (err) {
      setGuardiansError(parseApiError(err, "تعذر تحميل روابط أولياء الأمور."));
    } finally {
      setGuardiansLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "guardians") {
      fetchGuardianLinks();
    }
  }, [fetchGuardianLinks, activeTab]);

  // Client-side filtering for Guardian Links
  const filteredGuardianLinks = useMemo(() => {
    if (!guardianSearch.trim()) return guardianLinks;

    const rawTerm = guardianSearch.trim().toLowerCase();
    const normTerm = normalizeSearchText(guardianSearch);

    return guardianLinks.filter((link) => {
      const guardianName = String(link.guardian_display || link.guardian_username || "");
      const guardianUsername = String(link.guardian_username || "");
      const studentName = String(link.student_display || link.student || "");
      const relationship = String(link.relationship || "");

      if (
        guardianName.toLowerCase().includes(rawTerm) ||
        guardianUsername.toLowerCase().includes(rawTerm) ||
        studentName.toLowerCase().includes(rawTerm) ||
        relationship.toLowerCase().includes(rawTerm)
      ) {
        return true;
      }

      const normGuardian = normalizeSearchText(guardianName);
      const normUsername = normalizeSearchText(guardianUsername);
      const normStudent = normalizeSearchText(studentName);
      const normRel = normalizeSearchText(relationship);

      return (
        normGuardian.includes(normTerm) ||
        normUsername.includes(normTerm) ||
        normStudent.includes(normTerm) ||
        normRel.includes(normTerm)
      );
    });
  }, [guardianLinks, guardianSearch]);

  const GUARDIAN_PAGE_SIZE = 20;
  const guardianTotalPages = Math.ceil(filteredGuardianLinks.length / GUARDIAN_PAGE_SIZE) || 1;
  const paginatedGuardianLinks = useMemo(() => {
    const start = (guardianPage - 1) * GUARDIAN_PAGE_SIZE;
    return filteredGuardianLinks.slice(start, start + GUARDIAN_PAGE_SIZE);
  }, [filteredGuardianLinks, guardianPage]);

  // =========================================================
  // STUDENT HANDLERS (Create, Edit, Delete, Deactivate, Activate)
  // =========================================================
  const handleStudentSubmit = async (formData) => {
    if (editingStudent?.id) {
      const res = await api.students.updateStudent(editingStudent.id, formData);
      toast.success(getApiSuccessMessage(res, "تم تحديث بيانات الطالب بنجاح."));
    } else {
      const res = await api.students.createStudent(formData);
      toast.success(getApiSuccessMessage(res, "تم إنشاء سجل الطالب بنجاح."));
    }
    setEditingStudent(null);
    fetchStudents(1);
  };

  const handleDeleteStudent = (student) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "تأكيد حذف الطالب",
      message: `هل أنت متأكد من حذف سجل الطالب (${student.full_name || student.first_name}) نهائياً من النظام؟`,
      confirmText: "حذف نهائي",
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await api.students.deleteStudent(student.id);
          toast.success(getApiSuccessMessage(res, "تم حذف الطالب بنجاح."));
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchStudents(studentPage);
        } catch (err) {
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          const errorCode = getApiErrorCode(err);
          const serverMessage = parseApiError(err);

          // If student deletion is blocked by backend due to existing enrollments / guardian links
          if (errorCode === "STUDENT_DELETE_BLOCKED") {
            setDeactivateFallbackConfig({
              isOpen: true,
              student: student,
              backendMessage: serverMessage,
              isLoading: false,
            });
          } else {
            toast.error(serverMessage);
          }
        }
      },
    });
  };

  const handleDeactivateStudentDirectly = async (student) => {
    setDeactivateFallbackConfig((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await api.students.deactivateStudent(student.id);
      toast.success(getApiSuccessMessage(res, "تم تعطيل الطالب بنجاح مع الاحتفاظ بسجله الأكاديمي."));
      setDeactivateFallbackConfig({ isOpen: false, student: null, backendMessage: "", isLoading: false });
      fetchStudents(studentPage);
    } catch (err) {
      setDeactivateFallbackConfig((prev) => ({ ...prev, isLoading: false }));
      toast.error(parseApiError(err, "فشل تعطيل حساب الطالب."));
    }
  };

  const handleToggleStudentActive = (student) => {
    const isCurrentlyActive = student.is_active !== false;
    const actionText = isCurrentlyActive ? "تعطيل" : "تفعيل";
    const actionVariant = isCurrentlyActive ? "warning" : "success";

    setConfirmModalConfig({
      isOpen: true,
      title: `${actionText} حساب الطالب`,
      message: `هل أنت متأكد من رغبتك في ${actionText} حساب الطالب (${student.full_name || student.first_name})؟`,
      confirmText: `تأكيد ال${actionText}`,
      variant: actionVariant,
      isLoading: false,
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = isCurrentlyActive
            ? await api.students.deactivateStudent(student.id)
            : await api.students.activateStudent(student.id);
          toast.success(getApiSuccessMessage(res, `تم ${actionText} حساب الطالب بنجاح.`));
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchStudents(studentPage);
        } catch (err) {
          setConfirmModalConfig((prev) => ({ ...prev, isLoading: false }));
          toast.error(parseApiError(err, `فشل ${actionText} حساب الطالب.`));
        }
      },
    });
  };

  // =========================================================
  // ENROLLMENT & TRANSFER HANDLERS
  // =========================================================
  const handleEnrollmentSubmit = async (formData) => {
    if (editingEnrollment?.id) {
      const res = await api.students.updateEnrollment(editingEnrollment.id, formData);
      toast.success(getApiSuccessMessage(res, "تم تحديث بيانات التسجيل بنجاح."));
    } else {
      const res = await api.students.createEnrollment(formData);
      toast.success(getApiSuccessMessage(res, "تم تسجيل الطالب في الشعبة بنجاح."));
    }
    setEditingEnrollment(null);
    fetchEnrollments();
  };

  const handleTransferSubmit = async (enrollmentId, newSectionId) => {
    const res = await api.students.transferEnrollment(enrollmentId, newSectionId);
    toast.success(getApiSuccessMessage(res, "تم نقل الطالب إلى الشعبة الجديدة بنجاح."));
    fetchEnrollments();
    return res;
  };

  const handleCorrectPlacementSubmit = async (enrollmentId, payload) => {
    const res = await api.students.correctPlacement(enrollmentId, payload);
    toast.success(getApiSuccessMessage(res, "تم تصحيح شعبة تسجيل الطالب بنجاح."));
    fetchEnrollments();
    return res;
  };

  const handleDeleteEnrollment = (enrollment) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "تأكيد حذف التسجيل الدراسي",
      message: `هل أنت متأكد من حذف تسجيل الطالب (${enrollment.student_display || enrollment.student?.full_name || enrollment.student}) في شعبة (${enrollment.section_display || enrollment.section?.name || enrollment.section})؟`,
      confirmText: "حذف التسجيل",
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await api.students.deleteEnrollment(enrollment.id);
          toast.success(getApiSuccessMessage(res, "تم حذف التسجيل الدراسي بنجاح."));
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchEnrollments();
        } catch (err) {
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          const errorCode = getApiErrorCode(err);
          if (errorCode === "ENROLLMENT_DELETE_BLOCKED") {
            toast.error(
              "لا يمكن حذف هذا التسجيل الدراسي لوجود سجلات أكاديمية مرتبطة به (مثل سجلات الحضور أو العلامات أو تاريخ النقل)."
            );
          } else {
            toast.error(parseApiError(err, "تعذر حذف التسجيل الدراسي."));
          }
        }
      },
    });
  };

  // =========================================================
  // GUARDIAN LINK HANDLERS
  // =========================================================
  const handleGuardianLinkSubmit = async (formData) => {
    const res = await api.students.createGuardianLink(formData);
    toast.success(getApiSuccessMessage(res, "تم ربط ولي الأمر بالطالب بنجاح."));
    fetchGuardianLinks();
  };

  const handleDeleteGuardianLink = (link) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "تأكيد فك ارتباط ولي الأمر",
      message: `هل أنت متأكد من حذف رابط ولي الأمر (${link.guardian_display || link.guardian_username}) بالطالب (${link.student_display})؟ لن يتم حذف حساب ولي الأمر أو الطالب.`,
      confirmText: "حذف الرابط",
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await api.students.deleteGuardianLink(link.id);
          toast.success(getApiSuccessMessage(res, "تم حذف رابط ولي الأمر بالطالب بنجاح."));
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchGuardianLinks();
        } catch (err) {
          setConfirmModalConfig((prev) => ({ ...prev, isLoading: false }));
          toast.error(parseApiError(err, "فشل حذف رابط ولي الأمر."));
        }
      },
    });
  };

  return (
    <div className="space-y-6 text-right dir-rtl" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-bold text-slate-900">
              إدارة شؤون الطلاب والتسجيل وأولياء الأمور
            </h2>
            {isReadOnly && (
              <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                <Lock className="w-3 h-3" />
                <span>قراءة فقط</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            دليل الطلاب الشامل، التسجيل والانتقال بين الشعب، وربط حسابات أولياء الأمور
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "students") fetchStudents(studentPage);
              if (activeTab === "enrollments") fetchEnrollments();
              if (activeTab === "guardians") fetchGuardianLinks();
            }}
            title="تحديث البيانات"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                studentsLoading || enrollmentsLoading || guardiansLoading
                  ? "animate-spin"
                  : ""
              }`}
            />
          </Button>

          {canImportStudents && activeTab === "students" && (
            <Button
              variant="outline"
              onClick={() => navigate(`${basePath}/students/import`)}
              className="gap-2 border-teal-600/30 text-teal-800 hover:bg-teal-50"
              title="استيراد وتحديث بيانات الطلاب عبر ملف Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>استيراد من Excel</span>
            </Button>
          )}

          {activeTab === "students" && (
            <Button
              variant="outline"
              onClick={handleExportStudents}
              disabled={isExportingStudents}
              className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
              title="تصدير قائمة الطلاب إلى ملف Excel مطابق لقالب النظام"
            >
              {isExportingStudents ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                  <span>
                    {exportProgress
                      ? `جاري التجميع (${exportProgress.current}/${exportProgress.total})`
                      : "جاري تجهيز البيانات..."}
                  </span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-teal-600" />
                  <span>تصدير إلى Excel</span>
                </>
              )}
            </Button>
          )}

          {canAddStudent && activeTab === "students" && (
            <Button
              onClick={() => {
                setIsRegistrationModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل طالب جديد</span>
            </Button>
          )}

          {canAddEnrollment && activeTab === "enrollments" && (
            <Button
              onClick={() => {
                setEditingEnrollment(null);
                setIsEnrollmentModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل طالب جديد</span>
            </Button>
          )}

          {canAddGuardianLink && activeTab === "guardians" && (
            <Button
              onClick={() => {
                fetchMetadata();
                setIsGuardianModalOpen(true);
              }}
              className="gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              <span>ربط ولي أمر</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-1 space-x-reverse overflow-x-auto">
        <button
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "students"
              ? "border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-xl"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>دليل الطلاب ({studentTotal})</span>
        </button>

        <button
          onClick={() => setActiveTab("enrollments")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "enrollments"
              ? "border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-xl"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <School className="w-4 h-4" />
          <span>التسجيلات والانتقالات ({enrollmentTotal})</span>
        </button>

        <button
          onClick={() => setActiveTab("guardians")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "guardians"
              ? "border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-xl"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>روابط أولياء الأمور ({guardianTotal})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: STUDENTS DIRECTORY */}
      {/* ========================================================= */}
      {activeTab === "students" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="البحث بالاسم، الأب، أو الكنية..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setStudentPage(1);
                  }}
                  className="w-full pr-8 pl-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {studentSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setStudentSearch("");
                      setStudentPage(1);
                    }}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                    title="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={studentGenderFilter}
                onChange={(e) => {
                  setStudentGenderFilter(e.target.value);
                  setStudentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">جميع الأجناس</option>
                <option value="male">ذكور</option>
                <option value="female">إناث</option>
              </select>

              <select
                value={studentActiveFilter}
                onChange={(e) => {
                  setStudentActiveFilter(e.target.value);
                  setStudentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">جميع الحالات</option>
                <option value="true">نشط فقط</option>
                <option value="false">معطل فقط</option>
              </select>
            </div>
          </div>

          {studentsError && <Alert type="error">{studentsError}</Alert>}

          {/* Students Table */}
          {studentsLoading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">جاري تحميل سجلات الطلاب...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-xs">
              لا توجد سجلات طلاب مطابقة للشروط.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-white font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">اسم الطالب الكامل</th>
                    <th className="py-3 px-4">اسم الأب</th>
                    <th className="py-3 px-4">اسم الأم</th>
                    <th className="py-3 px-4">تاريخ الميلاد</th>
                    <th className="py-3 px-4">الجنس</th>
                    <th className="py-3 px-4">الحالة</th>
                    {(canChangeStudent || canDeleteStudent || canViewProfile) && (
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>
                          <span>{st.full_name || `${st.first_name} ${st.last_name}`}</span>
                          {(st.first_name_en || st.last_name_en) && (
                            <span className="block text-[10px] font-mono font-normal text-slate-400 dir-ltr text-right">
                              {[st.first_name_en, st.last_name_en].filter(Boolean).join(" ")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{st.father_name || "-"}</td>
                      <td className="py-3 px-4 text-slate-700">{st.mother_name || "-"}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {st.birth_date || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={st.gender === "male" ? "info" : "purple"}>
                          {st.gender_display || (st.gender === "male" ? "ذكر" : "أنثى")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {st.is_active !== false ? (
                          <Badge variant="success">نشط</Badge>
                        ) : (
                          <Badge variant="danger">معطل</Badge>
                        )}
                      </td>
                      {(canChangeStudent || canDeleteStudent || canViewProfile) && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Comprehensive Profile Action */}
                            {canViewProfile && (
                              <button
                                onClick={() => navigate(`${basePath}/students/${st.id}/profile`)}
                                className="p-1 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                                title="الملف الشامل للطالب"
                              >
                                <FileText className="w-4 h-4 text-teal-600" />
                              </button>
                            )}

                            {/* Health Profile Action */}
                            {canChangeStudent && (
                              <button
                                onClick={() => {
                                  setSelectedHealthStudent(st);
                                  setIsHealthModalOpen(true);
                                }}
                                className="p-1 text-slate-600 hover:text-rose-600 rounded transition-colors"
                                title="عرض وتعديل الملف الصحي للطالب"
                              >
                                <HeartPulse className="w-4 h-4" />
                              </button>
                            )}

                            {/* Edit Student Info */}
                            {canChangeStudent && (
                              <button
                                onClick={() => {
                                  setEditingStudent(st);
                                  setIsStudentModalOpen(true);
                                }}
                                className="p-1 text-slate-600 hover:text-teal-600 rounded transition-colors"
                                title="تعديل بيانات الطالب"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {canChangeStudent && (
                              <button
                                onClick={() => handleToggleStudentActive(st)}
                                className={`p-1 rounded transition-colors ${
                                  st.is_active !== false
                                    ? "text-slate-600 hover:text-amber-600"
                                    : "text-slate-600 hover:text-emerald-600"
                                }`}
                                title={
                                  st.is_active !== false
                                    ? "تعطيل حساب الطالب"
                                    : "تفعيل حساب الطالب"
                                }
                              >
                                {st.is_active !== false ? (
                                  <PowerOff className="w-4 h-4" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </button>
                            )}

                            {canDeleteStudent && (
                              <button
                                onClick={() => handleDeleteStudent(st)}
                                className="p-1 text-slate-600 hover:text-rose-600 rounded transition-colors"
                                title="حذف الطالب"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={studentPage}
            totalCount={studentTotal}
            pageSize={20}
            onPageChange={(p) => setStudentPage(p)}
            hasNext={studentHasNext}
            hasPrevious={studentHasPrev}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ENROLLMENTS & TRANSFERS */}
      {/* ========================================================= */}
      {activeTab === "enrollments" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="البحث باسم الطالب أو الشعبة أو الصف..."
                  value={enrollmentSearch}
                  onChange={(e) => {
                    setEnrollmentSearch(e.target.value);
                    setEnrollmentPage(1);
                  }}
                  className="w-full pr-8 pl-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {enrollmentSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setEnrollmentSearch("");
                      setEnrollmentPage(1);
                    }}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                    title="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={enrollmentYearFilter}
                onChange={(e) => {
                  setEnrollmentYearFilter(e.target.value);
                  setEnrollmentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">جميع الأعوام الدراسية</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name || `${y.start_date} / ${y.end_date}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {enrollmentsError && <Alert type="error">{enrollmentsError}</Alert>}

          {/* Enrollments Table */}
          {enrollmentsLoading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">جاري تحميل تسجيلات الطلاب...</p>
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-xs">
              {enrollmentSearch.trim()
                ? "لا توجد تسجيلات طلاب مطابقة لمعايير البحث."
                : "لا توجد تسجيلات طلاب مسجلة حالياً."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-white font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">الطالب</th>
                    <th className="py-3 px-4">العام الدراسي</th>
                    <th className="py-3 px-4">الصف الدراسي</th>
                    <th className="py-3 px-4">الشعبة المقيد بها</th>
                    <th className="py-3 px-4">تاريخ التسجيل</th>
                    {(canChangeEnrollment || canTransferStudent || canDeleteEnrollment) && (
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedEnrollments.map((enr) => (
                    <tr key={enr.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{enr.student_display || enr.student?.full_name || enr.student}</span>
                          {canViewProfile && (enr.student_id || enr.student?.id || (typeof enr.student === "string" && enr.student.length > 20)) && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `${basePath}/students/${enr.student_id || enr.student?.id || enr.student}/profile`
                                )
                              }
                              className="p-1 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                              title="عرض الملف الشامل للطالب"
                            >
                              <FileText className="w-3.5 h-3.5 text-teal-600" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {enr.academic_year_display || enr.academic_year?.name || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {enr.grade_level_display || enr.grade_level?.name || "-"}
                      </td>
                      <td className="py-3 px-4 font-bold text-teal-800">
                        <span className="bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
                          {enr.section_display || enr.section?.name || enr.section}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {enr.enrollment_date || "-"}
                      </td>
                      {(canChangeEnrollment || canTransferStudent || canCorrectPlacement || canDeleteEnrollment) && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Transfer Student Action */}
                            {canTransferStudent && (
                              <button
                                onClick={() => {
                                  setTransferringEnrollment(enr);
                                  setIsTransferModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg flex items-center gap-1 transition-colors"
                                title="نقل إلى شعبة أخرى"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                <span>نقل إلى شعبة أخرى</span>
                              </button>
                            )}

                            {/* Correct Placement Action */}
                            {canCorrectPlacement && (
                              <button
                                onClick={() => {
                                  setCorrectingEnrollment(enr);
                                  setIsCorrectPlacementModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-1 transition-colors"
                                title="تصحيح الصف والشعبة"
                              >
                                <Layers className="w-3.5 h-3.5" />
                                <span>تصحيح الصف والشعبة</span>
                              </button>
                            )}

                            {/* Edit Enrollment */}
                            {canChangeEnrollment && (
                              <button
                                onClick={() => {
                                  setEditingEnrollment(enr);
                                  setIsEnrollmentModalOpen(true);
                                }}
                                className="p-1 text-slate-600 hover:text-teal-600 rounded transition-colors"
                                title="تعديل التسجيل"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete Enrollment */}
                            {canDeleteEnrollment && (
                              <button
                                onClick={() => handleDeleteEnrollment(enr)}
                                className="p-1 text-slate-600 hover:text-rose-600 rounded transition-colors"
                                title="حذف التسجيل"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={enrollmentPage}
            totalCount={filteredEnrollments.length}
            pageSize={ENROLLMENT_PAGE_SIZE}
            onPageChange={(p) => setEnrollmentPage(p)}
            hasNext={enrollmentPage < enrollmentTotalPages}
            hasPrevious={enrollmentPage > 1}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: GUARDIAN LINKS */}
      {/* ========================================================= */}
      {activeTab === "guardians" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="البحث باسم ولي الأمر أو اسم الطالب..."
                value={guardianSearch}
                onChange={(e) => {
                  setGuardianSearch(e.target.value);
                  setGuardianPage(1);
                }}
                className="w-full pr-8 pl-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {guardianSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setGuardianSearch("");
                    setGuardianPage(1);
                  }}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {guardiansError && <Alert type="error">{guardiansError}</Alert>}

          {/* Guardian Links Table */}
          {guardiansLoading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">جاري تحميل روابط أولياء الأمور...</p>
            </div>
          ) : filteredGuardianLinks.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-xs">
              {guardianSearch.trim()
                ? "لا توجد روابط أولياء أمور مطابقة لمعايير البحث."
                : "لا توجد روابط مسجلة بين أولياء الأمور والطلاب حالياً."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-white font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">ولي الأمر</th>
                    <th className="py-3 px-4">اسم المستخدم لولي الأمر</th>
                    <th className="py-3 px-4">الطالب المرتبط</th>
                    <th className="py-3 px-4">صلة القرابة</th>
                    <th className="py-3 px-4">حالة الرابط</th>
                    {canDeleteGuardianLink && <th className="py-3 px-4 text-center">الإجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedGuardianLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {link.guardian_display || link.guardian_username || "-"}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        @{link.guardian_username || "-"}
                      </td>
                      <td className="py-3 px-4 font-bold text-teal-800">
                        {link.student_display || link.student}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg text-xs font-semibold border border-slate-200">
                          {link.relationship || "ولي أمر"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {link.is_active !== false ? (
                          <Badge variant="success">نشط</Badge>
                        ) : (
                          <Badge variant="danger">معطل</Badge>
                        )}
                      </td>
                      {canDeleteGuardianLink && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteGuardianLink(link)}
                            className="p-1 text-slate-600 hover:text-rose-600 rounded transition-colors"
                            title="فك ارتباط ولي الأمر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={guardianPage}
            totalCount={filteredGuardianLinks.length}
            pageSize={GUARDIAN_PAGE_SIZE}
            onPageChange={(p) => setGuardianPage(p)}
            hasNext={guardianPage < guardianTotalPages}
            hasPrevious={guardianPage > 1}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* 0. Unified Student Registration Modal (POST /api/v1/students/register/) */}
      <StudentRegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
        onSuccess={() => {
          fetchStudents(1);
          fetchMetadata();
        }}
        onProceedToEnrollment={(newStudent) => {
          fetchStudents(1);
          fetchMetadata();
          setEditingEnrollment({
            student: newStudent?.id,
            student_display: newStudent?.full_name || `${newStudent?.first_name || ""} ${newStudent?.last_name || ""}`.trim(),
            father_name: newStudent?.father_name,
          });
          setIsEnrollmentModalOpen(true);
          setActiveTab("enrollments");
        }}
      />

      {/* 0.1 Student Health Profile Modal (GET & PATCH /api/v1/students/{id}/health-profile/) */}
      <StudentHealthProfileModal
        isOpen={isHealthModalOpen}
        onClose={() => {
          setIsHealthModalOpen(false);
          setSelectedHealthStudent(null);
        }}
        student={selectedHealthStudent}
      />

      {/* 1. Student Form Modal */}
      <StudentFormModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSubmit={handleStudentSubmit}
        initialStudent={editingStudent}
        onOpenHealthProfile={(st) => {
          setSelectedHealthStudent(st);
          setIsHealthModalOpen(true);
        }}
      />

      {/* 2. Enrollment Form Modal */}
      <EnrollmentFormModal
        isOpen={isEnrollmentModalOpen}
        onClose={() => {
          setIsEnrollmentModalOpen(false);
          setEditingEnrollment(null);
        }}
        onSubmit={handleEnrollmentSubmit}
        initialEnrollment={editingEnrollment}
        students={students}
        years={years}
        sections={sections}
        gradeLevels={gradeLevels}
      />

      {/* 3. Student Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferringEnrollment(null);
        }}
        onTransfer={handleTransferSubmit}
        enrollment={transferringEnrollment}
        sections={sections}
      />

      {/* 3b. Student Placement Correction Modal */}
      <CorrectPlacementModal
        isOpen={isCorrectPlacementModalOpen}
        onClose={() => {
          setIsCorrectPlacementModalOpen(false);
          setCorrectingEnrollment(null);
        }}
        onCorrectPlacement={handleCorrectPlacementSubmit}
        enrollment={correctingEnrollment}
        sections={sections}
        gradeLevels={gradeLevels}
      />

      {/* 4. Guardian Link Modal */}
      <GuardianLinkFormModal
        isOpen={isGuardianModalOpen}
        onClose={() => setIsGuardianModalOpen(false)}
        onSubmit={handleGuardianLinkSubmit}
        students={students}
        guardians={guardianUsers}
      />

      {/* 5. Generic Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalConfig.onConfirm}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        variant={confirmModalConfig.variant}
        isLoading={confirmModalConfig.isLoading}
      />

      {/* 6. Special Deactivation Fallback Modal (STUDENT_DELETE_BLOCKED) */}
      <ConfirmModal
        isOpen={deactivateFallbackConfig.isOpen}
        onClose={() => setDeactivateFallbackConfig({ isOpen: false, student: null, backendMessage: "", isLoading: false })}
        onConfirm={() => handleDeactivateStudentDirectly(deactivateFallbackConfig.student)}
        title="تعطيل الطالب بدلاً من الحذف"
        message={
          <div className="space-y-2">
            <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {deactivateFallbackConfig.backendMessage ||
                "لا يمكن حذف الطالب لوجود تسجيلات دراسية أو رابط ولي أمر أو سجل انتقال مرتبط به."}
            </p>
            <p className="text-xs text-slate-700 font-bold">
              هل ترغب في تعطيل حساب وسجل الطالب مع الاحتفاظ بكافة بياناته الأكاديمية والتاريخية؟
            </p>
          </div>
        }
        confirmText="تعطيل الطالب الآن"
        cancelText="إلغاء الأمر"
        variant="warning"
        isLoading={deactivateFallbackConfig.isLoading}
      />
    </div>
  );
}
