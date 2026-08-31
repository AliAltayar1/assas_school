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
import { GradeLevelFormModal } from "./GradeLevelFormModal";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, RefreshCw, Search, Lock } from "lucide-react";

export function GradeLevelsTab() {
  const { user } = useAuthStore();
  const teacherReadOnly = isTeacher(user);
  const canManage = canManageAcademics(user);

  const [levels, setLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stageFilter, setStageFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [ordering, setOrdering] = useState("stage");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    variant: "danger",
    onConfirm: () => {},
    isLoading: false,
  });

  const fetchLevels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { ordering };
      if (stageFilter) params.stage = stageFilter;
      if (activeFilter) params.is_active = activeFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.academics.getGradeLevels(params);
      const { results } = extractPaginatedList(res);
      setLevels(results);
    } catch (err) {
      setError(parseApiError(err, "فشل تحميل قائمة الصفوف الدراسية."));
    } finally {
      setIsLoading(false);
    }
  }, [stageFilter, activeFilter, searchTerm, ordering]);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  const handleOpenCreate = () => {
    setEditingLevel(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (level) => {
    setEditingLevel(level);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    if (editingLevel) {
      const res = await api.academics.updateGradeLevel(editingLevel.id, formData);
      toast.success(getApiSuccessMessage(res, "تم تحديث بيانات الصف بنجاح."));
    } else {
      const res = await api.academics.createGradeLevel(formData);
      toast.success(getApiSuccessMessage(res, "تم إنشاء الصف الدراسي بنجاح."));
    }
    fetchLevels();
  };

  const handleDeleteLevel = (level) => {
    setConfirmConfig({
      isOpen: true,
      title: "تأكيد حذف الصف الدراسي",
      message: `هل أنت متأكد من حذف (${level.name})؟ يمكن حذف الصف فقط إذا لم يكن مستخدماً في شعب أو خطط دراسية.`,
      confirmText: "حذف الصف",
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await api.academics.deleteGradeLevel(level.id);
          toast.success(getApiSuccessMessage(res, "تم حذف الصف الدراسي بنجاح."));
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchLevels();
        } catch (err) {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
          toast.error(parseApiError(err, "لا يمكن حذف هذا الصف لارتباطه بشُعب أو مواد محمية."));
        }
      },
    });
  };

  const stageBadgeVariants = {
    kindergarten: "warning",
    primary: "info",
    preparatory: "purple",
    secondary: "teal",
  };

  return (
    <div className="space-y-4 text-right dir-rtl" dir="rtl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="البحث باسم الصف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">جميع المراحل الدراسية</option>
            <option value="kindergarten">رياض الأطفال (kindergarten)</option>
            <option value="primary">التعليم الأساسي / الابتدائي (primary)</option>
            <option value="preparatory">المرحلة الإعدادية (preparatory)</option>
            <option value="secondary">المرحلة الثانوية (secondary)</option>
          </select>

          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">جميع الحالات</option>
            <option value="true">مفعلة فقط</option>
            <option value="false">معطلة فقط</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLevels}
            disabled={isLoading}
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {canManage && (
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>إضافة صف دراسي جديد</span>
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
          <p className="text-xs">جاري تحميل الصفوف الدراسية...</p>
        </div>
      ) : levels.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-xs">
          لا توجد صفوف دراسية مطابقة للشروط.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-white font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">اسم الصف الدراسي</th>
                <th className="py-3 px-4">المرحلة الدراسية (Stage)</th>
                <th className="py-3 px-4">الحالة</th>
                {canManage && <th className="py-3 px-4 text-center">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {levels.map((level) => (
                <tr key={level.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {level.name}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={stageBadgeVariants[level.stage] || "default"}>
                      {level.stage_display || level.stage}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {level.is_active ? (
                      <Badge variant="success">مفعل</Badge>
                    ) : (
                      <Badge variant="danger">معطل</Badge>
                    )}
                  </td>
                  {canManage && (
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(level)}
                          className="p-1 text-slate-600 hover:text-teal-600 rounded transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLevel(level)}
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
      <GradeLevelFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialLevel={editingLevel}
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
