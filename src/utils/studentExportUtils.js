import ExcelJS from "exceljs";

/**
 * ==============================================================================
 * موديول تصدير بيانات الطلاب وقالب الاستيراد إلى Excel (.xlsx)
 * متطابق 100% مع مواصفات وقالب استيراد نظام مدرسة أساس (Asas School)
 * ==============================================================================
 *
 * الميزات المطبقة بدقة:
 * 1. اسم ورقة العمل الأساسية: "إدخال الطلاب" مع جعلها Active Sheet
 * 2. اتجاه الورقة من اليمين لليسار (Right-to-Left - RTL)
 * 3. مطابقة الأعمدة الـ 28 وترتيبها الدقيق مع علامات الإلزام (*)
 * 4. تطبيق التحويلات للرموز (male/female, مراحل دراسية, وسائل نقل)
 * 5. الجلب الذكي التلقائي (Auto-Hydration) للبيانات الشاملة (الملف الصحي، أولياء الأمور، التسجيل)
 *    في حال كانت قائمة الطلاب القادمة من الـ API تحتوي فقط على السجل الأساسي.
 * 6. معالجة وحفظ الأرقام الوطنية وأرقام الهواتف كنص (Text Format '@')
 *    للحفاظ على الأصفار في البداية ومنع التحويل إلى الترميز العلمي (Scientific Notation)
 * 7. معالجة وتفريغ القيم غير المحددة لتكون خلايا فارغة "" دون null/None
 */

// قائمة الأعمدة الـ 28 بترتيبها الدقيق والمعتمد في نظام أساس
export const STUDENT_EXCEL_HEADERS = [
  "الاسم الأول بالعربية *",
  "الكنية بالعربية *",
  "الاسم الأول بالإنكليزية",
  "الكنية بالإنكليزية",
  "اسم الأب",
  "اسم الأم",
  "تاريخ الميلاد *",
  "الجنس *",
  "الرقم الوطني لولي الأمر",
  "اسم ولي الأمر الأول",
  "كنية ولي الأمر",
  "رقم هاتف ولي الأمر",
  "صلة القرابة",
  "زمرة الدم",
  "الأمراض المزمنة",
  "الحساسية",
  "الأدوية الدائمة",
  "الاحتياجات الصحية الخاصة",
  "اسم جهة اتصال للطوارئ",
  "هاتف الطوارئ",
  "ملاحظات صحية",
  "السنة الدراسية *",
  "المرحلة *",
  "الصف *",
  "الشعبة *",
  "تاريخ التسجيل *",
  "طريقة الحضور المعتادة",
  "طريقة الانصراف المعتادة",
];

// اسم ورقة العمل المعتمدة
export const STUDENTS_SHEET_NAME = "إدخال الطلاب";

// فهارس الأعمدة التي يجب فرض تنسيقها كنص صريح Text ('@')
const TEXT_FORMAT_COLUMNS_INDEXES = new Set([
  6,  // تاريخ الميلاد (YYYY-MM-DD كنص)
  8,  // الرقم الوطني لولي الأمر
  11, // رقم هاتف ولي الأمر
  19, // هاتف الطوارئ
  21, // السنة الدراسية (مثل 2026/2027 لمنع تحويلها لعملية قسمة)
  25, // تاريخ التسجيل (YYYY-MM-DD كنص)
]);

// خريطة تحويل الجنس من كود النظام إلى العربية
const GENDER_MAP = {
  male: "ذكر",
  female: "أنثى",
  m: "ذكر",
  f: "أنثى",
  ذكر: "ذكر",
  أنثى: "أنثى",
};

// خريطة تحويل المرحلة الدراسية إلى الاسم العربي الرسمي
const STAGE_MAP = {
  kindergarten: "الروضة",
  kg: "الروضة",
  روضة: "الروضة",
  الروضة: "الروضة",
  primary: "الابتدائية",
  ابتدائية: "الابتدائية",
  الابتدائية: "الابتدائية",
  preparatory: "الإعدادية",
  middle: "الإعدادية",
  إعدادية: "الإعدادية",
  الإعدادية: "الإعدادية",
  secondary: "الثانوية",
  high: "الثانوية",
  ثانوية: "الثانوية",
  الثانوية: "الثانوية",
};

// خريطة تحويل طريقة الحضور والانصراف إلى الاسم العربي
const TRANSPORT_METHOD_MAP = {
  school_bus: "باص المدرسة",
  bus: "باص المدرسة",
  "باص المدرسة": "باص المدرسة",
  باص: "باص المدرسة",
  guardian: "ولي الأمر",
  parent: "ولي الأمر",
  "ولي الأمر": "ولي الأمر",
  أهل: "ولي الأمر",
  اهل: "ولي الأمر",
};

/**
 * دالة مساعدة لتنظيف القيم وتحويلها إلى نص خالي من null أو undefined
 */
export function safeString(val) {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  if (str === "null" || str === "undefined" || str === "None") return "";
  return str;
}

/**
 * دالة مساعدة لتنسيق التواريخ بصيغة YYYY-MM-DD
 */
export function formatDate(val) {
  if (!val) return "";
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split("T")[0];
  }
  const str = String(val).trim();
  if (str === "null" || str === "undefined" || str === "None") return "";
  if (str.includes("T")) {
    return str.split("T")[0];
  }
  return str;
}

/**
 * دالة تحويل الجنس إلى نص عربي
 */
export function mapGender(val) {
  if (!val) return "";
  const key = String(val).trim().toLowerCase();
  return GENDER_MAP[key] || safeString(val);
}

/**
 * دالة تحويل المرحلة الدراسية إلى نص عربي
 */
export function mapStage(val) {
  if (!val) return "";
  const key = String(val).trim().toLowerCase();
  return STAGE_MAP[key] || safeString(val);
}

/**
 * دالة تحويل وسيلة النقل إلى نص عربي
 */
export function mapTransportMethod(val) {
  if (!val) return "";
  const key = String(val).trim().toLowerCase();
  return TRANSPORT_METHOD_MAP[key] || safeString(val);
}

/**
 * استخراج السنة الدراسية كـ string بصيغة (2026/2027)
 */
function extractAcademicYear(enrollment, item) {
  const enr = enrollment || {};
  const raw = enr.academic_year || item?.academic_year;
  if (!raw) {
    return safeString(
      enr.academic_year_name ||
      enr.academic_year_display ||
      item?.academic_year_name ||
      item?.academic_year_display
    );
  }
  if (typeof raw === "object") {
    return safeString(raw.name || raw.year || raw.title);
  }
  return safeString(raw);
}

/**
 * استخراج اسم المرحلة من سجل الطالب/الشعبة/التسجيل
 */
function extractStageName(section, enrollment, item) {
  const rawStage =
    section?.grade_level?.stage ||
    enrollment?.grade_level?.stage ||
    enrollment?.stage ||
    section?.stage ||
    item?.stage ||
    (typeof item?.grade_level === "object" ? item.grade_level?.stage : null) ||
    item?.grade_level_stage;

  return mapStage(rawStage);
}

/**
 * استخراج اسم الصف (مثل: الصف الأول، الصف العاشر)
 */
function extractGradeLevelName(section, enrollment, item) {
  if (section?.grade_level?.name) return safeString(section.grade_level.name);
  if (enrollment?.grade_level?.name) return safeString(enrollment.grade_level.name);
  if (enrollment?.grade_level_name) return safeString(enrollment.grade_level_name);
  if (enrollment?.grade_level_display) return safeString(enrollment.grade_level_display);
  if (typeof item?.grade_level === "object") return safeString(item.grade_level?.name);
  return safeString(item?.grade_level_name || item?.grade_level || item?.grade_level_display);
}

/**
 * استخراج اسم الشعبة (مثل: أ، ب، ج)
 */
function extractSectionName(enrollment, section, item) {
  if (typeof enrollment?.section === "object" && enrollment.section?.name) {
    return safeString(enrollment.section.name);
  }
  if (typeof enrollment?.section === "string") {
    return safeString(enrollment.section);
  }
  if (enrollment?.section_name) return safeString(enrollment.section_name);
  if (enrollment?.section_display) return safeString(enrollment.section_display);
  if (section?.name) return safeString(section.name);
  if (typeof item?.section === "object" && item.section?.name) {
    return safeString(item.section.name);
  }
  return safeString(item?.section_name || item?.section || item?.section_display);
}

/**
 * تجميع وتعيين بيانات الطالب إلى صف Excel مكون من 28 عموداً بدقة
 *
 * @param {Object} item كائن بيانات الطالب (سواء كان شاملاً أو متداخلاً)
 * @returns {Array<string>} مصفوفة من 28 قيمة نصية مطابقة للأعمدة بالترتيب
 */
export function mapStudentToExcelRow(item) {
  if (!item || typeof item !== "object") {
    return Array(STUDENT_EXCEL_HEADERS.length).fill("");
  }

  // استخراج الكيانات الفرعية بمرونة
  const student = item.student || item;

  // ولي الأمر: يدعم guardian كائن مفرد أو guardians مصفوفة
  const guardian =
    item.guardian ||
    (Array.isArray(item.guardians) && item.guardians.length > 0
      ? item.guardians[0]
      : null) ||
    item;

  // رابط الطالب بولي الأمر
  const guardianStudent =
    item.guardian_student ||
    (Array.isArray(item.guardians) && item.guardians.length > 0
      ? item.guardians[0]
      : null) ||
    item;

  // الملف الصحي
  const health = item.health_profile || item.health || {};

  // التسجيل الأكاديمي
  const enrollment =
    item.enrollment ||
    (Array.isArray(item.enrollments) && item.enrollments.length > 0
      ? item.enrollments[0]
      : null) ||
    {};

  // الشعبة والصف
  const section = item.section || enrollment?.section || {};

  // استخراج اسم ولي الأمر مع دعم full_name كخيار احتياطي
  const guardianFirstName =
    guardian?.first_name ||
    (guardian?.full_name ? guardian.full_name.trim().split(/\s+/)[0] : "");
  const guardianLastName =
    guardian?.last_name ||
    (guardian?.full_name
      ? guardian.full_name.trim().split(/\s+/).slice(1).join(" ")
      : "");

  // بناء القيم الـ 28 بالترتيب الدقيق:
  return [
    // 1. الاسم الأول بالعربية * ← student.first_name
    safeString(student.first_name),

    // 2. الكنية بالعربية * ← student.last_name
    safeString(student.last_name),

    // 3. الاسم الأول بالإنكليزية ← student.first_name_en
    safeString(student.first_name_en),

    // 4. الكنية بالإنكليزية ← student.last_name_en
    safeString(student.last_name_en),

    // 5. اسم الأب ← student.father_name
    safeString(student.father_name),

    // 6. اسم الأم ← student.mother_name
    safeString(student.mother_name),

    // 7. تاريخ الميلاد * ← student.birth_date (بصيغة YYYY-MM-DD)
    formatDate(student.birth_date),

    // 8. الجنس * ← تحويل: 'male' → 'ذكر'، 'female' → 'أنثى'
    mapGender(student.gender),

    // 9. الرقم الوطني لولي الأمر ← guardian.national_id (كنص String للحفاظ على الأصفار)
    safeString(guardian?.national_id),

    // 10. اسم ولي الأمر الأول ← guardian.first_name
    safeString(guardianFirstName),

    // 11. كنية ولي الأمر ← guardian.last_name
    safeString(guardianLastName),

    // 12. رقم هاتف ولي الأمر ← guardian.phone_number (كنص String للحفاظ على الصفر)
    safeString(guardian?.phone_number),

    // 13. صلة القرابة ← guardian_student.relationship
    safeString(guardianStudent?.relationship ?? guardian?.relationship),

    // 14. زمرة الدم ← health_profile.blood_type
    safeString(health?.blood_type),

    // 15. الأمراض المزمنة ← health_profile.chronic_diseases
    safeString(health?.chronic_diseases),

    // 16. الحساسية ← health_profile.allergies
    safeString(health?.allergies),

    // 17. الأدوية الدائمة ← health_profile.permanent_medications
    safeString(health?.permanent_medications),

    // 18. الاحتياجات الصحية الخاصة ← health_profile.special_health_needs
    safeString(health?.special_health_needs),

    // 19. اسم جهة اتصال للطوارئ ← health_profile.emergency_contact_name
    safeString(health?.emergency_contact_name),

    // 20. هاتف الطوارئ ← health_profile.emergency_contact_phone (كنص String)
    safeString(health?.emergency_contact_phone),

    // 21. ملاحظات صحية ← health_profile.health_notes
    safeString(health?.health_notes),

    // 22. السنة الدراسية * ← enrollment.academic_year (بصيغة 2026/2027)
    extractAcademicYear(enrollment, item),

    // 23. المرحلة * ← تحويل: 'kindergarten' → 'الروضة' ... إلخ
    extractStageName(section, enrollment, item),

    // 24. الصف * ← section.grade_level.name
    extractGradeLevelName(section, enrollment, item),

    // 25. الشعبة * ← enrollment.section
    extractSectionName(enrollment, section, item),

    // 26. تاريخ التسجيل * ← enrollment.enrollment_date (بصيغة YYYY-MM-DD)
    formatDate(enrollment?.enrollment_date),

    // 27. طريقة الحضور المعتادة ← تحويل: 'school_bus' → 'باص المدرسة'، 'guardian' → 'ولي الأمر'
    mapTransportMethod(
      enrollment?.usual_arrival_method ??
      enrollment?.usual_arrival_method_display ??
      item?.usual_arrival_method
    ),

    // 28. طريقة الانصراف المعتادة ← تحويل: 'school_bus' → 'باص المدرسة'، 'guardian' → 'ولي الأمر'
    mapTransportMethod(
      enrollment?.usual_departure_method ??
      enrollment?.usual_departure_method_display ??
      item?.usual_departure_method
    ),
  ];
}

/**
 * جلب وتجميع البيانات الشاملة للطلاب (الملف الصحي، أولياء الأمور، التسجيل الأكاديمي)
 * تلقائياً لكل طالب في القائمة إذا كانت السجلات تقتصر على البيانات الأساسية.
 *
 * @param {Array<Object>} studentsList مصفوفة سجلات الطلاب
 * @param {Object} [options]
 * @param {Function} [options.onProgress] دالة رد نداء لتحديث مؤشر التقدم (current, total)
 * @param {number} [options.concurrency=6] عدد الطلبات المتزامنة
 * @returns {Promise<Array<Object>>} مصفوفة الطلاب مع البيانات الشاملة
 */
export async function hydrateStudentsFullData(studentsList = [], options = {}) {
  if (!Array.isArray(studentsList) || studentsList.length === 0) {
    return [];
  }

  const { onProgress, concurrency = 6 } = options;
  const total = studentsList.length;
  let completed = 0;

  // فحص ما إذا كان السجل يحتاج إلى جلب بروفايل شامل
  const needsHydration = (st) => {
    if (!st || !st.id) return false;
    const hasGuardians = Boolean(
      st.guardian || (Array.isArray(st.guardians) && st.guardians.length > 0)
    );
    const hasHealth = Boolean(st.health_profile || st.health);
    const hasEnrollment = Boolean(
      st.enrollment || (Array.isArray(st.enrollments) && st.enrollments.length > 0)
    );
    return !(hasGuardians && hasHealth && hasEnrollment);
  };

  // ديناميكياً استيراد api لتجنب الاعتماديات الدائرية
  let api = null;
  try {
    const apiModule = await import("../api");
    api = apiModule.api || apiModule.default;
  } catch (_) {}

  // إذا لم يتوفر الـ API نرجع القائمة كما هي
  if (!api || !api.students || !api.students.getStudentProfile) {
    return studentsList;
  }

  const results = new Array(total);
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < total) {
      const idx = currentIndex++;
      const currentStudent = studentsList[idx];

      if (!needsHydration(currentStudent)) {
        results[idx] = currentStudent;
        completed++;
        if (typeof onProgress === "function") onProgress(completed, total);
        continue;
      }

      try {
        const res = await api.students.getStudentProfile(currentStudent.id);
        const profile = res?.data || res || {};

        results[idx] = {
          ...currentStudent,
          ...profile,
          student: {
            ...currentStudent,
            ...(profile.student || {}),
          },
          guardians: profile.guardians || currentStudent.guardians || [],
          guardian: profile.guardians?.[0] || currentStudent.guardian || null,
          guardian_student: profile.guardians?.[0] || currentStudent.guardian_student || null,
          health_profile: profile.health_profile || currentStudent.health_profile || null,
          enrollment: profile.enrollment || currentStudent.enrollment || null,
          section: profile.enrollment?.section || currentStudent.section || null,
          academic_year:
            profile.academic_year ||
            profile.enrollment?.academic_year ||
            currentStudent.academic_year ||
            null,
        };
      } catch (err) {
        // في حال تعذر جلب بروفايل طالب معين، نبقي على سجله الأساسي دون إيقاف العملية
        results[idx] = currentStudent;
      } finally {
        completed++;
        if (typeof onProgress === "function") onProgress(completed, total);
      }
    }
  };

  const pool = Array.from(
    { length: Math.min(concurrency, total) },
    () => worker()
  );

  await Promise.all(pool);
  return results;
}

/**
 * إنشاء مصنف Excel (Workbook) كامل يحتوي على ورقة "إدخال الطلاب"
 * مع تطبيق كافة الخصائص الفنية (RTL, Active Sheet, Text Formats, Cell Styling)
 *
 * @param {Array<Object>} studentsList مصفوفة بسجلات الطلاب
 * @param {Object} [options] خيارات إضافية (تخصيص العناوين، معلومات الملف، ...)
 * @returns {ExcelJS.Workbook} مصنف ExcelJS جاهز للحفظ أو التصدير
 */
export function buildStudentsWorkbook(studentsList = [], options = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = options.creator || "نظام أساس المدرسي - Asas School";
  workbook.lastModifiedBy = options.lastModifiedBy || "نظام أساس المدرسي";
  workbook.created = new Date();
  workbook.modified = new Date();

  // ضبط ورقة العمل الأولى كـ Active Sheet داخل المصنف
  workbook.views = [
    {
      x: 0,
      y: 0,
      width: 10000,
      height: 20000,
      firstSheet: 0,
      activeTab: 0,
      visibility: "visible",
    },
  ];

  // إنشاء ورقة العمل باسم "إدخال الطلاب" وضبط اتجاه اليمين لليسار RTL
  const worksheet = workbook.addWorksheet(STUDENTS_SHEET_NAME, {
    views: [
      {
        rightToLeft: true,   // اتجاه الصفحة من اليمين لليسار (RTL)
        tabSelected: true,   // جعلها الورقة المحددة والنشطة
        showGridLines: true, // إظهار خطوط الشبكة
      },
    ],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      paperSize: 9, // A4
    },
  });

  // إضافة صف الترويسة (Header Row)
  const headerRow = worksheet.addRow(STUDENT_EXCEL_HEADERS);
  headerRow.height = 32;

  // تنسيق خلايا الترويسة بلون هوية نظام أساس وبخط واضح وتوسيط
  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Arial",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" }, // نص أبيض ناصع
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F766E" }, // لون Teal 700 الرسمي لنظام أساس
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF0D5C56" } },
      left: { style: "thin", color: { argb: "FF0D5C56" } },
      bottom: { style: "medium", color: { argb: "FF0D5C56" } },
      right: { style: "thin", color: { argb: "FF0D5C56" } },
    };
  });

  // إضافة صفوف بيانات الطلاب
  studentsList.forEach((studentItem) => {
    const rowValues = mapStudentToExcelRow(studentItem);
    const row = worksheet.addRow(rowValues);
    row.height = 24;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colIndex = colNumber - 1; // 0-indexed

      // محاذاة النص: توسيط للأرقام والتواريخ والرموز، ومحاذاة لليمين للأسماء والملاحظات
      const isCenteredCol =
        TEXT_FORMAT_COLUMNS_INDEXES.has(colIndex) ||
        colIndex === 7 ||  // الجنس
        colIndex === 13 || // زمرة الدم
        colIndex === 22 || // المرحلة
        colIndex === 24 || // الشعبة
        colIndex === 26 || // طريقة الحضور
        colIndex === 27;   // طريقة الانصراف

      cell.alignment = {
        vertical: "middle",
        horizontal: isCenteredCol ? "center" : "right",
      };

      cell.font = {
        name: "Arial",
        size: 10,
        color: { argb: "FF1E293B" }, // Slate 800
      };

      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // تطبيق تنسيق النص Text ('@') للأرقام والهواتف لمنع إزالة الأصفار أو الترميز العلمي
      if (TEXT_FORMAT_COLUMNS_INDEXES.has(colIndex)) {
        cell.numFmt = "@";
        if (cell.value !== null && cell.value !== undefined) {
          cell.value = String(cell.value);
        }
      }
    });
  });

  // حساب وتعيين العرض التلقائي الملائم للأعمدة بناءً على العناوين والبيانات
  worksheet.columns.forEach((column, index) => {
    let maxLength = STUDENT_EXCEL_HEADERS[index]
      ? STUDENT_EXCEL_HEADERS[index].length
      : 12;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellVal = cell.value ? String(cell.value) : "";
      if (cellVal.length > maxLength) {
        maxLength = cellVal.length;
      }
    });
    // إضافة هامش للعرض بما يضمن وضوح المحتوى العربي
    column.width = Math.min(Math.max(maxLength + 4, 15), 36);
  });

  return workbook;
}

/**
 * الدالة الرئيسية لتصدير بيانات الطلاب إلى ملف Excel (.xlsx) وتحميله في المتصفح
 * تجلب تلقائياً كافة البيانات المرتبطة (أولياء الأمور، الصحة، التسجيل) إن لم تكن متوفرة.
 *
 * @param {Array<Object>} studentsList مصفوفة بيانات الطلاب
 * @param {Object} [options] خيارات إضافية (اسم الملف، مؤشر التقدم، إلخ)
 * @returns {Promise<ArrayBuffer>} مصفوفة البايتات للملف الناتج
 */
export async function exportStudentsToExcel(studentsList = [], options = {}) {
  let dataToExport = studentsList;

  // جلب البيانات الشاملة تلقائياً إذا كانت السجلات المعطاة تقتصر على الحقول الأساسية
  if (
    options.autoHydrate !== false &&
    Array.isArray(studentsList) &&
    studentsList.length > 0
  ) {
    dataToExport = await hydrateStudentsFullData(studentsList, {
      onProgress: options.onProgress,
      concurrency: options.concurrency || 6,
    });
  }

  const workbook = buildStudentsWorkbook(dataToExport, options);
  const buffer = await workbook.xlsx.writeBuffer();

  // في حال التنفيذ داخل بيئة المتصفح: نقوم ببدء تحميل الملف تلقائياً
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const defaultDate = new Date().toISOString().split("T")[0];
    const fileName =
      options.fileName || `تصدير_بيانات_الطلاب_${defaultDate}.xlsx`;

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = downloadUrl;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    window.URL.revokeObjectURL(downloadUrl);
  }

  return buffer;
}

/**
 * دالة مساعدة لتوليد قالب Excel فارغ مطابق 100% لاستيراد الطلاب
 * يحتوي على الترويسة وورقة "إدخال الطلاب" بخصائص RTL وتنسيق النص.
 *
 * @param {Object} [options]
 * @returns {Promise<ArrayBuffer>}
 */
export async function downloadStudentImportTemplate(options = {}) {
  const fileName = options.fileName || `قالب_استيراد_الطلاب_أساس.xlsx`;

  return exportStudentsToExcel([], {
    fileName,
    autoHydrate: false,
    creator: "نظام أساس المدرسي - قالب الاستيراد",
  });
}
