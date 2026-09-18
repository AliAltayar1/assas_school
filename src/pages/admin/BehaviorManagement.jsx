import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";
import { toast } from "sonner";
import { parseApiError, extractPaginatedList } from "../../utils/errorUtils";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import {
  Award,
  Plus,
  RefreshCw,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
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
  Tag,
} from "lucide-react";

export function BehaviorManagement() {
  const { hasPermission } = useAuthStore();
  const canAddNote = hasPermission("behavior.add_behaviornote");
  const canChangeNote = hasPermission("behavior.change_behaviornote");
  const canDeleteNote = hasPermission("behavior.delete_behaviornote");

  // Raw & processed data states
  const [rawNotes, setRawNotes] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);

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
  const [noteTypeFilter, setNoteTypeFilter] = useState("");
  const [enrollmentFilter, setEnrollmentFilter] = useState("");
  const [occurredFromFilter, setOccurredFromFilter] = useState("");
  const [occurredToFilter, setOccurredToFilter] = useState("");
  const [orderingFilter, setOrderingFilter] = useState("-occurred_on");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedNote, setSelectedNote] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Manual UUID input toggle
  const [useManualUuid, setUseManualUuid] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    enrollment: "",
    note_type: "positive",
    title: "",
    description: "",
    occurred_on: new Date().toISOString().split("T")[0],
  });

  const [editForm, setEditForm] = useState({
    enrollment: "",
    note_type: "positive",
    title: "",
    description: "",
    occurred_on: "",
  });

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch Dropdown Metadata (Enrollments & Students)
  const fetchMetadata = useCallback(async () => {
    try {
      const [enrollData, studentsData] = await Promise.all([
        api.students?.getEnrollments ? api.students.getEnrollments().catch(() => null) : null,
        api.students?.getStudents ? api.students.getStudents().catch(() => null) : null,
      ]);

      if (enrollData) {
        const { results } = extractPaginatedList(enrollData);
        setEnrollments(results);
      }
      if (studentsData) {
        const { results } = extractPaginatedList(studentsData);
        setStudents(results);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Helper label extractors for dropdowns
  const getEnrollmentLabel = useCallback((enr, index) => {
    if (!enr) return "";
    const studentName =
      enr.student_name ||
      enr.student_display ||
      (typeof enr.student === "object" ? enr.student?.full_name || enr.student?.name : null) ||
      `طالب #${index + 1}`;

    const gradeSection =
      enr.section_display ||
      enr.grade_level_display ||
      (enr.section_name && enr.grade_level_name ? `${enr.grade_level_name} - ${enr.section_name}` : "") ||
      "";

    return gradeSection ? `${studentName} (${gradeSection})` : studentName;
  }, []);

  // Memoized options for SearchableSelect
  const enrollmentOptions = useMemo(() => {
    return enrollments.map((enr, idx) => {
      let studentName =
        enr.student_name ||
        enr.student_display ||
        (typeof enr.student === "object" ? enr.student?.full_name || enr.student?.name : null);

      if (!studentName && enr.student && students.length > 0) {
        const matchSt = students.find((s) => String(s.id) === String(enr.student));
        if (matchSt) {
          studentName = matchSt.full_name || `${matchSt.first_name || ""} ${matchSt.last_name || ""}`.trim();
        }
      }
      if (!studentName) studentName = `طالب #${idx + 1}`;

      const gradeSection =
        enr.section_display ||
        enr.grade_level_display ||
        (enr.section_name && enr.grade_level_name ? `${enr.grade_level_name} - ${enr.section_name}` : "") ||
        "";

      return {
        value: enr.id,
        label: studentName,
        subtext: gradeSection ? `الشعبة والصف: ${gradeSection}` : "",
      };
    });
  }, [enrollments, students]);

  // Helper to extract student and class info for a behavior note
  const getNoteStudentInfo = useCallback(
    (note) => {
      if (!note) return { studentName: "غير محدد", gradeSection: "" };

      // 1. Direct properties on note
      if (note.student_name) {
        return {
          studentName: note.student_name,
          gradeSection: note.grade_section || note.section_display || "",
        };
      }
      if (typeof note.student === "object" && note.student) {
        return {
          studentName: note.student.full_name || note.student.name || note.student_name || "طالب",
          gradeSection: note.grade_section || "",
        };
      }
      if (note.student_display) {
        return {
          studentName: note.student_display,
          gradeSection: note.grade_section || "",
        };
      }

      // 2. Lookup in loaded enrollments by enrollment UUID / ID
      const enrollmentId = typeof note.enrollment === "object" ? note.enrollment?.id : note.enrollment;
      if (enrollmentId && enrollments.length > 0) {
        const matchEnr = enrollments.find(
          (e) => String(e.id) === String(enrollmentId)
        );
        if (matchEnr) {
          const studentName =
            matchEnr.student_name ||
            matchEnr.student_display ||
            (typeof matchEnr.student === "object" ? matchEnr.student?.full_name || matchEnr.student?.name : null) ||
            "طالب";
          const gradeSection =
            matchEnr.section_display ||
            matchEnr.grade_level_display ||
            (matchEnr.section_name && matchEnr.grade_level_name
              ? `${matchEnr.grade_level_name} - ${matchEnr.section_name}`
              : "") ||
            "";
          return { studentName, gradeSection };
        }
      }

      // 3. Lookup in loaded students by student ID
      const studentId = typeof note.student === "string" ? note.student : null;
      if (studentId && students.length > 0) {
        const matchStudent = students.find((s) => String(s.id) === String(studentId));
        if (matchStudent) {
          const studentName =
            matchStudent.full_name ||
            `${matchStudent.first_name || ""} ${matchStudent.last_name || ""}`.trim() ||
            matchStudent.student_name ||
            "طالب";
          return { studentName, gradeSection: "" };
        }
      }

      return {
        studentName: note.enrollment_display || (enrollmentId ? `قيد: ${String(enrollmentId).slice(0, 8)}...` : "طالب"),
        gradeSection: "",
      };
    },
    [enrollments, students]
  );

  // Helper to format ISO date strings cleanly
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

  // Fetch Behavior Notes from Backend API
  const fetchNotes = useCallback(
    async (page = currentPage) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = {
          page: page,
        };

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (noteTypeFilter) params.note_type = noteTypeFilter;
        if (enrollmentFilter) params.enrollment = enrollmentFilter;
        if (occurredFromFilter) {
          params.occurred_from = occurredFromFilter;
          params.occurred_on__gte = occurredFromFilter;
        }
        if (occurredToFilter) {
          params.occurred_to = occurredToFilter;
          params.occurred_on__lte = occurredToFilter;
        }
        if (orderingFilter) params.ordering = orderingFilter;

        const response = await api.behavior.getNotes(params);
        const { results, count, next, previous } = extractPaginatedList(response);

        setRawNotes(results);
        setTotalCount(count);
        setHasNext(Boolean(next));
        setHasPrevious(Boolean(previous));
      } catch (err) {
        setError(
          parseApiError(err, "حدث خطأ أثناء تحميل الملاحظات السلوكية والتربوية.")
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentPage,
      debouncedSearch,
      noteTypeFilter,
      enrollmentFilter,
      occurredFromFilter,
      occurredToFilter,
      orderingFilter,
    ]
  );

  useEffect(() => {
    fetchNotes(currentPage);
  }, [fetchNotes, currentPage]);

  // Client-Side Fail-safe / Hybrid Filtering Pass:
  // Guarantees all filters work 100% reliably even if the backend ignores certain query params.
  const filteredNotes = useMemo(() => {
    let list = [...rawNotes];

    // 1. Note Type Filter
    if (noteTypeFilter) {
      list = list.filter((n) => n.note_type === noteTypeFilter);
    }

    // 2. Enrollment / Student Filter
    if (enrollmentFilter) {
      list = list.filter((n) => {
        const noteEnrId = typeof n.enrollment === "object" ? n.enrollment?.id : n.enrollment;
        return String(noteEnrId) === String(enrollmentFilter);
      });
    }

    // 3. Date From Filter
    if (occurredFromFilter) {
      list = list.filter((n) => {
        if (!n.occurred_on) return true;
        return n.occurred_on >= occurredFromFilter;
      });
    }

    // 4. Date To Filter
    if (occurredToFilter) {
      list = list.filter((n) => {
        if (!n.occurred_on) return true;
        return n.occurred_on <= occurredToFilter;
      });
    }

    // 5. Search Text Filter (checks title, description, author, student name, and grade/section)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter((n) => {
        const titleMatch = n.title && n.title.toLowerCase().includes(q);
        const descMatch = n.description && n.description.toLowerCase().includes(q);
        const authorMatch =
          (n.created_by_username && n.created_by_username.toLowerCase().includes(q)) ||
          (n.created_by && String(n.created_by).toLowerCase().includes(q));

        const studentInfo = getNoteStudentInfo(n);
        const studentMatch =
          studentInfo.studentName && studentInfo.studentName.toLowerCase().includes(q);
        const sectionMatch =
          studentInfo.gradeSection && studentInfo.gradeSection.toLowerCase().includes(q);

        return titleMatch || descMatch || authorMatch || studentMatch || sectionMatch;
      });
    }

    // 6. Ordering Filter
    if (orderingFilter) {
      list.sort((a, b) => {
        if (orderingFilter === "-occurred_on") {
          return (b.occurred_on || "").localeCompare(a.occurred_on || "");
        }
        if (orderingFilter === "occurred_on") {
          return (a.occurred_on || "").localeCompare(b.occurred_on || "");
        }
        if (orderingFilter === "-created_at") {
          return (b.created_at || "").localeCompare(a.created_at || "");
        }
        if (orderingFilter === "title") {
          return (a.title || "").localeCompare(b.title || "", "ar");
        }
        return 0;
      });
    }

    return list;
  }, [
    rawNotes,
    noteTypeFilter,
    enrollmentFilter,
    occurredFromFilter,
    occurredToFilter,
    debouncedSearch,
    orderingFilter,
    getNoteStudentInfo,
  ]);

  // Handlers
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setNoteTypeFilter("");
    setEnrollmentFilter("");
    setOccurredFromFilter("");
    setOccurredToFilter("");
    setOrderingFilter("-occurred_on");
    setCurrentPage(1);
  };

  // Date Presets
  const handleSetToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setOccurredFromFilter(today);
    setOccurredToFilter(today);
    setCurrentPage(1);
  };

  const handleSetLast7Days = () => {
    const today = new Date();
    const past7 = new Date();
    past7.setDate(today.getDate() - 7);
    setOccurredFromFilter(past7.toISOString().split("T")[0]);
    setOccurredToFilter(today.toISOString().split("T")[0]);
    setCurrentPage(1);
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const today = now.toISOString().split("T")[0];
    setOccurredFromFilter(firstDay);
    setOccurredToFilter(today);
    setCurrentPage(1);
  };

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    debouncedSearch ||
      noteTypeFilter ||
      enrollmentFilter ||
      occurredFromFilter ||
      occurredToFilter ||
      orderingFilter !== "-occurred_on"
  );

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalError(null);
    setCreateForm({
      enrollment: enrollments[0]?.id || "",
      note_type: "positive",
      title: "",
      description: "",
      occurred_on: new Date().toISOString().split("T")[0],
    });
    setIsCreateModalOpen(true);
  };

  // Submit Create Note
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!createForm.enrollment || !createForm.title.trim() || !createForm.occurred_on) {
      setModalError("يرجى تحديد القيد المدرسي وعنوان الملاحظة وتاريخ وقوعها");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        enrollment: createForm.enrollment,
        note_type: createForm.note_type,
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        occurred_on: createForm.occurred_on,
      };

      const res = await api.behavior.createNote(payload);
      toast.success(res?.message || "تمت إضافة الملاحظة السلوكية بنجاح.");
      setIsCreateModalOpen(false);
      fetchNotes(1);
    } catch (err) {
      setModalError(parseApiError(err, "فشل إضافة الملاحظة السلوكية."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal (PATCH)
  const handleOpenEdit = (note) => {
    setSelectedNote(note);
    setModalError(null);
    const enrId = typeof note.enrollment === "object" ? note.enrollment?.id : note.enrollment;
    setEditForm({
      enrollment: enrId || "",
      note_type: note.note_type || "positive",
      title: note.title || "",
      description: note.description || "",
      occurred_on: note.occurred_on || "",
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Note (PATCH)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedNote?.id) return;

    setIsSubmitting(true);
    try {
      const payload = {
        note_type: editForm.note_type,
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        occurred_on: editForm.occurred_on,
      };
      if (editForm.enrollment) {
        payload.enrollment = editForm.enrollment;
      }

      const res = await api.behavior.updateNote(selectedNote.id, payload);
      toast.success(res?.message || "تم تعديل الملاحظة السلوكية بنجاح.");
      setIsEditModalOpen(false);
      fetchNotes(currentPage);
    } catch (err) {
      setModalError(parseApiError(err, "فشل تعديل الملاحظة السلوكية."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Details Modal
  const handleOpenDetails = (note) => {
    setSelectedNote(note);
    setIsDetailsModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (note) => {
    setSelectedNote(note);
    setModalError(null);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Note
  const handleDeleteSubmit = async () => {
    if (!selectedNote?.id) return;

    setIsSubmitting(true);
    try {
      await api.behavior.deleteNote(selectedNote.id);
      toast.success("تم حذف الملاحظة السلوكية بنجاح.");
      setIsDeleteModalOpen(false);
      fetchNotes(currentPage);
    } catch (err) {
      setModalError(parseApiError(err, "فشل حذف الملاحظة السلوكية."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Statistics calculation from current dataset
  const positiveNotesCount = rawNotes.filter((n) => n.note_type === "positive").length;
  const negativeNotesCount = rawNotes.filter((n) => n.note_type === "negative").length;

  return (
    <div className="space-y-4 sm:space-y-6 text-right dir-rtl" dir="rtl">
      {/* 1. Header with Title and Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              الملاحظات السلوكية والتربوية (Behavior Notes)
            </h2>
            {totalCount > 0 && (
              <span className="bg-amber-50 text-amber-800 text-xs px-2.5 py-0.5 rounded-full border border-amber-200 font-bold">
                {totalCount} ملاحظة
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 pr-1">
            توثيق ومتابعة السلوك الإيجابي والتوجيهي للطلاب بدقة لتعزيز الانضباط والتفوق
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotes(currentPage)}
            disabled={isLoading}
            title="تحديث القائمة"
            className="h-9 px-3"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {canAddNote && (
            <Button
              onClick={handleOpenCreate}
              className="gap-1.5 text-xs font-bold h-9 px-3.5 shadow-sm bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة ملاحظة سلوكية</span>
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* 2. Quick Stat Counters Cards (Interactive Click-to-Filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Notes */}
        <div
          onClick={() => {
            setNoteTypeFilter("");
            setCurrentPage(1);
          }}
          className={`bg-white p-4 rounded-2xl border cursor-pointer transition-all duration-200 shadow-sm flex items-center justify-between hover:shadow-md ${
            noteTypeFilter === ""
              ? "border-slate-400 ring-2 ring-slate-400/20"
              : "border-slate-200 hover:border-slate-300"
          }`}
          title="عرض جميع الملاحظات"
        >
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">
              إجمالي الملاحظات المسجلة
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
              {totalCount || rawNotes.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
            <Award className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        {/* Positive Notes */}
        <div
          onClick={() => {
            setNoteTypeFilter(noteTypeFilter === "positive" ? "" : "positive");
            setCurrentPage(1);
          }}
          className={`bg-white p-4 rounded-2xl border cursor-pointer transition-all duration-200 shadow-sm flex items-center justify-between hover:shadow-md bg-emerald-50/30 ${
            noteTypeFilter === "positive"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/60"
              : "border-emerald-200 hover:border-emerald-300"
          }`}
          title="تصفية: الملاحظات الإيجابية فقط"
        >
          <div>
            <span className="text-[11px] text-emerald-800 font-semibold block">
              الملاحظات الإيجابية (تعزيز وتفوق)
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">
              {positiveNotesCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Negative / Guidance Notes */}
        <div
          onClick={() => {
            setNoteTypeFilter(noteTypeFilter === "negative" ? "" : "negative");
            setCurrentPage(1);
          }}
          className={`bg-white p-4 rounded-2xl border cursor-pointer transition-all duration-200 shadow-sm flex items-center justify-between hover:shadow-md bg-rose-50/30 ${
            noteTypeFilter === "negative"
              ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/60"
              : "border-rose-200 hover:border-rose-300"
          }`}
          title="تصفية: الملاحظات التوجيهية فقط"
        >
          <div>
            <span className="text-[11px] text-rose-800 font-semibold block">
              الملاحظات التوجيهية (سلبية / متابعة)
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-700 mt-1 block">
              {negativeNotesCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Comprehensive Filter & Search Toolbar */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <SlidersHorizontal className="w-4 h-4 text-teal-600" />
            <span>خيارات التصفية والبحث المتقدم</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>إعادة ضبط جميع الفلاتر</span>
            </button>
          )}
        </div>

        {/* Primary Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Search Input with Clear Button */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث بالعنوان، الطالب، التفاصيل..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pr-9 pl-8 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/60 hover:bg-white focus:bg-white transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setDebouncedSearch("");
                  setCurrentPage(1);
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Student / Enrollment Dropdown Selector */}
          <div>
            <SearchableSelect
              options={[
                { value: "", label: "جميع الطلاب (All Students)" },
                ...enrollmentOptions,
              ]}
              value={enrollmentFilter}
              onChange={(val) => {
                setEnrollmentFilter(val);
                setCurrentPage(1);
              }}
              placeholder="جميع الطلاب (اكتب للفلترة)..."
              searchPlaceholder="ابحث باسم الطالب..."
              allowClear={Boolean(enrollmentFilter)}
            />
          </div>

          {/* Note Type Filter */}
          <div>
            <select
              value={noteTypeFilter}
              onChange={(e) => {
                setNoteTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/60 hover:bg-white focus:bg-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
            >
              <option value="">جميع أنواع الملاحظات</option>
              <option value="positive">🟢 إيجابية فقط (Positive)</option>
              <option value="negative">🔴 سلبية / توجيهية فقط (Negative)</option>
            </select>
          </div>

          {/* Ordering Filter */}
          <div>
            <select
              value={orderingFilter}
              onChange={(e) => {
                setOrderingFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/60 hover:bg-white focus:bg-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none transition-colors"
            >
              <option value="-occurred_on">الأحدث تاريخاً أولاً</option>
              <option value="occurred_on">الأقدم تاريخاً أولاً</option>
              <option value="-created_at">أحدث وقت تسجيل</option>
              <option value="title">أبجدياً حسب العنوان</option>
            </select>
          </div>
        </div>

        {/* Date Range & Quick Preset Filters Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-medium flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>تاريخ الوقوع:</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="text-slate-400 text-[11px]">من:</span>
                <input
                  type="date"
                  value={occurredFromFilter}
                  onChange={(e) => {
                    setOccurredFromFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs focus:outline-none text-slate-700"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <span className="text-slate-400 text-[11px]">إلى:</span>
                <input
                  type="date"
                  value={occurredToFilter}
                  onChange={(e) => {
                    setOccurredToFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs focus:outline-none text-slate-700"
                />
              </div>

              {(occurredFromFilter || occurredToFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setOccurredFromFilter("");
                    setOccurredToFilter("");
                    setCurrentPage(1);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 px-1"
                  title="مسح التاريخ"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 lg:pt-0">
            <span className="text-[11px] text-slate-400 ml-1">فترات سريعة:</span>
            <button
              type="button"
              onClick={handleSetToday}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={handleSetLast7Days}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              onClick={handleSetThisMonth}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              هذا الشهر
            </button>
          </div>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium">الفلاتر المطبقة:</span>

            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-medium px-2 py-0.5 rounded-md">
                <span>بحث: "{debouncedSearch}"</span>
                <button
                  onClick={() => {
                    setSearchInput("");
                    setDebouncedSearch("");
                  }}
                  className="hover:text-teal-950"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {noteTypeFilter && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                  noteTypeFilter === "positive"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                <span>نوع: {noteTypeFilter === "positive" ? "إيجابية" : "سلبية"}</span>
                <button onClick={() => setNoteTypeFilter("")} className="hover:opacity-80">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {enrollmentFilter && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-medium px-2 py-0.5 rounded-md">
                <span>طالب محدد</span>
                <button onClick={() => setEnrollmentFilter("")} className="hover:text-blue-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {occurredFromFilter && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium px-2 py-0.5 rounded-md">
                <span>من: {occurredFromFilter}</span>
                <button onClick={() => setOccurredFromFilter("")} className="hover:text-amber-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {occurredToFilter && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium px-2 py-0.5 rounded-md">
                <span>إلى: {occurredToFilter}</span>
                <button onClick={() => setOccurredToFilter("")} className="hover:text-amber-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={handleClearFilters}
              className="text-[11px] text-slate-500 hover:text-rose-600 underline pr-1 font-semibold"
            >
              مسح الكل
            </button>
          </div>
        )}
      </div>

      {/* 4. Main Behavior Notes Display (Desktop Table + Mobile Cards) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-teal-600" />
            <p className="text-xs font-semibold text-slate-600">
              جاري تحميل الملاحظات السلوكية والتربوية...
            </p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="p-8 sm:p-12">
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                <Award className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-slate-800">
                {hasActiveFilters
                  ? "لا توجد ملاحظات تطابق معايير التصفية والبحث"
                  : "لا توجد ملاحظات سلوكية مسجلة حالياً"}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {hasActiveFilters
                  ? "جرب تعديل خيارات البحث أو التصفية للوصول إلى النتائج المطلوبة."
                  : "ابدأ بتوثيق الملاحظات الإيجابية أو التوجيهية للطلاب لتعزيز البيئة التربوية والتفاعل الإيجابي."}
              </p>
              {hasActiveFilters ? (
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  size="sm"
                  className="mt-2 font-bold"
                >
                  إعادة ضبط الفلاتر
                </Button>
              ) : (
                canAddNote && (
                  <Button
                    onClick={handleOpenCreate}
                    className="gap-2 mt-2 font-bold shadow-sm bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة أول ملاحظة سلوكية الآن</span>
                  </Button>
                )
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-xs text-right min-w-[900px]">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3.5">النوع</th>
                    <th className="p-3.5">الطالب والشعبة</th>
                    <th className="p-3.5">عنوان الملاحظة</th>
                    <th className="p-3.5">تفاصيل الملاحظة</th>
                    <th className="p-3.5">تاريخ الملاحظة</th>
                    <th className="p-3.5">الموثق</th>
                    <th className="p-3.5">تاريخ التوثيق</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredNotes.map((row) => {
                    const studentInfo = getNoteStudentInfo(row);
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Note Type */}
                        <td className="p-3.5">
                          {row.note_type === "positive" ? (
                            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-bold inline-flex items-center gap-1.5 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>{row.note_type_display || "إيجابية"}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 font-bold inline-flex items-center gap-1.5 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              <span>{row.note_type_display || "سلبية"}</span>
                            </span>
                          )}
                        </td>

                        {/* Student Name & Section */}
                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>{studentInfo.studentName}</span>
                            </div>
                            {studentInfo.gradeSection && (
                              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                                {studentInfo.gradeSection}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Title */}
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            {row.note_type === "positive" ? (
                              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                            <span>{row.title}</span>
                          </div>
                        </td>

                        {/* Description preview */}
                        <td className="p-3.5 text-slate-600 max-w-xs truncate">
                          {row.description || (
                            <span className="text-slate-400 italic">لا توجد تفاصيل إضافية</span>
                          )}
                        </td>

                        {/* Occurred On */}
                        <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{row.occurred_on}</span>
                          </div>
                        </td>

                        {/* Created By */}
                        <td className="p-3.5 text-slate-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold">
                              {row.created_by_username || row.created_by || "مستخدم"}
                            </span>
                          </div>
                        </td>

                        {/* Timestamps */}
                        <td className="p-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatDateTime(row.created_at) || "-"}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenDetails(row)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="عرض التفاصيل الكاملة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {canChangeNote && (
                              <button
                                onClick={() => handleOpenEdit(row)}
                                className="p-1.5 text-teal-600 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors"
                                title="تعديل الملاحظة"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {canDeleteNote && (
                              <button
                                onClick={() => handleOpenDelete(row)}
                                className="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors"
                                title="حذف الملاحظة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Grid View */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {filteredNotes.map((row) => {
                const studentInfo = getNoteStudentInfo(row);
                return (
                  <div
                    key={row.id}
                    className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {row.note_type === "positive" ? (
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>{row.note_type_display || "إيجابية"}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{row.note_type_display || "سلبية"}</span>
                          </span>
                        )}
                        <span className="text-slate-400 text-xs font-mono">
                          {row.occurred_on}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium">
                        بواسطة: {row.created_by_username || row.created_by || "مستخدم"}
                      </div>
                    </div>

                    {/* Student Info in Card */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-teal-600" />
                        <span className="font-bold text-xs text-slate-900">
                          {studentInfo.studentName}
                        </span>
                      </div>
                      {studentInfo.gradeSection && (
                        <span className="text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                          {studentInfo.gradeSection}
                        </span>
                      )}
                    </div>

                    {/* Card Title & Body */}
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{row.title}</h4>
                      {row.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {row.description}
                        </p>
                      )}
                    </div>

                    {/* Card Action Buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenDetails(row)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl transition-colors border border-slate-200/80"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>عرض</span>
                      </button>

                      {canChangeNote && (
                        <button
                          onClick={() => handleOpenEdit(row)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold py-2 px-3 rounded-xl transition-colors border border-teal-200/80"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>تعديل</span>
                        </button>
                      )}

                      {canDeleteNote && (
                        <button
                          onClick={() => handleOpenDelete(row)}
                          className="flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold py-2 px-3 rounded-xl transition-colors border border-rose-200/80"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
          totalCount={totalCount || filteredNotes.length}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
        />
      </div>

      {/* 5. Modal: Create Behavior Note (POST /api/v1/behavior/notes/) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="إضافة ملاحظة سلوكية جديدة (POST /behavior/notes/)"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-right">
          {modalError && <Alert type="error">{modalError}</Alert>}

          {/* Note Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              نوع الملاحظة السلوكية <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCreateForm({ ...createForm, note_type: "positive" })}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                  createForm.note_type === "positive"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-400/20"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>إيجابية (Positive)</span>
              </button>

              <button
                type="button"
                onClick={() => setCreateForm({ ...createForm, note_type: "negative" })}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                  createForm.note_type === "negative"
                    ? "bg-rose-50 text-rose-800 border-rose-400 ring-2 ring-rose-400/20"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>سلبية / توجيهية (Negative)</span>
              </button>
            </div>
          </div>

          {/* Enrollment Selector */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                القيد المدرسي للطالب (Enrollment) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setUseManualUuid(!useManualUuid)}
                className="text-[11px] text-teal-600 hover:underline font-semibold"
              >
                {useManualUuid ? "الرجوع للقائمة" : "إدخال UUID يدوياً"}
              </button>
            </div>

            {useManualUuid ? (
              <input
                type="text"
                placeholder="أدخل UUID القيد المدرسي للطالب"
                value={createForm.enrollment}
                onChange={(e) => setCreateForm({ ...createForm, enrollment: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            ) : (
              <SearchableSelect
                options={enrollmentOptions}
                value={createForm.enrollment}
                onChange={(val) =>
                  setCreateForm((prev) => ({ ...prev, enrollment: val }))
                }
                placeholder="-- اختر الطالب / القيد المدرسي (اكتب للبحث) --"
                searchPlaceholder="اكتب اسم الطالب للبحث..."
                emptyMessage="لا يوجد طلاب مطابقين للبحث"
                noOptionsMessage={
                  enrollments.length === 0
                    ? "-- جاري تحميل قائمة القيود أو لا توجد قيود مسجلة --"
                    : "-- لا توجد خيارات متاحة --"
                }
                required
                onManualSelect={() => {
                  setUseManualUuid(true);
                  setCreateForm((prev) => ({ ...prev, enrollment: "" }));
                }}
              />
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              عنوان الملاحظة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="مثال: تعاون مميز داخل الصف / تأخر متكرر عن الحصة"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تفاصيل الملاحظة السلوكية
            </label>
            <textarea
              rows={3}
              placeholder="تفاصيل الموقف السلوكي أو التوجيه التربوي المطلوب..."
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Occurred On */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ وقوع الملاحظة (occurred_on) <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={createForm.occurred_on}
              onChange={(e) => setCreateForm({ ...createForm, occurred_on: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-2">
            <Button type="submit" isLoading={isSubmitting} className="flex-1 font-bold bg-teal-600 hover:bg-teal-700 text-white">
              حفظ وإضافة الملاحظة
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Modal: Edit Behavior Note (PATCH /api/v1/behavior/notes/{id}/) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="تعديل الملاحظة السلوكية (PATCH Note)"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-right">
          {modalError && <Alert type="error">{modalError}</Alert>}

          {/* Note Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              نوع الملاحظة
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, note_type: "positive" })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                  editForm.note_type === "positive"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-400/20"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>إيجابية</span>
              </button>

              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, note_type: "negative" })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                  editForm.note_type === "negative"
                    ? "bg-rose-50 text-rose-800 border-rose-400 ring-2 ring-rose-400/20"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>سلبية / توجيهية</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              عنوان الملاحظة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تفاصيل الملاحظة
            </label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Occurred On */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ وقوع الملاحظة <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={editForm.occurred_on}
              onChange={(e) => setEditForm({ ...editForm, occurred_on: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-2">
            <Button type="submit" isLoading={isSubmitting} className="flex-1 font-bold bg-teal-600 hover:bg-teal-700 text-white">
              حفظ التعديلات
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. Modal: View Note Details */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="تفاصيل الملاحظة السلوكية"
      >
        {selectedNote && (() => {
          const studentInfo = getNoteStudentInfo(selectedNote);
          return (
            <div className="space-y-4 text-right text-xs">
              {/* Note Type Header Card */}
              <div
                className={`p-4 rounded-2xl border ${
                  selectedNote.note_type === "positive"
                    ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50/50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm flex items-center gap-1.5">
                    {selectedNote.note_type === "positive" ? (
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{selectedNote.title}</span>
                  </span>
                  <span className="font-semibold text-[11px] px-2.5 py-0.5 rounded-full bg-white border border-current">
                    {selectedNote.note_type_display ||
                      (selectedNote.note_type === "positive" ? "إيجابية" : "سلبية")}
                  </span>
                </div>
              </div>

              {/* Student Information Card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">الطالب المستهدف:</span>
                    <span className="font-bold text-xs text-slate-900">{studentInfo.studentName}</span>
                  </div>
                </div>
                {studentInfo.gradeSection && (
                  <span className="text-xs bg-white text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
                    {studentInfo.gradeSection}
                  </span>
                )}
              </div>

              {/* Description Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">نص وتفاصيل الملاحظة:</span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedNote.description || "لا توجد تفاصيل إضافية مدخلة."}
                </p>
              </div>

              {/* Metadata Info */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-slate-600">
                <div>
                  <span className="text-slate-400 text-[10px] block">تاريخ الملاحظة:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedNote.occurred_on}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">الموثق (منشئ الملاحظة):</span>
                  <span className="font-semibold text-slate-800">
                    {selectedNote.created_by_username || selectedNote.created_by || "مستخدم"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">تاريخ التسجيل في النظام:</span>
                  <span className="font-mono text-slate-700">{formatDateTime(selectedNote.created_at) || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">معرف الملاحظة (UUID):</span>
                  <span className="font-mono text-[10px] text-slate-500">{selectedNote.id}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button onClick={() => setIsDetailsModalOpen(false)}>
                  إغلاق
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* 8. Modal: Delete Confirmation (DELETE /api/v1/behavior/notes/{id}/) */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="تأكيد حذف الملاحظة السلوكية"
      >
        <div className="space-y-4 text-right">
          {modalError && <Alert type="error">{modalError}</Alert>}

          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
              <AlertTriangle className="w-5 h-5" />
              <span>تحذير حذف نهائي</span>
            </div>
            <p>
              هل أنت متأكد من رغبتك في حذف الملاحظة السلوكية{" "}
              <strong>"{selectedNote?.title}"</strong>؟ لن تتمكن من استرجاع هذا السجل لاحقاً.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleDeleteSubmit}
              isLoading={isSubmitting}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              تأكيد الحذف نهائياً
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
