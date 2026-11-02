export const SUPABASE_SCHEMA_SQL = `-- =====================================================================
-- نظام إدارة مستشفى لجنة الزكاة بميت علي
-- كود إنشاء قاعدة البيانات وسياسات الأمان RLS المحدثة لـ Supabase PostgreSQL
-- =====================================================================

-- تفعيل امتداد توليد المعرفات الفريدة
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 1. جدول ملفات الموظفين (مرتبط بـ auth.users)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'receptionist', 'doctor')),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- دالة مساعدة محصنة لجلب دور المستخدم الحالي
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM public.staff_profiles
    WHERE id = auth.uid() AND is_active = true;
    RETURN COALESCE(v_role, 'anon');
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- حماية: منع موظف الاستقبال من تصعيد صلاحياته أو تغيير حالة حسابه
CREATE OR REPLACE FUNCTION public.protect_staff_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (public.current_user_role() != 'admin') THEN
        IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
            RAISE EXCEPTION 'غير مصرح لك بتعديل الرتبة أو حالة الحساب.';
        END IF;
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_staff_profile ON public.staff_profiles;
CREATE TRIGGER trg_protect_staff_profile
BEFORE UPDATE ON public.staff_profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_staff_profile_changes();


-- =====================================================================
-- 2. جدول التخصصات الطبية
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_name TEXT DEFAULT 'Stethoscope',
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- 3. جدول الأطباء
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    title TEXT NOT NULL,
    bio TEXT,
    consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- 4. جدول جداول المواعيد الأسبوعية للأطباء
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_patients INT NOT NULL DEFAULT 30,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT check_schedule_time_order CHECK (end_time > start_time)
);


-- =====================================================================
-- 5. جدول الحضور اليومي للأطباء (داخلي يحتوي على ملاحظات سرية)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.doctor_daily_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'unconfirmed' CHECK (status IN ('unconfirmed', 'present', 'apologized', 'delayed')),
    delay_expected_time TIME,
    internal_notes TEXT,
    updated_by UUID REFERENCES public.staff_profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_doctor_attendance_date UNIQUE (doctor_id, attendance_date)
);

-- عرض عام محصن (Public View) للموقع العام بدون الملاحظات وهوية الموظف
CREATE OR REPLACE VIEW public.public_doctor_attendance_view
WITH (security_invoker = true)
AS
SELECT 
    dda.doctor_id,
    d.full_name AS doctor_name,
    d.title AS doctor_title,
    s.id AS specialty_id,
    s.name AS specialty_name,
    dda.attendance_date,
    dda.status,
    dda.delay_expected_time,
    dda.updated_at
FROM public.doctor_daily_attendance dda
JOIN public.doctors d ON dda.doctor_id = d.id
JOIN public.specialties s ON d.specialty_id = s.id
WHERE d.is_active = true AND s.is_active = true;


-- =====================================================================
-- 6. جدول ملفات المرضى وتسلسل أرقام المرضى الذري (Race Condition Proof)
-- =====================================================================
CREATE SEQUENCE IF NOT EXISTS public.patient_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION public.generate_patient_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_year TEXT;
    v_seq INT;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YYYY');
    v_seq := nextval('public.patient_number_seq');
    RETURN 'P-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_number TEXT NOT NULL UNIQUE DEFAULT public.generate_patient_number(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    birth_date DATE NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    blood_type VARCHAR(10),
    address TEXT,
    national_id TEXT,
    emergency_contact TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.staff_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_search ON public.patients (phone, full_name, birth_date);
CREATE INDEX IF NOT EXISTS idx_patients_national_id ON public.patients (national_id) WHERE national_id IS NOT NULL;


-- =====================================================================
-- 7. جدول زيارات المرضى والتحقق الصارم من تخصص الطبيب
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.patient_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE RESTRICT,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    visit_type TEXT NOT NULL DEFAULT 'new' CHECK (visit_type IN ('new', 'follow_up')),
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'in_consultation', 'completed', 'cancelled')),
    reception_notes TEXT,
    cancellation_reason TEXT,
    -- الحقول الطبية الخاصة بكشف وتشخيص الطبيب
    symptoms TEXT,
    diagnosis TEXT,
    prescription TEXT,
    tests_requested TEXT,
    doctor_notes TEXT,
    revisit_recommended BOOLEAN DEFAULT false,
    follow_up_date DATE,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.staff_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: التحقق من توافق تخصص الزيارة مع تخصص الطبيب
CREATE OR REPLACE FUNCTION public.validate_visit_doctor_specialty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_doc_specialty UUID;
BEGIN
    SELECT specialty_id INTO v_doc_specialty
    FROM public.doctors
    WHERE id = NEW.doctor_id;

    IF v_doc_specialty IS NULL THEN
        RAISE EXCEPTION 'الطبيب المحدد غير موجود في النظام.';
    END IF;

    IF v_doc_specialty != NEW.specialty_id THEN
        RAISE EXCEPTION 'تعارض أمني: التخصص المختار في الزيارة لا يتطابق مع تخصص الطبيب الفعلي.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_visit_specialty ON public.patient_visits;
CREATE TRIGGER trg_validate_visit_specialty
BEFORE INSERT OR UPDATE ON public.patient_visits
FOR EACH ROW
EXECUTE FUNCTION public.validate_visit_doctor_specialty();


-- =====================================================================
-- 8. جدول خدمات المعمل والأشعة
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.diagnostic_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type TEXT NOT NULL CHECK (service_type IN ('lab', 'radiology')),
    name TEXT NOT NULL,
    preparation_instructions TEXT,
    estimated_duration TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- 9. جدول سجل التدقيق غير القابل للتعديل أو الحذف (Immutable Log)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.staff_profiles(id),
    action TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'سجل التدقيق غير قابل للتعديل أو الحذف نهائياً لأسباب أمنية وقانونية.';
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_mutation ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_mutation
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_log_mutation();


-- =====================================================================
-- 10. ضبط صلاحيات GRANT و REVOKE الدقيقة
-- =====================================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

GRANT SELECT ON public.specialties TO anon, authenticated;
GRANT SELECT ON public.doctors TO anon, authenticated;
GRANT SELECT ON public.doctor_schedules TO anon, authenticated;
GRANT SELECT ON public.diagnostic_services TO anon, authenticated;
GRANT SELECT ON public.public_doctor_attendance_view TO anon, authenticated;

REVOKE ALL ON public.doctor_daily_attendance FROM anon;
REVOKE ALL ON public.patients FROM anon;
REVOKE ALL ON public.patient_visits FROM anon;
REVOKE ALL ON public.staff_profiles FROM anon;
REVOKE ALL ON public.audit_logs FROM anon;

GRANT SELECT, INSERT, UPDATE ON public.patients TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.patient_visits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.doctor_daily_attendance TO authenticated;
GRANT SELECT, UPDATE ON public.staff_profiles TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.patient_number_seq TO authenticated;


-- =====================================================================
-- 11. تفعيل سياسات Row Level Security (RLS)
-- =====================================================================
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- specialties
DROP POLICY IF EXISTS "Public read specialties" ON public.specialties;
CREATE POLICY "Public read specialties" ON public.specialties
FOR SELECT USING (is_active = true OR public.current_user_role() IN ('admin', 'receptionist'));

DROP POLICY IF EXISTS "Admin manage specialties" ON public.specialties;
CREATE POLICY "Admin manage specialties" ON public.specialties
FOR ALL USING (public.current_user_role() = 'admin');

-- doctors
DROP POLICY IF EXISTS "Public read doctors" ON public.doctors;
CREATE POLICY "Public read doctors" ON public.doctors
FOR SELECT USING (is_active = true OR public.current_user_role() IN ('admin', 'receptionist'));

DROP POLICY IF EXISTS "Admin manage doctors" ON public.doctors;
CREATE POLICY "Admin manage doctors" ON public.doctors
FOR ALL USING (public.current_user_role() = 'admin');

-- doctor_schedules
DROP POLICY IF EXISTS "Public read schedules" ON public.doctor_schedules;
CREATE POLICY "Public read schedules" ON public.doctor_schedules
FOR SELECT USING (is_active = true OR public.current_user_role() IN ('admin', 'receptionist'));

DROP POLICY IF EXISTS "Admin manage schedules" ON public.doctor_schedules;
CREATE POLICY "Admin manage schedules" ON public.doctor_schedules
FOR ALL USING (public.current_user_role() = 'admin');

-- doctor_daily_attendance
DROP POLICY IF EXISTS "Staff read attendance" ON public.doctor_daily_attendance;
CREATE POLICY "Staff read attendance" ON public.doctor_daily_attendance
FOR SELECT USING (public.current_user_role() IN ('admin', 'receptionist'));

DROP POLICY IF EXISTS "Staff manage attendance" ON public.doctor_daily_attendance;
CREATE POLICY "Staff manage attendance" ON public.doctor_daily_attendance
FOR ALL USING (public.current_user_role() IN ('admin', 'receptionist'));

-- patients
DROP POLICY IF EXISTS "Staff view patients" ON public.patients;
CREATE POLICY "Staff view patients" ON public.patients
FOR SELECT USING (public.current_user_role() IN ('admin', 'receptionist'));

DROP POLICY IF EXISTS "Staff insert patients" ON public.patients;
CREATE POLICY "Staff insert patients" ON public.patients
FOR INSERT WITH CHECK (public.current_user_role() IN ('admin', 'receptionist'));

DROP POLICY IF EXISTS "Staff update patients" ON public.patients;
CREATE POLICY "Staff update patients" ON public.patients
FOR UPDATE USING (public.current_user_role() IN ('admin', 'receptionist'));

-- patient_visits
DROP POLICY IF EXISTS "Staff view visits" ON public.patient_visits;
CREATE POLICY "Staff view visits" ON public.patient_visits
FOR SELECT USING (public.current_user_role() IN ('admin', 'receptionist'));

DROP POLICY IF EXISTS "Staff insert visits" ON public.patient_visits;
CREATE POLICY "Staff insert visits" ON public.patient_visits
FOR INSERT WITH CHECK (public.current_user_role() IN ('admin', 'receptionist'));

DROP POLICY IF EXISTS "Staff update visits" ON public.patient_visits;
CREATE POLICY "Staff update visits" ON public.patient_visits
FOR UPDATE USING (public.current_user_role() IN ('admin', 'receptionist'));

-- diagnostic_services
DROP POLICY IF EXISTS "Public read diagnostics" ON public.diagnostic_services;
CREATE POLICY "Public read diagnostics" ON public.diagnostic_services
FOR SELECT USING (is_available = true OR public.current_user_role() IN ('admin', 'receptionist'));

DROP POLICY IF EXISTS "Admin manage diagnostics" ON public.diagnostic_services;
CREATE POLICY "Admin manage diagnostics" ON public.diagnostic_services
FOR ALL USING (public.current_user_role() = 'admin');

-- staff_profiles
DROP POLICY IF EXISTS "Staff read profile" ON public.staff_profiles;
CREATE POLICY "Staff read profile" ON public.staff_profiles
FOR SELECT USING (auth.uid() = id OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin insert staff" ON public.staff_profiles;
CREATE POLICY "Admin insert staff" ON public.staff_profiles
FOR INSERT WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Staff update profile" ON public.staff_profiles;
CREATE POLICY "Staff update profile" ON public.staff_profiles
FOR UPDATE USING (auth.uid() = id OR public.current_user_role() = 'admin');

-- audit_logs
DROP POLICY IF EXISTS "Admin read audit" ON public.audit_logs;
CREATE POLICY "Admin read audit" ON public.audit_logs
FOR SELECT USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Staff insert audit" ON public.audit_logs;
CREATE POLICY "Staff insert audit" ON public.audit_logs
FOR INSERT WITH CHECK (public.current_user_role() IN ('admin', 'receptionist'));
`;
