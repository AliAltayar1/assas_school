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
import { GradeSubjectFormModal } from "./GradeSubjectFormModal";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, RefreshCw, Search, Lock } from "lucide-react";

export function GradeSubjectsTab() {
  const { user } = useAuthStore();
  const teacherReadOnly = isTeacher(user);
  const canManage = canManageAcademics(user);

  const [gradeSubjects, setGradeSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGradeSubject, setEditingGradeSubject] = useState(null);

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
      const [yearsRes, levelsRes, subjectsRes] = await Promise.all([
        api.academics.getYears(),
        api.academics.getGradeLevels(),
        api.academics.getSubjects(),
      ]);
      setYears(extractPaginatedList(yearsRes).results);
      setGradeLevels(extractPaginatedList(levelsRes).results);
      setSubjects(extractPaginatedList(subjectsRes).results);
    } catch (_) {}
  }, []);

  const fetchGradeSubjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { ordering: "-created_at" };
      if (selectedYear) params.academic_year = selectedYear;
      if (selectedGrade) params.grade_level = selectedGrade;
      if (selectedSubject) params.subject = selectedSubject;
      if (activeFilter) params.is_active = activeFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.academics.getGradeSubjects(params);
      const { results } = extractPaginatedList(res);
      setGradeSubjects(results);
    } catch (err) {
      setError(parseApiError(err, "فشل تحميل مواد الصفوف الدراسية."));
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedGrade, selectedSubject, activeFilter, searchTerm]);

  useEffect(() => {
    fetchDropdownData();
    fetchGradeSubjects();
  }, [fetchDropdownData, fetchGradeSubjects]);

  const handleOpenCreate = () => {
    setEditingGradeSubject(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (gs) => {
    setEditingGradeSubject(gs);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    if (editingGradeSubject) {
      const res = await api.academics.updateGradeSubject(editingGradeSubject.id, formData);
      toast.success(getApiSuccessMessage(res, "تم تحديث ربط المادة بنجاح."));
    } else {
      const res = await api.academics.createGradeSubject(formData);
      toast.success(getApiSuccessMessage(res, "تم ربط المادة بالصف الدراسي بنجاح."));
    }
    fetchGradeSubjects();
  };

  const handleDeleteGradeSubject = (gs) => {
    setConfirmConfig({
      isOpen: true,
      title: "تأكيد حذف المادة من الخطة الدراسية",
      message: `هل أنت متأكد من حذف ربط هذه المادة بالصف؟ يمكن الحذف فقط إذا لم تكن المادة مرتبطة بتكليفات معلمين أو بيانات تعليمية.`,
      confirmText: "حذف من الخطة",
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await api.academics.deleteGradeSubject(gs.id);
          toast.success(getApiSuccessMessage(res, "تم حذف ربط المادة بنجاح."));
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchGradeSubjects();
        } catch (err) {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
          toast.error(parseApiError(err, "لا يمكن حذف ربط المادة لارتباطها بتكليفات معلمين أو علامات."));
        }
      },
    });
  };

  return (
    <div className="space-y-4 text-right dir-rtl" dir="rtl">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="البحث باسم المادة أو الصف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

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

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">جميع المواد</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchGradeSubjects}
            disabled={isLoading}
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {canManage && (
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>إضافة مادة للخطة</span>
            </Button>
          )}

          {teacherReadOnly && (
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
          <p className="text-xs">جاري تحميل مواد الصفوف الدراسية...</p>
        </div>
      ) : gradeSubjects.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-xs">
          لا توجد مواد مضافة للخطط الدراسية.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-white font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">المادة التعليمية</th>
                <th className="py-3 px-4">الصف الدراسي</th>
                <th className="py-3 px-4">العام الدراسي</th>
                <th className="py-3 px-4">الحالة</th>
                {canManage && <th className="py-3 px-4 text-center">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {gradeSubjects.map((gs) => (
                <tr key={gs.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {gs.subject_display || gs.subject}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {gs.grade_level_display || gs.grade_level}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {gs.academic_year_display || gs.academic_year}
                  </td>
                  <td className="py-3 px-4">
                    {gs.is_active ? (
                      <Badge variant="success">مفعلة بالخطة</Badge>
                    ) : (
                      <Badge variant="danger">معطلة</Badge>
                    )}
                  </td>
                  {canManage && (
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(gs)}
                          className="p-1 text-slate-600 hover:text-teal-600 rounded transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGradeSubject(gs)}
                          className="p-1 text-slate-600 hover:text-rose-600 rounded transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
      <GradeSubjectFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        years={years}
        gradeLevels={gradeLevels}
        subjects={subjects}
        initialGradeSubject={editingGradeSubject}
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
