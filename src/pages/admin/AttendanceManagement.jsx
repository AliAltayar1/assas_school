import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";
import { toast } from "sonner";
import {
  parseApiError,
  extractPaginatedList,
  getApiErrorCode,
} from "../../utils/errorUtils";
import {
  canAccessAttendance,
  canManageAttendance,
} from "../../utils/permissionUtils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  Calendar,
  Layers,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Save,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Building,
  ArrowRight,
  Sparkles,
  Edit3,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

const ARRIVAL_METHODS = [
  { value: "guardian", label: "ولي الأمر" },
  { value: "school_bus", label: "باص المدرسة" },
  { value: "walking", label: "مشياً على الأقدام" },
  { value: "public_transport", label: "مواصلات عامة" },
  { value: "bicycle", label: "دراجة" },
  { value: "other", label: "أخرى" },
];

const DEPARTURE_METHODS = [
  { value: "guardian", label: "ولي الأمر" },
  { value: "school_bus", label: "باص المدرسة" },
  { value: "walking", label: "مشياً على الأقدام" },
  { value: "public_transport", label: "مواصلات عامة" },
  { value: "bicycle", label: "دراجة" },
  { value: "other", label: "أخرى" },
];

const ABSENCE_REASON_SOURCES = [
  { value: "guardian", label: "ولي الأمر" },
  { value: "school", label: "إدارة المدرسة" },
];

const COMMON_ABSENCE_REASONS = [
  "مرض",
  "مراجعة طبية",
  "ظرف عائلي طارئ",
  "سفر",
  "سوء أحوال جوية",
  "عذر رسمي مقبول",
];

// Helper to format ISO date string (YYYY-MM-DD) to Arabic day name and formatted date
function formatArabicDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    const dayName = new Intl.DateTimeFormat("ar-SY", {
      weekday: "long",
    }).format(d);
    const formatted = new Intl.DateTimeFormat("ar-SY", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
    return `${dayName} - ${formatted}`;
  } catch (e) {
    return dateStr;
  }
}

// Check if a date string is Friday or Saturday
function isWeekendDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  return day === 5 || day === 6;
}

// Normalize time to HH:MM:SS format
function formatTimeToHHMMSS(timeStr) {
  if (!timeStr) return "08:00:00";
  const parts = timeStr.trim().split(":");
  const h = parts[0]?.padStart(2, "0") || "08";
  const m = parts[1]?.padStart(2, "0") || "00";
  const s = parts[2]?.padStart(2, "0") || "00";
  return `${h}:${m}:${s}`;
}

export function AttendanceManagement() {
  const { user } = useAuthStore();
  const hasAccess = canAccessAttendance(user);
  const hasManageRights = canManageAttendance(user);

  // Active View Tab: 'daily' (Take/View Section Sheet) | 'history' (Sheets Archive) | 'records' (Student Records Search)
  const [activeTab, setActiveTab] = useState("daily");

  // Academics Structure Data
  const [academicYears, setAcademicYears] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [sections, setSections] = useState([]);

  // Top Filter Selection
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedGradeLevel, setSelectedGradeLevel] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Default Arrival Time (Toolbar setting, defaults to 08:00)
  const [defaultArrivalTime, setDefaultArrivalTime] = useState("08:00");

  // Sheet / Roster Active State
  const [sheetMode, setSheetMode] = useState("none"); // "none" | "create" | "view_edit"
  const [existingSheet, setExistingSheet] = useState(null); // When in "view_edit" mode
  const [studentRows, setStudentRows] = useState([]); // Active local state for each student
  const [originalStudentRows, setOriginalStudentRows] = useState([]); // To track dirty modifications
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSavingSheet, setIsSavingSheet] = useState(false);
  const [sheetError, setSheetError] = useState(null);

  // Dirty State Guard
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Filters & Search within Student List
  const [studentSearch, setStudentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "present" | "late" | "absent_excused" | "absent_unexcused" | "departed" | "pending_departure"

  // Expanded student row details (for tablet/mobile notes & details)
  const [expandedRows, setExpandedRows] = useState({});

  // Single Record Saving Indicator
  const [savingRecordId, setSavingRecordId] = useState(null);

  // Departure Modal State
  const [isDepartureModalOpen, setIsDepartureModalOpen] = useState(false);
  const [departureTime, setDepartureTime] = useState("13:30");
  const [departureMode, setDepartureMode] = useState("individual"); // "uniform" | "individual"
  const [uniformDepartureMethod, setUniformDepartureMethod] = useState("guardian");
  const [departureStudentStates, setDepartureStudentStates] = useState([]);
  const [isSubmittingDeparture, setIsSubmittingDeparture] = useState(false);
  const [departureError, setDepartureError] = useState(null);

  // Single Record Quick Edit / Early Departure Modal
  const [isSingleEditModalOpen, setIsSingleEditModalOpen] = useState(false);
  const [singleEditingStudent, setSingleEditingStudent] = useState(null);
  const [singleEditForm, setSingleEditForm] = useState({});
  const [isSubmittingSingleEdit, setIsSubmittingSingleEdit] = useState(false);

  // History Tab (Archive of past sheets)
  const [historySheets, setHistorySheets] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyFilters, setHistoryFilters] = useState({
    academic_year: "",
    grade_level: "",
    section: "",
    attendance_date: "",
  });

  // Records Search Tab
  const [recordsList, setRecordsList] = useState([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState(null);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsTotalCount, setRecordsTotalCount] = useState(0);
  const [recordsSearchQuery, setRecordsSearchQuery] = useState("");
  const [recordsFilterStatus, setRecordsFilterStatus] = useState("");
  const [recordsFilterDate, setRecordsFilterDate] = useState("");

  // =========================================================================
  // 1. Initial Data Loading: Academics (Years, Grade Levels, Sections)
  // =========================================================================
  useEffect(() => {
    let isMounted = true;
    const fetchAcademicData = async () => {
      try {
        const [yearsRes, gradesRes, sectionsRes] = await Promise.all([
          api.academics.getYears({ page_size: 100 }).catch(() => []),
          api.academics.getGradeLevels({ page_size: 100 }).catch(() => []),
          api.academics.getSections({ page_size: 200 }).catch(() => []),
        ]);

        if (!isMounted) return;

        const years = extractPaginatedList(yearsRes);
        const grades = extractPaginatedList(gradesRes);
        const secs = extractPaginatedList(sectionsRes);

        setAcademicYears(years);
        setGradeLevels(grades);
        setSections(secs);

        // Auto-select active year
        const activeYear = years.find((y) => y.is_active) || years[0];
        if (activeYear) {
          setSelectedYear(activeYear.id);
        }
      } catch (err) {
        console.error("Failed to load academic structure:", err);
      }
    };

    fetchAcademicData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter sections by selected Grade Level
  const availableSections = useMemo(() => {
    if (!selectedGradeLevel) return sections;
    return sections.filter(
      (s) =>
        s.grade_level === selectedGradeLevel ||
        s.grade_level_id === selectedGradeLevel
    );
  }, [sections, selectedGradeLevel]);

  // Selected Section Object
  const selectedSectionObj = useMemo(() => {
    return sections.find((s) => s.id === selectedSection);
  }, [sections, selectedSection]);

  // Selected Grade Level Object
  const selectedGradeLevelObj = useMemo(() => {
    return gradeLevels.find((g) => g.id === selectedGradeLevel);
  }, [gradeLevels, selectedGradeLevel]);

  // Track if today is selected
  const isTodaySelected = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return selectedDate === today;
  }, [selectedDate]);

  // Track if selected date is weekend
  const isSelectedDateWeekend = useMemo(() => {
    return isWeekendDate(selectedDate);
  }, [selectedDate]);

  // =========================================================================
  // 2. Fetch Sheet or Roster for Selected Section & Date
  // =========================================================================
  const loadSectionAttendance = useCallback(
    async (sectionId, dateStr, bypassDirty = false) => {
      if (!sectionId) {
        setSheetMode("none");
        setStudentRows([]);
        setOriginalStudentRows([]);
        setExistingSheet(null);
        setIsDirty(false);
        return;
      }

      if (isDirty && !bypassDirty) {
        setPendingAction(() => () => loadSectionAttendance(sectionId, dateStr, true));
        setShowUnsavedPrompt(true);
        return;
      }

      setIsLoadingRoster(true);
      setSheetError(null);
      setStudentRows([]);
      setOriginalStudentRows([]);
      setExistingSheet(null);
      setIsDirty(false);

      try {
        // Step 1: Check if an Attendance Sheet already exists for this section & date
        const sheetListRes = await api.attendance.getSheets({
          section: sectionId,
          attendance_date: dateStr,
          page_size: 5,
        });

        const sheets = extractPaginatedList(sheetListRes);

        if (sheets.length > 0) {
          // Sheet exists for this day -> Fetch full sheet details (with records)
          const sheetId = sheets[0].id;
          const fullSheetRes = await api.attendance.getSheetById(sheetId);
          const sheetData = fullSheetRes.data || fullSheetRes;

          setExistingSheet(sheetData);
          setSheetMode("view_edit");

          const records = Array.isArray(sheetData.records)
            ? sheetData.records
            : [];

          // Map existing records to local state
          const mappedRows = records.map((rec) => {
            const arrTime = rec.arrival_time ? rec.arrival_time.slice(0, 5) : "08:00";
            return {
              id: rec.id, // Record UUID
              enrollment: rec.enrollment,
              student: rec.student || rec.student_id,
              student_display: rec.student_display || "طالب",
              status: rec.status || "present",
              status_display: rec.status_display || (rec.status === "absent" ? "غائب" : "حاضر"),
              arrival_time: arrTime,
              arrival_method: rec.arrival_method || "guardian",
              arrival_method_display: rec.arrival_method_display || "ولي الأمر",
              departure_time: rec.departure_time ? rec.departure_time.slice(0, 5) : "",
              departure_method: rec.departure_method || "",
              departure_method_display: rec.departure_method_display || "",
              usual_arrival_method: rec.usual_arrival_method || rec.arrival_method || "guardian",
              usual_departure_method: rec.usual_departure_method || "guardian",
              absence_type: rec.absence_type || (rec.status === "absent" ? "unexcused" : ""),
              absence_type_display: rec.absence_type_display || "",
              absence_reason: rec.absence_reason || "",
              absence_reason_source: rec.absence_reason_source || "",
              absence_reason_source_display: rec.absence_reason_source_display || "",
              notes: rec.notes || "",
              is_modified: false,
            };
          });

          setStudentRows(mappedRows);
          setOriginalStudentRows(JSON.parse(JSON.stringify(mappedRows)));
        } else {
          // No sheet exists for this day -> Fetch Attendance Roster
          setExistingSheet(null);
          setSheetMode("create");

          const rosterRes = await api.attendance.getRoster(sectionId);
          const rosterList = Array.isArray(rosterRes.data)
            ? rosterRes.data
            : Array.isArray(rosterRes)
            ? rosterRes
            : [];

          // Initialize local state for each student
          // Rule: All students present by default, arrival_time 08:00, arrival_method = usual_arrival_method
          const mappedRoster = rosterList.map((stu) => {
            const usualArrival = stu.usual_arrival_method || "guardian";
            const usualDeparture = stu.usual_departure_method || "guardian";
            return {
              enrollment: stu.enrollment,
              student: stu.student,
              student_display: stu.student_display || "طالب",
              status: "present",
              status_display: "حاضر",
              arrival_time: defaultArrivalTime,
              arrival_method: usualArrival,
              arrival_method_display: stu.usual_arrival_method_display || "ولي الأمر",
              departure_time: "",
              departure_method: "",
              usual_arrival_method: usualArrival,
              usual_departure_method: usualDeparture,
              absence_type: "",
              absence_reason: "",
              absence_reason_source: "",
              notes: "",
              is_custom_time: false,
              is_modified: false,
            };
          });

          setStudentRows(mappedRoster);
          setOriginalStudentRows(JSON.parse(JSON.stringify(mappedRoster)));
        }
      } catch (err) {
        console.error("Error fetching attendance data:", err);
        const errMsg = parseApiError(
          err,
          "تعذر جلب بيانات الحضور أو قائمة طلاب الشعبة."
        );
        setSheetError(errMsg);
      } finally {
        setIsLoadingRoster(false);
      }
    },
    [defaultArrivalTime, isDirty]
  );

  // Trigger load when section or date changes
  useEffect(() => {
    if (activeTab === "daily" && selectedSection) {
      loadSectionAttendance(selectedSection, selectedDate);
    }
  }, [selectedSection, selectedDate, activeTab]);

  // =========================================================================
  // 3. Local State Mutators (Quick Actions & Exceptions)
  // =========================================================================

  // Toggle student status [present <-> absent]
  const handleToggleStatus = (index, targetStatus) => {
    setStudentRows((prev) => {
      const next = [...prev];
      const stu = { ...next[index] };

      if (targetStatus === "present") {
        stu.status = "present";
        stu.status_display = "حاضر";
        stu.arrival_time = stu.arrival_time || defaultArrivalTime;
        stu.arrival_method = stu.arrival_method || stu.usual_arrival_method || "guardian";
        // Clear absence fields
        stu.absence_type = "";
        stu.absence_reason = "";
        stu.absence_reason_source = "";
      } else {
        stu.status = "absent";
        stu.status_display = "غائب";
        stu.absence_type = stu.absence_type || "unexcused";
        // Clear arrival fields visually
        stu.arrival_time = "";
        stu.arrival_method = "";
      }

      stu.is_modified = true;
      next[index] = stu;
      return next;
    });
    setIsDirty(true);
  };

  // Update specific student field
  const handleStudentFieldChange = (index, field, value) => {
    setStudentRows((prev) => {
      const next = [...prev];
      const stu = { ...next[index] };

      stu[field] = value;

      if (field === "arrival_time") {
        stu.is_custom_time = true;
      }

      if (field === "absence_type" && value === "unexcused") {
        stu.absence_reason = "";
        stu.absence_reason_source = "";
      }

      stu.is_modified = true;
      next[index] = stu;
      return next;
    });
    setIsDirty(true);
  };

  // Apply default arrival time to all present students who haven't set a custom time
  const handleApplyDefaultArrivalTime = (newTime) => {
    setDefaultArrivalTime(newTime);
    setStudentRows((prev) => {
      return prev.map((stu) => {
        if (stu.status === "present" && !stu.is_custom_time) {
          return {
            ...stu,
            arrival_time: newTime,
            is_modified: true,
          };
        }
        return stu;
      });
    });
    setIsDirty(true);
    toast.info(`تم تطبيق وقت الدخول (${newTime}) على الطلاب الحاضرين.`);
  };

  // Toggle details expansion for a row
  const toggleRowExpansion = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // =========================================================================
  // 4. Live Statistics & Filtered Students Computation
  // =========================================================================
  const stats = useMemo(() => {
    const total = studentRows.length;
    let present = 0;
    let late = 0;
    let absentExcused = 0;
    let absentUnexcused = 0;
    let departed = 0;
    let pendingDeparture = 0;

    const defaultNorm = defaultArrivalTime || "08:00";

    studentRows.forEach((stu) => {
      if (stu.status === "present") {
        present += 1;
        if (stu.arrival_time && stu.arrival_time > defaultNorm) {
          late += 1;
        }
        if (stu.departure_time) {
          departed += 1;
        } else {
          pendingDeparture += 1;
        }
      } else if (stu.status === "absent") {
        if (stu.absence_type === "excused") {
          absentExcused += 1;
        } else {
          absentUnexcused += 1;
        }
      }
    });

    const totalAbsent = absentExcused + absentUnexcused;

    return {
      total,
      present,
      late,
      absentExcused,
      absentUnexcused,
      totalAbsent,
      departed,
      pendingDeparture,
    };
  }, [studentRows, defaultArrivalTime]);

  // Filter students based on search query and status filter
  const filteredStudents = useMemo(() => {
    return studentRows
      .map((stu, originalIndex) => ({ ...stu, originalIndex }))
      .filter((stu) => {
        // Search filter
        if (studentSearch.trim()) {
          const q = studentSearch.trim().toLowerCase();
          const matchName = stu.student_display?.toLowerCase().includes(q);
          const matchNotes = stu.notes?.toLowerCase().includes(q);
          const matchReason = stu.absence_reason?.toLowerCase().includes(q);
          if (!matchName && !matchNotes && !matchReason) return false;
        }

        // Status filter
        if (statusFilter === "present") {
          return stu.status === "present";
        }
        if (statusFilter === "late") {
          return (
            stu.status === "present" &&
            stu.arrival_time &&
            stu.arrival_time > (defaultArrivalTime || "08:00")
          );
        }
        if (statusFilter === "absent_excused") {
          return stu.status === "absent" && stu.absence_type === "excused";
        }
        if (statusFilter === "absent_unexcused") {
          return stu.status === "absent" && stu.absence_type !== "excused";
        }
        if (statusFilter === "departed") {
          return stu.status === "present" && Boolean(stu.departure_time);
        }
        if (statusFilter === "pending_departure") {
          return stu.status === "present" && !stu.departure_time;
        }

        return true;
      });
  }, [studentRows, studentSearch, statusFilter, defaultArrivalTime]);

  // =========================================================================
  // 5. Submit New Attendance Sheet (POST /attendance/sheets/)
  // =========================================================================
  const handleCreateSheet = async () => {
    if (!selectedSection) {
      toast.error("يرجى تحديد الشعبة الدراسية أولاً.");
      return;
    }

    if (studentRows.length === 0) {
      toast.error("لا يوجد طلاب في قائمة الـ Roster لهذه الشعبة.");
      return;
    }

    // Client-side Validation: Check excused absent students have reason and source
    for (let i = 0; i < studentRows.length; i++) {
      const stu = studentRows[i];
      if (stu.status === "absent" && stu.absence_type === "excused") {
        if (!stu.absence_reason?.trim()) {
          toast.error(
            `يرجى كتابة سبب الغياب للطالب (${stu.student_display}) أو تحويله إلى غياب دون عذر.`
          );
          setExpandedRows((prev) => ({ ...prev, [i]: true }));
          return;
        }
        if (!stu.absence_reason_source) {
          toast.error(
            `يرجى تحديد مصدر سبب الغياب للطالب (${stu.student_display}).`
          );
          setExpandedRows((prev) => ({ ...prev, [i]: true }));
          return;
        }
      }
    }

    setIsSavingSheet(true);
    setSheetError(null);

    try {
      // Build Clean Payload (Rule: Send all roster students, NO attendance_date, NO morning departure)
      const recordsPayload = studentRows.map((stu) => {
        if (stu.status === "absent") {
          const item = {
            enrollment: stu.enrollment,
            status: "absent",
            absence_type: stu.absence_type || "unexcused",
            notes: stu.notes?.trim() || "",
          };
          if (stu.absence_type === "excused") {
            item.absence_reason = stu.absence_reason.trim();
            item.absence_reason_source = stu.absence_reason_source;
          }
          return item;
        }

        // Present student
        return {
          enrollment: stu.enrollment,
          status: "present",
          arrival_time: formatTimeToHHMMSS(stu.arrival_time || defaultArrivalTime),
          arrival_method: stu.arrival_method || stu.usual_arrival_method || "guardian",
          notes: stu.notes?.trim() || "",
        };
      });

      const payload = {
        section: selectedSection,
        records: recordsPayload,
      };

      const res = await api.attendance.createSheet(payload);
      toast.success(res.message || "تم حفظ كشف الحضور بنجاح.");
      setIsDirty(false);

      // Reload section attendance to switch directly to View/Edit mode
      await loadSectionAttendance(selectedSection, selectedDate, true);
    } catch (err) {
      console.error("Error creating attendance sheet:", err);
      const code = getApiErrorCode(err);

      if (code === "ATTENDANCE_SHEET_ALREADY_EXISTS") {
        toast.warning("تم أخذ حضور هذه الشعبة مسبقاً لهذا اليوم. جاري فتح الكشف المسجل...");
        await loadSectionAttendance(selectedSection, selectedDate, true);
      } else if (code === "ATTENDANCE_NOT_ALLOWED_ON_WEEKEND") {
        toast.error("لا يمكن إنشاء كشف الحضور في أيام العطلة الأسبوعية (الجمعة والسبت).");
        setSheetError("النظام يمنع رصد الحضور يومي الجمعة والسبت.");
      } else {
        const parsed = parseApiError(err, "تعذر حفظ كشف الحضور.");
        setSheetError(parsed);
        toast.error(parsed);
      }
    } finally {
      setIsSavingSheet(false);
    }
  };

  // =========================================================================
  // 6. Bulk Update for Existing Sheet (POST /attendance/sheets/{id}/bulk-update/)
  // =========================================================================
  const handleBulkUpdateSheet = async () => {
    if (!existingSheet?.id) return;

    // Identify modified records
    const modifiedRecords = [];
    for (let i = 0; i < studentRows.length; i++) {
      const current = studentRows[i];
      const original = originalStudentRows[i];

      if (!current.id) continue;

      const isStatusChanged = current.status !== original?.status;
      const isArrTimeChanged = current.arrival_time !== original?.arrival_time;
      const isArrMethodChanged = current.arrival_method !== original?.arrival_method;
      const isDepTimeChanged = current.departure_time !== original?.departure_time;
      const isDepMethodChanged = current.departure_method !== original?.departure_method;
      const isAbsTypeChanged = current.absence_type !== original?.absence_type;
      const isAbsReasonChanged = current.absence_reason !== original?.absence_reason;
      const isAbsSourceChanged = current.absence_reason_source !== original?.absence_reason_source;
      const isNotesChanged = current.notes !== original?.notes;

      if (
        isStatusChanged ||
        isArrTimeChanged ||
        isArrMethodChanged ||
        isDepTimeChanged ||
        isDepMethodChanged ||
        isAbsTypeChanged ||
        isAbsReasonChanged ||
        isAbsSourceChanged ||
        isNotesChanged ||
        current.is_modified
      ) {
        if (current.status === "absent") {
          const item = {
            id: current.id,
            status: "absent",
            absence_type: current.absence_type || "unexcused",
            notes: current.notes || "",
          };
          if (current.absence_type === "excused") {
            if (!current.absence_reason?.trim()) {
              toast.error(`يرجى تحديد سبب الغياب للطالب (${current.student_display}).`);
              return;
            }
            if (!current.absence_reason_source) {
              toast.error(`يرجى تحديد مصدر سبب الغياب للطالب (${current.student_display}).`);
              return;
            }
            item.absence_reason = current.absence_reason.trim();
            item.absence_reason_source = current.absence_reason_source;
          }
          modifiedRecords.push(item);
        } else {
          // Present
          const item = {
            id: current.id,
            status: "present",
            arrival_time: formatTimeToHHMMSS(current.arrival_time || defaultArrivalTime),
            arrival_method: current.arrival_method || "guardian",
            notes: current.notes || "",
          };
          if (current.departure_time) {
            item.departure_time = formatTimeToHHMMSS(current.departure_time);
            item.departure_method = current.departure_method || current.usual_departure_method || "guardian";
          }
          modifiedRecords.push(item);
        }
      }
    }

    if (modifiedRecords.length === 0) {
      toast.info("لم يتم إجراء أي تعديلات تستوجب الحفظ.");
      return;
    }

    setIsSavingSheet(true);
    setSheetError(null);

    try {
      const res = await api.attendance.bulkUpdateSheet(existingSheet.id, {
        records: modifiedRecords,
      });

      toast.success(res.message || "تم حفظ التعديلات الجماعية بنجاح.");
      setIsDirty(false);

      // Refresh sheet data
      await loadSectionAttendance(selectedSection, selectedDate, true);
    } catch (err) {
      console.error("Error performing bulk update:", err);
      const parsed = parseApiError(err, "تعذر حفظ التعديلات الجماعية.");
      setSheetError(parsed);
      toast.error(parsed);
    } finally {
      setIsSavingSheet(false);
    }
  };

  // =========================================================================
  // 7. Individual Student Save (PATCH /attendance/records/{id}/)
  // =========================================================================
  const handleSaveSingleRecord = async (index) => {
    const stu = studentRows[index];
    if (!stu?.id) {
      toast.error("لا يمكن تعديل سجل فردي قبل إنشاء الكشف.");
      return;
    }

    setSavingRecordId(stu.id);

    try {
      let payload = {};

      if (stu.status === "absent") {
        payload = {
          status: "absent",
          absence_type: stu.absence_type || "unexcused",
          notes: stu.notes?.trim() || "",
        };
        if (stu.absence_type === "excused") {
          if (!stu.absence_reason?.trim() || !stu.absence_reason_source) {
            toast.error("يرجى تحديد سبب ومصدر الغياب بعذر.");
            setSavingRecordId(null);
            return;
          }
          payload.absence_reason = stu.absence_reason.trim();
          payload.absence_reason_source = stu.absence_reason_source;
        }
      } else {
        payload = {
          status: "present",
          arrival_time: formatTimeToHHMMSS(stu.arrival_time || defaultArrivalTime),
          arrival_method: stu.arrival_method || stu.usual_arrival_method || "guardian",
          notes: stu.notes?.trim() || "",
        };
        if (stu.departure_time) {
          payload.departure_time = formatTimeToHHMMSS(stu.departure_time);
          payload.departure_method = stu.departure_method || stu.usual_departure_method || "guardian";
        }
      }

      await api.attendance.updateRecord(stu.id, payload);
      toast.success(`تم تحديث سجل الطالب (${stu.student_display}) بنجاح.`);

      // Update original baseline for this student
      setOriginalStudentRows((prev) => {
        const next = [...prev];
        next[index] = JSON.parse(JSON.stringify(studentRows[index]));
        return next;
      });

      // Mark row as unmodified
      setStudentRows((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], is_modified: false };
        return next;
      });
    } catch (err) {
      console.error("Error updating record:", err);
      const parsed = parseApiError(err, "تعذر تحديث سجل الطالب.");
      toast.error(parsed);
    } finally {
      setSavingRecordId(null);
    }
  };

  // =========================================================================
  // 8. Departure Flow Modal & Actions
  // =========================================================================
  const handleOpenDepartureModal = () => {
    if (!existingSheet?.id) {
      toast.error("يرجى حفظ كشف الحضور الصباحي أولاً لتسجيل المغادرة.");
      return;
    }

    // Gather present students who have not departed yet
    const pendingStudents = studentRows
      .filter((s) => s.status === "present" && !s.departure_time)
      .map((s) => ({
        id: s.id,
        enrollment: s.enrollment,
        student_display: s.student_display,
        usual_departure_method: s.usual_departure_method || "guardian",
        departure_method: s.usual_departure_method || "guardian",
        selected: true,
      }));

    if (pendingStudents.length === 0) {
      toast.info("تم تسجيل مغادرة جميع الطلاب الحاضرين مسبقاً.");
      return;
    }

    setDepartureStudentStates(pendingStudents);
    setDepartureTime("13:30");
    setDepartureError(null);
    setIsDepartureModalOpen(true);
  };

  const handleSubmitDeparture = async () => {
    if (!existingSheet?.id) return;
    setIsSubmittingDeparture(true);
    setDepartureError(null);

    const formattedTime = formatTimeToHHMMSS(departureTime);

    try {
      if (departureMode === "uniform") {
        // Quick Action: Normal Departure endpoint applies uniform method to all present with departure_time=null
        const payload = {
          departure_time: formattedTime,
          departure_method: uniformDepartureMethod,
        };

        const res = await api.attendance.normalDeparture(existingSheet.id, payload);
        toast.success(res.message || "تم تسجيل الانصراف الموحد لجميع الطلاب بنجاح.");
      } else {
        // Individual Methods: Bulk Update with each student's usual/selected departure_method
        const recordsToUpdate = departureStudentStates
          .filter((s) => s.selected)
          .map((s) => ({
            id: s.id,
            departure_time: formattedTime,
            departure_method: s.departure_method || s.usual_departure_method || "guardian",
          }));

        if (recordsToUpdate.length === 0) {
          toast.error("يرجى تحديد طالب واحد على الأقل لتسجيل انصرافه.");
          setIsSubmittingDeparture(false);
          return;
        }

        const res = await api.attendance.bulkUpdateSheet(existingSheet.id, {
          records: recordsToUpdate,
        });
        toast.success(res.message || "تم تسجيل مغادرة الطلاب وفق الطرائق المحددة بنجاح.");
      }

      setIsDepartureModalOpen(false);
      setIsDirty(false);

      // Refresh sheet data
      await loadSectionAttendance(selectedSection, selectedDate, true);
    } catch (err) {
      console.error("Error submitting departure:", err);
      const parsed = parseApiError(err, "تعذر تسجيل مغادرة الطلاب.");
      setDepartureError(parsed);
      toast.error(parsed);
    } finally {
      setIsSubmittingDeparture(false);
    }
  };

  // =========================================================================
  // 9. History Tab: Load Previous Sheets & Filter Archive
  // =========================================================================
  const fetchHistorySheets = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const params = {
        page: historyPage,
        page_size: historyPageSize,
        ordering: "-attendance_date",
      };

      if (historyFilters.academic_year) params.academic_year = historyFilters.academic_year;
      if (historyFilters.grade_level) params.grade_level = historyFilters.grade_level;
      if (historyFilters.section) params.section = historyFilters.section;
      if (historyFilters.attendance_date) params.attendance_date = historyFilters.attendance_date;

      const res = await api.attendance.getSheets(params);
      const list = extractPaginatedList(res);

      setHistorySheets(list);
      setHistoryTotalCount(list.count || list.length);
    } catch (err) {
      console.error("Error fetching history sheets:", err);
      const parsed = parseApiError(err, "تعذر جلب أرشيف كشوف الحضور.");
      setHistoryError(parsed);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [historyPage, historyPageSize, historyFilters]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistorySheets();
    }
  }, [activeTab, fetchHistorySheets]);

  // Open a sheet from history into the active view
  const handleOpenSheetFromHistory = (sheet) => {
    if (sheet.section) {
      // Find section grade level to align dropdowns
      const secObj = sections.find((s) => s.id === sheet.section);
      if (secObj) {
        setSelectedGradeLevel(secObj.grade_level || secObj.grade_level_id || "");
      }
      setSelectedSection(sheet.section);
    }
    if (sheet.attendance_date) {
      setSelectedDate(sheet.attendance_date);
    }
    setActiveTab("daily");
  };

  // =========================================================================
  // 10. Records Search Tab: Search Individual Records
  // =========================================================================
  const fetchRecordsList = useCallback(async () => {
    setIsRecordsLoading(true);
    setRecordsError(null);

    try {
      const params = {
        page: recordsPage,
        page_size: 20,
      };

      if (recordsSearchQuery.trim()) params.search = recordsSearchQuery.trim();
      if (recordsFilterStatus) params.status = recordsFilterStatus;
      if (recordsFilterDate) params.attendance_date = recordsFilterDate;
      if (selectedSection) params.section = selectedSection;

      const res = await api.attendance.getRecords(params);
      const list = extractPaginatedList(res);

      setRecordsList(list);
      setRecordsTotalCount(list.count || list.length);
    } catch (err) {
      console.error("Error fetching records:", err);
      const parsed = parseApiError(err, "تعذر البحث في سجلات الحضور.");
      setRecordsError(parsed);
    } finally {
      setIsRecordsLoading(false);
    }
  }, [recordsPage, recordsSearchQuery, recordsFilterStatus, recordsFilterDate, selectedSection]);

  useEffect(() => {
    if (activeTab === "records") {
      fetchRecordsList();
    }
  }, [activeTab, fetchRecordsList]);

  // =========================================================================
  // Permission Barrier
  // =========================================================================
  if (!hasAccess) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm text-right" dir="rtl">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          غير مصرح بالدخول (403 Forbidden)
        </h3>
        <p className="text-sm text-slate-500 max-w-md mb-4">
          عذراً، صلاحية أخذ الحضور والغياب اليومي متاحة فقط لإدارة المدرسة والموجهين التربويين.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right pb-12" dir="rtl">
      {/* =================================================================== */}
      {/* 1. Header & Navigation Tabs */}
      {/* =================================================================== */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                الحضور والغياب اليومي (Attendance)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                رصد حضور وانصراف شُعب المدرسة بسرعة ودقة متناهية.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => {
              if (isDirty) {
                setPendingAction(() => () => setActiveTab("daily"));
                setShowUnsavedPrompt(true);
              } else {
                setActiveTab("daily");
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "daily"
                ? "bg-white text-teal-800 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck className="w-4 h-4 text-teal-600" />
            <span>رصد حضور الشعبة</span>
          </button>

          <button
            onClick={() => {
              if (isDirty) {
                setPendingAction(() => () => setActiveTab("history"));
                setShowUnsavedPrompt(true);
              } else {
                setActiveTab("history");
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "history"
                ? "bg-white text-teal-800 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarDays className="w-4 h-4 text-teal-600" />
            <span>أرشيف الكشوف</span>
          </button>

          <button
            onClick={() => {
              if (isDirty) {
                setPendingAction(() => () => setActiveTab("records"));
                setShowUnsavedPrompt(true);
              } else {
                setActiveTab("records");
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "records"
                ? "bg-white text-teal-800 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Search className="w-4 h-4 text-teal-600" />
            <span>بحث في السجلات</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: DAILY SECTION ATTENDANCE (CORE FLOW) */}
      {/* =================================================================== */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          {/* Top Cascade Selectors & Date Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Academic Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  السنة الدراسية
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                >
                  <option value="">-- اختر السنة الدراسية --</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name || y.year} {y.is_active ? "(الحالية)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  الصف الدراسي
                </label>
                <select
                  value={selectedGradeLevel}
                  onChange={(e) => {
                    setSelectedGradeLevel(e.target.value);
                    setSelectedSection("");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                >
                  <option value="">-- كل الصفوف --</option>
                  {gradeLevels.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>الشعبة الدراسية</span>
                  <span className="text-[10px] text-teal-600 font-bold">
                    مطلوب للرصد *
                  </span>
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    const secId = e.target.value;
                    if (isDirty) {
                      setPendingAction(() => () => setSelectedSection(secId));
                      setShowUnsavedPrompt(true);
                    } else {
                      setSelectedSection(secId);
                    }
                  }}
                  className="w-full bg-teal-50/50 border border-teal-200 rounded-xl px-3 py-2 text-xs font-bold text-teal-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition-all shadow-sm"
                >
                  <option value="">-- حدد الشعبة لرصد الحضور --</option>
                  {availableSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.grade_level_name ? `(${s.grade_level_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Attendance Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>تاريخ الحضور</span>
                  {!isTodaySelected && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDate(new Date().toISOString().split("T")[0])
                      }
                      className="text-[10px] text-teal-600 font-bold hover:underline"
                    >
                      العودة لليوم
                    </button>
                  )}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const dt = e.target.value;
                    if (isDirty) {
                      setPendingAction(() => () => setSelectedDate(dt));
                      setShowUnsavedPrompt(true);
                    } else {
                      setSelectedDate(dt);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                />
              </div>
            </div>

            {/* Weekend Warning Alert */}
            {isSelectedDateWeekend && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                  <p className="font-bold mb-0.5">
                    يوم ({formatArabicDate(selectedDate)}) هو عطلة رسمية (الجمعة / السبت)
                  </p>
                  <p className="text-amber-700">
                    النظام يمنع إنشاء كشوف حضور جديدة في أيام العطلة الأسبوعية (Backend Rule). يمكنك استعراض الكشوف السابقة فقط.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section Not Selected State */}
          {!selectedSection && (
            <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-inner">
                <Building className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                اختر شعبة دراسية لبدء رصد الحضور
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                حدد الصف والشعبة من القائمة أعلاه لعرض قائمة الطلاب وأخذ الحضور فوراً، أو لمراجعة كشف مسجل مسبقاً.
              </p>
            </div>
          )}

          {/* Section Selected & Loading Skeleton */}
          {selectedSection && isLoadingRoster && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between animate-pulse">
                <div className="h-6 w-48 bg-slate-200 rounded-md"></div>
                <div className="h-8 w-32 bg-slate-200 rounded-xl"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"></div>
                ))}
              </div>
              <div className="space-y-2 pt-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse border border-slate-100"></div>
                ))}
              </div>
            </div>
          )}

          {/* Section Selected & Data Loaded */}
          {selectedSection && !isLoadingRoster && (
            <div className="space-y-5">
              {/* Context Banner: Mode (Create vs View/Edit) & Information */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-12 rounded-full ${
                      sheetMode === "view_edit" ? "bg-teal-500" : "bg-emerald-500"
                    }`}
                  ></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {selectedSectionObj?.name || "الشعبة المحددة"}
                        {selectedGradeLevelObj?.name ? ` - ${selectedGradeLevelObj.name}` : ""}
                      </span>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                          sheetMode === "view_edit"
                            ? "bg-teal-100 text-teal-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {sheetMode === "view_edit"
                          ? "كشف مسجل (عرض وتعديل)"
                          : "كشف جديد (جاهز للرصد)"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatArabicDate(selectedDate)}
                      {existingSheet?.created_by_display && (
                        <span className="mr-2 text-slate-400">
                          (سُجل بواسطة: {existingSheet.created_by_display})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Mode Actions: Departure / Refresh / Switch */}
                <div className="flex items-center gap-2 flex-wrap">
                  {sheetMode === "view_edit" && hasManageRights && (
                    <Button
                      variant="outline"
                      onClick={handleOpenDepartureModal}
                      className="border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 font-bold shadow-sm"
                    >
                      <LogOut className="w-4 h-4 text-purple-600" />
                      <span>تسجيل المغادرة</span>
                    </Button>
                  )}

                  <button
                    onClick={() => loadSectionAttendance(selectedSection, selectedDate, true)}
                    title="تحديث البيانات"
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Live Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                {/* Total Students */}
                <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm text-right">
                  <span className="text-[11px] font-semibold text-slate-500">
                    إجمالي الطلاب
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-slate-900">
                      {stats.total}
                    </span>
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Present */}
                <div
                  onClick={() => setStatusFilter(statusFilter === "present" ? "all" : "present")}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all text-right ${
                    statusFilter === "present"
                      ? "bg-teal-100 border-teal-300 ring-2 ring-teal-500/20"
                      : "bg-teal-50/70 border-teal-100 hover:bg-teal-50"
                  }`}
                >
                  <span className="text-[11px] font-bold text-teal-800">
                    الحاضرون
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-teal-900">
                      {stats.present}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  </div>
                </div>

                {/* Late */}
                <div
                  onClick={() => setStatusFilter(statusFilter === "late" ? "all" : "late")}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all text-right ${
                    statusFilter === "late"
                      ? "bg-amber-100 border-amber-300 ring-2 ring-amber-500/20"
                      : "bg-amber-50/70 border-amber-100 hover:bg-amber-50"
                  }`}
                >
                  <span className="text-[11px] font-bold text-amber-800">
                    المتأخرون (&gt;{defaultArrivalTime})
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-amber-900">
                      {stats.late}
                    </span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                </div>

                {/* Absent Excused */}
                <div
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === "absent_excused" ? "all" : "absent_excused"
                    )
                  }
                  className={`p-3 rounded-2xl border cursor-pointer transition-all text-right ${
                    statusFilter === "absent_excused"
                      ? "bg-sky-100 border-sky-300 ring-2 ring-sky-500/20"
                      : "bg-sky-50/70 border-sky-100 hover:bg-sky-50"
                  }`}
                >
                  <span className="text-[11px] font-bold text-sky-800">
                    غائب بعذر
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-sky-900">
                      {stats.absentExcused}
                    </span>
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                  </div>
                </div>

                {/* Absent Unexcused */}
                <div
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === "absent_unexcused" ? "all" : "absent_unexcused"
                    )
                  }
                  className={`p-3 rounded-2xl border cursor-pointer transition-all text-right ${
                    statusFilter === "absent_unexcused"
                      ? "bg-rose-100 border-rose-300 ring-2 ring-rose-500/20"
                      : "bg-rose-50/70 border-rose-100 hover:bg-rose-50"
                  }`}
                >
                  <span className="text-[11px] font-bold text-rose-800">
                    غائب دون عذر
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-rose-900">
                      {stats.absentUnexcused}
                    </span>
                    <XCircle className="w-4 h-4 text-rose-600" />
                  </div>
                </div>

                {/* Departed */}
                <div
                  onClick={() =>
                    setStatusFilter(statusFilter === "departed" ? "all" : "departed")
                  }
                  className={`p-3 rounded-2xl border cursor-pointer transition-all text-right ${
                    statusFilter === "departed"
                      ? "bg-purple-100 border-purple-300 ring-2 ring-purple-500/20"
                      : "bg-purple-50/70 border-purple-100 hover:bg-purple-50"
                  }`}
                >
                  <span className="text-[11px] font-bold text-purple-800">
                    تم انصرافهم
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold text-purple-900">
                      {stats.departed}
                    </span>
                    <LogOut className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Toolbar: Default Time Settings, Search & Quick Filter Pills */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3.5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Default Arrival Time Setting */}
                  <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
                    <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                      وقت الدخول الافتراضي:
                    </span>
                    <input
                      type="time"
                      value={defaultArrivalTime}
                      onChange={(e) => handleApplyDefaultArrivalTime(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      (يطبق تلقائياً على كل حاضر)
                    </span>
                  </div>

                  {/* Search inside students */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="بحث عن طالب بالاسم أو الملاحظة..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                    />
                    {studentSearch && (
                      <button
                        onClick={() => setStudentSearch("")}
                        className="text-xs text-slate-400 hover:text-slate-600 absolute left-3 top-2.5"
                      >
                        مسح
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-slate-400 font-medium text-[11px] ml-1 shrink-0">
                    تصفية:
                  </span>
                  {[
                    { id: "all", label: "الكل", count: stats.total },
                    { id: "present", label: "الحاضرون", count: stats.present },
                    { id: "late", label: "المتأخرون", count: stats.late },
                    { id: "absent_excused", label: "غائب بعذر", count: stats.absentExcused },
                    { id: "absent_unexcused", label: "غائب دون عذر", count: stats.absentUnexcused },
                    { id: "departed", label: "انصرفوا", count: stats.departed },
                    { id: "pending_departure", label: "بانتظار الانصراف", count: stats.pendingDeparture },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setStatusFilter(filter.id)}
                      className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        statusFilter === filter.id
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                      }`}
                    >
                      <span>{filter.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          statusFilter === filter.id
                            ? "bg-white/20 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {filter.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Alert if any */}
              {sheetError && (
                <Alert
                  type="error"
                  message={sheetError}
                  onClose={() => setSheetError(null)}
                />
              )}

              {/* ============================================================= */}
              {/* SPEEDY ENTRY STUDENT ROWS TABLE / LIST */}
              {/* ============================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    لا يوجد طلاب يطابقون خيارات البحث أو التصفية الحالية.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredStudents.map((stu) => {
                      const idx = stu.originalIndex;
                      const isPresent = stu.status === "present";
                      const isLate =
                        isPresent &&
                        stu.arrival_time &&
                        stu.arrival_time > (defaultArrivalTime || "08:00");
                      const isExcused = !isPresent && stu.absence_type === "excused";
                      const isExpanded = Boolean(expandedRows[idx]);
                      const isSavingThis = savingRecordId === stu.id;

                      return (
                        <div
                          key={stu.enrollment || stu.id || idx}
                          className={`p-3.5 sm:p-4 transition-colors ${
                            !isPresent
                              ? isExcused
                                ? "bg-sky-50/30 hover:bg-sky-50/50"
                                : "bg-rose-50/30 hover:bg-rose-50/50"
                              : isLate
                              ? "bg-amber-50/20 hover:bg-amber-50/40"
                              : "hover:bg-slate-50/70"
                          } ${stu.is_modified ? "border-r-4 border-r-teal-500" : ""}`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            {/* Left Info: Name & Quick Badges */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                                  isPresent
                                    ? isLate
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-teal-100 text-teal-800"
                                    : isExcused
                                    ? "bg-sky-100 text-sky-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {stu.student_display?.slice(0, 1) || "ط"}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {stu.student_display}
                                  </h4>
                                  {isLate && (
                                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      متأخر ({stu.arrival_time})
                                    </span>
                                  )}
                                  {stu.departure_time && (
                                    <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <LogOut className="w-3 h-3" />
                                      انصرف: {stu.departure_time}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>
                                    الوصول المعتاد:{" "}
                                    {stu.usual_arrival_method_display ||
                                      ARRIVAL_METHODS.find(
                                        (m) => m.value === stu.usual_arrival_method
                                      )?.label ||
                                      "ولي الأمر"}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    المغادرة المعتادة:{" "}
                                    {DEPARTURE_METHODS.find(
                                      (m) => m.value === stu.usual_departure_method
                                    )?.label || "ولي الأمر"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Center & Right: Speed Controls */}
                            <div className="flex flex-wrap items-center gap-2.5">
                              {/* 1-Click Status Switcher [حاضر / غائب] */}
                              <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(idx, "present")}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    isPresent
                                      ? "bg-teal-600 text-white shadow-sm"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>حاضر</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(idx, "absent")}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    !isPresent
                                      ? "bg-rose-600 text-white shadow-sm"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>غائب</span>
                                </button>
                              </div>

                              {/* Present Student Controls: Arrival Time + Method */}
                              {isPresent && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Arrival Time */}
                                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <input
                                      type="time"
                                      value={stu.arrival_time || defaultArrivalTime}
                                      onChange={(e) =>
                                        handleStudentFieldChange(
                                          idx,
                                          "arrival_time",
                                          e.target.value
                                        )
                                      }
                                      className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none w-18"
                                    />
                                  </div>

                                  {/* Arrival Method */}
                                  <select
                                    value={stu.arrival_method || stu.usual_arrival_method || "guardian"}
                                    onChange={(e) =>
                                      handleStudentFieldChange(
                                        idx,
                                        "arrival_method",
                                        e.target.value
                                      )
                                    }
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                  >
                                    {ARRIVAL_METHODS.map((m) => (
                                      <option key={m.value} value={m.value}>
                                        {m.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Absent Student Controls: Type Switcher [بعذر / دون عذر] */}
                              {!isPresent && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStudentFieldChange(
                                          idx,
                                          "absence_type",
                                          "unexcused"
                                        )
                                      }
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                        stu.absence_type === "unexcused"
                                          ? "bg-rose-500 text-white shadow-sm"
                                          : "text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      دون عذر
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleStudentFieldChange(
                                          idx,
                                          "absence_type",
                                          "excused"
                                        );
                                        // Auto-expand row to prompt reason
                                        setExpandedRows((prev) => ({
                                          ...prev,
                                          [idx]: true,
                                        }));
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                        stu.absence_type === "excused"
                                          ? "bg-sky-600 text-white shadow-sm"
                                          : "text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      بعذر
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Details / Notes Expand Button */}
                              <button
                                type="button"
                                onClick={() => toggleRowExpansion(idx)}
                                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                                  isExpanded || stu.notes || (isExcused && !stu.absence_reason)
                                    ? "border-teal-300 bg-teal-50 text-teal-800 font-bold"
                                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                }`}
                                title="تفاصيل إضافية / ملاحظات"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="text-[11px] hidden sm:inline">
                                  {isExpanded ? "إخفاء التفاصيل" : "تفاصيل"}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Individual Save Button (in View/Edit mode) */}
                              {sheetMode === "view_edit" && hasManageRights && stu.is_modified && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveSingleRecord(idx)}
                                  disabled={isSavingThis}
                                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1 shrink-0"
                                >
                                  {isSavingThis ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                  <span>حفظ</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* =================================================== */}
                          {/* EXPANDABLE DETAILS DRAWER (Absence Reason & Notes) */}
                          {/* =================================================== */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
                              {/* If Excused Absent: Reason + Reason Source (Required by Backend) */}
                              {isExcused && (
                                <div className="space-y-2 bg-sky-50/60 p-3 rounded-xl border border-sky-100">
                                  <div className="flex items-center justify-between">
                                    <label className="font-bold text-sky-900 flex items-center gap-1">
                                      <span>سبب الغياب بعذر</span>
                                      <span className="text-rose-500">*</span>
                                    </label>
                                    <span className="text-[10px] text-sky-700 font-medium">
                                      مطلوب بالخادم
                                    </span>
                                  </div>

                                  <input
                                    type="text"
                                    placeholder="اكتب سبب الغياب (مثلاً: مرض، ظرف عائلي، موعد طبي...)"
                                    value={stu.absence_reason || ""}
                                    onChange={(e) =>
                                      handleStudentFieldChange(
                                        idx,
                                        "absence_reason",
                                        e.target.value
                                      )
                                    }
                                    className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                                  />

                                  {/* Quick suggestion chips */}
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {COMMON_ABSENCE_REASONS.map((r) => (
                                      <button
                                        key={r}
                                        type="button"
                                        onClick={() =>
                                          handleStudentFieldChange(
                                            idx,
                                            "absence_reason",
                                            r
                                          )
                                        }
                                        className="text-[10px] bg-white border border-sky-200 hover:bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md transition-colors"
                                      >
                                        + {r}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Source Selector */}
                                  <div className="pt-1">
                                    <label className="block text-[11px] font-bold text-sky-900 mb-1">
                                      مصدر سبب الغياب <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                      value={stu.absence_reason_source || ""}
                                      onChange={(e) =>
                                        handleStudentFieldChange(
                                          idx,
                                          "absence_reason_source",
                                          e.target.value
                                        )
                                      }
                                      className="w-full bg-white border border-sky-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                                    >
                                      <option value="">-- حدد مصدر السبب --</option>
                                      {ABSENCE_REASON_SOURCES.map((s) => (
                                        <option key={s.value} value={s.value}>
                                          {s.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}

                              {/* Student Notes */}
                              <div className="space-y-1.5">
                                <label className="block font-bold text-slate-700">
                                  ملاحظات خاصة بالسجل
                                </label>
                                <textarea
                                  rows={isExcused ? 4 : 2}
                                  placeholder="أية ملاحظات إدارية أو تربوية حول هذا الطالب اليوم..."
                                  value={stu.notes || ""}
                                  onChange={(e) =>
                                    handleStudentFieldChange(
                                      idx,
                                      "notes",
                                      e.target.value
                                    )
                                  }
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all resize-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ============================================================= */}
              {/* STICKY BOTTOM SAVE & ACTION BAR */}
              {/* ============================================================= */}
              {hasManageRights && (
                <div className="sticky bottom-4 z-20 bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold">
                        {sheetMode === "create"
                          ? "جاهز لحفظ كشف الحضور"
                          : isDirty
                          ? "لديك تعديلات غير محفوظة"
                          : "كشف الحضور محدث"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {stats.present} حاضر • {stats.late} متأخر • {stats.totalAbsent} غائب
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    {sheetMode === "create" ? (
                      <Button
                        onClick={handleCreateSheet}
                        disabled={isSavingSheet || isSelectedDateWeekend}
                        className="w-full sm:w-auto bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        {isSavingSheet ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>جارٍ حفظ كشف الحضور...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>حفظ كشف الحضور للشعبة</span>
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          onClick={handleOpenDepartureModal}
                          className="border-purple-400 text-purple-300 hover:bg-purple-900/40 text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 font-bold"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>تسجيل المغادرة</span>
                        </Button>

                        <Button
                          onClick={handleBulkUpdateSheet}
                          disabled={isSavingSheet || !isDirty}
                          className={`text-xs py-2.5 px-5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                            isDirty
                              ? "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg"
                              : "bg-slate-800 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {isSavingSheet ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>جارٍ حفظ التعديلات...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>حفظ التعديلات (Bulk Update)</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: SHEETS ARCHIVE & HISTORY */}
      {/* =================================================================== */}
      {activeTab === "history" && (
        <div className="space-y-5">
          {/* History Filters */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  السنة الدراسية
                </label>
                <select
                  value={historyFilters.academic_year}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      academic_year: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">-- كل السنوات --</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name || y.year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الصف الدراسي
                </label>
                <select
                  value={historyFilters.grade_level}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      grade_level: e.target.value,
                      section: "",
                    }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">-- كل الصفوف --</option>
                  {gradeLevels.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الشعبة
                </label>
                <select
                  value={historyFilters.section}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      section: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">-- كل الشعب --</option>
                  {sections
                    .filter(
                      (s) =>
                        !historyFilters.grade_level ||
                        s.grade_level === historyFilters.grade_level ||
                        s.grade_level_id === historyFilters.grade_level
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  تاريخ محدد
                </label>
                <input
                  type="date"
                  value={historyFilters.attendance_date}
                  onChange={(e) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      attendance_date: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          </div>

          {/* History List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isHistoryLoading ? (
              <div className="p-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500">جاري تحميل أرشيف كشوف الحضور...</p>
              </div>
            ) : historySheets.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">
                لا توجد كشوف حضور مسجلة تطابق الفلاتر المحددة.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historySheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            {sheet.section_display || "الشعبة"}
                          </h4>
                          <span className="text-[11px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                            {sheet.attendance_date}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          سجل بواسطة: {sheet.created_by_display || "المسؤول"} •{" "}
                          {formatArabicDate(sheet.attendance_date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                          {sheet.records?.filter((r) => r.status === "present")?.length ??
                            sheet.present_count ??
                            "–"}{" "}
                          حاضر
                        </span>
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                          {sheet.records?.filter((r) => r.status === "absent")?.length ??
                            sheet.absent_count ??
                            "–"}{" "}
                          غائب
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenSheetFromHistory(sheet)}
                        className="text-xs py-1.5 px-3 rounded-lg border-teal-200 text-teal-800 hover:bg-teal-50 flex items-center gap-1 font-bold"
                      >
                        <span>عرض وتعديل</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: SEARCH ATTENDANCE RECORDS */}
      {/* =================================================================== */}
      {activeTab === "records" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search text */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم الطالب أو السجل..."
                  value={recordsSearchQuery}
                  onChange={(e) => setRecordsSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {/* Status Filter */}
              <select
                value={recordsFilterStatus}
                onChange={(e) => setRecordsFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">-- كل الحالات --</option>
                <option value="present">حاضر (Present)</option>
                <option value="absent">غائب (Absent)</option>
              </select>

              {/* Date */}
              <input
                type="date"
                value={recordsFilterDate}
                onChange={(e) => setRecordsFilterDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isRecordsLoading ? (
              <div className="p-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500">جاري البحث في سجلات الطلاب...</p>
              </div>
            ) : recordsList.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs">
                لا توجد سجلات حضور تطابق معايير البحث.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3.5">الطالب</th>
                      <th className="p-3.5">التاريخ</th>
                      <th className="p-3.5">الشعبة</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5">وقت وطريقة الدخول</th>
                      <th className="p-3.5">وقت وطريقة الخروج</th>
                      <th className="p-3.5">تفاصيل الغياب / ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recordsList.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          {rec.student_display || "طالب"}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {rec.attendance_date || rec.sheet_attendance_date || "–"}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {rec.section_display || "–"}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              rec.status === "present"
                                ? "bg-teal-100 text-teal-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {rec.status_display || (rec.status === "present" ? "حاضر" : "غائب")}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {rec.status === "present" ? (
                            <span>
                              {rec.arrival_time?.slice(0, 5) || "08:00"} (
                              {rec.arrival_method_display || rec.arrival_method || "ولي الأمر"})
                            </span>
                          ) : (
                            "–"
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {rec.departure_time ? (
                            <span>
                              {rec.departure_time?.slice(0, 5)} (
                              {rec.departure_method_display || rec.departure_method || "ولي الأمر"})
                            </span>
                          ) : (
                            <span className="text-slate-400">لم يسجل</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {rec.status === "absent" ? (
                            <div>
                              <span className="font-semibold text-slate-700">
                                {rec.absence_type_display || rec.absence_type || "دون عذر"}
                              </span>
                              {rec.absence_reason && (
                                <span className="mr-1 text-slate-600">
                                  ({rec.absence_reason} - {rec.absence_reason_source_display || rec.absence_reason_source})
                                </span>
                              )}
                            </div>
                          ) : (
                            rec.notes || "–"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* DEPARTURE MODAL */}
      {/* =================================================================== */}
      <Modal
        isOpen={isDepartureModalOpen}
        onClose={() => setIsDepartureModalOpen(false)}
        title="تسجيل مغادرة وانصراف الطلاب"
      >
        <div className="space-y-4 text-right" dir="rtl">
          <p className="text-xs text-slate-500 leading-relaxed">
            تسجيل توقيت خروج الطلاب الحاضرين في نهاية اليوم الدراسي، مع دعم الخروج الموحد أو تطبيق الطرائق الفردية لكل طالب.
          </p>

          {/* Departure Time Input */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              وقت المغادرة / الانصراف
            </label>
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Mode Switcher: Individual vs Uniform */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              طريقة المغادرة المطبقة:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDepartureMode("individual")}
                className={`p-3 rounded-xl border text-right transition-all ${
                  departureMode === "individual"
                    ? "bg-purple-50 border-purple-300 ring-2 ring-purple-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-xs text-purple-950">
                  وفق الطريقة المعتادة لكل طالب
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  تطبيق طريقة الخروج الخاصة بكل طالب المسجلة في قيده (Bulk Update).
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDepartureMode("uniform")}
                className={`p-3 rounded-xl border text-right transition-all ${
                  departureMode === "uniform"
                    ? "bg-purple-50 border-purple-300 ring-2 ring-purple-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-xs text-purple-950">
                  طريقة موحدة لجميع الطلاب
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  تطبيق طريقة واحدة موحدة على كامل الحاضرين (Normal Departure).
                </div>
              </button>
            </div>
          </div>

          {/* If Uniform: Select Method */}
          {departureMode === "uniform" && (
            <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 space-y-1.5">
              <label className="block text-xs font-bold text-purple-900">
                طريقة الانصراف الموحدة
              </label>
              <select
                value={uniformDepartureMethod}
                onChange={(e) => setUniformDepartureMethod(e.target.value)}
                className="w-full bg-white border border-purple-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {DEPARTURE_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* If Individual: Preview list of pending students with dropdowns */}
          {departureMode === "individual" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>الطلاب المشمولون بالانصراف ({departureStudentStates.length})</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  يمكن تعديل طريقة كل طالب أدناه
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-1 bg-slate-50/50">
                {departureStudentStates.map((stu, i) => (
                  <div
                    key={stu.id}
                    className="p-2 flex items-center justify-between gap-2 text-xs bg-white rounded-lg mb-1 last:mb-0"
                  >
                    <span className="font-bold text-slate-900 truncate">
                      {stu.student_display}
                    </span>

                    <select
                      value={stu.departure_method || stu.usual_departure_method || "guardian"}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDepartureStudentStates((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], departure_method: val };
                          return next;
                        });
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none"
                    >
                      {DEPARTURE_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {departureError && (
            <Alert
              type="error"
              message={departureError}
              onClose={() => setDepartureError(null)}
            />
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => setIsDepartureModalOpen(false)}
              disabled={isSubmittingDeparture}
              className="text-xs py-2 px-4 rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmitDeparture}
              disabled={isSubmittingDeparture}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-sm flex items-center gap-1.5"
            >
              {isSubmittingDeparture ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>جارٍ تسجيل المغادرة...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تأكيد تسجيل المغادرة</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =================================================================== */}
      {/* UNSAVED CHANGES WARNING MODAL */}
      {/* =================================================================== */}
      <Modal
        isOpen={showUnsavedPrompt}
        onClose={() => setShowUnsavedPrompt(false)}
        title="تنبيه: تعديلات غير محفوظة"
      >
        <div className="space-y-3 text-right" dir="rtl">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 leading-relaxed">
            لديك تعديلات على كشف الحضور الحالي لم تقم بحفظها بعد. إذا تابعت الآن، فستفقد هذه التعديلات.
          </div>
          <p className="text-xs text-slate-500">
            هل تريد تجاهل التعديلات والمتابعة، أم البقاء وحفظ التعديلات أولاً؟
          </p>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setShowUnsavedPrompt(false)}
              className="text-xs py-2 px-4 rounded-xl"
            >
              البقاء في الكشف
            </Button>
            <Button
              onClick={() => {
                setShowUnsavedPrompt(false);
                setIsDirty(false);
                if (pendingAction) {
                  pendingAction();
                  setPendingAction(null);
                }
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 px-4 rounded-xl"
            >
              تجاهل التعديلات والمتابعة
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
