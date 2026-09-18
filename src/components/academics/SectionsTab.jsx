import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import { isTeacher, canManageAcademics } from "../../utils/permissionUtils";
import {
  parseApiError,
  getApiSuccessMessage,
  extractPaginatedList,
} from "../../utils/errorUtils";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { ConfirmModal } from "../ui/ConfirmModal";
import { SectionFormModal } from "./SectionFormModal";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, RefreshCw, Search, Lock } from "lucide-react";

export function SectionsTab() {
  const { hasPermission } = useAuthStore();
  const canAdd = hasPermission("academics.add_section");
  const canChange = hasPermission("academics.change_section");
  const canDelete = hasPermission("academics.delete_section");
  const isReadOnly = !canAdd && !canChange && !canDelete;

  const [sections, setSections] = useState([]);
  const [years, setYears] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    variant: "danger",
    onConfirm: () => {},
    isLoading: false,
  });

  const fetchDropdownData = useCallback(async () => {
    try {
      const [yearsRes, levelsRes] = await Promise.all([
        api.academics.getYears(),
        api.academics.getGradeLevels(),
      ]);
      const yearsList = extractPaginatedList(yearsRes).results;
      const levelsList = extractPaginatedList(levelsRes).results;

      setYears(yearsList);
      setGradeLevels(levelsList);
    } catch (_) {}
  }, []);

  const fetchSections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedYear) params.academic_year = selectedYear;
      if (selectedGrade) params.grade_level = selectedGrade;
      if (activeFilter) params.is_active = activeFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.academics.getSections(params);
      console.log(res);
      const { results } = extractPaginatedList(res);
      console.log(results);
      setSections(results);
    } catch (err) {
      setError(parseApiError(err, "فشل تحميل قائمة الشعب الصفية."));
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedGrade, activeFilter, searchTerm]);

  useEffect(() => {
    fetchDropdownData();
    fetchSections();
  }, [fetchDropdownData, fetchSections]);

  const handleOpenCreate = () => {
    setEditingSection(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (section) => {
    setEditingSection(section);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    if (editingSection) {
      const res = await api.academics.updateSection(
        editingSection.id,
        formData,
      );
      toast.success(getApiSuccessMessage(res, "تم تحديث الشعبة بنجاح."));
    } else {
      const res = await api.academics.createSection(formData);
      toast.success(getApiSuccessMessage(res, "تم إنشاء الشعبة بنجاح."));
    }
    fetchSections();
  };

  const handleDeleteSection = (section) => {
    setConfirmConfig({
      isOpen: true,
      title: "تأكيد حذف الشعبة الصفية",
      message: `هل أنت متأكد من حذف الشعبة (${section.name})؟ يُمنع حذف الشعبة إذا كانت مرتبطة بتسجيلات طلاب أو تكليفات معلمين.`,
      confirmText: "حذف الشعبة",
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await api.academics.deleteSection(section.id);
          toast.success(getApiSuccessMessage(res, "تم حذف الشعبة بنجاح."));
          setConfirmConfig((prev) => ({
            ...prev,
            isOpen: false,
            isLoading: false,
          }));
          fetchSections();
        } catch (err) {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
          // Server error message (e.g. SECTION_DELETE_BLOCKED)
          toast.error(
            parseApiError(
              err,
              "لا يمكن حذف هذه الشعبة لأنها تحتوي على طلاب أو تكليفات تعليمية مرتبطة بها.",
            ),
          );
        }
      },
    });
  };

  return (
    <div className="space-y-4 text-right dir-rtl" dir="rtl">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="البحث باسم الشعبة أو الصف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Academic Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">جميع الأعوام الدراسية</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name || `${y.start_date} / ${y.end_date}`}
              </option>
            ))}
          </select>

          {/* Grade Level Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">جميع الصفوف</option>
            {gradeLevels.map((gl) => (
              <option key={gl.id} value={gl.id}>
                {gl.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSections}
            disabled={isLoading}
            title="تحديث البيانات"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          {canAdd && (
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>إضافة شعبة جديدة</span>
            </Button>
          )}

          {isReadOnly && (
            <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-1 rounded-lg font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>قراءة فقط</span>
            </span>
          )}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Table */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs">جاري تحميل الشعب الصفية...</p>
        </div>
      ) : sections.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-xs">
          لا توجد شعب صفية مطابقة.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-white font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">اسم الشعبة</th>
                <th className="py-3 px-4">الصف الدراسي</th>
                <th className="py-3 px-4">عدد الطلاب المسجلين</th>
                <th className="py-3 px-4">العام الدراسي</th>
                <th className="py-3 px-4">الحالة</th>
                {(canChange || canDelete) && (
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {sections.map((sec) => (
                <tr key={sec.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    شعبة ({sec.name})
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {sec.grade_level_display || sec.grade_level}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {sec.students_count > 1
                      ? `${sec.students_count} طلاب`
                      : `${sec.students_count} طالب`}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {sec.academic_year_display || sec.academic_year}
                  </td>
                  <td className="py-3 px-4">
                    {sec.is_active ? (
                      <Badge variant="success">مفعلة</Badge>
                    ) : (
                      <Badge variant="danger">معطلة</Badge>
                    )}
                  </td>
                  {(canChange || canDelete) && (
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {canChange && (
                          <button
                            onClick={() => handleOpenEdit(sec)}
                            className="p-1 text-slate-600 hover:text-teal-600 rounded transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteSection(sec)}
                            className="p-1 text-slate-600 hover:text-rose-600 rounded transition-colors"
                            title="حذف"
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

      {/* Modal */}
      <SectionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        years={years}
        gradeLevels={gradeLevels}
        initialSection={editingSection}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        isLoading={confirmConfig.isLoading}
      />
    </div>
  );
}
