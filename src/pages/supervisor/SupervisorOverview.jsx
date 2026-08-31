import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { UserCheck, CheckCircle, BookOpen, Award, Inbox } from 'lucide-react';

export function SupervisorOverview() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 text-right">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-purple-600" />
          <span>لوحة الموجه التربوي (Educational Supervisor)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          أهلاً بك {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}، اعتمادات الحضور والعلامات والتكليفات والرد على استفسارات الأهالي.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          to="/supervisor/attendance"
          className="bg-purple-50/60 hover:bg-purple-50 border border-purple-100 p-4 rounded-xl transition-colors block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700">الحضور والغياب</span>
            <CheckCircle className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-sm text-slate-700 mt-2 font-medium">رصد حضور وغياب وانصراف الطلاب للشعب المدرسية</p>
        </Link>

        <Link
          to="/supervisor/grade-approvals"
          className="bg-teal-50/60 hover:bg-teal-50 border border-teal-100 p-4 rounded-xl transition-colors block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-700">اعتماد العلامات</span>
            <BookOpen className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-sm text-slate-700 mt-2 font-medium">تدقيق ونشر علامات التقييمات والاختبارات لأولياء الأمور</p>
        </Link>

        <Link
          to="/supervisor/behavior-notes"
          className="bg-amber-50/60 hover:bg-amber-50 border border-amber-100 p-4 rounded-xl transition-colors block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">الملاحظات السلوكية</span>
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-sm text-slate-700 mt-2 font-medium">تسجيل ونشر الملاحظات التربوية والإيجابية للطلاب</p>
        </Link>

        <Link
          to="/supervisor/requests"
          className="bg-sky-50/60 hover:bg-sky-50 border border-sky-100 p-4 rounded-xl transition-colors block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-700">الشكاوى والاستفسارات</span>
            <Inbox className="w-5 h-5 text-sky-600" />
          </div>
          <p className="text-sm text-slate-700 mt-2 font-medium">متابعة رسائل أولياء الأمور والرد على استفساراتهم التربوية</p>
        </Link>
      </div>
    </div>
  );
}
