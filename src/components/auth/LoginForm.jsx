import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { User, Lock } from 'lucide-react';

export function LoginForm() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'اسم المستخدم أو البريد الإلكتروني مطلوب';
    }
    if (!password) {
      newErrors.password = 'كلمة المرور مطلوبة';
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
      const user = await login(identifier, password);

      // Handle Forced Password Change Lifecycle
      if (user.must_change_password) {
        navigate('/change-password', { replace: true });
        return;
      }

      // Navigate based on user role from backend
      const roleRoutes = {
        school_admin: '/admin',
        secretariat: '/secretariat',
        supervisor: '/supervisor',
        teacher: '/teacher',
      };

      const targetRoute = roleRoutes[user.role] || '/admin';
      navigate(targetRoute, { replace: true });
    } catch (_) {
      // Error handled via Zustand store state
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert type="error" title="خطأ في تسجيل الدخول">
          {error}
        </Alert>
      )}

      <Input
        label="اسم المستخدم أو البريد الإلكتروني"
        type="text"
        placeholder="أدخل اسم المستخدم أو الايميل"
        icon={User}
        value={identifier}
        onChange={(e) => {
          setIdentifier(e.target.value);
          if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: null }));
        }}
        error={errors.identifier}
        disabled={isSubmitting}
        autoComplete="username"
        required
      />

      <Input
        label="كلمة المرور"
        type="password"
        placeholder="••••••••"
        icon={Lock}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
        }}
        error={errors.password}
        disabled={isSubmitting}
        autoComplete="current-password"
        required
      />

      <Button
        type="submit"
        isLoading={isSubmitting}
        className="w-full mt-2"
        size="lg"
      >
        تسجيل الدخول
      </Button>

      <div className="pt-2 text-center text-xs text-slate-500">
        <p>مخصص لموظفي مدرسة أساس فقط (إدارة، سر، توجيه، تعليم)</p>
      </div>
    </form>
  );
}
