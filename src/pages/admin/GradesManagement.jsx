import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";
import { toast } from "sonner";
import { parseApiError, extractPaginatedList } from "../../utils/errorUtils";
import {
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  X,
  Send,
  Users,
  Info,
  Check,
  Clock,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Save,
  Edit3,
} from "lucide-react";
import {
  canCorrectPublishedGrades,
  normalizeRole,
} from "../../utils/permissionUtils";

export function GradesManagement() {
  const { user, hasPermission, hasAnyPermission, isSuperuser, requesterRole, permissions } = useAuthStore();

  const rawRole = normalizeRole(user?.role || requesterRole?.code);
  const isTeacher = rawRole === "teacher";

  const canAddAssessment =
    hasPermission("grades.add_assessment") || isSuperuser;
  const canChangeAssessment =
    hasPermission("grades.change_assessment") || isSuperuser;
  const canDeleteAssessment =
    hasPermission("grades.delete_assessment") || isSuperuser;
  const canCreateGradeWide =
    hasPermission("grades.create_grade_wide_assessment") || isSuperuser;
  const canChangeScore =
    hasPermission("grades.change_studentscore") || isSuperuser;
  const canPublish =
    hasPermission("grades.publish_grades") || isSuperuser;
  const canCorrectPublished =
    canCorrectPublishedGrades(user, requesterRole, permissions);
  const hasGeneralAccess =
    hasAnyPermission([
      "grades.view_assessment",
      "grades.add_assessment",
      "grades.change_assessment",
      "grades.delete_assessment",
      "grades.create_grade_wide_assessment",
      "grades.change_studentscore",
      "grades.publish_grades",
      "grades.correct_published_grades",
    ]) || isSuperuser;

  // Academics Structure Data
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [sections, setSections] = useState([]);
  const [gradeSubjects, setGradeSubjects] = useState([]);

  // Assessments State
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // Filters & Search
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedGradeLevel, setSelectedGradeLevel] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedGradeSubject, setSelectedGradeSubject] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ordering, setOrdering] = useState("-assessment_date");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState("single"); // "single" | "grade"
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Score Sheet State
  const [isScoreSheetOpen, setIsScoreSheetOpen] = useState(false);
  const [activeScoreSection, setActiveScoreSection] = useState({
    id: "",
    name: "",
  });
  const [activeScoreSectionPublished, setActiveScoreSectionPublished] =
    useState(false);
  const canEditCurrentScores = activeScoreSectionPublished
    ? canCorrectPublished
    : canChangeScore;
  const [scoreSheetAssessment, setScoreSheetAssessment] = useState(null);
  const [scoreRecords, setScoreRecords] = useState([]);
  const [isScoreSheetLoading, setIsScoreSheetLoading] = useState(false);
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [scoreSheetError, setScoreSheetError] = useState(null);

  // Publishing Modals
  const [isPublishSectionModalOpen, setIsPublishSectionModalOpen] =
    useState(false);
  const [publishSectionId, setPublishSectionId] = useState("");
  const [publishSectionTermId, setPublishSectionTermId] = useState("");
  const [isPublishGradeModalOpen, setIsPublishGradeModalOpen] = useState(false);
  const [publishGradeLevelId, setPublishGradeLevelId] = useState("");
  const [publishGradeTermId, setPublishGradeTermId] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Student Term Results Modal
  const [isStudentResultsModalOpen, setIsStudentResultsModalOpen] =
    useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [studentResultsData, setStudentResultsData] = useState(null);
  const [isStudentResultsLoading, setIsStudentResultsLoading] = useState(false);
  const [studentResultsError, setStudentResultsError] = useState(null);

  // Create Form Data
  const [formData, setFormData] = useState({
    grade_level: "",
    grade_subject: "",
    section: "",
    term: "",
    title: "",
    max_score: "20.00",
    assessment_date: new Date().toISOString().split("T")[0],
    allow_duplicate: false,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Initial Data Fetch
  const fetchAcademicContext = useCallback(async () => {
    try {
      const [yearsRes, termsRes, gradesRes, sectionsRes, gradeSubjectsRes] =
        await Promise.allSettled([
          api.academics.getYears(),
          api.academics.getTerms(),
          api.academics.getGradeLevels(),
          api.academics.getSections(),
          api.academics.getGradeSubjects(),
        ]);

      const yearsList =
        yearsRes.status === "fulfilled"
          ? extractPaginatedList(yearsRes.value)
          : [];
      const termsList =
        termsRes.status === "fulfilled"
          ? extractPaginatedList(termsRes.value)
          : [];
      const gradesList =
        gradesRes.status === "fulfilled"
          ? extractPaginatedList(gradesRes.value)
          : [];
      const sectionsList =
        sectionsRes.status === "fulfilled"
          ? extractPaginatedList(sectionsRes.value)
          : [];
      const gradeSubjectsList =
        gradeSubjectsRes.status === "fulfilled"
          ? extractPaginatedList(gradeSubjectsRes.value)
          : [];

      setAcademicYears(yearsList);
      setTerms(termsList);
      setGradeLevels(gradesList);
      setSections(sectionsList);
      setGradeSubjects(gradeSubjectsList);

      const activeYear = yearsList.find(
        (y) => y.is_active || y.status === "active",
      );
      if (activeYear && !selectedYear) {
        setSelectedYear(activeYear.id);
      }
      const activeTerm = termsList.find(
        (t) => t.status === "active" || t.is_active,
      );
      if (activeTerm && !selectedTerm) {
        setSelectedTerm(activeTerm.id);
        setPublishSectionTermId(activeTerm.id);
        setPublishGradeTermId(activeTerm.id);
        setFormData((prev) => ({ ...prev, term: activeTerm.id }));
      }
    } catch (err) {
      console.error("Error loading academic structure:", err);
    }
  }, [selectedYear, selectedTerm]);

  useEffect(() => {
    fetchAcademicContext();
  }, [fetchAcademicContext]);

  // Fetch Assessments List
  const fetchAssessments = useCallback(async () => {
    if (!hasGeneralAccess) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        academic_year: selectedYear || undefined,
        term: selectedTerm || undefined,
        grade_level: selectedGradeLevel || undefined,
        section: selectedSection || undefined,
        grade_subject: selectedGradeSubject || undefined,
        status: selectedStatus || undefined,
        assessment_date_from: dateFrom || undefined,
        assessment_date_to: dateTo || undefined,
        search: debouncedSearch || undefined,
        ordering: ordering || undefined,
        page: currentPage > 1 ? currentPage : undefined,
      };

      const res = await api.grades.getAssessments(params);
      const list = extractPaginatedList(res);

      const count = res?.data?.count ?? res?.count ?? list.count ?? list.length;
      const nextUrl = res?.data?.next ?? res?.next ?? list.next ?? null;
      const prevUrl =
        res?.data?.previous ?? res?.previous ?? list.previous ?? null;

      setAssessments(list);
      setTotalCount(count);
      setHasNext(Boolean(nextUrl));
      setHasPrevious(Boolean(prevUrl));

      if (currentPage === 1 && list.length > 0) {
        setPageSize(list.length);
      }
    } catch (err) {
      if (
        currentPage > 1 &&
        (err.response?.status === 404 ||
          String(err?.message || "").includes("صفحة غير صحيحة") ||
          String(err?.response?.data?.detail || "").includes("صفحة غير صحيحة"))
      ) {
        setCurrentPage(1);
        return;
      }
      const parsed = parseApiError(err, "فشل في تحميل قائمة التقييمات");
      setError(parsed);
      toast.error(parsed);
    } finally {
      setIsLoading(false);
    }
  }, [
    hasGeneralAccess,
    selectedYear,
    selectedTerm,
    selectedGradeLevel,
    selectedSection,
    selectedGradeSubject,
    selectedStatus,
    dateFrom,
    dateTo,
    debouncedSearch,
    ordering,
    currentPage,
  ]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Dependent Options for Dropdowns
  const availableTerms = useMemo(() => {
    if (!selectedYear) return terms;
    return terms.filter((t) => t.academic_year === selectedYear);
  }, [terms, selectedYear]);

  const availableSections = useMemo(() => {
    const targetGrade = formData.grade_level || selectedGradeLevel;
    if (!targetGrade) return sections;
    return sections.filter((s) => s.grade_level === targetGrade);
  }, [sections, formData.grade_level, selectedGradeLevel]);

  const availableGradeSubjects = useMemo(() => {
    const targetGrade = formData.grade_level || selectedGradeLevel;
    if (!targetGrade) return gradeSubjects;
    return gradeSubjects.filter((gs) => gs.grade_level === targetGrade);
  }, [gradeSubjects, formData.grade_level, selectedGradeLevel]);

  // Open Create Modal
  const handleOpenCreateModal = (mode = "single") => {
    setCreateMode(mode);
    setModalError(null);
    const initialGrade = selectedGradeLevel || gradeLevels[0]?.id || "";
    setFormData({
      grade_level: initialGrade,
      grade_subject: selectedGradeSubject || "",
      section: selectedSection || sections[0]?.id || "",
      term: selectedTerm || terms[0]?.id || "",
      title: "",
      max_score: "20.00",
      assessment_date: new Date().toISOString().split("T")[0],
      allow_duplicate: false,
    });
    setIsCreateModalOpen(true);
  };

  // Submit Create Assessment
  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!formData.grade_subject) {
      setModalError("يرجى اختيار المادة المقررة.");
      return;
    }
    if (!formData.term) {
      setModalError("يرجى اختيار الفصل الدراسي.");
      return;
    }
    if (!formData.title.trim()) {
      setModalError("يرجى إدخال عنوان التقييم.");
      return;
    }
    if (!formData.max_score || parseFloat(formData.max_score) <= 0) {
      setModalError("يرجى إدخال درجة قصوى صحيحة أكبر من الصفر.");
      return;
    }
    if (createMode === "single" && !formData.section) {
      setModalError("يرجى تحديد الشعبة الدراسية للتقييم.");
      return;
    }

    setModalSubmitting(true);
    try {
      if (createMode === "grade") {
        await api.grades.createAssessmentForGrade({
          grade_subject: formData.grade_subject,
          term: formData.term,
          title: formData.title.trim(),
          max_score: parseFloat(formData.max_score).toFixed(2),
          assessment_date: formData.assessment_date,
          allow_duplicate: formData.allow_duplicate,
        });
        toast.success("تم إنشاء التقييم بنجاح وربطه بكافة شعب الصف.");
      } else {
        await api.grades.createAssessment({
          section: formData.section,
          grade_subject: formData.grade_subject,
          term: formData.term,
          title: formData.title.trim(),
          max_score: parseFloat(formData.max_score).toFixed(2),
          assessment_date: formData.assessment_date,
          allow_duplicate: formData.allow_duplicate,
        });
        toast.success("تم إنشاء التقييم وربطه بالشعبة المحددة بنجاح.");
      }

      setIsCreateModalOpen(false);
      fetchAssessments();
    } catch (err) {
      const parsed = parseApiError(err, "فشل إنشاء التقييم");
      setModalError(parsed);
      toast.error(parsed);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (assessment) => {
    const hasPublished =
      Array.isArray(assessment.sections) &&
      assessment.sections.some((s) => s.status === "published");

    if (hasPublished) {
      toast.error("لا يمكن تعديل تعريف التقييم بعد نشره في أي شعبة.");
      return;
    }

    setSelectedAssessment(assessment);
    setModalError(null);
    setFormData({
      title: assessment.title || "",
      max_score: String(assessment.max_score || "20.00"),
      assessment_date:
        assessment.assessment_date || new Date().toISOString().split("T")[0],
      allow_duplicate: false,
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Assessment
  const handleEditAssessment = async (e) => {
    e.preventDefault();
    if (!selectedAssessment) return;
    setModalError(null);

    setModalSubmitting(true);
    try {
      await api.grades.patchAssessment(selectedAssessment.id, {
        title: formData.title.trim(),
        max_score: parseFloat(formData.max_score).toFixed(2),
        assessment_date: formData.assessment_date,
      });
      toast.success("تم تحديث بيانات التقييم بنجاح.");
      setIsEditModalOpen(false);
      fetchAssessments();
    } catch (err) {
      const parsed = parseApiError(err, "فشل تعديل التقييم");
      setModalError(parsed);
      toast.error(parsed);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Delete Assessment
  const handleDeleteAssessment = async () => {
    if (!selectedAssessment) return;
    setModalSubmitting(true);
    setModalError(null);

    try {
      await api.grades.deleteAssessment(selectedAssessment.id);
      toast.success("تم حذف التقييم بنجاح.");
      setIsDeleteModalOpen(false);
      fetchAssessments();
    } catch (err) {
      const parsed = parseApiError(
        err,
        "فشل حذف التقييم. تأكد أن جميع الشعب مسودة ولا توجد علامات مرصودة للطلاب.",
      );
      setModalError(parsed);
      toast.error(parsed);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Open Score Sheet for a specific Section
  const handleOpenScoreSheet = async (assessment, sec) => {
    const sectionUuid = sec.section || sec.id;
    const sectionName = sec.name || "الشعبة";
    const initialPublished =
      sec.status === "published" ||
      sec.is_published === true ||
      assessment.status === "published";

    setScoreSheetAssessment(assessment);
    setActiveScoreSection({ id: sectionUuid, name: sectionName });
    setActiveScoreSectionPublished(Boolean(initialPublished));
    setIsScoreSheetOpen(true);
    setIsScoreSheetLoading(true);
    setScoreSheetError(null);
    setScoreRecords([]);

    try {
      // GET /grades/assessments/{ASSESSMENT_UUID}/scores/?section={SECTION_UUID}
      const res = await api.grades.getScores(assessment.id, sectionUuid);

      // Check published status from backend response
      if (
        res?.data?.section?.status === "published" ||
        res?.data?.status === "published" ||
        res?.data?.is_published
      ) {
        setActiveScoreSectionPublished(true);
      }

      // Handle raw records from response: data.records
      const rawRecords =
        res?.data?.records ||
        res?.records ||
        (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);

      // If backend returned latest assessment details, update assessment state
      if (res?.data?.assessment) {
        setScoreSheetAssessment((prev) => ({
          ...prev,
          ...res.data.assessment,
        }));
      }

      // Map student records into editable state
      const initialRecords = rawRecords.map((item) => {
        const enrollmentId = item.enrollment;
        const studentId = item.student;
        const fullName = item.student_display || "طالب";
        const existingScore =
          item.score !== null && item.score !== undefined
            ? String(item.score)
            : "";

        return {
          enrollment: enrollmentId,
          student: studentId,
          student_name: fullName,
          national_id:
            item.national_id ||
            (studentId ? `${String(studentId).slice(0, 8)}...` : "—"),
          score_input: existingScore,
          score: item.score,
          updated_at: item.updated_at,
          updated_by: item.updated_by,
          updated_by_username: item.updated_by_username,
        };
      });

      setScoreRecords(initialRecords);
    } catch (err) {
      const parsed = parseApiError(err, "فشل في تحميل كشف درجات الطلاب");
      setScoreSheetError(parsed);
      toast.error(parsed);
    } finally {
      setIsScoreSheetLoading(false);
    }
  };

  // Score Input Change
  const handleScoreInputChange = (enrollmentId, val) => {
    setScoreRecords((prev) =>
      prev.map((rec) =>
        rec.enrollment === enrollmentId ? { ...rec, score_input: val } : rec,
      ),
    );
  };

  // Bulk Save Scores
  const handleSaveScores = async () => {
    if (!scoreSheetAssessment || !activeScoreSection.id) return;
    setIsSavingScores(true);
    setScoreSheetError(null);

    try {
      const maxScoreNum = parseFloat(scoreSheetAssessment.max_score) || 100;

      for (const rec of scoreRecords) {
        if (rec.score_input !== "" && rec.score_input !== null) {
          const num = parseFloat(rec.score_input);
          if (isNaN(num) || num < 0 || num > maxScoreNum) {
            throw new Error(
              `العلامة المدخلة للطالب "${rec.student_name}" غير صالحة (${rec.score_input}). يجب أن تكون بين 0 و ${maxScoreNum}`,
            );
          }
        }
      }

      // POST /grades/assessments/{ASSESSMENT_UUID}/scores/bulk/
      const payloadRecords = scoreRecords.map((rec) => {
        let finalScore = null;
        if (rec.score_input !== "" && rec.score_input !== null) {
          const num = parseFloat(rec.score_input);
          finalScore = isNaN(num) ? null : num.toFixed(2);
        }
        return {
          enrollment: rec.enrollment,
          score: finalScore,
        };
      });

      await api.grades.bulkSaveScores(
        scoreSheetAssessment.id,
        activeScoreSection.id,
        payloadRecords,
      );

      if (activeScoreSectionPublished) {
        toast.success(
          "تم حفظ وتصحيح درجات الطلاب المنشورة بنجاح وتوثيق التعديل في سجل التدقيق.",
        );
      } else {
        toast.success("تم حفظ وتحديث علامات الطلاب بنجاح.");
      }

      handleOpenScoreSheet(scoreSheetAssessment, {
        section: activeScoreSection.id,
        name: activeScoreSection.name,
        status: activeScoreSectionPublished ? "published" : "draft",
      });
      fetchAssessments();
    } catch (err) {
      const parsed = parseApiError(err, err.message || "فشل في حفظ العلامات");
      setScoreSheetError(parsed);
      toast.error(parsed);
    } finally {
      setIsSavingScores(false);
    }
  };

  // Score Sheet Statistics
  const scoreStats = useMemo(() => {
    const total = scoreRecords.length;
    let recordedCount = 0;
    let nullCount = 0;
    let sum = 0;

    scoreRecords.forEach((rec) => {
      if (rec.score_input === "" || rec.score_input === null) {
        nullCount += 1;
      } else {
        const val = parseFloat(rec.score_input);
        if (!isNaN(val)) {
          recordedCount += 1;
          sum += val;
        } else {
          nullCount += 1;
        }
      }
    });

    const average =
      recordedCount > 0 ? (sum / recordedCount).toFixed(2) : "0.00";

    return { total, recordedCount, nullCount, average };
  }, [scoreRecords]);

  // Publish Section Action
  // Publish Section Action
  const handlePublishSection = async () => {
    if (!publishSectionId || !publishSectionTermId) {
      toast.error("يرجى اختيار الشعبة والفصل الدراسي للنشر.");
      return;
    }

    setIsPublishing(true);
    try {
      const res = await api.grades.publishSection(
        publishSectionId,
        publishSectionTermId,
      );
      const payloadData = res?.data || res;
      const pubCount =
        payloadData?.published_count ?? res?.published_count ?? 0;
      const skipCount =
        payloadData?.skipped_future_count ?? res?.skipped_future_count ?? 0;

      if (pubCount > 0) {
        toast.success(
          `تم نشر نتائج الشعبة بنجاح (${pubCount} تقييم منشور)${
            skipCount > 0
              ? ` — تم استثناء ${skipCount} تقييم لأن تاريخه مستقبلي`
              : ""
          }`,
        );
      } else if (skipCount > 0) {
        toast.warning(
          `لم يتم النشر! تم استثناء (${skipCount}) تقييم لأن تاريخ التقييم يقع في المستقبل بعد تاريخ اليوم. نظام السيرفر يمنع نشر التقييمات المستقبلية. قم بتعديل تاريخ التقييم لليوم أو تاريخ سابق لنشره فوراً.`,
          { duration: 9000 },
        );
      } else {
        toast.info(
          "لم يتم العثور على تقييمات مسودة لنشرها لهذه الشعبة ضمن هذا الفصل.",
        );
      }

      setIsPublishSectionModalOpen(false);
      fetchAssessments();
    } catch (err) {
      toast.error(parseApiError(err, "فشل في نشر نتائج الشعبة"));
    } finally {
      setIsPublishing(false);
    }
  };

  // Publish Grade Action
  const handlePublishGrade = async () => {
    if (!publishGradeLevelId || !publishGradeTermId) {
      toast.error("يرجى اختيار الصف والفصل الدراسي للنشر.");
      return;
    }

    setIsPublishing(true);
    try {
      const res = await api.grades.publishGrade(
        publishGradeLevelId,
        publishGradeTermId,
      );
      const payloadData = res?.data || res;
      const pubCount =
        payloadData?.published_count ?? res?.published_count ?? 0;
      const skipCount =
        payloadData?.skipped_future_count ?? res?.skipped_future_count ?? 0;

      if (pubCount > 0) {
        toast.success(
          `تم نشر نتائج كافة شعب الصف بنجاح (${pubCount} تقييم منشور)${
            skipCount > 0
              ? ` — تم استثناء ${skipCount} تقييم مستقبلي`
              : ""
          }`,
        );
      } else if (skipCount > 0) {
        toast.warning(
          `لم يتم النشر! تم استثناء (${skipCount}) تقييم لأن تاريخها يقع في المستقبل. قم بتعديل تاريخ التقييم ليصبح تاريخ اليوم أو سابقاً لنشره.`,
          { duration: 9000 },
        );
      } else {
        toast.info(
          "لم يتم العثور على تقييمات مسودة لنشرها لهذا الصف ضمن هذا الفصل.",
        );
      }

      setIsPublishGradeModalOpen(false);
      fetchAssessments();
    } catch (err) {
      toast.error(parseApiError(err, "فشل في نشر نتائج الصف الدراسي"));
    } finally {
      setIsPublishing(false);
    }
  };

  // Open Student Results Breakdown
  const handleOpenStudentResults = async (enrollmentId, studentName) => {
    setSelectedStudentName(studentName);
    setIsStudentResultsModalOpen(true);
    setIsStudentResultsLoading(true);
    setStudentResultsError(null);
    setStudentResultsData(null);

    try {
      const res = await api.grades.getStudentResults(
        enrollmentId,
        selectedTerm || terms[0]?.id,
      );
      setStudentResultsData(res);
    } catch (err) {
      setStudentResultsError(parseApiError(err, "فشل في جلب نتائج الطالب"));
    } finally {
      setIsStudentResultsLoading(false);
    }
  };

  // Access Control Guard
  if (!hasGeneralAccess) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-red-900">غير مصرح بالدخول</h2>
          <p className="text-sm text-red-700 max-w-md mx-auto">
            عفواً، لا تملك الصلاحية للوصول إلى نظام إدارة العلامات والتقييمات.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-5 sm:p-7 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
            <BookOpen className="w-7 h-7 text-teal-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              العلامات والتقييمات الأكاديمية
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 font-medium">
              إدارة الاختبارات والتقييمات، رصد درجات الطلاب للشعب، ونشر النتائج
              المعتمدة.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {canAddAssessment && (
            <Button
              onClick={() => handleOpenCreateModal("single")}
              className="bg-teal-600 hover:bg-teal-500 hover:bg-teal-50 font-black px-4 py-2.5 rounded-xl shadow-md text-xs sm:text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-teal-700" />
              <span>تقييم لشعبة</span>
            </Button>
          )}

          {canCreateGradeWide && (
            <Button
              onClick={() => handleOpenCreateModal("grade")}
              className="bg-teal-600 hover:bg-teal-500 text-white font-black px-4 py-2.5 rounded-xl border border-teal-400/50 shadow-md text-xs sm:text-sm flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-teal-200" />
              <span>تقييم لكافة شعب الصف</span>
            </Button>
          )}

          {canPublish && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setPublishSectionId(selectedSection || sections[0]?.id || "");
                  setPublishSectionTermId(selectedTerm || terms[0]?.id || "");
                  setIsPublishSectionModalOpen(true);
                }}
                className="bg-emerald-600 text-white hover:bg-emerald-500 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>نشر شعبة</span>
              </Button>

              <Button
                onClick={() => {
                  setPublishGradeLevelId(
                    selectedGradeLevel || gradeLevels[0]?.id || "",
                  );
                  setPublishGradeTermId(selectedTerm || terms[0]?.id || "");
                  setIsPublishGradeModalOpen(true);
                }}
                className="bg-amber-600 text-white hover:bg-amber-500 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>نشر صف</span>
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            onClick={fetchAssessments}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 px-3 py-2.5 rounded-xl text-xs"
            title="تحديث البيانات"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Year */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              السنة الدراسية
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">جميع السنوات</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_active ? "(الحالية)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Term */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              الفصل الدراسي
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => {
                setSelectedTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">جميع الفصول</option>
              {availableTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  الفصل {t.number_display}{" "}
                  {t.status === "active" ? "(النشط)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              الصف الدراسي
            </label>
            <select
              value={selectedGradeLevel}
              onChange={(e) => {
                setSelectedGradeLevel(e.target.value);
                setSelectedSection("");
                setSelectedGradeSubject("");
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">جميع الصفوف</option>
              {gradeLevels.map((gl) => (
                <option key={gl.id} value={gl.id}>
                  {gl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              الشعبة الدراسية
            </label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">كافة الشعب</option>
              {availableSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name} ({sec.grade_level_display})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بعنوان التقييم أو التاريخ..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-teal-500"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-44">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">جميع الحالات</option>
              <option value="draft">مسودة (Draft)</option>
              <option value="published">منشور (Published)</option>
            </select>
          </div>

          <Button
            variant="outline"
            onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            className={`text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 border-slate-200 ${
              isFilterDrawerOpen
                ? "bg-teal-50 text-teal-700 border-teal-300"
                : "text-slate-700"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>فلاتر متقدمة</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${isFilterDrawerOpen ? "rotate-180" : ""}`}
            />
          </Button>

          {(selectedYear ||
            selectedTerm ||
            selectedGradeLevel ||
            selectedSection ||
            selectedStatus ||
            searchInput ||
            dateFrom ||
            dateTo) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedYear("");
                setSelectedTerm("");
                setSelectedGradeLevel("");
                setSelectedSection("");
                setSelectedGradeSubject("");
                setSelectedStatus("");
                setDateFrom("");
                setDateTo("");
                setSearchInput("");
                setCurrentPage(1);
              }}
              className="text-xs text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl font-bold"
            >
              إعادة ضبط
            </Button>
          )}
        </div>

        {/* Collapsible Advanced Filters */}
        {isFilterDrawerOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3 border-t border-slate-100 bg-slate-50 p-3.5 rounded-xl">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">
                من تاريخ التقييم
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">
                إلى تاريخ التقييم
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">
                الترتيب
              </label>
              <select
                value={ordering}
                onChange={(e) => {
                  setOrdering(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
              >
                <option value="-assessment_date">التاريخ (الأحدث أولاً)</option>
                <option value="assessment_date">التاريخ (الأقدم أولاً)</option>
                <option value="-created_at">تاريخ الإنشاء (الأحدث)</option>
                <option value="title">العنوان أ - ي</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Assessments Cards */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">
            جارٍ تحميل التقييمات...
          </p>
        </div>
      ) : error ? (
        <Alert variant="danger" title="خطأ في تحميل البيانات">
          {error}
        </Alert>
      ) : assessments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto border border-teal-100 shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">
              لا توجد تقييمات مطابقة
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              لم يتم العثور على أي تقييمات بناءً على الفلاتر المحددة.
            </p>
          </div>
          {canAddAssessment && (
            <div className="flex justify-center gap-3 pt-2">
              <Button
                onClick={() => handleOpenCreateModal("single")}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-sm"
              >
                إنشاء تقييم الآن
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assessments.map((assessment) => {
              const assessmentSections = Array.isArray(assessment.sections)
                ? assessment.sections
                : [];
              const hasAnyPublished = assessmentSections.some(
                (s) => s.status === "published",
              );
              const allPublished =
                assessmentSections.length > 0 &&
                assessmentSections.every((s) => s.status === "published");
              const isFutureDate =
                assessment.assessment_date &&
                assessment.assessment_date >
                  new Date().toISOString().split("T")[0];

              return (
                <div
                  key={assessment.id}
                  className="bg-white border-2 border-slate-200 hover:border-teal-400 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  {/* Top Row: Direct Schema Properties */}
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <span className="px-2.5 py-0.5 bg-teal-100 text-teal-900 text-[11px] font-black rounded-lg border border-teal-300">
                            {assessment.subject_display}
                          </span>
                          {assessment.grade_level_display && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200">
                              {assessment.grade_level_display}
                            </span>
                          )}
                          {isFutureDate && (
                            <span
                              className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black rounded-lg"
                              title="التقييمات المستقبلية لا يمكن نشرها حتى يحين موعدها أو يتم تعديل تاريخها لتاريخ اليوم"
                            >
                              ⏳ مستقبلي
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-slate-900 leading-snug">
                          {assessment.title}
                        </h3>
                      </div>

                      <div className="text-left shrink-0">
                        <div className="px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-center shadow-2xs">
                          <span className="block text-[9px] font-bold text-amber-700">
                            الدرجة القصوى
                          </span>
                          <span className="text-sm font-black text-amber-900">
                            {assessment.max_score}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" />
                        <span>{assessment.assessment_date}</span>
                      </div>
                      {assessment.term_display && (
                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{assessment.term_display}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Sections & Direct Evaluate Buttons */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-black text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-teal-700" />
                        <span>
                          الشعب المرتبطة ({assessmentSections.length})
                        </span>
                      </span>

                      {hasAnyPublished ? (
                        <span className="text-emerald-700 font-extrabold text-[11px] flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          {allPublished ? "منشور بالكامل" : "نشر جزئي"}
                        </span>
                      ) : (
                        <span className="text-amber-800 font-bold text-[11px] flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          مسودة
                        </span>
                      )}
                    </div>

                    {assessmentSections.length > 0 ? (
                      <div className="space-y-2">
                        {assessmentSections.map((sec, idx) => {
                          const isSecPublished = sec.status === "published";

                          return (
                            <div
                              key={sec.id || idx}
                              className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs hover:border-teal-400 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${isSecPublished ? "bg-emerald-500" : "bg-amber-500"}`}
                                />
                                <div>
                                  <span className="font-black text-xs text-slate-900 block">
                                    {sec.name}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold ${
                                      isSecPublished
                                        ? "text-emerald-700"
                                        : "text-amber-700"
                                    }`}
                                  >
                                    {isSecPublished ? "منشور" : "مسودة"}
                                  </span>
                                </div>
                              </div>

                              {isSecPublished ? (
                                canCorrectPublished ? (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleOpenScoreSheet(assessment, sec)
                                    }
                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>تصحيح الدرجات</span>
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleOpenScoreSheet(assessment, sec)
                                    }
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                                    <span>عرض الدرجات</span>
                                  </Button>
                                )
                              ) : canChangeScore ? (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleOpenScoreSheet(assessment, sec)
                                  }
                                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>رصد الدرجات</span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleOpenScoreSheet(assessment, sec)
                                  }
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                                  <span>عرض الدرجات</span>
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-1">
                        لا توجد شعب مرتبطة بهذا التقييم
                      </p>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-medium font-mono">
                      {assessment.created_by_username
                        ? `بواسطة: ${assessment.created_by_username}`
                        : ""}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {canChangeAssessment && (
                        <button
                          onClick={() => handleOpenEditModal(assessment)}
                          disabled={hasAnyPublished}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${
                            hasAnyPublished
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : "bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border-slate-200 hover:border-teal-300"
                          }`}
                          title={
                            hasAnyPublished
                              ? "لا يمكن تعديل تعريف التقييم بعد نشره في أي شعبة"
                              : "تعديل تعريف التقييم"
                          }
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>تعديل</span>
                        </button>
                      )}

                      {canDeleteAssessment && (
                        <button
                          onClick={() => {
                            setSelectedAssessment(assessment);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 hover:border-rose-300 text-xs transition-all"
                          title="حذف التقييم"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={pageSize}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              onPageChange={(page) => setCurrentPage(page)}
              itemName="تقييم"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE ASSESSMENT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !modalSubmitting && setIsCreateModalOpen(false)}
        title={
          createMode === "grade"
            ? "إنشاء تقييم لكافة شعب الصف"
            : "إنشاء تقييم لشعبة محددة"
        }
      >
        <form
          onSubmit={handleCreateAssessment}
          className="space-y-4 text-right"
        >
          {modalError && (
            <Alert variant="danger" title="خطأ">
              {modalError}
            </Alert>
          )}

          {canCreateGradeWide && (
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCreateMode("single")}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                  createMode === "single"
                    ? "bg-white text-teal-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                شعبة واحدة
              </button>
              <button
                type="button"
                onClick={() => setCreateMode("grade")}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                  createMode === "grade"
                    ? "bg-white text-teal-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                كافة شعب الصف (دفعة واحدة)
              </button>
            </div>
          )}

          {/* Grade Level */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              الصف الدراسي *
            </label>
            <select
              value={formData.grade_level}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  grade_level: e.target.value,
                  grade_subject: "",
                  section: "",
                });
              }}
              required
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">-- اختر الصف الدراسي --</option>
              {gradeLevels.map((gl) => (
                <option key={gl.id} value={gl.id}>
                  {gl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Subject */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              المادة المقررة *
            </label>
            <select
              value={formData.grade_subject}
              onChange={(e) =>
                setFormData({ ...formData, grade_subject: e.target.value })
              }
              required
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">-- اختر المادة --</option>
              {availableGradeSubjects.map((gs) => (
                <option key={gs.id} value={gs.id}>
                  {gs.subject_display} ({gs.grade_level_display})
                </option>
              ))}
            </select>
          </div>

          {/* Section (Only for Single Section Mode) */}
          {createMode === "single" && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                الشعبة الدراسية *
              </label>
              <select
                value={formData.section}
                onChange={(e) =>
                  setFormData({ ...formData, section: e.target.value })
                }
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- اختر الشعبة --</option>
                {availableSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} ({sec.grade_level_display})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Term */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              الفصل الدراسي *
            </label>
            <select
              value={formData.term}
              onChange={(e) =>
                setFormData({ ...formData, term: e.target.value })
              }
              required
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">-- اختر الفصل --</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  الفصل {t.number_display}{" "}
                  {t.status === "active" ? "(النشط)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              عنوان التقييم *
            </label>
            <input
              type="text"
              placeholder="مثال: مذاكرة أولى، الفحص النصفي، تسميع شفهي..."
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Max Score & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                الدرجة القصوى *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                placeholder="20.00"
                value={formData.max_score}
                onChange={(e) =>
                  setFormData({ ...formData, max_score: e.target.value })
                }
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                تاريخ التقييم *
              </label>
              <input
                type="date"
                value={formData.assessment_date}
                onChange={(e) =>
                  setFormData({ ...formData, assessment_date: e.target.value })
                }
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Allow Duplicate */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="allow_duplicate"
              checked={formData.allow_duplicate}
              onChange={(e) =>
                setFormData({ ...formData, allow_duplicate: e.target.checked })
              }
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
            <label
              htmlFor="allow_duplicate"
              className="text-xs font-bold text-slate-700 cursor-pointer"
            >
              السماح بتكرار نفس اسم التقييم في الفصل الحالي
            </label>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={modalSubmitting}
              className="text-xs px-4 py-2 rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={modalSubmitting}
              className="bg-teal-700 hover:bg-teal-800 text-white font-black text-xs px-5 py-2 rounded-xl flex items-center gap-2 shadow-sm"
            >
              {modalSubmitting && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>
                {createMode === "grade" ? "إنشاء لكافة الشعب" : "إنشاء التقييم"}
              </span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT ASSESSMENT DEFINITION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !modalSubmitting && setIsEditModalOpen(false)}
        title="تعديل تعريف التقييم"
      >
        <form onSubmit={handleEditAssessment} className="space-y-4 text-right">
          {modalError && (
            <Alert variant="danger" title="خطأ">
              {modalError}
            </Alert>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              عنوان التقييم *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                الدرجة القصوى *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                value={formData.max_score}
                onChange={(e) =>
                  setFormData({ ...formData, max_score: e.target.value })
                }
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                تاريخ التقييم *
              </label>
              <input
                type="date"
                value={formData.assessment_date}
                onChange={(e) =>
                  setFormData({ ...formData, assessment_date: e.target.value })
                }
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={modalSubmitting}
              className="text-xs px-4 py-2 rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={modalSubmitting}
              className="bg-teal-700 hover:bg-teal-800 text-white font-black text-xs px-5 py-2 rounded-xl flex items-center gap-2 shadow-sm"
            >
              {modalSubmitting && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>حفظ التعديلات</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !modalSubmitting && setIsDeleteModalOpen(false)}
        title="تأكيد حذف التقييم"
      >
        <div className="space-y-4 text-right">
          {modalError && (
            <Alert variant="danger" title="تعذر الحذف">
              {modalError}
            </Alert>
          )}

          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-900 text-xs space-y-2">
            <p className="font-black text-sm">
              هل أنت متأكد من حذف التقييم &quot;{selectedAssessment?.title}
              &quot;؟
            </p>
            <p>
              شروط الحذف: يجب أن تكون كافة الشعب مسودة (Draft) ولا توجد أي
              علامات مدخلة للطلاب.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={modalSubmitting}
              className="text-xs px-4 py-2 rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleDeleteAssessment}
              disabled={modalSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-5 py-2 rounded-xl flex items-center gap-2 shadow-sm"
            >
              {modalSubmitting && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>تأكيد الحذف</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: SCORE SHEET */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isScoreSheetOpen}
        onClose={() => !isSavingScores && setIsScoreSheetOpen(false)}
        title={`كشف رصد العلامات: ${scoreSheetAssessment?.title || ""} - (${activeScoreSection?.name || ""})`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-right">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-black text-white">
                  {scoreSheetAssessment?.title}
                </span>
                <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-200 border border-teal-400/40 rounded-lg text-xs font-black">
                  {scoreSheetAssessment?.subject_display}
                </span>
                {activeScoreSectionPublished ? (
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-lg text-xs font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    منشور رسمياً
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded-lg text-xs font-black flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    مسودة (غير منشور)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-medium">
                الشعبة:{" "}
                <span className="font-bold text-teal-300">
                  {activeScoreSection?.name}
                </span>{" "}
                | التاريخ: {scoreSheetAssessment?.assessment_date}
              </p>
            </div>

            <div className="px-4 py-2 bg-amber-400 text-amber-950 rounded-xl text-center font-black shadow-md">
              <span className="block text-[10px] tracking-wider uppercase">
                الدرجة القصوى
              </span>
              <span className="text-base font-black">
                {scoreSheetAssessment?.max_score}
              </span>
            </div>
          </div>

          {/* KPI Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center shadow-2xs">
              <span className="block text-xs font-bold text-slate-500">
                إجمالي الطلاب
              </span>
              <span className="text-lg font-black text-slate-900">
                {scoreStats.total}
              </span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center shadow-2xs">
              <span className="block text-xs font-bold text-emerald-700">
                تم الرصد
              </span>
              <span className="text-lg font-black text-emerald-800">
                {scoreStats.recordedCount}
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center shadow-2xs">
              <span className="block text-xs font-bold text-amber-700">
                غير مرصود / غائب
              </span>
              <span className="text-lg font-black text-amber-900">
                {scoreStats.nullCount}
              </span>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center shadow-2xs">
              <span className="block text-xs font-bold text-teal-700">
                متوسط الشعبة
              </span>
              <span className="text-lg font-black text-teal-900">
                {scoreStats.average}
              </span>
            </div>
          </div>

          {scoreSheetError && (
            <Alert variant="danger" title="تنبيه">
              {scoreSheetError}
            </Alert>
          )}

          {/* Permission / Status Alert Banner */}
          {activeScoreSectionPublished ? (
            isTeacher ? (
              <Alert variant="danger" title="الدرجات منشورة رسمياً - التعديل مقفل للمعلم">
                تم نشر درجات هذه الشعبة رسمياً، وتم قفل إمكانية التعديل والرصد للمعلمين. إذا كانت هناك حاجة لتصحيح درجة منشورة، يرجى مراجعة إدارة المدرسة أو الموجّه المختص.
              </Alert>
            ) : !canCorrectPublished ? (
              <Alert variant="warning" title="الدرجات منشورة رسمياً - يلزم صلاحية تصحيح علامات منشورة">
                كشف درجات هذه الشعبة منشور رسمياً. لتعديل أي علامة منشورة يلزم توفر صلاحية "تصحيح العلامات المنشورة" (grades.correct_published_grades). يمكنك فقط عرض العلامات بوضع القراءة.
              </Alert>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 font-medium shadow-2xs">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black block text-amber-950 mb-0.5">
                    وضع تصحيح العلامات المنشورة (مفعل بصلاحية خاصة)
                  </span>
                  <span>
                    الدرجات منشورة رسمياً للطلاب وأولياء الأمور. يُسمح لك بالتعديل بصفتك مخوّلاً، وسيتم توثيق أي تصحيح تلقائياً في سجل التدقيق (Audit Log) متضمناً اسمك وتاريخ التعديل والقيم السابقة والجديدة.
                  </span>
                </div>
              </div>
            )
          ) : !canChangeScore ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2 font-medium">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>أنت تشاهد كشف درجات الشعبة بوضع القراءة فقط (لا تملك صلاحية رصد وتعديل العلامات).</span>
            </div>
          ) : null}

          {/* Quick Actions */}
          {canEditCurrentScores ? (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 rounded-xl">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const max = scoreSheetAssessment?.max_score || "20.00";
                    setScoreRecords((prev) =>
                      prev.map((r) => ({
                        ...r,
                        score_input: parseFloat(max).toFixed(2),
                      })),
                    );
                  }}
                  className="text-xs font-black text-teal-800 bg-white hover:bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-300 shadow-2xs"
                >
                  تعبئة الدرجة الكاملة ({scoreSheetAssessment?.max_score}) للجميع
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setScoreRecords((prev) =>
                      prev.map((r) => ({ ...r, score_input: "" })),
                    )
                  }
                  className="text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-300 shadow-2xs"
                >
                  مسح العلامات (تعيين الكل فارغ / null)
                </button>
              </div>

              <span className="text-xs text-slate-600 font-bold">
                * اترك الحقل فارغاً لتسجيل غياب (null). إدخال 0 يعني درجة صفر
                فعلية.
              </span>
            </div>
          ) : null}

          {/* Student Scores Table */}
          {isScoreSheetLoading ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-sm text-slate-700 font-bold">
                جارٍ جلب قائمة طلاب الشعبة...
              </p>
            </div>
          ) : scoreRecords.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 font-bold">
                لا يوجد طلاب مقيدين في هذه الشعبة لهذا التقييم.
              </p>
            </div>
          ) : (
            <div className="border-2 border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto shadow-inner">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-white font-black sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">اسم الطالب</th>
                    <th className="p-3">الرقم الوطني / القيد</th>
                    <th className="p-3 w-48">
                      الدرجة (من {scoreSheetAssessment?.max_score})
                    </th>
                    <th className="p-3 w-36 text-center">الحالة</th>
                    <th className="p-3 w-20 text-center">سجل الطالب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {scoreRecords.map((rec, index) => {
                    const hasVal =
                      rec.score_input !== "" && rec.score_input !== null;
                    const numVal = parseFloat(rec.score_input);
                    const isZero = hasVal && numVal === 0;
                    const maxScore = scoreSheetAssessment?.max_score || "20.00";

                    return (
                      <tr
                        key={rec.enrollment}
                        className="hover:bg-teal-50/40 transition-colors"
                      >
                        <td className="p-3 text-center text-slate-500 font-black">
                          {index + 1}
                        </td>
                        <td className="p-3">
                          <span className="font-black text-slate-900 text-sm block">
                            {rec.student_name}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-xs font-bold">
                          {rec.national_id || "—"}
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max={parseFloat(maxScore) || 100}
                              placeholder="فارغ (غائب)"
                              value={rec.score_input}
                              disabled={!canEditCurrentScores || isSavingScores}
                              onChange={(e) =>
                                handleScoreInputChange(
                                  rec.enrollment,
                                  e.target.value,
                                )
                              }
                              className={`w-full text-center font-black text-sm px-3 py-1.5 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isZero
                                  ? "bg-red-50 border-red-400 text-red-950"
                                  : hasVal
                                    ? "bg-teal-50 border-teal-400 text-teal-950"
                                    : "bg-slate-50 border-slate-300 text-slate-700"
                              } ${!canEditCurrentScores ? "opacity-75 cursor-not-allowed bg-slate-100" : ""}`}
                            />
                            {canEditCurrentScores && (
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleScoreInputChange(
                                      rec.enrollment,
                                      parseFloat(maxScore).toFixed(2),
                                    )
                                  }
                                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-teal-100 text-[10px] font-black rounded border border-slate-300 text-slate-700"
                                  title="العلامة الكاملة"
                                >
                                  كاملة
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleScoreInputChange(rec.enrollment, "0.00")
                                  }
                                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-rose-100 text-[10px] font-black rounded border border-slate-300 text-slate-700"
                                  title="درجة صفر"
                                >
                                  0
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {isZero ? (
                            <span className="px-2.5 py-1 bg-red-100 text-red-900 border border-red-300 rounded-md text-[11px] font-black inline-block">
                              صفر (0.00)
                            </span>
                          ) : hasVal ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md text-[11px] font-black inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              مرصود
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-[11px] font-bold inline-block">
                              غائب / فارغ
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenStudentResults(
                                rec.enrollment,
                                rec.student_name,
                              )
                            }
                            className="p-2 text-slate-600 hover:text-teal-900 hover:bg-teal-100 rounded-lg transition-all"
                            title="عرض السجل الفصلي الكامل للطالب"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-bold">
              يتم الحفظ بصيغة Bulk POST مع معالجة التاريخ الأكاديمي للطلاب.
            </span>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsScoreSheetOpen(false)}
                disabled={isSavingScores}
                className="text-xs px-4 py-2 rounded-xl font-bold"
              >
                إغلاق
              </Button>
              {canEditCurrentScores && (
                <Button
                  type="button"
                  onClick={handleSaveScores}
                  disabled={
                    isSavingScores ||
                    isScoreSheetLoading ||
                    scoreRecords.length === 0
                  }
                  className={
                    activeScoreSectionPublished
                      ? "bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-md"
                      : "bg-teal-700 hover:bg-teal-800 text-white font-black text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-md"
                  }
                >
                  {isSavingScores && (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  )}
                  <span>
                    {activeScoreSectionPublished
                      ? "حفظ وتصحيح العلامات المنشورة"
                      : "حفظ كشف العلامات"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: PUBLISH SECTION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPublishSectionModalOpen}
        onClose={() => !isPublishing && setIsPublishSectionModalOpen(false)}
        title="نشر نتائج شعبة دراسية"
      >
        <div className="space-y-4 text-right">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-950 text-xs space-y-1.5">
            <div className="font-black flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-700" />
              <span>شروط وآلية نشر الشعبة:</span>
            </div>
            <p className="leading-relaxed">
              سيتم نشر نتائج كافة تقييمات هذه الشعبة ضمن الفصل المختار.
              <br />
              <strong className="text-amber-800 font-bold">⚠️ تنبيه هام:</strong> التقييمات التي يقع تاريخها في المستقبل (بعد تاريخ اليوم) لا يقبل السيرفر نشرها وتستثنى تلقائياً لتبقى مسودة حتى يحين موعدها أو يتم تعديل تاريخها لتاريخ اليوم.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              الشعبة الدراسية *
            </label>
            <select
              value={publishSectionId}
              onChange={(e) => setPublishSectionId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
            >
              <option value="">-- اختر الشعبة --</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name} ({sec.grade_level_display})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              الفصل الدراسي *
            </label>
            <select
              value={publishSectionTermId}
              onChange={(e) => setPublishSectionTermId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
            >
              <option value="">-- اختر الفصل --</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  الفصل {t.number_display}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPublishSectionModalOpen(false)}
              disabled={isPublishing}
              className="text-xs px-4 py-2 rounded-xl font-bold"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handlePublishSection}
              disabled={
                isPublishing || !publishSectionId || !publishSectionTermId
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm"
            >
              {isPublishing && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>تأكيد نشر الشعبة</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: PUBLISH GRADE LEVEL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPublishGradeModalOpen}
        onClose={() => !isPublishing && setIsPublishGradeModalOpen(false)}
        title="نشر نتائج صف دراسي كامل"
      >
        <div className="space-y-4 text-right">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-950 text-xs space-y-1.5">
            <div className="font-black flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-700" />
              <span>نشر جماعي لكافة شعب الصف:</span>
            </div>
            <p>
              سيتم نشر نتائج كافة التقييمات لجميع شعب الصف المختار في الفصل
              الحالي دفعة واحدة. التقييمات المستقبلية سيتم تخطيها تلقائياً.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              الصف الدراسي *
            </label>
            <select
              value={publishGradeLevelId}
              onChange={(e) => setPublishGradeLevelId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
            >
              <option value="">-- اختر الصف الدراسي --</option>
              {gradeLevels.map((gl) => (
                <option key={gl.id} value={gl.id}>
                  {gl.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              الفصل الدراسي *
            </label>
            <select
              value={publishGradeTermId}
              onChange={(e) => setPublishGradeTermId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
            >
              <option value="">-- اختر الفصل --</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  الفصل {t.number_display}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPublishGradeModalOpen(false)}
              disabled={isPublishing}
              className="text-xs px-4 py-2 rounded-xl font-bold"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handlePublishGrade}
              disabled={
                isPublishing || !publishGradeLevelId || !publishGradeTermId
              }
              className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm"
            >
              {isPublishing && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>تأكيد نشر الصف بالكامل</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 7: STUDENT RESULTS BREAKDOWN */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isStudentResultsModalOpen}
        onClose={() => setIsStudentResultsModalOpen(false)}
        title={`كشف درجات الطالب: ${selectedStudentName}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-right">
          {isStudentResultsLoading ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
              <p className="text-sm text-slate-700 font-bold">
                جارٍ استخراج نتائج الطالب...
              </p>
            </div>
          ) : studentResultsError ? (
            <Alert variant="danger" title="خطأ">
              {studentResultsError}
            </Alert>
          ) : !studentResultsData ||
            (Array.isArray(studentResultsData) &&
              studentResultsData.length === 0) ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-bold">
                لا توجد نتائج مسجلة لهذا الطالب في هذا الفصل.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-950 flex items-center gap-2 font-medium">
                <Info className="w-4 h-4 text-teal-700 shrink-0" />
                <span>
                  عرض تفاصيل التقييمات الفردية لكل مادة مع حساب المجموع الحالي
                  أو العلامة النهائية حسب اكتمال الرصد.
                </span>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {(Array.isArray(studentResultsData)
                  ? studentResultsData
                  : studentResultsData.results ||
                    studentResultsData.subjects ||
                    []
                ).map((subj, sIdx) => {
                  const isComplete = Boolean(subj.is_complete);
                  const subjAssessments =
                    subj.assessments || subj.records || [];

                  return (
                    <div
                      key={subj.subject_id || subj.grade_subject || sIdx}
                      className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="font-black text-sm text-slate-900">
                          {subj.subject_display ||
                            subj.subject_name ||
                            subj.name ||
                            "مادة دراسية"}
                        </span>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                              isComplete
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-amber-100 text-amber-900 border border-amber-300"
                            }`}
                          >
                            {isComplete
                              ? "العلامة النهائية"
                              : "المجموع الحالي (غير مكتمل)"}
                          </span>
                          <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {subj.total_score ?? "0"} /{" "}
                            {subj.total_max_score ?? "0"}
                          </span>
                        </div>
                      </div>

                      {subjAssessments.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {subjAssessments.map((item, aIdx) => (
                            <div
                              key={item.id || aIdx}
                              className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs"
                            >
                              <span className="font-bold text-slate-800">
                                {item.title || item.assessment_title}
                              </span>
                              <span
                                className={`font-mono font-black px-2 py-0.5 rounded ${
                                  item.score === null ||
                                  item.score === undefined
                                    ? "bg-slate-200 text-slate-600 text-[11px]"
                                    : "bg-teal-100 text-teal-950 border border-teal-300 text-xs"
                                }`}
                              >
                                {item.score !== null && item.score !== undefined
                                  ? `${item.score} / ${item.max_score}`
                                  : `لم ترصد (${item.max_score})`}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          لا توجد تقييمات مسجلة لهذه المادة
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStudentResultsModalOpen(false)}
              className="text-xs px-5 py-2 rounded-xl font-bold"
            >
              إغلاق
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default GradesManagement;
