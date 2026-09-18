import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Alert } from "../ui/Alert";
import { api } from "../../api";
import { parseApiError, extractPaginatedList } from "../../utils/errorUtils";
import {
  User,
  CreditCard,
  Phone,
  Mail,
  GraduationCap,
  ShieldCheck,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

export function GuardianDetailsModal({ isOpen, onClose, user }) {
  const [links, setLinks] = useState([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && user?.id) {
      if (user.role === "guardian") {
        const fetchLinkedStudents = async () => {
          setIsLoadingLinks(true);
          setError(null);
          try {
            const res = await api.students.getGuardianLinks({ guardian: user.id });
            const { results } = extractPaginatedList(res);
            setLinks(results || []);
          } catch (err) {
            setError(parseApiError(err, "تعذر تحميل قائمة الطلاب المرتبطين بولي الأمر."));
          } finally {
            setIsLoadingLinks(false);
          }
        };

        fetchLinkedStudents();
      } else {
        setLinks([]);
        setIsLoadingLinks(false);
      }
    }
  }, [isOpen, user?.id, user?.role]);

  if (!user) return null;

  const isGuardian = user.role === "guardian";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isGuardian ? "تفاصيل حساب ولي الأمر والطلاب المرتبطين" : "تفاصيل حساب المستخدم"}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 text-right dir-rtl" dir="rtl">
        {error && <Alert type="error">{error}</Alert>}

        {/* User Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm border border-teal-200">
                {user.first_name ? user.first_name[0] : user.username[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username}
                </h3>
                <span className="font-mono text-xs text-slate-500 block dir-ltr text-right">
                  @{user.username}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={isGuardian ? "teal" : "default"}>
                {user.role_display || (isGuardian ? "ولي أمر" : user.role)}
              </Badge>
              <Badge variant={user.is_active ? "success" : "danger"}>
                {user.is_active ? "نشط" : "معطل"}
              </Badge>
            </div>
          </div>

          {/* User Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* National ID */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">الرقم الوطني / الهوية:</span>
                <span className="font-mono font-bold text-slate-800">
                  {user.national_id || "غير مسجل"}
                </span>
              </div>
            </div>

            {/* Phone Number */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <Phone className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">رقم الهاتف:</span>
                <span className="font-mono font-bold text-slate-800">
                  {user.phone_number || user.phone || "غير مسجل"}
                </span>
              </div>
            </div>

            {/* Email */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[10px]">البريد الإلكتروني:</span>
                <span className="font-mono text-slate-700 truncate block">
                  {user.email || "غير محدد"}
                </span>
              </div>
            </div>

            {/* Password Status */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">حالة كلمة المرور:</span>
                <span className="font-medium text-slate-700">
                  {user.must_change_password ? "مؤقتة (تتطلب التغيير عند الدخول)" : "دائمة"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Students Section (Only for Guardians) */}
        {isGuardian && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-teal-600" />
                <h4 className="text-xs font-bold text-slate-900">
                  الطلاب المرتبطون بهذا الحساب ({links.length})
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                من خلال روابط ولي الأمر (Guardian Links)
              </span>
            </div>

            {isLoadingLinks ? (
              <div className="p-6 text-center text-slate-500 space-y-2">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs">جاري تحميل بيانات الأبناء والطلاب المرتبطين...</p>
              </div>
            ) : links.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed text-slate-500 text-xs">
                لا يوجد طلاب مرتبطين بحساب ولي الأمر هذا حالياً.
              </div>
            ) : (
              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-100">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs">
                          {link.student_display || link.student}
                        </h5>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-500">صلة القرابة:</span>
                          <span className="bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[10px] px-2 py-0.5 rounded-md">
                            {link.relationship || "ولي أمر"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {link.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          <span>رابط نشط</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <XCircle className="w-3 h-3" />
                          <span>رابط معطل</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
