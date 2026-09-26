/**
 * ==============================================================================
 * موديول طباعة الفواتير والسندات والتقارير المالية لنظام مدرسة أساس (Asas School)
 * ==============================================================================
 * 
 * الميزات المطبقة:
 * 1. طباعة فاتورة وكشف حساب مالي شامل لطالب معين (Student Invoice & Statement)
 * 2. طباعة سند قبض مالي منفرد لدفعة معينة (Payment Receipt Voucher)
 * 3. طباعة تقرير الملخص المالي الشامل للمدرسة (Comprehensive Financial Summary Report)
 * 4. تطبيق تصميم احترافي رسمي جاهز للطباعة فوراً متوافق مع مقاس A4 وبجودة عالية
 * 5. دعم الطباعة المباشرة عبر iframe معزول دون التأثير على واجهة المستخدم
 */

import logoMark from "../assets/logo-mark.png";

/**
 * تنسيق المبالغ بالدولار
 */
export function formatUSD(val) {
  const num = parseFloat(val || 0);
  return `$${num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * تنسيق المبالغ بالليرة السورية
 */
export function formatSYP(val) {
  const num = parseFloat(val || 0);
  return `${num.toLocaleString("en-US", { maximumFractionDigits: 0 })} ل.س`;
}

/**
 * تنسيق التاريخ والوقت العربي
 */
export function formatDateTime(isoString) {
  if (!isoString) return new Date().toLocaleDateString("ar-SY");
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleDateString("ar-SY", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (_) {
    return String(isoString);
  }
}

export function getCurrentDateStr() {
  const now = new Date();
  return now.toLocaleDateString("ar-SY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getCurrentTimeStr() {
  const now = new Date();
  return now.toLocaleTimeString("ar-SY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * دالة مساعدة للحصول على شارة حالة الدفع
 */
function getPaymentStatusLabel(status) {
  switch (status) {
    case "paid":
      return { text: "مسدد بالكامل", bg: "#dcfce7", color: "#15803d", border: "#86efac" };
    case "partial":
      return { text: "مسدد جزئياً", bg: "#fef3c7", color: "#b45309", border: "#fde68a" };
    case "unpaid":
    default:
      return { text: "غير مسدد", bg: "#ffe4e6", color: "#be123c", border: "#fecdd3" };
  }
}

/**
 * أنماط CSS الموحدة للطباعة الرسمية (A4)
 */
const PRINT_CSS = `
  @page {
    size: A4 portrait;
    margin: 12mm 15mm 15mm 15mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    margin: 0;
    padding: 0;
    color: #0f172a;
    direction: rtl;
    background: #ffffff;
    font-size: 11px;
    line-height: 1.5;
  }
  .invoice-container {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    padding: 0;
  }
  /* Header */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #0f766e;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .doc-header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .doc-logo {
    width: 54px;
    height: 54px;
    object-fit: contain;
  }
  .school-title {
    font-size: 16px;
    font-weight: 800;
    color: #0f766e;
    margin: 0;
  }
  .school-subtitle {
    font-size: 10px;
    color: #64748b;
    margin: 2px 0 0 0;
    font-weight: 500;
  }
  .doc-header-center {
    text-align: center;
  }
  .doc-badge-title {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    background: #f0fdfa;
    border: 1px solid #ccfbf1;
    padding: 4px 16px;
    border-radius: 20px;
    display: inline-block;
  }
  .doc-header-left {
    text-align: left;
    font-size: 10px;
    color: #475569;
  }
  .meta-item {
    margin-bottom: 2px;
  }
  .meta-item strong {
    color: #0f172a;
  }

  /* Info Grid */
  .info-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 16px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .info-cell {
    display: flex;
    flex-direction: column;
  }
  .info-label {
    font-size: 9.5px;
    color: #64748b;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .info-value {
    font-size: 11.5px;
    font-weight: 700;
    color: #0f172a;
  }

  /* Summary Cards */
  .summary-cards-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }
  .sum-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 10px;
    text-align: center;
  }
  .sum-card.primary {
    background: #f0fdfa;
    border-color: #5eead4;
  }
  .sum-card.paid {
    background: #f0fdf4;
    border-color: #86efac;
  }
  .sum-card.remaining {
    background: #fffbeb;
    border-color: #fde68a;
  }
  .sum-card.discount {
    background: #fff1f2;
    border-color: #fecdd3;
  }
  .sum-label {
    font-size: 9px;
    color: #64748b;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .sum-val {
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
  }
  .sum-val.green { color: #15803d; }
  .sum-val.amber { color: #b45309; }
  .sum-val.rose { color: #be123c; }
  .sum-val.teal { color: #0f766e; }

  /* Tables */
  .section-title {
    font-size: 11px;
    font-weight: 700;
    color: #0f766e;
    margin: 12px 0 6px 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .print-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 10px;
  }
  .print-table th {
    background: #0f766e;
    color: #ffffff;
    padding: 6px 8px;
    font-weight: 700;
    text-align: right;
    border: 1px solid #0d5c56;
  }
  .print-table td {
    padding: 5px 8px;
    border: 1px solid #e2e8f0;
    color: #1e293b;
  }
  .print-table tr:nth-child(even) td {
    background: #f8fafc;
  }
  .print-table td.center, .print-table th.center {
    text-align: center;
  }
  .print-table td.num, .print-table th.num {
    text-align: left;
    direction: ltr;
  }
  .print-table tfoot td {
    font-weight: 800;
    background: #f1f5f9;
    border-top: 2px solid #94a3b8;
  }

  /* Status Pill */
  .status-pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 9px;
    font-weight: 700;
    border: 1px solid transparent;
  }

  /* Notice Box */
  .notice-box {
    background: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 9.5px;
    color: #475569;
    margin-bottom: 20px;
    line-height: 1.6;
  }

  /* Signatures */
  .signatures-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-top: 24px;
    padding-top: 12px;
  }
  .sig-block {
    text-align: center;
    border-top: 1px solid #94a3b8;
    padding-top: 8px;
  }
  .sig-role {
    font-weight: 700;
    font-size: 10px;
    color: #0f172a;
    margin-bottom: 28px;
  }
  .sig-line {
    font-size: 9px;
    color: #94a3b8;
  }

  /* Footer */
  .doc-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
    font-size: 8.5px;
    color: #94a3b8;
  }
`;

/**
 * توليد HTML فاتورة وكشف حساب الطالب الشامل
 */
export function generateStudentInvoiceHtml({
  accountDetails,
  requesterUser = null,
}) {
  if (!accountDetails) return "";

  const totals = accountDetails.totals || {};
  const payments = Array.isArray(accountDetails.payments) ? accountDetails.payments : [];
  const discounts = Array.isArray(accountDetails.discounts) ? accountDetails.discounts : [];

  const studentName = accountDetails.student_display || "طالب مسجل";
  const gradeName = accountDetails.grade_level_display || "-";
  const yearName = accountDetails.academic_year_display || "-";
  const statusInfo = getPaymentStatusLabel(totals.payment_status);

  const activePayments = payments.filter((p) => !p.is_cancelled && p.status !== "cancelled");
  const activeDiscounts = discounts.filter((d) => !d.is_cancelled && d.status !== "cancelled");

  const invoiceNumber = `INV-${(accountDetails.id || "0000").substring(0, 8).toUpperCase()}`;
  const currentDate = getCurrentDateStr();
  const currentTime = getCurrentTimeStr();

  // Discount Rows HTML
  const discountsHtml =
    activeDiscounts.length > 0
      ? `
      <div class="section-title">قائمة الخصومات والمنح الدراسية المعتمدة</div>
      <table class="print-table">
        <thead>
          <tr>
            <th class="center" style="width: 40px;">#</th>
            <th>نوع الخصم</th>
            <th class="center">القيمة الأصلية</th>
            <th class="center">المعادل بالدولار</th>
            <th>سبب ومنحة الخصم</th>
            <th class="center">تاريخ الاعتماد</th>
          </tr>
        </thead>
        <tbody>
          ${activeDiscounts
            .map((d, i) => `
            <tr>
              <td class="center">${i + 1}</td>
              <td style="font-weight: 600;">${d.discount_type === "percentage" ? "نسبة مئوية" : "مبلغ ثابت"}</td>
              <td class="center font-mono">${d.discount_type === "percentage" ? `%${d.value}` : formatUSD(d.value)}</td>
              <td class="center font-mono" style="font-weight: 700; color: #be123c;">${formatUSD(d.equivalent_usd)}</td>
              <td>${d.reason || "-"}</td>
              <td class="center">${formatDateTime(d.created_at)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `
      : "";

  // Payments Rows HTML
  const paymentsHtml =
    activePayments.length > 0
      ? `
      <div class="section-title">سجل الدفعات وسندات القبض المسددة</div>
      <table class="print-table">
        <thead>
          <tr>
            <th class="center" style="width: 40px;">#</th>
            <th>رقم السند</th>
            <th class="center">تاريخ السداد</th>
            <th class="center">المبلغ المدفوع</th>
            <th class="center">العملة</th>
            <th class="center">سعر الصرف</th>
            <th class="center">المعادل بالدولار</th>
            <th>البيان / الملاحظة</th>
          </tr>
        </thead>
        <tbody>
          ${activePayments
            .map((p, i) => `
            <tr>
              <td class="center">${i + 1}</td>
              <td class="center font-mono" style="font-weight: 600;">REC-${(p.id || "").substring(0, 6).toUpperCase()}</td>
              <td class="center">${formatDateTime(p.created_at || p.payment_date)}</td>
              <td class="center font-mono" style="font-weight: 700;">${p.currency === "syp" ? formatSYP(p.amount) : formatUSD(p.amount)}</td>
              <td class="center">${p.currency === "syp" ? "ليرة سورية" : "دولار أمريكي"}</td>
              <td class="center font-mono">${p.exchange_rate_syp_per_usd ? `${parseFloat(p.exchange_rate_syp_per_usd).toLocaleString()} ل.س` : "-"}</td>
              <td class="center font-mono" style="font-weight: 700; color: #15803d;">${formatUSD(p.equivalent_usd || p.amount)}</td>
              <td>${p.note || "سداد قسط مدرسي"}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" style="text-align: right; font-weight: 700;">إجمالي المدفوعات المسددة:</td>
            <td class="center font-mono" style="font-weight: 800; color: #15803d;">${formatUSD(totals.total_paid_usd)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    `
      : `
      <div class="notice-box" style="text-align: center; color: #64748b;">
        لم يتم تسجيل أي دفعات مالية مسددة على هذا الحساب حتى تاريخ إصدار الفاتورة.
      </div>
    `;

  return `
    <div class="invoice-container">
      <!-- Header -->
      <div class="doc-header">
        <div class="doc-header-right">
          <img src="${logoMark}" alt="Logo" class="doc-logo" />
          <div>
            <h1 class="school-title">مدرسة أساس الخاصة</h1>
            <p class="school-subtitle">قسم الشؤون المالية والمحاسبة العامة</p>
          </div>
        </div>
        <div class="doc-header-center">
          <div class="doc-badge-title">فاتورة وكشف حساب مالي</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">رقم المستند: ${invoiceNumber}</div>
        </div>
        <div class="doc-header-left">
          <div class="meta-item"><strong>تاريخ الإصدار:</strong> ${currentDate}</div>
          <div class="meta-item"><strong>وقت الإصدار:</strong> ${currentTime}</div>
          <div class="meta-item">
            <strong>الحالة المالية:</strong>
            <span class="status-pill" style="background: ${statusInfo.bg}; color: ${statusInfo.color}; border-color: ${statusInfo.border};">
              ${statusInfo.text}
            </span>
          </div>
        </div>
      </div>

      <!-- Student Info Box -->
      <div class="info-box">
        <div class="info-grid">
          <div class="info-cell">
            <span class="info-label">اسم الطالب الكامل</span>
            <span class="info-value" style="font-size: 13px; color: #0f766e;">${studentName}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">الصف الدراسي</span>
            <span class="info-value">${gradeName}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">العام الدراسي</span>
            <span class="info-value">${yearName}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">المعرف المالي للحساب</span>
            <span class="info-value font-mono" style="font-size: 10px;">${(accountDetails.id || "").substring(0, 18)}...</span>
          </div>
        </div>
      </div>

      <!-- Financial Totals Summary Cards -->
      <div class="summary-cards-grid">
        <div class="sum-card primary">
          <div class="sum-label">القسط الأساسي</div>
          <div class="sum-val teal">${formatUSD(totals.base_tuition_usd)}</div>
        </div>
        <div class="sum-card discount">
          <div class="sum-label">إجمالي الخصومات</div>
          <div class="sum-val rose">${formatUSD(totals.total_discounts_usd)}</div>
        </div>
        <div class="sum-card">
          <div class="sum-label">القسط الصافي المطلوب</div>
          <div class="sum-val">${formatUSD(totals.net_tuition_usd)}</div>
        </div>
        <div class="sum-card paid">
          <div class="sum-label">إجمالي المدفوع</div>
          <div class="sum-val green">${formatUSD(totals.total_paid_usd)}</div>
        </div>
        <div class="sum-card remaining">
          <div class="sum-label">الرصيد المتبقي ذمة</div>
          <div class="sum-val amber">${formatUSD(totals.remaining_usd)}</div>
        </div>
      </div>

      <!-- Discounts Section -->
      ${discountsHtml}

      <!-- Payments Section -->
      ${paymentsHtml}

      <!-- Notice -->
      <div class="notice-box">
        <strong>ملاحظة هامة:</strong> يعتبر هذا المستند إشعاراً مالياً رسمياً صادراً عن إدارة مدرسة أساس. يرجى مراجعة الإدارة المالية والاحتفاظ بسندات القبض الموقعة للرجوع إليها عند الحاجة.
      </div>

      <!-- Signatures -->
      <div class="signatures-grid">
        <div class="sig-block">
          <div class="sig-role">أمين الصندوق / المحاسب</div>
          <div class="sig-line">التوقيع: ...........................</div>
        </div>
        <div class="sig-block">
          <div class="sig-role">المدير المالي والختم الرسمي</div>
          <div class="sig-line">الختم والتوقيع: ...........................</div>
        </div>
        <div class="sig-block">
          <div class="sig-role">ولي الأمر المستلم</div>
          <div class="sig-line">الاسم والتوقيع: ...........................</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="doc-footer">
        <span>نظام أساس لإدارة المدارس • قسم المحاسبة</span>
        <span>طُبع بواسطة: ${requesterUser?.full_name || requesterUser?.username || "المسؤول المالي"}</span>
        <span>صفحة 1 من 1</span>
      </div>
    </div>
  `;
}

/**
 * توليد HTML سند قبض دفعة معينة (Payment Receipt Voucher)
 */
export function generatePaymentReceiptHtml({
  account,
  payment,
  requesterUser = null,
}) {
  if (!account || !payment) return "";

  const studentName = account.student_display || "طالب مسجل";
  const gradeName = account.grade_level_display || "-";
  const yearName = account.academic_year_display || "-";
  const receiptNum = `REC-${(payment.id || "0000").substring(0, 8).toUpperCase()}`;
  const currentDate = getCurrentDateStr();

  const isSYP = payment.currency === "syp";
  const paidAmountStr = isSYP ? formatSYP(payment.amount) : formatUSD(payment.amount);
  const equivUsdStr = formatUSD(payment.equivalent_usd || payment.amount);

  return `
    <div class="invoice-container" style="max-width: 650px; margin: 0 auto; border: 2px solid #0f766e; border-radius: 12px; padding: 20px;">
      <!-- Header -->
      <div class="doc-header" style="border-bottom: 2px dashed #0f766e; padding-bottom: 12px;">
        <div class="doc-header-right">
          <img src="${logoMark}" alt="Logo" class="doc-logo" style="width: 48px; height: 48px;" />
          <div>
            <h1 class="school-title" style="font-size: 15px;">مدرسة أساس الخاصة</h1>
            <p class="school-subtitle">سند قبض مالي معتمد</p>
          </div>
        </div>
        <div class="doc-header-center">
          <div class="doc-badge-title" style="font-size: 13px;">سند قبض نقدي</div>
        </div>
        <div class="doc-header-left">
          <div class="meta-item"><strong>رقم السند:</strong> <span class="font-mono">${receiptNum}</span></div>
          <div class="meta-item"><strong>التاريخ:</strong> ${formatDateTime(payment.created_at || payment.payment_date || currentDate)}</div>
        </div>
      </div>

      <!-- Receipt Content -->
      <div style="margin: 18px 0; font-size: 12px; line-height: 2;">
        <p style="margin: 6px 0;">
          وصلنا من ولي أمر الطالب/ـة: <strong style="color: #0f766e; font-size: 13px;">${studentName}</strong>
        </p>
        <p style="margin: 6px 0;">
          المقيد بالصف: <strong>${gradeName}</strong> — للعام الدراسي: <strong>${yearName}</strong>
        </p>
        <p style="margin: 8px 0; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 8px 12px;">
          مبلغ وقدره: <strong style="font-size: 15px; color: #15803d; font-family: monospace;">${paidAmountStr}</strong>
          ${isSYP && payment.exchange_rate_syp_per_usd ? `(ما يعادل: <strong>${equivUsdStr}</strong> بسعر صرف ${parseFloat(payment.exchange_rate_syp_per_usd).toLocaleString()} ل.س)` : ""}
        </p>
        <p style="margin: 6px 0;">
          وذلك لقاء: <strong>${payment.note || "سداد جزء من القسط الدراسي السنوي"}</strong>
        </p>
        ${account.totals?.remaining_usd ? `
          <p style="margin: 6px 0; font-size: 11px; color: #64748b;">
            الرصيد المتبقي ذمة بعد هذه الدفعة: <strong style="color: #b45309;">${formatUSD(account.totals.remaining_usd)}</strong>
          </p>
        ` : ""}
      </div>

      <!-- Signatures -->
      <div class="signatures-grid" style="grid-template-columns: 1fr 1fr; margin-top: 24px;">
        <div class="sig-block">
          <div class="sig-role">أمين الصندوق المستلم</div>
          <div class="sig-line">الاسم والتوقيع: ...........................</div>
        </div>
        <div class="sig-block">
          <div class="sig-role">الدافع / ولي الأمر</div>
          <div class="sig-line">الاسم والتوقيع: ...........................</div>
        </div>
      </div>

      <div class="doc-footer" style="margin-top: 16px;">
        <span>نظام أساس لإدارة المدارس</span>
        <span>طُبع بواسطة: ${requesterUser?.full_name || requesterUser?.username || "المحاسب"}</span>
      </div>
    </div>
  `;
}

/**
 * توليد HTML لتقرير الملخص المالي الشامل للمدرسة (Comprehensive Financial Summary Report)
 */
export function generateFinancialSummaryHtml({
  accounts = [],
  stats = {},
  filters = {},
  requesterUser = null,
}) {
  const currentDate = getCurrentDateStr();
  const currentTime = getCurrentTimeStr();

  // حساب المجاميع المالية العامة
  let sumBase = 0;
  let sumDiscounts = 0;
  let sumNet = 0;
  let sumPaid = 0;
  let sumRemaining = 0;

  accounts.forEach((acc) => {
    const t = acc.totals || {};
    sumBase += parseFloat(t.base_tuition_usd || 0);
    sumDiscounts += parseFloat(t.total_discounts_usd || 0);
    sumNet += parseFloat(t.net_tuition_usd || 0);
    sumPaid += parseFloat(t.total_paid_usd || 0);
    sumRemaining += parseFloat(t.remaining_usd || 0);
  });

  const collectionRate = sumNet > 0 ? Math.min(100, Math.round((sumPaid / sumNet) * 100)) : 0;

  // أسطر جدول الحسابات
  const tableRowsHtml = accounts
    .map((acc, index) => {
      const t = acc.totals || {};
      const statusInfo = getPaymentStatusLabel(t.payment_status);

      return `
      <tr>
        <td class="center">${index + 1}</td>
        <td style="font-weight: 700; color: #0f172a;">${acc.student_display || "طالب مسجل"}</td>
        <td>${acc.grade_level_display || "-"}</td>
        <td class="center">${acc.academic_year_display || "-"}</td>
        <td class="center font-mono">${formatUSD(t.base_tuition_usd)}</td>
        <td class="center font-mono" style="color: #be123c;">${formatUSD(t.total_discounts_usd)}</td>
        <td class="center font-mono" style="font-weight: 700;">${formatUSD(t.net_tuition_usd)}</td>
        <td class="center font-mono" style="font-weight: 700; color: #15803d;">${formatUSD(t.total_paid_usd)}</td>
        <td class="center font-mono" style="font-weight: 700; color: #b45309;">${formatUSD(t.remaining_usd)}</td>
        <td class="center">
          <span class="status-pill" style="background: ${statusInfo.bg}; color: ${statusInfo.color}; border-color: ${statusInfo.border};">
            ${statusInfo.text}
          </span>
        </td>
      </tr>
    `;
    })
    .join("");

  return `
    <div class="invoice-container">
      <!-- Header -->
      <div class="doc-header">
        <div class="doc-header-right">
          <img src="${logoMark}" alt="Logo" class="doc-logo" />
          <div>
            <h1 class="school-title">مدرسة أساس الخاصة</h1>
            <p class="school-subtitle">تقرير الإدارة المالية • كشف الأقساط والتحصيل العام</p>
          </div>
        </div>
        <div class="doc-header-center">
          <div class="doc-badge-title">الملخص المالي الشامل</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
            ${filters.yearName ? `العام الدراسي: ${filters.yearName}` : "كافة السنوات الدراسية"}
            ${filters.gradeName ? ` • الصف: ${filters.gradeName}` : ""}
          </div>
        </div>
        <div class="doc-header-left">
          <div class="meta-item"><strong>تاريخ التقرير:</strong> ${currentDate}</div>
          <div class="meta-item"><strong>وقت الاستخراج:</strong> ${currentTime}</div>
          <div class="meta-item"><strong>إجمالي الحسابات:</strong> ${accounts.length} طالب</div>
        </div>
      </div>

      <!-- KPI Executive Summary Grid -->
      <div class="summary-cards-grid" style="grid-template-columns: repeat(6, 1fr); margin-bottom: 14px;">
        <div class="sum-card">
          <div class="sum-label">إجمالي الأساسي</div>
          <div class="sum-val">${formatUSD(sumBase)}</div>
        </div>
        <div class="sum-card discount">
          <div class="sum-label">إجمالي الخصومات</div>
          <div class="sum-val rose">${formatUSD(sumDiscounts)}</div>
        </div>
        <div class="sum-card primary">
          <div class="sum-label">المستحق الصافي</div>
          <div class="sum-val teal">${formatUSD(sumNet)}</div>
        </div>
        <div class="sum-card paid">
          <div class="sum-label">إجمالي المحصل</div>
          <div class="sum-val green">${formatUSD(sumPaid)}</div>
        </div>
        <div class="sum-card remaining">
          <div class="sum-label">المتبقي (الديون)</div>
          <div class="sum-val amber">${formatUSD(sumRemaining)}</div>
        </div>
        <div class="sum-card primary">
          <div class="sum-label">نسبة التحصيل</div>
          <div class="sum-val teal">%${collectionRate}</div>
        </div>
      </div>

      <!-- Status Counts Strip -->
      <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 14px; margin-bottom: 12px; font-size: 10px;">
        <span><strong>مسددة بالكامل:</strong> <span style="color: #15803d; font-weight: 700;">${stats.paid || 0} حساب</span></span>
        <span><strong>مدفوعة جزئياً:</strong> <span style="color: #b45309; font-weight: 700;">${stats.partial || 0} حساب</span></span>
        <span><strong>غير مدفوعة:</strong> <span style="color: #be123c; font-weight: 700;">${stats.unpaid || 0} حساب</span></span>
        <span><strong>إجمالي الطلاب المدرجين:</strong> <strong>${accounts.length}</strong></span>
      </div>

      <!-- Detailed Accounts Table -->
      <div class="section-title">كشف تفصيلي بحسابات الطلاب المالية (${accounts.length} طالب)</div>
      <table class="print-table">
        <thead>
          <tr>
            <th class="center" style="width: 30px;">#</th>
            <th>اسم الطالب</th>
            <th>الصف الدراسي</th>
            <th class="center">العام</th>
            <th class="center">الأساسي</th>
            <th class="center">الخصم</th>
            <th class="center">الصافي</th>
            <th class="center">المسدد</th>
            <th class="center">المتبقي</th>
            <th class="center">الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="text-align: right; font-weight: 800;">الإجمالي الكلي لجميع الحسابات المدرجة:</td>
            <td class="center font-mono" style="font-weight: 800;">${formatUSD(sumBase)}</td>
            <td class="center font-mono" style="font-weight: 800; color: #be123c;">${formatUSD(sumDiscounts)}</td>
            <td class="center font-mono" style="font-weight: 800;">${formatUSD(sumNet)}</td>
            <td class="center font-mono" style="font-weight: 800; color: #15803d;">${formatUSD(sumPaid)}</td>
            <td class="center font-mono" style="font-weight: 800; color: #b45309;">${formatUSD(sumRemaining)}</td>
            <td class="center" style="font-weight: 800; color: #0f766e;">%${collectionRate}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Signatures -->
      <div class="signatures-grid">
        <div class="sig-block">
          <div class="sig-role">إعداد وتدقيق المحاسب المالي</div>
          <div class="sig-line">التوقيع: ...........................</div>
        </div>
        <div class="sig-block">
          <div class="sig-role">اعتماد المدير المالي</div>
          <div class="sig-line">التوقيع: ...........................</div>
        </div>
        <div class="sig-block">
          <div class="sig-role">مصادقة مدير المدرسة والخاتم</div>
          <div class="sig-line">الختم والتوقيع: ...........................</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="doc-footer">
        <span>تقرير مالي رسمي • نظام مدرسة أساس</span>
        <span>طُبع بواسطة: ${requesterUser?.full_name || requesterUser?.username || "الإدارة المالية"}</span>
        <span>تاريخ الطباعة: ${currentDate}</span>
      </div>
    </div>
  `;
}

/**
 * المحرك الرئيسي للطباعة عبر Iframe معزول ونظيف تماماً
 *
 * @param {Object} params
 * @param {string} params.title عنوان الصفحة المطبوعة
 * @param {string} params.contentHtml محتوى الـ HTML المصمم للطباعة
 */
export function printHtmlDocument({ title, contentHtml }) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>${title || "طباعة مستند مالي"}</title>
        <style>
          ${PRINT_CSS}
        </style>
      </head>
      <body>
        ${contentHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
              setTimeout(function() {
                if (window.frameElement && window.frameElement.parentNode) {
                  window.frameElement.parentNode.removeChild(window.frameElement);
                }
              }, 1200);
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();
}

/**
 * دالة طباعة فاتورة وكشف حساب الطالب
 */
export function printStudentInvoice(accountDetails, requesterUser = null) {
  const contentHtml = generateStudentInvoiceHtml({ accountDetails, requesterUser });
  const studentName = accountDetails.student_display || "الطالب";
  printHtmlDocument({
    title: `فاتورة_وكشف_حساب_${studentName}`,
    contentHtml,
  });
}

/**
 * دالة طباعة سند قبض دفعة مفردة
 */
export function printPaymentReceipt(account, payment, requesterUser = null) {
  const contentHtml = generatePaymentReceiptHtml({ account, payment, requesterUser });
  const studentName = account.student_display || "الطالب";
  printHtmlDocument({
    title: `سند_قبض_${studentName}`,
    contentHtml,
  });
}

/**
 * دالة طباعة تقرير الملخص المالي العام
 */
export function printFinancialSummary({
  accounts,
  stats,
  filters,
  requesterUser = null,
}) {
  const contentHtml = generateFinancialSummaryHtml({
    accounts,
    stats,
    filters,
    requesterUser,
  });
  printHtmlDocument({
    title: `التقرير_المالي_الشامل_مدرسة_أساس`,
    contentHtml,
  });
}
