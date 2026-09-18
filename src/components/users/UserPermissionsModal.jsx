import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Alert } from "../ui/Alert";
import { api } from "../../api";
import { toast } from "sonner";
import { parseApiError, getApiSuccessMessage } from "../../utils/errorUtils";
import {
  ShieldCheck,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  Info,
  Check,
  SlidersHorizontal,
} from "lucide-react";

export function UserPermissionsModal({
  isOpen,
  onClose,
  user,
  onPermissionsUpdated,
}) {
  const [modules, setModules] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Load catalog and current user permissions in parallel
  const loadPermissionsData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);

    try {
      const [catalogRes, userPermsRes] = await Promise.all([
        api.users.getPermissionCatalog(),
        api.users.getUserPermissions(user.id),
      ]);

      // Extract modules from catalog response
      const catalogModules =
        catalogRes?.data?.modules || catalogRes?.modules || [];
      setModules(catalogModules);

      // Extract user current permissions
      const initialPerms =
        userPermsRes?.data?.permissions || userPermsRes?.permissions || [];
      setSelectedPermissions(new Set(initialPerms));
    } catch (err) {
      setError(
        parseApiError(
          err,
          "فشل تحميل كتالوج الصلاحيات أو صلاحيات المستخدم الحالية."
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && user?.id) {
      setSearchTerm("");
      loadPermissionsData();
    }
  }, [isOpen, user?.id, loadPermissionsData]);

  // Toggle single permission
  const handleTogglePermission = (code) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Toggle all permissions for a specific module
  const handleToggleModule = (modulePermissions) => {
    const codes = modulePermissions.map((p) => p.code);
    const allSelected = codes.every((code) => selectedPermissions.has(code));

    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        codes.forEach((c) => next.delete(c));
      } else {
        codes.forEach((c) => next.add(c));
      }
      return next;
    });
  };

  // Select all permissions across all modules
  const handleSelectAll = () => {
    const allCodes = new Set();
    modules.forEach((mod) => {
      (mod.permissions || []).forEach((p) => allCodes.add(p.code));
    });
    setSelectedPermissions(allCodes);
  };

  // Clear all permissions
  const handleClearAll = () => {
    setSelectedPermissions(new Set());
  };

  // Filter modules and permissions based on search keyword
  const filteredModules = useMemo(() => {
    if (!searchTerm.trim()) return modules;
    const term = searchTerm.trim().toLowerCase();

    return modules
      .map((mod) => {
        const modMatch = (mod.label || mod.module || "").toLowerCase().includes(term);
        const matchingPerms = (mod.permissions || []).filter(
          (p) =>
            p.code.toLowerCase().includes(term) ||
            (p.label && p.label.toLowerCase().includes(term))
        );

        if (modMatch) {
          return mod;
        }

        if (matchingPerms.length > 0) {
          return {
            ...mod,
            permissions: matchingPerms,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [modules, searchTerm]);

  // Stats calculation
  const totalAvailableCount = useMemo(() => {
    let count = 0;
    modules.forEach((m) => {
      count += (m.permissions || []).length;
    });
    return count;
  }, [modules]);

  // Save handler: PUT Full Replacement
  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    setError(null);

    const payload = Array.from(selectedPermissions);

    try {
      const res = await api.users.updateUserPermissions(user.id, payload);

      if (res?.code === "USER_PERMISSIONS_UNCHANGED") {
        toast.info("لم يطرأ أي تغيير على صلاحيات المستخدم.");
      } else {
        toast.success(
          getApiSuccessMessage(res, "تم تحديث صلاحيات المستخدم بنجاح.")
        );
      }

      // Update local state with confirmed backend permissions
      const returnedPerms =
        res?.data?.permissions || res?.permissions || payload;
      setSelectedPermissions(new Set(returnedPerms));

      if (onPermissionsUpdated) {
        onPermissionsUpdated(returnedPerms);
      }

      onClose();
    } catch (err) {
      const errData = err.response?.data;
      const errorCode = errData?.code;
      let friendlyMessage = parseApiError(
        err,
        "حدث خطأ أثناء حفظ صلاحيات المستخدم."
      );

      if (errorCode === "USER_PERMISSION_SELF_EDIT_FORBIDDEN") {
        friendlyMessage = "لا يمكنك تعديل صلاحيات حسابك الخاص.";
      } else if (errorCode === "SUPERUSER_PERMISSION_MANAGEMENT_FORBIDDEN") {
        friendlyMessage =
          "لا يمكن تعديل صلاحيات المدير العام للنظام (Superuser).";
      } else if (errorCode === "LAST_PERMISSION_MANAGER_REQUIRED") {
        friendlyMessage =
          "لا يمكن إزالة صلاحية إدارة الصلاحيات من آخر مدير مدرسة فعال.";
      }

      setError(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-right">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              إدارة صلاحيات المستخدم
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              تحديد الصلاحيات الوظيفية الممنوحة للحساب بشكل مستقل
            </p>
          </div>
        </div>
      }
      size="xl"
    >
      <div className="space-y-4 text-right dir-rtl" dir="rtl">
        {/* User Quick Info Header */}
        {user && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                {user.first_name ? user.first_name[0] : user.username[0].toUpperCase()}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {user.full_name ||
                    `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                    user.username}
                </h4>
                <div className="text-[11px] font-mono text-slate-500">
                  <span dir="ltr">@{user.username}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="teal" size="sm">
                {user.role_display || user.role}
              </Badge>
              <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-xl text-xs font-bold text-teal-800">
                {selectedPermissions.size} / {totalAvailableCount} صلاحية مفعلة
              </span>
            </div>
          </div>
        )}

        {error && <Alert type="error">{error}</Alert>}

        {/* Search & Bulk Selection Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث في أسماء الصلاحيات أو الوحدات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 hover:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={isLoading || isSaving}
              className="text-xs h-9"
            >
              <CheckSquare className="w-3.5 h-3.5 me-1.5 text-teal-600" />
              <span>تحديد الكل</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={isLoading || isSaving}
              className="text-xs h-9"
            >
              <Square className="w-3.5 h-3.5 me-1.5 text-slate-400" />
              <span>إلغاء التحديد</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadPermissionsData}
              disabled={isLoading || isSaving}
              title="إعادة تحميل الصلاحيات"
              className="h-9 px-2.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Permissions Content Body */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 space-y-3 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-slate-600">
              جاري تحميل قائمة الصلاحيات والبيانات...
            </p>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <SlidersHorizontal className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">
              لم يتم العثور على أي صلاحيات مطابقة للبحث
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[55vh] overflow-y-auto pl-1 pr-0.5">
            {filteredModules.map((mod) => {
              const modPerms = mod.permissions || [];
              const selectedInMod = modPerms.filter((p) =>
                selectedPermissions.has(p.code)
              ).length;
              const allModSelected =
                modPerms.length > 0 && selectedInMod === modPerms.length;

              return (
                <div
                  key={mod.module || mod.label}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3 transition-colors hover:border-slate-300"
                >
                  {/* Module Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">
                        {mod.label || mod.module}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        {selectedInMod} من {modPerms.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleModule(modPerms)}
                      className="text-[11px] font-semibold text-teal-600 hover:text-teal-800 transition-colors"
                    >
                      {allModSelected ? "إلغاء تحديد الوحدة" : "تحديد كامل الوحدة"}
                    </button>
                  </div>

                  {/* Permissions Checkbox Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {modPerms.map((perm) => {
                      const isChecked = selectedPermissions.has(perm.code);
                      return (
                        <label
                          key={perm.code}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? "bg-teal-50/70 border-teal-200/90 text-teal-950 shadow-2xs"
                              : "bg-slate-50/60 border-slate-200/70 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePermission(perm.code)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 transition cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block leading-tight">
                              {perm.label || perm.code}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block pt-0.5 truncate" dir="ltr">
                              {perm.code}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="text-[11px] text-slate-500">
            <span>سيتم حفظ </span>
            <strong className="text-slate-800">{selectedPermissions.size}</strong>
            <span> صلاحية للمستخدم</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              إلغاء
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading || isSaving}
              className="gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>حفظ الصلاحيات</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
