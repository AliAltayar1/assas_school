import React from "react";
import { Badge } from "../ui/Badge";
import { useAuthStore } from "../../store/useAuthStore";
import { canManagePermissions } from "../../utils/permissionUtils";
import {
  Edit2,
  Power,
  KeyRound,
  UserCheck,
  Eye,
  CreditCard,
  Phone,
  Mail,
  ShieldCheck,
} from "lucide-react";

export function UsersTable({
  users,
  isLoading,
  onEdit,
  onToggleActive,
  onResetPassword,
  onViewDetails,
  onManagePermissions,
}) {
  const { user: currentUser, permissions, requesterRole, hasPermission } = useAuthStore();

  const canEditUsers = hasPermission("accounts.change_user");
  const canToggleUsers = hasPermission("accounts.set_user_active");
  const canResetUsers = hasPermission("accounts.reset_user_password");
  const canManagePerms = canManagePermissions(currentUser, requesterRole, permissions);

  const roleVariants = {
    school_admin: "danger",
    secretariat: "info",
    supervisor: "purple",
    teacher: "success",
    guardian: "teal",
    tech_support: "default",
    accountant: "warning",
  };

  const STAGE_LABELS = {
    kindergarten: "روضة",
    primary: "ابتدائي",
    preparatory: "إعدادي",
    secondary: "ثانوي",
  };

  const renderSupervisorScopeBadge = (targetUser) => {
    if (targetUser.role !== "supervisor" && targetUser.role !== "educational_supervisor") return null;

    const rawScope =
      targetUser.supervisor_scope ||
      targetUser.scope ||
      targetUser.staff_profile?.supervisor_scope ||
      (targetUser.scope_type ? { scope_type: targetUser.scope_type, stages: targetUser.stages } : null);

    if (!rawScope || !rawScope.scope_type) {
      return (
        <span className="inline-block text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mt-1">
          بلا نطاق
        </span>
      );
    }

    if (rawScope.scope_type === "all") {
      return (
        <span className="inline-block text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-bold mt-1">
          كل المدرسة
        </span>
      );
    }

    if (rawScope.scope_type === "selected_stages") {
      const stagesList = Array.isArray(rawScope.stages) ? rawScope.stages : [];
      const stageNames = stagesList.map((s) => STAGE_LABELS[s] || s).join("، ");
      return (
        <span
          className="inline-block text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-bold mt-1 truncate max-w-[140px]"
          title={stageNames || "مراحل محددة"}
        >
          {stageNames || "مراحل محددة"}
        </span>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3 bg-white rounded-2xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-semibold text-slate-600">
          جاري تحميل قائمة المستخدمين...
        </p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <UserCheck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-slate-700">
          لم يتم العثور على أي حسابات مستخدمين
        </p>
        <p className="text-xs text-slate-500 mt-1">
          جرب تغيير شروط البحث أو الفلترة المطبقة
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden dir-rtl"
      dir="rtl"
    >
      {/* 1. Desktop Table View (>= 1024px) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-right text-xs min-w-[940px]">
          <thead className="bg-slate-900 text-white font-semibold text-[11px] tracking-wider">
            <tr>
              <th className="py-3.5 px-4 w-[28%] min-w-[260px] whitespace-nowrap">
                المستخدم والاسم
              </th>
              <th className="py-3.5 px-4 w-[22%] min-w-[200px] whitespace-nowrap">
                البريد الإلكتروني
              </th>
              <th className="py-3.5 px-4 w-[14%] min-w-[130px] whitespace-nowrap">
                الدور / نوع الحساب
              </th>
              <th className="py-3.5 px-4 w-[10%] min-w-[90px] whitespace-nowrap">
                حالة الحساب
              </th>
              <th className="py-3.5 px-4 w-[12%] min-w-[130px] whitespace-nowrap">
                حالة كلمة المرور
              </th>
              <th className="py-3.5 px-4 w-[14%] min-w-[130px] text-center whitespace-nowrap">
                الإجراءات والعمليات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((user) => {
              const isSelf = user.id === currentUser?.id;
              const isSuperuserTarget =
                user.role === "superuser" || Boolean(user.is_superuser);
              const canManageThisUserPerms =
                canManagePerms && !isSelf && !isSuperuserTarget;

              return (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {/* 1. User & Full Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-teal-800 text-xs shrink-0 shadow-sm">
                        {user.first_name
                          ? user.first_name[0]
                          : user.username[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div
                          className="font-bold text-slate-900 text-xs truncate"
                          title={
                            user.full_name ||
                            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                            user.username
                          }
                        >
                          {user.full_name ||
                            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                            user.username}
                        </div>

                        {/* Username with isolated LTR direction to prevent @ flipping */}
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                          <span dir="ltr" className="inline-block text-slate-500 font-semibold">
                            @{user.username}
                          </span>
                        </div>

                        {/* National ID & Phone badges */}
                        {((user.national_id || user.national_number || user.guardian?.national_id || user.profile?.national_id || user.guardian_profile?.national_id) ||
                          (user.phone_number || user.phone || user.primary_phone || user.guardian?.phone_number || user.profile?.phone || user.profile?.phone_number || user.guardian_profile?.phone_number || user.guardian_profile?.primary_phone || user.staff_profile?.phone || user.staff_profile?.phone_number)) && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] font-mono text-slate-600">
                            {(user.national_id || user.national_number || user.guardian?.national_id || user.profile?.national_id || user.guardian_profile?.national_id) && (
                              <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap">
                                <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>هوية:</span>
                                <span dir="ltr">{user.national_id || user.national_number || user.guardian?.national_id || user.profile?.national_id || user.guardian_profile?.national_id}</span>
                              </span>
                            )}
                            {(user.phone_number || user.phone || user.primary_phone || user.guardian?.phone_number || user.profile?.phone || user.profile?.phone_number || user.guardian_profile?.phone_number || user.guardian_profile?.primary_phone || user.staff_profile?.phone || user.staff_profile?.phone_number) && (
                              <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 whitespace-nowrap">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>هاتف:</span>
                                <span dir="ltr">{user.phone_number || user.phone || user.primary_phone || user.guardian?.phone_number || user.profile?.phone || user.profile?.phone_number || user.guardian_profile?.phone_number || user.guardian_profile?.primary_phone || user.staff_profile?.phone || user.staff_profile?.phone_number}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 2. Email */}
                  <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">
                    {user.email ? (
                      <span
                        className="truncate block max-w-[220px]"
                        title={user.email}
                      >
                        {user.email}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">
                        غير محدد
                      </span>
                    )}
                  </td>

                  {/* 3. Role */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-0.5">
                      <Badge variant={roleVariants[user.role] || "default"}>
                        {user.role_display ||
                          (user.role === "guardian"
                            ? "ولي أمر"
                            : user.role === "accountant"
                              ? "المحاسب"
                              : user.role)}
                      </Badge>
                      {renderSupervisorScopeBadge(user)}
                    </div>
                  </td>

                  {/* 4. Active Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {user.is_active ? (
                      <Badge variant="success">مفعل</Badge>
                    ) : (
                      <Badge variant="danger">معطل</Badge>
                    )}
                  </td>

                  {/* 5. Password Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {user.must_change_password ? (
                      <Badge variant="warning" size="sm">
                        كلمة مرور مؤقتة
                      </Badge>
                    ) : (
                      <Badge variant="default" size="sm">
                        كلمة مرور دائمية
                      </Badge>
                    )}
                  </td>

                  {/* 6. Actions */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {/* View Details Button */}
                      {onViewDetails && (
                        <button
                          onClick={() => onViewDetails(user)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors border border-transparent hover:border-teal-200"
                          title="عرض تفاصيل الحساب والطلاب المرتبطين"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      {/* Manage Permissions Button */}
                      {onManagePermissions && canManageThisUserPerms && (
                        <button
                          onClick={() => onManagePermissions(user)}
                          className="p-1.5 rounded-lg text-teal-700 hover:text-teal-900 hover:bg-teal-100/80 transition-colors border border-teal-200/80"
                          title="إدارة وتعديل صلاحيات المستخدم"
                        >
                          <ShieldCheck className="w-4 h-4 text-teal-600" />
                        </button>
                      )}

                      {/* Edit User Button */}
                      {canEditUsers && (
                        <button
                          onClick={() => onEdit(user)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors border border-transparent hover:border-teal-200"
                          title="تعديل بيانات الحساب"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Reset Password Button */}
                      {canResetUsers && (
                        <button
                          onClick={() => onResetPassword(user)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200"
                          title="إعادة تعيين كلمة المرور (Reset Password)"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}

                      {/* Toggle Active Status Button */}
                      {canToggleUsers && (
                        <button
                          onClick={() => onToggleActive(user)}
                          className={`p-1.5 rounded-lg transition-colors border border-transparent ${
                            user.is_active
                              ? "text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                              : "text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                          }`}
                          title={user.is_active ? "تعطيل الحساب" : "تفعيل الحساب"}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. Mobile & Tablet Cards Grid View (< 1024px) */}
      <div className="block lg:hidden divide-y divide-slate-100 bg-white">
        {users.map((user) => {
          const isSelf = user.id === currentUser?.id;
          const isSuperuserTarget =
            user.role === "superuser" || Boolean(user.is_superuser);
          const canManageThisUserPerms =
            canManagePerms && !isSelf && !isSuperuserTarget;

          return (
            <div
              key={user.id}
              className="p-4 sm:p-5 space-y-3.5 hover:bg-slate-50/50 transition-colors text-right"
            >
              {/* Top Card Row: Avatar, Name, Username & Role */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-teal-800 text-sm shrink-0 shadow-sm">
                    {user.first_name
                      ? user.first_name[0]
                      : user.username[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-sm truncate">
                      {user.full_name ||
                        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                        user.username}
                    </h4>
                    <div className="font-mono text-xs text-slate-500 mt-0.5">
                      <span dir="ltr" className="inline-block font-semibold">
                        @{user.username}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-0.5">
                  <Badge variant={roleVariants[user.role] || "default"}>
                    {user.role_display ||
                      (user.role === "guardian"
                        ? "ولي أمر"
                        : user.role === "accountant"
                          ? "المحاسب"
                          : user.role)}
                  </Badge>
                  {renderSupervisorScopeBadge(user)}
                </div>
              </div>

              {/* Middle Row: Contact & Identifiers Card */}
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 space-y-2 text-xs">
                {/* Email */}
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-500">البريد:</span>
                  {user.email ? (
                    <span className="font-mono text-slate-800 truncate" dir="ltr">
                      {user.email}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">
                      غير محدد
                    </span>
                  )}
                </div>

                {/* National ID & Phone */}
                {((user.national_id || user.national_number || user.guardian?.national_id || user.profile?.national_id || user.guardian_profile?.national_id) ||
                  (user.phone_number || user.phone || user.primary_phone || user.guardian?.phone_number || user.profile?.phone || user.profile?.phone_number || user.guardian_profile?.phone_number || user.guardian_profile?.primary_phone || user.staff_profile?.phone || user.staff_profile?.phone_number)) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/50">
                    {(user.national_id || user.national_number || user.guardian?.national_id || user.profile?.national_id || user.guardian_profile?.national_id) && (
                      <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-700 text-[11px] font-mono">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        <span>الهوية:</span>
                        <span dir="ltr">{user.national_id || user.national_number || user.guardian?.national_id || user.profile?.national_id || user.guardian_profile?.national_id}</span>
                      </div>
                    )}
                    {(user.phone_number || user.phone || user.primary_phone || user.guardian?.phone_number || user.profile?.phone || user.profile?.phone_number || user.guardian_profile?.phone_number || user.guardian_profile?.primary_phone || user.staff_profile?.phone || user.staff_profile?.phone_number) && (
                      <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-700 text-[11px] font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>الهاتف:</span>
                        <span dir="ltr">{user.phone_number || user.phone || user.primary_phone || user.guardian?.phone_number || user.profile?.phone || user.profile?.phone_number || user.guardian_profile?.phone_number || user.guardian_profile?.primary_phone || user.staff_profile?.phone || user.staff_profile?.phone_number}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Badges */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">الحالة:</span>
                    {user.is_active ? (
                      <Badge variant="success" size="sm">
                        مفعل
                      </Badge>
                    ) : (
                      <Badge variant="danger" size="sm">
                        معطل
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mr-auto">
                    <span className="text-[11px] text-slate-500">كلمة المرور:</span>
                    {user.must_change_password ? (
                      <Badge variant="warning" size="sm">
                        مؤقتة
                      </Badge>
                    ) : (
                      <Badge variant="default" size="sm">
                        دائمية
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Card Actions Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                {onViewDetails && (
                  <button
                    onClick={() => onViewDetails(user)}
                    className="flex-1 min-w-[65px] flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2 px-3 rounded-xl transition-colors border border-slate-200/80 shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>تفاصيل</span>
                  </button>
                )}

                {onManagePermissions && canManageThisUserPerms && (
                  <button
                    onClick={() => onManagePermissions(user)}
                    className="flex-1 min-w-[75px] flex items-center justify-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold py-2 px-3 rounded-xl transition-colors border border-teal-200/80 shadow-xs"
                    title="إدارة الصلاحيات"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>الصلاحيات</span>
                  </button>
                )}

                {canEditUsers && (
                  <button
                    onClick={() => onEdit(user)}
                    className="flex-1 min-w-[65px] flex items-center justify-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold py-2 px-3 rounded-xl transition-colors border border-teal-200/80 shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>تعديل</span>
                  </button>
                )}

                {canResetUsers && (
                  <button
                    onClick={() => onResetPassword(user)}
                    className="flex-1 min-w-[65px] flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold py-2 px-3 rounded-xl transition-colors border border-amber-200/80 shadow-xs"
                    title="إعادة تعيين كلمة المرور"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>الرمز</span>
                  </button>
                )}

                {canToggleUsers && (
                  <button
                    onClick={() => onToggleActive(user)}
                    className={`p-2 rounded-xl border transition-colors ${
                      user.is_active
                        ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    }`}
                    title={user.is_active ? "تعطيل الحساب" : "تفعيل الحساب"}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
