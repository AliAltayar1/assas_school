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
import { TermFormModal } from "./TermFormModal";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, RefreshCw, Lock } from "lucide-react";

export function TermsTab() {
  const { hasPermission } = useAuthStore();
  const canAdd = hasPermission("academics.add_term");
  const canChange = hasPermission("academics.change_term");
  const canDelete = hasPermission("academics.delete_term");
  const isReadOnly = !canAdd && !canChange && !canDelete;

  const [terms, setTerms] = useState([]);
  const [years, setYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedYear, setSelectedYear] = useState("");
  const [termNumber, setTermNumber] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ordering, setOrdering] = useState("number");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);

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
    try {
      const res = await api.academics.getYears();
      const { results } = extractPaginatedList(res);
      setYears(results);
    } catch (_) {}
  }, []);

  const fetchTerms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { ordering };
      if (selectedYear) params.academic_year = selectedYear;
      if (termNumber) params.number = termNumber;
      if (statusFilter) params.status = statusFilter;

      const res = await api.academics.getTerms(params);
      const { results } = extractPaginatedList(res);
      setTerms(results);
    } catch (err) {
      setError(parseApiError(err, "فشل تحميل قائمة الفصول الدراسية."));
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, termNumber, statusFilter, ordering]);

  useEffect(() => {
    fetchYears();
    fetchTerms();
  }, [fetchYears, fetchTerms]);

  const handleOpenCreate = () => {
    setEditingTerm(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (term) => {
    setEditingTerm(term);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    if (editingTerm) {
      const res = await api.academics.updateTerm(editingTerm.id, formData);
      toast.success(getApiSuccessMessage(res, "تم تحديث الفصل الدراسي بنجاح."));
    } else {
      const res = await api.academics.createTerm(formData);
      toast.success(getApiSuccessMessage(res, "تم إنشاء الفصل الدراسي بنجاح."));
    }
    fetchTerms();
  };

  const handleDeleteTerm = (term) => {
    setConfirmConfig({
      isOpen: true,
      title: "تأكيد حذف الفصل الدراسي",
      message: `هل أنت متأكد من حذف (${term.number_display || `الفصل ${term.number}`})؟ يمكن حذف الفصل إذا لم يكن مرتبطاً ببيانات دراسية أخرى.`,
      confirmText: "حذف الفصل",
      variant: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await api.academics.deleteTerm(term.id);
          toast.success(getApiSuccessMessage(res, "تم حذف الفصل الدراسي بنجاح."));
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchTerms();
        } catch (err) {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
          toast.error(parseApiError(err, "لا يمكن حذف هذا الفصل لارتباطه ببيانات دراسية أخرى."));
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
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          {/* Academic Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">جميع الأعوام الدراسية</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name || `${y.start_date} / ${y.end_date}`}
              </option>
            ))}
          </select>

          {/* Term Number Filter */}
          <select
            value={termNumber}
            onChange={(e) => setTermNumber(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">جميع الفصول</option>
            <option value="1">الفصل الأول (1)</option>
            <option value="2">الفصل الثاني (2)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="active">مفعل</option>
            <option value="closed">مغلق</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTerms}
            disabled={isLoading}
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {canAdd && (
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>إنشاء فصل دراسي جديد</span>
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

      {/* Terms Table */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs">جاري تحميل الفصول الدراسية...</p>
        </div>
      ) : terms.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-xs">
          لا توجد فصول دراسية مطابقة للشروط.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-white font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">رقم الفصل الدراسي</th>
                <th className="py-3 px-4">تاريخ البداية</th>
                <th className="py-3 px-4">تاريخ النهاية</th>
                <th className="py-3 px-4">الحالة (Status)</th>
                {(canChange || canDelete) && <th className="py-3 px-4 text-center">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {terms.map((term) => (
                <tr key={term.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {term.number_display ||
                      `الفصل الدراسي ${term.number === 1 ? "الأول" : "الثاني"}`}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {term.start_date}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {term.end_date}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={statusBadgeVariants[term.status] || "default"}>
                      {term.status_display || term.status}
                    </Badge>
                  </td>
                  {(canChange || canDelete) && (
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {canChange && (
                          <button
                            onClick={() => handleOpenEdit(term)}
                            className="p-1 text-slate-600 hover:text-teal-600 rounded transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteTerm(term)}
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
      <TermFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        years={years}
        initialTerm={editingTerm}
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
