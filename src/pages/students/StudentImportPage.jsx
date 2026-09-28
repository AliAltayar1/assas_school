import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { studentsService } from "../../api/studentsService";
import { useAuthStore } from "../../store/useAuthStore";
import {
  canAccessStudentImport,
  getHomeRouteForRole,
} from "../../utils/permissionUtils";
import {
  parseApiError,
  extractPaginatedList,
  FIELD_LABELS,
} from "../../utils/errorUtils";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";
import { toast } from "sonner";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Play,
  RotateCcw,
  Clock,
  Check,
  XCircle,
  HelpCircle,
  FileCheck2,
  ListFilter,
  Users,
  ShieldAlert,
  Download,
} from "lucide-react";
import { downloadStudentImportTemplate } from "../../utils/studentExportUtils";

/**
 * Formats row validation errors cleanly for end-user display.
 * Prioritizes `column + detail` as per Backend contract.
 * Never outputs raw error codes as the primary message.
 */
function formatRowErrors(validationErrors) {
  if (!validationErrors) return [];
  if (typeof validationErrors === "string") {
    return [{ text: validationErrors }];
  }
  if (Array.isArray(validationErrors)) {
    return validationErrors.map((err) => {
      if (typeof err === "string") return { text: err };
      if (typeof err === "object" && err !== null) {
        const col = err.column || err.field || "";
        const detail = err.detail || err.message || err.error || "";
        return {
          column: col,
          detail: detail,
          text: col && detail ? `${col}: ${detail}` : detail || col || "خطأ غير محدد",
        };
      }
      return { text: String(err) };
    });
  }
  if (typeof validationErrors === "object") {
    if (validationErrors.column || validationErrors.detail) {
      const col = validationErrors.column || validationErrors.field || "";
      const detail = validationErrors.detail || validationErrors.message || "";
      return [
        {
          column: col,
          detail,
          text: col && detail ? `${col}: ${detail}` : detail || col,
        },
      ];
    }
    return Object.entries(validationErrors).map(([key, val]) => {
      const label = FIELD_LABELS[key] || key;
      const valStr = Array.isArray(val) ? val.join("، ") : String(val);
      return {
        column: label,
        detail: valStr,
        text: `${label}: ${valStr}`,
      };
    });
  }
  return [{ text: String(validationErrors) }];
}

/**
 * Maps row status to localized badge configuration
 */
function getRowStatusBadge(status) {
  switch (status) {
    case "ready":
    case "valid":
      return <Badge variant="success">جاهز للاستيراد</Badge>;
    case "invalid":
      return <Badge variant="danger">غير صالح</Badge>;
    case "review_required":
      return <Badge variant="warning">يحتاج مراجعة</Badge>;
    case "succeeded":
      return <Badge variant="teal">تم الاستيراد بنجاح</Badge>;
    case "failed":
      return <Badge variant="danger">فشل التنفيذ</Badge>;
    default:
      return <Badge variant="default">{status || "غير محدد"}</Badge>;
  }
}

export function StudentImportPage() {
  const { user, requesterRole, permissions } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const basePath = getHomeRouteForRole(user);

  // Authorization check
  const isAllowed = canAccessStudentImport(user, requesterRole, permissions);

  // File selection state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Import Job state
  const [job, setJob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      await downloadStudentImportTemplate({
        fileName: "قالب_استيراد_الطلاب_أساس.xlsx",
      });
      toast.success("تم تحميل قالب استيراد الطلاب بنجاح.");
    } catch (err) {
      toast.error("تعذر تحميل قالب Excel.");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Rows and Errors state
  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState(null);
  const [rowsPage, setRowsPage] = useState(1);
  const [rowsTotal, setRowsTotal] = useState(0);
  const [rowsHasNext, setRowsHasNext] = useState(false);
  const [rowsHasPrev, setRowsHasPrev] = useState(false);
  const [rowStatusFilter, setRowStatusFilter] = useState("");

  // Track if job is in active execution loop
  const isLoopActiveRef = useRef(false);

  // Check URL query param for existing job_id
  const urlJobId = searchParams.get("job_id");

  const loadJob = useCallback(async (jobId) => {
    if (!jobId) return;
    try {
      const res = await studentsService.getImportJob(jobId);
      const data = res?.data || res;
      setJob(data);
    } catch (err) {
      toast.error(parseApiError(err) || "تعذر جلب تفاصيل عملية الاستيراد");
    }
  }, []);

  useEffect(() => {
    if (urlJobId && (!job || job.id !== urlJobId)) {
      loadJob(urlJobId);
    }
  }, [urlJobId, job, loadJob]);

  // Load rows whenever job, page, or status filter changes
  const fetchRows = useCallback(
    async (jobId, page = 1, status = "") => {
      if (!jobId) return;
      setRowsLoading(true);
      setRowsError(null);
      try {
        const params = {
          page,
          page_size: 20,
        };
        if (status) {
          params.status = status;
        }

        const res = await studentsService.getImportRows(jobId, params);
        const paginated = extractPaginatedList(res);
        setRows(paginated);
        setRowsTotal(paginated.count || 0);
        setRowsHasNext(Boolean(paginated.next));
        setRowsHasPrev(Boolean(paginated.previous));
      } catch (err) {
        setRowsError(parseApiError(err) || "تعذر تحميل صفوف ملف الاستيراد");
      } finally {
        setRowsLoading(false);
      }
    },
    []
  );

  // Automatically fetch rows when job status requires row inspection
  useEffect(() => {
    if (job?.id) {
      if (job.status === "validation_failed") {
        fetchRows(job.id, rowsPage, rowStatusFilter);
      } else if (job.status === "completed_with_errors") {
        fetchRows(job.id, rowsPage, rowStatusFilter || "failed");
      }
    }
  }, [job?.id, job?.status, rowsPage, rowStatusFilter, fetchRows]);

  // File selection validation
  const validateAndSetFile = (file) => {
    if (!file) return;
    const validExtensions = [".xlsx", ".xls"];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      toast.error("يرجى اختيار ملف Excel بصيغة .xlsx أو .xls فقط.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("حجم الملف كبير جدًا. الحد الأقصى المسموح به هو 25 ميغابايت.");
      return;
    }

    setSelectedFile(file);
    setProcessingError(null);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Upload and Validate API Request
  const handleUploadAndValidate = async () => {
    if (!selectedFile) {
      toast.error("يرجى اختيار ملف Excel أولًا.");
      return;
    }

    setIsUploading(true);
    setProcessingError(null);
    try {
      const res = await studentsService.uploadStudentImport(selectedFile);
      const jobData = res?.data || res;
      setJob(jobData);
      setSearchParams({ job_id: jobData.id }, { replace: true });

      if (jobData.status === "ready") {
        toast.success(
          res?.message || "تم فحص ملف استيراد الطلاب بنجاح. الملف جاهز للاستيراد!"
        );
      } else if (jobData.status === "validation_failed") {
        toast.warning(
          res?.message ||
            "اكتمل فحص الملف مع وجود أخطاء في بعض الصفوف. يرجى مراجعة الأخطاء لتصحيحها."
        );
      } else {
        toast.info(res?.message || "تم تسجيل ملف الاستيراد بنجاح.");
      }
    } catch (err) {
      const errMsg = parseApiError(err);
      setProcessingError(errMsg);
      toast.error(errMsg || "فشل رفع وفحص ملف استيراد الطلاب.");
    } finally {
      setIsUploading(false);
    }
  };

  // Batch Processing Loop
  const handleStartImport = async () => {
    if (!job?.id || isProcessing || isLoopActiveRef.current) return;
    if (job.status !== "ready") return;

    setIsProcessing(true);
    setProcessingError(null);
    isLoopActiveRef.current = true;

    let currentJob = job;

    try {
      while (isLoopActiveRef.current) {
        const res = await studentsService.processImportBatch(currentJob.id);
        const updatedData = res?.data || res;
        currentJob = updatedData;
        setJob(updatedData);

        const status = updatedData.status;

        // Terminal states check
        if (status === "completed" || status === "completed_with_errors") {
          if (status === "completed") {
            toast.success(
              res?.message || "اكتمل استيراد جميع الطلاب بنجاح تام!"
            );
          } else {
            toast.warning(
              res?.message || "اكتمل الاستيراد مع وجود بعض الأخطاء في بعض الصفوف."
            );
          }
          break;
        }

        // Loop safety: If 0 rows claimed and still not finished, check job status
        if (updatedData.batch && updatedData.batch.claimed_rows === 0) {
          const freshRes = await studentsService.getImportJob(currentJob.id);
          const freshJob = freshRes?.data || freshRes;
          setJob(freshJob);
          if (
            freshJob.status === "completed" ||
            freshJob.status === "completed_with_errors"
          ) {
            break;
          }
          // Safeguard break to avoid continuous 0-claim calls
          break;
        }

        // Pause briefly between batches for smooth UI animation
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    } catch (err) {
      const errMsg = parseApiError(err);
      setProcessingError(errMsg);
      toast.error(errMsg || "حدث خطأ أثناء معالجة دفعة استيراد الطلاب.");
      // Refresh job status for accurate summary
      try {
        const freshRes = await studentsService.getImportJob(currentJob.id);
        setJob(freshRes?.data || freshRes);
      } catch (_) {}
    } finally {
      setIsProcessing(false);
      isLoopActiveRef.current = false;
    }
  };

  // Reset to upload state
  const handleReset = () => {
    setSelectedFile(null);
    setJob(null);
    setRows([]);
    setRowsTotal(0);
    setRowsPage(1);
    setRowStatusFilter("");
    setProcessingError(null);
    setSearchParams({}, { replace: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Security guard for non-allowed roles
  if (!isAllowed) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-4">
        <div className="inline-flex p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          غير مصرح بالوصول إلى هذه الميزة
        </h2>
        <p className="text-sm text-slate-600">
          خاصية استيراد الطلاب من ملف Excel تتطلب توفر صلاحية استيراد الطلاب (students.import_students).
        </p>
        <div>
          <Button onClick={() => navigate(basePath)}>
            العودة إلى الصفحة الرئيسية
          </Button>
        </div>
      </div>
    );
  }

  // Calculate progress metrics
  const totalRows = job?.total_rows || 0;
  const succeededRows = job?.succeeded_rows || 0;
  const failedRows = job?.failed_rows || 0;
  const processedRows = succeededRows + failedRows;
  const progressPercent =
    totalRows > 0 ? Math.min(100, Math.round((processedRows / totalRows) * 100)) : 0;

  // Compute Workflow Stepper Step
  let currentStep = 1;
  if (job) {
    if (
      job.status === "processing" ||
      job.status === "completed" ||
      job.status === "completed_with_errors" ||
      isProcessing
    ) {
      currentStep = 3;
    } else {
      currentStep = 2;
    }
  }

  return (
    <div className="space-y-6 pb-12 dir-rtl text-right" dir="rtl">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <button
              onClick={() => navigate(`${basePath}/students`)}
              className="hover:text-teal-700 transition-colors"
            >
              دليل الطلاب والتسجيل
            </button>
            <span>/</span>
            <span className="text-teal-800 font-bold">استيراد الطلاب من Excel</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-teal-600 shrink-0" />
            <span>استيراد الطلاب عبر ملف Excel</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            رفع ملف Excel وفحصه والتحقق من صحة الصفوف والشعب والبيانات ثم تنفيذ
            الاستيراد على دفعات آمنة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`${basePath}/students`)}
            className="gap-2 shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للطلاب</span>
          </Button>

          {job && !isProcessing && (
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2 shrink-0 text-slate-600 hover:text-slate-900"
              title="بدء عملية استيراد جديدة"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ملف جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stepper Wizard Indicator */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1 */}
          <div
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              currentStep === 1
                ? "bg-teal-50/70 border-teal-300 text-teal-900 font-bold"
                : currentStep > 1
                ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-xs ${
                currentStep === 1
                  ? "bg-teal-600 text-white"
                  : currentStep > 1
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {currentStep > 1 ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <div>
              <div className="text-xs font-bold">1. اختيار ورفع ملف Excel</div>
              <div className="text-[11px] text-slate-500">
                اختيار الملف وتجهيزه للفحص
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              currentStep === 2
                ? job?.status === "validation_failed"
                  ? "bg-rose-50/70 border-rose-300 text-rose-900 font-bold"
                  : "bg-teal-50/70 border-teal-300 text-teal-900 font-bold"
                : currentStep > 2
                ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-xs ${
                currentStep === 2
                  ? job?.status === "validation_failed"
                    ? "bg-rose-600 text-white"
                    : "bg-teal-600 text-white"
                  : currentStep > 2
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {currentStep > 2 ? (
                <Check className="w-4 h-4" />
              ) : job?.status === "validation_failed" ? (
                <XCircle className="w-4 h-4" />
              ) : (
                "2"
              )}
            </div>
            <div>
              <div className="text-xs font-bold">2. فحص وتحقق البيانات</div>
              <div className="text-[11px] text-slate-500">
                فحص البنية والتعارضات والأخطاء
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              currentStep === 3
                ? job?.status === "completed"
                  ? "bg-emerald-50/70 border-emerald-300 text-emerald-900 font-bold"
                  : job?.status === "completed_with_errors"
                  ? "bg-amber-50/70 border-amber-300 text-amber-900 font-bold"
                  : "bg-teal-50/70 border-teal-300 text-teal-900 font-bold"
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-xs ${
                currentStep === 3
                  ? job?.status === "completed"
                    ? "bg-emerald-600 text-white"
                    : job?.status === "completed_with_errors"
                    ? "bg-amber-600 text-white"
                    : "bg-teal-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {job?.status === "completed" ? (
                <Check className="w-4 h-4" />
              ) : (
                "3"
              )}
            </div>
            <div>
              <div className="text-xs font-bold">3. تنفيذ الاستيراد والنتيجة</div>
              <div className="text-[11px] text-slate-500">
                إنشاء الطلاب على دفعات متتالية
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Error Banner if any */}
      {processingError && (
        <Alert type="error" title="تنبيه خطأ">
          {processingError}
        </Alert>
      )}

      {/* ======================================================== */}
      {/* STEP 1: FILE SELECTION & UPLOAD (When no job exists yet) */}
      {/* ======================================================== */}
      {!job && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Zone */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  اختيار ملف Excel الخاص بالطلاب
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  يرجى اختيار ملف بصيغة xlsx أو xls يحتوي على بيانات الطلاب المطلوب
                  فحصهم واستيرادهم (يدعم حتى 1500 طالب).
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="gap-2 shrink-0 border-teal-600/30 text-teal-800 hover:bg-teal-50"
                title="تحميل قالب Excel فارغ مطابق للشروط"
              >
                {isDownloadingTemplate ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                ) : (
                  <Download className="w-4 h-4 text-teal-600" />
                )}
                <span>تحميل قالب Excel فارغ</span>
              </Button>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-teal-500 bg-teal-50/60 scale-[1.01]"
                  : selectedFile
                  ? "border-emerald-300 bg-emerald-50/30"
                  : "border-slate-300 hover:border-teal-400 hover:bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    validateAndSetFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center space-y-3">
                <div
                  className={`p-4 rounded-2xl transition-colors ${
                    selectedFile
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-teal-50 text-teal-600"
                  }`}
                >
                  {selectedFile ? (
                    <FileCheck2 className="w-10 h-10" />
                  ) : (
                    <UploadCloud className="w-10 h-10" />
                  )}
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      الحجم: {(selectedFile.size / 1024).toFixed(1)} كيلوبايت
                    </p>
                    <p className="text-xs text-emerald-700 font-semibold pt-1">
                      تم اختيار الملف بنجاح. اضغط أدناه لبدء الفحص والتحليل.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">
                      اسحب وأفلت ملف Excel هنا، أو{" "}
                      <span className="text-teal-600 underline underline-offset-2">
                        تصفح من جهازك
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      الملفات المدعومة: .xlsx, .xls (الحد الأقصى: 25 ميغابايت)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              {selectedFile ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
                >
                  إلغاء الملف المختار
                </button>
              ) : (
                <div />
              )}

              <Button
                onClick={handleUploadAndValidate}
                disabled={!selectedFile || isUploading}
                className="gap-2 min-w-[180px]"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الرفع والفحص...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>رفع وفحص الملف</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Guidelines Sidebar */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-teal-800 font-bold text-sm">
              <HelpCircle className="w-5 h-5 text-teal-600" />
              <span>إرشادات وضمانات الأمان</span>
            </div>

            <ul className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                <span>
                  <strong>فحص أمان كامل:</strong> رفع الملف لا ينشئ الطلاب مباشرة.
                  يقوم النظام أولًا بفحص بنية الملف، المراحل، الشعب، والسنة
                  الدراسية، والتحقق من عدم وجود تعارضات.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                <span>
                  <strong>حسابات أولياء الأمور:</strong> يدعم النظام الربط الذكي
                  لحسابات أولياء الأمور عند تطابق الرقم الوطني وتجنب التكرار.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                <span>
                  <strong>معالجة على دفعات:</strong> يتم الاستيراد عبر دفعات
                  آمنة تضمن سلامة البيانات وقابليتها للتدقيق دون انقطاع.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                <span>
                  <strong>سعة الملف:</strong> يدعم الملف الواحد حتى 1500 طالب
                  في المرة الواحدة.
                </span>
              </li>
            </ul>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
              <strong>ملاحظة هامة:</strong> في حال وجود أي صف غير صالح في الملف،
              سيطلب منك النظام تصحيح ملف Excel قبل السماح ببدء الاستيراد لحماية
              قاعدة البيانات من الإدخالات غير المكتملة.
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2 & 3: JOB VALIDATION RESULT & BATCH PROCESSING     */}
      {/* ======================================================== */}
      {job && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Rows */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <p className="text-xs font-semibold text-slate-500">
                إجمالي صفوف الملف
              </p>
              <p className="text-2xl font-black text-slate-900">
                {job.total_rows || 0}
              </p>
              <p className="text-[11px] text-slate-400">طالب مسجل في الملف</p>
            </div>

            {/* Ready Rows */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-1">
              <p className="text-xs font-semibold text-emerald-700">
                صفوف صالحة / جاهزة
              </p>
              <p className="text-2xl font-black text-emerald-800">
                {job.ready_rows || 0}
              </p>
              <p className="text-[11px] text-emerald-600">اجتازت فحص البيانات</p>
            </div>

            {/* Invalid Rows */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border shadow-sm space-y-1 ${
                job.invalid_rows > 0
                  ? "bg-rose-50/50 border-rose-300"
                  : "bg-white border-slate-200"
              }`}
            >
              <p
                className={`text-xs font-semibold ${
                  job.invalid_rows > 0 ? "text-rose-700" : "text-slate-500"
                }`}
              >
                صفوف غير صالحة
              </p>
              <p
                className={`text-2xl font-black ${
                  job.invalid_rows > 0 ? "text-rose-800" : "text-slate-900"
                }`}
              >
                {job.invalid_rows || 0}
              </p>
              <p
                className={`text-[11px] ${
                  job.invalid_rows > 0 ? "text-rose-600" : "text-slate-400"
                }`}
              >
                تحتوي أخطاء يلزم تصحيحها
              </p>
            </div>

            {/* Review Required or Succeeded */}
            {job.status === "completed" || job.status === "completed_with_errors" ? (
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-teal-200 shadow-sm space-y-1">
                <p className="text-xs font-semibold text-teal-700">
                  تم استيرادهم بنجاح
                </p>
                <p className="text-2xl font-black text-teal-800">
                  {job.succeeded_rows || 0}
                </p>
                <p className="text-[11px] text-teal-600">
                  {job.failed_rows > 0 ? `فشل ${job.failed_rows}` : "دون أي أخطاء"}
                </p>
              </div>
            ) : (
              <div
                className={`p-4 sm:p-5 rounded-2xl border shadow-sm space-y-1 ${
                  job.review_required_rows > 0
                    ? "bg-amber-50/50 border-amber-300"
                    : "bg-white border-slate-200"
                }`}
              >
                <p
                  className={`text-xs font-semibold ${
                    job.review_required_rows > 0
                      ? "text-amber-700"
                      : "text-slate-500"
                  }`}
                >
                  تحتاج مراجعة
                </p>
                <p
                  className={`text-2xl font-black ${
                    job.review_required_rows > 0
                      ? "text-amber-800"
                      : "text-slate-900"
                  }`}
                >
                  {job.review_required_rows || 0}
                </p>
                <p
                  className={`text-[11px] ${
                    job.review_required_rows > 0
                      ? "text-amber-600"
                      : "text-slate-400"
                  }`}
                >
                  بيانات تحتمل التعارض
                </p>
              </div>
            )}
          </div>

          {/* ======================================================= */}
          {/* CASE A: VALIDATION FAILED (status = validation_failed)   */}
          {/* ======================================================= */}
          {job.status === "validation_failed" && (
            <div className="space-y-4">
              <Alert
                type="error"
                title="الملف غير جاهز للاستيراد - يلزم تصحيح الأخطاء"
              >
                يحتوي ملف Excel على صفوف غير صالحة ({job.invalid_rows} صف غير
                صالح
                {job.review_required_rows > 0
                  ? ` و${job.review_required_rows} صف يحتاج مراجعة`
                  : ""}
                ). زر الاستيراد غير متاح حاليًا. يرجى مراجعة تفاصيل الأخطاء
                الموضحة في الجدول أدناه، وتصحيح الملف ثم إعادة رفعه.
              </Alert>

              <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-xs text-slate-600">
                  بعد تصحيح ملف Excel، يمكنك رفع الملف المصحح مباشرة لإعادة الفحص.
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      loadJob(job.id);
                      fetchRows(job.id, rowsPage, rowStatusFilter);
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>تحديث النتيجة</span>
                  </Button>
                  <Button onClick={handleReset} className="gap-2">
                    <UploadCloud className="w-4 h-4" />
                    <span>رفع ملف مصحح</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* CASE B: READY FOR IMPORT (status = ready)               */}
          {/* ======================================================= */}
          {job.status === "ready" && (
            <div className="bg-emerald-50/60 border border-emerald-300 rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-emerald-800 font-bold text-base">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <span>اجتاز الملف الفحص بنجاح تام!</span>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-700">
                    تم التحقق من كافة الطلاب والشعب والبيانات بنجاح ({job.ready_rows}{" "}
                    طالب جاهز للاستيراد). يمكنك الآن بدء تنفيذ عملية الاستيراد.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleStartImport}
                    disabled={isProcessing}
                    className="gap-2.5 bg-teal-700 hover:bg-teal-800 text-white px-6 py-3 text-sm font-black shadow-md"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري المعالجة...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>بدء استيراد الطلاب</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* CASE C: PROCESSING (status = processing / isProcessing) */}
          {/* ======================================================= */}
          {(job.status === "processing" || isProcessing) && (
            <div className="bg-white border border-teal-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      جاري استيراد الطلاب على دفعات متتالية...
                    </h3>
                    <p className="text-xs text-slate-500">
                      يقوم النظام بإنشاء ملفات الطلاب وسجلاتهم وحسابات أولياء
                      الأمور. يرجى عدم إغلاق الصفحة.
                    </p>
                  </div>
                </div>

                <div className="text-left font-black text-sm text-teal-800">
                  {progressPercent}%
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-teal-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Progress Counters */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-1">
                <div>
                  تمت معالجة{" "}
                  <strong className="text-slate-900 font-black">
                    {processedRows}
                  </strong>{" "}
                  من أصل{" "}
                  <strong className="text-slate-900 font-black">
                    {totalRows}
                  </strong>{" "}
                  طالب
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-700 font-semibold">
                    ناجح: {succeededRows}
                  </span>
                  <span className="text-rose-600 font-semibold">
                    فشل: {failedRows}
                  </span>
                  <span className="text-slate-500">
                    متبقي: {Math.max(0, totalRows - processedRows)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* CASE D: COMPLETED (status = completed)                  */}
          {/* ======================================================= */}
          {job.status === "completed" && !isProcessing && (
            <div className="bg-emerald-50/70 border border-emerald-300 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-emerald-900">
                      اكتمل استيراد جميع الطلاب بنجاح تام! 🎉
                    </h3>
                    <p className="text-xs sm:text-sm text-emerald-800">
                      تم إنشاء سجلات {job.succeeded_rows} طالب بنجاح مع ربط
                      القيود المدرسية، الملفات الصحية، وحسابات أولياء الأمور
                      المطابقة.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => navigate(`${basePath}/students`)}
                    className="gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    <Users className="w-4 h-4" />
                    <span>العودة إلى دليل الطلاب</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* CASE E: COMPLETED WITH ERRORS                           */}
          {/* ======================================================= */}
          {job.status === "completed_with_errors" && !isProcessing && (
            <div className="space-y-4">
              <Alert
                type="warning"
                title="اكتمل الاستيراد مع وجود بعض الأخطاء في بعض الصفوف"
              >
                تم استيراد {job.succeeded_rows} طالب بنجاح، بينما فشل استيراد{" "}
                {job.failed_rows} طالب أثناء التنفيذ. الطلاب الذين نجح استيرادهم
                محفوظون بالكامل في النظام. يمكنك مراجعة أسباب فشل الصفوف المتبقية
                أدناه.
              </Alert>

              <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                <div className="text-xs text-slate-600">
                  يمكنك مراجعة الأخطاء في الجدول أدناه أو العودة إلى قائمة الطلاب.
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`${basePath}/students`)}
                    className="gap-2"
                  >
                    <Users className="w-4 h-4" />
                    <span>العودة لدليل الطلاب</span>
                  </Button>
                  <Button onClick={handleReset} className="gap-2">
                    <UploadCloud className="w-4 h-4" />
                    <span>استيراد ملف جديد</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* ROWS & VALIDATION ERRORS TABLE                          */}
          {/* Shown if validation failed or completed with errors     */}
          {/* ======================================================= */}
          {(job.status === "validation_failed" ||
            job.status === "completed_with_errors" ||
            job.invalid_rows > 0) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4 sm:p-6">
              {/* Header and Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ListFilter className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    تفاصيل الصفوف والملاحظات والأخطاء
                  </h3>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setRowStatusFilter("");
                      setRowsPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      rowStatusFilter === ""
                        ? "bg-teal-700 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    الكل ({job.total_rows})
                  </button>

                  {job.invalid_rows > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRowStatusFilter("invalid");
                        setRowsPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        rowStatusFilter === "invalid"
                          ? "bg-rose-700 text-white shadow-xs"
                          : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                    >
                      غير صالحة ({job.invalid_rows})
                    </button>
                  )}

                  {job.review_required_rows > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRowStatusFilter("review_required");
                        setRowsPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        rowStatusFilter === "review_required"
                          ? "bg-amber-700 text-white shadow-xs"
                          : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      }`}
                    >
                      تحتاج مراجعة ({job.review_required_rows})
                    </button>
                  )}

                  {job.failed_rows > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRowStatusFilter("failed");
                        setRowsPage(1);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        rowStatusFilter === "failed"
                          ? "bg-rose-700 text-white shadow-xs"
                          : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                    >
                      فشلت أثناء التنفيذ ({job.failed_rows})
                    </button>
                  )}
                </div>
              </div>

              {/* Rows Error Alert if fetch failed */}
              {rowsError && (
                <Alert type="error" title="خطأ في تحميل الصفوف">
                  {rowsError}
                </Alert>
              )}

              {/* Rows Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-28 whitespace-nowrap">
                        رقم الصف في Excel
                      </th>
                      <th className="py-3 px-4 w-36 whitespace-nowrap">
                        حالة الصف
                      </th>
                      <th className="py-3 px-4">
                        الأخطاء والملاحظات (العمود + سبب المشكلة)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rowsLoading ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                            <span>جاري تحميل تفاصيل الصفوف والأخطاء...</span>
                          </div>
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-8 text-center text-slate-400 font-medium"
                        >
                          لا توجد صفوف مطابقة للفلتر المحدد
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const errors = formatRowErrors(row.validation_errors);
                        return (
                          <tr
                            key={row.id || row.row_number}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="py-3 px-4 font-black text-slate-900 whitespace-nowrap">
                              الصف {row.row_number}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {getRowStatusBadge(row.status)}
                            </td>
                            <td className="py-3 px-4">
                              {errors.length === 0 ? (
                                <span className="text-emerald-700 font-medium">
                                  لا توجد أخطاء في هذا الصف
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  {errors.map((errItem, idx) => (
                                    <div
                                      key={idx}
                                      className="inline-flex items-start gap-1.5 p-1.5 px-2.5 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-800 text-[11px] leading-relaxed ml-1.5 mb-1"
                                    >
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                      {errItem.column && errItem.detail ? (
                                        <span>
                                          <strong className="font-bold text-rose-950">
                                            {errItem.column}:
                                          </strong>{" "}
                                          {errItem.detail}
                                        </span>
                                      ) : (
                                        <span>{errItem.text}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Rows Pagination */}
              {rowsTotal > 20 && (
                <Pagination
                  currentPage={rowsPage}
                  totalCount={rowsTotal}
                  pageSize={20}
                  onPageChange={(newPage) => {
                    setRowsPage(newPage);
                    fetchRows(job.id, newPage, rowStatusFilter);
                  }}
                  hasNext={rowsHasNext}
                  hasPrevious={rowsHasPrev}
                  itemName="صف"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
