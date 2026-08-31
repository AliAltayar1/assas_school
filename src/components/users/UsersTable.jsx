import React from "react";
import { Badge } from "../ui/Badge";
import { Edit2, Power, KeyRound, UserCheck } from "lucide-react";

export function UsersTable({
  users,
  isLoading,
  onEdit,
  onToggleActive,
  onResetPassword,
}) {
  const roleVariants = {
    school_admin: "danger",
    secretariat: "info",
    supervisor: "purple",
    teacher: "success",
    guardian: "teal",
    tech_support: "default",
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-medium">جاري تحميل قائمة المستخدمين...</p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
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
      className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm dir-rtl"
      dir="rtl"
    >
      <table className="w-full text-right text-xs">
        <thead className="bg-slate-900 text-white font-semibold text-[11px] uppercase tracking-wider">
          <tr>
            <th className="py-3.5 px-4">المستخدم والاسم</th>
            <th className="py-3.5 px-4">البريد الإلكتروني</th>
            <th className="py-3.5 px-4">الدور / نوع الحساب</th>
            <th className="py-3.5 px-4">حالة الحساب</th>
            <th className="py-3.5 px-4">حالة كلمة المرور</th>
            <th className="py-3.5 px-4 text-center">الإجراءات والعمليات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {users.map((user) => (
            <tr
              key={user.id}
              className="hover:bg-slate-50/80 transition-colors"
            >
              {/* User & Full Name */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                    {user.first_name
                      ? user.first_name[0]
                      : user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      {user.full_name ||
                        `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                        user.username}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 block">
                      @{user.username}
                    </span>
                  </div>
                </div>
              </td>

              {/* Email */}
              <td className="py-3 px-4 font-mono text-slate-600">
                {user.email || "غير محدد"}
              </td>

              {/* Role */}
              <td className="py-3 px-4">
                <Badge variant={roleVariants[user.role] || "default"}>
                  {user.role_display || (user.role === "guardian" ? "ولي أمر" : user.role)}
                </Badge>
              </td>

              {/* Active Status */}
              <td className="py-3 px-4">
                {user.is_active ? (
                  <Badge variant="success">مفعل</Badge>
                ) : (
                  <Badge variant="danger">معطل</Badge>
                )}
              </td>

              {/* Password Status */}
              <td className="py-3 px-4">
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

              {/* Actions */}
              <td className="py-3 px-4">
                <div className="flex items-center justify-center gap-1.5">
                  {/* Edit User Button */}
                  <button
                    onClick={() => onEdit(user)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors border border-transparent hover:border-teal-200"
                    title="تعديل بيانات الحساب"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Reset Password Button */}
                  <button
                    onClick={() => onResetPassword(user)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition-colors border border-transparent hover:border-amber-200"
                    title="إعادة تعيين كلمة المرور (Reset Password)"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>

                  {/* Toggle Active Status Button */}
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
