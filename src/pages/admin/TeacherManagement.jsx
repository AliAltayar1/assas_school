import React, { useState, useEffect, useCallback } from "react";
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
  Edit2,
  StopCircle,
  Filter,
  RefreshCw,
  Plus,
  UserCheck,
  Calendar,
  Layers,
  GraduationCap,
  Clock,
  ChevronDown,
} from "lucide-react";

export function TeacherManagement() {
  const { user } = useAuthStore();

  // Data states
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [gradeSubjects, setGradeSubjects] = useState([]);
  const [sections, setSections] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [pageSize, setPageSize] = useState(20);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState("");

  // Modals state
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isEditAssignmentModalOpen, setIsEditAssignmentModalOpen] =
    useState(false);
  const [isEndAssignmentModalOpen, setIsEndAssignmentModalOpen] =
    useState(false);

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [endDateInput, setEndDateInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Toggle Manual UUID inputs vs Select Dropdowns
  const [useManualUuid, setUseManualUuid] = useState(false);

  // Forms state
  const [assignmentForm, setAssignmentForm] = useState({
    teacher: "",
    grade_subject: "",
    section: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });

  const [editAssignmentForm, setEditAssignmentForm] = useState({
    teacher: "",
    grade_subject: "",
    section: "",
    start_date: "",
    end_date: "",
  });

  // Fetch teaching assignments with pagination, search, and filters
  const fetchAssignments = useCallback(
    async (page = currentPage) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = {
          page: page,
        };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (selectedTeacherFilter) params.teacher = selectedTeacherFilter;

        const data = await api.teachingAssignments.getAll(params);
        const { results, count, next, previous } = extractPaginatedList(data);

        setAssignments(results);
        setTotalCount(count);
        setHasNext(Boolean(next));
        setHasPrevious(Boolean(previous));
      } catch (err) {
        setError(
          parseApiError(err, "حدث خطأ أثناء تحميل التكليفات الأكاديمية.")
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, searchQuery, selectedTeacherFilter]
  );

  // Helper label extractors for dropdowns
  const getTeacherLabel = (t) => {
    if (!t) return "";
    const name =
      t.full_name ||
      `${t.first_name || ""} ${t.last_name || ""}`.trim() ||
      t.username ||
      "معلم";
    return t.username ? `${name} (@${t.username})` : name;
  };

  const getGradeSubjectLabel = (gs, index) => {
    if (!gs) return "";
    const subjName =
      gs.subject_display ||
      gs.subject_name ||
      (typeof gs.subject === "object" ? gs.subject?.name : null) ||
      gs.display_name ||
      gs.title ||
      `مادة مقررة #${index + 1}`;

    const gradeName =
      gs.grade_level_display ||
      gs.grade_level_name ||
      (typeof gs.grade_level === "object" ? gs.grade_level?.name : null) ||
      "";

    return gradeName ? `${subjName} (${gradeName})` : subjName;
  };

  const getSectionLabel = (sec, index) => {
    if (!sec) return "";
    const secName =
      sec.name || sec.section_name || sec.title || `شعبة #${index + 1}`;
    const gradeName =
      sec.grade_level_display ||
      sec.grade_level_name ||
      (typeof sec.grade_level === "object" ? sec.grade_level?.name : null) ||
      "";

    return gradeName ? `${secName} - ${gradeName}` : secName;
  };

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

  // Fetch Metadata for Select Dropdowns
  const fetchMetadata = useCallback(async () => {
    try {
      const [usersData, gsData, secData] = await Promise.all([
        api.users.getUsers({ role: "teacher" }).catch(() => null),
        api.academics?.getGradeSubjects
          ? api.academics.getGradeSubjects().catch(() => null)
          : null,
        api.academics?.getSections
          ? api.academics.getSections().catch(() => null)
          : null,
      ]);

      const teacherList = extractPaginatedList(usersData).results;
      if (teacherList && teacherList.length > 0) {
        setTeachers(teacherList);
      } else {
        const allUsers = await api.users.getUsers().catch(() => null);
        const allList = extractPaginatedList(allUsers).results;
        setTeachers(allList || []);
      }

      if (gsData) {
        setGradeSubjects(extractPaginatedList(gsData).results || []);
      }
      if (secData) {
        setSections(extractPaginatedList(secData).results || []);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchAssignments(currentPage);
  }, [fetchAssignments, currentPage]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleTeacherFilterChange = (e) => {
    setSelectedTeacherFilter(e.target.value);
    setCurrentPage(1);
  };

  // Create Assignment Handler
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (
      !assignmentForm.teacher ||
      !assignmentForm.grade_subject ||
      !assignmentForm.section ||
      !assignmentForm.start_date
    ) {
      setModalError("يرجى اختيار المعلم والمادة المقررة والشعبة وتاريخ البداية");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        teacher: assignmentForm.teacher,
        grade_subject: assignmentForm.grade_subject,
        section: assignmentForm.section,
        start_date: assignmentForm.start_date,
      };
      if (assignmentForm.end_date) payload.end_date = assignmentForm.end_date;

      await api.teachingAssignments.create(payload);
      toast.success("تم إسناد التكليف الأكاديمي للمعلم بنجاح");
      setIsAssignmentModalOpen(false);
      fetchAssignments(1);
    } catch (err) {
      setModalError(parseApiError(err, "فشل إنشاء التكليف الأكاديمي."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Assignment Handler
  const handlePatchAssignment = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedAssignment?.id) return;

    setIsSubmitting(true);
    try {
      const payload = {
        teacher: editAssignmentForm.teacher,
        grade_subject: editAssignmentForm.grade_subject,
        section: editAssignmentForm.section,
        start_date: editAssignmentForm.start_date,
      };
      if (editAssignmentForm.end_date) {
        payload.end_date = editAssignmentForm.end_date;
      }

      await api.teachingAssignments.patch(selectedAssignment.id, payload);
      toast.success("تم تعديل التكليف الأكاديمي بنجاح");
      setIsEditAssignmentModalOpen(false);
      fetchAssignments(currentPage);
    } catch (err) {
      setModalError(parseApiError(err, "فشل تعديل التكليف الأكاديمي."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // End Assignment Handler
  const handleEndAssignment = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedAssignment?.id || !endDateInput) {
      setModalError("يرجى تحديد تاريخ نهاية التكليف");
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedAssignment.end_date) {
        await api.teachingAssignments.patch(selectedAssignment.id, {
          end_date: endDateInput,
        });
        toast.success("تم تحديث تاريخ نهاية التكليف بنجاح.");
      } else {
        const res = await api.teachingAssignments.endAssignment(
          selectedAssignment.id,
          endDateInput
        );
        toast.success(res?.detail || "تم إنهاء تكليف المعلم بنجاح.");
      }
      setIsEndAssignmentModalOpen(false);
      fetchAssignments(currentPage);
    } catch (err) {
      setModalError(parseApiError(err, "فشل إنهاء التكليف الأكاديمي."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalError(null);
    setAssignmentForm({
      teacher: teachers[0]?.id || "",
      grade_subject: gradeSubjects[0]?.id || "",
      section: sections[0]?.id || "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
    });
    setIsAssignmentModalOpen(true);
  };

  const handleOpenEdit = (assignment) => {
    setSelectedAssignment(assignment);
    setModalError(null);
    setEditAssignmentForm({
      teacher: assignment.teacher || "",
      grade_subject: assignment.grade_subject || "",
      section: assignment.section || "",
      start_date: assignment.start_date || "",
      end_date: assignment.end_date || "",
    });
    setIsEditAssignmentModalOpen(true);
  };

  const handleOpenEnd = (assignment) => {
    setSelectedAssignment(assignment);
    setModalError(null);
    setEndDateInput(
      assignment.end_date || new Date().toISOString().split("T")[0]
    );
    setIsEndAssignmentModalOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6 text-right dir-rtl" dir="rtl">
      {/* Top Header - Ultra Responsive */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              وحدة تكليفات المعلمين (Teaching Assignments)
            </h2>
            {totalCount > 0 && (
              <span className="bg-teal-50 text-teal-700 text-xs px-2.5 py-0.5 rounded-full border border-teal-200 font-bold">
                {totalCount} تكليف
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 pr-1">
            إسناد المواد المقررة والشُّعَب الدراسية للمعلمين وتتبع التواريخ والبيانات الأكاديمية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAssignments(currentPage)}
            disabled={isLoading}
            title="تحديث القائمة"
            className="h-9 px-3"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              const active =
                assignments.find((a) => !a.end_date) || assignments[0];
              if (active) {
                handleOpenEnd(active);
              } else {
                toast.info("لا توجد تكليفات متاحة لإنهائها حالياً.");
              }
            }}
            className="gap-1.5 border-amber-300 text-amber-800 bg-amber-50/80 hover:bg-amber-100 text-xs font-semibold h-9 px-3"
          >
            <StopCircle className="w-4 h-4 text-amber-600" />
            <span>إنهاء تكليف</span>
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="gap-1.5 text-xs font-bold h-9 px-3.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إسناد تكليف جديد</span>
          </Button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filter and Search Bar - Fully Responsive Stack */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center space-x-2 space-x-reverse flex-1">
          <div className="relative w-full">
            <Filter className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث باسم المعلم، المادة، أو الصف..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 hover:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {teachers.length > 0 && (
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedTeacherFilter}
                onChange={handleTeacherFilterChange}
                className="w-full sm:w-auto min-w-[150px] pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none appearance-none"
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
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-1.5 text-xs h-8 sm:h-9"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة تكليف</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area: Responsive Hybrid (Cards on Mobile, Table on Desktop) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-teal-600" />
            <p className="text-xs font-semibold text-slate-600">
              جاري تحميل قائمة التكليفات الأكاديمية...
            </p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-8 sm:p-12">
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100">
                <BookOpen className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-slate-800">
                لا توجد تكليفات أكاديمية مسجلة حالياً
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                قم بربط المعلمين بالمواد المقررة والشعب الدراسية لتنظيم جدول الحصص والخطط الدراسية.
              </p>
              <Button onClick={handleOpenCreate} className="gap-2 mt-2 font-bold shadow-sm">
                <Plus className="w-4 h-4" />
                <span>إسناد تكليف جديد للمعلم الآن</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Desktop & Tablet View Table (Hidden on small mobile) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-xs text-right min-w-[800px]">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3.5">المعلم المكلف</th>
                    <th className="p-3.5">المادة المقررة</th>
                    <th className="p-3.5">الصف والشعبة</th>
                    <th className="p-3.5">السنة الدراسية</th>
                    <th className="p-3.5">فترة التكليف</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5">تاريخ التحديث</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Teacher */}
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200 shrink-0">
                            <UserCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div>{row.teacher_display || row.teacher}</div>
                            {row.teacher &&
                              row.teacher !== row.teacher_display && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {row.teacher.slice(0, 8)}...
                                </div>
                              )}
                          </div>
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="p-3.5 text-slate-800 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{row.subject_display || row.grade_subject}</span>
                        </div>
                      </td>

                      {/* Grade & Section */}
                      <td className="p-3.5 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>
                            {row.grade_level_display
                              ? `${row.grade_level_display} - `
                              : ""}
                            {row.section_display || row.section}
                          </span>
                        </div>
                      </td>

                      {/* Academic Year */}
                      <td className="p-3.5">
                        {row.academic_year_display ? (
                          <span className="bg-slate-100 text-slate-700 text-[11px] px-2.5 py-1 rounded-md border border-slate-200 font-medium">
                            {row.academic_year_display}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Start / End Dates */}
                      <td className="p-3.5 text-slate-600">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-slate-500">من:</span>
                            <span className="font-mono font-medium">
                              {row.start_date}
                            </span>
                          </span>
                          {row.end_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="text-slate-500">إلى:</span>
                              <span className="font-mono font-medium text-amber-700">
                                {row.end_date}
                              </span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {row.end_date ? (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-semibold inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>منتهي ({row.end_date})</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-semibold inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>نشط حالياً</span>
                          </span>
                        )}
                      </td>

                      {/* Timestamps */}
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        <div
                          className="flex items-center gap-1"
                          title={`تاريخ الإنشاء: ${row.created_at || ""}`}
                        >
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {formatDateTime(row.updated_at || row.created_at) ||
                              "-"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(row)}
                            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
                            title="تعديل بيانات التكليف"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>

                          <button
                            onClick={() => handleOpenEnd(row)}
                            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors border ${
                              row.end_date
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                                : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                            }`}
                            title="إنهاء التكليف وتحديد تاريخ النهاية"
                          >
                            <StopCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>
                              {row.end_date
                                ? "تعديل النهاية"
                                : "إنهاء"}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 2. Mobile & Tablet Cards Grid (Visible on small & medium screens) */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {assignments.map((row) => (
                <div
                  key={row.id}
                  className="p-4 sm:p-5 space-y-3.5 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm border border-teal-200 shrink-0">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {row.teacher_display || row.teacher}
                        </h4>
                        <div className="text-[11px] text-teal-700 font-medium">
                          {row.subject_display || row.grade_subject}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {row.end_date ? (
                        <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span>منتهي</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>نشط</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Details Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">الصف والشعبة:</span>
                      <span className="font-semibold text-slate-800">
                        {row.grade_level_display
                          ? `${row.grade_level_display} - `
                          : ""}
                        {row.section_display || row.section}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">السنة الدراسية:</span>
                      <span className="font-semibold text-slate-800">
                        {row.academic_year_display || "-"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">تاريخ البداية:</span>
                      <span className="font-mono text-slate-700">{row.start_date}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">تاريخ النهاية:</span>
                      <span className="font-mono text-slate-700">
                        {row.end_date || "مستمر"}
                      </span>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenEdit(row)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 px-3 rounded-xl transition-colors border border-slate-200/60"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>تعديل التكليف</span>
                    </button>

                    <button
                      onClick={() => handleOpenEnd(row)}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl transition-colors border ${
                        row.end_date
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                          : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                      }`}
                    >
                      <StopCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{row.end_date ? "تعديل النهاية" : "إنهاء التكليف"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
        />
      </div>

      {/* Modal: Create Assignment - Fully Responsive Form */}
      {/* Modal: Create Assignment - Fully Responsive Form */}
      <Modal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        title="إسناد تكليف أكاديمي جديد للمعلم (POST /assignments/)"
      >
        <form
          onSubmit={handleCreateAssignment}
          className="space-y-3.5 sm:space-y-4 text-right"
        >
          {modalError && <Alert type="error">{modalError}</Alert>}

          {/* Mode Selector Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setUseManualUuid(false)}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !useManualUuid
                  ? "bg-white text-teal-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>اختيار من القوائم المنسدلة</span>
            </button>
            <button
              type="button"
              onClick={() => setUseManualUuid(true)}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                useManualUuid
                  ? "bg-white text-teal-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>إدخال المعرّفات (UUIDs) يدوياً</span>
            </button>
          </div>

          {useManualUuid && (
            <div className="bg-teal-50 border border-teal-200 text-teal-900 p-3 rounded-xl text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span>نمط الإدخال اليدوي لمعرّفات النظام (UUIDs)</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                يرجى إدخال معرّفات UUID المباشرة للمعلم والمادة المقررة والشعبة، أو الاستعانة بقوائم التعبئة السريعة أسفل كل حقل.
              </p>
            </div>
          )}

          {/* 1. Teacher Select */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                المعلم المكلف (Teacher) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setUseManualUuid(!useManualUuid)}
                className="text-[11px] text-teal-600 hover:underline font-semibold"
              >
                {useManualUuid ? "التبديل للقائمة المنسدلة" : "إدخال UUID يدوياً"}
              </button>
            </div>

            {useManualUuid ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="أدخل UUID المعلم يدوياً (مثال: c9bf9e57-1685-4c89-bafb-ff5af830be8a)"
                  value={assignmentForm.teacher}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      teacher: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 hover:bg-white focus:bg-white"
                  required
                />
                {teachers.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="shrink-0 text-slate-400">تعبئة سريعة:</span>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setAssignmentForm({
                            ...assignmentForm,
                            teacher: e.target.value,
                          });
                        }
                      }}
                      className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-[11px] bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="">-- اختر معلماً لنسخ معرّفه تلقائياً --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {getTeacherLabel(t)} ({t.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <select
                value={assignmentForm.teacher}
                onChange={(e) => {
                  if (e.target.value === "__manual__") {
                    setUseManualUuid(true);
                    setAssignmentForm({ ...assignmentForm, teacher: "" });
                  } else {
                    setAssignmentForm({
                      ...assignmentForm,
                      teacher: e.target.value,
                    });
                  }
                }}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              >
                <option value="">-- اختر المعلم من القائمة --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {getTeacherLabel(t)} — [{t.id ? `${String(t.id).slice(0, 8)}...` : ""}]
                  </option>
                ))}
                {teachers.length === 0 && (
                  <option value="" disabled>-- جاري تحميل قائمة المعلمين أو لا يوجد معلمين مسجلين --</option>
                )}
                <option value="__manual__" className="text-teal-600 font-bold bg-teal-50">
                  ➕ إدخال معرّف المعلم (UUID) يدوياً...
                </option>
              </select>
            )}
          </div>

          {/* 2. Grade Subject & Section Select - Responsive Stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  المادة المقررة (Grade Subject) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUseManualUuid(!useManualUuid)}
                  className="text-[11px] text-teal-600 hover:underline font-semibold"
                >
                  {useManualUuid ? "القائمة" : "يدوياً"}
                </button>
              </div>

              {useManualUuid ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="UUID المادة المقررة (Grade Subject UUID)"
                    value={assignmentForm.grade_subject}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        grade_subject: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 hover:bg-white focus:bg-white"
                    required
                  />
                  {gradeSubjects.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span className="shrink-0 text-slate-400">تعبئة:</span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setAssignmentForm({
                              ...assignmentForm,
                              grade_subject: e.target.value,
                            });
                          }
                        }}
                        className="flex-1 px-1.5 py-0.5 border border-slate-200 rounded text-[10px] bg-white text-slate-700 focus:outline-none truncate"
                      >
                        <option value="">-- اختر مادة لملء UUID --</option>
                        {gradeSubjects.map((gs, idx) => (
                          <option key={gs.id} value={gs.id}>
                            {getGradeSubjectLabel(gs, idx)} ({gs.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <select
                  value={assignmentForm.grade_subject}
                  onChange={(e) => {
                    if (e.target.value === "__manual__") {
                      setUseManualUuid(true);
                      setAssignmentForm({ ...assignmentForm, grade_subject: "" });
                    } else {
                      setAssignmentForm({
                        ...assignmentForm,
                        grade_subject: e.target.value,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                >
                  <option value="">-- اختر المادة من القائمة --</option>
                  {gradeSubjects.map((gs, idx) => (
                    <option key={gs.id} value={gs.id}>
                      {getGradeSubjectLabel(gs, idx)} — [{gs.id ? `${String(gs.id).slice(0, 8)}...` : ""}]
                    </option>
                  ))}
                  {gradeSubjects.length === 0 && (
                    <option value="" disabled>-- جاري تحميل قائمة المواد المقررة --</option>
                  )}
                  <option value="__manual__" className="text-teal-600 font-bold bg-teal-50">
                    ➕ إدخال معرّف المادة (UUID) يدوياً...
                  </option>
                </select>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  الشعبة الصفية (Section) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUseManualUuid(!useManualUuid)}
                  className="text-[11px] text-teal-600 hover:underline font-semibold"
                >
                  {useManualUuid ? "القائمة" : "يدوياً"}
                </button>
              </div>

              {useManualUuid ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="UUID الشعبة الصفية (Section UUID)"
                    value={assignmentForm.section}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        section: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 hover:bg-white focus:bg-white"
                    required
                  />
                  {sections.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span className="shrink-0 text-slate-400">تعبئة:</span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setAssignmentForm({
                              ...assignmentForm,
                              section: e.target.value,
                            });
                          }
                        }}
                        className="flex-1 px-1.5 py-0.5 border border-slate-200 rounded text-[10px] bg-white text-slate-700 focus:outline-none truncate"
                      >
                        <option value="">-- اختر شعبة لملء UUID --</option>
                        {sections.map((sec, idx) => (
                          <option key={sec.id} value={sec.id}>
                            {getSectionLabel(sec, idx)} ({sec.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <select
                  value={assignmentForm.section}
                  onChange={(e) => {
                    if (e.target.value === "__manual__") {
                      setUseManualUuid(true);
                      setAssignmentForm({ ...assignmentForm, section: "" });
                    } else {
                      setAssignmentForm({
                        ...assignmentForm,
                        section: e.target.value,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                >
                  <option value="">-- اختر الشعبة من القائمة --</option>
                  {sections.map((sec, idx) => (
                    <option key={sec.id} value={sec.id}>
                      {getSectionLabel(sec, idx)} — [{sec.id ? `${String(sec.id).slice(0, 8)}...` : ""}]
                    </option>
                  ))}
                  {sections.length === 0 && (
                    <option value="" disabled>-- جاري تحميل قائمة الشُعب الصفية --</option>
                  )}
                  <option value="__manual__" className="text-teal-600 font-bold bg-teal-50">
                    ➕ إدخال معرّف الشعبة (UUID) يدوياً...
                  </option>
                </select>
              )}
            </div>
          </div>

          {/* 3. Dates - Responsive Stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ بداية التكليف <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={assignmentForm.start_date}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    start_date: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ النهاية{" "}
                <span className="text-slate-400 font-normal">(اختياري)</span>
              </label>
              <input
                type="date"
                value={assignmentForm.end_date}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    end_date: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-2">
            <Button type="submit" isLoading={isSubmitting} className="flex-1 font-bold">
              إسناد التكليف الآن
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAssignmentModalOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Assignment - Fully Responsive Form */}
      <Modal
        isOpen={isEditAssignmentModalOpen}
        onClose={() => setIsEditAssignmentModalOpen(false)}
        title="تعديل بيانات التكليف الأكاديمي (PATCH Assignment)"
      >
        <form onSubmit={handlePatchAssignment} className="space-y-3.5 sm:space-y-4 text-right">
          {modalError && <Alert type="error">{modalError}</Alert>}

          {/* Mode Selector Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setUseManualUuid(false)}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                !useManualUuid
                  ? "bg-white text-teal-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>اختيار من القوائم المنسدلة</span>
            </button>
            <button
              type="button"
              onClick={() => setUseManualUuid(true)}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                useManualUuid
                  ? "bg-white text-teal-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>إدخال المعرّفات (UUIDs) يدوياً</span>
            </button>
          </div>

          {useManualUuid && (
            <div className="bg-teal-50 border border-teal-200 text-teal-900 p-3 rounded-xl text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span>نمط الإدخال اليدوي لمعرّفات النظام (UUIDs)</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                يرجى إدخال معرّفات UUID المباشرة للمعلم والمادة المقررة والشعبة، أو الاستعانة بقوائم التعبئة السريعة أسفل كل حقل.
              </p>
            </div>
          )}

          {/* 1. Teacher */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                المعلم المكلف (Teacher) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setUseManualUuid(!useManualUuid)}
                className="text-[11px] text-teal-600 hover:underline font-semibold"
              >
                {useManualUuid ? "التبديل للقائمة المنسدلة" : "إدخال UUID يدوياً"}
              </button>
            </div>

            {useManualUuid ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={editAssignmentForm.teacher}
                  placeholder="أدخل UUID المعلم (Teacher UUID)"
                  onChange={(e) =>
                    setEditAssignmentForm({
                      ...editAssignmentForm,
                      teacher: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 hover:bg-white focus:bg-white"
                  required
                />
                {teachers.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="shrink-0 text-slate-400">تعبئة سريعة:</span>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setEditAssignmentForm({
                            ...editAssignmentForm,
                            teacher: e.target.value,
                          });
                        }
                      }}
                      className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-[11px] bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="">-- اختر معلماً لنسخ معرّفه تلقائياً --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {getTeacherLabel(t)} ({t.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <select
                value={editAssignmentForm.teacher}
                onChange={(e) => {
                  if (e.target.value === "__manual__") {
                    setUseManualUuid(true);
                    setEditAssignmentForm({ ...editAssignmentForm, teacher: "" });
                  } else {
                    setEditAssignmentForm({
                      ...editAssignmentForm,
                      teacher: e.target.value,
                    });
                  }
                }}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              >
                <option value="">-- اختر المعلم من القائمة --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {getTeacherLabel(t)} — [{t.id ? `${String(t.id).slice(0, 8)}...` : ""}]
                  </option>
                ))}
                {teachers.length === 0 && (
                  <option value="" disabled>-- جاري تحميل قائمة المعلمين --</option>
                )}
                <option value="__manual__" className="text-teal-600 font-bold bg-teal-50">
                  ➕ إدخال معرّف المعلم (UUID) يدوياً...
                </option>
              </select>
            )}
          </div>

          {/* 2. Grade Subject & Section - Responsive Stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  المادة المقررة (Grade Subject) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUseManualUuid(!useManualUuid)}
                  className="text-[11px] text-teal-600 hover:underline font-semibold"
                >
                  {useManualUuid ? "القائمة" : "يدوياً"}
                </button>
              </div>

              {useManualUuid ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={editAssignmentForm.grade_subject}
                    placeholder="UUID المادة المقررة (Grade Subject UUID)"
                    onChange={(e) =>
                      setEditAssignmentForm({
                        ...editAssignmentForm,
                        grade_subject: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 hover:bg-white focus:bg-white"
                    required
                  />
                  {gradeSubjects.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span className="shrink-0 text-slate-400">تعبئة:</span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setEditAssignmentForm({
                              ...editAssignmentForm,
                              grade_subject: e.target.value,
                            });
                          }
                        }}
                        className="flex-1 px-1.5 py-0.5 border border-slate-200 rounded text-[10px] bg-white text-slate-700 focus:outline-none truncate"
                      >
                        <option value="">-- اختر مادة لملء UUID --</option>
                        {gradeSubjects.map((gs, idx) => (
                          <option key={gs.id} value={gs.id}>
                            {getGradeSubjectLabel(gs, idx)} ({gs.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <select
                  value={editAssignmentForm.grade_subject}
                  onChange={(e) => {
                    if (e.target.value === "__manual__") {
                      setUseManualUuid(true);
                      setEditAssignmentForm({ ...editAssignmentForm, grade_subject: "" });
                    } else {
                      setEditAssignmentForm({
                        ...editAssignmentForm,
                        grade_subject: e.target.value,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                >
                  <option value="">-- اختر المادة من القائمة --</option>
                  {gradeSubjects.map((gs, idx) => (
                    <option key={gs.id} value={gs.id}>
                      {getGradeSubjectLabel(gs, idx)} — [{gs.id ? `${String(gs.id).slice(0, 8)}...` : ""}]
                    </option>
                  ))}
                  {gradeSubjects.length === 0 && (
                    <option value="" disabled>-- جاري تحميل قائمة المواد --</option>
                  )}
                  <option value="__manual__" className="text-teal-600 font-bold bg-teal-50">
                    ➕ إدخال معرّف المادة (UUID) يدوياً...
                  </option>
                </select>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  الشعبة الصفية (Section) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setUseManualUuid(!useManualUuid)}
                  className="text-[11px] text-teal-600 hover:underline font-semibold"
                >
                  {useManualUuid ? "القائمة" : "يدوياً"}
                </button>
              </div>

              {useManualUuid ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={editAssignmentForm.section}
                    placeholder="UUID الشعبة الصفية (Section UUID)"
                    onChange={(e) =>
                      setEditAssignmentForm({
                        ...editAssignmentForm,
                        section: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 hover:bg-white focus:bg-white"
                    required
                  />
                  {sections.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span className="shrink-0 text-slate-400">تعبئة:</span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setEditAssignmentForm({
                              ...editAssignmentForm,
                              section: e.target.value,
                            });
                          }
                        }}
                        className="flex-1 px-1.5 py-0.5 border border-slate-200 rounded text-[10px] bg-white text-slate-700 focus:outline-none truncate"
                      >
                        <option value="">-- اختر شعبة لملء UUID --</option>
                        {sections.map((sec, idx) => (
                          <option key={sec.id} value={sec.id}>
                            {getSectionLabel(sec, idx)} ({sec.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <select
                  value={editAssignmentForm.section}
                  onChange={(e) => {
                    if (e.target.value === "__manual__") {
                      setUseManualUuid(true);
                      setEditAssignmentForm({ ...editAssignmentForm, section: "" });
                    } else {
                      setEditAssignmentForm({
                        ...editAssignmentForm,
                        section: e.target.value,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                >
                  <option value="">-- اختر الشعبة من القائمة --</option>
                  {sections.map((sec, idx) => (
                    <option key={sec.id} value={sec.id}>
                      {getSectionLabel(sec, idx)} — [{sec.id ? `${String(sec.id).slice(0, 8)}...` : ""}]
                    </option>
                  ))}
                  {sections.length === 0 && (
                    <option value="" disabled>-- جاري تحميل قائمة الشُعب --</option>
                  )}
                  <option value="__manual__" className="text-teal-600 font-bold bg-teal-50">
                    ➕ إدخال معرّف الشعبة (UUID) يدوياً...
                  </option>
                </select>
              )}
            </div>
          </div>

          {/* 3. Dates - Responsive Stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ بداية التكليف (start_date){" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={editAssignmentForm.start_date}
                onChange={(e) =>
                  setEditAssignmentForm({
                    ...editAssignmentForm,
                    start_date: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ نهاية التكليف (end_date){" "}
                <span className="text-slate-400 font-normal">(اختياري)</span>
              </label>
              <input
                type="date"
                value={editAssignmentForm.end_date}
                onChange={(e) =>
                  setEditAssignmentForm({
                    ...editAssignmentForm,
                    end_date: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-2">
            <Button type="submit" isLoading={isSubmitting} className="flex-1 font-bold">
              حفظ التعديلات
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditAssignmentModalOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: End Assignment - Responsive Form */}
      <Modal
        isOpen={isEndAssignmentModalOpen}
        onClose={() => setIsEndAssignmentModalOpen(false)}
        title="إنهاء التكليف الأكاديمي (End Assignment Action)"
      >
        <form onSubmit={handleEndAssignment} className="space-y-4 text-right">
          {modalError && <Alert type="error">{modalError}</Alert>}

          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-xs leading-relaxed">
            ⚠️ <strong>ملاحظة:</strong> سيتم تعيين تاريخ نهاية التكليف
            (end_date) وأرشفته بدلاً من حذفه.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              تاريخ نهاية التكليف (end_date)
            </label>
            <input
              type="date"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          <div className="pt-3 flex flex-col sm:flex-row gap-2">
            <Button type="submit" isLoading={isSubmitting} className="flex-1 font-bold">
              تأكيد إنهاء التكليف
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEndAssignmentModalOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
