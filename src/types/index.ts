export type UserRole = 'admin' | 'receptionist' | 'doctor' | 'lab_tech' | 'radiology_tech';

export type AttendanceStatus = 'unconfirmed' | 'present' | 'apologized' | 'delayed';

export type VisitStatus = 'registered' | 'attended' | 'in_consultation' | 'completed' | 'cancelled';

export type VisitType = 'new' | 'follow_up';

export interface Specialty {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at?: string;
}

export interface Doctor {
  id: string;
  specialty_id: string;
  specialty_name?: string;
  full_name: string;
  title: string; // أخصائي / استشاري
  bio: string;
  consultation_fee: number; // سعر الكشف الجديد
  followup_fee?: number; // سعر الإعادة والاستشارة
  phone?: string; // رقم هاتف الطبيب للتواصل المباشر
  email?: string; // البريد الإلكتروني لحساب الدخول
  has_account?: boolean; // هل تم إنشاء حساب دخول للطبيب
  account_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: number; // 0 الأحد، 6 السبت
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  max_patients: number;
  notes?: string;
  is_active: boolean;
}

export interface DoctorDailyAttendance {
  id: string;
  doctor_id: string;
  doctor_name?: string;
  doctor_title?: string;
  specialty_name?: string;
  attendance_date: string;
  status: AttendanceStatus;
  delay_expected_time?: string | null;
  internal_notes?: string | null; // ملاحظات سرية داخلية للموظفين فقط
  updated_by?: string | null;
  updated_by_name?: string | null;
  updated_at: string;
}

// عرض القراءة الآمن للجمهور (بدون ملاحظات داخلية وبدون معرفات الموظفين)
export interface PublicDoctorAttendance {
  doctor_id: string;
  doctor_name: string;
  doctor_title: string;
  specialty_id: string;
  specialty_name: string;
  attendance_date: string;
  status: AttendanceStatus;
  delay_expected_time?: string | null;
  updated_at: string;
}

export interface Patient {
  id: string;
  patient_number: string; // P-2026-00001
  full_name: string;
  phone: string;
  birth_date: string;
  gender: 'male' | 'female';
  blood_type?: string; // فصيلة الدم مثل: A+, O+, B-, AB+
  address?: string;
  national_id?: string;
  emergency_contact?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type BookingSource = 'in_person' | 'whatsapp' | 'phone' | 'online';
export type PaymentStatus = 'unpaid' | 'paid' | 'waived' | 'refunded';
export type PaymentMethod = 'cash' | 'vodafone_cash' | 'instapay' | 'visa' | 'charity';
export type VisitPriority = 'normal' | 'urgent' | 'elderly' | 'special_needs';

export interface PatientVisit {
  id: string;
  patient_id: string;
  patient_name?: string;
  patient_number?: string;
  patient_phone?: string;
  specialty_id: string;
  specialty_name?: string;
  doctor_id: string;
  doctor_name?: string;
  visit_date: string;
  visit_type: VisitType;
  status: VisitStatus;
  priority?: VisitPriority; // أولويات الكشف والحالات الإنسانية (عادي، طارئ، كبار السن، أصحاب الهمم)
  reception_notes?: string;
  cancellation_reason?: string;

  // الحقول المالية وتأكيد الدفع بالخزينة / الاستقبال
  booking_source?: BookingSource; // مصدر الحجز: شباك، واتساب، هاتف، أونلاين
  fee_amount?: number; // قيمة رسوم الكشف أو الإعادة المستحقة
  paid_amount?: number; // المبلغ المحصل فعلياً
  payment_status?: PaymentStatus; // حالة السداد: غير مسدد، مسدد بالكامل، معفى خيري، مسترد
  payment_method?: PaymentMethod; // طريقة التحصيل: نقدي، فودافون كاش، إنستاباي، فيزا، إعفاء خيري
  payment_receipt_number?: string; // رقم إيصال التحصيل التسلسلي (REC-YYYY-XXXXX)
  paid_at?: string; // توقيت استلام المبلغ وسداد الإيصال
  paid_by_id?: string; // معرف الموظف المستلم
  paid_by_name?: string; // اسم موظف الاستقبال أو الخزينة الذي استلم المبلغ
  payment_notes?: string; // ملاحظات مالية إضافية (رقم تحويل محفظة أو سبب إعفاء)
  refund_reason?: string; // سبب رد الرسوم في حالة الإلغاء
  refunded_at?: string; // توقيت رد الرسوم

  // الحقول الطبية الخاصة بكشف وتشخيص الطبيب
  symptoms?: string; // الشكوى المرضية والأعراض
  diagnosis?: string; // التشخيص الطبي للحالة
  prescription?: string; // الروشتة والأدوية المقررة
  tests_requested?: string; // التحاليل والفحوصات المطلوبة
  doctor_notes?: string; // توصيات وملاحظات الطبيب للمريض
  vital_signs?: VitalSigns; // العلامات الحيوية (ضغط، حرارة، نبض، سكر، وزن)
  revisit_recommended?: boolean; // هل يوصى بإعادة كشف / استشارة
  follow_up_date?: string; // موعد الإعادة المقترح
  completed_at?: string; // توقيت إنهاء الكشف
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftOpeningFloat {
  date: string; // تاريخ الوردية YYYY-MM-DD
  amount: number; // رصيد بداية الوردية (عهدة الفكة)
  notes?: string; // ملاحظات أو فئات العملات
  updated_by_name?: string; // اسم الموظف المستلم لعهدة البداية
  updated_at: string;
}

export interface DailyRevenueSummary {
  date: string;
  total_revenue: number; // إجمالي الإيرادات المحصلة اليوم
  cash_total: number; // النقدية الفعلية بالدرج (كاش)
  electronic_total: number; // المدفوعات الإلكترونية (محافظ + إنستاباي + فيزا)
  waived_total: number; // قيمة الإعفاءات الخيرية والتخفيضات
  refunded_total: number; // المبالغ المستردة للتذاكر الملغاة
  total_visits: number; // إجمالي التذاكر المسجلة
  paid_visits_count: number; // عدد التذاكر المسددة
  unpaid_visits_count: number; // عدد التذاكر المعلقة بانتظار السداد
  waived_visits_count: number; // عدد حالات الإعفاء الخيري
  refunded_visits_count: number; // عدد التذاكر المستردة
  by_specialty: Record<string, { count: number; revenue: number; specialty_name: string }>;
  by_cashier: Record<string, { count: number; revenue: number; cashier_name: string }>;
  by_method: Record<PaymentMethod, { count: number; total: number }>;

  // عهدة ورصيد بداية الوردية (Opening Shift Float)
  opening_cash_balance?: number; // عهدة الفكة المستلمة في بداية اليوم
  opening_cash_notes?: string; // تفاصيل أو ملاحظات عهدة الفكة
  opening_cash_updated_by?: string; // اسم الموظف الذي استلم وسجل العهدة
  opening_cash_updated_at?: string; // توقيت تسجيل العهدة
  expected_cash_in_drawer?: number; // إجمالي الكاش الفعلي المتوقع وجوده بالدرج = opening_cash_balance + cash_total
}

export interface VitalSigns {
  blood_pressure?: string;
  pulse?: string;
  temperature?: string;
  weight?: string;
  random_blood_sugar?: string;
  oxygen_saturation?: string;
}

export interface DiagnosticService {
  id: string;
  service_type: 'lab' | 'radiology';
  type?: 'lab' | 'radiology';
  category?: string;
  name: string;
  latin_name?: string; // الاسم الطبي الإنجليزي بالروشتة (مثل Complete Blood Count أو CXR)
  prescription_terms?: string[]; // كلمات البحث الشائعة بالروشتات (مثل CBC, FBS, LFT, SGOT, سونار...)
  preparation_instructions?: string;
  preparation?: string;
  estimated_duration?: string;
  description?: string;
  price: number;
  is_available: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export type DiagnosticTestStatus =
  | 'waiting' // بالانتظار
  | 'called' // جاري النداء بالمكبر
  | 'in_progress' // داخل الغرفة (جاري السحب / جاري التصوير)
  | 'result_ready' // النتيجة جاهزة والتقرير معتمد
  | 'delivered' // تم تسليم التقرير للمريض
  | 'cancelled'; // ملغي

export interface DiagnosticOrder {
  id: string;
  order_number: string; // مثال: LAB-2026-001 أو RAD-2026-001
  department: 'lab' | 'radiology';
  patient_id?: string;
  patient_name: string;
  patient_number?: string;
  patient_phone?: string;
  doctor_name?: string; // الطبيب المحول إن وجد
  specialty_name?: string; // عيادة التحويل إن وجدت
  test_names: string; // أسماء التحاليل أو الفحوصات المطلوبة
  priority: 'normal' | 'urgent' | 'elderly' | 'special_needs';
  status: DiagnosticTestStatus;
  sample_type?: string; // دم وريدي، عينة بول، مسحة، إلخ
  results_summary?: string; // تفاصيل ونتائج التحاليل المعملية
  radiology_findings?: string; // التقرير والتشخيص الإشعاعي
  radiology_conclusion?: string; // الخلاصة والتوصية الطبية
  technician_name?: string; // اسم الفني المسؤول
  fee_amount?: number;
  payment_status?: 'paid' | 'unpaid' | 'waived';
  called_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface StaffProfile {
  id: string;
  full_name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  doctor_id?: string; // ربط الحساب بملف الطبيب عند اختيار دور doctor
  doctor_name?: string;
  specialty_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  staff_id?: string;
  staff_name?: string;
  action: string;
  entity_name: string;
  entity_id: string;
  old_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  ip_address?: string;
  created_at: string;
}

export interface DuplicateCheckResult {
  hasExactMatch: boolean;
  hasFamilyMatch: boolean;
  exactMatchPatient?: Patient;
  potentialMatches: Array<{
    patient: Patient;
    matchType: 'phone_only' | 'name_similar' | 'birthdate_match';
    reason: string;
  }>;
}

// =========================================================================
// بروتوكولات وقوائم الأقسام الطبية والعيادات (Clinical Department & Doctor Presets)
// =========================================================================

export interface ClinicalProtocolMedicine {
  name: string;
  dosage: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface ClinicalProtocol {
  id: string;
  specialty_id?: string; // التخصص التابع له هذا البروتوكول (إذا كان فارغاً فهو بروتوكول عام)
  specialty_name?: string;
  doctor_id?: string; // إذا تم إنشاؤه بواسطة طبيب محدد كمفضل شخصي
  doctor_name?: string;
  name: string;
  latinName?: string;
  diagnosis: string;
  notes?: string;
  medicines: ClinicalProtocolMedicine[];
  is_favorite?: boolean;
  created_at?: string;
}

export interface QuickCommonDrug {
  id?: string;
  specialty_id?: string;
  doctor_id?: string;
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
}

export interface SpecialtyClinicalPreset {
  specialty_id: string;
  specialty_name?: string;
  diagnoses: string[];
  protocols: ClinicalProtocol[];
  quick_drugs: QuickCommonDrug[];
}

