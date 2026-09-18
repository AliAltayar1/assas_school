import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import { UserFilters } from "../../components/users/UserFilters";
import { UsersTable } from "../../components/users/UsersTable";
import { UserFormModal } from "../../components/users/UserFormModal";
import { GuardianDetailsModal } from "../../components/users/GuardianDetailsModal";
import { TempPasswordModal } from "../../components/users/TempPasswordModal";
import { UserPermissionsModal } from "../../components/users/UserPermissionsModal";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { toast } from "sonner";
import {
  parseApiError,
  getApiSuccessMessage,
  extractPaginatedList,
} from "../../utils/errorUtils";
import { Users, UserPlus, RefreshCw } from "lucide-react";

export function UserStaffManagement() {
  const { hasPermission } = useAuthStore();
  const canAddUser = hasPermission("accounts.add_user");

  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [ordering, setOrdering] = useState("-date_joined");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [selectedDetailsUser, setSelectedDetailsUser] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [tempPassword, setTempPassword] = useState(null);
  const [tempPasswordUsername, setTempPasswordUsername] = useState("");
  const [isTempModalOpen, setIsTempModalOpen] = useState(false);

  const [permissionsUser, setPermissionsUser] = useState(null);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

  // Confirm Modal state
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "",
    variant: "danger",
    onConfirm: () => {},
    isLoading: false,
  });

  // Fetch users list from backend API
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: currentPage,
        ordering: ordering,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (roleFilter) params.role = roleFilter;
      if (activeFilter) params.is_active = activeFilter;

      const res = await api.users.getUsers(params);
      const { results, count, next, previous } = extractPaginatedList(res);

      setUsers(results);
      setTotalCount(count);
      setHasNext(Boolean(next));
      setHasPrevious(Boolean(previous));
    } catch (err) {
      setError(parseApiError(err, "حدث خطأ أثناء تحميل حسابات المستخدمين من السيرفر."));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, roleFilter, activeFilter, ordering]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search reset to page 1
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (value) => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

  const handleActiveFilterChange = (value) => {
    setActiveFilter(value);
    setCurrentPage(1);
  };

  const handleOrderingChange = (value) => {
    setOrdering(value);
    setCurrentPage(1);
  };

  // Open modal for new user creation
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setIsFormModalOpen(true);
  };

  // Open modal for user edit
  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setIsFormModalOpen(true);
  };

  // Create or Update User Submit Handler
  const handleFormSubmit = async (formData) => {
    if (editingUser) {
      const res = await api.users.updateUser(editingUser.id, formData);
      toast.success(getApiSuccessMessage(res, "تم تحديث بيانات المستخدم بنجاح."));
      fetchUsers();
    } else {
      const newUser = await api.users.createUser(formData);
      toast.success(getApiSuccessMessage(newUser, "تم إنشاء الحساب بنجاح."));
      fetchUsers();

      if (newUser.temporary_password || newUser.data?.temporary_password) {
        setTempPassword(newUser.temporary_password || newUser.data?.temporary_password);
        setTempPasswordUsername(newUser.username || newUser.data?.username);
        setIsTempModalOpen(true);
      }
    }
  };

  // Toggle Activate / Deactivate Handler
  const handleToggleActive = (user) => {
    const actionText = user.is_active ? "تعطيل" : "تفعيل";
    const variant = user.is_active ? "warning" : "success";

    setConfirmConfig({
      isOpen: true,
      title: `${actionText} حساب المستخدم`,
      message: `هل أنت متأكد من رغبتك في ${actionText} حساب @${user.username}؟`,
      confirmText: `تأكيد ال${actionText}`,
      variant: variant,
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await api.users.setActiveStatus(user.id, !user.is_active);
          toast.success(getApiSuccessMessage(res, `تم ${actionText} الحساب بنجاح.`));
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchUsers();
        } catch (err) {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
          toast.error(parseApiError(err, `فشل ${actionText} الحساب.`));
        }
      },
    });
  };

  // Reset Password Handler
  const handleResetPassword = (user) => {
    setConfirmConfig({
      isOpen: true,
      title: "إعادة تعيين كلمة المرور",
      message: `هل أنت متأكد من رغبتك في إعادة تعيين كلمة المرور لحساب @${user.username}؟ سيتم إنشاء كلمة مرور مؤقتة لمرة واحدة.`,
      confirmText: "إعادة تعيين كلمة المرور",
      variant: "warning",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isLoading: true }));
        try {
          const res = await api.users.resetPassword(user.id);
          toast.success(getApiSuccessMessage(res, "تمت إعادة تعيين كلمة المرور بنجاح."));
          setConfirmConfig((prev) => ({ ...prev, isOpen: false, isLoading: false }));

          const tempPass = res.temporary_password || res.data?.temporary_password;
          if (tempPass) {
            setTempPassword(tempPass);
            setTempPasswordUsername(user.username);
            setIsTempModalOpen(true);
          }
        } catch (err) {
          setConfirmConfig((prev) => ({ ...prev, isLoading: false }));
          toast.error(parseApiError(err, "فشل إعادة تعيين كلمة المرور."));
        }
      },
    });
  };

  return (
    <div className="space-y-6 text-right dir-rtl" dir="rtl">
      {/* Top Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            <span>إدارة حسابات المستخدمين والموظفين</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إضافة وتعديل وتفعيل حسابات الكادر التعليمي والإداري، وتحديد الصلاحيات الأكاديمية.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={isLoading}
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {canAddUser && (
            <Button onClick={handleOpenCreateModal} className="gap-2">
              <UserPlus className="w-4 h-4" />
              <span>إضافة حساب موظف جديد</span>
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filter and Search Bar */}
      <UserFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        roleFilter={roleFilter}
        onRoleFilterChange={handleRoleFilterChange}
        activeFilter={activeFilter}
        onActiveFilterChange={handleActiveFilterChange}
        ordering={ordering}
        onOrderingChange={handleOrderingChange}
      />

      {/* Table Listing */}
      <UsersTable
        users={users}
        isLoading={isLoading}
        onEdit={handleOpenEditModal}
        onToggleActive={handleToggleActive}
        onResetPassword={handleResetPassword}
        onViewDetails={(user) => {
          setSelectedDetailsUser(user);
          setIsDetailsModalOpen(true);
        }}
        onManagePermissions={(user) => {
          setPermissionsUser(user);
          setIsPermissionsModalOpen(true);
        }}
      />

      {/* Pagination Controls */}
      <Pagination
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={20}
        onPageChange={(page) => setCurrentPage(page)}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
      />

      {/* Modal for User Business Permissions Management */}
      <UserPermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => {
          setIsPermissionsModalOpen(false);
          setPermissionsUser(null);
        }}
        user={permissionsUser}
        onPermissionsUpdated={() => fetchUsers()}
      />

      {/* Modal for Guardian / User Details and Linked Students */}
      <GuardianDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedDetailsUser(null);
        }}
        user={selectedDetailsUser}
      />

      {/* Modal for Creating / Editing Users */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialUser={editingUser}
      />

      {/* Modal for Displaying Temporary Password */}
      <TempPasswordModal
        isOpen={isTempModalOpen}
        onClose={() => setIsTempModalOpen(false)}
        temporaryPassword={tempPassword}
        username={tempPasswordUsername}
      />

      {/* Confirmation Dialog */}
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
