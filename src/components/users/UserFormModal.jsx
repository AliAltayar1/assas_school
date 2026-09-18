import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { parseApiError } from '../../utils/errorUtils';
import { User, Mail, CreditCard, Phone } from 'lucide-react';

export function UserFormModal({ isOpen, onClose, onSubmit, initialUser = null }) {
  const isEditing = Boolean(initialUser);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('teacher');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialUser) {
      setUsername(initialUser.username || '');
      setEmail(initialUser.email || '');
      setFirstName(initialUser.first_name || '');
      setLastName(initialUser.last_name || '');
      setNationalId(initialUser.national_id || '');
      setPhoneNumber(initialUser.phone_number || initialUser.phone || '');
      setRole(initialUser.role || 'teacher');
    } else {
      setUsername('');
      setEmail('');
      setFirstName('');
      setLastName('');
      setNationalId('');
      setPhoneNumber('');
      setRole('teacher');
    }
    setErrors({});
    setFormError(null);
  }, [initialUser, isOpen]);

  const validate = () => {
    const errs = {};
    if (!username.trim()) errs.username = 'اسم المستخدم مطلوب';
    if (!firstName.trim()) errs.firstName = 'الاسم الأول مطلوب';
    if (!lastName.trim()) errs.lastName = 'اسم العائلة مطلوب';
    if (!role) errs.role = 'الدور الوظيفي مطلوب';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
      };
      if (nationalId.trim()) payload.national_id = nationalId.trim();
      if (phoneNumber.trim()) payload.phone_number = phoneNumber.trim();

      await onSubmit(payload);

      onClose();
    } catch (err) {
      setFormError(parseApiError(err, 'حدث خطأ أثناء حفظ بيانات المستخدم. يرجى التأكد من المدخلات.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'تعديل بيانات المستخدم' : 'إضافة حساب جديد'}
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-right">
        {formError && <Alert type="error">{formError}</Alert>}

        <Input
          label="اسم المستخدم (Username)"
          placeholder="مثال: ahmad_parent أو ahmad_teacher"
          icon={User}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          disabled={isSubmitting}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="الاسم الأول"
            placeholder="مثال: أحمد"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={errors.firstName}
            disabled={isSubmitting}
            required
          />

          <Input
            label="اسم العائلة (الكنية)"
            placeholder="مثال: العلي"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={errors.lastName}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="الرقم الوطني / الهوية (اختياري)"
            placeholder="مثال: 01234567891"
            icon={CreditCard}
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            disabled={isSubmitting}
          />

          <Input
            label="رقم الهاتف (اختياري)"
            placeholder="مثال: 0933111222"
            icon={Phone}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <Input
          label="البريد الإلكتروني (Email)"
          type="email"
          placeholder="ahmad@example.com"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={isSubmitting}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            الدور / نوع الحساب (Role) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 bg-white text-xs px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="guardian">ولي أمر (guardian / parent)</option>
              <option value="teacher">معلم (teacher)</option>
              <option value="supervisor">موجه تربوي (supervisor)</option>
              <option value="secretariat">أمانة السر والمسجل (secretariat)</option>
              <option value="school_admin">إدارة المدرسة (school_admin)</option>
              <option value="tech_support">دعم تقني (tech_support)</option>
            </select>
          </div>
        </div>

        {!isEditing && (
          <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2">
            💡 ملاحظة: عند حفظ الحساب، سيقوم السيرفر بتوليد كلمة مرور مؤقتة وسيتم عرضها لك مرة واحدة فقط لتسليمها لصاحب الحساب.
          </p>
        )}

        <div className="pt-4 flex gap-3">
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {isEditing ? 'حفظ التغييرات' : 'إنشاء الحساب الآن'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}
