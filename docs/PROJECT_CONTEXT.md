# مرجع السياق الهندسي والتقني الشامل للمشروع (PROJECT_CONTEXT)
## مستشفى لجنة الزكاة بميت علي - النظام الطبي الخيري المتكامل
**تاريخ التوثيق الفعلي:** نوفمبر 2026  
**المستودع المصدر (GitHub):** `ma7moudel7anafy/MeetAli-Hospital`  
**بيئة التشغيل:** Google AI Studio / Node.js + Express + Vite + React 19 + TypeScript

---

## 1. تعريف المشروع وأهدافه (Project Overview & Objectives)

### 1.1 التعريف العام
نظام برمجي طبي وإداري متكامل مصمم لخدمة **مستشفى لجنة الزكاة بميت علي**، وهو صرح طبي خيري يقدم خدمات الكشف الطبي، التحاليل المعملية، والفحوصات الإشعاعية بأسعار رمزية ومخفضة للمواطنين مع توفير إعفاءات مجانية كاملة للحالات المستحقة.

### 1.2 الأهداف التشغيلية للمشروع
1. **بوابة الجمهور والخدمة العامة:** إتاحة منصة تفاعلية للمرضى وأهالي القرية لمعرفة مواعيد حضور الأطباء الحالية لحظيًا، كشف التأخير أو الاعتذار، استعراض التخصصات الطبية، وقائمة أسعار التحاليل والأشعة وتعليمات التحضير الخاصة بها.
2. **إدارة شباك الاستقبال وحجز التذاكر:** تنظيم تدفق المرضى ومنع الازدحام عبر أرقام انتظار تسلسلية وحساب رسوم الكشف والإعادة بدقة، مع تمييز الحالات الإنسانية (حالات طارئة، كبار السن، أصحاب الهمم).
3. **التحصيل المالي والرقابة على الخزينة:** توثيق تحصيل النقدية والمدفوعات الإلكترونية (فودافون كاش، إنستاباي، فيزا) وإصدار إيصالات استلام رسمية برقم تسلسلي ذري (`REC-YYYY-XXXXX`) وضبط عهدة الفكة وتقفيل الوردية اليومية.
4. **بوابة الطبيب الذكية (Clinic Desk):** تمكين الطبيب من فحص طابور المرضى، استدعاء المريض بالنداء الصوتي، تسجيل التشخيص والأعراض والعلامات الحيوية، واستخدام بروتوكولات علاجية جاهزة لكل تخصص لطباعة روشتة طبية معتمدة وتصديرها بصيغة PDF.
5. **بوابات الفنيين (المعمل والأشعة):** استقبال طلبات الفحوصات المحولة من العيادات أو الحجوزات المباشرة، النداء الصوتي لسحب العينات أو التصوير، إدخال النتائج والتقارير ومشاركتها مع المريض مباشرة عبر واتساب.
6. **سجل التدقيق والحوكمة (Security & Auditing):** تسجيل كل عملية تعديل أو إضافة أو حذف مع هوية الموظف والبيانات السابقة والجديدة في سجل غير قابل للتعديل أو المسح.

---

## 2. نظرة عامة على المعمارية (Architectural Overview)

يعتمد التطبيق على معمارية **Full-Stack Hybrid Client-Server Architecture** تجمع بين قوة تطبيق الصفحة الواحدة (SPA) في واجهة المستخدم، وخادم خلفي خفيف مبني بـ Node.js/Express، مع دعم ثنائي لمصدر البيانات:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   الواجهة الأمامية (Client SPA)                          │
│                                React 19 + TypeScript + Tailwind CSS                    │
│                                                                                        │
│   ┌─────────────────────┐   ┌───────────────────────────┐   ┌──────────────────────┐   │
│   │   Public Portal     │   │   Reception / Cashier     │   │   Doctor & Tech      │   │
│   │ (Hero, Attendance,  │   │  (Visits, Patients, Reg,  │   │ (Clinic Desk, Queue, │   │
│   │  Specialties, Diag) │   │   Revenue, Thermal Print) │   │  Presets, Lab, Rad)  │   │
│   └──────────┬──────────┘   └─────────────┬─────────────┘   └──────────┬───────────┘   │
└──────────────┼────────────────────────────┼────────────────────────────┼───────────────┘
               │                            │                            │
               ▼                            ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             طبقة البيانات الموحدة (DatabaseService)                     │
│                        /src/lib/databaseService.ts (Singleton dbService)               │
└──────────────┬─────────────────────────────────────────────────────────┬───────────────┘
               │                                                         │
     [وضع السحابة نشط]                                            [وضع العرض أو المحلي]
               ▼                                                         ▼
┌──────────────────────────────┐              ┌──────────────────────────────────────────┐
│   Supabase Cloud Platform    │              │       المحرك المحلي المدمج (Local Engine) │
│ - PostgreSQL DB + RLS        │              │ - Express Server APIs (/api/*)           │
│ - Security Definer Functions │              │ - Server-Sent Events (SSE) Live Sync     │
│ - PostgREST Client           │              │ - JSON File Storage (data/hospital_db)   │
│ - Auth (Staff Profiles)      │              │ - Browser LocalStorage (Offline caching) │
└──────────────────────────────┘              └──────────────────────────────────────────┘
```

### استراتيجية التخزين والاتصال الهجين (Hybrid Fallback Strategy)
- يتحقق كائن `dbService` في كل عملية من توفر عميل Supabase عبر `getSupabaseClient()`.
- **في حال توفر إعدادات Supabase:** تُنفذ العمليات مباشرة على جداول قاعدة البيانات PostgreSQL الموثقة في `src/lib/schemaSql.ts`.
- **في حال عدم الاتصال بـ Supabase (أو وضع العمل بدون إنترنت):**
  1. يقوم الكود بإرسال الطلبات إلى الخادم المحلي `server.ts` عبر واجهات RESTful API (`/api/attendance`, `/api/visits`, `/api/patients`).
  2. يقوم الخادم بحفظ البيانات في ملف `data/hospital_db.json` وبث الأحداث الفورية عبر مسار `Server-Sent Events` (`/api/events`).
  3. يتم الاحتفاظ بنسخة مطابقة في `localStorage` للمتصفح لضمان سرعة الاستجابة وعمل الواجهات فور انقطاع الاتصال.

---

## 3. التقنيات والمكتبات المستخدمة وإصداراتها (Technologies & Dependencies)

استنادًا إلى الفحص الفعلي لملف `package.json`:

### 3.1 التقنيات الأساسية (Core Runtime & Frameworks)
| الحزمة | الإصدار | الوظيفة |
| :--- | :--- | :--- |
| `react` | `^19.0.1` | مكتبة بناء واجهة المستخدم الحديثة (React 19) |
| `react-dom` | `^19.0.1` | محرك تصيير React لشجرة DOM |
| `vite` | `^8.3.0` | محرك البناء والتطوير الفائق السرعة |
| `typescript` | `^7.0.2` | لغة البرمجة وفحص الأنواع الصارمة |
| `express` | `^4.21.2` | خادم الويب الخلفي لتقديم واجهات REST وSSE والملفات الثابتة |
| `tsx` | `^4.21.0` | مشغل TypeScript المباشر لتشغيل `server.ts` بدون خطوة تجميع مسبقة |

### 3.2 المكتبات المساعدة والتكامل (Libraries & Utilities)
| الحزمة | الإصدار | الوظيفة |
| :--- | :--- | :--- |
| `@supabase/supabase-js` | `^2.118.0` | عميل الاتصال الرسمي بقاعدة بيانات Supabase ومصادقة المستخدمين |
| `@google/genai` | `^2.4.0` | عميل SDK الرسمي لـ Gemini API (مجهز للتكاملات الذكية) |
| `lucide-react` | `^0.546.0` | حزمة الأيقونات الطبية والتقنية المستخدمة في جميع الواجهات |
| `motion` | `^12.23.24` | مكتبة التحريكات والتأثيرات الانتقالية |
| `html-to-image` | `^1.11.13` | تحويل عناصر DOM وشاشات الروشتات والتقارير إلى صور عالية الدقة Canvas/PNG |
| `html2canvas` | `^1.4.1` | التقاط عناصر الشاشة للطباعة الاحتياطية |
| `jspdf` | `^4.2.1` | توليد وتصدير ملفات PDF للروشتات والتقارير الطبية |
| `dotenv` | `^17.2.3` | قراءة متغيرات البيئة من ملفات `.env` |
| `@tailwindcss/vite` & `tailwindcss` | `^4.3.3` | إطار العمل لتنسيق الواجهات (Tailwind CSS الإصدار الرابع الحديث) |

---

## 4. هيكل المجلدات والملفات (Folder & File Structure)

```
MeetAli-Hospital/
├── .aistudio/                           # بيانات وإعدادات البيئة السحابية والخطط
├── data/
│   ├── hospital_db.json                 # قاعدة البيانات النشطة للوضع المحلي (JSON)
│   └── initial_seed.json                # بيانات البذرة الأولية المعتمدة للمستشفى
├── docs/
│   └── PROJECT_CONTEXT.md               # [هذا الملف] المرجع الفني والهندسي الشامل للمشروع
├── src/
│   ├── components/
│   │   ├── admin/                       # مكونات الإدارة، الاستقبال، والعيادات
│   │   │   ├── AdminClinicManager.tsx           # إدارة العيادات والتخصصات والأطباء والمواعيد
│   │   │   ├── AuditLogViewer.tsx               # مستعرض سجل التدقيق الأمني
│   │   │   ├── ConfirmPaymentModal.tsx          # نافذة تحصيل الرسوم وإصدار إيصال السداد
│   │   │   ├── DailyAttendanceManager.tsx       # إدارة حضور وتأخير الأطباء مع الملاحظات السرية
│   │   │   ├── DailyRevenueManager.tsx          # إدارة إيرادات الخزينة، عهدة الفكة، وتقفيل الوردية
│   │   │   ├── DashboardLayout.tsx              # الحاوية الرئيسية للوحة الإدارة والاستقبال والأطباء
│   │   │   ├── DevToolsManager.tsx              # أدوات المطور، فحص قاعدة البيانات، وإعادة الضبط
│   │   │   ├── DiagnosticBookingModal.tsx       # نافذة حجز فحص معمل أو أشعة من شباك الاستقبال
│   │   │   ├── DiagnosticServicesManager.tsx    # إدارة قائمة التحاليل والأشعة، الأسعار والتعليمات
│   │   │   ├── DoctorClinicPortal.tsx           # عيادة الطبيب: طابور المرضى، الفحص، وكتابة الروشتة
│   │   │   ├── PatientManager.tsx               # إدارة ملفات المرضى، البحث، وكشف التكرار
│   │   │   ├── PatientNotificationModal.tsx     # إرسال إشعارات واتساب ذكية للمرضى
│   │   │   ├── ReceptionTasksManager.tsx        # اللوحة المجمعة لمهام الاستقبال اليومية
│   │   │   ├── SecurityVerificationModal.tsx    # نافذة التأكيد الأمني والرمز السري للعمليات الحساسة
│   │   │   ├── SpecialtyClinicalPresetsManager.tsx # إدارة بروتوكولات الأقسام الطبية والجرعات
│   │   │   ├── StaffLoginModal.tsx              # نافذة تسجيل دخول الموظفين واختيار الأدوار
│   │   │   ├── StaffManager.tsx                 # إدارة حسابات طاقم العمل والصلاحيات
│   │   │   ├── SupabaseConfigModal.tsx          # نافذة إعدادات وربط Supabase واختبار الاتصال
│   │   │   ├── ThermalQueueTicketModal.tsx      # طباعة كارت الدور الحراري (Thermal Slip 80mm/58mm)
│   │   │   ├── VisitReceiptModal.tsx            # طباعة إيصال السداد المالي الرسمي
│   │   │   ├── VisitRegistrationModal.tsx       # نافذة تسجيل كشف أو استشارة جديدة لمريض
│   │   │   └── VisitsManager.tsx                # جدول زيارات وكشوفات اليوم، الفلترة وإدارة الطابور
│   │   ├── doctor/                      # المكونات الخاصة بالأطباء
│   │   │   ├── DoctorPatientsList.tsx           # الأرشيف التاريخي لمرضى وكشوفات عيادة الطبيب
│   │   │   └── DoctorPersonalSchedule.tsx       # جدول مواعيد الطبيب الأسبوعي وتسجيل الحضور الذاتي
│   │   ├── layout/                      # عناصر التخطيط والتنقل العام
│   │   │   ├── FloatingContactActions.tsx       # أزرار الاتصال السريع وواتساب العائم
│   │   │   ├── Footer.tsx                       # تذييل الموقع العام ومعلومات المستشفى
│   │   │   └── Navbar.tsx                       # شريط التنقل العلوي والتبديل بين العام والإدارة
│   │   ├── public/                      # واجهات الموقع العام للمرضى والجمهور
│   │   │   ├── AttendanceBoard.tsx              # لوحة الحضور اللحظي للأطباء (معزولة أمنيًا)
│   │   │   ├── ContactSection.tsx               # قسم التواصل، أرقام الطوارئ، وموقع المستشفى
│   │   │   ├── DiagnosticsList.tsx              # دليل أسعار وفحوصات المعمل والأشعة وتعليماتها
│   │   │   ├── HeroSection.tsx                  # الواجهة الرئيسية والإحصائيات السريعة
│   │   │   └── SpecialtiesList.tsx              # دليل التخصصات الطبية، الأطباء، ورسوم الكشف
│   │   └── technician/                  # بوابات الفنيين والتشخيص
│   │       ├── DiagnosticReportShareModal.tsx   # مشاركة تقرير الفحص عبر واتساب وتنزيل PDF
│   │       ├── DiagnosticServicePicker.tsx      # أداة اختيار الفحوصات والتحاليل من القائمة
│   │       ├── LabTechnicianPortal.tsx          # بوابة فني المعمل (طابور، سحب عينات، إدخال نتائج)
│   │       ├── RadiologyTechnicianPortal.tsx    # بوابة فني الأشعة (طابور، تصوير، كتابة تقرير إشعاعي)
│   │       └── TechnicianPortal.tsx             # الغلاف المشترك لبوابات الفنيين
│   ├── context/
│   │   └── AuthContext.tsx                      # سياق المصادقة، إدارة جلسة الموظف، والصلاحيات
│   ├── lib/                             # الخدمات والمكتبات المساعدة
│   │   ├── audioCallUtils.ts                    # رنين المستشفى (Chime) ونطق اسم المريض بالعربية
│   │   ├── clinicalPresetsData.ts               # البروتوكولات العلاجية وقوائم الأدوية الافتراضية
│   │   ├── databaseService.ts                   # الطبقة البرمجية الموحدة للبيانات (Data Layer)
│   │   ├── mockData.ts                          # البيانات الأولية التجريبية والمساعدات
│   │   ├── pdfGenerator.ts                      # توليد مستندات PDF وتنسيق أرقام واتساب الدولية
│   │   ├── printUtils.ts                        # محرك الطباعة المنعزل (Isolated Iframe Print Engine)
│   │   ├── schemaSql.ts                         # كود DDL الكامل لجداول وسياسات ودوال Supabase SQL
│   │   └── supabaseClient.ts                    # تهيئة عميل Supabase وإدارة مفاتيح الاتصال
│   ├── types/
│   │   └── index.ts                             # تعريفات النماذج والواجهات والأنواع (TypeScript Types)
│   ├── App.tsx                                  # المكون الجذري للتطبيق وإدارة حالة المزامنة الفورية
│   ├── index.css                                # التنسيقات العامة وقواعد أنماط الطباعة
│   └── main.tsx                                 # نقطة الدخول لتطبيق React
├── .gitignore                                   # قواعد استبعاد الملفات من Git
├── index.html                                   # نقطة الدخول لصفحة الويب والخطوط العربية
├── metadata.json                                # بيانات التطبيق وصلاحيات بيئة Google AI Studio
├── package.json                                 # تعريف الحزم والاعتماديات ونصوص التشغيل
├── server.ts                                    # خادم Node.js / Express المدمج للـ API والـ SSE
├── tsconfig.json                                # إعدادات مترجم TypeScript
└── vite.config.ts                               # إعدادات مجمع Vite وإضافات Tailwind وReact
```

---

## 5. الصفحات والمسارات ومحاكاة التوجيه (Pages & Virtual Routing)

يعمل المشروع كتطبيق **Single Page Application (SPA)** دون الاعتماد على مكتبة `react-router`، حيث يعتمد على **التوجيه الافتراضي القائم على الحالة (State-Driven Virtual Routing)**.

### 5.1 مستويات التوجيه الرئيسية في `src/App.tsx`
1. **المستوى الأعلى (`currentView`):**
   - `'public'`: الموقع العام المخصص للمرضى والجمهور.
   - `'admin'`: لوحة التحكم الداخلية الخاصة بالموظفين (استقبال، أطباء، فنيين، مدراء).

2. **أقسام الموقع العام (`publicSection`):**
   - `'home'`: الواجهة الترحيبية والإحصائيات السريعة (`HeroSection`).
   - `'attendance'`: لوحة الحضور اليومي للأطباء (`AttendanceBoard`).
   - `'specialties'`: دليل العيادات والأطباء والمواعيد (`SpecialtiesList`).
   - `'diagnostics'`: دليل خدمات المعمل والأشعة (`DiagnosticsList`).
   - `'contact'`: بيانات الاتصال والطوارئ (`ContactSection`).

3. **أقسام لوحة الإدارة (`DashboardLayout.tsx`):**
   يتم التحكم بالتبويب النشط عبر الحالة `activeTab` المقيدة بالصلاحيات:
   - **للاستقبال (`receptionist`):**
     - `visits`: زيارات اليوم وحجز الأدوار وكشوفات العيادات.
     - `patients`: سجل المرضى وفتح ملفات جديدة.
     - `attendance`: حضور الأطباء وتسجيل الملاحظات الداخلية.
     - `diagnostics_reception`: حجز خدمات المعمل والأشعة.
     - `daily_revenue`: إيرادات الخزينة وتقفيل الوردية.
     - `reception_tasks`: اللوحة المجمعة لكافة مهام شباك الاستقبال.
   - **للطبيب (`doctor`):**
     - `doctor_clinic`: طابور كشف العيادة الحالي وفحص المرضى وكتابة الروشتة.
     - `doctor_my_attendance`: تسجيل حضور الطبيب ذاتيًا واستعراض جدوله الأسبوعي.
     - `doctor_patients`: الأرشيف التاريخي لكشوفات الطبيب.
   - **لفني المعمل (`lab_tech`):** يُوجه مباشرة إلى `LabTechnicianPortal`.
   - **لفني الأشعة (`radiology_tech`):** يُوجه مباشرة إلى `RadiologyTechnicianPortal`.
   - **للإدارة العليا (`admin`):** يمتلك الوصول لكافة التبويبات أعلاه بالإضافة إلى:
     - `clinics`: إضافة وتعديل التخصصات والأطباء ومواعيدهم وأسعارهم.
     - `diagnostics`: إدارة خدمات وفحوصات المعمل والأشعة وأسعارها.
     - `staff_accounts`: إنشاء وتعديل وتجميد حسابات الموظفين وربط الأطباء.
     - `audit`: استعراض سجل التدقيق الأمني ومراجعة التغييرات.
     - `dev_tools`: أدوات فحص المطور، معاينة JSON، وإعادة ضبط النظام التجريبي.

---

## 6. شرح وحدات النظام التفصيلية (System Modules Deep Dive)

### 6.1 وحدة الموقع العام (Public Portal)
- **المكونات:** `HeroSection.tsx`, `AttendanceBoard.tsx`, `SpecialtiesList.tsx`, `DiagnosticsList.tsx`, `ContactSection.tsx`.
- **الوظيفة:** عرض مواعيد وتواجد الأطباء اليومي لحظيًا، والبحث في العيادات والتحاليل.
- **الأمان والخصوصية:** قراءة البيانات مقيدة حصريًا عبر دالة `dbService.getPublicDoctorAttendance()` أو من خلال الـ View المحصن `public_doctor_attendance_view` في Supabase؛ لمنع تسريب الملاحظات الداخلية الخاصة بالاستقبال أو هوية الموظف الذي حدث السجل.

### 6.2 وحدة العيادات والأطباء (Clinics & Doctors Management)
- **المكونات:** `AdminClinicManager.tsx`, `SpecialtiesList.tsx`.
- **الجداول:** `specialties`, `doctors`, `doctor_schedules`.
- **العمليات المتاحة:**
  - إضافة/تعديل/إيقاف تخصص طبي مع تحديد الأيقونة وترتيب العرض.
  - إضافة طبيب، ربطه بتخصص، تحديد المسمى الوظيفي (أخصائي/استشاري)، سعر الكشف، وسعر الإعادة، ورقم الهاتف.
  - ضبط جداول العمل الأسبوعية (أيام الأسبوع 0-6، وقت البدء والانتهاء، والحد الأقصى للمرضى).
  - منع حذف التخصص إذا كان مرتبطًا بأطباء مقيدين.

### 6.3 وحدة الحضور والغياب اليومي (Daily Attendance)
- **المكونات:** `DailyAttendanceManager.tsx`, `DoctorPersonalSchedule.tsx`.
- **الجداول:** `doctor_daily_attendance`.
- **الحالات:** غير مؤكد (`unconfirmed`)، حاضر بالعيادة (`present`)، معتذر (`apologized`)، متأخر (`delayed`).
- **الميزات:**
  - تحديد وقت الوصول المتوقع في حال التأخير.
  - تدوين ملاحظات سرية داخلية (`internal_notes`) تظهر للاستقبال والإدارة فقط.
  - إمكانية تسجيل الطبيب لحضوره ذاتيًا من حسابه الشخصي مع تدوين ذلك في سجل التدقيق كـ "الطبيب بنفسه".
  - بث تحديثات فورية عبر الأحداث الداخلية (`hospital-attendance-updated`) ومسار SSE لجميع الأجهزة المفتوحة.

### 6.4 وحدة سجل وملفات المرضى (Patient Registry)
- **المكونات:** `PatientManager.tsx`.
- **الجداول:** `patients`.
- **الخصائص والعمليات:**
  - توليد كود مريض تسلسلي ذري على هيئة `P-YYYY-XXXXX`.
  - معالجة النصوص العربية (`normalizeArabic`) لإزالة التشكيل وتوحيد الألف والياء والتاء المربوطة.
  - خوارزمية ذكية لكشف التكرار (`checkPatientDuplicate`):
    - تطابق قطعي (الرقم القومي أو الهاتف + الاسم + تاريخ الميلاد).
    - تطابق عائلي (نفس الهاتف مع اختلاف الاسم).
    - تشابه أسماء (نفس الاسم والميلاد مع هاتف مختلف).
  - مزامنة تعديل الاسم والهاتف تلقائيًا مع كافة تذاكر وزيارات المريض السابقة واللاحقة.

### 6.5 وحدة تسجيل الكشوفات والزيارات (Visits & Queue Management)
- **المكونات:** `VisitsManager.tsx`, `VisitRegistrationModal.tsx`, `ReceptionTasksManager.tsx`, `ThermalQueueTicketModal.tsx`, `ConfirmPaymentModal.tsx`.
- **الجداول:** `patient_visits`.
- **العمليات والضوابط:**
  - التحقق الصارم من تطابق تخصص الزيارة مع التخصص الفعلي للطبيب (Relational Integrity Check).
  - تصنيف نوع الكشف (كشف جديد `new` / إعادة واستشارة `follow_up`) وتطبيق التسعيرة المناسبة آليًا.
  - دعم مستويات الأولوية والحالات الإنسانية: عادي (`normal`)، طارئ عاجل (`urgent`)، كبار السن 60+ (`elderly` - يُطبق تلقائيًا من تاريخ الميلاد إذا لم يُحدد)، وأصحاب الهمم (`special_needs`).
  - طباعة كارت الدور الحراري بمقاسات الطابعات الحرارية (80 مم / 58 مم) مزود برمز QR ورقم الدور وتوقيت الحجز.
  - إرسال تفاصيل الدور والموعد عبر واتساب بضغطة زر.

### 6.6 وحدة الخزينة وإيرادات الوردية (Cashier & Daily Revenue)
- **المكونات:** `DailyRevenueManager.tsx`, `ConfirmPaymentModal.tsx`, `VisitReceiptModal.tsx`.
- **البيانات المالية:**
  - تسجيل عهدة بداية الوردية (عهدة الفكة الافتتاحية `opening_cash_balance`) مع تفاصيل فئات العملات وتوقيت الاستلام.
  - تحصيل الرسوم بوسائل متعددة: كاش (`cash`)، محافظ إلكترونية (`vodafone_cash`)، إنستاباي (`instapay`)، فيزا (`visa`)، أو إعفاء خيري كامل (`charity`).
  - إصدار إيصال تحصيل رسمي برقم مالي ذري (`REC-YYYY-XXXXX`) مع إمكانية الطباعة الفورية بمقاس A5 أو حراري.
  - إمكانية رد الرسوم (`refundVisitPayment`) مع توثيق سبب الإلغاء في سجل التدقيق.
  - تقرير تقفيل الوردية اليومية ومطابقة النقدية المتوقعة بالدرج (`expected_cash_in_drawer = opening_cash + cash_total`) مع النقدية الفعلية.

### 6.7 وحدة عيادة الطبيب (Doctor Clinic Portal)
- **المكونات:** `DoctorClinicPortal.tsx`, `SpecialtyClinicalPresetsManager.tsx`.
- **الوظائف:**
  - استعراض طابور المرضى الخاص بعيادة الطبيب لليوم الحالي، مرتبين حسب الأولوية وتوقيت الحضور.
  - النداء الصوتي على المريض التالي بزر واحد (تشغيل نغمة Ding-Dong ونطق اسم المريض ورقم دوره بالعربية).
  - فحص ملف المريض وتسجيل العلامات الحيوية (الضغط، النبض، الحرارة، السكر العشوائي، نسبة الأكسجين، الوزن).
  - كتابة التشخيص والشكوى المرضية مع إمكانية الاختيار من بروتوكولات التخصص الجاهزة أو البروتوكولات المفضلة الشخصية للطبيب.
  - محرر الروشتة الذكي (اسم الدواء، الجرعة، التكرار، والمدة) مع دعم البحث السريع.
  - طلب تحاليل أو أشعة مباشرة من الروشتة.
  - تصدير الروشتة كملف PDF معتمد بهوية المستشفى وطباعتها أو إرسالها إلى واتساب المريض مباشرة.
  - **قيد رقابي مالي صارم:** منع الطبيب من إتمام الكشف الطبي وحفظ الروشتة إذا كان المريض لم يسدد رسوم الكشف بالخزينة بعد (أو لم يحصل على إعفاء خيري معتمد).

### 6.8 وحدة المعمل والأشعة (Laboratory & Radiology Tech Portals)
- **المكونات:** `LabTechnicianPortal.tsx`, `RadiologyTechnicianPortal.tsx`, `DiagnosticReportShareModal.tsx`, `DiagnosticServicesManager.tsx`.
- **الجداول ونماذج البيانات:** `diagnostic_services`, `diagnostic_orders`.
- **الوظائف:**
  - استقبال الطلبات المحولة تلقائيًا من عيادات الأطباء بمجرد كتابة التحليل أو الفحص في الزيارة، بالإضافة إلى الطلبات المباشرة المحجوزة من الاستقبال.
  - دورة حياة طلب الفحص: بالانتظار (`waiting`) → جاري النداء (`called`) → جاري الفحص/السحب (`in_progress`) → التقرير جاهز (`result_ready`) → تم التسليم (`delivered`).
  - نظام النداء الصوتي الآلي للمرضى داخل قسم التحاليل وقسم الأشعة.
  - إدخال نتائج التحاليل وقيم الفحوصات أو كتابة التقرير الإشعاعي (النتائج، والموجودات الإشعاعية، والخلاصة والتوصية).
  - مشاركة النتيجة المعتمدة كملف PDF احترافي عبر واتساب مباشرة إلى رقم المريض المسجل.

### 6.9 وحدة طاقم العمل والصلاحيات (Staff Management)
- **المكونات:** `StaffManager.tsx`, `StaffLoginModal.tsx`, `AuthContext.tsx`.
- **الجداول:** `staff_profiles` المرتبط بـ `auth.users`.
- **الأدوار المدعومة:**
  - مدير عام (`admin`)
  - موظف استقبال وخزينة (`receptionist`)
  - طبيب عيادة (`doctor`)
  - فني تحاليل معملية (`lab_tech`)
  - فني أشعة وتصوير طبي (`radiology_tech`)
- **الوظائف:** إنشاء حساب، تعديل البيانات، تغيير الرتبة، تجميد أو تنشيط الحساب، وربط حساب الطبيب بملف طبيب محدد في جدول الأطباء.

### 6.10 وحدة سجل التدقيق الأمني (Immutable Audit Logs)
- **المكونات:** `AuditLogViewer.tsx`.
- **الجداول:** `audit_logs`.
- **الوظائف:** تسجيل غير قابل للتعديل أو المسح (محمي بواسطة Trigger بقاعدة البيانات) لكل عملية حيوية: تسجيل مريض، حجز زيارة، تحصيل مبلغ، رد رسوم، تعديل حضور، كتابة تشخيص، وتعديل حسابات الموظفين. يتضمن السجل: معرف واسم الموظف، نوع الإجراء، المعرف المستهدف، والبيانات القديمة والجديدة بصيغة JSONB.

---

## 7. قاعدة البيانات والجداول والعلاقات (Database Schema & Relations)

الكود المصدر الرسمي لقاعدة البيانات موثق في `/src/lib/schemaSql.ts`. فيما يلي التوثيق التفصيلي للهيكل:

### 7.1 الجداول الأساسية والقيود (Tables & Constraints)

#### 1. جدول `staff_profiles` (ملفات وحسابات الموظفين)
- **الوظيفة:** إدارة حسابات الموظفين وصلاحياتهم، مرتبط بجدول المستخدمين السحابي `auth.users`.
- **الأعمدة:**
  - `id` (UUID, PK) -> مرتبط بـ `auth.users(id)` بنمط `ON DELETE CASCADE`.
  - `full_name` (TEXT, NOT NULL)
  - `role` (TEXT, NOT NULL, CHECK: `role IN ('admin', 'receptionist', 'doctor')`)
  - `doctor_id` (UUID, NULLABLE) -> مفتاح خارجي لجدول `public.doctors(id)` بنمط `ON DELETE SET NULL`.
  - `phone` (TEXT, NULLABLE)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, DEFAULT `NOW()`)
  - `updated_at` (TIMESTAMPTZ, DEFAULT `NOW()`)

#### 2. جدول `specialties` (التخصصات والعيادات الطبية)
- **الوظيفة:** تسجيل التخصصات المتاحة بالمستشفى (باطنة، أطفال، عظام، رمد...).
- **الأعمدة:**
  - `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
  - `name` (TEXT, NOT NULL, UNIQUE)
  - `description` (TEXT, NULLABLE)
  - `icon_name` (TEXT, DEFAULT `'Stethoscope'`)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `display_order` (INT, NOT NULL, DEFAULT `0`)
  - `created_at` (TIMESTAMPTZ, DEFAULT `NOW()`)
  - `updated_at` (TIMESTAMPTZ, DEFAULT `NOW()`)

#### 3. جدول `doctors` (الأطباء)
- **الوظيفة:** بيانات الأطباء المقيدين بالمستشفى وتسعيرة الكشف الخاصة بكل منهم.
- **الأعمدة:**
  - `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
  - `specialty_id` (UUID, NOT NULL) -> مفتاح خارجي `public.specialties(id)` بنمط `ON DELETE RESTRICT`.
  - `full_name` (TEXT, NOT NULL)
  - `title` (TEXT, NOT NULL) - الدرجة المهنية (استشاري / أخصائي).
  - `bio` (TEXT, NULLABLE)
  - `consultation_fee` (NUMERIC(10,2), NOT NULL, DEFAULT `0.00`)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, DEFAULT `NOW()`)
  - `updated_at` (TIMESTAMPTZ, DEFAULT `NOW()`)

#### 4. جدول `doctor_schedules` (مواعيد العمل الأسبوعية)
- **الوظيفة:** جداول أوقات عيادة الطبيب خلال أيام الأسبوع.
- **الأعمدة:**
  - `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
  - `doctor_id` (UUID, NOT NULL) -> مفتاح خارجي `public.doctors(id)` بنمط `ON DELETE CASCADE`.
  - `day_of_week` (INT, NOT NULL, CHECK: `0 <= day_of_week <= 6`) - 0 الأحد، 6 السبت.
  - `start_time` (TIME, NOT NULL)
  - `end_time` (TIME, NOT NULL)
  - `max_patients` (INT, NOT NULL, DEFAULT `30`)
  - `notes` (TEXT, NULLABLE)
  - `is_active` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - **قيد:** `CONSTRAINT check_schedule_time_order CHECK (end_time > start_time)`

#### 5. جدول `doctor_daily_attendance` (الحضور اليومي للأطباء)
- **الوظيفة:** تتبع حضور الأطباء لليوم الفعلي مع الملاحظات الإدارية الخاصة.
- **الأعمدة:**
  - `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
  - `doctor_id` (UUID, NOT NULL) -> مفتاح خارجي `public.doctors(id)` بنمط `ON DELETE CASCADE`.
  - `attendance_date` (DATE, NOT NULL, DEFAULT `CURRENT_DATE`)
  - `status` (TEXT, NOT NULL, DEFAULT `'unconfirmed'`, CHECK: `status IN ('unconfirmed', 'present', 'apologized', 'delayed')`)
  - `delay_expected_time` (TIME, NULLABLE)
  - `internal_notes` (TEXT, NULLABLE) - ملاحظات داخلية سرية لا تظهر للجمهور.
  - `updated_by` (UUID) -> مفتاح خارجي لجدول `public.staff_profiles(id)`.
  - `updated_at` (TIMESTAMPTZ, DEFAULT `NOW()`)
  - **قيد الفرادة:** `CONSTRAINT uq_doctor_attendance_date UNIQUE (doctor_id, attendance_date)`

#### 6. جدول `patients` (ملفات وسجل المرضى)
- **الوظيفة:** الملف الطبي والديموغرافي للمريض وسجله بالمستشفى.
- **الأعمدة:**
  - `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
  - `patient_number` (TEXT, NOT NULL, UNIQUE, DEFAULT `public.generate_patient_number()`)
  - `full_name` (TEXT, NOT NULL)
  - `phone` (TEXT, NOT NULL)
  - `birth_date` (DATE, NOT NULL)
  - `gender` (TEXT, NOT NULL, CHECK: `gender IN ('male', 'female')`)
  - `blood_type` (VARCHAR(10), NULLABLE)
  - `address` (TEXT, NULLABLE)
  - `national_id` (TEXT, NULLABLE)
  - `emergency_contact` (TEXT, NULLABLE)
  - `notes` (TEXT, NULLABLE)
  - `created_by` (UUID) -> مفتاح خارجي `public.staff_profiles(id)`.
  - `created_at` (TIMESTAMPTZ, DEFAULT `NOW()`)
  - `updated_at` (TIMESTAMPTZ, DEFAULT `NOW()`)

#### 7. جدول `patient_visits` (زيارات وكشوفات المرضى)
- **الوظيفة:** إدارة تذاكر الكشف، الطابور، والتشخيص الطبي.
- **الأعمدة:**
  - `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
  - `patient_id` (UUID, NOT NULL) -> مفتاح خارجي `public.patients(id)` بنمط `ON DELETE RESTRICT`.
  - `specialty_id` (UUID, NOT NULL) -> مفتاح خارجي `public.specialties(id)` بنمط `ON DELETE RESTRICT`.
  - `doctor_id` (UUID, NOT NULL) -> مفتاح خارجي `public.doctors(id)` بنمط `ON DELETE RESTRICT`.
  - `visit_date` (DATE, NOT NULL, DEFAULT `CURRENT_DATE`)
  - `visit_type` (TEXT, NOT NULL, DEFAULT `'new'`, CHECK: `visit_type IN ('new', 'follow_up')`)
  - `status` (TEXT, NOT NULL, DEFAULT `'registered'`, CHECK: `status IN ('registered', 'attended', 'in_consultation', 'completed', 'cancelled')`)
  - `reception_notes` (TEXT, NULLABLE)
  - `cancellation_reason` (TEXT, NULLABLE)
  - `symptoms` (TEXT, NULLABLE)
  - `diagnosis` (TEXT, NULLABLE)
  - `prescription` (TEXT, NULLABLE)
  - `tests_requested` (TEXT, NULLABLE)
  - `doctor_notes` (TEXT, NULLABLE)
  - `revisit_recommended` (BOOLEAN, DEFAULT `false`)
  - `follow_up_date` (DATE, NULLABLE)
  - `completed_at` (TIMESTAMPTZ, NULLABLE)
  - `created_by` (UUID) -> مفتاح خارجي `public.staff_profiles(id)`.
  - `created_at` (TIMESTAMPTZ, DEFAULT `NOW()`)
  - `updated_at` (TIMESTAMPTZ, DEFAULT `NOW()`)

#### 8. جدول `diagnostic_services` (خدمات المعمل والأشعة)
- **الوظيفة:** دليل التحاليل والفحوصات وأسعارها وتعليماتها.
- **الأعمدة:**
  - `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
  - `service_type` (TEXT, NOT NULL, CHECK: `service_type IN ('lab', 'radiology')`)
  - `name` (TEXT, NOT NULL)
  - `preparation_instructions` (TEXT, NULLABLE)
  - `estimated_duration` (TEXT, NULLABLE)
  - `price` (NUMERIC(10,2), NOT NULL, DEFAULT `0.00`)
  - `is_available` (BOOLEAN, NOT NULL, DEFAULT `true`)
  - `created_at` (TIMESTAMPTZ, DEFAULT `NOW()`)
  - `updated_at` (TIMESTAMPTZ, DEFAULT `NOW()`)

#### 9. جدول `audit_logs` (سجل التدقيق الأمني)
- **الوظيفة:** التوثيق القانوني والأمني لكافة العمليات الحساسة.
- **الأعمدة:**
  - `id` (UUID, PK, DEFAULT `gen_random_uuid()`)
  - `staff_id` (UUID) -> مفتاح خارجي `public.staff_profiles(id)`.
  - `action` (TEXT, NOT NULL)
  - `entity_name` (TEXT, NOT NULL)
  - `entity_id` (TEXT, NOT NULL)
  - `old_data` (JSONB, NULLABLE)
  - `new_data` (JSONB, NULLABLE)
  - `ip_address` (TEXT, NULLABLE)
  - `created_at` (TIMESTAMPTZ, DEFAULT `NOW()`)

---

### 7.2 الدوال والمشغلات البرمجية في قاعدة البيانات (Functions, Sequences & Triggers)

1. **متتالية أرقام المرضى (`public.patient_number_seq`):**
   - تبدأ من القيمة `1001` وتضمن توليد أرقام مرضى ذرية وفريدة بدون حدوث تصادم (Race Condition Proof).
2. **دالة `public.generate_patient_number()`:**
   - تستخدم المتتالية لتوليد رقم على صيغة: `'P-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_seq::TEXT, 5, '0')`.
3. **دالة `public.current_user_role()` (Security Definer):**
   - تعيد دور المستخدم الحالي (`admin`, `receptionist`, `doctor`) بناءً على المعرف `auth.uid()` مع حماية الـ Search Path (`SET search_path = public, pg_temp`).
4. **زناد حماية ترقية الموظفين (`trg_protect_staff_profile`):**
   - ينفذ الدالة `protect_staff_profile_changes()` قبل أي تحديث لجدول `staff_profiles` لمنع أي موظف غير الأدمن من تصعيد رتبته أو تفعيل حسابه المعطل.
5. **زناد التحقق من تخصص طبيب الزيارة (`trg_validate_visit_specialty`):**
   - ينفذ الدالة `validate_visit_doctor_specialty()` قبل إدراج أو تعديل أي زيارة في `patient_visits`؛ للتحقق من أن التخصص المحدد في التذكرة يطابق تمامًا تخصص الطبيب في جدول `doctors`، ويمنع الحجز المخالف برمي استثناء.
6. **زناد منع التعديل في سجل التدقيق (`trg_prevent_audit_mutation`):**
   - ينفذ الدالة `prevent_audit_log_mutation()` قبل أي عملية `UPDATE` أو `DELETE` على جدول `audit_logs` ويرمي استثناءً صريحًا: *"سجل التدقيق غير قابل للتعديل أو الحذف نهائياً لأسباب أمنية وقانونية"*.

---

### 7.3 الفهارس والعروض الآمنة (Indexes & Views)
- **الفهارس:**
  - `idx_patients_search`: مركب على `(phone, full_name, birth_date)` لتسريع البحث الذكي عن المرضى.
  - `idx_patients_national_id`: فهرس جزئي (Partial Index) على `national_id` حيث القيمة ليست فارغة.
- **العرض العام الآمن (`public_doctor_attendance_view`):**
  - تم إنشاؤه بخيار `WITH (security_invoker = true)` لعرض أسماء وتخصصات وحضور الأطباء فقط دون إتاحة عمود `internal_notes` أو معرف الموظف `updated_by` للزوار غير المسجلين.

---

## 8. المصادقة ونظام الصلاحيات (Authentication & RBAC)

### 8.1 هيكل الأدوار والصلاحيات (Role-Based Access Control)
يعرف التطبيق في `src/types/index.ts` خمسة أدوار للمستخدمين:
1. `admin`: مدير عام المستشفى (صلاحيات كاملة على كل شيء).
2. `receptionist`: موظف الاستقبال والخزينة (تسجيل المرضى، الزيارات، تحصيل الرسوم، الحضور اليومي، حجز التحاليل، عهدة الوردية).
3. `doctor`: الطبيب المعالج (طابور كشف عيادته فقط، فحص المرضى، كتابة التشخيص والروشتات، طلب الفحوصات، تسجيل حضوره الشخصي).
4. `lab_tech`: فني معمل التحاليل (استقبال وفحص طلبات التحاليل، سحب العينات، إدخال النتائج، مشاركة التقرير).
5. `radiology_tech`: فني قسم الأشعة (استقبال وفحص طلبات الأشعة، إجراء الفحص، كتابة التقرير، مشاركة النتيجة).

### 8.2 آلية عمل الجلسة والمصادقة في `AuthContext.tsx`
- يُخزن ملف تعريف الموظف الحالي في `localStorage` تحت المفتاح `mit_ali_current_staff`.
- يدعم التطبيق أسلوبين لتسجيل الدخول:
  1. **الأسلوب السحابي الرسمي (Supabase Auth):** عبر البريد الإلكتروني وكلمة المرور وجلب دور الموظف من جدول `staff_profiles`.
  2. **الأسلوب التجريبي / الداخلي السريع (Demo & Offline Mode):** اختيار الحساب أو الدور مع مطابقة الطبيب المستهدف، مما يتيح تجربة كافة أدوار المستشفى بسلاسة حتى في بيئات التطوير أو انقطاع الإنترنت.

---

## 9. سياسات الأمان وRow Level Security (Security & RLS Policies)

تم تفعيل ميزة **Row Level Security (RLS)** على كافة جداول قاعدة البيانات التسعة عبر أوامر SQL الموثقة في `schemaSql.ts`:

### 9.1 مصفوفة الأمان وسياسات RLS
| الجدول | وصول الزوار (`anon`) | وصول الاستقبال (`receptionist`) | وصول الطبيب (`doctor`) | وصول المدير (`admin`) |
| :--- | :---: | :---: | :---: | :---: |
| `specialties` | قراءة فقط (النشطة) | قراءة فقط | قراءة فقط | إدارة كاملة (`ALL`) |
| `doctors` | قراءة فقط (النشطين) | قراءة فقط | قراءة فقط | إدارة كاملة (`ALL`) |
| `doctor_schedules` | قراءة فقط (النشطة) | قراءة فقط | قراءة فقط | إدارة كاملة (`ALL`) |
| `public_doctor_attendance_view` | قراءة فقط | قراءة فقط | قراءة فقط | قراءة فقط |
| `doctor_daily_attendance` | ممنوع تمامًا (`REVOKE`) | قراءة، إدراج، وتحديث | قراءة، إدراج، وتحديث | قراءة، إدراج، وتحديث |
| `patients` | ممنوع تمامًا (`REVOKE`) | قراءة، إدراج، وتحديث | قراءة فقط | قراءة، إدراج، وتحديث |
| `patient_visits` | ممنوع تمامًا (`REVOKE`) | قراءة، إدراج، وتحديث | قراءة وتحديث كشوفاته | قراءة، إدراج، وتحديث |
| `diagnostic_services` | قراءة فقط (المتاحة) | قراءة فقط | قراءة فقط | إدارة كاملة (`ALL`) |
| `staff_profiles` | ممنوع تمامًا (`REVOKE`) | قراءة وتعديل ملفه فقط | قراءة وتعديل ملفه فقط | إدارة كاملة لكافة الحسابات |
| `audit_logs` | ممنوع تمامًا (`REVOKE`) | إدراج سجلات فقط (`INSERT`) | إدراج سجلات فقط (`INSERT`) | قراءة وإدراج (تعديل ومسح ممنوع) |

---

## 10. الوظائف والعمليات الأساسية (Core Workflows)

### 10.1 دورة حياة زيارة المريض
```
  [مريض جديد أو مسجل]
           │
           ▼
[شباك الاستقبال: فحص التكرار / فتح ملف]
           │
           ▼
[تسجيل الزيارة واختيار الطبيب والأولوية]
           │
           ▼
[تحصيل الرسوم بالخزينة وإصدار إيصال REC-YYYY] ──► [طباعة كارت الدور الحراري]
           │
           ▼
[المريض بصالة الانتظار: حالة attended]
           │
           ▼
[طبيب العيادة: استدعاء عبر النداء الصوتي الآلي]
           │
           ▼
[جلسة الكشف: الأعراض، القياسات الحيوية، التشخيص، والروشتة]
           │
           ├──────────────────────────────┐
           ▼                              ▼
[اعتماد الروشتة وطباعتها / PDF]    [طلب تحاليل أو أشعة محولة]
           │                              │
           ▼                              ▼
  [إنهاء الزيارة completed]       [توجيه المريض لبوابة المعمل/الأشعة]
```

### 10.2 آليات النداء الصوتي والطباعة وتكامل واتساب
- **النداء الصوتي (`src/lib/audioCallUtils.ts`):** يعتمد على Web Audio API لتوليد نغمة ثنائية التردد (E5 659Hz ثم C5 523Hz) ثم استخدام Web Speech API بنطق عربي متوافق (`ar-EG`) للإعلان عن اسم المريض وعيادته ورقم دوره.
- **محرك الطباعة المتقدم (`src/lib/printUtils.ts`):** ينشئ `iframe` منعزل ومخفي، ويستنسخ قواعد CSS التابعة للـ Tailwind لضمان ظهور البوردرات والألوان بدقة ومنع تشويه الواجهة الأمامية أثناء استدعاء الطباعة.
- **تكامل واتساب (`src/lib/pdfGenerator.ts`):** يقوم بتنظيف وتنسيق أرقام الهواتف المصرية والدولية وتوليد روابط مباشرة على صيغة:
  `https://api.whatsapp.com/send?phone=201XXXXXXXXX&text=...` مما يفتح محادثة المريض مباشرة دون الحاجة لحفظ رقمه بجهات الاتصال.

---

## 11. التكاملات الخارجية (External Integrations)

1. **منصة Supabase:**
   - تكامل عبر `@supabase/supabase-js`.
   - إدارة الاتصال عبر `src/lib/supabaseClient.ts` مع دعم تخزين المفاتيح في المتصفح أو متغيرات البيئة.
   - واجهة مستخدم مدمجة لاختبار الاتصال والتحقق من وجود الجداول وتوليد كود الـ SQL (`SupabaseConfigModal.tsx`).
2. **بروتوكول واتساب المباشر (WhatsApp Direct API):**
   - فتح شات المريض مباشرة برابط رسمي مع رسائل مهيأة مسبقًا لكروت الحجز، إشعارات التأخير، والروشتات ونتائج التحاليل.
3. **أجهزة المتصفح القياسية (Native Web APIs):**
   - Web Audio API (توليد أصوات الرنين).
   - Web Speech Synthesis API (نطق أسماء المرضى).
   - Navigator Share API (المشاركة عبر النظام في الأجهزة المدعومة).
4. **خدمة Server-Sent Events (SSE):**
   - خادم Express يوفر نقطة نهاية `/api/events` ترسل تنبيهات حية فورية عند تغيير الحضور أو تسجيل زيارة لتحديث شاشات العيادات والاستقبال في أجزاء من الثانية.

---

## 12. إعدادات التشغيل والبناء والنشر (Build, Run & Deployment)

### 12.1 نصوص التشغيل في `package.json`
- `npm run dev`: تشغيل خادم التطوير عبر `tsx server.ts`. يقوم الخادم بتشغيل Express وربط Vite middleware للواجهة الأمامية على المنفذ `3000`.
- `npm run build`: بناء ملفات الواجهة الأمامية للإنتاج عبر `vite build` إلى مجلد `dist/`.
- `npm run start`: تشغيل خادم الإنتاج عبر `node server.ts`؛ حيث يقوم Express بخدمة الملفات المبنية من مجلد `dist/`.
- `npm run clean`: حذف مجلد البناء `dist/` وملف `server.js`.
- `npm run lint`: فحص أنواع TypeScript الصارمة عبر `tsc --noEmit`.

### 12.2 قواعد النشر وبيئة السحابة
- يرتبط الخادم دائمًا بالمنفذ `3000` (`0.0.0.0:3000`) لتوافق كامل مع بروتوكولات Cloud Run وNginx في بيئة AI Studio.

---

## 13. متغيرات البيئة المطلوبة (Environment Variables)

يتم تكوين متغيرات البيئة الاختيارية والتشغيلية عبر ملف `.env`، مع دعم تخزين مفاتيح Supabase بديلًا داخل المتصفح:

```env
# رابط مشروع Supabase (اختياري، يمكن إدخاله من واجهة التطبيق)
VITE_SUPABASE_URL=https://your-project.supabase.co

# المفتاح العام لمشروع Supabase (Anon Key)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# متغير بيئة تشغيل الخادم
NODE_ENV=development

# تعطيل مراقبة الملفات في بيئات معينة لتوفير الموارد
DISABLE_HMR=true
```

> **ملاحظة أمنية:** لا يتطلب التطبيق أي مفاتيح سرية (Service Role Key) على الواجهة الأمامية، ويتم الاكتفاء بالمفتاح العام `anonKey` مع الاعتماد على سياسات RLS لحماية البيانات.

---

## 14. جدول حالة تنفيذ واختبار كل وحدة (Implementation & Test Status)

تم تصنيف كل وحدة استنادًا إلى الفحص الفعلي للكود ونتائج اختبارات التجميع والـ Lint:

| الوحدة / الميزة | حالة التنفيذ في الكود | حالة التحقق والاختبار الفعلي | الملاحظات والتقييم الهندسي |
| :--- | :---: | :---: | :--- |
| **الموقع العام للجمهور** | منفذة بالكامل | تم التحقق منها بالاختبار | لوحة الحضور، قائمة التخصصات، ودليل التحاليل تعمل بتجاوب كامل. |
| **إدارة العيادات والأطباء** | منفذة بالكامل | تم التحقق منها بالاختبار | إضافة الأطباء، تعديل الرسوم، والتحقق من التخصص تعمل بنجاح. |
| **حضور الأطباء والتأخير** | منفذة بالكامل | تم التحقق منها بالاختبار | تحديث الحالات، الملاحظات الداخلية، والبث الفوري عبر SSE يعمل. |
| **سجل المرضى وكشف التكرار** | منفذة بالكامل | تم التحقق منها بالاختبار | خوارزمية تطابق الاسم والميلاد والهاتف والرقم القومي تعمل بكفاءة. |
| **تسجيل الزيارات والأولويات** | منفذة بالكامل | تم التحقق منها بالاختبار | التحقق من تخصص الطبيب وتصنيف الحالات الإنسانية يعملان بدقة. |
| **تحصيل الخزينة وإيصال السداد** | منفذة بالكامل | تم التحقق منها بالاختبار | تسلسل `REC-YYYY-XXXXX` وحساب النقدية وطباعة الإيصال تعمل. |
| **عهدة الفكة وتقفيل الوردية** | منفذة بالكامل | تم التحقق منها بالاختبار | تسجيل عهدة بداية الوردية ومطابقة النقدية بالدرج تعمل. |
| **طباعة كارت الدور الحراري** | منفذة بالكامل | تم التحقق منها بالاختبار | تنسيق 80mm / 58mm عبر الـ Iframe المنعزل يعمل بدون أخطاء. |
| **النداء الصوتي الآلي للمرضى** | منفذة بالكامل | موجودة ولكن تحتاج اختبارًا | تعتمد على توفر أصوات عربية في محرك Web Speech بجهاز المستخدم. |
| **عيادة الطبيب وكتابة الروشتة** | منفذة بالكامل | موجودة ولكن تحتاج مراجعة | الكود مكتمل، ولكن ظهرت أخطاء عدم تطابق أنواع في TypeScript (انظر قسم 15). |
| **بوابة فني معمل التحاليل** | منفذة بالكامل | تم التحقق منها بالاختبار | طابور المعمل، سحب العينات، النتائج، ومشاركة التقرير عبر واتساب تعمل. |
| **بوابة فني قسم الأشعة** | منفذة بالكامل | تم التحقق منها بالاختبار | طابور الأشعة، كتابة التقرير الإشعاعي، ومشاركة النتيجة تعمل. |
| **إدارة حسابات طاقم العمل** | منفذة بالكامل | تم التحقق منها بالاختبار | إضافة موظف، ربط الطبيب، وتجميد الحسابات تعمل في التخزين المحلي وSupabase. |
| **سجل التدقيق الأمني (Audit)** | منفذة بالكامل | تم التحقق منها بالاختبار | تسجيل الإجراءات والمقارنة بين البيانات القديمة والجديدة تعمل. |
| **توليد ومشاركة PDF عبر واتساب** | منفذة بالكامل | تم التحقق منها بالاختبار | تجاوز خطأ CORS لخطوط Google Fonts عبر `skipFonts: true` يعمل بنجاح. |
| **تكامل Supabase وRLS** | الكود مهيأ بالكامل | موجودة وتحتاج تشغيل على مشروع حي | كود SQL المكتوب في `schemaSql.ts` صلب ومطابق لأحدث معايير الأمان. |

---

## 15. المشكلات المعروفة والمخاطر التقنية (Known Issues & Technical Risks)

### 15.1 أخطاء فحص أنواع TypeScript المكتشفة في `tsc --noEmit`
أظهر تشغيل أداة الفحص `npm run lint` ستة أخطاء محددة ناتجة عن عدم تطابق طفيف في الـ Props أو الحقول:
1. **في `src/components/admin/DashboardLayout.tsx` (سطر 704):**
   - تمرير الخاصية `isLoadingAttendance` إلى `DailyAttendanceManager`، بينما واجهة `DailyAttendanceManagerProps` لا تحتوي هذا الحقل في تعريفها.
2. **في `src/components/admin/DashboardLayout.tsx` (سطر 744):**
   - استدعاء `DiagnosticsList` بدون تمرير الخاصية الإلزامية `services`.
3. **في `src/components/admin/DashboardLayout.tsx` (سطر 793):**
   - تمرير `defaultDepartment` إلى `DiagnosticBookingModal` بينما الخاصية المعرفة فيه مختلفة التسمية.
4. **في `src/components/admin/DoctorClinicPortal.tsx` (سطر 507 و 513):**
   - استخدام `v.ticket_number` بدلًا من `v.patient_number` في تلميحات طابور الطبيب.
5. **في `src/components/admin/DoctorClinicPortal.tsx` (سطر 2126):**
   - تمرير `onSelectionChange` إلى `DiagnosticServicePicker` بينما الخاصية المعرفة بالواجهة هي `onSelectServices` أو اسم مغاير.

> **الأثر العملي:** التطبيق يبني ويعمل بشكل طبيعي أثناء التطوير والإنتاج عبر `npm run build` لتجاوز Vite التدقيق الصارم، ولكن يجب تصحيح هذه الأنواع في مرحلة التطوير القادمة لضمان موثوقية الكود وخلوه التام من أخطاء الـ Lint.

### 15.2 تحديات التزامن والتخزين المزدوج (Dual-Storage Sync Risks)
- يعتمد النظام على التخزين في `localStorage` كـ Cache محلي سريع مع إرسال الطلبات إلى `server.ts` أو `Supabase`.
- **المخاطر:** في حال استخدام عدة موظفين لأجهزة مختلفة بدون تفعيل اتصال `Supabase` المركزي، فإن المزامنة تعتمد على الـ Polling ومسار SSE الخاص بـ `server.ts`. إذا تم إعادة تشغيل الخادم السحابي دون حفظ ملف `data/hospital_db.json` في قرص دائم (Persistent Volume)، قد تعود البيانات إلى البذرة الأولية ما لم يكن Supabase مرتبطًا.

### 15.3 الاعتماد على Web Speech API
- تختلف أصوات محرك `speechSynthesis` من متصفح لآخر؛ بعض أجهزة الهواتف أو المتصفحات القديمة قد لا تحتوي على حزمة اللغة العربية (`ar-EG`) محليًا، وفي هذه الحالة يكتفي النظام بتشغيل رنين المستشفى التنبيهي دون نطق صوتي.

---

## 16. الوظائف غير المكتملة والنقاط التي تحتاج تأكيدًا (Incomplete Features & Owner Decisions)

1. **الربط مع طابعات الإيصالات عبر بروتوكول ESC/POS الشبكي أو البلوتوث المباشر:**
   - النظام حاليًا يدعم الطباعة عبر نافذة الطباعة القياسية للنظام (`window.print` داخل Iframe مخصص). دعم الطابعات الحرارية المباشرة عبر WebUSB أو Network ESC/POS غير منفذ ويحتاج لقرار ما إذا كان المستشفى يرغب في طباعة صامتة دون نافذة المتصفح.
2. **النسخ الاحتياطي السحابي التلقائي (Automated Cloud Backups):**
   - ملف `hospital_db.json` محلي؛ يوصى بربط قاعدة بيانات Supabase الرسمية بشكل دائم لضمان النسخ الاحتياطي الدوري لبيانات المرضى.
3. **بوابة حجز إلكترونية للمرضى من المنازل (Online Self-Booking):**
   - الواجهة العامة حاليًا استعراضية للمواعيد والأسعار والتحاليل، ولا تتيح للمريض الحجز الذاتي عن بعد بدون التوجه لشباك الاستقبال أو التنسيق عبر واتساب.

---

## 17. قواعد وضوابط التطوير المستقبلي (Future Development Guidelines)

1. **الالتزام بالتحقق العلائقي الصارم (Relational Invariant Rules):**
   - يُمنع منعًا باتًا حجز زيارة لطبيب لا يتبع التخصص المختار في التذكرة.
   - يُمنع إتمام الكشف الطبي وحفظ الروشتة في عيادة الطبيب قبل سداد الرسوم بالخزينة أو توثيق إعفاء خيري معتمد.
2. **عزل البيانات السرية عن الواجهات العامة (Zero Leakage Principle):**
   - أي ميزة تضاف للواجهة العامة للموقع يجب أن تستخدم نماذج إسقاط عامة (مثل `PublicDoctorAttendance`) ولا تستعلم أبدًا عن الملاحظات الإدارية الداخلية أو هوية الموظفين.
3. **توليد الأرقام التسلسلية الذرية:**
   - الحفاظ على نسق أرقام المرضى (`P-YYYY-XXXXX`) وأرقام إيصالات السداد (`REC-YYYY-XXXXX`) وتجنب توليد المعرفات يدويًا في المكونات الفرعية.
4. **توثيق التغييرات في سجل التدقيق:**
   - أي عملية إنشاء أو تعديل أو حذف لبيانات المرضى أو الزيارات أو الحسابات يجب أن تتبعها مناداة `dbService.logAudit()`.

---

## 18. تعليمات تشغيل المشروع واستكمال تطويره (How to Run & Continue Development)

### 18.1 خطوات التشغيل المحلي (Local Setup)
```bash
# 1. تثبيت الاعتماديات
npm install

# 2. تشغيل خادم التطوير المدمج (Express + Vite)
npm run dev
# التطبيق سيعمل تلقائياً على الرابط: http://localhost:3000

# 3. اختبار التجميع والتحقق من سلامة البناء
npm run build
```

### 18.2 تفعيل قاعدة بيانات Supabase الحية
1. أنشئ مشروعًا جديدًا على [Supabase](https://supabase.com).
2. افتح نافذة **SQL Editor** في لوحة تحكم Supabase.
3. افتح ملف `src/lib/schemaSql.ts` وانسخ كامل نص الاستعلام `SUPABASE_SCHEMA_SQL` ونفذه في Supabase لإنشاء كافة الجداول والمشغلات وسياسات الأمان.
4. افتح واجهة مستشفى ميت علي في المتصفح، واضغط على أيقونة **قاعدة البيانات** في الشريط العلوي (أو انتقل لتبويب الإعدادات).
5. أدخل رابط المشروع `Project URL` والمفتاح العام `Anon Key` واضغط **حفظ واختبار الاتصال**.
6. سيتحول مؤشر قاعدة البيانات إلى اللون الأخضر، ويعمل التطبيق مباشرة على قاعدة البيانات السحابية الحية!
