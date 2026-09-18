/**
 * Direct Backend Error Parser and Response Utilities for Asas School Platform.
 * Prioritizes specific field-level validation errors and preserves exact backend error messages.
 */

export const FIELD_LABELS = {
  teacher: "المعلم المكلف",
  grade_subject: "المادة المقررة",
  section: "الشعبة الدراسية",
  start_date: "تاريخ بداية التكليف",
  end_date: "تاريخ نهاية التكليف",
  username: "اسم المستخدم",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  old_password: "كلمة المرور القديمة",
  new_password: "كلمة المرور الجديدة",
  current_password: "كلمة المرور الحالية",
  new_password_confirm: "تأكيد كلمة المرور الجديدة",
  first_name: "الاسم الأول",
  last_name: "اسم العائلة",
  first_name_en: "الاسم الأول (بالإنكليزية)",
  last_name_en: "اسم العائلة (بالإنكليزية)",
  father_name: "اسم الأب",
  mother_name: "اسم الأم",
  birth_date: "تاريخ الميلاد",
  gender: "الجنس",
  phone: "رقم الهاتف",
  phone_number: "رقم الهاتف",
  address: "العنوان",
  national_id: "الرقم الوطني / الهوية",
  blood_type: "زمرة الدم",
  chronic_diseases: "الأمراض المزمنة",
  allergies: "الحساسية",
  permanent_medications: "الأدوية الدائمة",
  special_health_needs: "الاحتياجات الصحية الخاصة",
  emergency_contact_name: "اسم جهة اتصال الطوارئ",
  emergency_contact_phone: "هاتف جهة اتصال الطوارئ",
  health_notes: "ملاحظات صحية",
  role: "الدور الوظيفي",
  academic_year: "السنة الدراسية",
  term: "الفصل الدراسي",
  subject: "المادة",
  grade_level: "الصف الدراسي",
  enrollment: "القيد المدرسي للطالب",
  note_type: "نوع الملاحظة السلوكية",
  title: "عنوان الملاحظة",
  description: "تفاصيل الملاحظة",
  occurred_on: "تاريخ الملاحظة",
  occurred_from: "من تاريخ",
  occurred_to: "إلى تاريخ",
  student: "الطالب",
  guardian: "ولي الأمر",
  relationship: "صلة القرابة",
  is_primary_contact: "جهة الاتصال الأساسية",
  can_pickup: "مصرح بالاستلام",
  is_active: "الحالة",
  name: "الاسم",
  code: "الرمز / الكود",
  order: "الترتيب",
  year: "السنة",
  semester: "الفصل الدراسي",
  teacher_assignment: "التكليف الأكاديمي للمعلم",
  homework_date: "تاريخ نشر الواجب",
  due_date: "موعد تسليم الواجب",
  attachment: "الملف المرفق",
  scope: "نطاق الإعلان / الفئة المستهدفة",
  publish_date: "تاريخ نشر الإعلان",
  expiry_date: "تاريخ انتهاء الإعلان",
  grade_levels: "الصفوف المستهدفة",
  sections: "الشعب المستهدفة",
  content: "محتوى الإعلان",
  request_type: "نوع الطلب",
  details: "تفاصيل الطلب",
  school_response: "رد المدرسة",
  handled_by: "المسؤول عن الرد",
  answered_at: "تاريخ وتوقيت الرد",
  created_from: "من تاريخ",
  created_to: "إلى تاريخ",
  base_tuition_usd: "القسط السنوي الأساسي (USD)",
  discount_type: "نوع الخصم",
  value: "قيمة الخصم / النسبة",
  currency: "العملة",
  amount: "المبلغ المدفوع",
  exchange_rate_syp_per_usd: "سعر صرف الليرة مقابل الدولار",
  cancellation_reason: "سبب الإلغاء",
  payment_status: "حالة الدفع",
  tuition_plan: "خطة الرسوم الدراسية",
  requested_date: "التاريخ المطلوب",
  request_reason: "سبب طلب الحضور",
  decision_reason: "سبب القرار",
  decided_by: "صاحب القرار",
  decided_at: "وقت اتخاذ القرار",
  max_score: "الدرجة القصوى",
  assessment_date: "تاريخ التقييم",
  allow_duplicate: "السماح بالتكرار",
  score: "الدرجة / العلامة",
  records: "سجلات العلامات",
  published_count: "عدد التقييمات المنشورة",
  skipped_future_count: "التقييمات المستقبلية المتجاوزة",
  total_score: "مجموع العلامات",
  total_max_score: "المجموع الكلي الممكن",
  is_complete: "اكتمال رصد التقييمات",
  sheet: "كشف الحضور",
  attendance_date: "تاريخ الحضور",
  arrival_time: "وقت الوصول / الدخول",
  arrival_method: "طريقة الوصول",
  usual_arrival_method: "طريقة الوصول المعتادة",
  departure_time: "وقت المغادرة / الانصراف",
  departure_method: "طريقة المغادرة",
  usual_departure_method: "طريقة المغادرة المعتادة",
  absence_type: "نوع الغياب",
  absence_reason: "سبب الغياب",
  absence_reason_source: "مصدر سبب الغياب",
  notes: "الملاحظات",
  status: "الحالة",
  non_field_errors: "خطأ عام",
};

const META_KEYS = new Set([
  "code",
  "status",
  "detail",
  "message",
  "success",
  "meta",
  "data",
  "timestamp",
  "version",
  "requester_role",
]);

/**
 * Extracts a human-readable string or list of strings from any value (string, array, object)
 */
function extractValueText(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val);

  if (Array.isArray(val)) {
    return val
      .map((item) => extractValueText(item))
      .filter(Boolean)
      .join(" ");
  }

  if (typeof val === "object") {
    // If it has a message or detail property directly
    if (val.message && typeof val.message === "string") return val.message;
    if (val.detail && typeof val.detail === "string") return val.detail;

    // Otherwise extract all entries
    return Object.entries(val)
      .map(([k, v]) => {
        const label = FIELD_LABELS[k] || k;
        const msg = extractValueText(v);
        return msg ? `${label}: ${msg}` : "";
      })
      .filter(Boolean)
      .join(" | ");
  }

  return String(val);
}

/**
 * Parses API Error from Axios response, extracting exact backend error messages.
 *
 * @param {any} error - Axios error object, error string, or standard Error
 * @param {string} fallbackMessage - Fallback if server returned no message
 * @returns {string} Human-readable server error message directly
 */
export function parseApiError(error, fallbackMessage = "") {
  if (!error) return fallbackMessage;

  console.log("error", error);

  // Handle direct string errors
  if (typeof error === "string") return error;

  const response = error.response;
  const data = response?.data || error.data;

  // 1. Direct Server Response Objects / Data
  if (data) {
    if (typeof data === "string" && data.trim()) {
      return data.trim();
    }

    if (typeof data === "object") {
      const messages = [];

      // 1a. Check for wrapped 'errors' object (e.g. { errors: { teacher: ["..."] } })
      const errorContainer =
        data.errors && typeof data.errors === "object"
          ? data.errors
          : data.data?.errors && typeof data.data.errors === "object"
            ? data.data.errors
            : null;

      if (errorContainer) {
        if (Array.isArray(errorContainer)) {
          const arrText = extractValueText(errorContainer);
          if (arrText) messages.push(arrText);
        } else {
          for (const [field, val] of Object.entries(errorContainer)) {
            const readableField = FIELD_LABELS[field] || field;
            const text = extractValueText(val);
            if (text) {
              messages.push(`${readableField}: ${text}`);
            }
          }
        }
      }

      // 1b. Check for direct DRF field errors on the root data object (e.g. { teacher: ["..."] })
      if (!errorContainer) {
        for (const [key, val] of Object.entries(data)) {
          if (!META_KEYS.has(key)) {
            const readableField = FIELD_LABELS[key] || key;
            const text = extractValueText(val);
            if (text) {
              messages.push(`${readableField}: ${text}`);
            }
          }
        }
      }

      // 1c. Check for 'non_field_errors'
      if (data.non_field_errors) {
        const nfText = extractValueText(data.non_field_errors);
        if (nfText) messages.push(nfText);
      }

      // If we found specific field-level validation errors, join them cleanly
      if (messages.length > 0) {
        // If data has an overarching message, prepend it if it's informative
        const topMessage =
          typeof data.message === "string" ? data.message.trim() : "";
        if (topMessage && !topMessage.includes("[object")) {
          return `${topMessage}\n• ${messages.join("\n• ")}`;
        }
        return messages.join(" | ");
      }

      // 1d. Server 'detail' field
      if (typeof data.detail === "string" && data.detail.trim()) {
        return data.detail.trim();
      }

      // 1e. Server 'message' field
      if (typeof data.message === "string" && data.message.trim()) {
        return data.message.trim();
      }

      // 1f. Server 'error' field
      if (data.error) {
        const errorText = extractValueText(data.error);
        if (errorText) return errorText;
      }
    }
  }

  // 2. HTTP Status Fallbacks (only when response data did not supply details)
  if (response?.status === 400)
    return "تعذر إتمام العملية. يرجى مراجعة الحقول والبيانات المدخلة.";
  if (response?.status === 401)
    return "انتهت صلاحية الجلسة أو لم يتم تزويد بيانات الدخول. يرجى تسجيل الدخول مجدداً.";
  if (response?.status === 403)
    return "عفواً، ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء.";
  if (response?.status === 404) return "السجل المطلوب غير موجود في النظام.";
  if (response?.status === 429)
    return "تم تجاوز الحد المسموح من الطلبات. يرجى الانتظار قليلاً ثم المحاولة.";
  if (response?.status >= 500)
    return `حدث خطأ في الخادم (${response.status}). يرجى المحاولة لاحقاً.`;

  // 3. Network & Connection Fallbacks
  if (error.message === "Network Error") {
    return "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.";
  }
  if (error.code === "ECONNABORTED") {
    return "انتهت مهلة انتظار استجابة الخادم.";
  }

  return error.message || fallbackMessage || "حدث خطأ غير متوقع.";
}

/**
 * Returns an object containing only field-level error messages formatted for UI forms.
 * Example: { teacher: "القيمة ليست UUID سليم.", section: "هذا الحقل مطلوب." }
 */
export function getFieldErrors(error) {
  if (!error || !error.response || !error.response.data) return {};
  const data = error.response.data;
  if (typeof data !== "object") return {};

  const source =
    data.errors &&
    typeof data.errors === "object" &&
    !Array.isArray(data.errors)
      ? data.errors
      : data.data?.errors &&
          typeof data.data.errors === "object" &&
          !Array.isArray(data.data.errors)
        ? data.data.errors
        : data;

  const fieldErrors = {};

  const processEntries = (obj, prefix = "") => {
    for (const [key, value] of Object.entries(obj)) {
      if (META_KEYS.has(key)) continue;

      const pathKey = prefix ? `${prefix}.${key}` : key;

      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !value.message &&
        !value.detail
      ) {
        // Recurse into nested dictionary
        processEntries(value, pathKey);
      } else {
        const text = extractValueText(value);
        if (text) {
          fieldErrors[pathKey] = text;
          // Also set bare key if not already defined for easy access
          if (!fieldErrors[key]) {
            fieldErrors[key] = text;
          }
        }
      }
    }
  };

  processEntries(source);

  return fieldErrors;
}

/**
 * Extracts the specific backend error code (e.g. 'VALIDATION_ERROR', 'NOT_FOUND')
 */
export function getApiErrorCode(error) {
  if (!error || !error.response || !error.response.data) return null;
  const data = error.response.data;
  return data.code || data.error_code || null;
}

/**
 * Extracts a success message from an API response
 */
export function getApiSuccessMessage(res, defaultMsg = "تمت العملية بنجاح") {
  if (!res) return defaultMsg;
  if (typeof res === "string") return res;
  return res.message || res.detail || res.data?.message || defaultMsg;
}

/**
 * Normalizes DRF or wrapped paginated API response.
 * Compatible with BOTH array iteration AND destructuring { results, count, next, previous }
 */
export function extractPaginatedList(res) {
  let list = [];
  let totalCount = 0;
  let nextUrl = null;
  let prevUrl = null;

  if (!res) {
    list = [];
  } else if (Array.isArray(res)) {
    list = res;
    totalCount = res.length;
  } else if (typeof res === "object") {
    if (Array.isArray(res.results)) {
      list = res.results;
      totalCount =
        typeof res.count === "number" ? res.count : res.results.length;
      nextUrl = res.next || null;
      prevUrl = res.previous || null;
    } else if (res.data && typeof res.data === "object") {
      if (Array.isArray(res.data.results)) {
        list = res.data.results;
        totalCount =
          typeof res.data.count === "number"
            ? res.data.count
            : res.data.results.length;
        nextUrl = res.data.next || null;
        prevUrl = res.data.previous || null;
      } else if (Array.isArray(res.data)) {
        list = res.data;
        totalCount = res.data.length;
      }
    }
  }

  // Ensure results is an array
  const output = Array.isArray(list) ? [...list] : [];

  // Attach destructuring properties so both `output.map` and `const { results, count } = output` work seamlessly!
  output.results = output;
  output.count = totalCount;
  output.next = nextUrl;
  output.previous = prevUrl;

  return output;
}
