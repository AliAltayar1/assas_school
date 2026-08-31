import React from 'react';
import { AuthCard } from '../../components/auth/AuthCard';
import { ChangePasswordForm } from '../../components/auth/ChangePasswordForm';

export function ChangePasswordPage() {
  return (
    <AuthCard
      title="تغيير كلمة المرور الإجباري"
      subtitle="حماية حسابك وخطوة الأمان الأساسية قبل استخدام النظام"
    >
      <ChangePasswordForm />
    </AuthCard>
  );
}
