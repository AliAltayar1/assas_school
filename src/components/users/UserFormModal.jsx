import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { parseApiError } from '../../utils/errorUtils';
import { User, Mail, CreditCard, Phone } from 'lucide-react';

// Syrian Mobile Number Helpers
export function normalizeSyrianPhone(phone) {
  if (!phone) return '';
  let clean = phone.toString().replace(/[\s\-()]/g, '');
  if (clean.startsWith('+963')) {
    clean = '0' + clean.slice(4);
  } else if (clean.startsWith('00963')) {
    clean = '0' + clean.slice(5);
  } else if (clean.startsWith('963') && clean.length === 12) {
    clean = '0' + clean.slice(3);
  }
  return clean;
}

export function isValidSyrianPhone(phone) {
  if (!phone) return false;
  const normalized = normalizeSyrianPhone(phone);
  // Syrian mobile starts with 09 and has 10 digits total: 09XXXXXXXX
  return /^09\d{8}$/.test(normalized);
}

export function isValidNationalId(id) {
  if (!id) return false;
  const clean = id.toString().trim();
  // Syrian National ID has exactly 11 digits
  return /^\d{11}$/.test(clean);
}

export function UserFormModal({ isOpen, onClose, onSubmit, initialUser = null }) {
  const isEditing = Boolean(initialUser);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('teacher');
  const [scopeType, setScopeType] = useState('');
  const [selectedStages, setSelectedStages] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialUser) {
      setUsername(initialUser.username || '');
      setEmail(initialUser.email || '');
      setFirstName(initialUser.first_name || '');
      setLastName(initialUser.last_name || '');
      setNationalId(
        initialUser.national_id ||
        initialUser.national_number ||
        initialUser.guardian?.national_id ||
        initialUser.profile?.national_id ||
        initialUser.profile?.national_number ||
        initialUser.guardian_profile?.national_id ||
        initialUser.staff_profile?.national_id ||
        ''
      );
      setPhoneNumber(
        initialUser.phone_number ||
        initialUser.phone ||
        initialUser.primary_phone ||
        initialUser.guardian?.phone_number ||
        initialUser.profile?.phone ||
        initialUser.profile?.phone_number ||
        initialUser.guardian_profile?.phone_number ||
        initialUser.guardian_profile?.primary_phone ||
        initialUser.staff_profile?.phone ||
        initialUser.staff_profile?.phone_number ||
        ''
      );
      setRole(initialUser.role || 'teacher');

      // Extract actual stored SupervisorScope without assuming 'all'
      const rawScope =
        initialUser.supervisor_scope ||
        initialUser.scope ||
        initialUser.staff_profile?.supervisor_scope ||
        (initialUser.scope_type ? { scope_type: initialUser.scope_type, stages: initialUser.stages } : null);

      if (rawScope && rawScope.scope_type) {
        setScopeType(rawScope.scope_type);
        setSelectedStages(Array.isArray(rawScope.stages) ? rawScope.stages : []);
      } else {
        setScopeType('');
        setSelectedStages([]);
      }
    } else {
      setUsername('');
      setEmail('');
      setFirstName('');
      setLastName('');
      setNationalId('');
      setPhoneNumber('');
      setRole('teacher');
      setScopeType('');
      setSelectedStages([]);
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

    if (role === 'supervisor') {
      if (!scopeType) {
        errs.scopeType = 'يرجى تحديد نطاق عمل الموجّه (كل المدرسة أو مراحل محددة)';
      } else if (scopeType === 'selected_stages' && selectedStages.length === 0) {
        errs.selectedStages = 'يجب اختيار مرحلة واحدة على الأقل عند تحديد مراحل مخصصة للموجّه';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const cleanNatId = nationalId.trim();
      const cleanPhone = phoneNumber.trim();

      const payload = {
        username: username.trim(),
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role,
      };

      if (role === 'supervisor' && scopeType) {
        const scopeData = {
          scope_type: scopeType,
          stages: scopeType === 'selected_stages' ? selectedStages : [],
        };
        payload.supervisor_scope = scopeData;
        payload.scope_type = scopeType;
        payload.stages = scopeType === 'selected_stages' ? selectedStages : [];
      }

      // 1. Direct fields on payload
      if (cleanNatId) {
        payload.national_id = cleanNatId;
        payload.national_number = cleanNatId;
      } else if (isEditing) {
        payload.national_id = '';
        payload.national_number = '';
      }

      if (cleanPhone) {
        payload.phone_number = cleanPhone;
        payload.phone = cleanPhone;
      } else if (isEditing) {
        payload.phone_number = '';
        payload.phone = '';
      }

      // 2. Guardian object matching StudentRegistrationModal:
      payload.guardian = {
        national_id: cleanNatId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        relationship: 'ولي أمر',
      };
      if (cleanPhone) {
        payload.guardian.phone_number = cleanPhone;
      }

      // 3. Profile objects for broader backend compatibility
      payload.profile = {
        national_id: cleanNatId,
        phone_number: cleanPhone,
        phone: cleanPhone,
      };

      if (role === 'guardian') {
        payload.guardian_profile = {
          national_id: cleanNatId,
          phone_number: cleanPhone,
          primary_phone: cleanPhone,
          display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        };
      } else {
        payload.staff_profile = {
          national_id: cleanNatId,
          phone: cleanPhone,
          phone_number: cleanPhone,
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        };
        if (role === 'supervisor' && scopeType) {
          payload.staff_profile.supervisor_scope = {
            scope_type: scopeType,
            stages: scopeType === 'selected_stages' ? selectedStages : [],
          };
        }
      }

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
          <div>
            <Input
              label="الرقم الوطني / الهوية"
              placeholder="مثال: 01234567891"
              icon={CreditCard}
              value={nationalId}
              onChange={(e) => {
                setNationalId(e.target.value);
                if (errors.nationalId) {
                  setErrors((prev) => ({ ...prev, nationalId: undefined }));
                }
              }}
              error={errors.nationalId}
              disabled={isSubmitting}
              dir="ltr"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              الرقم الوطني {nationalId ? `(${nationalId.length})` : ''}
            </span>
          </div>

          <div>
            <Input
              label="رقم الهاتف"
              placeholder="مثال: 0933111222"
              icon={Phone}
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (errors.phoneNumber) {
                  setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                }
              }}
              error={errors.phoneNumber}
              disabled={isSubmitting}
              dir="ltr"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              رقم الهاتف المحمول
            </span>
          </div>
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
              <option value="accountant">المحاسب (accountant)</option>
              <option value="secretariat">أمانة السر والمسجل (secretariat)</option>
              <option value="school_admin">إدارة المدرسة (school_admin)</option>
              <option value="tech_support">دعم تقني (tech_support)</option>
            </select>
          </div>
        </div>

        {role === 'supervisor' && (
          <div className="bg-purple-50/70 border border-purple-200/90 rounded-xl p-3.5 space-y-3">
            <div>
              <label className="block text-xs font-bold text-purple-950 mb-1">
                نطاق إشراف الموجّه (Supervisor Scope) <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-purple-800/80 mb-2">
                حدد نطاق البيانات والصلاحيات الميدانية الخاضعة لإشراف هذا الموجّه
              </p>

              <div className="grid grid-cols-2 gap-2">
                <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-semibold transition-all ${
                  scopeType === 'all'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-purple-300'
                }`}>
                  <input
                    type="radio"
                    name="scope_type"
                    value="all"
                    checked={scopeType === 'all'}
                    onChange={() => {
                      setScopeType('all');
                      if (errors.scopeType) setErrors(prev => ({ ...prev, scopeType: undefined }));
                    }}
                    className="sr-only"
                    disabled={isSubmitting}
                  />
                  <span>كل المدرسة (المدرسة كاملة)</span>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs font-semibold transition-all ${
                  scopeType === 'selected_stages'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-purple-300'
                }`}>
                  <input
                    type="radio"
                    name="scope_type"
                    value="selected_stages"
                    checked={scopeType === 'selected_stages'}
                    onChange={() => {
                      setScopeType('selected_stages');
                      if (errors.scopeType) setErrors(prev => ({ ...prev, scopeType: undefined }));
                    }}
                    className="sr-only"
                    disabled={isSubmitting}
                  />
                  <span>مراحل محددة فقط</span>
                </label>
              </div>
              {errors.scopeType && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.scopeType}</p>
              )}
            </div>

            {scopeType === 'selected_stages' && (
              <div className="space-y-2 pt-2 border-t border-purple-200/80">
                <label className="block text-xs font-bold text-purple-900">
                  المراحل الدراسية الخاضعة للإشراف <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'kindergarten', label: 'مرحلة الروضة' },
                    { id: 'primary', label: 'المرحلة الابتدائية' },
                    { id: 'preparatory', label: 'المرحلة الإعدادية' },
                    { id: 'secondary', label: 'المرحلة الثانوية' },
                  ].map((stage) => {
                    const isChecked = selectedStages.includes(stage.id);
                    return (
                      <label
                        key={stage.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                          isChecked
                            ? 'bg-purple-100/90 border-purple-400 text-purple-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedStages((prev) =>
                              checked ? [...prev, stage.id] : prev.filter((s) => s !== stage.id)
                            );
                            if (errors.selectedStages) {
                              setErrors(prev => ({ ...prev, selectedStages: undefined }));
                            }
                          }}
                          disabled={isSubmitting}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span>{stage.label}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.selectedStages && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.selectedStages}</p>
                )}
              </div>
            )}
          </div>
        )}

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
