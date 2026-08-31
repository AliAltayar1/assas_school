import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { KeyRound, Lock, ShieldAlert } from 'lucide-react';

export function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { changePassword, error, clearError, user } = useAuthStore();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!oldPassword) {
      newErrors.oldPassword = 'كلمة المرور الحالية (المؤقتة) مطلوبة';
    }
    if (!newPassword) {
      newErrors.newPassword = 'كلمة المرور الجديدة مطلوبة';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'يجب أن تتكون كلمة المرور من 8 أرقام/أحرف على الأقل';
    }
    if (newPassword !== newPasswordConfirm) {
      newErrors.newPasswordConfirm = 'كلمتا المرور غير متطابقتين';
    }
    if (oldPassword && newPassword && oldPassword === newPassword) {
      newErrors.newPassword = 'يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const updatedUser = await changePassword(oldPassword, newPassword, newPasswordConfirm);

      // Navigate to role-specific dashboard after changing password
      const roleRoutes = {
        school_admin: '/admin',
        secretariat: '/secretariat',
        supervisor: '/supervisor',
        teacher: '/teacher',
      };

      const targetRoute = roleRoutes[updatedUser.role] || '/admin';
      navigate(targetRoute, { replace: true });
    } catch (_) {
      // Handled in Zustand state
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {user?.must_change_password && (
        <Alert type="warning" title="تنبيه أمني إجباري">
          أنت تستخدم كلمة مرور مؤقتة. يرجى اختيار كلمة مرور جديدة دائمية لمتابعة استخدام النظام الأكاديمي.
        </Alert>
      )}

      {error && (
        <Alert type="error" title="خطأ في تحديث كلمة المرور">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="كلمة المرور الحالية (المؤقتة)"
          type="password"
          placeholder="أدخل كلمة المرور الحالية"
          icon={KeyRound}
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          error={errors.oldPassword}
          disabled={isSubmitting}
          required
        />

        <Input
          label="كلمة المرور الجديدة"
          type="password"
          placeholder="أدخل كلمة مرور جديدة قوية (8 خانات على الأقل)"
          icon={Lock}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={errors.newPassword}
          disabled={isSubmitting}
          required
        />

        <Input
          label="تأكيد كلمة المرور الجديدة"
          type="password"
          placeholder="أعد أدخال كلمة المرور الجديدة"
          icon={Lock}
          value={newPasswordConfirm}
          onChange={(e) => setNewPasswordConfirm(e.target.value)}
          error={errors.newPasswordConfirm}
          disabled={isSubmitting}
          required
        />

        <Button
          type="submit"
          isLoading={isSubmitting}
          className="w-full mt-2"
          size="lg"
        >
          حفظ وتغيير كلمة المرور
        </Button>
      </form>
    </div>
  );
}
