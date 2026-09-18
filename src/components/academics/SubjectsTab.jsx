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
import { SubjectFormModal } from "./SubjectFormModal";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, RefreshCw, Search, Lock } from "lucide-react";

export function SubjectsTab() {
  const { hasPermission } = useAuthStore();
  const canAdd = hasPermission("academics.add_subject");
  const canChange = hasPermission("academics.change_subject");
  const canDelete = hasPermission("academics.delete_subject");
  const isReadOnly = !canAdd && !canChange && !canDelete;

  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeFilter, setActiveFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [ordering, setOrdering] = useState("name");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    variant: "danger",
    onConfirm: () => {},
    isLoading: false,
  });

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { ordering };
      if (activeFilter) params.is_active = activeFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.academics.getSubjects(params);
      const { results } = extractPaginatedList(res);
      setSubjects(results);
    } catch (err) {
      setError(parseApiError(err, "فشل تحميل قائمة المواد الدراسية."));
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, searchTerm, ordering]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleOpenCreate = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (subject) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    if (editingSubject) {
      const res = await api.academics.updateSubject(editingSubject.id, formData);
      toast.success(getApiSuccessMessage(res, "تم تحديث المادة الدراسية بنجاح."));
    } else {
      const res = await api.academics.createSubject(formData);
      toast.success(getApiSuccessMessage(res, "تم إنشاء المادة الدراسية بنجاح."));
    }
    fetchSubjects();
  };

  const handleDeleteSubject = (subject) => {
    setConfirmConfig({
      isOpen: true,
      title: "تأكيد حذف المادة التعليمية",
      message: `هل أنت متأكد من حذف المادة (${subject.name})؟ يمكن حذف المادة فقط إذا لم تكن مستخدمة في خطة دراسية.`,
      confirmText: "حذف المادة",
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await api.academics.deleteSubject(subject.id);
          toast.success(getApiSuccessMessage(res, "تم حذف المادة الدراسية بنجاح."));
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchSubjects();
        } catch (err) {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
          toast.error(parseApiError(err, "لا يمكن حذف هذه المادة لارتباطها بخطة دراسية مفعّلة."));
        }
      },
    });
  };

  return (
    <div className="space-y-4 text-right dir-rtl" dir="rtl">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="البحث باسم المادة الدراسية أو الرمز..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

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
            onClick={fetchSubjects}
            disabled={isLoading}
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {canAdd && (
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>إضافة مادة جديدة</span>
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
          <p className="text-xs">جاري تحميل قائمة المواد الدراسية...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-xs">
          لا توجد مواد دراسية مسجلة.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-white font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">اسم المادة التعليمية</th>
                <th className="py-3 px-4">رمز المادة (Code)</th>
                <th className="py-3 px-4">الحالة</th>
                {(canChange || canDelete) && (
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {subjects.map((subj) => (
                <tr key={subj.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {subj.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {subj.code || "-"}
                  </td>
                  <td className="py-3 px-4">
                    {subj.is_active ? (
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
                            onClick={() => handleOpenEdit(subj)}
                            className="p-1 text-slate-600 hover:text-teal-600 rounded transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteSubject(subj)}
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
      <SubjectFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialSubject={editingSubject}
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
