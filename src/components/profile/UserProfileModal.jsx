import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { toast } from 'sonner';
import { X, User, Mail, Shield, CheckCircle } from 'lucide-react';

export function UserProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, error, clearError } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        email: email,
      });

      toast.success('تم تحديث بيانات الحساب الشخصي بنجاح');
      onClose();
    } catch (_) {
      // Error in Zustand store state
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm dir-rtl" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-base">الملف الشخصي والحساب</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Readonly Identity Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block">اسم المستخدم:</span>
              <span className="font-mono font-bold text-slate-800">{user.username}</span>
            </div>
            <div className="text-left">
              <span className="text-slate-500 block">الدور الوظيفي:</span>
              <span className="inline-block bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-semibold mt-0.5">
                {user.role_display || user.role}
              </span>
            </div>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="الاسم الأول (First Name)"
              placeholder="أدخل الاسم الأول"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isSubmitting}
              required
            />

            <Input
              label="اسم العائلة (Last Name)"
              placeholder="أدخل الكنية / اسم العائلة"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isSubmitting}
              required
            />

            <Input
              label="البريد الإلكتروني (Email)"
              type="email"
              placeholder="name@example.com"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />

            <div className="pt-3 flex gap-3">
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="flex-1"
              >
                حفظ التعديلات
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
