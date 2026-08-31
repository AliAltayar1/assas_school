import React from 'react';
import { AuthCard } from '../../components/auth/AuthCard';
import { LoginForm } from '../../components/auth/LoginForm';

export function LoginPage() {
  return (
    <AuthCard
      title="تسجيل الدخول إلى البوابة الأكاديمية"
      subtitle="قم بإدخال بيانات حساب الموظف الخاص بك للمتابعة"
    >
      <LoginForm />
    </AuthCard>
  );
}
