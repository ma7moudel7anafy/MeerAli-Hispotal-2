import React, { useState, useEffect } from 'react';
import { Specialty, Doctor } from '../../types';
import { dbService } from '../../lib/databaseService';
import { useAuth } from '../../context/AuthContext';
import { SpecialtyClinicalPresetsManager } from './SpecialtyClinicalPresetsManager';
import {
  Stethoscope,
  UserPlus,
  ShieldAlert,
  Plus,
  Trash2,
  ArrowRight,
  Search,
  Users,
  AlertTriangle,
  X,
  ChevronLeft,
  Building2,
  DollarSign,
  Info,
  Phone,
  PhoneCall,
  Edit3,
  CheckCircle2,
  Save,
} from 'lucide-react';

export const AdminClinicManager: React.FC = () => {
  const { isAdmin, currentUser } = useAuth();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Navigation & Drill-Down State
  const [activeTab, setActiveTab] = useState<'specialties' | 'all_doctors' | 'clinical_presets'>('specialties');
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterSpecId, setSelectedFilterSpecId] = useState<string>('all');

  // Modals
  const [isAddSpecialtyModalOpen, setIsAddSpecialtyModalOpen] = useState(false);
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);
  const [specialtyToDelete, setSpecialtyToDelete] = useState<Specialty | null>(null);

  // New Specialty Form Fields
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecDesc, setNewSpecDesc] = useState('');

  // Edit Specialty Form Fields
  const [specialtyToEdit, setSpecialtyToEdit] = useState<Specialty | null>(null);
  const [editSpecName, setEditSpecName] = useState('');
  const [editSpecDesc, setEditSpecDesc] = useState('');

  // New Doctor Form Fields
  const [newDocName, setNewDocName] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('أخصائي');
  const [newDocSpecId, setNewDocSpecId] = useState('');
  const [newDocFee, setNewDocFee] = useState('40'); // سعر الكشف الجديد
  const [newDocFollowupFee, setNewDocFollowupFee] = useState('20'); // سعر الإعادة والاستشارة
  const [newDocPhone, setNewDocPhone] = useState(''); // رقم هاتف الطبيب
  const [newDocBio, setNewDocBio] = useState('');

  // Edit Doctor Form Fields & Confirmation State
  const [doctorToEdit, setDoctorToEdit] = useState<Doctor | null>(null);
  const [editDocName, setEditDocName] = useState('');
  const [editDocTitle, setEditDocTitle] = useState('أخصائي');
  const [editDocSpecId, setEditDocSpecId] = useState('');
  const [editDocFee, setEditDocFee] = useState('40');
  const [editDocFollowupFee, setEditDocFollowupFee] = useState('20');
  const [editDocPhone, setEditDocPhone] = useState('');
  const [editDocBio, setEditDocBio] = useState('');
  const [isConfirmSaveDoctorOpen, setIsConfirmSaveDoctorOpen] = useState(false);
  const [isUpdatingDoctor, setIsUpdatingDoctor] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [specs, docs] = await Promise.all([dbService.getSpecialties(), dbService.getDoctors()]);
      setSpecialties(specs);
      setDoctors(docs);
      if (specs.length > 0 && !newDocSpecId) {
        setNewDocSpecId(specs[0].id);
      }
    } catch (e) {
      console.error(e);
      setMessage({ text: 'فشل تحميل بيانات العيادات والأطباء', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!isAdmin) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">
          عفواً، هذه اللوحة مخصصة لإدارة المستشفى فقط (Admin)
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          حسابك الحالي مسجل برتبة <strong className="text-slate-800">«موظف استقبال»</strong>. بموجب سياسات RLS، لا يحق لموظفي الاستقبال إضافة أو تعديل التخصصات الطبية وجداول الأطباء.
        </p>
      </div>
    );
  }

  // Active selected specialty for department drill-down
  const currentSpecialty = specialties.find(s => s.id === selectedSpecialtyId);
  const currentSpecialtyDoctors = doctors.filter(d => d.specialty_id === selectedSpecialtyId);

  // Handle Add Specialty
  const handleAddSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecName.trim()) return;

    try {
      const created = await dbService.createSpecialty(
        {
          name: newSpecName.trim(),
          description: newSpecDesc.trim(),
          icon_name: 'Stethoscope',
        },
        currentUser || undefined
      );

      setMessage({ text: `تمت إضافة قسم «${created.name}» بنجاح!`, type: 'success' });
      setNewSpecName('');
      setNewSpecDesc('');
      setIsAddSpecialtyModalOpen(false);
      await loadData();
      // Automatically open the newly created specialty to allow immediately adding doctors to it!
      setSelectedSpecialtyId(created.id);
    } catch (err: any) {
      setMessage({ text: err?.message || 'فشلت إضافة العيادة', type: 'error' });
    }
  };

  const handleOpenEditSpecialty = (spec: Specialty) => {
    setSpecialtyToEdit(spec);
    setEditSpecName(spec.name);
    setEditSpecDesc(spec.description || '');
  };

  const handleSaveEditSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialtyToEdit || !editSpecName.trim()) return;

    try {
      const updated = await dbService.updateSpecialty(
        specialtyToEdit.id,
        {
          name: editSpecName.trim(),
          description: editSpecDesc.trim(),
        },
        currentUser || undefined
      );

      setMessage({ text: `تم تحديث بيانات قسم «${updated.name}» بنجاح!`, type: 'success' });
      setSpecialtyToEdit(null);
      await loadData();
    } catch (err: any) {
      setMessage({ text: err?.message || 'فشل تحديث بيانات القسم', type: 'error' });
    }
  };

  // Handle Delete Specialty
  const handleConfirmDeleteSpecialty = async () => {
    if (!specialtyToDelete) return;
    try {
      const res = await dbService.deleteSpecialty(specialtyToDelete.id, currentUser || undefined);
      if (res.success) {
        setMessage({ text: `تم حذف قسم «${specialtyToDelete.name}» بنجاح!`, type: 'success' });
        if (selectedSpecialtyId === specialtyToDelete.id) {
          setSelectedSpecialtyId(null);
        }
        await loadData();
      } else {
        setMessage({ text: res.message || 'فشل حذف القسم لوجود ارتباطات', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err?.message || 'حدث خطأ أثناء محاولة الحذف', type: 'error' });
    } finally {
      setSpecialtyToDelete(null);
    }
  };

  // Open Add Doctor Modal specifically for a department
  const handleOpenAddDoctorForSpecialty = (specId: string) => {
    setNewDocSpecId(specId);
    setNewDocName('');
    setNewDocBio('');
    setNewDocFee('40');
    setNewDocFollowupFee('20');
    setNewDocPhone('');
    setNewDocTitle('أخصائي');
    setIsAddDoctorModalOpen(true);
  };

  // Handle Add Doctor
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocSpecId) return;

    try {
      const created = await dbService.createDoctor(
        {
          specialty_id: newDocSpecId,
          full_name: newDocName.trim(),
          title: newDocTitle,
          bio: newDocBio.trim(),
          consultation_fee: parseFloat(newDocFee) || 0,
          followup_fee: parseFloat(newDocFollowupFee) || 0,
          phone: newDocPhone.trim(),
        },
        currentUser || undefined
      );

      setMessage({ text: `تم تسجيل الطبيب «${created.full_name}» بنجاح في قسم «${created.specialty_name}»!`, type: 'success' });
      setNewDocName('');
      setNewDocBio('');
      setNewDocPhone('');
      setNewDocFee('40');
      setNewDocFollowupFee('20');
      setIsAddDoctorModalOpen(false);
      await loadData();
    } catch (err: any) {
      setMessage({ text: err?.message || 'فشلت إضافة الطبيب', type: 'error' });
    }
  };

  // Handle Delete Doctor
  const handleConfirmDeleteDoctor = async () => {
    if (!doctorToDelete) return;
    try {
      const res = await dbService.deleteDoctor(doctorToDelete.id, currentUser || undefined);
      if (res.success) {
        setMessage({ text: `تم حذف الطبيب «${doctorToDelete.full_name}» بنجاح من القسم!`, type: 'success' });
        await loadData();
      } else {
        setMessage({ text: res.message || 'فشل حذف الطبيب', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err?.message || 'حدث خطأ أثناء حذف الطبيب', type: 'error' });
    } finally {
      setDoctorToDelete(null);
    }
  };

  // Open Edit Doctor Modal
  const handleOpenEditDoctor = (doctor: Doctor) => {
    setDoctorToEdit(doctor);
    setEditDocName(doctor.full_name);
    setEditDocTitle(doctor.title);
    setEditDocSpecId(doctor.specialty_id);
    setEditDocFee(String(doctor.consultation_fee));
    setEditDocFollowupFee(
      String(doctor.followup_fee !== undefined ? doctor.followup_fee : Math.round(doctor.consultation_fee / 2))
    );
    setEditDocPhone(doctor.phone || '');
    setEditDocBio(doctor.bio || '');
    setIsConfirmSaveDoctorOpen(false);
  };

  // Step 1: User requests save in Edit modal -> triggers Confirmation Alert Modal
  const handleRequestSaveDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDocName.trim() || !editDocSpecId) return;
    setIsConfirmSaveDoctorOpen(true);
  };

  // Step 2: User confirms in the alert modal -> executes update
  const handleExecuteSaveDoctor = async () => {
    if (!doctorToEdit) return;
    setIsUpdatingDoctor(true);
    try {
      const res = await dbService.updateDoctor(
        doctorToEdit.id,
        {
          full_name: editDocName.trim(),
          title: editDocTitle,
          specialty_id: editDocSpecId,
          consultation_fee: parseFloat(editDocFee) || 0,
          followup_fee: parseFloat(editDocFollowupFee) || 0,
          phone: editDocPhone.trim(),
          bio: editDocBio.trim(),
        },
        currentUser || undefined
      );

      if (res.success) {
        setMessage({
          text: `تم حفظ وتحديث بيانات الطبيب «${editDocName.trim()}» بنجاح!`,
          type: 'success',
        });
        setIsConfirmSaveDoctorOpen(false);
        setDoctorToEdit(null);
        await loadData();
      } else {
        setMessage({
          text: res.message || 'فشل تحديث بيانات الطبيب',
          type: 'error',
        });
      }
    } catch (err: any) {
      setMessage({
        text: err?.message || 'حدث خطأ أثناء حفظ تعديلات الطبيب',
        type: 'error',
      });
    } finally {
      setIsUpdatingDoctor(false);
    }
  };

  // Filtered lists
  const filteredSpecialties = specialties.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllDoctors = doctors.filter(d => {
    const matchesSearch =
      d.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.specialty_name && d.specialty_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSpec = selectedFilterSpecId === 'all' || d.specialty_id === selectedFilterSpecId;
    return matchesSearch && matchesSpec;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb & View Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {selectedSpecialtyId && currentSpecialty ? (
            <div className="flex items-center gap-2 mb-1.5">
              <button
                onClick={() => setSelectedSpecialtyId(null)}
                className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>العيادات والتخصصات</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-xs text-slate-800 font-bold">{currentSpecialty.name}</span>
            </div>
          ) : null}

          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-700" />
            <span>
              {selectedSpecialtyId && currentSpecialty
                ? `إدارة أطباء ${currentSpecialty.name}`
                : 'إدارة العيادات والتخصصات الطبية'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedSpecialtyId && currentSpecialty
              ? `استعراض الأطباء المقيدين داخل قسم ${currentSpecialty.name} مع إمكانية إضافة أو حذف أطباء القسم.`
              : 'تنظيم الأقسام الطبية، الدخول لكل عيادة لمعاينة أطبائها، وتحديد الرسوم الخيرية المقررة.'}
          </p>
        </div>

        {/* Global tab switch (only shown when not inside a specific specialty) */}
        {!selectedSpecialtyId ? (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('specialties')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'specialties'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الأقسام والعيادات ({specialties.length})
            </button>
            <button
              onClick={() => setActiveTab('all_doctors')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'all_doctors'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كافة الأطباء المسجلين ({doctors.length})
            </button>
            <button
              onClick={() => setActiveTab('clinical_presets')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'clinical_presets'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
              <span>بروتوكولات وتشخيصات الأقسام</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSelectedSpecialtyId(null)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer self-start md:self-auto"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لكافة العيادات</span>
          </button>
        )}
      </div>

      {/* Alert / Feedback message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          VIEW A: DRILL-DOWN INTO A SPECIFIC SPECIALTY (الواجهة المباشرة داخل التخصص)
         ========================================================================= */}
      {selectedSpecialtyId && currentSpecialty ? (
        <div className="space-y-6">
          {/* Clinic Department Info Card */}
          <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-teal-800/80 border border-teal-600/50 flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-teal-200" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{currentSpecialty.name}</h3>
                    <span className="text-[11px] text-teal-300 font-medium">
                      قسم طبي معتمد باللجنة الطبية
                    </span>
                  </div>
                </div>
                {currentSpecialty.description && (
                  <p className="text-xs text-slate-300 max-w-2xl leading-relaxed pt-1">
                    {currentSpecialty.description}
                  </p>
                )}
              </div>

              {/* Department Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => handleOpenEditSpecialty(currentSpecialty)}
                  className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-teal-300 font-bold text-xs rounded-xl border border-teal-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="تعديل اسم ووصف هذا القسم"
                >
                  <Edit3 className="w-4 h-4 text-teal-400" />
                  <span>تعديل بيانات القسم</span>
                </button>

                <button
                  onClick={() => handleOpenAddDoctorForSpecialty(currentSpecialty.id)}
                  className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة طبيب لهذا القسم</span>
                </button>

                <button
                  onClick={() => setSpecialtyToDelete(currentSpecialty)}
                  className="px-3 py-2.5 bg-slate-800/80 hover:bg-rose-950/80 hover:text-rose-300 text-slate-400 font-semibold text-xs rounded-xl border border-slate-700/80 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="حذف هذا القسم"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span className="hidden sm:inline">حذف القسم</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[11px] block">الأطباء المقيدون بالقسم:</span>
                <span className="text-base font-bold text-white font-mono">
                  {currentSpecialtyDoctors.length} {currentSpecialtyDoctors.length === 1 ? 'طبيب' : 'أطباء'}
                </span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[11px] block">متوسط قيمة الكشف الخيري:</span>
                <span className="text-base font-bold text-teal-300 font-mono">
                  {currentSpecialtyDoctors.length > 0
                    ? Math.round(
                        currentSpecialtyDoctors.reduce((acc, d) => acc + (d.consultation_fee || 0), 0) /
                          currentSpecialtyDoctors.length
                      )
                    : 0}{' '}
                  ج.م
                </span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-400 text-[11px] block">حالة العيادة:</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>نشطة ومتاحة للاستقبال</span>
                </span>
              </div>
            </div>
          </div>

          {/* Doctors in this specialty */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-700" />
                <h4 className="font-bold text-xs text-slate-800">
                  قائمة الأطباء المسجلين في ({currentSpecialty.name})
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-100 text-teal-800 font-bold">
                  {currentSpecialtyDoctors.length}
                </span>
              </div>

              <button
                onClick={() => handleOpenAddDoctorForSpecialty(currentSpecialty.id)}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة طبيب جديد</span>
              </button>
            </div>

            {currentSpecialtyDoctors.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl mx-auto flex items-center justify-center mb-3">
                  <Users className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  لا يوجد أطباء مسجلين في هذا القسم حتى الآن
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
                  لم يتم قيد أي أطباء في «{currentSpecialty.name}» بعد. قم بإضافة الأطباء المعالجين
                  لتتمكن من إدراجهم في جداول الحضور اليومية وكشوفات المرضى.
                </p>
                <button
                  onClick={() => handleOpenAddDoctorForSpecialty(currentSpecialty.id)}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>تسجيل أول طبيب بالقسم</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {currentSpecialtyDoctors.map(doctor => {
                  const followupFee = doctor.followup_fee !== undefined ? doctor.followup_fee : Math.round(doctor.consultation_fee / 2);
                  return (
                    <div
                      key={doctor.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                          {doctor.full_name?.split(' ')?.[1]?.[0] || 'د'}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="font-bold text-sm text-slate-900">{doctor.full_name}</h5>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {doctor.title}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              نشط
                            </span>
                            {doctor.has_account ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                حساب دخول مفعّل ({doctor.email || 'طبيب'})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                بدون حساب دخول
                              </span>
                            )}
                          </div>

                          {/* Doctor Phone & Contact Badge */}
                          <div className="flex flex-wrap items-center gap-2">
                            {doctor.phone ? (
                              <a
                                href={`tel:${doctor.phone}`}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-mono font-bold border border-emerald-200/80 transition-colors"
                                title="اتصال مباشر بالطبيب"
                              >
                                <PhoneCall className="w-3 h-3 text-emerald-600" />
                                <span dir="ltr">{doctor.phone}</span>
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-300" />
                                <span>لم يسجل رقم هاتف</span>
                              </span>
                            )}
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-slate-500">القسم: {currentSpecialty.name}</span>
                          </div>

                          {doctor.bio ? (
                            <p className="text-xs text-slate-500 line-clamp-2 max-w-xl">
                              {doctor.bio}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              لم تُسجل نبذة مهنية بعد
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* Dual Fees: New visit + Follow-up visit */}
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                          <div className="text-center px-2 border-l border-slate-200">
                            <span className="block text-[10px] text-slate-500 font-medium">كشف جديد</span>
                            <span className="text-sm font-bold text-teal-800 font-mono">
                              {doctor.consultation_fee} <span className="text-[10px] font-normal">ج.م</span>
                            </span>
                          </div>
                          <div className="text-center px-2">
                            <span className="block text-[10px] text-indigo-600 font-medium">إعادة واستشارة</span>
                            <span className="text-sm font-bold text-indigo-700 font-mono">
                              {followupFee} <span className="text-[10px] font-normal">ج.م</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditDoctor(doctor)}
                            className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-teal-200/80 shadow-2xs"
                            title="تعديل بيانات الطبيب وأسعاره وهاتفه"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                            <span>تعديل</span>
                          </button>

                          <button
                            onClick={() => setDoctorToDelete(doctor)}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200/60 shadow-2xs"
                            title="حذف الطبيب من هذا القسم"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* =========================================================================
          VIEW B: ALL SPECIALTIES LIST (قائمة كافة الأقسام الطبية مع إمكانية الدخول)
         ========================================================================= */}
      {!selectedSpecialtyId && activeTab === 'specialties' && (
        <div className="space-y-5">
          {/* Actions & Search Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="البحث في العيادات والأقسام..."
                className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 bg-slate-50/50"
              />
            </div>

            <button
              onClick={() => {
                setNewSpecName('');
                setNewSpecDesc('');
                setIsAddSpecialtyModalOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عيادة / تخصص جديد</span>
            </button>
          </div>

          {/* Specialties Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSpecialties.map(spec => {
              const specDoctors = doctors.filter(d => d.specialty_id === spec.id);

              return (
                <div
                  key={spec.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-700 flex items-center justify-center shrink-0">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/60">
                        {specDoctors.length} {specDoctors.length === 1 ? 'طبيب' : 'أطباء'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-teal-800 transition-colors">
                        {spec.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {spec.description || 'عيادة تخصصية تحت إشراف نخبة من الأطباء والاستشاريين.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => setSelectedSpecialtyId(spec.id)}
                      className="flex-1 py-2 px-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>دخول القسم</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenEditSpecialty(spec)}
                      className="p-2 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-xl transition-colors cursor-pointer border border-teal-200/60"
                      title="تعديل بيانات القسم"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setSpecialtyToDelete(spec)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="حذف العيادة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSpecialties.length === 0 && (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">لا توجد عيادات مطابقة لبحثك.</p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW C: ALL DOCTORS GLOBAL TAB (دليل كافة الأطباء المسجلين)
         ========================================================================= */}
      {!selectedSpecialtyId && activeTab === 'all_doctors' && (
        <div className="space-y-5">
          {/* Filter & Add Doctor Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الطبيب أو اللقب..."
                  className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 bg-slate-50/50"
                />
              </div>

              <select
                value={selectedFilterSpecId}
                onChange={e => setSelectedFilterSpecId(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700"
              >
                <option value="all">كافة العيادات والتخصصات</option>
                {specialties.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setNewDocSpecId(specialties[0]?.id || '');
                setNewDocName('');
                setNewDocBio('');
                setNewDocFee('40');
                setNewDocTitle('أخصائي');
                setIsAddDoctorModalOpen(true);
              }}
              className="w-full md:w-auto px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>تسجيل طبيب جديد</span>
            </button>
          </div>

          {/* All Doctors List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
              <span>قائمة الأطباء المسجلين ({filteredAllDoctors.length})</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredAllDoctors.map(doc => {
                const followupFee = doc.followup_fee !== undefined ? doc.followup_fee : Math.round(doc.consultation_fee / 2);
                return (
                  <div
                    key={doc.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {doc.full_name?.split(' ')?.[1]?.[0] || 'د'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{doc.full_name}</h4>
                          <span className="text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded-sm font-semibold border border-teal-200/60">
                            {doc.title}
                          </span>
                          {doc.has_account ? (
                            <span className="text-[10px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded-sm font-bold border border-blue-200">
                              له حساب دخول
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200">
                              بدون حساب
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>عيادة <strong className="text-slate-700">{doc.specialty_name}</strong></span>
                          {doc.phone && (
                            <>
                              <span className="text-slate-300">•</span>
                              <a
                                href={`tel:${doc.phone}`}
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-sm border border-emerald-200/70"
                                title="اتصال بالطبيب"
                              >
                                <PhoneCall className="w-2.5 h-2.5 text-emerald-600" />
                                <span dir="ltr">{doc.phone}</span>
                              </a>
                            </>
                          )}
                        </div>
                        {doc.bio && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{doc.bio}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/80">
                        <div className="text-center px-1.5 border-l border-slate-200">
                          <span className="block text-[9px] text-slate-500 font-medium">كشف جديد</span>
                          <span className="text-xs font-bold text-teal-800 font-mono">
                            {doc.consultation_fee} <span className="text-[9px] font-normal">ج.م</span>
                          </span>
                        </div>
                        <div className="text-center px-1.5">
                          <span className="block text-[9px] text-indigo-600 font-medium">إعادة واستشارة</span>
                          <span className="text-xs font-bold text-indigo-700 font-mono">
                            {followupFee} <span className="text-[9px] font-normal">ج.م</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditDoctor(doc)}
                          className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-teal-200/70 shadow-2xs"
                          title="تعديل بيانات الطبيب وأسعاره وهاتفه"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                          <span>تعديل</span>
                        </button>

                        <button
                          onClick={() => setDoctorToDelete(doc)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                          title="حذف الطبيب"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredAllDoctors.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                لا يوجد أطباء مطابقون لبحثك.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW C: CLINICAL PRESETS MANAGER (إدارة بروتوكولات وتشخيصات وقوائم الأقسام)
         ========================================================================= */}
      {!selectedSpecialtyId && activeTab === 'clinical_presets' && (
        <SpecialtyClinicalPresetsManager specialties={specialties} />
      )}

      {/* =========================================================================
          MODAL 1: ADD SPECIALTY / CLINIC
         ========================================================================= */}
      {isAddSpecialtyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddSpecialtyModalOpen(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">إضافة عيادة / قسم جديد</h3>
                <p className="text-xs text-slate-500">تسجيل التخصص الطبي في قاعدة بيانات المستشفى</p>
              </div>
            </div>

            <form onSubmit={handleAddSpecialty} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">اسم العيادة / التخصص *</label>
                <input
                  type="text"
                  required
                  value={newSpecName}
                  onChange={e => setNewSpecName(e.target.value)}
                  placeholder="مثال: عيادة المسالك البولية، عيادة المخ والأعصاب..."
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">وصف العيادة والخدمات الطبية</label>
                <textarea
                  rows={3}
                  value={newSpecDesc}
                  onChange={e => setNewSpecDesc(e.target.value)}
                  placeholder="وصف مختصر للخدمات الطبية المقدمة بالعيادة لمساعدة المرضى وموظفي الاستقبال"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer text-xs shadow-xs"
                >
                  إضافة العيادة والدخول إليها
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddSpecialtyModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1.5: EDIT SPECIALTY / DEPARTMENT
         ========================================================================= */}
      {specialtyToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSpecialtyToEdit(null)}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">تعديل بيانات القسم / العيادة</h3>
                <p className="text-xs text-slate-500">تحديث اسم وتفاصيل عيادة «{specialtyToEdit.name}»</p>
              </div>
            </div>

            <form onSubmit={handleSaveEditSpecialty} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">اسم العيادة / التخصص *</label>
                <input
                  type="text"
                  required
                  value={editSpecName}
                  onChange={e => setEditSpecName(e.target.value)}
                  placeholder="مثال: عيادة المسالك البولية..."
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">وصف العيادة والخدمات الطبية</label>
                <textarea
                  rows={3}
                  value={editSpecDesc}
                  onChange={e => setEditSpecDesc(e.target.value)}
                  placeholder="وصف الخدمات الطبية المقدمة بالعيادة لمساعدة المرضى وموظفي الاستقبال"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer text-xs shadow-xs"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setSpecialtyToEdit(null)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADD DOCTOR TO A SPECIALTY
         ========================================================================= */}
      {isAddDoctorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddDoctorModalOpen(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedSpecialtyId && currentSpecialty
                    ? `إضافة طبيب في ${currentSpecialty.name}`
                    : 'تسجيل طبيب جديد'}
                </h3>
                <p className="text-xs text-slate-500">
                  إدراج بيانات الطبيب ومؤهلاته وقيمة الكشف الخيري
                </p>
              </div>
            </div>

            <form onSubmit={handleAddDoctor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">الاسم الكامل للطبيب *</label>
                <input
                  type="text"
                  required
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  placeholder="مثال: د. أحمد محمد الشريف"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اللقب الطبي</label>
                  <select
                    value={newDocTitle}
                    onChange={e => setNewDocTitle(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="استشاري">استشاري</option>
                    <option value="أخصائي">أخصائي</option>
                    <option value="زميل">زميل كلية الجراحين</option>
                    <option value="أستاذ دكتور">أستاذ دكتور</option>
                    <option value="مدرس">مدرس بكلية الطب</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    رقم هاتف الطبيب (للاتصال المباشر)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={newDocPhone}
                      onChange={e => setNewDocPhone(e.target.value)}
                      placeholder="مثال: 01012345678"
                      dir="ltr"
                      className="w-full pl-3 pr-8 py-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:outline-hidden focus:border-teal-600 text-left"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Dual Fees: New Consultation Fee & Followup / Re-visit Fee */}
              <div className="p-3 bg-teal-50/60 border border-teal-200/80 rounded-xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-teal-900 font-bold text-xs">
                  <DollarSign className="w-3.5 h-3.5 text-teal-700" />
                  <span>تحديد تسعيرة الكشوفات الخيرية للطبيب</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                      سعر الكشف الجديد (ج.م) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newDocFee}
                      onChange={e => setNewDocFee(e.target.value)}
                      placeholder="40"
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg font-mono tabular-nums text-xs font-bold text-teal-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                      سعر الإعادة والاستشارة (ج.م) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newDocFollowupFee}
                      onChange={e => setNewDocFollowupFee(e.target.value)}
                      placeholder="20"
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg font-mono tabular-nums text-xs font-bold text-indigo-900"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-teal-700/80 leading-relaxed">
                  * يُطبق سعر الإعادة تلقائياً عند حجز تذكرة من نوع «إعادة واستشارة» للمريض، ويكون أقل أو رمزياً تخفيفاً على المرضى.
                </p>
              </div>

              {/* Department Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">القسم / العيادة التابع لها *</label>
                {selectedSpecialtyId && currentSpecialty ? (
                  <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 font-bold flex items-center justify-between">
                    <span>{currentSpecialty.name}</span>
                    <span className="text-[10px] text-teal-700 bg-white px-2 py-0.5 rounded-md font-semibold">
                      محدد تلقائياً للقسم الحالي
                    </span>
                  </div>
                ) : (
                  <select
                    value={newDocSpecId}
                    onChange={e => setNewDocSpecId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    {specialties.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">النبذة المهنية والمؤهلات العلمية</label>
                <textarea
                  rows={2}
                  value={newDocBio}
                  onChange={e => setNewDocBio(e.target.value)}
                  placeholder="المؤهلات العلمية، الزمالة والخبرات السابقة..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer text-xs shadow-xs"
                >
                  تسجيل الطبيب بالقسم
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddDoctorModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: EDIT DOCTOR MODAL
         ========================================================================= */}
      {doctorToEdit && !isConfirmSaveDoctorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setDoctorToEdit(null)}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">تعديل بيانات الطبيب</h3>
                <p className="text-xs text-slate-500">
                  تحديث بيانات الطبيب «{doctorToEdit.full_name}» وتسعيرة الكشوفات والاتصال
                </p>
              </div>
            </div>

            <form onSubmit={handleRequestSaveDoctor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">الاسم الكامل للطبيب *</label>
                <input
                  type="text"
                  required
                  value={editDocName}
                  onChange={e => setEditDocName(e.target.value)}
                  placeholder="مثال: د. أحمد محمد الشريف"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اللقب الطبي</label>
                  <select
                    value={editDocTitle}
                    onChange={e => setEditDocTitle(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="استشاري">استشاري</option>
                    <option value="أخصائي">أخصائي</option>
                    <option value="زميل">زميل كلية الجراحين</option>
                    <option value="أستاذ دكتور">أستاذ دكتور</option>
                    <option value="مدرس">مدرس بكلية الطب</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    رقم هاتف الطبيب (للاتصال المباشر)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={editDocPhone}
                      onChange={e => setEditDocPhone(e.target.value)}
                      placeholder="مثال: 01012345678"
                      dir="ltr"
                      className="w-full pl-3 pr-8 py-2.5 border border-slate-300 rounded-xl font-mono text-xs focus:outline-hidden focus:border-teal-600 text-left"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Dual Fees: New Consultation Fee & Followup / Re-visit Fee */}
              <div className="p-3 bg-teal-50/60 border border-teal-200/80 rounded-xl space-y-2.5">
                <div className="flex items-center gap-1.5 text-teal-900 font-bold text-xs">
                  <DollarSign className="w-3.5 h-3.5 text-teal-700" />
                  <span>تعديل تسعيرة الكشوفات الخيرية للطبيب</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                      سعر الكشف الجديد (ج.م) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editDocFee}
                      onChange={e => setEditDocFee(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg font-mono tabular-nums text-xs font-bold text-teal-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                      سعر الإعادة والاستشارة (ج.م) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editDocFollowupFee}
                      onChange={e => setEditDocFollowupFee(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg font-mono tabular-nums text-xs font-bold text-indigo-900"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-teal-700/80 leading-relaxed">
                  * يُطبق سعر الإعادة تلقائياً عند حجز تذكرة «إعادة واستشارة» للمريض، ويكون أقل من الكشف الجديد لتخفيف الأعباء.
                </p>
              </div>

              {/* Department / Specialty Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">القسم / العيادة التابع لها الطبيب *</label>
                <select
                  value={editDocSpecId}
                  onChange={e => setEditDocSpecId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-xs font-medium"
                >
                  {specialties.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  يمكنك نقل الطبيب لعيادة أخرى عند الحاجة عبر تغيير القسم أعلاه.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">النبذة المهنية والمؤهلات العلمية</label>
                <textarea
                  rows={2}
                  value={editDocBio}
                  onChange={e => setEditDocBio(e.target.value)}
                  placeholder="المؤهلات العلمية، الزمالة والخبرات السابقة..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer text-xs shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDoctorToEdit(null)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: CONFIRM SAVE DOCTOR EDITS ALERT
         ========================================================================= */}
      {doctorToEdit && isConfirmSaveDoctorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-teal-50 border border-teal-200 text-teal-700 rounded-2xl mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              تأكيد حفظ تعديلات بيانات الطبيب
            </h3>
            <p className="text-xs text-slate-500 text-center leading-relaxed mb-4">
              هل أنت متأكد من رغبتك في اعتماد وحفظ التعديلات الجديدة للطبيب؟
            </p>

            {/* Changes Summary Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 mb-4">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">اسم الطبيب واللقب:</span>
                <span className="font-bold text-slate-900">
                  {editDocTitle} / {editDocName}
                </span>
              </div>

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">القسم / العيادة:</span>
                <span className="font-bold text-teal-800">
                  {specialties.find(s => s.id === editDocSpecId)?.name || 'القسم المحدد'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">سعر الكشف الجديد:</span>
                <span className="font-bold text-teal-800 font-mono">
                  {editDocFee} ج.م
                </span>
              </div>

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">سعر الإعادة والاستشارة:</span>
                <span className="font-bold text-indigo-700 font-mono">
                  {editDocFollowupFee} ج.م
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">رقم الهاتف:</span>
                <span className="font-bold font-mono text-slate-800" dir="ltr">
                  {editDocPhone || 'لم يُسجل'}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-teal-50 border border-teal-200 text-teal-800 text-[11px] rounded-xl mb-5 leading-relaxed">
              ✓ سيتم تحديث هذه البيانات فوراً وتطبيقها في كشوفات الحضور وكروت العيادات وحسابات التذاكر.
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={isUpdatingDoctor}
                onClick={handleExecuteSaveDoctor}
                className="flex-1 py-2.5 font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer text-xs shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingDoctor ? (
                  <span>جاري الحفظ...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>نعم، تأكيد وحفظ التعديلات</span>
                  </>
                )}
              </button>
              <button
                disabled={isUpdatingDoctor}
                onClick={() => setIsConfirmSaveDoctorOpen(false)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-xs disabled:opacity-50"
              >
                مراجعة البيانات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: CONFIRM DELETE DOCTOR (تنبيه تأكيد حذف الطبيب)
         ========================================================================= */}
      {doctorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              تنبيه: تأكيد حذف الطبيب من النظام
            </h3>
            <p className="text-xs text-slate-500 text-center leading-relaxed mb-4">
              هل أنت متأكد تماماً من رغبتك في حذف هذا الطبيب؟
            </p>

            {/* Doctor Info Card */}
            <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl text-xs space-y-2 mb-4">
              <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/60">
                <span className="text-slate-600 font-medium">اسم الطبيب:</span>
                <span className="font-bold text-slate-900">
                  {doctorToDelete.title} {doctorToDelete.full_name}
                </span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/60">
                <span className="text-slate-600 font-medium">القسم / العيادة:</span>
                <span className="font-bold text-teal-800">
                  {doctorToDelete.specialty_name || 'العيادة التخصصية'}
                </span>
              </div>
              {doctorToDelete.phone && (
                <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/60">
                  <span className="text-slate-600 font-medium">رقم الهاتف:</span>
                  <span className="font-bold font-mono text-slate-800" dir="ltr">
                    {doctorToDelete.phone}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">رسوم الكشف:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {doctorToDelete.consultation_fee} ج.م (كشف) / {doctorToDelete.followup_fee !== undefined ? doctorToDelete.followup_fee : Math.round(doctorToDelete.consultation_fee / 2)} ج.م (إعادة)
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-xl mb-5 space-y-1">
              <span className="font-bold block">ملاحظات الأمان والتدقيق:</span>
              <p>• سيتم إيقاف تفعيل الطبيب وإخراجه فوراً من كشوفات الحضور اليومية وقوائم حجز التذاكر.</p>
              <p>• السجلات التاريخية لكافة المرضى والزيارات السابقة ستبقى محفوظة ومؤرشفة بأمان.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirmDeleteDoctor}
                className="flex-1 py-2.5 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer text-xs shadow-xs"
              >
                نعم، تأكيد حذف الطبيب
              </button>
              <button
                onClick={() => setDoctorToDelete(null)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-xs"
              >
                إلغاء والتراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: CONFIRM DELETE SPECIALTY
         ========================================================================= */}
      {specialtyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              تأكيد حذف القسم الطبي
            </h3>
            <p className="text-xs text-slate-500 text-center leading-relaxed mb-4">
              هل أنت متأكد من رغبتك في حذف قسم <strong className="text-slate-800 font-bold">«{specialtyToDelete.name}»</strong>؟
            </p>

            {doctors.filter(d => d.specialty_id === specialtyToDelete.id).length > 0 ? (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl mb-5">
                <span className="font-bold block mb-1">تعذر الحذف المباشر:</span>
                يوجد حالياً{' '}
                <strong className="underline">
                  {doctors.filter(d => d.specialty_id === specialtyToDelete.id).length} طبيب مقيد
                </strong>{' '}
                بهذا القسم. يرجى حذف أو نقل الأطباء أولاً قبل حذف القسم حرصاً على سلامة البيانات.
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-xl mb-5">
                لا يوجد أطباء مقيدين بهذا القسم، سيتم الحذف فوراً وأرشفته.
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                disabled={doctors.filter(d => d.specialty_id === specialtyToDelete.id).length > 0}
                onClick={handleConfirmDeleteSpecialty}
                className={`flex-1 py-2.5 font-bold text-white rounded-xl transition-colors text-xs shadow-xs ${
                  doctors.filter(d => d.specialty_id === specialtyToDelete.id).length > 0
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                    : 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                }`}
              >
                تأكيد حذف القسم
              </button>
              <button
                onClick={() => setSpecialtyToDelete(null)}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
