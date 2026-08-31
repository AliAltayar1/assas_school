import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { BookOpen, CheckCircle, ClipboardList, School } from 'lucide-react';

export function TeacherOverview() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 text-right">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-emerald-600" />
          <span>لوحة المعلم (Teacher Dashboard)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          أهلاً بك الأستاذ/ة {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}، إدارة الشُعب والتكليفات والواجبات المدرسية.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">التكليفات والشعب</span>
            <School className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-sm text-slate-700 mt-2 font-medium">متابعة الشعب والمواد المكلف بتدريسها وقوائم الطلاب</p>
        </div>

        <div className="bg-teal-50/60 border border-teal-100 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-700">رصد العلامات</span>
            <BookOpen className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-sm text-slate-700 mt-2 font-medium">إدخال درجات المذاكرات والواجبات وإرسالها للموجه</p>
        </div>

        <div className="bg-sky-50/60 border border-sky-100 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-700">الواجبات اليومية</span>
            <ClipboardList className="w-5 h-5 text-sky-600" />
          </div>
          <p className="text-sm text-slate-700 mt-2 font-medium">إنشاء الواجبات وتحديد تاريخ المطلوب ليوم وإرفاق الملفات</p>
        </div>
      </div>
    </div>
  );
}
