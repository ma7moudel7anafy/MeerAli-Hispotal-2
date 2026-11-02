import {
  Specialty,
  Doctor,
  DoctorSchedule,
  DoctorDailyAttendance,
  PublicDoctorAttendance,
  Patient,
  PatientVisit,
  DiagnosticService,
  StaffProfile,
  AuditLog,
  DuplicateCheckResult,
  UserRole,
  ClinicalProtocol,
  QuickCommonDrug,
  SpecialtyClinicalPreset,
  BookingSource,
  PaymentStatus,
  PaymentMethod,
  DailyRevenueSummary,
  VisitStatus,
  VisitPriority,
  ShiftOpeningFloat,
  DiagnosticOrder,
  DiagnosticTestStatus,
} from '../types';
import { DEFAULT_SPECIALTY_PRESETS, GENERAL_CLINICAL_PRESET } from './clinicalPresetsData';
import { getSupabaseClient } from './supabaseClient';
import {
  INITIAL_SPECIALTIES,
  INITIAL_DOCTORS,
  INITIAL_SCHEDULES,
  INITIAL_ATTENDANCE,
  INITIAL_PATIENTS,
  INITIAL_VISITS,
  INITIAL_DIAGNOSTICS,
  INITIAL_STAFF,
  INITIAL_AUDIT_LOGS,
  INITIAL_DIAGNOSTIC_ORDERS,
  getTodayDateString,
} from './mockData';

// Local storage keys for realistic offline/demo persistence
const DB_PREFIX = 'mit_ali_db_';
const KEY_SPECIALTIES = DB_PREFIX + 'specialties';
const KEY_DOCTORS = DB_PREFIX + 'doctors';
const KEY_SCHEDULES = DB_PREFIX + 'schedules';
const KEY_ATTENDANCE = DB_PREFIX + 'attendance';
const KEY_PATIENTS = DB_PREFIX + 'patients';
const KEY_VISITS = DB_PREFIX + 'visits';
const KEY_DIAGNOSTICS = DB_PREFIX + 'diagnostics';
const KEY_DIAGNOSTIC_ORDERS = DB_PREFIX + 'diagnostic_orders';
const KEY_STAFF = DB_PREFIX + 'staff';
const KEY_AUDIT = DB_PREFIX + 'audit';
const KEY_PATIENT_SEQ = DB_PREFIX + 'pat_seq';
const KEY_RECEIPT_SEQ = DB_PREFIX + 'receipt_seq';
const KEY_CLINICAL_PRESETS = DB_PREFIX + 'clinical_presets';
const KEY_DOCTOR_FAVORITES = DB_PREFIX + 'doctor_favorites';
const KEY_SHIFT_FLOATS = DB_PREFIX + 'shift_opening_floats';

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

// Arabic Text Normalizer for fuzzy matching (removes diacritics, unifies alef, taa marbouta, yaa)
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel/harakat
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

class DatabaseService {
  private isSupabaseActive(): boolean {
    return getSupabaseClient() !== null;
  }

  // =========================================================================
  // 1. التخصصات الطبية (Specialties)
  // =========================================================================
  async getSpecialties(): Promise<Specialty[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('specialties')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (!error && data) return data as Specialty[];
    }
    return loadLocal<Specialty[]>(KEY_SPECIALTIES, INITIAL_SPECIALTIES).filter(s => s.is_active);
  }

  async createSpecialty(
    specialtyData: {
      name: string;
      description?: string;
      icon_name?: string;
    },
    staffProfile?: StaffProfile
  ): Promise<Specialty> {
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    const specialties = loadLocal<Specialty[]>(KEY_SPECIALTIES, INITIAL_SPECIALTIES);
    const newSpec: Specialty = {
      id: `spec-${Date.now()}`,
      name: specialtyData.name.trim(),
      description: specialtyData.description?.trim() || '',
      icon_name: specialtyData.icon_name || 'Stethoscope',
      is_active: true,
      display_order: specialties.length + 1,
      created_at: now,
      updated_at: now,
    };

    if (client && staffProfile) {
      const { data, error } = await client
        .from('specialties')
        .insert({
          name: newSpec.name,
          description: newSpec.description,
          icon_name: newSpec.icon_name,
          is_active: true,
          display_order: newSpec.display_order,
        })
        .select()
        .single();
      if (!error && data) {
        await this.logAudit({
          staff_id: staffProfile.id,
          staff_name: staffProfile.full_name,
          action: 'CREATE_SPECIALTY',
          entity_name: 'specialties',
          entity_id: data.id,
          new_data: data,
        });
        specialties.push(data as Specialty);
        saveLocal(KEY_SPECIALTIES, specialties);
        return data as Specialty;
      }
    }

    specialties.push(newSpec);
    saveLocal(KEY_SPECIALTIES, specialties);

    if (staffProfile) {
      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'CREATE_SPECIALTY',
        entity_name: 'specialties',
        entity_id: newSpec.id,
        new_data: newSpec,
      });
    }

    return newSpec;
  }

  async updateSpecialty(
    id: string,
    updates: Partial<Specialty>,
    staffProfile?: StaffProfile
  ): Promise<Specialty> {
    const client = getSupabaseClient();
    const specialties = loadLocal<Specialty[]>(KEY_SPECIALTIES, INITIAL_SPECIALTIES);
    const index = specialties.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error('القسم غير موجود');
    }

    const oldSpec = { ...specialties[index] };
    const updatedSpec = { ...oldSpec, ...updates };

    if (client && staffProfile) {
      const { data, error } = await client
        .from('specialties')
        .update({
          name: updatedSpec.name,
          description: updatedSpec.description,
          icon_name: updatedSpec.icon_name,
          is_active: updatedSpec.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        specialties[index] = data as Specialty;
      } else {
        specialties[index] = updatedSpec;
      }
    } else {
      specialties[index] = updatedSpec;
    }

    saveLocal(KEY_SPECIALTIES, specialties);

    // If specialty name was updated, update doctors and attendance caches
    if (updates.name && updates.name !== oldSpec.name) {
      const doctors = loadLocal<Doctor[]>(KEY_DOCTORS, INITIAL_DOCTORS);
      let changed = false;
      doctors.forEach(d => {
        if (d.specialty_id === id) {
          d.specialty_name = updates.name!;
          changed = true;
        }
      });
      if (changed) {
        saveLocal(KEY_DOCTORS, doctors);
      }
    }

    if (staffProfile) {
      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'UPDATE_SPECIALTY',
        entity_name: 'specialties',
        entity_id: id,
        old_data: oldSpec,
        new_data: updatedSpec,
      });
    }

    return specialties[index];
  }

  async deleteSpecialty(
    id: string,
    staffProfile?: StaffProfile
  ): Promise<{ success: boolean; message?: string }> {
    const doctors = await this.getDoctors();
    const docsInSpec = doctors.filter(d => d.specialty_id === id);
    if (docsInSpec.length > 0) {
      return {
        success: false,
        message: `لا يمكن حذف العيادة لوجود ${docsInSpec.length} طبيب مقيد بها. يرجى نقل أو حذف الأطباء أولاً.`,
      };
    }

    const client = getSupabaseClient();
    if (client && staffProfile) {
      const { error } = await client.from('specialties').update({ is_active: false }).eq('id', id);
      if (error) {
        return { success: false, message: error.message };
      }
    }

    const specialties = loadLocal<Specialty[]>(KEY_SPECIALTIES, INITIAL_SPECIALTIES);
    const targetSpec = specialties.find(s => s.id === id);
    const updated = specialties.map(s => (s.id === id ? { ...s, is_active: false } : s));
    saveLocal(KEY_SPECIALTIES, updated);

    if (staffProfile && targetSpec) {
      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'DELETE_SPECIALTY',
        entity_name: 'specialties',
        entity_id: id,
        old_data: { name: targetSpec.name },
      });
    }

    return { success: true };
  }

  // =========================================================================
  // 2. الأطباء (Doctors)
  // =========================================================================
  async getDoctors(): Promise<Doctor[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('doctors')
        .select('*, specialties(name)')
        .eq('is_active', true);
      if (!error && data) {
        return data.map((d: any) => ({
          ...d,
          specialty_name: d.specialties?.name || '',
        })) as Doctor[];
      }
    }
    const specs = await this.getSpecialties();
    const specMap = new Map(specs.map(s => [s.id, s.name]));
    const doctors = loadLocal<Doctor[]>(KEY_DOCTORS, INITIAL_DOCTORS);
    return doctors
      .filter(d => d.is_active)
      .map(d => ({
        ...d,
        specialty_name: specMap.get(d.specialty_id) || d.specialty_name || '',
      }));
  }

  async createDoctor(
    doctorData: {
      specialty_id: string;
      full_name: string;
      title: string;
      bio?: string;
      consultation_fee: number;
      followup_fee?: number;
      phone?: string;
    },
    staffProfile?: StaffProfile
  ): Promise<Doctor> {
    const specs = await this.getSpecialties();
    const spec = specs.find(s => s.id === doctorData.specialty_id);
    const client = getSupabaseClient();
    const now = new Date().toISOString();

    const newDoc: Doctor = {
      id: `doc-${Date.now()}`,
      specialty_id: doctorData.specialty_id,
      specialty_name: spec?.name || '',
      full_name: doctorData.full_name.trim(),
      title: doctorData.title,
      bio: doctorData.bio?.trim() || '',
      consultation_fee: doctorData.consultation_fee,
      followup_fee: doctorData.followup_fee !== undefined ? doctorData.followup_fee : Math.round(doctorData.consultation_fee / 2),
      phone: doctorData.phone?.trim() || '',
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    if (client && staffProfile) {
      const { data, error } = await client
        .from('doctors')
        .insert({
          specialty_id: newDoc.specialty_id,
          full_name: newDoc.full_name,
          title: newDoc.title,
          bio: newDoc.bio,
          consultation_fee: newDoc.consultation_fee,
          followup_fee: newDoc.followup_fee,
          phone: newDoc.phone,
          is_active: true,
        })
        .select()
        .single();
      if (!error && data) {
        await this.logAudit({
          staff_id: staffProfile.id,
          staff_name: staffProfile.full_name,
          action: 'CREATE_DOCTOR',
          entity_name: 'doctors',
          entity_id: data.id,
          new_data: data,
        });
        const doctors = loadLocal<Doctor[]>(KEY_DOCTORS, INITIAL_DOCTORS);
        const mapped = { ...data, specialty_name: spec?.name || '' };
        doctors.push(mapped);
        saveLocal(KEY_DOCTORS, doctors);
        return mapped as Doctor;
      }
    }

    const doctors = loadLocal<Doctor[]>(KEY_DOCTORS, INITIAL_DOCTORS);
    doctors.push(newDoc);
    saveLocal(KEY_DOCTORS, doctors);

    if (staffProfile) {
      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'CREATE_DOCTOR',
        entity_name: 'doctors',
        entity_id: newDoc.id,
        new_data: newDoc,
      });
    }

    return newDoc;
  }

  async updateDoctor(
    doctorId: string,
    doctorData: {
      full_name: string;
      title: string;
      specialty_id: string;
      consultation_fee: number;
      followup_fee?: number;
      phone?: string;
      bio?: string;
    },
    staffProfile?: StaffProfile
  ): Promise<{ success: boolean; data?: Doctor; message?: string }> {
    const specs = await this.getSpecialties();
    const spec = specs.find(s => s.id === doctorData.specialty_id);
    const client = getSupabaseClient();
    const now = new Date().toISOString();

    const fee = doctorData.consultation_fee;
    const followup = doctorData.followup_fee !== undefined ? doctorData.followup_fee : Math.round(fee / 2);

    if (client && staffProfile) {
      const { data, error } = await client
        .from('doctors')
        .update({
          full_name: doctorData.full_name.trim(),
          title: doctorData.title,
          specialty_id: doctorData.specialty_id,
          consultation_fee: fee,
          followup_fee: followup,
          phone: doctorData.phone?.trim() || '',
          bio: doctorData.bio?.trim() || '',
          updated_at: now,
        })
        .eq('id', doctorId)
        .select()
        .single();

      if (!error && data) {
        await this.logAudit({
          staff_id: staffProfile.id,
          staff_name: staffProfile.full_name,
          action: 'UPDATE_DOCTOR',
          entity_name: 'doctors',
          entity_id: doctorId,
          new_data: data,
        });
      }
    }

    const doctors = loadLocal<Doctor[]>(KEY_DOCTORS, INITIAL_DOCTORS);
    const targetIndex = doctors.findIndex(d => d.id === doctorId);
    if (targetIndex === -1) {
      return { success: false, message: 'لم يتم العثور على الطبيب المطلوب' };
    }

    const oldDoc = doctors[targetIndex];
    const updatedDoc: Doctor = {
      ...oldDoc,
      full_name: doctorData.full_name.trim(),
      title: doctorData.title,
      specialty_id: doctorData.specialty_id,
      specialty_name: spec?.name || oldDoc.specialty_name,
      consultation_fee: fee,
      followup_fee: followup,
      phone: doctorData.phone?.trim() || '',
      bio: doctorData.bio?.trim() || '',
      updated_at: now,
    };

    doctors[targetIndex] = updatedDoc;
    saveLocal(KEY_DOCTORS, doctors);

    // Keep daily attendance cached doctor names & titles in sync
    const attendance = loadLocal<DoctorDailyAttendance[]>(KEY_ATTENDANCE, INITIAL_ATTENDANCE);
    let attChanged = false;
    const syncedAttendance = attendance.map(a => {
      if (a.doctor_id === doctorId) {
        attChanged = true;
        return {
          ...a,
          doctor_name: updatedDoc.full_name,
          doctor_title: updatedDoc.title,
          specialty_name: updatedDoc.specialty_name,
        };
      }
      return a;
    });
    if (attChanged) {
      saveLocal(KEY_ATTENDANCE, syncedAttendance);
    }

    if (staffProfile) {
      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'UPDATE_DOCTOR',
        entity_name: 'doctors',
        entity_id: doctorId,
        old_data: { full_name: oldDoc.full_name, specialty_id: oldDoc.specialty_id, consultation_fee: oldDoc.consultation_fee },
        new_data: { full_name: updatedDoc.full_name, specialty_id: updatedDoc.specialty_id, consultation_fee: updatedDoc.consultation_fee },
      });
    }

    return { success: true, data: updatedDoc };
  }

  async deleteDoctor(
    doctorId: string,
    staffProfile?: StaffProfile
  ): Promise<{ success: boolean; message?: string }> {
    const client = getSupabaseClient();
    if (client && staffProfile) {
      const { error } = await client.from('doctors').update({ is_active: false }).eq('id', doctorId);
      if (error) {
        return { success: false, message: error.message };
      }
    }

    const doctors = loadLocal<Doctor[]>(KEY_DOCTORS, INITIAL_DOCTORS);
    const targetDoc = doctors.find(d => d.id === doctorId);
    const updated = doctors.map(d => (d.id === doctorId ? { ...d, is_active: false } : d));
    saveLocal(KEY_DOCTORS, updated);

    // Also remove from attendance records
    const attendance = loadLocal<DoctorDailyAttendance[]>(KEY_ATTENDANCE, INITIAL_ATTENDANCE);
    const updatedAtt = attendance.filter(a => a.doctor_id !== doctorId);
    saveLocal(KEY_ATTENDANCE, updatedAtt);

    if (staffProfile && targetDoc) {
      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'DELETE_DOCTOR',
        entity_name: 'doctors',
        entity_id: doctorId,
        old_data: { full_name: targetDoc.full_name, specialty_id: targetDoc.specialty_id },
      });
    }

    return { success: true };
  }

  // =========================================================================
  // 3. جداول مواعيد الأطباء (Doctor Schedules)
  // =========================================================================
  async getDoctorSchedules(doctorId?: string): Promise<DoctorSchedule[]> {
    const client = getSupabaseClient();
    if (client) {
      let query = client.from('doctor_schedules').select('*').eq('is_active', true);
      if (doctorId) query = query.eq('doctor_id', doctorId);
      const { data, error } = await query;
      if (!error && data) return data as DoctorSchedule[];
    }
    const schedules = loadLocal<DoctorSchedule[]>(KEY_SCHEDULES, INITIAL_SCHEDULES);
    return schedules.filter(s => s.is_active && (!doctorId || s.doctor_id === doctorId));
  }

  // =========================================================================
  // 4. الحضور اليومي للأطباء - واجهة القراءة العامة المحصنة (Public View)
  // =========================================================================
  // حماية: عزل تام للملاحظات السرية الداخلية وهوية الموظف عن الموقع العام
  async getPublicDoctorAttendance(date: string = getTodayDateString()): Promise<PublicDoctorAttendance[]> {
    const client = getSupabaseClient();
    if (client) {
      // قراءة من العرض العام الآمن فقط
      const { data, error } = await client
        .from('public_doctor_attendance_view')
        .select('*')
        .eq('attendance_date', date);
      if (!error && data) return data as PublicDoctorAttendance[];
    }

    // الوضع المحلي / التجريبي: إرجاع الإسقاط العام فقط دون كشف internal_notes
    const doctors = await this.getDoctors();
    const attendanceRecords = loadLocal<DoctorDailyAttendance[]>(KEY_ATTENDANCE, INITIAL_ATTENDANCE);

    return doctors.map(doc => {
      const match = attendanceRecords.find(
        a => a.doctor_id === doc.id && a.attendance_date === date
      );

      return {
        doctor_id: doc.id,
        doctor_name: doc.full_name,
        doctor_title: doc.title,
        specialty_id: doc.specialty_id,
        specialty_name: doc.specialty_name || '',
        attendance_date: date,
        status: match ? match.status : 'unconfirmed',
        delay_expected_time: match?.delay_expected_time || null,
        updated_at: match?.updated_at || new Date().toISOString(),
      };
    });
  }

  // =========================================================================
  // 5. الحضور اليومي للأطباء - واجهة الاستقبال والإدارة الداخلية (Internal View)
  // =========================================================================
  async getInternalDoctorAttendance(date: string = getTodayDateString()): Promise<DoctorDailyAttendance[]> {
    const client = getSupabaseClient();
    // 1. Supabase check
    if (client) {
      const { data, error } = await client
        .from('doctor_daily_attendance')
        .select('*, doctors(full_name, title, specialty_id, specialties(name))')
        .eq('attendance_date', date);
      if (!error && data) {
        return data.map((d: any) => ({
          ...d,
          doctor_name: d.doctors?.full_name,
          doctor_title: d.doctors?.title,
          specialty_name: d.doctors?.specialties?.name,
        })) as DoctorDailyAttendance[];
      }
    }

    // 2. Central Server API query for live multi-device synchronization
    const doctors = await this.getDoctors();
    try {
      const resp = await fetch(`/api/attendance?date=${encodeURIComponent(date)}`);
      if (resp.ok) {
        const serverAtt = await resp.json();
        if (Array.isArray(serverAtt) && serverAtt.length > 0) {
          saveLocal(KEY_ATTENDANCE, serverAtt);
          return doctors.map(doc => {
            const match = serverAtt.find(
              (a: any) => a.doctor_id === doc.id && a.attendance_date === date
            );
            return (
              match || {
                id: `att-temp-${doc.id}`,
                doctor_id: doc.id,
                doctor_name: doc.full_name,
                doctor_title: doc.title,
                specialty_name: doc.specialty_name,
                attendance_date: date,
                status: 'unconfirmed',
                delay_expected_time: null,
                internal_notes: 'لم يتم تسجيل تأكيد حضور لليوم بعد',
                updated_by_name: 'النظام الآلي',
                updated_at: new Date().toISOString(),
              }
            );
          });
        }
      }
    } catch {
      // offline fallback to local storage
    }

    // 3. LocalStorage fallback
    const attendanceRecords = loadLocal<DoctorDailyAttendance[]>(KEY_ATTENDANCE, INITIAL_ATTENDANCE);

    return doctors.map(doc => {
      const match = attendanceRecords.find(
        a => a.doctor_id === doc.id && a.attendance_date === date
      );

      return (
        match || {
          id: `att-temp-${doc.id}`,
          doctor_id: doc.id,
          doctor_name: doc.full_name,
          doctor_title: doc.title,
          specialty_name: doc.specialty_name,
          attendance_date: date,
          status: 'unconfirmed',
          delay_expected_time: null,
          internal_notes: 'لم يتم تسجيل تأكيد حضور لليوم بعد',
          updated_by_name: 'النظام الآلي',
          updated_at: new Date().toISOString(),
        }
      );
    });
  }

  async updateDoctorAttendance(
    doctorId: string,
    attendanceDate: string,
    status: DoctorDailyAttendance['status'],
    delayExpectedTime?: string | null,
    internalNotes?: string | null,
    staffProfile?: StaffProfile
  ): Promise<DoctorDailyAttendance> {
    const client = getSupabaseClient();
    const now = new Date().toISOString();

    // Determine descriptive updater display name
    let updaterDisplayName = 'موظف الاستقبال';
    if (staffProfile) {
      if (staffProfile.role === 'doctor') {
        updaterDisplayName = `الطبيب بنفسه (${staffProfile.full_name})`;
      } else if (staffProfile.role === 'admin') {
        updaterDisplayName = `إدارة المستشفى (${staffProfile.full_name})`;
      } else {
        updaterDisplayName = `الاستقبال (${staffProfile.full_name})`;
      }
    }

    if (client && staffProfile) {
      const { data, error } = await client
        .from('doctor_daily_attendance')
        .upsert(
          {
            doctor_id: doctorId,
            attendance_date: attendanceDate,
            status,
            delay_expected_time: delayExpectedTime || null,
            internal_notes: internalNotes || null,
            updated_by: staffProfile.id,
            updated_at: now,
          },
          { onConflict: 'doctor_id,attendance_date' }
        )
        .select()
        .single();

      if (!error && data) {
        await this.logAudit({
          staff_id: staffProfile.id,
          staff_name: staffProfile.full_name,
          action: 'UPDATE_ATTENDANCE',
          entity_name: 'doctor_daily_attendance',
          entity_id: data.id,
          new_data: { doctorId, status, delayExpectedTime, internalNotes, updaterDisplayName },
        });

        // Dispatch live event for instant UI synchronization
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('hospital-attendance-updated', {
              detail: {
                doctorId,
                attendanceDate,
                status,
                delayExpectedTime,
                updaterDisplayName,
              },
            })
          );
        }

        return data as DoctorDailyAttendance;
      }
    }

    // Local / Demo implementation
    const records = loadLocal<DoctorDailyAttendance[]>(KEY_ATTENDANCE, INITIAL_ATTENDANCE);
    const existingIndex = records.findIndex(
      r => r.doctor_id === doctorId && r.attendance_date === attendanceDate
    );
    const existingRecord = existingIndex >= 0 ? records[existingIndex] : null;

    const doc = (await this.getDoctors()).find(d => d.id === doctorId);

    // If internalNotes is undefined, keep existing notes so they are not wiped out
    const finalNotes = internalNotes !== undefined 
      ? (internalNotes || '') 
      : (existingRecord?.internal_notes || '');

    const updatedRecord: DoctorDailyAttendance = {
      id: existingRecord ? existingRecord.id : `att-${Date.now()}`,
      doctor_id: doctorId,
      doctor_name: doc?.full_name || 'طبيب',
      doctor_title: doc?.title || '',
      specialty_name: doc?.specialty_name || '',
      attendance_date: attendanceDate,
      status,
      delay_expected_time: delayExpectedTime !== undefined ? delayExpectedTime : (existingRecord?.delay_expected_time || null),
      internal_notes: finalNotes,
      updated_by_name: updaterDisplayName,
      updated_at: now,
    };

    if (existingIndex >= 0) {
      records[existingIndex] = updatedRecord;
    } else {
      records.push(updatedRecord);
    }
    saveLocal(KEY_ATTENDANCE, records);

    await this.logAudit({
      staff_id: staffProfile?.id,
      staff_name: updaterDisplayName,
      action: 'UPDATE_ATTENDANCE',
      entity_name: 'doctor_daily_attendance',
      entity_id: updatedRecord.id,
      new_data: { doctor: doc?.full_name, status, delayExpectedTime, updater: updaterDisplayName },
    });

    // Broadcast to central server API for multi-device sync
    try {
      fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId,
          attendanceDate,
          status,
          delayExpectedTime: updatedRecord.delay_expected_time,
          internalNotes: finalNotes,
          updaterDisplayName,
        }),
      }).catch(err => console.debug('Central attendance sync note:', err));
    } catch {
      // ignore
    }

    // Dispatch live event for instant UI synchronization across views and windows
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hospital-attendance-updated', {
          detail: {
            doctorId,
            attendanceDate,
            status,
            delayExpectedTime,
            updaterDisplayName,
          },
        })
      );
    }

    return updatedRecord;
  }

  // =========================================================================
  // 6. ملفات المرضى وفحص التطابقات لمنع التكرار (Patient Registry)
  // =========================================================================
  async getPatients(searchTerm: string = ''): Promise<Patient[]> {
    const client = getSupabaseClient();
    if (client) {
      let query = client.from('patients').select('*').order('created_at', { ascending: false });
      if (searchTerm.trim()) {
        const s = searchTerm.trim();
        query = query.or(
          `full_name.ilike.%${s}%,phone.ilike.%${s}%,patient_number.ilike.%${s}%,national_id.ilike.%${s}%`
        );
      }
      const { data, error } = await query.limit(50);
      if (!error && data) return data as Patient[];
    }

    try {
      const resp = await fetch('/api/patients');
      if (resp.ok) {
        const serverPatients = await resp.json();
        if (Array.isArray(serverPatients) && serverPatients.length > 0) {
          saveLocal(KEY_PATIENTS, serverPatients);
        }
      }
    } catch {
      // offline fallback
    }

    const all = loadLocal<Patient[]>(KEY_PATIENTS, INITIAL_PATIENTS);
    if (!searchTerm.trim()) return all;

    const term = normalizeArabic(searchTerm);
    return all.filter(p => {
      const nameNorm = normalizeArabic(p.full_name);
      return (
        nameNorm.includes(term) ||
        p.phone.includes(searchTerm) ||
        p.patient_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.national_id && p.national_id.includes(searchTerm))
      );
    });
  }

  // فحص ذكي مسبق قبل إنشاء المريض لمنع التكرار
  async checkPatientDuplicate(
    phone: string,
    fullName: string,
    birthDate: string,
    nationalId?: string
  ): Promise<DuplicateCheckResult> {
    const patients = await this.getPatients();
    const cleanPhone = phone.trim();
    const normInputName = normalizeArabic(fullName);
    const cleanNationalId = nationalId ? nationalId.trim() : '';

    let exactMatchPatient: Patient | undefined;
    const potentialMatches: DuplicateCheckResult['potentialMatches'] = [];

    for (const p of patients) {
      const pNormName = normalizeArabic(p.full_name);
      const isPhoneMatch = p.phone === cleanPhone;
      const isNameExact = pNormName === normInputName;
      const isBirthMatch = p.birth_date === birthDate;
      const isNationalIdMatch = cleanNationalId && p.national_id === cleanNationalId;

      // 1. قطعي: الرقم القومي متطابق أو (الهاتف + الاسم + الميلاد)
      if (isNationalIdMatch || (isPhoneMatch && isNameExact && isBirthMatch)) {
        exactMatchPatient = p;
        break;
      }

      // 2. تطابق الهاتف مع اختلاف الاسم (عائلة مشتركة)
      if (isPhoneMatch) {
        potentialMatches.push({
          patient: p,
          matchType: 'phone_only',
          reason: `رقم الهاتف مسجل باسم مريض آخر (${p.full_name})، قد يكون أحد أفراد الأسرة.`,
        });
      }
      // 3. تطابق الاسم وتاريخ الميلاد مع اختلاف الهاتف
      else if (isNameExact && isBirthMatch) {
        potentialMatches.push({
          patient: p,
          matchType: 'name_similar',
          reason: `تطابق تام في الاسم وتاريخ الميلاد مع هاتف مختلف (${p.phone}). يرجى التحقق من أنه ليس نفس الشخص.`,
        });
      }
    }

    return {
      hasExactMatch: !!exactMatchPatient,
      hasFamilyMatch: potentialMatches.length > 0,
      exactMatchPatient,
      potentialMatches,
    };
  }

  // توليد رقم المريض الذري (Atomic Sequence generator)
  private getNextPatientNumber(): string {
    const year = new Date().getFullYear();
    const currentSeq = loadLocal<number>(KEY_PATIENT_SEQ, 1005);
    const nextSeq = currentSeq + 1;
    saveLocal(KEY_PATIENT_SEQ, nextSeq);
    return `P-${year}-${String(nextSeq).padStart(5, '0')}`;
  }

  // توليد رقم إيصال تحصيل الرسوم المالي الذري (Atomic Receipt Number Generator)
  public getNextReceiptNumber(): string {
    const year = new Date().getFullYear();
    const currentSeq = loadLocal<number>(KEY_RECEIPT_SEQ, 105);
    const nextSeq = currentSeq + 1;
    saveLocal(KEY_RECEIPT_SEQ, nextSeq);
    return `REC-${year}-${String(nextSeq).padStart(5, '0')}`;
  }

  async createPatient(
    patientData: Omit<Patient, 'id' | 'patient_number' | 'created_at' | 'updated_at'>,
    staffProfile?: StaffProfile
  ): Promise<Patient> {
    if (!patientData.full_name.trim() || !patientData.phone.trim() || !patientData.birth_date) {
      throw new Error('يرجى ملء الحقول الإلزامية: الاسم الرباعي، رقم الهاتف، وتاريخ الميلاد.');
    }

    const client = getSupabaseClient();
    const now = new Date().toISOString();

    if (client && staffProfile) {
      const { data, error } = await client
        .from('patients')
        .insert({
          full_name: patientData.full_name.trim(),
          phone: patientData.phone.trim(),
          birth_date: patientData.birth_date,
          gender: patientData.gender,
          blood_type: patientData.blood_type || null,
          address: patientData.address || null,
          national_id: patientData.national_id?.trim() || null,
          emergency_contact: patientData.emergency_contact || null,
          notes: patientData.notes || null,
          created_by: staffProfile.id,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`خطأ قاعدة البيانات: ${error.message}`);
      }

      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'CREATE_PATIENT',
        entity_name: 'patients',
        entity_id: data.id,
        new_data: { patient_number: data.patient_number, name: data.full_name },
      });

      return data as Patient;
    }

    // Local DB execution
    const patients = loadLocal<Patient[]>(KEY_PATIENTS, INITIAL_PATIENTS);
    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      patient_number: this.getNextPatientNumber(),
      full_name: patientData.full_name.trim(),
      phone: patientData.phone.trim(),
      birth_date: patientData.birth_date,
      gender: patientData.gender,
      blood_type: patientData.blood_type || '',
      address: patientData.address || '',
      national_id: patientData.national_id?.trim() || '',
      emergency_contact: patientData.emergency_contact || '',
      notes: patientData.notes || '',
      created_by: staffProfile?.id,
      created_at: now,
      updated_at: now,
    };

    patients.unshift(newPatient);
    saveLocal(KEY_PATIENTS, patients);

    await this.logAudit({
      staff_id: staffProfile?.id,
      staff_name: staffProfile?.full_name || 'موظف الاستقبال',
      action: 'CREATE_PATIENT',
      entity_name: 'patients',
      entity_id: newPatient.id,
      new_data: { patient_number: newPatient.patient_number, name: newPatient.full_name },
    });

    // Central server multi-device broadcast
    try {
      fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient),
      }).catch(err => console.debug('Central patient sync note:', err));
    } catch {
      // ignore
    }

    return newPatient;
  }

  async updatePatient(
    patientId: string,
    updates: Partial<Omit<Patient, 'id' | 'patient_number' | 'created_at'>>,
    staffProfile?: StaffProfile
  ): Promise<Patient> {
    const now = new Date().toISOString();
    const client = getSupabaseClient();

    if (client && staffProfile) {
      const { data, error } = await client
        .from('patients')
        .update({
          ...updates,
          updated_at: now,
        })
        .eq('id', patientId)
        .select()
        .single();

      if (!error && data) {
        await this.logAudit({
          staff_id: staffProfile.id,
          staff_name: staffProfile.full_name,
          action: 'UPDATE_PATIENT',
          entity_name: 'patients',
          entity_id: patientId,
          new_data: { updates },
        });

        // Broadcast to central server API
        try {
          fetch('/api/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }).catch(err => console.debug('Central patient sync note:', err));
        } catch {
          // ignore
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hospital-patient-updated', { detail: { patient: data } }));
          window.dispatchEvent(new CustomEvent('hospital-visit-updated', { detail: { patientId } }));
        }

        return data as Patient;
      }
    }

    // Local DB execution
    const patients = loadLocal<Patient[]>(KEY_PATIENTS, INITIAL_PATIENTS);
    const index = patients.findIndex(p => p.id === patientId);
    if (index === -1) {
      throw new Error('ملف المريض غير موجود بالسجل.');
    }

    const existing = patients[index];
    const updatedPatient: Patient = {
      ...existing,
      ...updates,
      updated_at: now,
    };

    patients[index] = updatedPatient;
    saveLocal(KEY_PATIENTS, patients);

    // Keep patient's name and phone synchronized in local visits if modified
    if (updates.full_name || updates.phone) {
      const visits = loadLocal<PatientVisit[]>(KEY_VISITS, INITIAL_VISITS);
      let visitsChanged = false;
      visits.forEach(v => {
        if (v.patient_id === patientId) {
          if (updates.full_name) v.patient_name = updates.full_name.trim();
          if (updates.phone) v.patient_phone = updates.phone.trim();
          visitsChanged = true;
        }
      });
      if (visitsChanged) {
        saveLocal(KEY_VISITS, visits);
      }
    }

    await this.logAudit({
      staff_id: staffProfile?.id,
      staff_name: staffProfile?.full_name || 'موظف الاستقبال',
      action: 'UPDATE_PATIENT',
      entity_name: 'patients',
      entity_id: patientId,
      new_data: { patient_number: updatedPatient.patient_number, name: updatedPatient.full_name, updates },
    });

    // Central server multi-device broadcast
    try {
      fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient),
      }).catch(err => console.debug('Central patient sync note:', err));
    } catch {
      // ignore
    }

    // Live events dispatch for instant UI update across tabs and components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hospital-patient-updated', { detail: { patient: updatedPatient } }));
      window.dispatchEvent(new CustomEvent('hospital-visit-updated', { detail: { patientId } }));
    }

    return updatedPatient;
  }

  // =========================================================================
  // 7. سجل زيارات المرضى والتحقق الصارم من التخصص (Visits)
  // =========================================================================
  async getVisits(patientId?: string, visitDate?: string, doctorId?: string): Promise<PatientVisit[]> {
    const client = getSupabaseClient();
    if (client) {
      let query = client
        .from('patient_visits')
        .select(
          '*, patients(full_name, patient_number, phone), specialties(name), doctors(full_name)'
        )
        .order('created_at', { ascending: false });

      if (patientId) query = query.eq('patient_id', patientId);
      if (visitDate) query = query.eq('visit_date', visitDate);
      if (doctorId) query = query.eq('doctor_id', doctorId);

      const { data, error } = await query;
      if (!error && data) {
        return data.map((v: any) => ({
          ...v,
          patient_name: v.patients?.full_name,
          patient_number: v.patients?.patient_number,
          patient_phone: v.patients?.phone,
          specialty_name: v.specialties?.name,
          doctor_name: v.doctors?.full_name,
        })) as PatientVisit[];
      }
    }

    try {
      const resp = await fetch('/api/visits');
      if (resp.ok) {
        const serverVisits = await resp.json();
        if (Array.isArray(serverVisits)) {
          saveLocal(KEY_VISITS, serverVisits);
          return serverVisits.filter(
            (v: PatientVisit) =>
              (!patientId || v.patient_id === patientId) &&
              (!visitDate || v.visit_date === visitDate) &&
              (!doctorId || v.doctor_id === doctorId)
          );
        }
      }
    } catch {
      // offline fallback
    }

    const visits = loadLocal<PatientVisit[]>(KEY_VISITS, INITIAL_VISITS);
    return visits.filter(
      v => (!patientId || v.patient_id === patientId) &&
           (!visitDate || v.visit_date === visitDate) &&
           (!doctorId || v.doctor_id === doctorId)
    );
  }

  // تسجيل زيارة مع فرض تطابق التخصص وحساب الرسوم المالية (Relational & Financial Invariant)
  async createVisit(
    visitData: {
      patient_id: string;
      specialty_id: string;
      doctor_id: string;
      visit_date: string;
      visit_type: 'new' | 'follow_up';
      priority?: VisitPriority;
      reception_notes?: string;
      booking_source?: BookingSource;
      payment_status?: PaymentStatus;
      payment_method?: PaymentMethod;
      paid_amount?: number;
      payment_notes?: string;
    },
    staffProfile?: StaffProfile
  ): Promise<PatientVisit> {
    // تحقق إلزامي: هل الطبيب ينتمي فعلياً للتخصص المختار؟
    const doctors = await this.getDoctors();
    const doctor = doctors.find(d => d.id === visitData.doctor_id);

    if (!doctor) {
      throw new Error('الطبيب المختار غير مسجل في المستشفى.');
    }

    if (doctor.specialty_id !== visitData.specialty_id) {
      throw new Error(
        `تعارض أمني: التخصص المختار لا يتطابق مع تخصص الطبيب الفعلي (${doctor.specialty_name}).`
      );
    }

    const client = getSupabaseClient();
    const now = new Date().toISOString();

    const patients = await this.getPatients();
    const patient = patients.find(p => p.id === visitData.patient_id);
    let priority: VisitPriority = visitData.priority || 'normal';
    if (!visitData.priority && patient?.birth_date) {
      const birth = new Date(patient.birth_date);
      const age = new Date().getFullYear() - birth.getFullYear();
      if (age >= 60) {
        priority = 'elderly';
      }
    }

    // حساب الرسوم المقررة وحالة السداد
    const feeAmount =
      visitData.visit_type === 'follow_up'
        ? (doctor.followup_fee !== undefined ? doctor.followup_fee : Math.round(doctor.consultation_fee / 2))
        : doctor.consultation_fee;

    const bookingSource: BookingSource = visitData.booking_source || 'in_person';
    const paymentStatus: PaymentStatus = visitData.payment_status || (bookingSource === 'in_person' ? 'paid' : 'unpaid');
    const isPaid = paymentStatus === 'paid';
    const isWaived = paymentStatus === 'waived';
    const receiptNumber = (isPaid || isWaived) ? this.getNextReceiptNumber() : undefined;
    const paidAmount = isPaid ? (visitData.paid_amount !== undefined ? visitData.paid_amount : feeAmount) : 0;
    const paymentMethod = visitData.payment_method || (isPaid ? 'cash' : isWaived ? 'charity' : undefined);
    const paidAt = (isPaid || isWaived) ? now : undefined;
    const paidByName = (isPaid || isWaived) ? (staffProfile?.full_name || 'موظف الاستقبال') : undefined;
    const paidById = (isPaid || isWaived) ? staffProfile?.id : undefined;

    if (client && staffProfile) {
      const { data, error } = await client
        .from('patient_visits')
        .insert({
          patient_id: visitData.patient_id,
          specialty_id: visitData.specialty_id,
          doctor_id: visitData.doctor_id,
          visit_date: visitData.visit_date,
          visit_type: visitData.visit_type,
          status: 'registered',
          priority: priority,
          reception_notes: visitData.reception_notes || null,
          booking_source: bookingSource,
          fee_amount: feeAmount,
          paid_amount: paidAmount,
          payment_status: paymentStatus,
          payment_method: paymentMethod || null,
          payment_receipt_number: receiptNumber || null,
          paid_at: paidAt || null,
          paid_by_id: paidById || null,
          paid_by_name: paidByName || null,
          payment_notes: visitData.payment_notes || null,
          created_by: staffProfile.id,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`فشل تسجيل الزيارة: ${error.message}`);
      }

      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'REGISTER_VISIT',
        entity_name: 'patient_visits',
        entity_id: data.id,
        new_data: {
          patient_id: visitData.patient_id,
          doctor: doctor.full_name,
          fee: feeAmount,
          priority,
          payment_status: paymentStatus,
          receipt: receiptNumber,
        },
      });

      return data as PatientVisit;
    }

    // Local DB
    const specialties = await this.getSpecialties();
    const specialty = specialties.find(s => s.id === visitData.specialty_id);

    const visits = loadLocal<PatientVisit[]>(KEY_VISITS, INITIAL_VISITS);
    const newVisit: PatientVisit = {
      id: `vis-${Date.now()}`,
      patient_id: visitData.patient_id,
      patient_name: patient?.full_name || 'مريض',
      patient_number: patient?.patient_number || '',
      patient_phone: patient?.phone || '',
      specialty_id: visitData.specialty_id,
      specialty_name: specialty?.name || '',
      doctor_id: visitData.doctor_id,
      doctor_name: doctor.full_name,
      visit_date: visitData.visit_date,
      visit_type: visitData.visit_type,
      status: 'registered',
      priority: priority,
      reception_notes: visitData.reception_notes || '',
      booking_source: bookingSource,
      fee_amount: feeAmount,
      paid_amount: paidAmount,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      payment_receipt_number: receiptNumber,
      paid_at: paidAt,
      paid_by_id: paidById,
      paid_by_name: paidByName,
      payment_notes: visitData.payment_notes,
      created_by: staffProfile?.id,
      created_at: now,
      updated_at: now,
    };

    visits.unshift(newVisit);
    saveLocal(KEY_VISITS, visits);

    await this.logAudit({
      staff_id: staffProfile?.id,
      staff_name: staffProfile?.full_name || 'موظف الاستقبال',
      action: 'REGISTER_VISIT',
      entity_name: 'patient_visits',
      entity_id: newVisit.id,
      new_data: {
        patient: patient?.full_name,
        doctor: doctor.full_name,
        fee: feeAmount,
        payment_status: paymentStatus,
        receipt: receiptNumber,
      },
    });

    // Central server multi-device broadcast
    try {
      fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVisit),
      }).catch(err => console.debug('Central visit sync note:', err));
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hospital-visit-updated', {
          detail: {
            visitId: newVisit.id,
            status: 'registered',
            patientName: newVisit.patient_name,
            doctorName: newVisit.doctor_name,
            paymentStatus: newVisit.payment_status,
            receiptNumber: newVisit.payment_receipt_number,
          },
        })
      );
    }

    return newVisit;
  }

  // تأكيد دفع رسوم الكشف بالخزينة وإصدار إيصال تحصيل رسمي
  async confirmVisitPayment(
    visitId: string,
    paymentData: {
      paid_amount?: number;
      payment_method: PaymentMethod;
      payment_notes?: string;
      markAttended?: boolean;
    },
    staffProfile?: StaffProfile
  ): Promise<PatientVisit> {
    const visits = await this.getVisits();
    const targetVisit = visits.find(v => v.id === visitId);
    if (!targetVisit) {
      throw new Error('تذكرة الكشف غير موجودة.');
    }

    const now = new Date().toISOString();
    const receiptNumber = this.getNextReceiptNumber();
    const fee = targetVisit.fee_amount || 40;
    const paidAmount = paymentData.payment_method === 'charity'
      ? 0
      : (paymentData.paid_amount !== undefined ? paymentData.paid_amount : fee);
    const paymentStatus: PaymentStatus = paymentData.payment_method === 'charity' ? 'waived' : 'paid';
    const newStatus = paymentData.markAttended && targetVisit.status === 'registered' ? 'attended' : targetVisit.status;
    const cashierName = staffProfile?.full_name || 'موظف الخزينة / الاستقبال';

    const client = getSupabaseClient();
    if (client && staffProfile) {
      const { data, error } = await client
        .from('patient_visits')
        .update({
          payment_status: paymentStatus,
          payment_method: paymentData.payment_method,
          paid_amount: paidAmount,
          payment_receipt_number: receiptNumber,
          paid_at: now,
          paid_by_id: staffProfile.id,
          paid_by_name: cashierName,
          payment_notes: paymentData.payment_notes || null,
          status: newStatus,
          updated_at: now,
        })
        .eq('id', visitId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: cashierName,
        action: 'COLLECT_PAYMENT',
        entity_name: 'patient_visits',
        entity_id: visitId,
        new_data: {
          receiptNumber,
          paidAmount,
          method: paymentData.payment_method,
          patient: targetVisit.patient_name,
        },
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('hospital-visit-updated', {
            detail: {
              visitId,
              status: newStatus,
              paymentStatus,
              receiptNumber,
              patientName: targetVisit.patient_name,
              doctorName: targetVisit.doctor_name,
            },
          })
        );
      }

      return data as PatientVisit;
    }

    // Local DB
    const allVisits = loadLocal<PatientVisit[]>(KEY_VISITS, INITIAL_VISITS);
    const updated = allVisits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          payment_status: paymentStatus,
          payment_method: paymentData.payment_method,
          paid_amount: paidAmount,
          payment_receipt_number: receiptNumber,
          paid_at: now,
          paid_by_id: staffProfile?.id,
          paid_by_name: cashierName,
          payment_notes: paymentData.payment_notes || v.payment_notes,
          status: newStatus,
          updated_at: now,
        };
      }
      return v;
    });

    saveLocal(KEY_VISITS, updated);
    const updatedVisit = updated.find(v => v.id === visitId)!;

    await this.logAudit({
      staff_id: staffProfile?.id,
      staff_name: cashierName,
      action: 'COLLECT_PAYMENT',
      entity_name: 'patient_visits',
      entity_id: visitId,
      new_data: {
        receiptNumber,
        paidAmount,
        method: paymentData.payment_method,
        patient: targetVisit.patient_name,
      },
    });

    try {
      fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedVisit),
      }).catch(err => console.debug('Central payment sync note:', err));
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hospital-visit-updated', {
          detail: {
            visitId,
            status: newStatus,
            paymentStatus,
            receiptNumber,
            patientName: updatedVisit.patient_name,
            doctorName: updatedVisit.doctor_name,
          },
        })
      );
    }

    return updatedVisit;
  }

  // رد رسوم الكشف في حالة إلغاء الحجز (Refund Payment)
  async refundVisitPayment(
    visitId: string,
    refundReason: string,
    staffProfile?: StaffProfile
  ): Promise<PatientVisit> {
    const visits = await this.getVisits();
    const targetVisit = visits.find(v => v.id === visitId);
    if (!targetVisit) {
      throw new Error('تذكرة الكشف غير موجودة.');
    }

    const now = new Date().toISOString();
    const cashierName = staffProfile?.full_name || 'موظف الخزينة / الاستقبال';

    const client = getSupabaseClient();
    if (client && staffProfile) {
      const { data, error } = await client
        .from('patient_visits')
        .update({
          payment_status: 'refunded',
          refund_reason: refundReason,
          refunded_at: now,
          status: 'cancelled',
          cancellation_reason: refundReason,
          updated_at: now,
        })
        .eq('id', visitId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: cashierName,
        action: 'REFUND_PAYMENT',
        entity_name: 'patient_visits',
        entity_id: visitId,
        new_data: {
          refundAmount: targetVisit.paid_amount,
          receiptNumber: targetVisit.payment_receipt_number,
          reason: refundReason,
        },
      });

      return data as PatientVisit;
    }

    // Local DB
    const allVisits = loadLocal<PatientVisit[]>(KEY_VISITS, INITIAL_VISITS);
    const updated = allVisits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          payment_status: 'refunded' as PaymentStatus,
          refund_reason: refundReason,
          refunded_at: now,
          status: 'cancelled' as VisitStatus,
          cancellation_reason: refundReason,
          updated_at: now,
        };
      }
      return v;
    });

    saveLocal(KEY_VISITS, updated);
    const updatedVisit = updated.find(v => v.id === visitId)!;

    await this.logAudit({
      staff_id: staffProfile?.id,
      staff_name: cashierName,
      action: 'REFUND_PAYMENT',
      entity_name: 'patient_visits',
      entity_id: visitId,
      new_data: {
        refundAmount: targetVisit.paid_amount,
        receiptNumber: targetVisit.payment_receipt_number,
        reason: refundReason,
      },
    });

    try {
      fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedVisit),
      }).catch(err => console.debug('Central refund sync note:', err));
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hospital-visit-updated', {
          detail: {
            visitId,
            status: 'cancelled',
            paymentStatus: 'refunded',
            patientName: updatedVisit.patient_name,
            doctorName: updatedVisit.doctor_name,
          },
        })
      );
    }

    return updatedVisit;
  }

  // ملخص إيرادات اليوم وحسابات الوردية للمدير (Daily Revenue & Shift Summary)
  async getDailyFinancialSummary(date: string = getTodayDateString()): Promise<DailyRevenueSummary> {
    const allVisits = await this.getVisits(undefined, date);
    const specialties = await this.getSpecialties();
    const specMap = new Map(specialties.map(s => [s.id, s.name]));

    let totalRevenue = 0;
    let cashTotal = 0;
    let electronicTotal = 0;
    let waivedTotal = 0;
    let refundedTotal = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let waivedCount = 0;
    let refundedCount = 0;

    const bySpecialty: Record<string, { count: number; revenue: number; specialty_name: string }> = {};
    const byCashier: Record<string, { count: number; revenue: number; cashier_name: string }> = {};
    const byMethod: Record<PaymentMethod, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      vodafone_cash: { count: 0, total: 0 },
      instapay: { count: 0, total: 0 },
      visa: { count: 0, total: 0 },
      charity: { count: 0, total: 0 },
    };

    allVisits.forEach(v => {
      const fee = v.fee_amount || (v.visit_type === 'follow_up' ? 20 : 40);
      const paid = v.paid_amount || 0;
      const status = v.payment_status || (v.status === 'completed' || v.status === 'in_consultation' || v.status === 'attended' ? 'paid' : 'unpaid');
      const method = v.payment_method || (status === 'paid' ? 'cash' : 'charity');
      const specName = v.specialty_name || specMap.get(v.specialty_id) || 'العيادات الخارجية';
      const cashier = v.paid_by_name || 'موظف الاستقبال';

      // Specialty grouping
      if (!bySpecialty[v.specialty_id]) {
        bySpecialty[v.specialty_id] = { count: 0, revenue: 0, specialty_name: specName };
      }
      bySpecialty[v.specialty_id].count++;

      if (status === 'paid') {
        paidCount++;
        totalRevenue += paid;
        bySpecialty[v.specialty_id].revenue += paid;

        // Cashier grouping
        if (!byCashier[cashier]) {
          byCashier[cashier] = { count: 0, revenue: 0, cashier_name: cashier };
        }
        byCashier[cashier].count++;
        byCashier[cashier].revenue += paid;

        // Method grouping
        if (method === 'cash') {
          cashTotal += paid;
          byMethod.cash.count++;
          byMethod.cash.total += paid;
        } else {
          electronicTotal += paid;
          if (byMethod[method]) {
            byMethod[method].count++;
            byMethod[method].total += paid;
          }
        }
      } else if (status === 'waived') {
        waivedCount++;
        waivedTotal += fee;
        byMethod.charity.count++;
        byMethod.charity.total += fee;
      } else if (status === 'refunded') {
        refundedCount++;
        refundedTotal += paid;
      } else {
        unpaidCount++;
      }
    });

    const openingFloat = await this.getShiftOpeningFloat(date);
    const openingCash = openingFloat ? openingFloat.amount : 0;

    return {
      date,
      total_revenue: totalRevenue,
      cash_total: cashTotal,
      electronic_total: electronicTotal,
      waived_total: waivedTotal,
      refunded_total: refundedTotal,
      total_visits: allVisits.length,
      paid_visits_count: paidCount,
      unpaid_visits_count: unpaidCount,
      waived_visits_count: waivedCount,
      refunded_visits_count: refundedCount,
      by_specialty: bySpecialty,
      by_cashier: byCashier,
      by_method: byMethod,
      opening_cash_balance: openingCash,
      opening_cash_notes: openingFloat?.notes,
      opening_cash_updated_by: openingFloat?.updated_by_name,
      opening_cash_updated_at: openingFloat?.updated_at,
      expected_cash_in_drawer: openingCash + cashTotal,
    };
  }

  // رصيد بداية الوردية (عهدة الفكة الافتتاحية للمحصل/الاستقبال)
  async getShiftOpeningFloat(date: string = getTodayDateString()): Promise<ShiftOpeningFloat | null> {
    const floats = loadLocal<Record<string, ShiftOpeningFloat>>(KEY_SHIFT_FLOATS, {
      [getTodayDateString()]: {
        date: getTodayDateString(),
        amount: 250, // رصيد افتتاحي افتراضي لدرج الفكة
        notes: 'عهدة فكة افتتاحية معتمدة من خزينة المستشفى (فئات 5، 10، 20 ج)',
        updated_by_name: 'محمود الحنفي (استقبال)',
        updated_at: new Date().toISOString(),
      },
    });
    return floats[date] || null;
  }

  async saveShiftOpeningFloat(
    date: string,
    amount: number,
    notes?: string,
    staffProfile?: StaffProfile
  ): Promise<ShiftOpeningFloat> {
    const floats = loadLocal<Record<string, ShiftOpeningFloat>>(KEY_SHIFT_FLOATS, {});
    const updatedBy = staffProfile?.full_name || 'موظف الاستقبال';
    const now = new Date().toISOString();
    const record: ShiftOpeningFloat = {
      date,
      amount,
      notes: notes || undefined,
      updated_by_name: updatedBy,
      updated_at: now,
    };
    floats[date] = record;
    saveLocal(KEY_SHIFT_FLOATS, floats);

    await this.logAudit({
      staff_id: staffProfile?.id,
      staff_name: updatedBy,
      action: 'UPDATE_SHIFT_FLOAT',
      entity_name: 'shift_floats',
      entity_id: date,
      new_data: { date, amount, notes },
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hospital-shift-float-updated', { detail: record }));
      window.dispatchEvent(new CustomEvent('hospital-visit-updated', { detail: { action: 'shift-float' } }));
    }

    return record;
  }

  async updateVisitStatus(
    visitId: string,
    status: PatientVisit['status'],
    notes?: string,
    staffProfile?: StaffProfile,
    cancellationReason?: string
  ): Promise<PatientVisit> {
    // الرقابة الصارمة: منع إتمام الكشف إذا كان المريض لم يحضر بعد أو لم يسدد الرسوم
    if (status === 'completed') {
      const allVisits = await this.getVisits();
      const current = allVisits.find(v => v.id === visitId);
      if (current) {
        if (current.payment_status === 'unpaid') {
          throw new Error('عفواً، لا يمكن إتمام الكشف الطبي لمريض لم يسدد رسوم الكشف بالخزينة بعد. يرجى تحصيل الرسوم أو اعتماد إعفاء خيري أولاً.');
        }
        if (current.status === 'registered') {
          throw new Error('عفواً، لا يمكن إتمام الكشف الطبي لمريض لم يسجل حضوره بالعيادة بعد. يجب تسجيل حضور المريض بصالة الانتظار أولاً.');
        }
      }
    }

    const client = getSupabaseClient();
    const now = new Date().toISOString();

    if (client && staffProfile) {
      const updatePayload: any = { status, updated_at: now };
      if (notes !== undefined) updatePayload.reception_notes = notes;
      if (cancellationReason !== undefined) updatePayload.cancellation_reason = cancellationReason;

      const { data, error } = await client
        .from('patient_visits')
        .update(updatePayload)
        .eq('id', visitId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'UPDATE_VISIT_STATUS',
        entity_name: 'patient_visits',
        entity_id: visitId,
        new_data: { status, notes, cancellation_reason: cancellationReason },
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('hospital-visit-updated', {
            detail: {
              visitId,
              status,
              patientName: (data as any)?.patient_name,
              doctorName: (data as any)?.doctor_name,
              updater: staffProfile.full_name,
            },
          })
        );
      }

      return data as PatientVisit;
    }

    const visits = loadLocal<PatientVisit[]>(KEY_VISITS, INITIAL_VISITS);
    const idx = visits.findIndex(v => v.id === visitId);
    if (idx === -1) throw new Error('الزيارة غير موجودة.');

    const oldStatus = visits[idx].status;
    visits[idx] = {
      ...visits[idx],
      status,
      reception_notes: notes !== undefined ? notes : visits[idx].reception_notes,
      cancellation_reason: cancellationReason !== undefined ? cancellationReason : visits[idx].cancellation_reason,
      updated_at: now,
    };
    saveLocal(KEY_VISITS, visits);

    await this.logAudit({
      staff_id: staffProfile?.id,
      staff_name: staffProfile?.full_name || 'موظف الاستقبال',
      action: 'UPDATE_VISIT_STATUS',
      entity_name: 'patient_visits',
      entity_id: visitId,
      old_data: { status: oldStatus },
      new_data: { status, cancellation_reason: cancellationReason },
    });

    // Central server multi-device broadcast
    try {
      fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visits[idx]),
      }).catch(err => console.debug('Central visit update sync note:', err));
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hospital-visit-updated', {
          detail: {
            visitId,
            status,
            patientName: visits[idx].patient_name,
            doctorName: visits[idx].doctor_name,
            updater: staffProfile?.full_name || 'موظف الاستقبال',
          },
        })
      );
    }

    return visits[idx];
  }

  // حفظ الكشف والتشخيص الطبي وكتابة الروشتة بواسطة الطبيب
  async saveVisitDiagnosis(
    visitId: string,
    diagnosisData: {
      symptoms?: string;
      diagnosis: string;
      prescription?: string;
      tests_requested?: string;
      doctor_notes?: string;
      vital_signs?: any;
      revisit_recommended?: boolean;
      follow_up_date?: string;
      status?: 'in_consultation' | 'completed';
    },
    staffProfile?: StaffProfile
  ): Promise<PatientVisit> {
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    const finalStatus = diagnosisData.status || 'completed';

    // الرقابة الصارمة: منع الطبيب من إكمال الكشف والروشتة إذا لم يسدد المريض الرسوم بالخزينة
    if (finalStatus === 'completed') {
      const allVisits = await this.getVisits();
      const current = allVisits.find(v => v.id === visitId);
      if (current && current.payment_status === 'unpaid') {
        throw new Error('عفواً، لا يمكن إتمام الكشف الطبي وحفظ الروشتة لمريض لم يسدد رسوم الكشف بالخزينة بعد. يرجى تحصيل الرسوم أو اعتماد إعفاء خيري.');
      }
    }

    if (client && staffProfile) {
      const payload: any = {
        symptoms: diagnosisData.symptoms || null,
        diagnosis: diagnosisData.diagnosis,
        prescription: diagnosisData.prescription || null,
        tests_requested: diagnosisData.tests_requested || null,
        doctor_notes: diagnosisData.doctor_notes || null,
        vital_signs: diagnosisData.vital_signs || null,
        revisit_recommended: diagnosisData.revisit_recommended ?? false,
        follow_up_date: diagnosisData.follow_up_date || null,
        status: finalStatus,
        completed_at: finalStatus === 'completed' ? now : null,
        updated_at: now,
      };

      const { data, error } = await client
        .from('patient_visits')
        .update(payload)
        .eq('id', visitId)
        .select()
        .single();

      if (error) throw new Error(`فشل حفظ التشخيص الطبي: ${error.message}`);

      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'SAVE_DOCTOR_DIAGNOSIS',
        entity_name: 'patient_visits',
        entity_id: visitId,
        new_data: { diagnosis: diagnosisData.diagnosis, status: finalStatus },
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('hospital-visit-updated', {
            detail: {
              visitId,
              status: finalStatus,
              source: 'doctor',
            },
          })
        );
      }

      return data as PatientVisit;
    }

    // Local / Demo persistence
    const visits = loadLocal<PatientVisit[]>(KEY_VISITS, INITIAL_VISITS);
    const idx = visits.findIndex(v => v.id === visitId);
    if (idx === -1) throw new Error('الزيارة غير موجودة.');

    visits[idx] = {
      ...visits[idx],
      symptoms: diagnosisData.symptoms ?? visits[idx].symptoms,
      diagnosis: diagnosisData.diagnosis,
      prescription: diagnosisData.prescription ?? visits[idx].prescription,
      tests_requested: diagnosisData.tests_requested ?? visits[idx].tests_requested,
      doctor_notes: diagnosisData.doctor_notes ?? visits[idx].doctor_notes,
      vital_signs: diagnosisData.vital_signs ?? visits[idx].vital_signs,
      revisit_recommended: diagnosisData.revisit_recommended ?? visits[idx].revisit_recommended,
      follow_up_date: diagnosisData.follow_up_date ?? visits[idx].follow_up_date,
      status: finalStatus,
      completed_at: finalStatus === 'completed' ? now : visits[idx].completed_at,
      updated_at: now,
    };
    saveLocal(KEY_VISITS, visits);

    await this.logAudit({
      staff_id: staffProfile?.id,
      staff_name: staffProfile?.full_name || 'طبيب العيادة',
      action: 'SAVE_DOCTOR_DIAGNOSIS',
      entity_name: 'patient_visits',
      entity_id: visitId,
      new_data: { diagnosis: diagnosisData.diagnosis, status: finalStatus },
    });

    // Central server multi-device broadcast
    try {
      fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visits[idx]),
      }).catch(err => console.debug('Central visit diagnosis sync note:', err));
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hospital-visit-updated', {
          detail: {
            visitId,
            status: finalStatus,
            patientName: visits[idx].patient_name,
            doctorName: visits[idx].doctor_name,
            source: 'doctor',
          },
        })
      );
    }

    return visits[idx];
  }

  // جلب زيارات الطبيب اليوم بالترتيب لمتابعة طابور العيادة
  async getDoctorVisits(
    doctorId: string,
    visitDate: string = getTodayDateString()
  ): Promise<PatientVisit[]> {
    const visits = await this.getVisits(undefined, visitDate);
    return visits.filter(v => v.doctor_id === doctorId);
  }

  // =========================================================================
  // 8. خدمات المعمل والأشعة (Diagnostics)
  // =========================================================================
  async getDiagnosticServices(): Promise<DiagnosticService[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('diagnostic_services')
        .select('*')
        .eq('is_available', true);
      if (!error && data) return data as DiagnosticService[];
    }
    return loadLocal<DiagnosticService[]>(KEY_DIAGNOSTICS, INITIAL_DIAGNOSTICS).filter(
      d => d.is_available
    );
  }

  // جلب كافة التحاليل والأشعة بما فيها الموقوفة للمدير والفنيين
  async getAllDiagnosticServices(): Promise<DiagnosticService[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('diagnostic_services')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) return data as DiagnosticService[];
    }
    return loadLocal<DiagnosticService[]>(KEY_DIAGNOSTICS, INITIAL_DIAGNOSTICS);
  }

  // إضافة تحليل أو أشعة جديدة بواسطة المدير
  async createDiagnosticService(
    serviceData: {
      service_type: 'lab' | 'radiology';
      name: string;
      latin_name?: string;
      prescription_terms?: string[];
      preparation_instructions?: string;
      estimated_duration?: string;
      price: number;
    },
    staffProfile?: StaffProfile
  ): Promise<DiagnosticService> {
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    const newService: DiagnosticService = {
      id: `diag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      service_type: serviceData.service_type,
      name: serviceData.name.trim(),
      latin_name: serviceData.latin_name?.trim() || undefined,
      prescription_terms: serviceData.prescription_terms || [],
      preparation_instructions: serviceData.preparation_instructions?.trim() || undefined,
      estimated_duration: serviceData.estimated_duration?.trim() || 'خلال ساعات',
      price: Number(serviceData.price) || 0,
      is_available: true,
      created_at: now,
      updated_at: now,
    };

    if (client && staffProfile) {
      const { data, error } = await client
        .from('diagnostic_services')
        .insert(newService)
        .select()
        .single();
      if (!error && data) {
        // saved
      }
    }

    const services = loadLocal<DiagnosticService[]>(KEY_DIAGNOSTICS, INITIAL_DIAGNOSTICS);
    services.unshift(newService);
    saveLocal(KEY_DIAGNOSTICS, services);

    if (staffProfile) {
      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'CREATE_DIAGNOSTIC_SERVICE',
        entity_name: 'diagnostic_services',
        entity_id: newService.id,
        new_data: newService,
      });
    }

    return newService;
  }

  // تعديل بيانات فحص أو تحليل / تغيير السعر / التوفر
  async updateDiagnosticService(
    id: string,
    updates: Partial<DiagnosticService>,
    staffProfile?: StaffProfile
  ): Promise<DiagnosticService> {
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    const services = loadLocal<DiagnosticService[]>(KEY_DIAGNOSTICS, INITIAL_DIAGNOSTICS);
    const idx = services.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('الخدمة غير موجودة');

    const oldData = { ...services[idx] };
    const updated: DiagnosticService = {
      ...oldData,
      ...updates,
      updated_at: now,
    };

    if (client && staffProfile) {
      await client
        .from('diagnostic_services')
        .update({
          name: updated.name,
          latin_name: updated.latin_name,
          service_type: updated.service_type,
          price: updated.price,
          estimated_duration: updated.estimated_duration,
          preparation_instructions: updated.preparation_instructions,
          is_available: updated.is_available,
          prescription_terms: updated.prescription_terms,
          updated_at: now,
        })
        .eq('id', id);
    }

    services[idx] = updated;
    saveLocal(KEY_DIAGNOSTICS, services);

    if (staffProfile) {
      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'UPDATE_DIAGNOSTIC_SERVICE',
        entity_name: 'diagnostic_services',
        entity_id: id,
        old_data: oldData,
        new_data: updated,
      });
    }

    return updated;
  }

  // حذف فحص أو تحليل
  async deleteDiagnosticService(id: string, staffProfile?: StaffProfile): Promise<boolean> {
    const client = getSupabaseClient();
    if (client && staffProfile) {
      await client.from('diagnostic_services').delete().eq('id', id);
    }
    const services = loadLocal<DiagnosticService[]>(KEY_DIAGNOSTICS, INITIAL_DIAGNOSTICS);
    const target = services.find(s => s.id === id);
    if (!target) return false;

    const filtered = services.filter(s => s.id !== id);
    saveLocal(KEY_DIAGNOSTICS, filtered);

    if (staffProfile) {
      await this.logAudit({
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        action: 'DELETE_DIAGNOSTIC_SERVICE',
        entity_name: 'diagnostic_services',
        entity_id: id,
        old_data: { name: target.name, price: target.price },
      });
    }

    return true;
  }

  // =========================================================================
  // 9. طاقم العمل وإدارة الحسابات (Staff & Accounts)
  // =========================================================================
  async getStaffProfiles(): Promise<StaffProfile[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('staff_profiles').select('*').order('created_at', { ascending: false });
      if (!error && data) return data as StaffProfile[];
    }
    return loadLocal<StaffProfile[]>(KEY_STAFF, INITIAL_STAFF);
  }

  // إنشاء حساب موظف / طبيب جديد بواسطة المدير
  async createStaffProfile(
    staffData: {
      full_name: string;
      role: UserRole;
      email?: string;
      phone?: string;
      doctor_id?: string;
      password?: string;
    },
    actorProfile?: StaffProfile
  ): Promise<StaffProfile> {
    const client = getSupabaseClient();
    const now = new Date().toISOString();

    let doctorName: string | undefined;
    let specialtyName: string | undefined;

    if (staffData.doctor_id) {
      const doctors = await this.getDoctors();
      const doc = doctors.find(d => d.id === staffData.doctor_id);
      if (doc) {
        doctorName = doc.full_name;
        specialtyName = doc.specialty_name;
      }
    }

    const newStaff: StaffProfile = {
      id: `staff-${Date.now()}`,
      full_name: staffData.full_name.trim(),
      role: staffData.role,
      email: staffData.email?.trim() || `${staffData.role}_${Date.now()}@mitali-hosp.org`,
      phone: staffData.phone?.trim() || '',
      doctor_id: staffData.doctor_id || undefined,
      doctor_name: doctorName,
      specialty_name: specialtyName,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    if (client && actorProfile) {
      const { data, error } = await client
        .from('staff_profiles')
        .insert({
          full_name: newStaff.full_name,
          role: newStaff.role,
          phone: newStaff.phone,
          is_active: true,
          doctor_id: newStaff.doctor_id || null,
        })
        .select()
        .single();

      if (!error && data) {
        await this.logAudit({
          staff_id: actorProfile.id,
          staff_name: actorProfile.full_name,
          action: 'CREATE_STAFF_ACCOUNT',
          entity_name: 'staff_profiles',
          entity_id: data.id,
          new_data: { full_name: newStaff.full_name, role: newStaff.role, email: newStaff.email },
        });
        return { ...newStaff, id: data.id };
      }
    }

    // Local / Demo Store
    const staffList = loadLocal<StaffProfile[]>(KEY_STAFF, INITIAL_STAFF);
    staffList.unshift(newStaff);
    saveLocal(KEY_STAFF, staffList);

    // If linked to doctor, update doctor's account status
    if (staffData.doctor_id) {
      const doctors = loadLocal<Doctor[]>(KEY_DOCTORS, INITIAL_DOCTORS);
      const docIdx = doctors.findIndex(d => d.id === staffData.doctor_id);
      if (docIdx !== -1) {
        doctors[docIdx] = {
          ...doctors[docIdx],
          has_account: true,
          email: newStaff.email,
          account_id: newStaff.id,
        };
        saveLocal(KEY_DOCTORS, doctors);
      }
    }

    await this.logAudit({
      staff_id: actorProfile?.id,
      staff_name: actorProfile?.full_name || 'مدير المستشفى',
      action: 'CREATE_STAFF_ACCOUNT',
      entity_name: 'staff_profiles',
      entity_id: newStaff.id,
      new_data: { full_name: newStaff.full_name, role: newStaff.role, email: newStaff.email },
    });

    return newStaff;
  }

  // تعديل بيانات حساب موظف / تفعيل أو تعطيل
  async updateStaffProfile(
    staffId: string,
    updates: Partial<StaffProfile> & { password?: string },
    actorProfile?: StaffProfile
  ): Promise<StaffProfile> {
    const client = getSupabaseClient();
    const now = new Date().toISOString();

    const staffList = loadLocal<StaffProfile[]>(KEY_STAFF, INITIAL_STAFF);
    const idx = staffList.findIndex(s => s.id === staffId);
    if (idx === -1) throw new Error('الحساب غير موجود.');

    const oldData = { ...staffList[idx] };

    // Resolve doctor details if role is doctor or doctor_id changed
    let doctorName = updates.doctor_name ?? oldData.doctor_name;
    let specialtyName = updates.specialty_name ?? oldData.specialty_name;

    if (updates.role === 'doctor' && updates.doctor_id) {
      const doctors = await this.getDoctors();
      const doc = doctors.find(d => d.id === updates.doctor_id);
      if (doc) {
        doctorName = doc.full_name;
        specialtyName = doc.specialty_name;
      }
    } else if (updates.role && updates.role !== 'doctor') {
      doctorName = undefined;
      specialtyName = undefined;
      updates.doctor_id = undefined;
    }

    const payload = {
      ...updates,
      doctor_name: doctorName,
      specialty_name: specialtyName,
    };

    if (client && actorProfile) {
      const updateData: any = {
        full_name: payload.full_name ?? oldData.full_name,
        role: payload.role ?? oldData.role,
        email: payload.email ?? oldData.email,
        phone: payload.phone ?? oldData.phone,
        is_active: payload.is_active ?? oldData.is_active,
        doctor_id: payload.doctor_id ?? null,
        updated_at: now,
      };

      const { data, error } = await client
        .from('staff_profiles')
        .update(updateData)
        .eq('id', staffId)
        .select()
        .single();

      if (!error && data) {
        await this.logAudit({
          staff_id: actorProfile.id,
          staff_name: actorProfile.full_name,
          action: 'UPDATE_STAFF_ACCOUNT',
          entity_name: 'staff_profiles',
          entity_id: staffId,
          old_data: oldData,
          new_data: payload,
        });
      }
    }

    // Sync doctor linkages in local storage
    if (oldData.doctor_id && oldData.doctor_id !== payload.doctor_id) {
      const doctors = loadLocal<Doctor[]>(KEY_DOCTORS, INITIAL_DOCTORS);
      const prevDocIdx = doctors.findIndex(d => d.id === oldData.doctor_id);
      if (prevDocIdx !== -1) {
        doctors[prevDocIdx] = { ...doctors[prevDocIdx], has_account: false, account_id: undefined };
        saveLocal(KEY_DOCTORS, doctors);
      }
    }

    if (payload.doctor_id) {
      const doctors = loadLocal<Doctor[]>(KEY_DOCTORS, INITIAL_DOCTORS);
      const newDocIdx = doctors.findIndex(d => d.id === payload.doctor_id);
      if (newDocIdx !== -1) {
        doctors[newDocIdx] = {
          ...doctors[newDocIdx],
          has_account: true,
          email: payload.email || doctors[newDocIdx].email,
          account_id: staffId,
        };
        saveLocal(KEY_DOCTORS, doctors);
      }
    }

    staffList[idx] = {
      ...staffList[idx],
      ...payload,
      updated_at: now,
    };
    saveLocal(KEY_STAFF, staffList);

    await this.logAudit({
      staff_id: actorProfile?.id,
      staff_name: actorProfile?.full_name || 'مدير المستشفى',
      action: 'UPDATE_STAFF_ACCOUNT',
      entity_name: 'staff_profiles',
      entity_id: staffId,
      old_data: oldData,
      new_data: payload,
    });

    return staffList[idx];
  }

  // حذف أو إلغاء حساب موظف
  async deleteStaffProfile(staffId: string, actorProfile?: StaffProfile): Promise<boolean> {
    const client = getSupabaseClient();
    if (client && actorProfile) {
      await client.from('staff_profiles').delete().eq('id', staffId);
    }

    const staffList = loadLocal<StaffProfile[]>(KEY_STAFF, INITIAL_STAFF);
    const target = staffList.find(s => s.id === staffId);
    if (!target) return false;

    // Prevent deleting the main admin
    if (target.id === 'staff-admin-01') {
      throw new Error('لا يمكن حذف حساب المدير العام الرئيسي للنظام.');
    }

    const filtered = staffList.filter(s => s.id !== staffId);
    saveLocal(KEY_STAFF, filtered);

    // If it was linked to a doctor, reset that doctor's account flag
    if (target.doctor_id) {
      const doctors = loadLocal<Doctor[]>(KEY_DOCTORS, INITIAL_DOCTORS);
      const docIdx = doctors.findIndex(d => d.id === target.doctor_id);
      if (docIdx !== -1) {
        doctors[docIdx] = {
          ...doctors[docIdx],
          has_account: false,
          account_id: undefined,
        };
        saveLocal(KEY_DOCTORS, doctors);
      }
    }

    await this.logAudit({
      staff_id: actorProfile?.id,
      staff_name: actorProfile?.full_name || 'مدير المستشفى',
      action: 'DELETE_STAFF_ACCOUNT',
      entity_name: 'staff_profiles',
      entity_id: staffId,
      old_data: { full_name: target.full_name, role: target.role },
    });

    return true;
  }

  // =========================================================================
  // 10. سجل التدقيق غير القابل للتعديل (Immutable Audit Log)
  // =========================================================================
  async getAuditLogs(): Promise<AuditLog[]> {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client
        .from('audit_logs')
        .select('*, staff_profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        return data.map((a: any) => ({
          ...a,
          staff_name: a.staff_profiles?.full_name || 'مستخدم النظام',
        })) as AuditLog[];
      }
    }
    return loadLocal<AuditLog[]>(KEY_AUDIT, INITIAL_AUDIT_LOGS);
  }

  async logAudit(logData: {
    staff_id?: string;
    staff_name?: string;
    action: string;
    entity_name: string;
    entity_id: string;
    old_data?: Record<string, any>;
    new_data?: Record<string, any>;
  }): Promise<void> {
    const client = getSupabaseClient();
    const now = new Date().toISOString();

    if (client && logData.staff_id) {
      await client.from('audit_logs').insert({
        staff_id: logData.staff_id,
        action: logData.action,
        entity_name: logData.entity_name,
        entity_id: logData.entity_id,
        old_data: logData.old_data || null,
        new_data: logData.new_data || null,
      });
      return;
    }

    const logs = loadLocal<AuditLog[]>(KEY_AUDIT, INITIAL_AUDIT_LOGS);
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      staff_id: logData.staff_id,
      staff_name: logData.staff_name || 'موظف النظام',
      action: logData.action,
      entity_name: logData.entity_name,
      entity_id: logData.entity_id,
      old_data: logData.old_data || null,
      new_data: logData.new_data || null,
      ip_address: '192.168.1.10',
      created_at: now,
    };
    logs.unshift(newLog);
    saveLocal(KEY_AUDIT, logs.slice(0, 150)); // Keep last 150 entries
  }

  // =========================================================================
  // 10. بروتوكولات وتشخيصات وقوائم الأقسام والعيادات (Clinical Department & Doctor Presets)
  // =========================================================================

  /**
   * جلب القوالب والبروتوكولات الخاصة بقسم/تخصص معين مدمجة مع مفضلات الطبيب
   */
  async getSpecialtyClinicalPresets(
    specialtyId?: string,
    doctorId?: string
  ): Promise<{
    diagnoses: string[];
    protocols: ClinicalProtocol[];
    quickDrugs: QuickCommonDrug[];
  }> {
    const allPresets = loadLocal<Record<string, SpecialtyClinicalPreset>>(
      KEY_CLINICAL_PRESETS,
      DEFAULT_SPECIALTY_PRESETS
    );

    // Get specialty presets or fallback to general
    const currentPreset = specialtyId && allPresets[specialtyId]
      ? allPresets[specialtyId]
      : (allPresets['general'] || GENERAL_CLINICAL_PRESET);

    const diagnoses = [...(currentPreset.diagnoses || [])];
    let protocols = [...(currentPreset.protocols || [])];
    const quickDrugs = [...(currentPreset.quick_drugs || [])];

    // If doctorId is provided, merge doctor personal favorite protocols & drugs
    if (doctorId) {
      const allDoctorFavorites = loadLocal<ClinicalProtocol[]>(KEY_DOCTOR_FAVORITES, []);
      const docProtocols = allDoctorFavorites.filter(
        p => p.doctor_id === doctorId && (!p.specialty_id || p.specialty_id === specialtyId)
      );
      // Doctor's personal favorite protocols come first!
      protocols = [...docProtocols, ...protocols];
    }

    return {
      diagnoses,
      protocols,
      quickDrugs,
    };
  }

  /**
   * جلب جميع بروتوكولات الأقسام لإدارتها من قِبل إدارة المستشفى / رؤساء الأقسام
   */
  async getAllSpecialtiesClinicalPresets(): Promise<Record<string, SpecialtyClinicalPreset>> {
    return loadLocal<Record<string, SpecialtyClinicalPreset>>(
      KEY_CLINICAL_PRESETS,
      DEFAULT_SPECIALTY_PRESETS
    );
  }

  /**
   * حفظ أو تحديث بيانات قسم معين (تشخيصات، بروتوكولات، أدوية شائعة)
   */
  async saveSpecialtyClinicalPresets(
    specialtyId: string,
    data: Partial<SpecialtyClinicalPreset>,
    currentUser?: string
  ): Promise<void> {
    const allPresets = loadLocal<Record<string, SpecialtyClinicalPreset>>(
      KEY_CLINICAL_PRESETS,
      DEFAULT_SPECIALTY_PRESETS
    );

    const existing = allPresets[specialtyId] || {
      specialty_id: specialtyId,
      diagnoses: [],
      protocols: [],
      quick_drugs: [],
    };

    allPresets[specialtyId] = {
      ...existing,
      ...data,
      specialty_id: specialtyId,
    };

    saveLocal(KEY_CLINICAL_PRESETS, allPresets);

    await this.logAudit({
      staff_name: currentUser || 'مدير النظام',
      action: 'UPDATE_SPECIALTY_PRESETS',
      entity_name: 'specialty_clinical_presets',
      entity_id: specialtyId,
      new_data: data as Record<string, any>,
    });
  }

  /**
   * حفظ بروتوكول علاجي مفضل لطبيب محدد
   */
  async saveDoctorPersonalProtocol(
    protocol: Omit<ClinicalProtocol, 'id'>,
    currentUser?: string
  ): Promise<ClinicalProtocol> {
    const allDoctorFavorites = loadLocal<ClinicalProtocol[]>(KEY_DOCTOR_FAVORITES, []);
    const newProtocol: ClinicalProtocol = {
      ...protocol,
      id: `doc-proto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      is_favorite: true,
      created_at: new Date().toISOString(),
    };

    allDoctorFavorites.unshift(newProtocol);
    saveLocal(KEY_DOCTOR_FAVORITES, allDoctorFavorites);

    await this.logAudit({
      staff_name: currentUser || 'الطبيب المعالج',
      action: 'CREATE_DOCTOR_PERSONAL_PROTOCOL',
      entity_name: 'clinical_protocol',
      entity_id: newProtocol.id,
      new_data: { name: newProtocol.name, doctor_id: newProtocol.doctor_id },
    });

    return newProtocol;
  }

  /**
   * حذف بروتوكول علاجي مفضل لطبيب
   */
  async deleteDoctorPersonalProtocol(protocolId: string): Promise<void> {
    const allDoctorFavorites = loadLocal<ClinicalProtocol[]>(KEY_DOCTOR_FAVORITES, []);
    const filtered = allDoctorFavorites.filter(p => p.id !== protocolId);
    saveLocal(KEY_DOCTOR_FAVORITES, filtered);
  }
}

export const dbService = new DatabaseService();

// =========================================================================
// دوال تصدير مباشرة لخدمات المعمل والأشعة والزيارات (Direct Diagnostic Helpers)
// =========================================================================

export function getAllDiagnosticServices(): DiagnosticService[] {
  const list = loadLocal<DiagnosticService[]>(KEY_DIAGNOSTICS, INITIAL_DIAGNOSTICS);
  return list.map(item => ({
    ...item,
    type: item.type || item.service_type || 'lab',
    preparation: item.preparation || item.preparation_instructions || '',
    is_active: item.is_active !== undefined ? item.is_active : item.is_available,
  }));
}

export function createDiagnosticService(serviceData: {
  service_type?: 'lab' | 'radiology';
  type?: 'lab' | 'radiology';
  name: string;
  latin_name?: string;
  category?: string;
  prescription_terms?: string[];
  preparation?: string;
  preparation_instructions?: string;
  estimated_duration?: string;
  description?: string;
  price: number;
  is_active?: boolean;
}): DiagnosticService {
  const sType = serviceData.service_type || serviceData.type || 'lab';
  const prep = (serviceData.preparation || serviceData.preparation_instructions || '').trim();
  const active = serviceData.is_active !== undefined ? serviceData.is_active : true;
  const now = new Date().toISOString();
  const newService: DiagnosticService = {
    id: `diag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    service_type: sType,
    type: sType,
    name: serviceData.name.trim(),
    latin_name: serviceData.latin_name?.trim() || undefined,
    category: serviceData.category || undefined,
    prescription_terms: serviceData.prescription_terms || [],
    preparation_instructions: prep || undefined,
    preparation: prep || undefined,
    estimated_duration: serviceData.estimated_duration?.trim() || 'نفس اليوم',
    price: Number(serviceData.price) || 0,
    is_available: active,
    is_active: active,
    description: serviceData.description || undefined,
    created_at: now,
    updated_at: now,
  };
  const services = loadLocal<DiagnosticService[]>(KEY_DIAGNOSTICS, INITIAL_DIAGNOSTICS);
  services.unshift(newService);
  saveLocal(KEY_DIAGNOSTICS, services);
  return newService;
}

export function updateDiagnosticService(id: string, updates: Partial<DiagnosticService>): DiagnosticService {
  const services = loadLocal<DiagnosticService[]>(KEY_DIAGNOSTICS, INITIAL_DIAGNOSTICS);
  const idx = services.findIndex(s => s.id === id);
  if (idx === -1) throw new Error('الخدمة غير موجودة');
  const oldData = { ...services[idx] };
  const sType = updates.service_type || updates.type || oldData.service_type || oldData.type || 'lab';
  const prep = (updates.preparation || updates.preparation_instructions || oldData.preparation || oldData.preparation_instructions || '').trim();
  const active = updates.is_active !== undefined ? updates.is_active : (updates.is_available !== undefined ? updates.is_available : oldData.is_available);
  const updated: DiagnosticService = {
    ...oldData,
    ...updates,
    service_type: sType,
    type: sType,
    preparation_instructions: prep || undefined,
    preparation: prep || undefined,
    is_available: active,
    is_active: active,
    updated_at: new Date().toISOString(),
  };
  services[idx] = updated;
  saveLocal(KEY_DIAGNOSTICS, services);
  return updated;
}

export function deleteDiagnosticService(id: string): boolean {
  const services = loadLocal<DiagnosticService[]>(KEY_DIAGNOSTICS, INITIAL_DIAGNOSTICS);
  const filtered = services.filter(s => s.id !== id);
  saveLocal(KEY_DIAGNOSTICS, filtered);
  return true;
}

export function getAllVisits(): PatientVisit[] {
  return loadLocal<PatientVisit[]>(KEY_VISITS, INITIAL_VISITS);
}

// =========================================================================
// إدارة طوابير واستدعاءات التحاليل والأشعة (Diagnostic Orders & Queue Calling)
// =========================================================================

export function getDiagnosticOrders(department?: 'lab' | 'radiology'): DiagnosticOrder[] {
  let orders = loadLocal<DiagnosticOrder[]>(KEY_DIAGNOSTIC_ORDERS, INITIAL_DIAGNOSTIC_ORDERS);
  const visits = loadLocal<PatientVisit[]>(KEY_VISITS, INITIAL_VISITS);
  const existingVisitIds = new Set(orders.map(o => o.id));

  let added = false;
  visits.forEach(v => {
    if (!v.tests_requested || !v.tests_requested.trim()) return;
    const vLabId = `vis-order-lab-${v.id}`;
    const vRadId = `vis-order-rad-${v.id}`;
    const lower = v.tests_requested.toLowerCase();
    const hasRad = lower.includes('أشعة') || lower.includes('سونار') || lower.includes('x-ray') || lower.includes('إيكو') || lower.includes('موجات');
    const hasLab = lower.includes('تحليل') || lower.includes('دم') || lower.includes('بول') || lower.includes('براز') || lower.includes('cbc') || lower.includes('سكر') || lower.includes('وظائف') || lower.includes('معمل') || !hasRad;

    if (hasLab && !existingVisitIds.has(vLabId)) {
      orders.push({
        id: vLabId,
        order_number: `LAB-${String(orders.filter(o => o.department === 'lab').length + 1).padStart(2, '0')}`,
        department: 'lab',
        patient_id: v.patient_id,
        patient_name: v.patient_name || 'مريض محول من العيادة',
        patient_number: v.patient_number,
        patient_phone: v.patient_phone,
        doctor_name: v.doctor_name,
        specialty_name: v.specialty_name,
        test_names: v.tests_requested,
        priority: v.priority || 'normal',
        status: v.status === 'completed' ? 'result_ready' : 'waiting',
        fee_amount: 50,
        payment_status: 'paid',
        created_at: v.created_at || new Date().toISOString(),
      });
      existingVisitIds.add(vLabId);
      added = true;
    }

    if (hasRad && !existingVisitIds.has(vRadId)) {
      orders.push({
        id: vRadId,
        order_number: `RAD-${String(orders.filter(o => o.department === 'radiology').length + 1).padStart(2, '0')}`,
        department: 'radiology',
        patient_id: v.patient_id,
        patient_name: v.patient_name || 'مريض محول من العيادة',
        patient_number: v.patient_number,
        patient_phone: v.patient_phone,
        doctor_name: v.doctor_name,
        specialty_name: v.specialty_name,
        test_names: v.tests_requested,
        priority: v.priority || 'normal',
        status: v.status === 'completed' ? 'result_ready' : 'waiting',
        fee_amount: 60,
        payment_status: 'paid',
        created_at: v.created_at || new Date().toISOString(),
      });
      existingVisitIds.add(vRadId);
      added = true;
    }
  });

  if (added) {
    saveLocal(KEY_DIAGNOSTIC_ORDERS, orders);
  }

  if (department) {
    orders = orders.filter(o => o.department === department);
  }
  return orders;
}

export function createDiagnosticOrder(orderData: Partial<DiagnosticOrder>): DiagnosticOrder {
  const orders = loadLocal<DiagnosticOrder[]>(KEY_DIAGNOSTIC_ORDERS, INITIAL_DIAGNOSTIC_ORDERS);
  const dept = orderData.department || 'lab';
  const count = orders.filter(o => o.department === dept).length + 1;
  const prefix = dept === 'lab' ? 'LAB' : 'RAD';
  const newOrder: DiagnosticOrder = {
    id: `ord-${dept}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    order_number: `${prefix}-${String(count).padStart(2, '0')}`,
    department: dept,
    patient_id: orderData.patient_id,
    patient_name: orderData.patient_name?.trim() || 'مريض مباشر',
    patient_number: orderData.patient_number || `P-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    patient_phone: orderData.patient_phone || '',
    doctor_name: orderData.doctor_name || 'حجز مباشر بالاستقبال',
    specialty_name: orderData.specialty_name || (dept === 'lab' ? 'معمل التحاليل' : 'قسم الأشعة'),
    test_names: orderData.test_names?.trim() || (dept === 'lab' ? 'تحاليل طبية عامة' : 'فحص أشعة عادية'),
    priority: orderData.priority || 'normal',
    status: orderData.status || 'waiting',
    sample_type: orderData.sample_type,
    fee_amount: Number(orderData.fee_amount) || (dept === 'lab' ? 50 : 70),
    payment_status: orderData.payment_status || 'paid',
    created_at: new Date().toISOString(),
  };

  orders.unshift(newOrder);
  saveLocal(KEY_DIAGNOSTIC_ORDERS, orders);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hospital-diagnostic-order-updated', { detail: newOrder }));
  }

  return newOrder;
}

export function updateDiagnosticOrderStatus(
  orderId: string,
  status: DiagnosticTestStatus,
  updates?: Partial<DiagnosticOrder>
): DiagnosticOrder {
  const orders = loadLocal<DiagnosticOrder[]>(KEY_DIAGNOSTIC_ORDERS, INITIAL_DIAGNOSTIC_ORDERS);
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) throw new Error('الطلب غير موجود');

  const now = new Date().toISOString();
  const updated: DiagnosticOrder = {
    ...orders[idx],
    ...updates,
    status,
    called_at: status === 'called' ? now : (orders[idx].called_at || updates?.called_at),
    started_at: status === 'in_progress' ? now : (orders[idx].started_at || updates?.started_at),
    completed_at: (status === 'result_ready' || status === 'delivered') ? now : (orders[idx].completed_at || updates?.completed_at),
    updated_at: now,
  };

  orders[idx] = updated;
  saveLocal(KEY_DIAGNOSTIC_ORDERS, orders);

  // Trigger live event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hospital-diagnostic-order-updated', { detail: updated }));
  }

  return updated;
}
