import React, { useState, useEffect } from 'react';
import { Patient, PatientVisit, DuplicateCheckResult, StaffProfile } from '../../types';
import { dbService } from '../../lib/databaseService';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus,
  Search,
  User,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  ChevronLeft,
  X,
  PlusCircle,
  ShieldAlert,
  Pencil,
  Lock,
  Droplet,
  Sparkles,
  Edit3,
} from 'lucide-react';

interface PatientManagerProps {
  onRegisterVisitForPatient: (patient: Patient) => void;
}

export const PatientManager: React.FC<PatientManagerProps> = ({ onRegisterVisitForPatient }) => {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // New Patient Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [bloodType, setBloodType] = useState<string>('');
  const [address, setAddress] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');

  // Duplicate Check State
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDup, setIsCheckingDup] = useState(false);
  const [allowFamilyDuplicate, setAllowFamilyDuplicate] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit Patient Modal State
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female'>('male');
  const [editBloodType, setEditBloodType] = useState<string>('');
  const [editAddress, setEditAddress] = useState('');
  const [editNationalId, setEditNationalId] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Patient Profile Drawer
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientVisits, setPatientVisits] = useState<PatientVisit[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);

  const fetchPatients = async (query: string = '') => {
    setIsLoading(true);
    try {
      const data = await dbService.getPatients(query);
      setPatients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(searchTerm);
  }, [searchTerm]);

  // Pre-check duplicate in real time when phone, name, or birthDate changes
  useEffect(() => {
    if (phone.length >= 10 && fullName.trim().length >= 5 && birthDate) {
      setIsCheckingDup(true);
      dbService
        .checkPatientDuplicate(phone, fullName, birthDate, nationalId)
        .then(res => {
          setDupResult(res);
          setIsCheckingDup(false);
        })
        .catch(() => setIsCheckingDup(false));
    } else {
      setDupResult(null);
    }
  }, [phone, fullName, birthDate, nationalId]);

  const handleOpenPatientProfile = async (patient: Patient) => {
    setSelectedPatient(patient);
    setIsLoadingVisits(true);
    try {
      const visits = await dbService.getVisits(patient.id);
      setPatientVisits(visits);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingVisits(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!fullName.trim() || !phone.trim() || !birthDate) {
      setSubmitError('يرجى إكمال الحقول الإلزامية: الاسم الرباعي، رقم الهاتف، وتاريخ الميلاد.');
      return;
    }

    if (dupResult?.hasExactMatch) {
      setSubmitError('لا يمكن إنشاء ملف مكرر، المريض مسجل مسبقاً بنفس البيانات.');
      return;
    }

    if (dupResult?.hasFamilyMatch && !allowFamilyDuplicate) {
      setSubmitError('رقم الهاتف مستخدم لعضو أسرة آخر، يرجى تأكيد أنه مريض جديد من نفس العائلة.');
      return;
    }

    setIsSaving(true);
    try {
      const newPat = await dbService.createPatient(
        {
          full_name: fullName,
          phone,
          birth_date: birthDate,
          gender,
          blood_type: bloodType || undefined,
          address,
          national_id: nationalId,
          emergency_contact: emergencyContact,
          notes,
        },
        currentUser || undefined
      );

      setIsModalOpen(false);
      resetForm();
      await fetchPatients();
      handleOpenPatientProfile(newPat);
    } catch (err: any) {
      setSubmitError(err?.message || 'فشل إنشاء ملف المريض');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setBirthDate('');
    setGender('male');
    setBloodType('');
    setAddress('');
    setNationalId('');
    setEmergencyContact('');
    setNotes('');
    setDupResult(null);
    setAllowFamilyDuplicate(false);
    setSubmitError('');
  };

  const handleOpenEditModal = (patient: Patient) => {
    setEditingPatient(patient);
    setEditFullName(patient.full_name || '');
    setEditPhone(patient.phone || '');
    setEditBirthDate(patient.birth_date || '');
    setEditGender(patient.gender || 'male');
    setEditBloodType(patient.blood_type || '');
    setEditAddress(patient.address || '');
    setEditNationalId(patient.national_id || '');
    setEditEmergencyContact(patient.emergency_contact || '');
    setEditNotes(patient.notes || '');
    setEditError('');
  };

  const handleSavePatientEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setEditError('');

    if (!editFullName.trim() || !editPhone.trim() || !editBirthDate) {
      setEditError('يرجى إكمال الحقول الإلزامية: الاسم الرباعي، رقم الهاتف، وتاريخ الميلاد.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const updated = await dbService.updatePatient(
        editingPatient.id,
        {
          full_name: editFullName.trim(),
          phone: editPhone.trim(),
          birth_date: editBirthDate,
          gender: editGender,
          blood_type: editBloodType || '',
          address: editAddress.trim(),
          national_id: editNationalId.trim(),
          emergency_contact: editEmergencyContact.trim(),
          notes: editNotes.trim(),
        },
        currentUser || undefined
      );

      // If drawer is currently open for this patient, update it in place
      if (selectedPatient?.id === updated.id) {
        setSelectedPatient(updated);
      }

      setEditingPatient(null);
      setToastMessage(`تم تحديث واستكمال بيانات ملف المريض (${updated.full_name}) بنجاح.`);
      setTimeout(() => setToastMessage(null), 4500);
      await fetchPatients(searchTerm);
    } catch (err: any) {
      setEditError(err?.message || 'حدث خطأ أثناء حفظ تعديلات ملف المريض.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    const handlePatientUpdate = () => {
      fetchPatients(searchTerm);
    };
    window.addEventListener('hospital-patient-updated', handlePatientUpdate);
    return () => {
      window.removeEventListener('hospital-patient-updated', handlePatientUpdate);
    };
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-emerald-900 text-white p-3.5 rounded-2xl border border-emerald-700 shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-200 shrink-0 border border-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">{toastMessage}</p>
              <p className="text-[11px] text-emerald-200">تم تحديث البيانات المركزية وتزامنها مع كافة العيادات والاستقبال فورياً.</p>
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-300 hover:text-white text-xs px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search and Action Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">سجل ملفات المرضى الموحد</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ملف رقمي موحد لكل مريض يربط كافة زيارات العيادات، مع فحص ذكي مسبق لمنع التكرار.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث بالهاتف أو الاسم أو رقم الملف..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-9 py-2.5 text-xs sm:text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-600 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="min-h-[44px] px-4 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 rounded-xl transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>فتح ملف مريض جديد</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          UNIFIED RESPONSIVE PATIENT CARDS GRID (Mobile, Tablet, Desktop)
          Replaces bulky table with modern, high-density patient cards
         ========================================================================= */}
      {patients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-400 space-y-3">
          <p className="text-sm text-slate-600 font-medium">
            {isLoading ? 'جاري البحث في سجلات المرضى...' : 'لا توجد ملفات مرضى مطابقة لبيانات البحث'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold rounded-xl border border-teal-200 cursor-pointer text-xs transition-colors"
            >
              إلغاء البحث وإظهار كافة المرضى
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
          {patients.map(p => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-teal-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              {/* Card Body */}
              <div className="p-4 sm:p-4.5 space-y-3.5">
                {/* Header: File Number & Quick Phone Link */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="font-mono font-bold text-xs text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg tabular-nums border border-teal-200/70 flex items-center gap-1">
                    <span>ملف:</span>
                    <span>{p.patient_number}</span>
                  </span>

                  <a
                    href={`tel:${p.phone}`}
                    className="flex items-center gap-1.5 text-xs font-bold font-mono text-teal-700 bg-teal-50/70 hover:bg-teal-100 active:bg-teal-200 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors"
                    title="اتصال مباشر بهاتف المريض"
                  >
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    <span className="tabular-nums">{p.phone}</span>
                  </a>
                </div>

                {/* Patient Name & Badges */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0 mt-0.5 border border-slate-200">
                    <User className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug truncate" title={p.full_name}>
                        {p.full_name}
                      </h3>
                      {p.blood_type && (
                        <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          فصيلة {p.blood_type}
                        </span>
                      )}
                    </div>
                    {p.national_id && (
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                        الرقم القومي: {p.national_id}
                      </p>
                    )}
                  </div>
                </div>

                {/* Demographics Information Grid */}
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">تاريخ الميلاد:</span>
                      <span className="font-bold text-slate-800 font-mono tabular-nums">{p.birth_date}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">النوع:</span>
                      <span className="font-bold text-slate-800">
                        {p.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </span>
                    </div>
                  </div>

                  {p.address && (
                    <div className="pt-1 border-t border-slate-200/50">
                      <span className="text-[10px] text-slate-400 block font-medium">العنوان / الإقامة:</span>
                      <span className="text-slate-700 text-[11px] block truncate">{p.address}</span>
                    </div>
                  )}

                  {p.emergency_contact && (
                    <div className="pt-1 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">طوارئ / قريب:</span>
                      <span className="font-mono font-semibold text-slate-700 tabular-nums">{p.emergency_contact}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-100 grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenPatientProfile(p)}
                  className="min-h-[40px] py-2 px-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 active:bg-slate-200 rounded-xl border border-slate-200 transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shadow-2xs"
                  title="عرض السجل الطبي وتاريخ الزيارات السابقة للمريض"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>السجل</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(p)}
                  className="min-h-[40px] py-2 px-1 text-[11px] font-bold text-teal-800 bg-teal-50/80 hover:bg-teal-100 active:bg-teal-200 rounded-xl border border-teal-200 transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shadow-2xs"
                  title="تعديل واستكمال بيانات ملف المريض (فصيلة الدم، الهاتف، العنوان، إلخ)"
                >
                  <Pencil className="w-3.5 h-3.5 text-teal-600" />
                  <span>تعديل</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRegisterVisitForPatient(p)}
                  className="min-h-[40px] py-2 px-1 text-[11px] font-bold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shadow-xs"
                  title="تسجيل كشف جديد للمريض بالعيادات الخارجية"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-teal-200" />
                  <span>كشف</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Patient Registration Modal with Multi-Criteria Duplicate Prevention */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer bg-slate-100 hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 sm:mb-5 border-b border-slate-100 pb-3 pl-8">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                فتح ملف مريض جديد (نظام المعرف الموحد)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                يتم التحقق الفوري في قاعدة البيانات لمنع تكرار الملفات أو تشابه الأسماء.
              </p>
            </div>

            {submitError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{submitError}</span>
              </div>
            )}

            {/* DUPLICATE WARNING BANNERS */}
            {dupResult?.hasExactMatch && (
              <div className="mb-4 p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>تنبيه: مريض مسجل مسبقاً بنفس البيانات بنسبة 100%!</span>
                </div>
                <p className="text-xs text-rose-800">
                  تم العثور على ملف مريض مطابق تماماً برقم: <strong className="font-mono">{dupResult.exactMatchPatient?.patient_number}</strong> ({dupResult.exactMatchPatient?.full_name}).
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (dupResult.exactMatchPatient) {
                        setIsModalOpen(false);
                        handleOpenPatientProfile(dupResult.exactMatchPatient);
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold cursor-pointer min-h-[44px]"
                  >
                    فتح الملف القائم للمريض وتفادي التكرار
                  </button>
                </div>
              </div>
            )}

            {dupResult?.hasFamilyMatch && !dupResult.hasExactMatch && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>تطابق جزئي / هاتف عائلي مشترك</span>
                </div>
                {dupResult.potentialMatches.map((m, idx) => (
                  <p key={idx} className="text-xs text-amber-800 leading-relaxed">
                    {m.reason}
                  </p>
                ))}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowFamily"
                    checked={allowFamilyDuplicate}
                    onChange={e => setAllowFamilyDuplicate(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 cursor-pointer"
                  />
                  <label htmlFor="allowFamily" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    أؤكد أنه مريض جديد مستقل ينتمي لنفس الأسرة (فتح ملف جديد برقم منفصل)
                  </label>
                </div>
              </div>
            )}

            <form onSubmit={handleCreatePatient} className="space-y-3.5 sm:space-y-4">
              {/* Phone + Full Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رقم الهاتف المحمول <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الاسم الرباعي للمريض <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="الاسم الرباعي كما في البطاقة/شهادة الميلاد"
                    className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600"
                  />
                </div>
              </div>

              {/* BirthDate + Gender + Blood Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    تاريخ الميلاد <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    النوع <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as 'male' | 'female')}
                    className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 bg-white"
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>فصيلة الدم</span>
                    <span className="text-[10px] text-slate-400 font-normal">اختياري</span>
                  </label>
                  <select
                    value={bloodType}
                    onChange={e => setBloodType(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 bg-white font-mono font-bold text-slate-800"
                  >
                    <option value="">غير محددة</option>
                    <option value="A+">A+ (موجب)</option>
                    <option value="A-">A- (سالب)</option>
                    <option value="B+">B+ (موجب)</option>
                    <option value="B-">B- (سالب)</option>
                    <option value="O+">O+ (موجب)</option>
                    <option value="O-">O- (سالب)</option>
                    <option value="AB+">AB+ (موجب)</option>
                    <option value="AB-">AB- (سالب)</option>
                  </select>
                </div>
              </div>

              {/* National ID (Optional) + Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الرقم القومي (اختياري إن وجد)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                    placeholder="14 رقماً (اختياري للأطفال أو الطوارئ)"
                    className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    محل الإقامة / القرية
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="ميت علي، أو اسم القرية التابعة"
                    className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  هاتف الطوارئ / صلة القرابة (اختياري)
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={e => setEmergencyContact(e.target.value)}
                  placeholder="مثال: أحمد (الابن) - 010xxxxxxx"
                  className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ملاحظات إدارية / أمراض مزمنة بالملف
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="سكر، ضغط، حساسية علاجية، أو حالة خاصة..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-xl cursor-pointer order-2 sm:order-1"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving || dupResult?.hasExactMatch}
                  className="min-h-[44px] px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 rounded-xl transition-colors cursor-pointer disabled:opacity-50 order-1 sm:order-2 shadow-xs"
                >
                  {isSaving ? 'جاري إنشاء الملف وتوليد الرقم...' : 'حفظ وإنشاء الملف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Profile & Visit History Drawer */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col p-4 sm:p-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4 sm:mb-6 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md font-mono tabular-nums border border-teal-200">
                    {selectedPatient.patient_number}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    فتح الملف: {new Date(selectedPatient.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  {selectedPatient.full_name}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedPatient)}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 active:bg-teal-200 text-teal-800 border border-teal-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="تعديل واستكمال بيانات ملف المريض (فصيلة الدم، الهاتف، العنوان، إلخ)"
                >
                  <Pencil className="w-3.5 h-3.5 text-teal-600" />
                  <span>تعديل البيانات</span>
                </button>

                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  title="إغلاق السجل"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Patient Info Card */}
            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 text-xs space-y-2.5 mb-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <span className="text-slate-500 block text-[11px]">رقم الهاتف:</span>
                  <a
                    href={`tel:${selectedPatient.phone}`}
                    className="font-bold text-teal-700 hover:text-teal-900 font-mono tabular-nums inline-flex items-center gap-1 mt-0.5"
                  >
                    <Phone className="w-3 h-3 text-teal-600" />
                    <span>{selectedPatient.phone}</span>
                  </a>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">تاريخ الميلاد:</span>
                  <span className="font-bold text-slate-800 font-mono tabular-nums">{selectedPatient.birth_date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">النوع:</span>
                  <span className="font-bold text-slate-800">{selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">فصيلة الدم:</span>
                  {selectedPatient.blood_type ? (
                    <span className="font-bold font-mono text-rose-700 text-xs px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 inline-block mt-0.5">
                      فصيلة {selectedPatient.blood_type}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(selectedPatient)}
                      className="text-amber-800 hover:text-amber-950 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 inline-flex items-center gap-1 mt-0.5 cursor-pointer transition-colors"
                      title="اضغط لتسجيل فصيلة دم المريض بعد ظهور نتيجة التحليل"
                    >
                      <Droplet className="w-3 h-3 text-amber-600" />
                      <span>+ استكمال فصيلة الدم الآن</span>
                    </button>
                  )}
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <span className="text-slate-500 block text-[11px]">الرقم القومي:</span>
                  <span className="font-bold text-slate-800 font-mono tabular-nums">{selectedPatient.national_id || 'غير مسجل'}</span>
                </div>
              </div>

              {selectedPatient.address && (
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-slate-500">العنوان: </span>
                  <span className="text-slate-800">{selectedPatient.address}</span>
                </div>
              )}

              {selectedPatient.emergency_contact && (
                <div className="pt-1">
                  <span className="text-slate-500">جهة اتصال الطوارئ: </span>
                  <span className="text-slate-800">{selectedPatient.emergency_contact}</span>
                </div>
              )}

              {selectedPatient.notes && (
                <div className="pt-1 text-amber-800">
                  <span className="font-bold">ملاحظات: </span>
                  <span>{selectedPatient.notes}</span>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>سجل الزيارات السابقة ({patientVisits.length})</span>
              </h4>

              <button
                onClick={() => {
                  const pat = selectedPatient;
                  setSelectedPatient(null);
                  onRegisterVisitForPatient(pat);
                }}
                className="min-h-[44px] px-3.5 py-2 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4 text-teal-200" />
                <span>تسجيل كشف جديد للمريض</span>
              </button>
            </div>

            {/* Visit History Timeline */}
            <div className="flex-1 space-y-3">
              {isLoadingVisits ? (
                <div className="text-center py-8 text-xs text-slate-400">جاري تحميل سجل الزيارات...</div>
              ) : patientVisits.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                  لم يتم تسجيل أي زيارات سابقة لهذا الملف بعد.
                </div>
              ) : (
                patientVisits.map(visit => (
                  <div
                    key={visit.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">
                        عيادة {visit.specialty_name}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {visit.visit_date}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center justify-between">
                      <span>الطبيب: {visit.doctor_name}</span>
                      <span className={`px-2 py-0.5 rounded-sm font-semibold text-[10px] ${
                        visit.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : visit.status === 'attended'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : visit.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {visit.status === 'completed' ? 'اكتمل الكشف' :
                         visit.status === 'attended' ? 'حضر المريض' :
                         visit.status === 'cancelled' ? 'أُلغيت' : 'مسجلة بالاستقبال'}
                      </span>
                    </div>

                    {visit.reception_notes && (
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>ملاحظات: {visit.reception_notes}</span>
                      </div>
                    )}

                    {visit.status === 'cancelled' && visit.cancellation_reason && (
                      <div className="text-[11px] text-rose-700 bg-rose-50/80 p-2 rounded-lg border border-rose-200 mt-1">
                        <strong className="font-bold">سبب الإلغاء:</strong> {visit.cancellation_reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Data Modal (تعديل واستكمال بيانات ملف المريض) */}
      {editingPatient && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-teal-200 max-w-xl w-full p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setEditingPatient(null)}
              className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3 pl-8">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    تعديل واستكمال بيانات ملف المريض
                  </h3>
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200" title="رقم الملف الطبي موحد ودائم">
                    <Lock className="w-3 h-3 text-teal-600" />
                    <span>ملف: {editingPatient.patient_number}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  تحديث البيانات الشخصية واستكمال التحاليل كفصيلة الدم أو أرقام الطوارئ.
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {editError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSavePatientEdit} className="space-y-3.5 sm:space-y-4">
              {/* Phone + Full Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رقم الهاتف المحمول <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الاسم الرباعي للمريض <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    placeholder="الاسم الرباعي كما في البطاقة"
                    className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 font-bold bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* BirthDate + Gender + Blood Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    تاريخ الميلاد <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editBirthDate}
                    onChange={e => setEditBirthDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    النوع <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={editGender}
                    onChange={e => setEditGender(e.target.value as 'male' | 'female')}
                    className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 bg-slate-50 focus:bg-white font-bold text-slate-800"
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-teal-900">
                      <Droplet className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                      <span>فصيلة الدم</span>
                    </span>
                    <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                      استكمال لاحق
                    </span>
                  </label>
                  <select
                    value={editBloodType}
                    onChange={e => setEditBloodType(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs border-2 border-teal-500 rounded-xl focus:outline-hidden focus:border-teal-700 bg-teal-50/30 focus:bg-white font-mono font-extrabold text-slate-900 cursor-pointer shadow-2xs"
                  >
                    <option value="">غير محددة (بانتظار التحليل)</option>
                    <option value="A+">A+ (موجب)</option>
                    <option value="A-">A- (سالب)</option>
                    <option value="B+">B+ (موجب)</option>
                    <option value="B-">B- (سالب)</option>
                    <option value="O+">O+ (موجب)</option>
                    <option value="O-">O- (سالب)</option>
                    <option value="AB+">AB+ (موجب)</option>
                    <option value="AB-">AB- (سالب)</option>
                  </select>
                </div>
              </div>

              {/* National ID + Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    الرقم القومي (14 رقماً)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={editNationalId}
                    onChange={e => setEditNationalId(e.target.value)}
                    placeholder="14 رقماً (اختياري للأطفال)"
                    className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 font-mono text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    محل الإقامة / القرية
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    placeholder="ميت علي، أو اسم القرية التابعة"
                    className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  هاتف الطوارئ / صلة القرابة (اختياري)
                </label>
                <input
                  type="text"
                  value={editEmergencyContact}
                  onChange={e => setEditEmergencyContact(e.target.value)}
                  placeholder="مثال: أحمد (الابن) - 010xxxxxxx"
                  className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ملاحظات إدارية / أمراض مزمنة أو حساسية أدوية
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="سكر، ضغط، حساسية بنسلين، حالة خاصة..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="min-h-[44px] px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="min-h-[44px] px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-200" />
                  <span>{isSavingEdit ? 'جاري حفظ التعديلات...' : 'حفظ التعديلات وتحديث الملف'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
