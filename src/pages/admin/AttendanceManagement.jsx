import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { AttendanceSheetsList } from '../../components/attendance/AttendanceSheetsList';
import { AttendanceCreateSheet } from '../../components/attendance/AttendanceCreateSheet';
import { AttendanceSheetDetail } from '../../components/attendance/AttendanceSheetDetail';
import { AttendanceRecordsSearch } from '../../components/attendance/AttendanceRecordsSearch';
import { ATTENDANCE_PERMS } from '../../components/attendance/attendanceConstants';
import { FileSpreadsheet, PlusCircle, Search, ShieldAlert } from 'lucide-react';

export function AttendanceManagement() {
  const { hasPermission } = useAuthStore();

  const canViewSheets = hasPermission(ATTENDANCE_PERMS.VIEW_SHEET);
  const canAddSheet = hasPermission(ATTENDANCE_PERMS.ADD_SHEET);
  const canViewRecords = hasPermission(ATTENDANCE_PERMS.VIEW_RECORD);

  // Active Tab: 'sheets' | 'create' | 'records'
  const [activeTab, setActiveTab] = useState('sheets');

  // Currently inspected sheet (switches view to Detail Mode)
  const [selectedSheetId, setSelectedSheetId] = useState(null);

  // Access denied fallback
  if (!canViewSheets && !canAddSheet && !canViewRecords) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] p-6 bg-white rounded-2xl border border-slate-200 text-center" dir="rtl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-base font-bold text-slate-800">ليس لديك صلاحية الوصول لوحدة الحضور</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md">
          تتطلب هذه الصفحة توفر إحدى صلاحيات الحضور المعتمدة في النظام. يرجى التواصل مع إدارة المدرسة.
        </p>
      </div>
    );
  }

  // If viewing details of a specific sheet, render AttendanceSheetDetail
  if (selectedSheetId) {
    return (
      <AttendanceSheetDetail
        sheetId={selectedSheetId}
        onBack={() => setSelectedSheetId(null)}
      />
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {canViewSheets && (
          <button
            onClick={() => {
              setActiveTab('sheets');
              setSelectedSheetId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shrink-0 ${
              activeTab === 'sheets'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>كشوفات الحضور</span>
          </button>
        )}

        {canAddSheet && (
          <button
            onClick={() => {
              setActiveTab('create');
              setSelectedSheetId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shrink-0 ${
              activeTab === 'create'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>أخذ حضور جديد</span>
          </button>
        )}

        {canViewRecords && (
          <button
            onClick={() => {
              setActiveTab('records');
              setSelectedSheetId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shrink-0 ${
              activeTab === 'records'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>سجل وبحث الطلاب</span>
          </button>
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === 'sheets' && canViewSheets && (
        <AttendanceSheetsList
          onSelectSheet={(sheetId) => setSelectedSheetId(sheetId)}
          onTakeAttendance={canAddSheet ? () => setActiveTab('create') : undefined}
        />
      )}

      {activeTab === 'create' && canAddSheet && (
        <AttendanceCreateSheet
          onSuccess={(createdSheetId) => {
            if (createdSheetId) {
              setSelectedSheetId(createdSheetId);
            } else {
              setActiveTab('sheets');
            }
          }}
          onCancel={() => setActiveTab('sheets')}
        />
      )}

      {activeTab === 'records' && canViewRecords && (
        <AttendanceRecordsSearch />
      )}
    </div>
  );
}

export default AttendanceManagement;
