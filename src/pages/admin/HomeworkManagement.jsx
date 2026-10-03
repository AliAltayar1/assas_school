import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";
import { toast } from "sonner";
import { parseApiError, extractPaginatedList } from "../../utils/errorUtils";
import { SearchableSelect, normalizeArabic } from "../../components/ui/SearchableSelect";
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Clock,
  Edit2,
  Trash2,
  Eye,
  UserCheck,
  GraduationCap,
  Sparkles,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  FileText,
  Paperclip,
  Download,
  ExternalLink,
  BookOpen,
} from "lucide-react";

export function HomeworkManagement() {
  const { user, hasPermission } = useAuthStore();
  const canAddHomework = hasPermission("homework.add_homework");
  const canChangeHomework = hasPermission("homework.change_homework");
  const canDeleteHomework = hasPermission("homework.delete_homework");

  const rawRole = (
    user?.role ||
    user?.role_code ||
    user?.role_name ||
    ""
  ).toLowerCase();

  const isTeacher = rawRole === "teacher";

  // Raw & Processed data states
  const [homeworks, setHomeworks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [sections, setSections] = useState([]);
  const [gradeSubjects, setGradeSubjects] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [pageSize] = useState(20);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState("");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("");
  const [selectedGradeSubjectFilter, setSelectedGradeSubjectFilter] = useState("");
  const [homeworkFromFilter, setHomeworkFromFilter] = useState("");
  const [homeworkToFilter, setHomeworkToFilter] = useState("");
  const [dueFromFilter, setDueFromFilter] = useState("");
  const [dueToFilter, setDueToFilter] = useState("");
  const [orderingFilter, setOrderingFilter] = useState("-created_at");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedHomework, setSelectedHomework] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Create Modal mode & cascading selection states (Grade, Section, Subject)
  const [createMode, setCreateMode] = useState("cascade"); // 'cascade' | 'direct' | 'manual'
  const [createGrade, setCreateGrade] = useState("");
  const [createSection, setCreateSection] = useState("");
  const [createSubject, setCreateSubject] = useState("");

  // Form states
  const [createForm, setCreateForm] = useState({
    teacher_assignment: "",
    title: "",
    description: "",
    homework_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    attachment: null,
  });

  const [editForm, setEditForm] = useState({
    teacher_assignment: "",
    title: "",
    description: "",
    homework_date: "",
    due_date: "",
    attachment: null,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch Metadata for dropdowns (Assignments, Sections, GradeSubjects, GradeLevels, Teachers)
  const fetchMetadata = useCallback(async () => {
    try {
      const fetchAllPaginated = async (fetchFn, defaultParams = { page_size: 100 }) => {
        if (!fetchFn) return [];
        let all = [];
        let page = 1;
        let hasNext = true;
        while (hasNext && page <= 20) {
          try {
            const res = await fetchFn({ ...defaultParams, page });
            const { results, next } = extractPaginatedList(res);
            if (results && results.length > 0) {
              all = all.concat(results);
            }
            if (next && results && results.length > 0) {
              page += 1;
            } else {
              hasNext = false;
            }
          } catch {
            hasNext = false;
          }
        }
        return all;
      };

      const fetchAllTeachers = async () => {
        if (isTeacher || !api.users?.getUsers) return [];
        return fetchAllPaginated(api.users.getUsers, { role: "teacher", page_size: 100 });
      };

      const [assignList, secList, gsList, glData, teachersList] = await Promise.all([
        fetchAllPaginated(api.teachingAssignments?.getAll, { page_size: 200 }).catch(() => []),
        fetchAllPaginated(api.academics?.getSections, { page_size: 200 }).catch(() => []),
        fetchAllPaginated(api.academics?.getGradeSubjects, { page_size: 200 }).catch(() => []),
        api.academics?.getGradeLevels
          ? api.academics.getGradeLevels({ page_size: 200 }).catch(() => null)
          : null,
        fetchAllTeachers().catch(() => []),
      ]);

      if (assignList && assignList.length > 0) {
        setAssignments(assignList);
      }
      if (secList && secList.length > 0) {
        setSections(secList);
      }
      if (gsList && gsList.length > 0) {
        setGradeSubjects(gsList);
      }
      if (glData) {
        setGradeLevels(extractPaginatedList(glData).results || []);
      }
      if (teachersList && teachersList.length > 0) {
        setTeachers(teachersList);
      }
    } catch (_) {}
  }, [isTeacher]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Fetch Homeworks List
  const fetchHomeworks = useCallback(
    async (page = currentPage) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = {
          page: page,
          ordering: orderingFilter,
        };

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (selectedAssignmentFilter)
          params.teacher_assignment = selectedAssignmentFilter;
        if (selectedTeacherFilter)
          params.teacher_assignment__teacher = selectedTeacherFilter;
        if (selectedSectionFilter)
          params.teacher_assignment__section = selectedSectionFilter;
        if (selectedGradeSubjectFilter)
          params.teacher_assignment__grade_subject = selectedGradeSubjectFilter;
        if (homeworkFromFilter) params.homework_from = homeworkFromFilter;
        if (homeworkToFilter) params.homework_to = homeworkToFilter;
        if (dueFromFilter) params.due_from = dueFromFilter;
        if (dueToFilter) params.due_to = dueToFilter;

        const data = await api.homework.getAll(params);
        const { results, count, next, previous } = extractPaginatedList(data);

        setHomeworks(results);
        setTotalCount(count);
        setHasNext(Boolean(next));
        setHasPrevious(Boolean(previous));
      } catch (err) {
        setError(parseApiError(err, "حدث خطأ أثناء تحميل قائمة الواجبات المدرسية."));
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentPage,
      debouncedSearch,
      selectedAssignmentFilter,
      selectedTeacherFilter,
      selectedSectionFilter,
      selectedGradeSubjectFilter,
      homeworkFromFilter,
      homeworkToFilter,
      dueFromFilter,
      dueToFilter,
      orderingFilter,
    ]
  );

  useEffect(() => {
    fetchHomeworks(currentPage);
  }, [fetchHomeworks, currentPage]);

  // Helpers for labels
  const getAssignmentLabel = useCallback((a) => {
    if (!a) return "";
    const subject = a.subject_display || a.subject_name || "مادة";
    const grade = a.grade_level_display || a.grade_level_name || "";
    const section = a.section_display || a.section_name || "";
    const teacher = a.teacher_display || a.teacher_name || "";

    const parts = [
      subject,
      grade ? `(${grade} - ${section})` : section ? `(${section})` : "",
      teacher ? `- [${teacher}]` : "",
    ].filter(Boolean);

    return parts.join(" ");
  }, []);

  // Helper to check if an assignment end date has expired
  const isEndDateExpired = (dateStr) => {
    if (!dateStr) return false;
    try {
      const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        return cleanDate < todayStr;
      }
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return target < today;
    } catch {
      return false;
    }
  };

  // Helper to check if a homework assignment is ended (Read Only for teachers)
  const isAssignmentEnded = useCallback(
    (assignmentIdOrObj, row = null) => {
      if (row?.teacher_assignment_end_date && isEndDateExpired(row.teacher_assignment_end_date)) return true;
      if (row?.assignment_end_date && isEndDateExpired(row.assignment_end_date)) return true;
      if (row?.is_assignment_ended === true) return true;

      if (typeof assignmentIdOrObj === "object" && assignmentIdOrObj !== null) {
        if (assignmentIdOrObj.end_date && isEndDateExpired(assignmentIdOrObj.end_date)) return true;
        if (assignmentIdOrObj.is_active === false && assignmentIdOrObj.end_date) return true;
      }

      const assignId =
        typeof assignmentIdOrObj === "object"
          ? assignmentIdOrObj?.id
          : assignmentIdOrObj ||
            (typeof row?.teacher_assignment === "object"
              ? row?.teacher_assignment?.id
              : row?.teacher_assignment);

      if (assignId && assignments?.length > 0) {
        const matched = assignments.find((a) => String(a.id) === String(assignId));
        if (matched?.end_date && isEndDateExpired(matched.end_date)) return true;
      }

      return false;
    },
    [assignments]
  );

  // Helper to extract grade level ID
  const getGradeLevelId = useCallback((item) => {
    if (!item) return "";
    if (typeof item.grade_level === "object" && item.grade_level !== null) {
      return item.grade_level.id || "";
    }
    return item.grade_level || item.grade_level_id || "";
  }, []);

  // Helper to extract grade level Name
  const getGradeLevelName = useCallback((item) => {
    if (!item) return "";
    if (typeof item.grade_level === "object" && item.grade_level !== null) {
      return item.grade_level.name || item.grade_level.display_name || "";
    }
    return item.grade_level_display || item.grade_level_name || "";
  }, []);

  // Helper to normalize grade title for display
  const formatGradeName = useCallback((rawName) => {
    if (!rawName) return "";
    const trimmed = String(rawName).trim();
    if (
      trimmed.startsWith("الصف") ||
      trimmed.startsWith("صف") ||
      trimmed.startsWith("روضة") ||
      trimmed.startsWith("رياض") ||
      trimmed.startsWith("مرحلة")
    ) {
      return trimmed;
    }
    return `الصف ${trimmed}`;
  }, []);

  // Unified list of Grade Levels (combines API gradeLevels + derived from assignments, sections, gradeSubjects)
  const derivedGradeLevels = useMemo(() => {
    const map = new Map();
    if (gradeLevels && gradeLevels.length > 0) {
      gradeLevels.forEach((gl) => {
        if (gl.id) {
          const name = gl.name || gl.display_name || gl.title || "";
          map.set(String(gl.id), {
            id: String(gl.id),
            name: formatGradeName(name),
            order: gl.order ?? 999,
          });
        }
      });
    }

    assignments.forEach((a) => {
      const id = getGradeLevelId(a);
      const name = getGradeLevelName(a);
      if (id && !map.has(String(id))) {
        map.set(String(id), {
          id: String(id),
          name: formatGradeName(name || `صف (${String(id).slice(0, 8)})`),
          order: 999,
        });
      }
    });

    sections.forEach((sec) => {
      const id = getGradeLevelId(sec);
      const name = getGradeLevelName(sec);
      if (id && !map.has(String(id))) {
        map.set(String(id), {
          id: String(id),
          name: formatGradeName(name || `صف (${String(id).slice(0, 8)})`),
          order: 999,
        });
      }
    });

    gradeSubjects.forEach((gs) => {
      const id = getGradeLevelId(gs);
      const name = getGradeLevelName(gs);
      if (id && !map.has(String(id))) {
        map.set(String(id), {
          id: String(id),
          name: formatGradeName(name || `صف (${String(id).slice(0, 8)})`),
          order: 999,
        });
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (a.order !== 999 && b.order !== 999 && a.order !== b.order) {
        return a.order - b.order;
      }
      return (a.name || "").localeCompare(b.name || "", "ar");
    });
    return list;
  }, [
    gradeLevels,
    assignments,
    sections,
    gradeSubjects,
    getGradeLevelId,
    getGradeLevelName,
    formatGradeName,
  ]);

  // Valid Active Assignments (excludes ended assignments for teachers)
  const validAssignments = useMemo(() => {
    return isTeacher
      ? assignments.filter((a) => !isEndDateExpired(a.end_date))
      : assignments;
  }, [assignments, isTeacher]);

  // Helpers to resolve grade, section, subject from an assignment
  const getAssignmentGradeId = useCallback(
    (a) => {
      if (!a) return "";
      const directId = getGradeLevelId(a);
      if (directId) return String(directId);

      const secId = typeof a.section === "object" ? a.section?.id : a.section;
      if (secId) {
        const sec = sections.find((s) => String(s.id) === String(secId));
        if (sec) {
          const sGlId = getGradeLevelId(sec);
          if (sGlId) return String(sGlId);
        }
      }

      const gsId =
        typeof a.grade_subject === "object" ? a.grade_subject?.id : a.grade_subject;
      if (gsId) {
        const gs = gradeSubjects.find((g) => String(g.id) === String(gsId));
        if (gs) {
          const gsGlId = getGradeLevelId(gs);
          if (gsGlId) return String(gsGlId);
        }
      }

      const gradeName = a.grade_level_display || a.grade_level_name || "";
      if (gradeName) {
        const matched = derivedGradeLevels.find(
          (gl) =>
            normalizeArabic(gl.name).includes(normalizeArabic(gradeName)) ||
            normalizeArabic(gradeName).includes(normalizeArabic(gl.name))
        );
        if (matched) return String(matched.id);
        return gradeName;
      }
      return "";
    },
    [sections, gradeSubjects, derivedGradeLevels, getGradeLevelId]
  );

  const getAssignmentSectionId = useCallback(
    (a) => {
      if (!a) return "";
      if (typeof a.section === "object" && a.section?.id)
        return String(a.section.id);
      if (a.section && typeof a.section === "string") return String(a.section);
      if (a.section_id) return String(a.section_id);

      const secName = a.section_display || a.section_name || "";
      if (secName) {
        const sec = sections.find((s) => (s.name || s.section_name) === secName);
        if (sec) return String(sec.id);
        return secName;
      }
      return "";
    },
    [sections]
  );

  const getAssignmentSubjectId = useCallback(
    (a) => {
      if (!a) return "";
      if (typeof a.grade_subject === "object" && a.grade_subject?.id)
        return String(a.grade_subject.id);
      if (a.grade_subject && typeof a.grade_subject === "string")
        return String(a.grade_subject);
      if (typeof a.subject === "object" && a.subject?.id)
        return String(a.subject.id);
      if (a.subject && typeof a.subject === "string") return String(a.subject);

      const subjName = a.subject_display || a.subject_name || "";
      if (subjName) {
        const gs = gradeSubjects.find(
          (g) => (g.subject_display || g.subject_name || g.name) === subjName
        );
        if (gs) return String(gs.id);
        return subjName;
      }
      return String(a.id);
    },
    [gradeSubjects]
  );

  const getAssignmentSubjectName = useCallback(
    (a) => {
      if (!a) return "";
      if (a.subject_display) return a.subject_display;
      if (a.subject_name) return a.subject_name;
      if (typeof a.subject === "object" && a.subject?.name)
        return a.subject.name;
      if (typeof a.grade_subject === "object") {
        return (
          a.grade_subject.subject_display ||
          a.grade_subject.subject_name ||
          a.grade_subject.name ||
          ""
        );
      }
      const gsId =
        typeof a.grade_subject === "string" ? a.grade_subject : "";
      if (gsId) {
        const gs = gradeSubjects.find((g) => String(g.id) === String(gsId));
        if (gs) return gs.subject_display || gs.subject_name || gs.name || "";
      }
      return "المادة الدراسية";
    },
    [gradeSubjects]
  );

  // Cascading options for Create Modal:
  // 1. Grade Options
  const createGradeOptions = useMemo(() => {
    if (isTeacher) {
      const teacherGradeIds = new Set(
        validAssignments.map((a) => getAssignmentGradeId(a)).filter(Boolean)
      );
      const list = derivedGradeLevels.filter((gl) =>
        teacherGradeIds.has(String(gl.id))
      );
      return list.map((gl) => ({
        value: String(gl.id),
        label: gl.name,
      }));
    }
    return derivedGradeLevels.map((gl) => ({
      value: String(gl.id),
      label: gl.name,
    }));
  }, [isTeacher, validAssignments, derivedGradeLevels, getAssignmentGradeId]);

  // 2. Section Options (Filtered by selected Grade)
  const createSectionOptions = useMemo(() => {
    if (!createGrade) return [];

    if (isTeacher) {
      const map = new Map();
      validAssignments.forEach((a) => {
        const aGradeId = getAssignmentGradeId(a);
        if (String(aGradeId) === String(createGrade)) {
          const sId = getAssignmentSectionId(a);
          const sName = a.section_display || a.section_name || "";
          if (sId && !map.has(sId)) {
            const formatted = sName
              ? sName.startsWith("شعبة") || sName.startsWith("الشعبة")
                ? sName
                : `الشعبة ${sName}`
              : `شعبة (${sId.slice(0, 6)})`;
            map.set(sId, {
              value: sId,
              label: formatted,
            });
          }
        }
      });
      return Array.from(map.values());
    }

    // Admin: Sections in this grade
    const map = new Map();
    sections.forEach((sec) => {
      const secGradeId = getGradeLevelId(sec);
      if (String(secGradeId) === String(createGrade)) {
        const sName = sec.name || sec.section_name || "";
        const formatted = sName
          ? sName.startsWith("شعبة") || sName.startsWith("الشعبة")
            ? sName
            : `الشعبة ${sName}`
          : `شعبة (${sec.id.slice(0, 6)})`;
        map.set(String(sec.id), {
          value: String(sec.id),
          label: formatted,
        });
      }
    });

    validAssignments.forEach((a) => {
      const aGradeId = getAssignmentGradeId(a);
      if (String(aGradeId) === String(createGrade)) {
        const sId = getAssignmentSectionId(a);
        const sName = a.section_display || a.section_name || "";
        if (sId && !map.has(sId)) {
          const formatted = sName
            ? sName.startsWith("شعبة") || sName.startsWith("الشعبة")
              ? sName
              : `الشعبة ${sName}`
            : `شعبة (${sId.slice(0, 6)})`;
          map.set(sId, {
            value: sId,
            label: formatted,
          });
        }
      }
    });

    return Array.from(map.values());
  }, [
    createGrade,
    isTeacher,
    validAssignments,
    sections,
    getAssignmentGradeId,
    getAssignmentSectionId,
    getGradeLevelId,
  ]);

  // 3. Subject Options (Filtered by selected Grade & Section)
  const createSubjectOptions = useMemo(() => {
    if (!createGrade || !createSection) return [];

    const map = new Map();

    validAssignments.forEach((a) => {
      const aGradeId = getAssignmentGradeId(a);
      const aSecId = getAssignmentSectionId(a);

      if (
        String(aGradeId) === String(createGrade) &&
        String(aSecId) === String(createSection)
      ) {
        const subjId = getAssignmentSubjectId(a) || a.id;
        const subjName = getAssignmentSubjectName(a);
        const teacherName = a.teacher_display || a.teacher_name || "";

        if (!map.has(subjId)) {
          map.set(subjId, {
            value: subjId,
            label: subjName,
            subtext: teacherName ? `المعلم: ${teacherName}` : "",
            assignmentId: a.id,
          });
        }
      }
    });

    if (!isTeacher) {
      gradeSubjects.forEach((gs) => {
        const gsGradeId = getGradeLevelId(gs);
        if (String(gsGradeId) === String(createGrade)) {
          const id = String(gs.id);
          const name =
            gs.subject_display || gs.subject_name || gs.name || "مادة دراسية";
          if (!map.has(id)) {
            const assign = validAssignments.find(
              (a) =>
                String(getAssignmentGradeId(a)) === String(createGrade) &&
                String(getAssignmentSectionId(a)) === String(createSection) &&
                String(getAssignmentSubjectId(a)) === id
            );
            map.set(id, {
              value: id,
              label: name,
              subtext: assign?.teacher_display
                ? `المعلم: ${assign.teacher_display}`
                : "",
              assignmentId: assign?.id || null,
            });
          }
        }
      });
    }

    return Array.from(map.values());
  }, [
    createGrade,
    createSection,
    isTeacher,
    validAssignments,
    gradeSubjects,
    getAssignmentGradeId,
    getAssignmentSectionId,
    getAssignmentSubjectId,
    getAssignmentSubjectName,
    getGradeLevelId,
  ]);

  // Matching Assignments for currently selected Grade, Section & Subject
  const matchedAssignmentsForSelection = useMemo(() => {
    if (!createGrade || !createSection || !createSubject) return [];

    return validAssignments.filter((a) => {
      const aGradeId = getAssignmentGradeId(a);
      const aSecId = getAssignmentSectionId(a);
      const aSubjId = getAssignmentSubjectId(a);
      const aSubjName = getAssignmentSubjectName(a);

      const matchesGrade = String(aGradeId) === String(createGrade);
      const matchesSec = String(aSecId) === String(createSection);
      const matchesSubj =
        String(aSubjId) === String(createSubject) ||
        String(a.id) === String(createSubject) ||
        aSubjName === createSubject;

      return matchesGrade && matchesSec && matchesSubj;
    });
  }, [
    createGrade,
    createSection,
    createSubject,
    validAssignments,
    getAssignmentGradeId,
    getAssignmentSectionId,
    getAssignmentSubjectId,
    getAssignmentSubjectName,
  ]);

  // Sync resolved teacher_assignment in cascade mode
  useEffect(() => {
    if (createMode !== "cascade") return;

    if (!createGrade || !createSection || !createSubject) {
      if (createForm.teacher_assignment) {
        setCreateForm((prev) => ({ ...prev, teacher_assignment: "" }));
      }
      return;
    }

    if (matchedAssignmentsForSelection.length === 1) {
      const singleId = matchedAssignmentsForSelection[0].id;
      if (createForm.teacher_assignment !== singleId) {
        setCreateForm((prev) => ({ ...prev, teacher_assignment: singleId }));
      }
    } else if (matchedAssignmentsForSelection.length > 1) {
      const exists = matchedAssignmentsForSelection.some(
        (a) => String(a.id) === String(createForm.teacher_assignment)
      );
      if (!exists) {
        setCreateForm((prev) => ({
          ...prev,
          teacher_assignment: matchedAssignmentsForSelection[0].id,
        }));
      }
    } else {
      if (createForm.teacher_assignment) {
        setCreateForm((prev) => ({ ...prev, teacher_assignment: "" }));
      }
    }
  }, [
    createMode,
    createGrade,
    createSection,
    createSubject,
    matchedAssignmentsForSelection,
    createForm.teacher_assignment,
  ]);

  // Cascading change handlers
  const handleGradeChangeForCreate = (gradeId) => {
    setCreateGrade(gradeId);
    setCreateSection("");
    setCreateSubject("");
    setCreateForm((prev) => ({ ...prev, teacher_assignment: "" }));
  };

  const handleSectionChangeForCreate = (sectionId) => {
    setCreateSection(sectionId);
    setCreateSubject("");
    setCreateForm((prev) => ({ ...prev, teacher_assignment: "" }));
  };

  const handleSubjectChangeForCreate = (subjectId) => {
    setCreateSubject(subjectId);
    if (!createGrade || !createSection || !subjectId) {
      setCreateForm((prev) => ({ ...prev, teacher_assignment: "" }));
      return;
    }

    const matches = validAssignments.filter((a) => {
      const aGradeId = getAssignmentGradeId(a);
      const aSecId = getAssignmentSectionId(a);
      const aSubjId = getAssignmentSubjectId(a);
      const aSubjName = getAssignmentSubjectName(a);

      return (
        String(aGradeId) === String(createGrade) &&
        String(aSecId) === String(createSection) &&
        (String(aSubjId) === String(subjectId) ||
          String(a.id) === String(subjectId) ||
          aSubjName === subjectId)
      );
    });

    if (matches.length > 0) {
      setCreateForm((prev) => ({ ...prev, teacher_assignment: matches[0].id }));
    } else {
      setCreateForm((prev) => ({ ...prev, teacher_assignment: "" }));
    }
  };

  // Direct assignment change handler
  const handleDirectAssignmentChange = (assignId) => {
    setCreateForm((prev) => ({ ...prev, teacher_assignment: assignId }));
    if (assignId) {
      const a = validAssignments.find((item) => String(item.id) === String(assignId));
      if (a) {
        const gId = getAssignmentGradeId(a);
        const sId = getAssignmentSectionId(a);
        const subId = getAssignmentSubjectId(a) || a.id;
        if (gId) setCreateGrade(gId);
        if (sId) setCreateSection(sId);
        if (subId) setCreateSubject(subId);
      }
    }
  };

  // Memoized options for SearchableSelect (excludes ended assignments for teachers)
  const assignmentOptions = useMemo(() => {
    return validAssignments.map((a) => {
      const subject = a.subject_display || a.subject_name || "مادة";
      const grade = a.grade_level_display || a.grade_level_name || "";
      const section = a.section_display || a.section_name || "";
      const teacher = a.teacher_display || a.teacher_name || "";

      const classInfo = [grade, section].filter(Boolean).join(" - ");

      return {
        value: a.id,
        label: classInfo ? `${subject} (${classInfo})` : subject,
        subtext: teacher ? `المعلم المكلف: ${teacher}` : "",
      };
    });
  }, [validAssignments]);

  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime())
        ? isoString
        : d.toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
    } catch {
      return isoString;
    }
  };

  // Due date status calculator
  const getDueStatus = (dueDateStr) => {
    if (!dueDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: "منتهي التسليم",
        sub: `انتهى منذ ${Math.abs(diffDays)} يوم`,
        color: "bg-rose-50 text-rose-700 border-rose-200",
        dot: "bg-rose-500",
        isPast: true,
      };
    } else if (diffDays === 0) {
      return {
        label: "تسليم اليوم",
        sub: "اليوم آخر موعد",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500 animate-pulse",
        isToday: true,
      };
    } else if (diffDays === 1) {
      return {
        label: "تسليم غداً",
        sub: "متبقي يوم واحد",
        color: "bg-amber-50 text-amber-800 border-amber-200",
        dot: "bg-amber-500",
        isSoon: true,
      };
    } else {
      return {
        label: "متاح للتسليم",
        sub: `متبقي ${diffDays} أيام`,
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
        isActive: true,
      };
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = totalCount || homeworks.length;
    let active = 0;
    let past = 0;
    let withAttachment = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    homeworks.forEach((hw) => {
      if (hw.attachment) withAttachment++;
      if (hw.due_date) {
        const due = new Date(hw.due_date);
        due.setHours(0, 0, 0, 0);
        if (due >= today) active++;
        else past++;
      }
    });

    return { total, active, past, withAttachment };
  }, [totalCount, homeworks]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedAssignmentFilter("");
    setSelectedTeacherFilter("");
    setSelectedSectionFilter("");
    setSelectedGradeSubjectFilter("");
    setHomeworkFromFilter("");
    setHomeworkToFilter("");
    setDueFromFilter("");
    setDueToFilter("");
    setOrderingFilter("-created_at");
    setCurrentPage(1);
    toast.info("تمت استعادة الفلاتر الافتراضية");
  };

  // Create Homework Handler
  const handleCreateHomework = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!createForm.teacher_assignment) {
      if (createMode === "cascade") {
        if (!createGrade) {
          setModalError("يرجى اختيار الصف الدراسي أولاً.");
          return;
        }
        if (!createSection) {
          setModalError("يرجى اختيار الشعبة الدراسية.");
          return;
        }
        if (!createSubject) {
          setModalError("يرجى اختيار المادة المقررة.");
          return;
        }
        setModalError(
          "لم يتم العثور على تكليف تدريسي نشط لهذه المادة في هذه الشعبة. يرجى مراجعة إدارة المدرسة لإسناد التكليف."
        );
        return;
      }
      setModalError("يرجى اختيار التكليف الأكاديمي (المادة والشعبة والمعلم).");
      return;
    }
    if (!createForm.title.trim()) {
      setModalError("يرجى إدخال عنوان الواجب.");
      return;
    }
    if (!createForm.homework_date) {
      setModalError("يرجى تحديد تاريخ الواجب.");
      return;
    }
    if (!createForm.due_date) {
      setModalError("يرجى تحديد موعد تسليم الواجب.");
      return;
    }
    if (createForm.due_date < createForm.homework_date) {
      setModalError("موعد التسليم يجب ألا يكون قبل تاريخ الواجب.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (createForm.attachment instanceof File) {
        const formData = new FormData();
        formData.append("teacher_assignment", createForm.teacher_assignment);
        formData.append("title", createForm.title.trim());
        formData.append("description", createForm.description.trim());
        formData.append("homework_date", createForm.homework_date);
        formData.append("due_date", createForm.due_date);
        formData.append("attachment", createForm.attachment);

        await api.homework.create(formData);
      } else {
        const payload = {
          teacher_assignment: createForm.teacher_assignment,
          title: createForm.title.trim(),
          description: createForm.description.trim(),
          homework_date: createForm.homework_date,
          due_date: createForm.due_date,
        };
        await api.homework.create(payload);
      }

      toast.success("تمت إضافة الواجب المدرسي بنجاح.");
      setIsCreateModalOpen(false);
      fetchHomeworks(1);
    } catch (err) {
      setModalError(parseApiError(err, "فشل حفظ الواجب المدرسي."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Homework Handler
  const handleUpdateHomework = async (e) => {
    e.preventDefault();
    if (!selectedHomework?.id) return;
    setModalError(null);

    if (!editForm.title.trim()) {
      setModalError("يرجى إدخال عنوان الواجب.");
      return;
    }
    if (
      editForm.due_date &&
      editForm.homework_date &&
      editForm.due_date < editForm.homework_date
    ) {
      setModalError("موعد التسليم يجب ألا يكون قبل تاريخ الواجب.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editForm.attachment instanceof File) {
        const formData = new FormData();
        if (editForm.teacher_assignment) {
          formData.append("teacher_assignment", editForm.teacher_assignment);
        }
        formData.append("title", editForm.title.trim());
        formData.append("description", editForm.description.trim());
        if (editForm.homework_date) {
          formData.append("homework_date", editForm.homework_date);
        }
        if (editForm.due_date) {
          formData.append("due_date", editForm.due_date);
        }
        formData.append("attachment", editForm.attachment);

        await api.homework.patch(selectedHomework.id, formData);
      } else {
        const payload = {
          title: editForm.title.trim(),
          description: editForm.description.trim(),
        };
        if (editForm.teacher_assignment) {
          payload.teacher_assignment = editForm.teacher_assignment;
        }
        if (editForm.homework_date) {
          payload.homework_date = editForm.homework_date;
        }
        if (editForm.due_date) {
          payload.due_date = editForm.due_date;
        }

        await api.homework.patch(selectedHomework.id, payload);
      }

      toast.success("تم تحديث الواجب المدرسي بنجاح.");
      setIsEditModalOpen(false);
      fetchHomeworks(currentPage);
    } catch (err) {
      setModalError(parseApiError(err, "فشل تحديث بيانات الواجب."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Homework Handler
  const handleDeleteHomework = async () => {
    if (!selectedHomework?.id) return;
    setIsSubmitting(true);
    try {
      await api.homework.delete(selectedHomework.id);
      toast.success("تم حذف الواجب بنجاح.");
      setIsDeleteModalOpen(false);
      setSelectedHomework(null);
      fetchHomeworks(currentPage);
    } catch (err) {
      toast.error(parseApiError(err, "فشل حذف الواجب المدرسي."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    if (isTeacher && assignments.length > 0 && validAssignments.length === 0) {
      toast.warning(
        "جميع التكليفات التدريسية الخاصة بك منتهية، لا يمكن إنشاء واجبات جديدة."
      );
      return;
    }

    setModalError(null);
    setCreateMode("cascade");

    if (isTeacher && validAssignments.length === 1) {
      const single = validAssignments[0];
      const gId = getAssignmentGradeId(single);
      const sId = getAssignmentSectionId(single);
      const subId = getAssignmentSubjectId(single) || single.id;
      setCreateGrade(gId);
      setCreateSection(sId);
      setCreateSubject(subId);
      setCreateForm({
        teacher_assignment: single.id,
        title: "",
        description: "",
        homework_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        attachment: null,
      });
    } else {
      setCreateGrade("");
      setCreateSection("");
      setCreateSubject("");
      setCreateForm({
        teacher_assignment: "",
        title: "",
        description: "",
        homework_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        attachment: null,
      });
    }

    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (hw) => {
    if (isTeacher && isAssignmentEnded(hw.teacher_assignment, hw)) {
      toast.warning("التكليف التعليمي منتهٍ، هذا الواجب متاح للعرض فقط.");
      return;
    }
    setSelectedHomework(hw);
    setModalError(null);
    setEditForm({
      teacher_assignment: hw.teacher_assignment || "",
      title: hw.title || "",
      description: hw.description || "",
      homework_date: hw.homework_date || "",
      due_date: hw.due_date || "",
      attachment: null,
    });
    setIsEditModalOpen(true);
  };

  // Open Details Modal
  const handleOpenDetails = (hw) => {
    setSelectedHomework(hw);
    setIsDetailsModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (hw) => {
    if (isTeacher && isAssignmentEnded(hw.teacher_assignment, hw)) {
      toast.warning("التكليف التعليمي منتهٍ، لا يمكن حذف هذا الواجب.");
      return;
    }
    setSelectedHomework(hw);
    setIsDeleteModalOpen(true);
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    Boolean(selectedAssignmentFilter) ||
    Boolean(selectedTeacherFilter) ||
    Boolean(selectedSectionFilter) ||
    Boolean(selectedGradeSubjectFilter) ||
    Boolean(homeworkFromFilter) ||
    Boolean(homeworkToFilter) ||
    Boolean(dueFromFilter) ||
    Boolean(dueToFilter);

  return (
    <div className="space-y-4 sm:space-y-6 text-right dir-rtl" dir="rtl">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              إدارة الواجبات المدرسية اليومية (Daily Homework)
            </h2>
            {totalCount > 0 && (
              <span className="bg-teal-50 text-teal-700 text-xs px-2.5 py-0.5 rounded-full border border-teal-200 font-bold">
                {totalCount} واجب مسجل
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 pr-1">
            {isTeacher
              ? "إنشاء وإدارة واجبات المواد والشعب المكلف بها ومتابعة تسليم الطلاب والمرفقات"
              : "متابعة شاملة لجميع الواجبات المدرسية، مواعيد التسليم، والمرفقات عبر الصفوف والشعب"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHomeworks(currentPage)}
            disabled={isLoading}
            title="تحديث القائمة"
            className="h-9 px-3"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {canAddHomework && (
            <Button
              onClick={handleOpenCreate}
              className="gap-1.5 text-xs font-bold h-9 px-3.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة واجب جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Homeworks */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              إجمالي الواجبات
            </span>
            <span className="text-lg sm:text-xl font-bold text-slate-900">
              {stats.total}
            </span>
          </div>
        </div>

        {/* Active Homeworks */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              متاحة للتسليم حالياً
            </span>
            <span className="text-lg sm:text-xl font-bold text-emerald-700">
              {stats.active}
            </span>
          </div>
        </div>

        {/* Past Due Homeworks */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              منتهية الموعد
            </span>
            <span className="text-lg sm:text-xl font-bold text-amber-700">
              {stats.past}
            </span>
          </div>
        </div>

        {/* With Attachments */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <Paperclip className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              تحتوي على مرفقات
            </span>
            <span className="text-lg sm:text-xl font-bold text-indigo-700">
              {stats.withAttachment}
            </span>
          </div>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث بعنوان الواجب، الوصف، المادة، الشعبة، أو اسم المعلم..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 hover:bg-white transition-colors"
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

          {/* Quick Filter Actions */}
          <div className="flex items-center gap-2">
            {/* Sort Select */}
            <div className="relative">
              <select
                value={orderingFilter}
                onChange={(e) => {
                  setOrderingFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none appearance-none"
              >
                <option value="-created_at">الأحدث إضافة</option>
                <option value="-due_date">أقرب موعد تسليم</option>
                <option value="due_date">أبعد موعد تسليم</option>
                <option value="-homework_date">تاريخ الواجب (تنازلي)</option>
                <option value="homework_date">تاريخ الواجب (تصاعدي)</option>
                <option value="title">العنوان (أبجدي)</option>
              </select>
              <ArrowUpDown className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className={`gap-1.5 text-xs h-9 ${
                hasActiveFilters
                  ? "border-teal-400 bg-teal-50 text-teal-800 font-bold"
                  : "border-slate-200"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>فلاتر متقدمة</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:bg-rose-50 h-9 px-2"
                title="إلغاء جميع الفلاتر"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {isFilterDrawerOpen && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs bg-slate-50/50 p-3 rounded-xl">
            {/* Filter by Teacher Assignment */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                التكليف الأكاديمي:
              </label>
              <SearchableSelect
                options={[
                  { value: "", label: "جميع التكليفات الأكاديمية" },
                  ...assignmentOptions,
                ]}
                value={selectedAssignmentFilter}
                onChange={(val) => {
                  setSelectedAssignmentFilter(val);
                  setCurrentPage(1);
                }}
                placeholder="جميع التكليفات (اكتب للفلترة)..."
                searchPlaceholder="ابحث بالمادة أو الشعبة أو المعلم..."
                allowClear={Boolean(selectedAssignmentFilter)}
              />
            </div>

            {/* Filter by Teacher (Admin / Supervisor only) */}
            {!isTeacher && teachers.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  المعلم المكلف:
                </label>
                <select
                  value={selectedTeacherFilter}
                  onChange={(e) => {
                    setSelectedTeacherFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                >
                  <option value="">جميع المعلمين</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name ||
                        `${t.first_name || ""} ${t.last_name || ""}`.trim() ||
                        t.username}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter by Section */}
            {sections.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  الشعبة الدراسية:
                </label>
                <select
                  value={selectedSectionFilter}
                  onChange={(e) => {
                    setSelectedSectionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                >
                  <option value="">جميع الشعب الدراسية</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.section_name || s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter by Grade Subject */}
            {gradeSubjects.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  المادة المقررة:
                </label>
                <select
                  value={selectedGradeSubjectFilter}
                  onChange={(e) => {
                    setSelectedGradeSubjectFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                >
                  <option value="">جميع المواد المقررة</option>
                  {gradeSubjects.map((gs) => (
                    <option key={gs.id} value={gs.id}>
                      {gs.subject_display || gs.display_name || gs.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range: Homework Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                تاريخ نشر الواجب (من / إلى):
              </label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="date"
                  value={homeworkFromFilter}
                  onChange={(e) => {
                    setHomeworkFromFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-[11px]"
                  title="من تاريخ"
                />
                <input
                  type="date"
                  value={homeworkToFilter}
                  onChange={(e) => {
                    setHomeworkToFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-[11px]"
                  title="إلى تاريخ"
                />
              </div>
            </div>

            {/* Date Range: Due Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                موعد التسليم (من / إلى):
              </label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="date"
                  value={dueFromFilter}
                  onChange={(e) => {
                    setDueFromFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-[11px]"
                  title="موعد التسليم من"
                />
                <input
                  type="date"
                  value={dueToFilter}
                  onChange={(e) => {
                    setDueToFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-[11px]"
                  title="موعد التسليم إلى"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area: Responsive Hybrid (Table on Desktop, Cards on Mobile) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-teal-600" />
            <p className="text-xs font-semibold text-slate-600">
              جاري تحميل قائمة الواجبات المدرسية...
            </p>
          </div>
        ) : homeworks.length === 0 ? (
          <div className="p-8 sm:p-12">
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100">
                <ClipboardList className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-slate-800">
                {hasActiveFilters
                  ? "لا توجد واجبات مطابقة للفلاتر المحددة"
                  : "لا توجد واجبات مدرسية مسجلة حالياً"}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {hasActiveFilters
                  ? "جرّب تغيير عبارة البحث أو إعادة تعيين الفلاتر لعرض الواجبات."
                  : "يمكنك إضافة واجب جديد للطلاب وتحديد موعد التسليم وإرفاق الملفات الداعمة."}
              </p>
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="gap-2 mt-2 font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة تعيين الفلاتر</span>
                </Button>
              ) : (
                canAddHomework && (
                  <Button
                    onClick={handleOpenCreate}
                    className="gap-2 mt-2 font-bold shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة واجب مدرسي جديد</span>
                  </Button>
                )
              )}
            </div>
          </div>
        ) : (
          <>
            {/* 1. Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-xs text-right min-w-[1100px]">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold whitespace-nowrap">
                  <tr>
                    <th className="p-3.5 whitespace-nowrap">عنوان الواجب والمادة</th>
                    <th className="p-3.5 whitespace-nowrap">الصف والشعبة</th>
                    <th className="p-3.5 whitespace-nowrap">المعلم المكلف</th>
                    <th className="p-3.5 whitespace-nowrap">تاريخ النشر</th>
                    <th className="p-3.5 whitespace-nowrap">موعد التسليم والحالة</th>
                    <th className="p-3.5 text-center whitespace-nowrap">المرفقات</th>
                    <th className="p-3.5 text-center whitespace-nowrap">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {homeworks.map((row) => {
                    const dueStatus = getDueStatus(row.due_date);

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Title & Subject */}
                        <td className="p-3.5 min-w-[220px]">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{row.title}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-teal-700 font-semibold text-[11px] whitespace-nowrap">
                              <GraduationCap className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>{row.subject_display || "المادة المقررة"}</span>
                              {row.academic_year_display && (
                                <span className="text-slate-400 font-normal">
                                  ({row.academic_year_display})
                                </span>
                              )}
                            </div>
                            {row.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                                {row.description}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Grade & Section */}
                        <td className="p-3.5 text-slate-700 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>
                              {row.grade_level_display
                                ? `${row.grade_level_display} - `
                                : ""}
                              {row.section_display || "الشعبة"}
                            </span>
                          </div>
                        </td>

                        {/* Teacher */}
                        <td className="p-3.5 text-slate-800 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200 shrink-0">
                              <UserCheck className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="whitespace-nowrap font-semibold">{row.teacher_display || "المعلم"}</div>
                              {row.created_by_username && (
                                <div className="text-[10px] text-slate-400 whitespace-nowrap">
                                  بواسطة: @{row.created_by_username}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Homework Date */}
                        <td className="p-3.5 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{row.homework_date}</span>
                          </div>
                        </td>

                        {/* Due Date & Status Badge */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{row.due_date}</span>
                            </div>
                            {dueStatus && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold inline-flex items-center gap-1 whitespace-nowrap ${dueStatus.color}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${dueStatus.dot}`}
                                ></span>
                                <span>{dueStatus.label}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Attachments */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {row.attachment ? (
                            <a
                              href={row.attachment}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap"
                              title="تحميل / معاينة المرفق"
                            >
                              <Paperclip className="w-3 h-3 shrink-0" />
                              <span>مرفق</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-300 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenDetails(row)}
                              className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                              title="عرض التفاصيل الكاملة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {isTeacher && isAssignmentEnded(row.teacher_assignment, row) ? (
                              <span
                                className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold inline-flex items-center whitespace-nowrap"
                                title="التكليف التعليمي منتهٍ - الواجب للعرض فقط"
                              >
                                تكليف منتهٍ
                              </span>
                            ) : (
                              <>
                                {canChangeHomework && (
                                  <button
                                    onClick={() => handleOpenEdit(row)}
                                    className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                                    title="تعديل الواجب"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}

                                {canDeleteHomework && (
                                  <button
                                    onClick={() => handleOpenDelete(row)}
                                    className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap"
                                    title="حذف الواجب"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-500" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. Mobile Cards Grid */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {homeworks.map((row) => {
                const dueStatus = getDueStatus(row.due_date);

                return (
                  <div
                    key={row.id}
                    className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1">
                        <h4 className="font-bold text-sm text-slate-900">
                          {row.title}
                        </h4>
                        <div className="text-xs text-teal-700 font-semibold flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                          <span>{row.subject_display || "المادة"}</span>
                          <span className="text-slate-400 font-normal">
                            • {row.grade_level_display} ({row.section_display})
                          </span>
                        </div>
                      </div>

                      {dueStatus && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold inline-flex items-center gap-1 ${dueStatus.color}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${dueStatus.dot}`}
                          ></span>
                          <span>{dueStatus.label}</span>
                        </span>
                      )}
                    </div>

                    {/* Description preview */}
                    {row.description && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed line-clamp-2">
                        {row.description}
                      </p>
                    )}

                    {/* Card Details Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">
                          المعلم المكلف:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {row.teacher_display || "المعلم"}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[10px] block">
                          تاريخ النشر:
                        </span>
                        <span className="font-mono text-slate-700">
                          {row.homework_date}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[10px] block">
                          موعد التسليم:
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {row.due_date}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[10px] block">
                          المرفق:
                        </span>
                        {row.attachment ? (
                          <a
                            href={row.attachment}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-teal-700 font-bold hover:underline"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>تنزيل المرفق</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 font-normal">
                            بدون مرفق
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleOpenDetails(row)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 px-3 rounded-xl transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>التفاصيل</span>
                      </button>

                      {isTeacher && isAssignmentEnded(row.teacher_assignment, row) ? (
                        <div className="flex-1 py-1.5 px-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-center text-xs font-semibold">
                          تكليف منتهٍ (للقراءة فقط)
                        </div>
                      ) : (
                        <>
                          {canChangeHomework && (
                            <button
                              onClick={() => handleOpenEdit(row)}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold py-2 px-3 rounded-xl transition-colors border border-blue-200"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>تعديل</span>
                            </button>
                          )}

                          {canDeleteHomework && (
                            <button
                              onClick={() => handleOpenDelete(row)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors border border-rose-200"
                              title="حذف الواجب"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={pageSize}
          onChange={setCurrentPage}
          onPageChange={setCurrentPage}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
        />
      </div>

      {/* Modal: Create Homework */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="إضافة واجب مدرسي جديد"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateHomework} className="space-y-4 text-right">
          {modalError && <Alert type="error">{modalError}</Alert>}

          {/* Mode Selector Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCreateMode("cascade")}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                createMode === "cascade"
                  ? "bg-white text-teal-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>اختيار منظم (الصف • الشعبة • المادة)</span>
            </button>
            <button
              type="button"
              onClick={() => setCreateMode("direct")}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                createMode === "direct"
                  ? "bg-white text-teal-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>اختيار التكليف مباشرة</span>
            </button>
            <button
              type="button"
              onClick={() => setCreateMode("manual")}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                createMode === "manual"
                  ? "bg-white text-teal-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>إدخال UUID يدوياً</span>
            </button>
          </div>

          {/* 1. Cascading Grade / Section / Subject Selectors (User Request) */}
          {createMode === "cascade" && (
            <div className="space-y-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <GraduationCap className="w-4 h-4 text-teal-600" />
                  <span>تحديد الصف والشعبة والمادة الدراسية</span>
                </div>
                <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  خطوة 1 من 2
                </span>
              </div>

              {/* 3 Inputs Grid: الصف، الشعبة، المادة */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. الصف الدراسي */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الصف الدراسي <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={createGradeOptions}
                    value={createGrade}
                    onChange={handleGradeChangeForCreate}
                    placeholder="-- اختر الصف الدراسي --"
                    searchPlaceholder="ابحث باسم الصف..."
                    emptyMessage="لا يوجد صف مطابق للبحث"
                    noOptionsMessage={
                      createGradeOptions.length === 0
                        ? "-- لا توجد صفوف مسجلة --"
                        : "-- اختر الصف --"
                    }
                    required
                  />
                </div>

                {/* 2. الشعبة الدراسية */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الشعبة <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={createSectionOptions}
                    value={createSection}
                    onChange={handleSectionChangeForCreate}
                    placeholder={
                      !createGrade
                        ? "-- اختر الصف أولاً --"
                        : "-- اختر الشعبة --"
                    }
                    searchPlaceholder="ابحث بالشعبة..."
                    emptyMessage="لا توجد شعبة مطابقة للبحث"
                    noOptionsMessage={
                      !createGrade
                        ? "-- يرجى اختيار الصف أولاً --"
                        : "-- لا توجد شعب لهذا الصف --"
                    }
                    disabled={!createGrade}
                    required
                  />
                </div>

                {/* 3. المادة المقررة */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    المادة المقررة <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={createSubjectOptions}
                    value={createSubject}
                    onChange={handleSubjectChangeForCreate}
                    placeholder={
                      !createGrade
                        ? "-- اختر الصف أولاً --"
                        : !createSection
                        ? "-- اختر الشعبة أولاً --"
                        : "-- اختر المادة المقررة --"
                    }
                    searchPlaceholder="ابحث بالمادة..."
                    emptyMessage="لا توجد مادة مطابقة للبحث"
                    noOptionsMessage={
                      !createGrade || !createSection
                        ? "-- اختر الصف والشعبة أولاً --"
                        : "-- لا توجد مواد مقررة لهذه الشعبة --"
                    }
                    disabled={!createGrade || !createSection}
                    required
                  />
                </div>
              </div>

              {/* Assignment Feedback Card */}
              {createGrade && createSection && createSubject && (
                <div className="pt-1">
                  {matchedAssignmentsForSelection.length === 1 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-900">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold">التكليف الأكاديمي المعتمد:</span>{" "}
                          <span>
                            المعلم المكلف:{" "}
                            <strong className="text-emerald-950 font-bold">
                              {matchedAssignmentsForSelection[0].teacher_display ||
                                matchedAssignmentsForSelection[0].teacher_name ||
                                "معلم المادة"}
                            </strong>
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-white border border-emerald-300 text-emerald-700 px-2 py-0.5 rounded-md font-mono hidden sm:inline-block">
                        نشط
                      </span>
                    </div>
                  )}

                  {matchedAssignmentsForSelection.length > 1 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 space-y-2 text-xs text-amber-900">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>يوجد أكثر من تكليف لهذه المادة، يرجى اختيار المعلم المسؤول:</span>
                      </div>
                      <select
                        value={createForm.teacher_assignment}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            teacher_assignment: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      >
                        {matchedAssignmentsForSelection.map((a) => (
                          <option key={a.id} value={a.id}>
                            المعلم: {a.teacher_display || a.teacher_name || "معلم"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {matchedAssignmentsForSelection.length === 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-start gap-2 text-xs text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">لا يوجد تكليف تدريسي مسجل لهذا الاختيار</div>
                        <p className="text-[11px] text-rose-600 mt-0.5">
                          لم يتم ربط هذه المادة بمعلم لهذه الشعبة بعد. يمكنك إسناد التكليف من شاشة تكليفات المعلمين، أو التبديل إلى "اختيار التكليف مباشرة" أو "إدخال UUID يدوياً".
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Direct Single SearchableSelect */}
          {createMode === "direct" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                التكليف الأكاديمي (المادة - الصف والشعبة - المعلم){" "}
                <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={assignmentOptions}
                value={createForm.teacher_assignment}
                onChange={handleDirectAssignmentChange}
                placeholder="-- اختر التكليف الأكاديمي (اكتب للبحث السريع) --"
                searchPlaceholder="اكتب اسم المادة أو الشعبة أو المعلم للبحث..."
                emptyMessage="لا توجد تكليفات أكاديمية مطابقة للبحث"
                noOptionsMessage={
                  assignments.length === 0
                    ? "-- جاري تحميل قائمة التكليفات أو لا توجد تكليفات مسجلة --"
                    : "-- لا توجد تكليفات أكاديمية متاحة --"
                }
                required
                onManualSelect={() => {
                  setCreateMode("manual");
                  setCreateForm((prev) => ({ ...prev, teacher_assignment: "" }));
                }}
              />
            </div>
          )}

          {/* Mode 3: Manual UUID input */}
          {createMode === "manual" && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                معرّف UUID للتكليف الأكاديمي <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="أدخل UUID التكليف الأكاديمي (مثال: e9a165d3-3664-4f17-99ad-30bc1d6d0300)"
                value={createForm.teacher_assignment}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    teacher_assignment: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50"
                required
              />
              <p className="text-[10px] text-slate-400">
                يجب أن يكون معرّف UUID صالح لتكليف تدريسي نشط.
              </p>
            </div>
          )}

          {/* 2. Homework Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              عنوان الواجب <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="مثال: حل تمارين الوحدة الأولى (صفحة 24-26)"
              value={createForm.title}
              onChange={(e) =>
                setCreateForm({ ...createForm, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          {/* 3. Description & Questions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تفاصيل الواجب والأسئلة المطلوبة
            </label>
            <textarea
              rows={3}
              placeholder="اكتب وصفاً تفصيلياً أو الأسئلة والتمارين المطلوب من الطالب إنجازها..."
              value={createForm.description}
              onChange={(e) =>
                setCreateForm({ ...createForm, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* 4. Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ نشر الواجب <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={createForm.homework_date}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    homework_date: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                موعد التسليم النهائي (Due Date){" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={createForm.due_date}
                min={createForm.homework_date}
                onChange={(e) =>
                  setCreateForm({ ...createForm, due_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold text-slate-900"
                required
              />
            </div>
          </div>

          {/* 5. Optional File Attachment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ملف مرفق للواجب (اختياري - PDF / صورة / مستند)
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center bg-slate-50 hover:bg-slate-100/60 transition-colors">
              <input
                type="file"
                id="create-hw-attachment"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setCreateForm({
                      ...createForm,
                      attachment: e.target.files[0],
                    });
                  }
                }}
                className="hidden"
              />
              {createForm.attachment ? (
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 text-xs">
                    <Paperclip className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                      {createForm.attachment.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({(createForm.attachment.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm({ ...createForm, attachment: null })
                    }
                    className="text-rose-500 hover:text-rose-700 text-xs font-bold p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="create-hw-attachment"
                  className="cursor-pointer flex flex-col items-center gap-1 text-slate-500"
                >
                  <Paperclip className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-semibold text-teal-700">
                    اضغط هنا لاختيار ملف من جهازك
                  </span>
                  <span className="text-[10px] text-slate-400">
                    PDF, Word, صور, ملفات مضغوطة
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-1.5 text-xs font-bold shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة الواجب الآن</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Homework */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="تعديل بيانات الواجب المدرسي (PATCH /homework/homeworks/{id}/)"
      >
        <form onSubmit={handleUpdateHomework} className="space-y-4 text-right">
          {modalError && <Alert type="error">{modalError}</Alert>}

          {/* 1. Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              عنوان الواجب <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) =>
                setEditForm({ ...editForm, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          {/* 2. Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تفاصيل الواجب والأسئلة
            </label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* 3. Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ نشر الواجب
              </label>
              <input
                type="date"
                value={editForm.homework_date}
                onChange={(e) =>
                  setEditForm({ ...editForm, homework_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                موعد التسليم النهائي (Due Date)
              </label>
              <input
                type="date"
                value={editForm.due_date}
                min={editForm.homework_date}
                onChange={(e) =>
                  setEditForm({ ...editForm, due_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold text-slate-900"
              />
            </div>
          </div>

          {/* 4. Attachment Update */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تحديث الملف المرفق (اختياري)
            </label>

            {selectedHomework?.attachment && !editForm.attachment && (
              <div className="mb-2 p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-teal-700 font-semibold">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>يوجد ملف مرفق حالي للواجب</span>
                </div>
                <a
                  href={selectedHomework.attachment}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-600 hover:underline text-[11px] font-bold"
                >
                  معاينة الملف
                </a>
              </div>
            )}

            <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center bg-slate-50 hover:bg-slate-100/60 transition-colors">
              <input
                type="file"
                id="edit-hw-attachment"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setEditForm({
                      ...editForm,
                      attachment: e.target.files[0],
                    });
                  }
                }}
                className="hidden"
              />
              {editForm.attachment ? (
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 text-xs">
                    <Paperclip className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                      {editForm.attachment.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({(editForm.attachment.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm({ ...editForm, attachment: null })
                    }
                    className="text-rose-500 hover:text-rose-700 text-xs font-bold p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="edit-hw-attachment"
                  className="cursor-pointer flex flex-col items-center gap-1 text-slate-500"
                >
                  <Paperclip className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-semibold text-teal-700">
                    رفع ملف جديد لاستبدال المرفق الحالي
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-1.5 text-xs font-bold shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Homework Details View */}
      {selectedHomework && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={`تفاصيل الواجب: ${selectedHomework.title}`}
        >
          <div className="space-y-4 text-right text-xs">
            {/* Header Badge */}
            <div className="bg-teal-50 border border-teal-100 p-3.5 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-teal-900">
                  {selectedHomework.title}
                </span>
                {getDueStatus(selectedHomework.due_date) && (
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${
                      getDueStatus(selectedHomework.due_date).color
                    }`}
                  >
                    {getDueStatus(selectedHomework.due_date).label}
                  </span>
                )}
              </div>
              <div className="text-teal-700 font-semibold text-xs flex items-center gap-1.5 pt-1">
                <GraduationCap className="w-4 h-4" />
                <span>
                  {selectedHomework.subject_display || "المادة المقررة"}
                </span>
                <span>•</span>
                <span>
                  {selectedHomework.grade_level_display} -{" "}
                  {selectedHomework.section_display}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">
                وصف ومحتوى الواجب:
              </label>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl leading-relaxed whitespace-pre-line text-slate-800">
                {selectedHomework.description || "لا يوجد وصف إضافي."}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 text-[10px] block">
                  المعلم المسؤول:
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedHomework.teacher_display || "-"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block">
                  السنة الدراسية:
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedHomework.academic_year_display || "-"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block">
                  تاريخ النشر:
                </span>
                <span className="font-mono text-slate-800">
                  {selectedHomework.homework_date || "-"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block">
                  موعد التسليم النهائي:
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedHomework.due_date || "-"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block">
                  أُنشئ بواسطة:
                </span>
                <span className="text-slate-700">
                  @{selectedHomework.created_by_username || "-"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block">
                  تاريخ الإنشاء:
                </span>
                <span className="text-slate-700 font-mono">
                  {formatDateTime(selectedHomework.created_at)}
                </span>
              </div>
            </div>

            {/* Attachment Link */}
            {selectedHomework.attachment && (
              <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <Paperclip className="w-4 h-4 text-indigo-600" />
                  <span>يوجد ملف مرفق للواجب</span>
                </div>
                <a
                  href={selectedHomework.attachment}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg font-bold text-xs shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>فتح / تنزيل الملف</span>
                </a>
              </div>
            )}

            {/* Read-only warning for teachers when assignment is ended */}
            {isTeacher && isAssignmentEnded(selectedHomework.teacher_assignment, selectedHomework) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>هذا الواجب يتبع لتكليف تعليمي منتهٍ، وهو متاح للعرض والمطالعة فقط ولا يمكن تعديله أو حذفه.</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-xs"
              >
                إغلاق
              </Button>
              {canChangeHomework && !(isTeacher && isAssignmentEnded(selectedHomework.teacher_assignment, selectedHomework)) && (
                <Button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenEdit(selectedHomework);
                  }}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>تعديل الواجب</span>
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Delete Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="تأكيد حذف الواجب المدرسي"
      >
        <div className="space-y-4 text-right">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs leading-relaxed">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">هل أنت متأكد من رغبتك بحذف هذا الواجب؟</p>
              <p className="text-rose-600">
                سيتم حذف الواجب بشكل نهائي من النظام ولن يتمكن الطلاب والمعلمون من الاطلاع عليه.
              </p>
            </div>
          </div>

          {selectedHomework && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-800">
                {selectedHomework.title}
              </div>
              <div className="text-slate-500">
                المادة: {selectedHomework.subject_display} • الشعبة:{" "}
                {selectedHomework.section_display}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteHomework}
              disabled={isSubmitting}
              className="gap-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الحذف...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تأكيد الحذف النهائي</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
