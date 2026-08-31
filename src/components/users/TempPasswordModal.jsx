import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { toast } from 'sonner';
import { KeyRound, Copy, Check } from 'lucide-react';

export function TempPasswordModal({ isOpen, onClose, temporaryPassword, username }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !temporaryPassword) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    toast.success('تم نسخ كلمة المرور المؤقتة إلى الحافظة');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="كلمة المرور المؤقتة للحساب">
      <div className="space-y-4 text-right">
        <Alert type="warning" title="تنبيه أمني هام جداً">
          هذه هي كلمة المرور المؤقتة للحساب <strong>@{username}</strong>. يرجى نسخها وتسليمها لصاحب الحساب فوراً. لن تظهر هذه الكلمة مرة أخرى بعد إغلاق هذه النافذة.
        </Alert>

        <div className="bg-slate-900 text-teal-400 p-4 rounded-xl font-mono text-center text-lg font-bold tracking-wider relative border border-slate-800 shadow-inner flex items-center justify-between">
          <span className="select-all">{temporaryPassword}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs px-3 py-1.5 rounded-lg border border-teal-500/30 transition-all active:scale-95"
            title="نسخ كلمة المرور"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>نسخ</span>
              </>
            )}
          </button>
        </div>

        <div className="pt-2">
          <Button onClick={onClose} className="w-full" variant="primary">
            تم الفهم وإغلاق النافذة
          </Button>
        </div>
      </div>
    </Modal>
  );
}
