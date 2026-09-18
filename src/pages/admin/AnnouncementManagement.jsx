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
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
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
  Globe,
  Users,
  CheckSquare,
  Square,
  Info,
} from "lucide-react";

export function AnnouncementManagement() {
  const { user, hasPermission } = useAuthStore();
  const canAddAnnouncement = hasPermission("announcements.add_announcement");
  const canChangeAnnouncement = hasPermission("announcements.change_announcement");
  const canDeleteAnnouncement = hasPermission("announcements.delete_announcement");
  const canManageAnnouncements = canAddAnnouncement || canChangeAnnouncement || canDeleteAnnouncement;

  // Role permissions check
  const rawRole = (
    user?.role ||
    user?.role_code ||
    user?.role_name ||
    ""
  ).toLowerCase();

  const isTeacher = rawRole === "teacher";

  // Raw & Processed data states
  const [announcements, setAnnouncements] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [sections, setSections] = useState([]);

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
  const [scopeFilter, setScopeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" | "true" | "false"
  const [gradeLevelFilter, setGradeLevelFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [publishFromFilter, setPublishFromFilter] = useState("");
  const [publishToFilter, setPublishToFilter] = useState("");
  const [orderingFilter, setOrderingFilter] = useState("-publish_date");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    scope: "all", // 'all' | 'grades' | 'sections'
    grade_levels: [],
    sections: [],
    title: "",
    content: "",
    publish_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    attachment: null,
  });

  const [editForm, setEditForm] = useState({
    scope: "all",
    grade_levels: [],
    sections: [],
    title: "",
    content: "",
    publish_date: "",
    expiry_date: "",
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

  // Fetch Metadata for audience selectors (Grade Levels and Sections)
  const fetchMetadata = useCallback(async () => {
    try {
      const [gradesData, secData] = await Promise.all([
        api.academics?.getGradeLevels
          ? api.academics.getGradeLevels().catch(() => null)
          : null,
        api.academics?.getSections
          ? api.academics.getSections().catch(() => null)
          : null,
      ]);

      if (gradesData) {
        setGradeLevels(extractPaginatedList(gradesData).results || []);
      }
      if (secData) {
        setSections(extractPaginatedList(secData).results || []);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Fetch Announcements List
  const fetchAnnouncements = useCallback(
    async (page = currentPage) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = {
          page: page,
          ordering: orderingFilter,
        };

        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (scopeFilter) params.scope = scopeFilter;
        if (statusFilter !== "") params.is_active = statusFilter;
        if (gradeLevelFilter) params.grade_level = gradeLevelFilter;
        if (sectionFilter) params.section = sectionFilter;
        if (publishFromFilter) params.publish_from = publishFromFilter;
        if (publishToFilter) params.publish_to = publishToFilter;

        const data = await api.announcements.getAll(params);
        const { results, count, next, previous } = extractPaginatedList(data);

        setAnnouncements(results);
        setTotalCount(count);
        setHasNext(Boolean(next));
        setHasPrevious(Boolean(previous));
      } catch (err) {
        setError(parseApiError(err, "حدث خطأ أثناء تحميل قائمة الإعلانات المدرسية."));
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentPage,
      debouncedSearch,
      scopeFilter,
      statusFilter,
      gradeLevelFilter,
      sectionFilter,
      publishFromFilter,
      publishToFilter,
      orderingFilter,
    ]
  );

  useEffect(() => {
    fetchAnnouncements(currentPage);
  }, [fetchAnnouncements, currentPage]);

  // Format Date Helper
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

  // Helper for Section Display label
  const getSectionOptionLabel = (sec) => {
    if (!sec) return "";
    const secName = sec.name || sec.section_name || sec.title || "شعبة";
    const gradeName =
      sec.grade_level?.name ||
      sec.grade_level_name ||
      sec.grade_level_display ||
      "";
    return gradeName ? `${gradeName} - ${secName}` : secName;
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = totalCount || announcements.length;
    let active = 0;
    let inactive = 0;
    let allScope = 0;
    let specificScope = 0;

    announcements.forEach((a) => {
      if (a.is_active) active++;
      else inactive++;

      if (a.scope === "all") allScope++;
      else specificScope++;
    });

    return { total, active, inactive, allScope, specificScope };
  }, [totalCount, announcements]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setScopeFilter("");
    setStatusFilter("");
    setGradeLevelFilter("");
    setSectionFilter("");
    setPublishFromFilter("");
    setPublishToFilter("");
    setOrderingFilter("-publish_date");
    setCurrentPage(1);
    toast.info("تمت استعادة الفلاتر الافتراضية");
  };

  // Scope Toggle helper for Create Form
  const handleCreateScopeChange = (newScope) => {
    setCreateForm((prev) => ({
      ...prev,
      scope: newScope,
      grade_levels: newScope === "grades" ? prev.grade_levels : [],
      sections: newScope === "sections" ? prev.sections : [],
    }));
  };

  // Toggle Grade selection in Create Form
  const toggleCreateGrade = (gradeId) => {
    setCreateForm((prev) => {
      const exists = prev.grade_levels.includes(gradeId);
      return {
        ...prev,
        grade_levels: exists
          ? prev.grade_levels.filter((id) => id !== gradeId)
          : [...prev.grade_levels, gradeId],
      };
    });
  };

  // Toggle Section selection in Create Form
  const toggleCreateSection = (secId) => {
    setCreateForm((prev) => {
      const exists = prev.sections.includes(secId);
      return {
        ...prev,
        sections: exists
          ? prev.sections.filter((id) => id !== secId)
          : [...prev.sections, secId],
      };
    });
  };

  // Scope Toggle helper for Edit Form
  const handleEditScopeChange = (newScope) => {
    setEditForm((prev) => ({
      ...prev,
      scope: newScope,
      grade_levels: newScope === "grades" ? prev.grade_levels : [],
      sections: newScope === "sections" ? prev.sections : [],
    }));
  };

  // Toggle Grade selection in Edit Form
  const toggleEditGrade = (gradeId) => {
    setEditForm((prev) => {
      const exists = prev.grade_levels.includes(gradeId);
      return {
        ...prev,
        grade_levels: exists
          ? prev.grade_levels.filter((id) => id !== gradeId)
          : [...prev.grade_levels, gradeId],
      };
    });
  };

  // Toggle Section selection in Edit Form
  const toggleEditSection = (secId) => {
    setEditForm((prev) => {
      const exists = prev.sections.includes(secId);
      return {
        ...prev,
        sections: exists
          ? prev.sections.filter((id) => id !== secId)
          : [...prev.sections, secId],
      };
    });
  };

  // Create Announcement Handler
  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!createForm.title.trim()) {
      setModalError("يرجى إدخال عنوان الإعلان.");
      return;
    }
    if (!createForm.content.trim()) {
      setModalError("يرجى إدخال نص ومحتوى الإعلان.");
      return;
    }
    if (!createForm.publish_date) {
      setModalError("يرجى تحديد تاريخ نشر الإعلان.");
      return;
    }
    if (
      createForm.expiry_date &&
      createForm.expiry_date < createForm.publish_date
    ) {
      setModalError("تاريخ انتهاء الإعلان يجب ألا يكون قبل تاريخ النشر.");
      return;
    }

    if (createForm.scope === "grades" && createForm.grade_levels.length === 0) {
      setModalError("يرجى تحديد صف واحد على الأقل للإعلان الموجه للصفوف.");
      return;
    }

    if (createForm.scope === "sections" && createForm.sections.length === 0) {
      setModalError("يرجى تحديد شعبة واحدة على الأقل للإعلان الموجه للشعب.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (createForm.attachment instanceof File) {
        const formData = new FormData();
        formData.append("scope", createForm.scope);
        formData.append("title", createForm.title.trim());
        formData.append("content", createForm.content.trim());
        formData.append("publish_date", createForm.publish_date);
        if (createForm.expiry_date) {
          formData.append("expiry_date", createForm.expiry_date);
        }

        if (createForm.scope === "grades") {
          createForm.grade_levels.forEach((id) => {
            formData.append("grade_levels", id);
          });
        } else if (createForm.scope === "sections") {
          createForm.sections.forEach((id) => {
            formData.append("sections", id);
          });
        }

        formData.append("attachment", createForm.attachment);

        await api.announcements.create(formData);
      } else {
        const payload = {
          scope: createForm.scope,
          title: createForm.title.trim(),
          content: createForm.content.trim(),
          publish_date: createForm.publish_date,
          grade_levels: createForm.scope === "grades" ? createForm.grade_levels : [],
          sections: createForm.scope === "sections" ? createForm.sections : [],
        };
        if (createForm.expiry_date) {
          payload.expiry_date = createForm.expiry_date;
        }

        await api.announcements.create(payload);
      }

      toast.success("تم نشر الإعلان بنجاح.");
      setIsCreateModalOpen(false);
      fetchAnnouncements(1);
    } catch (err) {
      setModalError(parseApiError(err, "فشل إنشاء ونشر الإعلان."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Announcement Handler
  const handleUpdateAnnouncement = async (e) => {
    e.preventDefault();
    if (!selectedAnnouncement?.id) return;
    setModalError(null);

    if (!editForm.title.trim()) {
      setModalError("يرجى إدخال عنوان الإعلان.");
      return;
    }
    if (!editForm.content.trim()) {
      setModalError("يرجى إدخال نص ومحتوى الإعلان.");
      return;
    }
    if (
      editForm.expiry_date &&
      editForm.publish_date &&
      editForm.expiry_date < editForm.publish_date
    ) {
      setModalError("تاريخ انتهاء الإعلان يجب ألا يكون قبل تاريخ النشر.");
      return;
    }

    if (editForm.scope === "grades" && editForm.grade_levels.length === 0) {
      setModalError("يرجى تحديد صف واحد على الأقل.");
      return;
    }

    if (editForm.scope === "sections" && editForm.sections.length === 0) {
      setModalError("يرجى تحديد شعبة واحدة على الأقل.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editForm.attachment instanceof File) {
        const formData = new FormData();
        formData.append("scope", editForm.scope);
        formData.append("title", editForm.title.trim());
        formData.append("content", editForm.content.trim());
        if (editForm.publish_date) {
          formData.append("publish_date", editForm.publish_date);
        }
        if (editForm.expiry_date) {
          formData.append("expiry_date", editForm.expiry_date);
        }

        if (editForm.scope === "grades") {
          editForm.grade_levels.forEach((id) => {
            formData.append("grade_levels", id);
          });
        } else if (editForm.scope === "sections") {
          editForm.sections.forEach((id) => {
            formData.append("sections", id);
          });
        }

        formData.append("attachment", editForm.attachment);

        await api.announcements.patch(selectedAnnouncement.id, formData);
      } else {
        const payload = {
          scope: editForm.scope,
          title: editForm.title.trim(),
          content: editForm.content.trim(),
          publish_date: editForm.publish_date,
          expiry_date: editForm.expiry_date || null,
          grade_levels: editForm.scope === "grades" ? editForm.grade_levels : [],
          sections: editForm.scope === "sections" ? editForm.sections : [],
        };

        await api.announcements.patch(selectedAnnouncement.id, payload);
      }

      toast.success("تم تحديث الإعلان بنجاح.");
      setIsEditModalOpen(false);
      fetchAnnouncements(currentPage);
    } catch (err) {
      setModalError(parseApiError(err, "فشل تحديث بيانات الإعلان."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Announcement Handler
  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement?.id) return;
    setIsSubmitting(true);
    try {
      await api.announcements.delete(selectedAnnouncement.id);
      toast.success("تم حذف الإعلان بنجاح.");
      setIsDeleteModalOpen(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements(currentPage);
    } catch (err) {
      toast.error(parseApiError(err, "فشل حذف الإعلان."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalError(null);
    setCreateForm({
      scope: "all",
      grade_levels: [],
      sections: [],
      title: "",
      content: "",
      publish_date: new Date().toISOString().split("T")[0],
      expiry_date: "",
      attachment: null,
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (announcement) => {
    setSelectedAnnouncement(announcement);
    setModalError(null);

    const gradeIds = Array.isArray(announcement.grade_levels)
      ? announcement.grade_levels.map((item) =>
          typeof item === "object" ? item.id : item
        )
      : [];

    const sectionIds = Array.isArray(announcement.sections)
      ? announcement.sections.map((item) =>
          typeof item === "object" ? item.id : item
        )
      : [];

    setEditForm({
      scope: announcement.scope || "all",
      grade_levels: gradeIds,
      sections: sectionIds,
      title: announcement.title || "",
      content: announcement.content || "",
      publish_date: announcement.publish_date || "",
      expiry_date: announcement.expiry_date || "",
      attachment: null,
    });
    setIsEditModalOpen(true);
  };

  // Open Details Modal
  const handleOpenDetails = (announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDetailsModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDeleteModalOpen(true);
  };

  // Render Audience Badge helper
  const renderAudienceBadge = (announcement) => {
    const scope = announcement.scope;
    if (scope === "all") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          <Globe className="w-3 h-3" />
          <span>جميع المدرسة</span>
        </span>
      );
    }

    if (scope === "grades") {
      const grades =
        announcement.grade_levels_display || announcement.grade_levels || [];
      const gradeNames = grades
        .map((g) => (typeof g === "object" ? g.name : g))
        .filter(Boolean)
        .join("، ");

      return (
        <div className="space-y-0.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            <GraduationCap className="w-3 h-3" />
            <span>صفوف محددة ({grades.length})</span>
          </span>
          {gradeNames && (
            <p className="text-[10px] text-slate-500 font-medium line-clamp-1">
              {gradeNames}
            </p>
          )}
        </div>
      );
    }

    if (scope === "sections") {
      const secs = announcement.sections_display || announcement.sections || [];
      const secNames = secs
        .map((s) => {
          if (typeof s === "object") {
            const gradeName = s.grade_level?.name || "";
            return gradeName ? `${gradeName} (${s.name})` : s.name;
          }
          return s;
        })
        .filter(Boolean)
        .join("، ");

      return (
        <div className="space-y-0.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Layers className="w-3 h-3" />
            <span>شعب محددة ({secs.length})</span>
          </span>
          {secNames && (
            <p className="text-[10px] text-slate-500 font-medium line-clamp-1">
              {secNames}
            </p>
          )}
        </div>
      );
    }

    return <span className="text-slate-400 text-xs">-</span>;
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    Boolean(scopeFilter) ||
    Boolean(statusFilter) ||
    Boolean(gradeLevelFilter) ||
    Boolean(sectionFilter) ||
    Boolean(publishFromFilter) ||
    Boolean(publishToFilter);

  return (
    <div className="space-y-4 sm:space-y-6 text-right dir-rtl" dir="rtl">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
              <Megaphone className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              الإعلانات والتعاميم المدرسية (Announcements)
            </h2>
            {totalCount > 0 && (
              <span className="bg-teal-50 text-teal-700 text-xs px-2.5 py-0.5 rounded-full border border-teal-200 font-bold">
                {totalCount} إعلان
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 pr-1">
            {isTeacher
              ? "استعراض الإعلانات والتعاميم المدرسية العامة وإعلانات الصفوف والشعب المكلف بها"
              : "نشر وإدارة الإعلانات وتوجيهها للمدرسة كاملة أو لصفوف وشعب محددة بدقة"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnnouncements(currentPage)}
            disabled={isLoading}
            title="تحديث القائمة"
            className="h-9 px-3"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          {canAddAnnouncement && (
            <Button
              onClick={handleOpenCreate}
              className="gap-1.5 text-xs font-bold h-9 px-3.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة إعلان جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* Quick KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Announcements */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              إجمالي الإعلانات
            </span>
            <span className="text-lg sm:text-xl font-bold text-slate-900">
              {stats.total}
            </span>
          </div>
        </div>

        {/* Active Announcements */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              الإعلانات النشطة
            </span>
            <span className="text-lg sm:text-xl font-bold text-emerald-700">
              {stats.active}
            </span>
          </div>
        </div>

        {/* School-Wide (All) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              إعلانات عامة للمدرسة
            </span>
            <span className="text-lg sm:text-xl font-bold text-blue-700">
              {stats.allScope}
            </span>
          </div>
        </div>

        {/* Targeted (Grades / Sections) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-medium">
              إعلانات موجهة (صفوف/شعب)
            </span>
            <span className="text-lg sm:text-xl font-bold text-purple-700">
              {stats.specificScope}
            </span>
          </div>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث في عنوان الإعلان أو نصه..."
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
            {/* Scope Filter */}
            <div className="relative">
              <select
                value={scopeFilter}
                onChange={(e) => {
                  setScopeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none appearance-none"
              >
                <option value="">جميع النطاقات (Scopes)</option>
                <option value="all">جميع المدرسة (all)</option>
                <option value="grades">صفوف محددة (grades)</option>
                <option value="sections">شعب محددة (sections)</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none appearance-none"
              >
                <option value="">جميع الحالات</option>
                <option value="true">نشط حالياً</option>
                <option value="false">غير نشط / منتهي</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <select
                value={orderingFilter}
                onChange={(e) => {
                  setOrderingFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none appearance-none"
              >
                <option value="-publish_date">تاريخ النشر (الأحدث)</option>
                <option value="publish_date">تاريخ النشر (الأقدم)</option>
                <option value="-created_at">الأحدث إنشاءً</option>
                <option value="title">العنوان (أبجدي)</option>
                <option value="expiry_date">تاريخ الانتهاء</option>
              </select>
              <ArrowUpDown className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Advanced Filters Button */}
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
              <span>تصفية إضافية</span>
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
            {/* Filter by Grade Level */}
            {gradeLevels.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  تصفية بحسب الصف الدراسي:
                </label>
                <select
                  value={gradeLevelFilter}
                  onChange={(e) => {
                    setGradeLevelFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                >
                  <option value="">جميع الصفوف الدراسية</option>
                  {gradeLevels.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter by Section */}
            {sections.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  تصفية بحسب الشعبة:
                </label>
                <select
                  value={sectionFilter}
                  onChange={(e) => {
                    setSectionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                >
                  <option value="">جميع الشعب الدراسية</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {getSectionOptionLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range: Publish Date */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                تاريخ النشر (من / إلى):
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="date"
                  value={publishFromFilter}
                  onChange={(e) => {
                    setPublishFromFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-[11px]"
                  title="نشر من تاريخ"
                />
                <input
                  type="date"
                  value={publishToFilter}
                  onChange={(e) => {
                    setPublishToFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-slate-200 rounded-lg bg-white text-[11px]"
                  title="نشر إلى تاريخ"
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
              جاري تحميل قائمة الإعلانات المدرسية...
            </p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-8 sm:p-12">
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100">
                <Megaphone className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-slate-800">
                {hasActiveFilters
                  ? "لا توجد إعلانات مطابقة لخيارات الفلترة المحددة"
                  : "لا توجد إعلانات منشورة حالياً"}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {hasActiveFilters
                  ? "جرّب تغيير كلمات البحث أو إعادة تعيين الفلاتر لعرض الإعلانات."
                  : "يمكنك نشر إعلانات وتعاميم جديدة تستهدف جميع المدرسة أو صفوفاً وشعباً محددة."}
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
              ) : canAddAnnouncement ? (
                <Button
                  onClick={handleOpenCreate}
                  className="gap-2 mt-2 font-bold shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة إعلان جديد الآن</span>
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {/* 1. Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-xs text-right min-w-[850px]">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3.5">عنوان الإعلان ومحتواه</th>
                    <th className="p-3.5">الفئة المستهدفة (Scope)</th>
                    <th className="p-3.5">تاريخ النشر والانتهاء</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5">الناشر</th>
                    <th className="p-3.5 text-center">المرفقات</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {announcements.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Title & Content snippet */}
                      <td className="p-3.5 max-w-sm">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 text-sm">
                            {row.title}
                          </div>
                          {row.content && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {row.content}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Scope & Target Audience */}
                      <td className="p-3.5">{renderAudienceBadge(row)}</td>

                      {/* Publish & Expiry Dates */}
                      <td className="p-3.5 text-slate-600">
                        <div className="space-y-0.5 text-[11px] font-mono">
                          <div className="flex items-center gap-1 text-slate-800 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>نُشر: {row.publish_date}</span>
                          </div>
                          {row.expiry_date ? (
                            <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>ينتهي: {row.expiry_date}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              بدون تاريخ انتهاء
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Badge (is_active calculated from Backend) */}
                      <td className="p-3.5">
                        {row.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>نشط</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>غير نشط / منتهي</span>
                          </span>
                        )}
                      </td>

                      {/* Publisher */}
                      <td className="p-3.5 text-slate-700">
                        <div className="text-[11px]">
                          <span className="font-semibold">
                            @{row.created_by_username || "المسؤول"}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {formatDateTime(row.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Attachment */}
                      <td className="p-3.5 text-center">
                        {row.attachment ? (
                          <a
                            href={row.attachment}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors"
                            title="تحميل / معاينة المرفق"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>مرفق</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetails(row)}
                            className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="قراءة الإعلان كاملاً"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canChangeAnnouncement && (
                            <button
                              onClick={() => handleOpenEdit(row)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="تعديل الإعلان"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {canDeleteAnnouncement && (
                            <button
                              onClick={() => handleOpenDelete(row)}
                              className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف الإعلان"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 2. Mobile Cards Grid */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {announcements.map((row) => (
                <div
                  key={row.id}
                  className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/50 transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-sm text-slate-900">
                        {row.title}
                      </h4>
                      <div>{renderAudienceBadge(row)}</div>
                    </div>

                    <div>
                      {row.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>نشط</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          <span>غير نشط</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content snippet */}
                  {row.content && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed line-clamp-3 whitespace-pre-line">
                      {row.content}
                    </p>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">
                        تاريخ النشر:
                      </span>
                      <span className="text-slate-800 font-semibold">
                        {row.publish_date}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block font-sans">
                        تاريخ الانتهاء:
                      </span>
                      <span className="text-slate-800">
                        {row.expiry_date || "مستمر"}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenDetails(row)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 px-3 rounded-xl transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>قراءة كاملة</span>
                    </button>

                    {canChangeAnnouncement && (
                      <button
                        onClick={() => handleOpenEdit(row)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold py-2 px-3 rounded-xl transition-colors border border-blue-200"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>تعديل</span>
                      </button>
                    )}

                    {canDeleteAnnouncement && (
                      <button
                        onClick={() => handleOpenDelete(row)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors border border-rose-200"
                        title="حذف الإعلان"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </button>
                    )}
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
          onChange={setCurrentPage}
          onPageChange={setCurrentPage}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
        />
      </div>

      {/* Modal: Create Announcement */}
      {canManageAnnouncements && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="نشر إعلان / تعميم مدرسي جديد (POST /announcements/)"
        >
          <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-right">
            {modalError && <Alert type="error">{modalError}</Alert>}

            {/* 1. Scope Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                الفئة المستهدفة للإعلان (Scope) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateScopeChange("all")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    createForm.scope === "all"
                      ? "bg-teal-50 border-teal-500 text-teal-800 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>جميع المدرسة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateScopeChange("grades")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    createForm.scope === "grades"
                      ? "bg-purple-50 border-purple-500 text-purple-800 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>صفوف محددة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateScopeChange("sections")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    createForm.scope === "sections"
                      ? "bg-amber-50 border-amber-500 text-amber-800 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>شعب محددة</span>
                </button>
              </div>
            </div>

            {/* 2. Dynamic Scope Targets */}
            {createForm.scope === "grades" && (
              <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900">
                    حدد الصفوف الدراسية المستهدفة:
                  </span>
                  <span className="text-[10px] text-purple-700 font-semibold">
                    (محدد: {createForm.grade_levels.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                  {gradeLevels.map((g) => {
                    const isSelected = createForm.grade_levels.includes(g.id);
                    return (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => toggleCreateGrade(g.id)}
                        className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-purple-50"
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        )}
                        <span className="truncate">{g.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {createForm.scope === "sections" && (
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    حدد الشعب الدراسية المستهدفة:
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold">
                    (محدد: {createForm.sections.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {sections.map((sec) => {
                    const isSelected = createForm.sections.includes(sec.id);
                    return (
                      <button
                        type="button"
                        key={sec.id}
                        onClick={() => toggleCreateSection(sec.id)}
                        className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                          isSelected
                            ? "bg-amber-700 text-white border-amber-700 font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50"
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        )}
                        <span className="truncate">
                          {getSectionOptionLabel(sec)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {createForm.scope === "all" && (
              <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center gap-2 text-blue-800 text-xs">
                <Info className="w-4 h-4 shrink-0 text-blue-600" />
                <span>
                  سيتم توجيه هذا الإعلان لجميع منسوبي المدرسة (الإدارة، الكادر التعليمي، وأولياء الأمور).
                </span>
              </div>
            )}

            {/* 3. Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                عنوان الإعلان <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="مثال: تعميم بخصوص مواعيد الاختبارات النصفية"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm({ ...createForm, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            </div>

            {/* 4. Content */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نص ومحتوى الإعلان <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="اكتب تفاصيل الإعلان والتعليمات الموجهة بشكل واضح ومباشر..."
                value={createForm.content}
                onChange={(e) =>
                  setCreateForm({ ...createForm, content: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed"
                required
              />
            </div>

            {/* 5. Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تاريخ النشر <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={createForm.publish_date}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      publish_date: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تاريخ انتهاء الإعلان (اختياري)
                </label>
                <input
                  type="date"
                  value={createForm.expiry_date}
                  min={createForm.publish_date}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      expiry_date: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 6. Optional Attachment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                مرفق الإعلان (اختياري - PDF / صورة / مستند تعميم)
              </label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center bg-slate-50 hover:bg-slate-100/60 transition-colors">
                <input
                  type="file"
                  id="create-announcement-attachment"
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
                    htmlFor="create-announcement-attachment"
                    className="cursor-pointer flex flex-col items-center gap-1 text-slate-500"
                  >
                    <Paperclip className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-semibold text-teal-700">
                      اضغط هنا لرفع ملف مرفق مع الإعلان
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PDF, Word, Excel, صور
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
                    <span>جاري النشر...</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>نشر الإعلان الآن</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Edit Announcement */}
      {canManageAnnouncements && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="تعديل الإعلان المدرسي (PATCH /announcements/{id}/)"
        >
          <form onSubmit={handleUpdateAnnouncement} className="space-y-4 text-right">
            {modalError && <Alert type="error">{modalError}</Alert>}

            {/* 1. Scope Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                الفئة المستهدفة للإعلان (Scope) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleEditScopeChange("all")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    editForm.scope === "all"
                      ? "bg-teal-50 border-teal-500 text-teal-800 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>جميع المدرسة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEditScopeChange("grades")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    editForm.scope === "grades"
                      ? "bg-purple-50 border-purple-500 text-purple-800 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>صفوف محددة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEditScopeChange("sections")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    editForm.scope === "sections"
                      ? "bg-amber-50 border-amber-500 text-amber-800 shadow-sm"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>شعب محددة</span>
                </button>
              </div>
            </div>

            {/* 2. Dynamic Scope Targets */}
            {editForm.scope === "grades" && (
              <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900">
                    حدد الصفوف الدراسية المستهدفة:
                  </span>
                  <span className="text-[10px] text-purple-700 font-semibold">
                    (محدد: {editForm.grade_levels.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                  {gradeLevels.map((g) => {
                    const isSelected = editForm.grade_levels.includes(g.id);
                    return (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => toggleEditGrade(g.id)}
                        className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-purple-50"
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        )}
                        <span className="truncate">{g.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {editForm.scope === "sections" && (
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    حدد الشعب الدراسية المستهدفة:
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold">
                    (محدد: {editForm.sections.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                  {sections.map((sec) => {
                    const isSelected = editForm.sections.includes(sec.id);
                    return (
                      <button
                        type="button"
                        key={sec.id}
                        onClick={() => toggleEditSection(sec.id)}
                        className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                          isSelected
                            ? "bg-amber-700 text-white border-amber-700 font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50"
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        )}
                        <span className="truncate">
                          {getSectionOptionLabel(sec)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                عنوان الإعلان <span className="text-red-500">*</span>
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

            {/* 4. Content */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نص ومحتوى الإعلان <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={editForm.content}
                onChange={(e) =>
                  setEditForm({ ...editForm, content: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed"
                required
              />
            </div>

            {/* 5. Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تاريخ النشر
                </label>
                <input
                  type="date"
                  value={editForm.publish_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, publish_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تاريخ الانتهاء
                </label>
                <input
                  type="date"
                  value={editForm.expiry_date}
                  min={editForm.publish_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, expiry_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 6. Attachment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تحديث الملف المرفق (اختياري)
              </label>
              {selectedAnnouncement?.attachment && !editForm.attachment && (
                <div className="mb-2 p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-teal-700 font-semibold">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>يوجد ملف مرفق حالي للإعلان</span>
                  </div>
                  <a
                    href={selectedAnnouncement.attachment}
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
                  id="edit-announcement-attachment"
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
                    htmlFor="edit-announcement-attachment"
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
      )}

      {/* Modal: Announcement Details View */}
      {selectedAnnouncement && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={`تفاصيل الإعلان: ${selectedAnnouncement.title}`}
        >
          <div className="space-y-4 text-right text-xs">
            {/* Header Box */}
            <div className="bg-teal-50 border border-teal-100 p-3.5 rounded-xl space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm text-teal-950 leading-relaxed">
                  {selectedAnnouncement.title}
                </h3>
                {selectedAnnouncement.is_active ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>نشط حالياً</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300 shrink-0">
                    <span>غير نشط / منتهي</span>
                  </span>
                )}
              </div>

              <div className="pt-1">{renderAudienceBadge(selectedAnnouncement)}</div>
            </div>

            {/* Announcement Full Content */}
            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">
                نص الإعلان والتعميم:
              </label>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl leading-relaxed whitespace-pre-line text-slate-800 text-xs sm:text-sm">
                {selectedAnnouncement.content}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 text-[10px] block font-sans">
                  تاريخ النشر:
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedAnnouncement.publish_date}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block font-sans">
                  تاريخ الانتهاء:
                </span>
                <span className="text-slate-800">
                  {selectedAnnouncement.expiry_date || "مستمر بدون انتهاء"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block font-sans">
                  نُشر بواسطة:
                </span>
                <span className="text-slate-700 font-sans">
                  @{selectedAnnouncement.created_by_username || "-"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] block font-sans">
                  تاريخ الإنشاء:
                </span>
                <span className="text-slate-700">
                  {formatDateTime(selectedAnnouncement.created_at)}
                </span>
              </div>
            </div>

            {/* Attachment Download Link */}
            {selectedAnnouncement.attachment && (
              <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <Paperclip className="w-4 h-4 text-indigo-600" />
                  <span>يوجد ملف مرفق للإعلان</span>
                </div>
                <a
                  href={selectedAnnouncement.attachment}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg font-bold text-xs shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>فتح / تنزيل الملف المرفق</span>
                </a>
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
              {canManageAnnouncements && (
                <Button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenEdit(selectedAnnouncement);
                  }}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>تعديل الإعلان</span>
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Delete Confirmation */}
      {canManageAnnouncements && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="تأكيد حذف الإعلان المدرسي"
        >
          <div className="space-y-4 text-right">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs leading-relaxed">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">هل أنت متأكد من رغبتك بحذف هذا الإعلان؟</p>
                <p className="text-rose-600">
                  سيتم حذف الإعلان نهائياً ولن يتمكن المعلمون أو الطلاب وأولياء الأمور من رؤيته.
                </p>
              </div>
            </div>

            {selectedAnnouncement && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-800">
                  {selectedAnnouncement.title}
                </div>
                <div className="text-slate-500">
                  نطاق الاستهداف: {selectedAnnouncement.scope_display || selectedAnnouncement.scope}
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
                onClick={handleDeleteAnnouncement}
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
      )}
    </div>
  );
}
