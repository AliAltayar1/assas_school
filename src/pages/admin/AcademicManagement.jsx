import React, { useState } from 'react';
import { YearsTab } from '../../components/academics/YearsTab';
import { TermsTab } from '../../components/academics/TermsTab';
import { GradeLevelsTab } from '../../components/academics/GradeLevelsTab';
import { SectionsTab } from '../../components/academics/SectionsTab';
import { SubjectsTab } from '../../components/academics/SubjectsTab';
import { GradeSubjectsTab } from '../../components/academics/GradeSubjectsTab';
import { Calendar, Layers, BookOpen, Grid, Bookmark, FolderTree } from 'lucide-react';

export function AcademicManagement() {
  const [activeTab, setActiveTab] = useState('years');

  const tabs = [
    { id: 'years', label: 'الأعوام الدراسية', icon: Calendar, component: YearsTab },
    { id: 'terms', label: 'الفصول الدراسية', icon: Layers, component: TermsTab },
    { id: 'levels', label: 'الصفوف والمراحل', icon: Grid, component: GradeLevelsTab },
    { id: 'sections', label: 'الشعب الصفية', icon: FolderTree, component: SectionsTab },
    { id: 'subjects', label: 'المواد التعليمية', icon: BookOpen, component: SubjectsTab },
    { id: 'grade_subjects', label: 'مواد الصفوف (الخطة)', icon: Bookmark, component: GradeSubjectsTab },
  ];

  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component || YearsTab;

  return (
    <div className="space-y-6 text-right dir-rtl" dir="rtl">
      {/* Top Title & Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-teal-600" />
          <span>إدارة الهيكل الأكاديمي والسنوات الدراسية</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          تهيئة وإدارة السنوات الدراسية والفصول والصفوف والشعب والمواد الدراسية للمدرسة.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 space-x-1 space-x-reverse overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Component */}
      <div className="pt-2">
        <ActiveComponent />
      </div>
    </div>
  );
}
