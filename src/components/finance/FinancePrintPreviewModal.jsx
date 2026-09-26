import React from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Printer, Download, Eye, X } from "lucide-react";
import {
  generateStudentInvoiceHtml,
  generatePaymentReceiptHtml,
  generateFinancialSummaryHtml,
  printStudentInvoice,
  printPaymentReceipt,
  printFinancialSummary,
} from "../../utils/financePrintUtils";

export function FinancePrintPreviewModal({
  isOpen,
  onClose,
  type = "student_invoice", // "student_invoice" | "payment_receipt" | "financial_summary"
  data = {},
  requesterUser = null,
}) {
  if (!isOpen) return null;

  // توليد محتوى HTML للمعاينة والطباعة
  let previewHtml = "";
  let modalTitle = "معاينة الطباعة";

  if (type === "student_invoice") {
    modalTitle = `معاينة فاتورة وكشف حساب: ${data?.student_display || "الطالب"}`;
    previewHtml = generateStudentInvoiceHtml({
      accountDetails: data,
      requesterUser,
    });
  } else if (type === "payment_receipt") {
    modalTitle = `معاينة سند قبض: ${data?.account?.student_display || "الطالب"}`;
    previewHtml = generatePaymentReceiptHtml({
      account: data?.account,
      payment: data?.payment,
      requesterUser,
    });
  } else if (type === "financial_summary") {
    modalTitle = "معاينة التقرير والملخص المالي العام للمدرسة";
    previewHtml = generateFinancialSummaryHtml({
      accounts: data?.accounts || [],
      stats: data?.stats || {},
      filters: data?.filters || {},
      requesterUser,
    });
  }

  const handlePrint = () => {
    if (type === "student_invoice") {
      printStudentInvoice(data, requesterUser);
    } else if (type === "payment_receipt") {
      printPaymentReceipt(data.account, data.payment, requesterUser);
    } else if (type === "financial_summary") {
      printFinancialSummary({
        accounts: data.accounts,
        stats: data.stats,
        filters: data.filters,
        requesterUser,
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 text-right dir-rtl" dir="rtl">
        {/* Actions Bar */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Eye className="w-4 h-4 text-teal-600" />
            <span>معاينة المستند الرسمي قبل إرساله إلى الطابعة</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="gap-1.5 text-xs text-slate-600"
            >
              <span>إغلاق</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="gap-2 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند الآن</span>
            </Button>
          </div>
        </div>

        {/* Paper Document Preview Frame */}
        <div className="bg-slate-200/60 p-4 sm:p-6 rounded-2xl border border-slate-300 max-h-[70vh] overflow-y-auto shadow-inner">
          <div
            className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 mx-auto"
            style={{ maxWidth: "800px" }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </Modal>
  );
}
