import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle, Info, CheckCircle2, ShieldAlert, Trash2, PowerOff, RefreshCw } from "lucide-react";

/**
 * Reusable Confirmation Dialog for destructive or significant actions.
 *
 * @param {boolean} isOpen - Modal visibility state
 * @param {() => void} onClose - Close handler
 * @param {() => Promise<void>|void} onConfirm - Confirm action handler
 * @param {string} title - Dialog title
 * @param {string|React.ReactNode} message - Detailed confirmation message or instructions
 * @param {string} confirmText - Label on confirm button
 * @param {string} cancelText - Label on cancel button
 * @param {'danger'|'warning'|'info'|'success'|'teal'} variant - Visual color scheme
 * @param {boolean} isLoading - Loading state during async execution
 * @param {React.ReactNode} additionalContent - Optional extra form fields (e.g. date picker for end assignment)
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "تأكيد الإجراء",
  message = "هل أنت متأكد من رغبتك في متابعة هذا الإجراء؟",
  confirmText = "تأكيد ومتابعة",
  cancelText = "إلغاء",
  variant = "danger",
  isLoading = false,
  additionalContent = null,
}) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: Trash2,
      iconBg: "bg-rose-50 border-rose-200 text-rose-600",
      buttonVariant: "danger",
      buttonColor: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-amber-50 border-amber-200 text-amber-600",
      buttonVariant: "primary",
      buttonColor: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
    },
    deactivate: {
      icon: PowerOff,
      iconBg: "bg-amber-50 border-amber-200 text-amber-700",
      buttonVariant: "primary",
      buttonColor: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
    },
    info: {
      icon: Info,
      iconBg: "bg-sky-50 border-sky-200 text-sky-600",
      buttonVariant: "primary",
      buttonColor: "bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500",
    },
    success: {
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 border-emerald-200 text-emerald-600",
      buttonVariant: "primary",
      buttonColor: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
    },
    teal: {
      icon: RefreshCw,
      iconBg: "bg-teal-50 border-teal-200 text-teal-600",
      buttonVariant: "primary",
      buttonColor: "bg-teal-600 hover:bg-teal-700 text-white focus:ring-teal-500",
    },
  };

  const style = variantStyles[variant] || variantStyles.danger;
  const Icon = style.icon;

  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4 text-right">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-2xl border flex-shrink-0 ${style.iconBg}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
            <div className="text-xs text-slate-600 leading-relaxed">{message}</div>
          </div>
        </div>

        {additionalContent && <div className="pt-2">{additionalContent}</div>}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs font-semibold px-4"
          >
            {cancelText}
          </Button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${style.buttonColor}`}
          >
            {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
