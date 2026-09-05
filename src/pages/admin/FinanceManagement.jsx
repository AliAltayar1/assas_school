import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../api";
import { useAuthStore } from "../../store/useAuthStore";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { Pagination } from "../../components/ui/Pagination";
import { toast } from "sonner";
import { parseApiError, extractPaginatedList } from "../../utils/errorUtils";
import {
  canManageTuitionPlans,
  canManageDiscounts,
  canCancelFinanceTransactions,
  canRecordPayments,
  canPreviewRemainingSyp,
  isSchoolAdmin,
} from "../../utils/permissionUtils";
import {
  DollarSign,
  Search,
  RefreshCw,
  X,
  SlidersHorizontal,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Edit2,
  Calendar,
  GraduationCap,
  Calculator,
  Receipt,
  Percent,
  Ban,
  ArrowRight,
  TrendingDown,
  User,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  Coins,
  History,
  ShieldAlert,
  Info,
  Check,
} from "lucide-react";

export function FinanceManagement() {
  const { user } = useAuthStore();

  // Role Permissions
  const adminMode = isSchoolAdmin(user);
  const allowTuitionPlans = canManageTuitionPlans(user);
  const allowDiscounts = canManageDiscounts(user);
  const allowCancel = canCancelFinanceTransactions(user);
  const allowRecordPayment = canRecordPayments(user);
  const allowPreviewSyp = canPreviewRemainingSyp(user);

  // Active Main Tab: "accounts" | "tuition_plans"
  const [activeMainTab, setActiveMainTab] = useState("accounts");

  // Metadata: Academic Years & Grade Levels
  const [academicYears, setAcademicYears] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);

  // ============================================================
  // 1. FINANCIAL ACCOUNTS STATES
  // ============================================================
  const [accounts, setAccounts] = useState([]);
  const [accountsCount, setAccountsCount] = useState(0);
  const [accountsPage, setAccountsPage] = useState(1);
  const [accountsHasNext, setAccountsHasNext] = useState(false);
  const [accountsHasPrev, setAccountsHasPrev] = useState(false);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState(null);

  // Accounts Filters
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" | "unpaid" | "partial" | "paid"
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // ============================================================
  // 2. TUITION PLANS STATES
  // ============================================================
  const [tuitionPlans, setTuitionPlans] = useState([]);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState(null);

  // ============================================================
  // 3. ACCOUNT DETAILS MODAL STATES
  // ============================================================
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [accountDetails, setAccountDetails] = useState(null);
  const [isAccountDetailsLoading, setIsAccountDetailsLoading] = useState(false);
  const [accountDetailsError, setAccountDetailsError] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsActiveTab, setDetailsActiveTab] = useState("payments"); // "payments" | "discounts"

  // ============================================================
  // 4. ACTION MODALS STATES
  // ============================================================
  // A. Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    currency: "usd", // "usd" | "syp"
    amount: "",
    exchange_rate_syp_per_usd: "",
  });
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [paymentModalError, setPaymentModalError] = useState(null);

  // B. Add Discount Modal
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    discount_type: "percentage", // "percentage" | "fixed"
    value: "",
    currency: "usd", // "usd" | "syp" (for fixed)
    exchange_rate_syp_per_usd: "",
    reason: "",
  });
  const [isDiscountSubmitting, setIsDiscountSubmitting] = useState(false);
  const [discountModalError, setDiscountModalError] = useState(null);

  // C. Cancel Transaction Modal (Payment / Discount)
  const [cancelTarget, setCancelTarget] = useState(null); // { type: 'payment' | 'discount', id: 'UUID', title: string }
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);
  const [cancelModalError, setCancelModalError] = useState(null);

  // D. Remaining SYP Preview Modal
  const [isSypPreviewModalOpen, setIsSypPreviewModalOpen] = useState(false);
  const [sypRateInput, setSypRateInput] = useState("");
  const [sypPreviewResult, setSypPreviewResult] = useState(null);
  const [isSypPreviewLoading, setIsSypPreviewLoading] = useState(false);
  const [sypPreviewError, setSypPreviewError] = useState(null);

  // E. Tuition Plan Form Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null); // null for create, object for edit
  const [planForm, setPlanForm] = useState({
    academic_year: "",
    grade_level: "",
    base_tuition_usd: "",
  });
  const [isPlanSubmitting, setIsPlanSubmitting] = useState(false);
  const [planModalError, setPlanModalError] = useState(null);

  // ============================================================
  // 5. EFFECTS & DATA FETCHING
  // ============================================================

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setAccountsPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load Metadata (Years & Grades)
  const fetchMetadata = useCallback(async () => {
    try {
      const [yearsRes, gradesRes] = await Promise.all([
        api.academics.getYears().catch(() => null),
        api.academics.getGradeLevels().catch(() => null),
      ]);
      if (yearsRes) {
        setAcademicYears(extractPaginatedList(yearsRes).results || []);
      }
      if (gradesRes) {
        setGradeLevels(extractPaginatedList(gradesRes).results || []);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Fetch Accounts
  const fetchAccounts = useCallback(
    async (page = accountsPage) => {
      setIsAccountsLoading(true);
      setAccountsError(null);
      try {
        const params = {
          page: page,
        };
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (yearFilter) params.academic_year = yearFilter;
        if (gradeFilter) params.grade_level = gradeFilter;
        if (statusFilter) params.payment_status = statusFilter;

        const data = await api.finance.getAccounts(params);
        const { results, count, next, previous } = extractPaginatedList(data);

        setAccounts(results);
        setAccountsCount(count);
        setAccountsHasNext(Boolean(next));
        setAccountsHasPrev(Boolean(previous));
      } catch (err) {
        setAccountsError(
          parseApiError(err, "حدث خطأ أثناء تحميل قائمة الحسابات المالية."),
        );
      } finally {
        setIsAccountsLoading(false);
      }
    },
    [accountsPage, debouncedSearch, yearFilter, gradeFilter, statusFilter],
  );

  // Fetch Tuition Plans
  const fetchTuitionPlans = useCallback(async () => {
    if (!allowTuitionPlans) return;
    setIsPlansLoading(true);
    setPlansError(null);
    try {
      const data = await api.finance.getTuitionPlans();
      const { results } = extractPaginatedList(data);
      setTuitionPlans(results);
    } catch (err) {
      setPlansError(
        parseApiError(err, "حدث خطأ أثناء تحميل خطط الرسوم الدراسية."),
      );
    } finally {
      setIsPlansLoading(false);
    }
  }, [allowTuitionPlans]);

  // Main Page Data Fetch
  useEffect(() => {
    if (activeMainTab === "accounts") {
      fetchAccounts(accountsPage);
    } else if (activeMainTab === "tuition_plans") {
      fetchTuitionPlans();
    }
  }, [activeMainTab, accountsPage, fetchAccounts, fetchTuitionPlans]);

  // Fetch Single Account Details
  const fetchAccountDetails = useCallback(async (accountId) => {
    if (!accountId) return;
    setIsAccountDetailsLoading(true);
    setAccountDetailsError(null);
    try {
      const data = await api.finance.getAccountById(accountId);
      // Backend returns either { success: true, data: { ... } } or direct object
      const details = data?.data || data;
      setAccountDetails(details);
    } catch (err) {
      setAccountDetailsError(
        parseApiError(err, "حدث خطأ أثناء تحميل تفاصيل الحساب المالي."),
      );
    } finally {
      setIsAccountDetailsLoading(false);
    }
  }, []);

  // Open Details Modal Handler
  const handleOpenAccountDetails = (account) => {
    setSelectedAccountId(account.id);
    setAccountDetails(null);
    setIsDetailsModalOpen(true);
    setDetailsActiveTab("payments");
    fetchAccountDetails(account.id);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setYearFilter("");
    setGradeFilter("");
    setStatusFilter("");
    setAccountsPage(1);
    toast.info("تمت استعادة خيارات التصفية الافتراضية.");
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    Boolean(yearFilter) ||
    Boolean(gradeFilter) ||
    Boolean(statusFilter);

  // Format Currencies & Numbers
  const formatUSD = (val) => {
    if (val === null || val === undefined || val === "") return "$0.00";
    const num = parseFloat(val);
    if (isNaN(num)) return `$${val}`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatSYP = (val) => {
    if (val === null || val === undefined || val === "") return "0 ل.س";
    const num = parseFloat(val);
    if (isNaN(num)) return `${val} ل.س`;
    return `${new Intl.NumberFormat("ar-SY").format(num)} ل.س`;
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>مسدد</span>
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>مدفوع جزئياً</span>
          </span>
        );
      case "unpaid":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>غير مدفوع</span>
          </span>
        );
    }
  };

  // KPI Stats Calculation for Accounts
  const stats = useMemo(() => {
    const total = accountsCount || accounts.length;
    let unpaid = 0;
    let partial = 0;
    let paid = 0;

    accounts.forEach((acc) => {
      const st = acc.payment_status || acc.totals?.payment_status;
      if (st === "paid") paid++;
      else if (st === "partial") partial++;
      else unpaid++;
    });

    return { total, unpaid, partial, paid };
  }, [accountsCount, accounts]);

  // ============================================================
  // 6. ACTION HANDLERS: PAYMENTS, DISCOUNTS, CANCEL, PREVIEW
  // ============================================================

  // Open Payment Modal
  const handleOpenPaymentModal = () => {
    setPaymentForm({
      currency: "usd",
      amount: "",
      exchange_rate_syp_per_usd: "",
    });
    setPaymentModalError(null);
    setIsPaymentModalOpen(true);
  };

  // Submit Payment Handler
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    setPaymentModalError(null);

    const amountNum = parseFloat(paymentForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPaymentModalError("يرجى إدخال مبلغ دفع صالح أكبر من الصفر.");
      return;
    }

    const payload = {
      currency: paymentForm.currency,
      amount: paymentForm.amount.trim(),
    };

    if (paymentForm.currency === "syp") {
      const rateNum = parseFloat(paymentForm.exchange_rate_syp_per_usd);
      if (isNaN(rateNum) || rateNum <= 0) {
        setPaymentModalError(
          "يرجى إدخال سعر صرف صالح لليرة السورية مقابل الدولار.",
        );
        return;
      }
      payload.exchange_rate_syp_per_usd =
        paymentForm.exchange_rate_syp_per_usd.trim();
    }

    setIsPaymentSubmitting(true);
    try {
      await api.finance.recordPayment(selectedAccountId, payload);
      toast.success("تم تسجيل الدفعة النقدية بنجاح.");
      setIsPaymentModalOpen(false);
      // Refresh Account Details and List
      fetchAccountDetails(selectedAccountId);
      fetchAccounts(accountsPage);
    } catch (err) {
      setPaymentModalError(parseApiError(err, "فشل تسجيل الدفعة."));
    } finally {
      setIsPaymentSubmitting(false);
    }
  };

  // Open Discount Modal
  const handleOpenDiscountModal = () => {
    setDiscountForm({
      discount_type: "percentage",
      value: "",
      currency: "usd",
      exchange_rate_syp_per_usd: "",
      reason: "",
    });
    setDiscountModalError(null);
    setIsDiscountModalOpen(true);
  };

  // Submit Discount Handler
  const handleSubmitDiscount = async (e) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    setDiscountModalError(null);

    const valNum = parseFloat(discountForm.value);
    if (isNaN(valNum) || valNum <= 0) {
      setDiscountModalError("يرجى إدخال قيمة خصم صالحة أكبر من الصفر.");
      return;
    }

    if (!discountForm.reason.trim()) {
      setDiscountModalError("يرجى ذكر سبب الخصم المالي.");
      return;
    }

    const payload = {
      discount_type: discountForm.discount_type,
      value: discountForm.value.trim(),
      reason: discountForm.reason.trim(),
    };

    if (discountForm.discount_type === "fixed") {
      payload.currency = discountForm.currency;
      if (discountForm.currency === "syp") {
        const rateNum = parseFloat(discountForm.exchange_rate_syp_per_usd);
        if (isNaN(rateNum) || rateNum <= 0) {
          setDiscountModalError("يرجى إدخال سعر الصرف لليرة السورية.");
          return;
        }
        payload.exchange_rate_syp_per_usd =
          discountForm.exchange_rate_syp_per_usd.trim();
      }
    }

    setIsDiscountSubmitting(true);
    try {
      await api.finance.addDiscount(selectedAccountId, payload);
      toast.success("تمت إضافة الخصم بنجاح.");
      setIsDiscountModalOpen(false);
      // Refresh Account Details and List
      fetchAccountDetails(selectedAccountId);
      fetchAccounts(accountsPage);
    } catch (err) {
      setDiscountModalError(parseApiError(err, "فشل إضافة الخصم."));
    } finally {
      setIsDiscountSubmitting(false);
    }
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (type, id, title) => {
    setCancelTarget({ type, id, title });
    setCancelReason("");
    setCancelModalError(null);
    setIsCancelModalOpen(true);
  };

  // Submit Cancel Handler
  const handleSubmitCancel = async (e) => {
    e.preventDefault();
    if (!selectedAccountId || !cancelTarget) return;

    if (!cancelReason.trim()) {
      setCancelModalError("يرجى كتابة سبب الإلغاء بشكل واضح.");
      return;
    }

    setIsCancelSubmitting(true);
    setCancelModalError(null);

    try {
      const payload = { cancellation_reason: cancelReason.trim() };
      if (cancelTarget.type === "payment") {
        await api.finance.cancelPayment(
          selectedAccountId,
          cancelTarget.id,
          payload,
        );
        toast.success("تم إلغاء الدفعة واستبعادها من الحساب بنجاح.");
      } else if (cancelTarget.type === "discount") {
        await api.finance.cancelDiscount(
          selectedAccountId,
          cancelTarget.id,
          payload,
        );
        toast.success("تم إلغاء الخصم واستبعاده من الحساب بنجاح.");
      }

      setIsCancelModalOpen(false);
      setCancelTarget(null);
      // Refresh Account Details and List
      fetchAccountDetails(selectedAccountId);
      fetchAccounts(accountsPage);
    } catch (err) {
      setCancelModalError(parseApiError(err, "فشل تنفيذ عملية الإلغاء."));
    } finally {
      setIsCancelSubmitting(false);
    }
  };

  // Open SYP Preview Modal
  const handleOpenSypPreviewModal = () => {
    setSypRateInput("");
    setSypPreviewResult(null);
    setSypPreviewError(null);
    setIsSypPreviewModalOpen(true);
  };

  // Submit SYP Preview
  const handleSubmitSypPreview = async (e) => {
    e.preventDefault();
    if (!selectedAccountId) return;

    const rateNum = parseFloat(sypRateInput);
    if (isNaN(rateNum) || rateNum <= 0) {
      setSypPreviewError(
        "يرجى إدخال سعر صرف صالح لليرة السورية مقابل الدولار.",
      );
      return;
    }

    setIsSypPreviewLoading(true);
    setSypPreviewError(null);

    try {
      const res = await api.finance.previewRemainingSyp(selectedAccountId, {
        exchange_rate_syp_per_usd: sypRateInput.trim(),
      });
      const data = res?.data || res;
      setSypPreviewResult(data);
    } catch (err) {
      setSypPreviewError(
        parseApiError(err, "فشل احتساب المتبقي بالليرة السورية."),
      );
    } finally {
      setIsSypPreviewLoading(false);
    }
  };

  // Open Tuition Plan Modal (Create or Edit)
  const handleOpenPlanModal = (plan = null) => {
    setEditingPlan(plan);
    setPlanModalError(null);
    if (plan) {
      setPlanForm({
        academic_year: plan.academic_year || plan.academic_year_id || "",
        grade_level: plan.grade_level || plan.grade_level_id || "",
        base_tuition_usd: plan.base_tuition_usd || "",
      });
    } else {
      setPlanForm({
        academic_year: academicYears[0]?.id || "",
        grade_level: gradeLevels[0]?.id || "",
        base_tuition_usd: "",
      });
    }
    setIsPlanModalOpen(true);
  };

  // Submit Tuition Plan Handler
  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    setPlanModalError(null);

    const priceNum = parseFloat(planForm.base_tuition_usd);
    if (isNaN(priceNum) || priceNum <= 0) {
      setPlanModalError(
        "يرجى إدخال قسط سنوي أساسي صالح بالدولار أكبر من الصفر.",
      );
      return;
    }

    setIsPlanSubmitting(true);
    try {
      if (editingPlan?.id) {
        // Edit price only
        await api.finance.updateTuitionPlan(editingPlan.id, {
          base_tuition_usd: planForm.base_tuition_usd.trim(),
        });
        toast.success("تم تحديث القسط السنوي للصف بنجاح.");
      } else {
        // Create new plan
        if (!planForm.academic_year) {
          setPlanModalError("يرجى تحديد السنة الدراسية.");
          setIsPlanSubmitting(false);
          return;
        }
        if (!planForm.grade_level) {
          setPlanModalError("يرجى تحديد الصف الدراسي.");
          setIsPlanSubmitting(false);
          return;
        }

        await api.finance.createTuitionPlan({
          academic_year: planForm.academic_year,
          grade_level: planForm.grade_level,
          base_tuition_usd: planForm.base_tuition_usd.trim(),
        });
        toast.success(
          "تمت إضافة خطة الرسوم الدراسية للصف وتوليد الحسابات للطلاب المسجلين بنجاح.",
        );
      }

      setIsPlanModalOpen(false);
      fetchTuitionPlans();
    } catch (err) {
      setPlanModalError(parseApiError(err, "فشل حفظ خطة الرسوم الدراسية."));
    } finally {
      setIsPlanSubmitting(false);
    }
  };

  // Dynamic calculated preview for Payment Form in SYP
  const dynamicPaymentUsdPreview = useMemo(() => {
    if (paymentForm.currency !== "syp") return null;
    const amount = parseFloat(paymentForm.amount);
    const rate = parseFloat(paymentForm.exchange_rate_syp_per_usd);
    if (!isNaN(amount) && !isNaN(rate) && rate > 0) {
      return (amount / rate).toFixed(2);
    }
    return null;
  }, [
    paymentForm.currency,
    paymentForm.amount,
    paymentForm.exchange_rate_syp_per_usd,
  ]);

  // Dynamic calculated preview for Fixed SYP Discount
  const dynamicDiscountUsdPreview = useMemo(() => {
    if (
      discountForm.discount_type !== "fixed" ||
      discountForm.currency !== "syp"
    ) {
      return null;
    }
    const val = parseFloat(discountForm.value);
    const rate = parseFloat(discountForm.exchange_rate_syp_per_usd);
    if (!isNaN(val) && !isNaN(rate) && rate > 0) {
      return (val / rate).toFixed(2);
    }
    return null;
  }, [
    discountForm.discount_type,
    discountForm.currency,
    discountForm.value,
    discountForm.exchange_rate_syp_per_usd,
  ]);

  // Active totals for selected account
  const activeTotals = accountDetails?.totals || {};

  return (
    <div className="space-y-4 sm:space-y-6 text-right dir-rtl" dir="rtl">
      {/* 1. Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">
              إدارة الرسوم والمالية (Finance & Tuition)
            </h2>
            {activeMainTab === "accounts" && accountsCount > 0 && (
              <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                {accountsCount} حساب مالي
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 pr-1 leading-relaxed">
            متابعة الحسابات المالية للطلاب بالدولار الأمريكي (USD)، تسجيل
            المقبوضات النقدية (USD/SYP)، وإدارة الخصومات الرسمية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Main Tabs (Accounts / Tuition Plans) */}
          {allowTuitionPlans && (
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setActiveMainTab("accounts")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeMainTab === "accounts"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                الحسابات المالية
              </button>
              <button
                onClick={() => setActiveMainTab("tuition_plans")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeMainTab === "tuition_plans"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                خطط الرسوم (الصفوف)
              </button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              activeMainTab === "accounts"
                ? fetchAccounts(accountsPage)
                : fetchTuitionPlans()
            }
            disabled={isAccountsLoading || isPlansLoading}
            title="تحديث البيانات"
            className="h-9 px-3 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isAccountsLoading || isPlansLoading ? "animate-spin" : ""
              }`}
            />
            <span>تحديث</span>
          </Button>

          {activeMainTab === "tuition_plans" && allowTuitionPlans && (
            <Button
              size="sm"
              onClick={() => handleOpenPlanModal(null)}
              className="h-9 px-3.5 gap-1.5 text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سعر صف</span>
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* VIEW A: FINANCIAL ACCOUNTS TAB                               */}
      {/* ============================================================ */}
      {activeMainTab === "accounts" && (
        <div className="space-y-4 sm:space-y-6">
          {/* Quick KPI Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Total Accounts */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">
                  إجمالي الحسابات
                </span>
                <span className="text-lg sm:text-xl font-bold text-slate-900">
                  {stats.total}
                </span>
              </div>
            </div>

            {/* Unpaid Accounts */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">
                  غير مدفوعة
                </span>
                <span className="text-lg sm:text-xl font-bold text-rose-700">
                  {stats.unpaid}
                </span>
              </div>
            </div>

            {/* Partial Accounts */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">
                  مدفوعة جزئياً
                </span>
                <span className="text-lg sm:text-xl font-bold text-amber-700">
                  {stats.partial}
                </span>
              </div>
            </div>

            {/* Paid Accounts */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">
                  مسددة بالكامل
                </span>
                <span className="text-lg sm:text-xl font-bold text-emerald-700">
                  {stats.paid}
                </span>
              </div>
            </div>
          </div>

          {/* Accounts Error Alert */}
          {accountsError && (
            <Alert type="error" title="تنبيه">
              {accountsError}
            </Alert>
          )}

          {/* Search & Filters Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="بحث باسم الطالب..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pr-9 pl-8 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 hover:bg-white transition-colors"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    title="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Year Selector */}
                <select
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setAccountsPage(1);
                  }}
                  className="flex-1 sm:flex-initial h-9 text-xs border border-slate-200 rounded-xl px-2.5 sm:px-3 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium min-w-[130px]"
                >
                  <option value="">جميع السنوات الدراسية</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name || y.year}
                    </option>
                  ))}
                </select>

                {/* Grade Selector */}
                <select
                  value={gradeFilter}
                  onChange={(e) => {
                    setGradeFilter(e.target.value);
                    setAccountsPage(1);
                  }}
                  className="flex-1 sm:flex-initial h-9 text-xs border border-slate-200 rounded-xl px-2.5 sm:px-3 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium min-w-[120px]"
                >
                  <option value="">جميع الصفوف</option>
                  {gradeLevels.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>

                {/* Payment Status Selector */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setAccountsPage(1);
                  }}
                  className="flex-1 sm:flex-initial h-9 text-xs border border-slate-200 rounded-xl px-2.5 sm:px-3 bg-slate-50/50 hover:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium min-w-[110px]"
                >
                  <option value="">جميع الحالات</option>
                  <option value="unpaid">غير مدفوع (Unpaid)</option>
                  <option value="partial">مدفوع جزئياً (Partial)</option>
                  <option value="paid">مسدد (Paid)</option>
                </select>

                {/* Reset Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-9 px-2.5 sm:px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 shrink-0"
                    title="إلغاء جميع الفلاتر"
                  >
                    <X className="w-3.5 h-3.5 ml-1" />
                    <span>إعادة ضبط</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Accounts List / Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {isAccountsLoading ? (
              <div className="py-16 sm:py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                <p className="text-xs font-semibold text-slate-600">
                  جاري تحميل الحسابات المالية للطلاب...
                </p>
              </div>
            ) : accounts.length === 0 ? (
              /* Empty State */
              <div className="py-12 sm:py-16 px-4 text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border border-emerald-100 shadow-sm">
                  <Receipt className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                {hasActiveFilters ? (
                  <div className="space-y-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800">
                      لم يتم العثور على أي حسابات مالية تطابق خيارات التصفية
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      يرجى تجربة تعديل معايير البحث أو تصفية السنة والصف.
                    </p>
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="text-xs"
                      >
                        مسح جميع الفلاتر
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-w-md mx-auto">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800">
                      لا توجد حسابات مالية مسجلة حتى الآن
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      يتم إنشاء الحسابات المالية تلقائياً للطلاب المسجلين فور
                      تحديد خطة الرسوم الدراسية (Tuition Plan) لصفوفهم.
                    </p>
                    {allowTuitionPlans && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={() => setActiveMainTab("tuition_plans")}
                          className="text-xs gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>إعداد خطط الرسوم للصفوف</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Desktop / Tablet Table View (md and up) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">الطالب</th>
                        <th className="py-3.5 px-4">السنة الدراسية</th>
                        <th className="py-3.5 px-4">الصف</th>
                        <th className="py-3.5 px-4">القسط الأساسي</th>
                        <th className="py-3.5 px-4">الخصومات</th>
                        <th className="py-3.5 px-4">القسط الصافي</th>
                        <th className="py-3.5 px-4">المدفوع</th>
                        <th className="py-3.5 px-4">المتبقي</th>
                        <th className="py-3.5 px-4">حالة الدفع</th>
                        <th className="py-3.5 px-4 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accounts.map((item) => {
                        const t = item.totals || {};

                        const studentName = item.student_display || "طالب مسجل";
                        const gradeName = item.grade_level_display || "-";
                        const yearName = item.academic_year_display || "-";
                        const paymentStatus = t.payment_status || "unpaid";

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            {/* Student */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                <User className="w-3.5 h-3.5 text-teal-600" />
                                <span>{studentName}</span>
                              </div>
                            </td>

                            {/* Year */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                              {yearName}
                            </td>

                            {/* Grade */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-semibold">
                              {gradeName}
                            </td>

                            {/* Base Tuition */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                              {formatUSD(t.base_tuition_usd)}
                            </td>

                            {/* Discounts */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-medium text-rose-600">
                              {formatUSD(t.total_discounts_usd)}
                            </td>

                            {/* Net Tuition */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
                              {formatUSD(t.net_tuition_usd)}
                            </td>

                            {/* Paid */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-bold text-emerald-700">
                              {formatUSD(t.total_paid_usd)}
                            </td>

                            {/* Remaining */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-bold text-amber-700">
                              {formatUSD(t.remaining_usd)}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {renderStatusBadge(paymentStatus)}
                            </td>

                            {/* Action */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAccountDetails(item)}
                                className="h-8 px-3 text-xs gap-1.5 font-bold text-teal-700 hover:text-teal-800 hover:bg-teal-50 hover:border-teal-300"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>تفاصيل الحساب</span>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View (< md) */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {accounts.map((item) => {
                    const t = item.totals || {};

                    const studentName = item.student_display || "طالب مسجل";
                    const gradeName = item.grade_level_display || "-";
                    const yearName = item.academic_year_display || "-";
                    const paymentStatus = t.payment_status || "unpaid";

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 space-y-3 hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Header: Student Name & Status */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                            <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{studentName}</span>
                          </div>
                          {renderStatusBadge(paymentStatus)}
                        </div>

                        {/* Grade & Year Badge */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {gradeName}
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {yearName}
                          </span>
                        </div>

                        {/* Totals Summary Mini Grid */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60 text-[11px] text-right">
                          <div>
                            <span className="text-slate-400 block text-[10px]">
                              الصافي:
                            </span>
                            <span className="font-bold text-slate-800">
                              {formatUSD(t.net_tuition_usd)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">
                              المدفوع:
                            </span>
                            <span className="font-bold text-emerald-700">
                              {formatUSD(t.total_paid_usd)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">
                              المتبقي:
                            </span>
                            <span className="font-bold text-amber-700">
                              {formatUSD(t.remaining_usd)}
                            </span>
                          </div>
                        </div>

                        {/* Mobile Action Button */}
                        <div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAccountDetails(item)}
                            className="w-full h-8.5 text-xs gap-1.5 font-bold text-teal-700 hover:text-teal-800 hover:bg-teal-50 hover:border-teal-300"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>عرض تفاصيل الحساب والدفعات</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Pagination Footer */}
            {accounts.length > 0 && (
              <Pagination
                currentPage={accountsPage}
                totalCount={accountsCount}
                pageSize={20}
                hasNext={accountsHasNext}
                hasPrevious={accountsHasPrev}
                itemName="حساب مالي"
                onPageChange={(p) => setAccountsPage(p)}
              />
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW B: TUITION PLANS TAB (School Admin Only)                */}
      {/* ============================================================ */}
      {activeMainTab === "tuition_plans" && allowTuitionPlans && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>قاعدة تشغيلية:</strong> يتم تحديد القسط السنوي الأساسي
              بالدولار الأمريكي (USD) لكل صف دراسي وسنة. فور تحديد السعر، يقوم
              النظام تلقائياً بتوليد الحسابات المالية لجميع الطلاب المسجلين
              بالصف.
            </p>
          </div>

          {plansError && (
            <Alert type="error" title="تنبيه">
              {plansError}
            </Alert>
          )}

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {isPlansLoading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                <p className="text-xs font-semibold text-slate-600">
                  جاري تحميل خطط الرسوم للصفوف...
                </p>
              </div>
            ) : tuitionPlans.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto border border-teal-100 shadow-sm">
                  <Coins className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  لا توجد خطط رسوم محددة حتى الآن
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  قم بإضافة القسط الأساسي لكل صف دراسي لتفعيل الحسابات المالية
                  للطلاب.
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleOpenPlanModal(null)}
                    className="text-xs gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة سعر صف جديد</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">السنة الدراسية</th>
                      <th className="py-3.5 px-4">الصف الدراسي</th>
                      <th className="py-3.5 px-4">
                        القسط السنوي الأساسي (USD)
                      </th>
                      <th className="py-3.5 px-4 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tuitionPlans.map((plan) => {
                      console.log(plan);
                      const yearName = plan.academic_year_display || "-";
                      const gradeName = plan.grade_level_display || "-";

                      return (
                        <tr
                          key={plan.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                            {yearName}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
                            {gradeName}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-emerald-700 text-sm">
                            {formatUSD(plan.base_tuition_usd)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPlanModal(plan)}
                              className="h-8 px-3 text-xs gap-1.5 font-medium text-slate-700 hover:text-teal-700 hover:border-teal-300"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>تعديل السعر</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. ACCOUNT DETAILS MODAL                                     */}
      {/* ============================================================ */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="تفاصيل الحساب المالي وسجل المقبوضات"
        maxWidth="max-w-4xl"
      >
        {isAccountDetailsLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
            <p className="text-xs font-semibold text-slate-600">
              جاري تحميل التفاصيل المالية للحساب...
            </p>
          </div>
        ) : accountDetailsError ? (
          <div className="space-y-4">
            <Alert type="error" title="خطأ في تحميل الحساب">
              {accountDetailsError}
            </Alert>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-xs"
              >
                إغلاق
              </Button>
            </div>
          </div>
        ) : accountDetails ? (
          <div className="space-y-5 text-right dir-rtl" dir="rtl">
            {/* Header Identity Card */}
            {console.log("accountDetails")}
            {console.log(activeTotals)}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900">
                      {accountDetails.student_display || "الطالب"}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {accountDetails.grade_level_display} •{" "}
                      {accountDetails.academic_year_display}
                    </p>
                  </div>
                </div>

                <div>
                  {renderStatusBadge(activeTotals.payment_status || "unpaid")}
                </div>
              </div>

              {/* Official Totals Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs text-right">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-medium">
                    القسط الأساسي:
                  </span>
                  <span className="font-bold text-slate-800 text-sm">
                    {formatUSD(activeTotals.base_tuition_usd)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-medium">
                    إجمالي الخصومات:
                  </span>
                  <span className="font-bold text-rose-600 text-sm">
                    {formatUSD(activeTotals.total_discounts_usd)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-medium">
                    القسط الصافي:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatUSD(activeTotals.net_tuition_usd)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-medium">
                    إجمالي المدفوع:
                  </span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {formatUSD(activeTotals.total_paid_usd)}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block font-medium">
                    المبلغ المتبقي:
                  </span>
                  <span className="font-bold text-amber-700 text-sm">
                    {formatUSD(activeTotals.remaining_usd)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-b border-slate-100 pb-3">
              {/* Tab Switcher: Payments / Discounts */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setDetailsActiveTab("payments")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    detailsActiveTab === "payments"
                      ? "bg-white text-teal-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>
                    الدفعات (
                    {Array.isArray(accountDetails.payments)
                      ? accountDetails.payments.length
                      : 0}
                    )
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailsActiveTab("discounts")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    detailsActiveTab === "discounts"
                      ? "bg-white text-teal-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>
                    الخصومات (
                    {Array.isArray(accountDetails.discounts)
                      ? accountDetails.discounts.length
                      : 0}
                    )
                  </span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {allowPreviewSyp && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenSypPreviewModal}
                    className="h-8.5 px-3 text-xs gap-1.5 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Calculator className="w-3.5 h-3.5 text-teal-600" />
                    <span>حساب المتبقي بالليرة</span>
                  </Button>
                )}

                {allowDiscounts && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenDiscountModal}
                    className="h-8.5 px-3 text-xs gap-1.5 font-bold text-rose-700 hover:bg-rose-50 border-rose-200"
                  >
                    <Percent className="w-3.5 h-3.5 text-rose-600" />
                    <span>إضافة خصم</span>
                  </Button>
                )}

                {allowRecordPayment && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenPaymentModal}
                    disabled={
                      activeTotals.payment_status === "paid" ||
                      parseFloat(activeTotals.remaining_usd || 0) <= 0
                    }
                    className="h-8.5 px-3.5 text-xs gap-1.5 font-bold shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تسجيل دفعة</span>
                  </Button>
                )}
              </div>
            </div>

            {/* TAB CONTENT 1: PAYMENTS */}
            {detailsActiveTab === "payments" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-teal-600" />
                    <span>سجل الدفعات المقبوضة</span>
                  </h4>
                </div>

                {!accountDetails.payments ||
                accountDetails.payments.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-8 text-center space-y-1 text-slate-500 text-xs">
                    <Receipt className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                    <p className="font-bold text-slate-700">
                      لم يتم تسجيل أي دفعات نقدية لهذا الحساب حتى الآن
                    </p>
                    <p className="text-[11px]">
                      استخدم زر "تسجيل دفعة" بالأعلى لقبض دفعة بالدولار أو
                      بالليرة السورية.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">التاريخ</th>
                          <th className="py-2.5 px-3">المبلغ المقبوض</th>
                          <th className="py-2.5 px-3">العملة</th>
                          <th className="py-2.5 px-3">سعر الصرف</th>
                          <th className="py-2.5 px-3">المكافئ بالدولار</th>
                          <th className="py-2.5 px-3">المستلم</th>
                          <th className="py-2.5 px-3">الحالة</th>
                          {allowCancel && (
                            <th className="py-2.5 px-3 text-center">إجراء</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {accountDetails.payments.map((p) => {
                          const isCancelled = p.is_cancelled === true;
                          const isSyp =
                            (p.currency || "").toLowerCase() === "syp";

                          return (
                            <tr
                              key={p.id}
                              className={`transition-colors ${
                                isCancelled
                                  ? "bg-rose-50/30 text-slate-400"
                                  : "hover:bg-slate-50/80"
                              }`}
                            >
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {formatDateTime(p.created_at || p.payment_date)}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                                {isCancelled ? (
                                  <del className="text-slate-400">
                                    {isSyp
                                      ? formatSYP(p.amount)
                                      : formatUSD(p.amount)}
                                  </del>
                                ) : (
                                  <span className="text-slate-900">
                                    {isSyp
                                      ? formatSYP(p.amount)
                                      : formatUSD(p.amount)}
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap uppercase font-bold text-[11px]">
                                {p.currency || "USD"}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-medium">
                                {p.exchange_rate_syp_per_usd
                                  ? `${new Intl.NumberFormat("ar-SY").format(
                                      p.exchange_rate_syp_per_usd,
                                    )} ل.س`
                                  : "-"}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap font-bold text-emerald-700">
                                {isCancelled ? (
                                  <del className="text-slate-400">
                                    {formatUSD(p.equivalent_usd || p.amount)}
                                  </del>
                                ) : (
                                  formatUSD(p.equivalent_usd || p.amount)
                                )}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                                {p.created_by_username ||
                                  p.created_by ||
                                  "المحاسب"}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {isCancelled ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                      <Ban className="w-3 h-3" />
                                      <span>ملغاة</span>
                                    </span>
                                    {p.cancellation_reason && (
                                      <p
                                        className="text-[10px] text-rose-600 max-w-[150px] truncate"
                                        title={p.cancellation_reason}
                                      >
                                        السبب: {p.cancellation_reason}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                    <Check className="w-3 h-3" />
                                    <span>نشطة</span>
                                  </span>
                                )}
                              </td>

                              {allowCancel && (
                                <td className="py-2.5 px-3 whitespace-nowrap text-center">
                                  {!isCancelled ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenCancelModal(
                                          "payment",
                                          p.id,
                                          `الدفعة بقيمة ${
                                            isSyp
                                              ? formatSYP(p.amount)
                                              : formatUSD(p.amount)
                                          }`,
                                        )
                                      }
                                      className="text-xs text-rose-600 hover:text-rose-800 hover:underline font-bold"
                                    >
                                      إلغاء الدفعة
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 text-[11px]">
                                      -
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: DISCOUNTS */}
            {detailsActiveTab === "discounts" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-rose-600" />
                    <span>سجل الخصومات والتخفيضات الممنوحة</span>
                  </h4>
                </div>

                {!accountDetails.discounts ||
                accountDetails.discounts.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-8 text-center space-y-1 text-slate-500 text-xs">
                    <Percent className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                    <p className="font-bold text-slate-700">
                      لا توجد أي خصومات ممنوحة لهذا الحساب
                    </p>
                    {allowDiscounts && (
                      <p className="text-[11px]">
                        يمكنك منح خصم (نسبة مئوية أو مبلغ ثابت) عبر زر "إضافة
                        خصم" بالأعلى.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">التاريخ</th>
                          <th className="py-2.5 px-3">نوع الخصم</th>
                          <th className="py-2.5 px-3">القيمة الأصلية</th>
                          <th className="py-2.5 px-3">القيمة بالدولار (USD)</th>
                          <th className="py-2.5 px-3">سبب الخصم</th>
                          <th className="py-2.5 px-3">من سجله</th>
                          <th className="py-2.5 px-3">الحالة</th>
                          {allowCancel && (
                            <th className="py-2.5 px-3 text-center">إجراء</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {accountDetails.discounts.map((d) => {
                          const isCancelled = d.is_cancelled === true;
                          const isPercentage = d.discount_type === "percentage";
                          const isSyp =
                            (d.currency || "").toLowerCase() === "syp";

                          return (
                            <tr
                              key={d.id}
                              className={`transition-colors ${
                                isCancelled
                                  ? "bg-rose-50/30 text-slate-400"
                                  : "hover:bg-slate-50/80"
                              }`}
                            >
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {formatDateTime(d.created_at)}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                                {isPercentage ? (
                                  <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    نسبة مئوية ({d.value}%)
                                  </span>
                                ) : (
                                  <span className="text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                    مبلغ ثابت (
                                    {d.currency?.toUpperCase() || "USD"})
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap font-semibold">
                                {isPercentage
                                  ? `${d.value}%`
                                  : isSyp
                                    ? formatSYP(d.value)
                                    : formatUSD(d.value)}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap font-bold text-rose-700">
                                {isCancelled ? (
                                  <del className="text-slate-400">
                                    {formatUSD(
                                      d.discount_usd || d.equivalent_usd,
                                    )}
                                  </del>
                                ) : (
                                  formatUSD(d.discount_usd || d.equivalent_usd)
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-slate-700 max-w-xs">
                                {d.reason || "-"}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                                {d.created_by_username ||
                                  d.created_by ||
                                  "الإدارة"}
                              </td>

                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {isCancelled ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                      <Ban className="w-3 h-3" />
                                      <span>ملغى</span>
                                    </span>
                                    {d.cancellation_reason && (
                                      <p
                                        className="text-[10px] text-rose-600 max-w-[150px] truncate"
                                        title={d.cancellation_reason}
                                      >
                                        السبب: {d.cancellation_reason}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                    <Check className="w-3 h-3" />
                                    <span>نشط</span>
                                  </span>
                                )}
                              </td>

                              {allowCancel && (
                                <td className="py-2.5 px-3 whitespace-nowrap text-center">
                                  {!isCancelled ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenCancelModal(
                                          "discount",
                                          d.id,
                                          `الخصم (${d.reason || d.value})`,
                                        )
                                      }
                                      className="text-xs text-rose-600 hover:text-rose-800 hover:underline font-bold"
                                    >
                                      إلغاء الخصم
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 text-[11px]">
                                      -
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-xs px-5"
              >
                إغلاق
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ============================================================ */}
      {/* 8. RECORD PAYMENT MODAL                                      */}
      {/* ============================================================ */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="تسجيل دفعة نقدية جديدة (Record Payment)"
        maxWidth="max-w-md"
      >
        <form
          onSubmit={handleSubmitPayment}
          className="space-y-4 text-right dir-rtl"
          dir="rtl"
        >
          {paymentModalError && (
            <Alert type="error" title="تنبيه">
              {paymentModalError}
            </Alert>
          )}

          {/* Remaining Balance Callout */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              المبلغ المتبقي على الطالب:
            </span>
            <span className="font-bold text-amber-700 text-sm">
              {formatUSD(activeTotals.remaining_usd)}
            </span>
          </div>

          {/* Currency Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              عملة الدفع المقبوضة:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setPaymentForm((prev) => ({ ...prev, currency: "usd" }))
                }
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  paymentForm.currency === "usd"
                    ? "bg-teal-50 border-teal-500 text-teal-800 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <DollarSign className="w-4 h-4 text-teal-600" />
                <span>دولار أمريكي (USD)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setPaymentForm((prev) => ({ ...prev, currency: "syp" }))
                }
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  paymentForm.currency === "syp"
                    ? "bg-teal-50 border-teal-500 text-teal-800 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Coins className="w-4 h-4 text-teal-600" />
                <span>ليرة سورية (SYP)</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              المبلغ المدفوع ({paymentForm.currency === "usd" ? "USD" : "SYP"}):
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              placeholder={
                paymentForm.currency === "usd" ? "مثلاً: 250" : "مثلاً: 2500000"
              }
              value={paymentForm.amount}
              onChange={(e) =>
                setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            />
          </div>

          {/* If SYP: Exchange Rate Input & Equivalent Preview */}
          {paymentForm.currency === "syp" && (
            <div className="space-y-3 p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  سعر صرف الليرة مقابل الدولار (SYP per USD):
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="مثلاً: 14500"
                  value={paymentForm.exchange_rate_syp_per_usd}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      exchange_rate_syp_per_usd: e.target.value,
                    }))
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>

              {dynamicPaymentUsdPreview && (
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 border-t border-amber-200/80 pt-2">
                  <span>المكافئ المحتسب بالدولار:</span>
                  <span className="text-sm font-black text-emerald-800">
                    {formatUSD(dynamicPaymentUsdPreview)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={isPaymentSubmitting}
              className="text-xs px-4"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isPaymentSubmitting}
              disabled={isPaymentSubmitting || !paymentForm.amount}
              className="text-xs px-5 font-bold shadow-sm"
            >
              تأكيد وتسجيل الدفعة
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* 9. ADD DISCOUNT MODAL (Admin Only)                           */}
      {/* ============================================================ */}
      {allowDiscounts && (
        <Modal
          isOpen={isDiscountModalOpen}
          onClose={() => setIsDiscountModalOpen(false)}
          title="إضافة خصم مالي للطالب (Add Discount)"
          maxWidth="max-w-md"
        >
          <form
            onSubmit={handleSubmitDiscount}
            className="space-y-4 text-right dir-rtl"
            dir="rtl"
          >
            {discountModalError && (
              <Alert type="error" title="تنبيه">
                {discountModalError}
              </Alert>
            )}

            {/* Discount Type Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                نوع الخصم:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDiscountForm((prev) => ({
                      ...prev,
                      discount_type: "percentage",
                    }))
                  }
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    discountForm.discount_type === "percentage"
                      ? "bg-purple-50 border-purple-500 text-purple-800 shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Percent className="w-4 h-4 text-purple-600" />
                  <span>نسبة مئوية (%)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDiscountForm((prev) => ({
                      ...prev,
                      discount_type: "fixed",
                    }))
                  }
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    discountForm.discount_type === "fixed"
                      ? "bg-purple-50 border-purple-500 text-purple-800 shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  <span>مبلغ مالي ثابت</span>
                </button>
              </div>
            </div>

            {/* If Fixed -> Choose Currency USD / SYP */}
            {discountForm.discount_type === "fixed" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  عملة المبلغ الثابت:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountForm((prev) => ({ ...prev, currency: "usd" }))
                    }
                    className={`py-1.5 px-3 rounded-xl border text-xs font-semibold ${
                      discountForm.currency === "usd"
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    دولار أمريكي (USD)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountForm((prev) => ({ ...prev, currency: "syp" }))
                    }
                    className={`py-1.5 px-3 rounded-xl border text-xs font-semibold ${
                      discountForm.currency === "syp"
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    ليرة سورية (SYP)
                  </button>
                </div>
              </div>
            )}

            {/* Value Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                {discountForm.discount_type === "percentage"
                  ? "نسبة الخصم المئوية (%):"
                  : `قيمة الخصم (${discountForm.currency.toUpperCase()}):`}
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                max={
                  discountForm.discount_type === "percentage"
                    ? "100"
                    : undefined
                }
                placeholder={
                  discountForm.discount_type === "percentage"
                    ? "مثلاً: 10 (أي 10%)"
                    : discountForm.currency === "usd"
                      ? "مثلاً: 100"
                      : "مثلاً: 1000000"
                }
                value={discountForm.value}
                onChange={(e) =>
                  setDiscountForm((prev) => ({
                    ...prev,
                    value: e.target.value,
                  }))
                }
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            </div>

            {/* If Fixed SYP: Exchange Rate */}
            {discountForm.discount_type === "fixed" &&
              discountForm.currency === "syp" && (
                <div className="space-y-3 p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      سعر صرف الليرة مقابل الدولار وقت الخصم:
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      placeholder="مثلاً: 14500"
                      value={discountForm.exchange_rate_syp_per_usd}
                      onChange={(e) =>
                        setDiscountForm((prev) => ({
                          ...prev,
                          exchange_rate_syp_per_usd: e.target.value,
                        }))
                      }
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      required
                    />
                  </div>

                  {dynamicDiscountUsdPreview && (
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900 border-t border-amber-200/80 pt-2">
                      <span>المكافئ المحتسب بالدولار:</span>
                      <span className="text-sm font-black text-rose-700">
                        {formatUSD(dynamicDiscountUsdPreview)}
                      </span>
                    </div>
                  )}
                </div>
              )}

            {/* Reason Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                سبب الخصم المالي:
              </label>
              <input
                type="text"
                placeholder="مثلاً: خصم إخوة / تفوق دراسي / قرار إدارة"
                value={discountForm.reason}
                onChange={(e) =>
                  setDiscountForm((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDiscountModalOpen(false)}
                disabled={isDiscountSubmitting}
                className="text-xs px-4"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isDiscountSubmitting}
                disabled={
                  isDiscountSubmitting ||
                  !discountForm.value ||
                  !discountForm.reason
                }
                className="text-xs px-5 font-bold shadow-sm"
              >
                إضافة الخصم
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 10. CANCEL TRANSACTION MODAL (Admin Only)                    */}
      {/* ============================================================ */}
      {allowCancel && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title="تأكيد إلغاء العملية المالية"
          maxWidth="max-w-md"
        >
          <form
            onSubmit={handleSubmitCancel}
            className="space-y-4 text-right dir-rtl"
            dir="rtl"
          >
            {cancelModalError && (
              <Alert type="error" title="تنبيه">
                {cancelModalError}
              </Alert>
            )}

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  هل أنت متأكد من رغبتك في إلغاء {cancelTarget?.title}؟
                </p>
                <p className="text-[11px] leading-relaxed text-rose-700">
                  سيتم تمييز السجل كـ (ملغى) واستبعاده تلقائياً من مجاميع الحساب
                  والمتبقي، وسيبقى محفوظاً في السجل التاريخي للتدقيق.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                سبب الإلغاء (إلزامي):
              </label>
              <textarea
                rows={3}
                placeholder="اكتب هنا سبب إلغاء هذه العملية المالية بالتفصيل..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelSubmitting}
                className="text-xs px-4"
              >
                تراجع
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                isLoading={isCancelSubmitting}
                disabled={isCancelSubmitting || !cancelReason.trim()}
                className="text-xs px-5 font-bold shadow-sm"
              >
                تأكيد الإلغاء
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 11. REMAINING SYP PREVIEW MODAL                              */}
      {/* ============================================================ */}
      {allowPreviewSyp && (
        <Modal
          isOpen={isSypPreviewModalOpen}
          onClose={() => setIsSypPreviewModalOpen(false)}
          title="معاينة المتبقي بالليرة السورية (SYP Preview)"
          maxWidth="max-w-md"
        >
          <form
            onSubmit={handleSubmitSypPreview}
            className="space-y-4 text-right dir-rtl"
            dir="rtl"
          >
            {sypPreviewError && (
              <Alert type="error" title="تنبيه">
                {sypPreviewError}
              </Alert>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                المتبقي الحالي بالدولار:
              </span>
              <span className="font-bold text-amber-700 text-sm">
                {formatUSD(activeTotals.remaining_usd)}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                سعر صرف الليرة السورية الحالي مقابل 1 دولار:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="مثلاً: 14500"
                  value={sypRateInput}
                  onChange={(e) => setSypRateInput(e.target.value)}
                  className="flex-1 p-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSypPreviewLoading}
                  disabled={isSypPreviewLoading || !sypRateInput}
                  className="text-xs px-4 font-bold"
                >
                  احتساب
                </Button>
              </div>
            </div>

            {sypPreviewResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-emerald-800 font-medium">
                  <span>المتبقي بالدولار:</span>
                  <span className="font-bold">
                    {formatUSD(
                      sypPreviewResult.remaining_usd ||
                        activeTotals.remaining_usd,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-emerald-800 font-medium">
                  <span>سعر الصرف المستخدم:</span>
                  <span className="font-bold">
                    {sypPreviewResult.exchange_rate_syp_per_usd || sypRateInput}{" "}
                    ل.س / $
                  </span>
                </div>
                <div className="border-t border-emerald-200 pt-2 flex items-center justify-between text-emerald-950 font-black text-sm">
                  <span>المبلغ المطلوب بالليرة السورية:</span>
                  <span className="text-base text-emerald-800">
                    {formatSYP(
                      sypPreviewResult.remaining_syp ||
                        sypPreviewResult.remaining_amount_syp,
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSypPreviewModalOpen(false)}
                className="text-xs px-4"
              >
                إغلاق
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* 12. TUITION PLAN FORM MODAL (Admin Only)                     */}
      {/* ============================================================ */}
      {allowTuitionPlans && (
        <Modal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          title={
            editingPlan
              ? "تعديل القسط السنوي للصف"
              : "إضافة سعر صف دراسي (Tuition Plan)"
          }
          maxWidth="max-w-md"
        >
          <form
            onSubmit={handleSubmitPlan}
            className="space-y-4 text-right dir-rtl"
            dir="rtl"
          >
            {planModalError && (
              <Alert type="error" title="تنبيه">
                {planModalError}
              </Alert>
            )}

            {/* Academic Year */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                السنة الدراسية:
              </label>
              <select
                value={planForm.academic_year}
                onChange={(e) =>
                  setPlanForm((prev) => ({
                    ...prev,
                    academic_year: e.target.value,
                  }))
                }
                disabled={Boolean(editingPlan)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium bg-white disabled:bg-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              >
                <option value="">اختر السنة الدراسية</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name || y.year}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Level */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                الصف الدراسي:
              </label>
              <select
                value={planForm.grade_level}
                onChange={(e) =>
                  setPlanForm((prev) => ({
                    ...prev,
                    grade_level: e.target.value,
                  }))
                }
                disabled={Boolean(editingPlan)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium bg-white disabled:bg-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                required
              >
                <option value="">اختر الصف الدراسي</option>
                {gradeLevels.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Base Tuition USD */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                القسط السنوي الأساسي بالدولار الأمريكي (USD):
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="مثلاً: 1000"
                  value={planForm.base_tuition_usd}
                  onChange={(e) =>
                    setPlanForm((prev) => ({
                      ...prev,
                      base_tuition_usd: e.target.value,
                    }))
                  }
                  className="w-full pr-9 pl-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPlanModalOpen(false)}
                disabled={isPlanSubmitting}
                className="text-xs px-4"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isPlanSubmitting}
                disabled={isPlanSubmitting || !planForm.base_tuition_usd}
                className="text-xs px-5 font-bold shadow-sm"
              >
                {editingPlan ? "حفظ التعديل" : "إضافة الخطة وتوليد الحسابات"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
