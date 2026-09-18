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
import { YearFormModal } from "./YearFormModal";
import { toast } from "sonner";
import { Calendar, Plus, Edit2, Trash2, RefreshCw, Lock } from "lucide-react";

export function YearsTab() {
  const { hasPermission } = useAuthStore();
  const canAdd = hasPermission("academics.add_academicyear");
  const canChange = hasPermission("academics.change_academicyear");
  const canDelete = hasPermission("academics.delete_academicyear");
  const isReadOnly = !canAdd && !canChange && !canDelete;

  const [years, setYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [ordering, setOrdering] = useState("-start_date");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);

  // Confirmation Modal
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    variant: "danger",
    onConfirm: () => {},
    isLoading: false,
  });

  const fetchYears = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { ordering };
      if (statusFilter) params.status = statusFilter;

      const res = await api.academics.getYears(params);
      const { results } = extractPaginatedList(res);
      setYears(results);
    } catch (err) {
      setError(parseApiError(err, "فشل تحميل قائمة الأعوام الدراسية."));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, ordering]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const handleOpenCreate = () => {
    setEditingYear(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (year) => {
    setEditingYear(year);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    if (editingYear) {
      const res = await api.academics.updateYear(editingYear.id, formData);
      toast.success(getApiSuccessMessage(res, "تم تحديث السنة الدراسية بنجاح."));
    } else {
      const res = await api.academics.createYear(formData);
      toast.success(getApiSuccessMessage(res, "تم إنشاء السنة الدراسية بنجاح."));
    }
    fetchYears();
  };

  const handleDeleteYear = (year) => {
    setConfirmConfig({
      isOpen: true,
      title: "تأكيد حذف السنة الدراسية",
      message: `هل أنت متأكد من حذف السنة الدراسية (${year.name || `${year.start_date} / ${year.end_date}`})؟ يُشترط أن تكون السنة غير مرتبطة بفصول أو شعب أو تسجيلات.`,
      confirmText: "حذف السنة",
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await api.academics.deleteYear(year.id);
          toast.success(getApiSuccessMessage(res, "تم حذف السنة الدراسية بنجاح."));
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchYears();
        } catch (err) {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
          toast.error(parseApiError(err, "لا يمكن حذف هذه السنة الدراسية بسبب وجود بيانات مرتبطة بها."));
        }
      },
    });
  };

  const statusBadgeVariants = {
    draft: "default",
    active: "success",
    closed: "danger",
  };

  return (
    <div className="space-y-4 text-right dir-rtl" dir="rtl">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">جميع الحالات (status)</option>
            <option value="draft">مسودة (draft)</option>
            <option value="active">مفعلة (active)</option>
            <option value="closed">مغلقة (closed)</option>
          </select>

          <select
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="-start_date">تاريخ البداية (الأحدث أولاً)</option>
            <option value="start_date">تاريخ البداية (الأقدَم أولاً)</option>
            <option value="end_date">تاريخ النهاية</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchYears}
            disabled={isLoading}
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {canAdd && (
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>إنشاء عام دراسي جديد</span>
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

      {/* Table Listing */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs">جاري تحميل الأعوام الدراسية...</p>
        </div>
      ) : years.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-xs">
          لا توجد أعوام دراسية حالياً.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-white font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">اسم العام العلمي</th>
                <th className="py-3 px-4">تاريخ البداية</th>
                <th className="py-3 px-4">تاريخ النهاية</th>
                <th className="py-3 px-4">الحالة (Status)</th>
                {(canChange || canDelete) && <th className="py-3 px-4 text-center">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {years.map((year) => (
                <tr key={year.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {year.name || `${year.start_date} / ${year.end_date}`}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {year.start_date}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {year.end_date}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={statusBadgeVariants[year.status] || "default"}>
                      {year.status_display || year.status}
                    </Badge>
                  </td>
                  {(canChange || canDelete) && (
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {canChange && (
                          <button
                            onClick={() => handleOpenEdit(year)}
                            className="p-1 text-slate-600 hover:text-teal-600 rounded transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteYear(year)}
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

      {/* Year Form Modal */}
      <YearFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialYear={editingYear}
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
