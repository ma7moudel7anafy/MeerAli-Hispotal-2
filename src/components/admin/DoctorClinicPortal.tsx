import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Doctor, PatientVisit, Patient, DiagnosticService, VisitStatus, DoctorDailyAttendance, ClinicalProtocol, QuickCommonDrug } from '../../types';
import { dbService } from '../../lib/databaseService';
import { getTodayDateString } from '../../lib/mockData';
import {
  Stethoscope,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Calendar,
  Search,
  ChevronRight,
  Activity,
  Plus,
  Trash2,
  Pill,
  HeartPulse,
  Save,
  Check,
  X,
  UserCheck,
  History,
  Phone,
  Droplet,
  Info,
  CalendarDays,
  Sparkles,
  XCircle,
  Copy,
  Volume2,
  Table,
  AlignLeft,
  Star,
  BookmarkPlus,
  MessageSquare,
  Zap,
  Ticket,
  FlaskConical,
  Scan,
  Share2,
} from 'lucide-react';
import { PatientNotificationModal } from './PatientNotificationModal';
import { printElement } from '../../lib/printUtils';
import { announcePatientCall } from '../../lib/audioCallUtils';
import { DiagnosticServicePicker } from '../technician/DiagnosticServicePicker';
import { createDiagnosticOrder } from '../../lib/databaseService';

interface MedicineItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export const DoctorClinicPortal: React.FC = () => {
  const { currentUser, role, isAdmin, isDoctor, doctorId } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [diagnosticServices, setDiagnosticServices] = useState<DiagnosticService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'in_consultation' | 'completed' | 'cancelled'>('all');

  // Calling toast notification with chime & Arabic speech
  const [callingToast, setCallingToast] = useState<{ name: string; number: string; room?: string } | null>(null);

  // Active Consultation State
  const [activeVisit, setActiveVisit] = useState<PatientVisit | null>(null);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [patientHistoryVisits, setPatientHistoryVisits] = useState<PatientVisit[]>([]);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isSavingDiagnosis, setIsSavingDiagnosis] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // WhatsApp Prescription Notification Modal State (Doctor: Prescription only)
  const [notificationModalVisit, setNotificationModalVisit] = useState<PatientVisit | null>(null);

  // Unconfirmed patient arrival confirmation modal (Smart Hybrid Flow)
  const [unconfirmedPromptVisit, setUnconfirmedPromptVisit] = useState<PatientVisit | null>(null);
  const [isConfirmingAttendance, setIsConfirmingAttendance] = useState(false);

  // Clinical Form Fields
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedDiagnosticServiceIds, setSelectedDiagnosticServiceIds] = useState<string[]>([]);
  const [customTests, setCustomTests] = useState('');
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [rxViewMode, setRxViewMode] = useState<'table' | 'text'>('table');
  const [freeTextRx, setFreeTextRx] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [revisitRecommended, setRevisitRecommended] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Vital Signs State
  const [bloodPressure, setBloodPressure] = useState('');
  const [pulse, setPulse] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [randomBloodSugar, setRandomBloodSugar] = useState('');
  const [oxygenSat, setOxygenSat] = useState('');
  const [showVitalSigns, setShowVitalSigns] = useState(true);

  // Dynamic Specialty & Doctor Clinical Presets
  const [clinicalProtocols, setClinicalProtocols] = useState<ClinicalProtocol[]>([]);
  const [quickCommonDrugs, setQuickCommonDrugs] = useState<QuickCommonDrug[]>([]);
  const [customDiagnosesList, setCustomDiagnosesList] = useState<string[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);

  // Modal to save current prescription as a doctor favorite protocol
  const [isSaveFavoriteModalOpen, setIsSaveFavoriteModalOpen] = useState(false);
  const [newFavoriteName, setNewFavoriteName] = useState('');
  const [newFavoriteLatin, setNewFavoriteLatin] = useState('');

  // Load Specialty Presets
  const loadSpecialtyPresets = async (specId?: string, docId?: string) => {
    setIsLoadingPresets(true);
    try {
      const data = await dbService.getSpecialtyClinicalPresets(specId, docId);
      setClinicalProtocols(data.protocols);
      setQuickCommonDrugs(data.quickDrugs);
      setCustomDiagnosesList(data.diagnoses);
    } catch (err) {
      console.error('Failed to load specialty presets:', err);
    } finally {
      setIsLoadingPresets(false);
    }
  };

  // Handler to register a new diagnosis into the dropdown list permanently for this specialty
  const handleSaveNewDiagnosisToList = async () => {
    const trimmed = diagnosis.trim();
    if (!trimmed) return;
    if (customDiagnosesList.includes(trimmed)) {
      setSuccessToast('التشخيص موجود بالفعل في القائمة المنسدلة');
      setTimeout(() => setSuccessToast(null), 2500);
      return;
    }
    const updated = [...customDiagnosesList, trimmed];
    setCustomDiagnosesList(updated);
    const selectedDoc = doctors.find(d => d.id === selectedDoctorId);
    const specId = activeVisit?.specialty_id || selectedDoc?.specialty_id;
    if (specId) {
      await dbService.saveSpecialtyClinicalPresets(specId, { diagnoses: updated }, currentUser?.full_name || undefined);
    }
    setSuccessToast(`تم حفظ تشخيص (${trimmed}) في قائمة تخصص (${selectedDoc?.specialty_name || 'القسم'}) بنجاح`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Save current prescription as a doctor's personal favorite protocol
  const handleSaveCurrentAsFavoriteProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFavoriteName.trim()) {
      alert('يرجى إدخال اسم للبروتوكول العلاجي');
      return;
    }

    const validMeds = medicines.filter(m => m.name.trim());
    let medsToSave = validMeds.map(m => ({
      name: m.name.trim(),
      dosage: [m.dosage, m.frequency, m.duration, m.instructions].filter(Boolean).join(' - '),
    }));

    if (medsToSave.length === 0 && freeTextRx.trim()) {
      const lines = freeTextRx.split('\n').filter(Boolean);
      medsToSave = lines.map(line => {
        const cleanLine = line.replace(/^\d+[\.\-\)]\s*/, '').trim();
        const match = cleanLine.match(/^(.*?)\s*[\(\-–]\s*(.*?)\)?$/);
        return {
          name: match ? match[1].trim() : cleanLine,
          dosage: match ? match[2].replace(/\)$/, '').trim() : '',
        };
      });
    }

    if (medsToSave.length === 0) {
      alert('الروشتة فارغة! يرجى إضافة أدوية بالروشتة أولاً لحفظها كبروتوكول.');
      return;
    }

    const selectedDoc = doctors.find(d => d.id === selectedDoctorId);
    const specId = activeVisit?.specialty_id || selectedDoc?.specialty_id;

    try {
      await dbService.saveDoctorPersonalProtocol({
        doctor_id: selectedDoctorId,
        doctor_name: selectedDoc?.full_name,
        specialty_id: specId,
        specialty_name: selectedDoc?.specialty_name,
        name: newFavoriteName.trim(),
        latinName: newFavoriteLatin.trim() || undefined,
        diagnosis: diagnosis.trim() || newFavoriteName.trim(),
        notes: doctorNotes.trim() || undefined,
        medicines: medsToSave,
      }, currentUser?.full_name || undefined);

      setIsSaveFavoriteModalOpen(false);
      setNewFavoriteName('');
      setNewFavoriteLatin('');
      setSuccessToast(`تم حفظ بروتوكول (${newFavoriteName.trim()}) في مفضلاتك الشخصية بنجاح ⭐`);
      setTimeout(() => setSuccessToast(null), 3500);

      await loadSpecialtyPresets(specId, selectedDoctorId);
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء حفظ البروتوكول');
    }
  };

  // Load Initial Data
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [docs, diagList, pats] = await Promise.all([
        dbService.getDoctors(),
        dbService.getDiagnosticServices(),
        dbService.getPatients(),
      ]);
      setDoctors(docs);
      setDiagnosticServices(diagList);
      setPatients(pats);

      // Determine default doctor
      let targetDocId = '';
      if (isDoctor && doctorId) {
        targetDocId = doctorId;
      } else if (docs.length > 0) {
        targetDocId = docs[0].id;
      }
      setSelectedDoctorId(targetDocId);
    } catch (e) {
      console.error('Error loading initial doctor portal data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [isDoctor, doctorId]);

  // Load visits whenever selectedDoctorId changes
  // Doctor's Attendance State for Today
  const [attendance, setAttendance] = useState<DoctorDailyAttendance | null>(null);

  // Load visits and attendance whenever selectedDoctorId changes
  const loadDoctorVisits = async () => {
    if (!selectedDoctorId) return;
    try {
      const docVisits = await dbService.getDoctorVisits(selectedDoctorId);
      setVisits(docVisits);
    } catch (e) {
      console.error('Error loading doctor visits:', e);
    }
  };

  const loadDoctorAttendance = async () => {
    if (!selectedDoctorId) return;
    try {
      const attList = await dbService.getInternalDoctorAttendance(getTodayDateString());
      const match = attList.find(a => a.doctor_id === selectedDoctorId);
      setAttendance(match || null);
    } catch (e) {
      console.error('Error loading doctor attendance:', e);
    }
  };

  useEffect(() => {
    loadDoctorVisits();
    loadDoctorAttendance();
    const currentDoc = doctors.find(d => d.id === selectedDoctorId);
    loadSpecialtyPresets(currentDoc?.specialty_id, selectedDoctorId);

    const handleAttendanceUpdate = (e: any) => {
      if (!e.detail?.doctorId || e.detail.doctorId === selectedDoctorId) {
        loadDoctorAttendance();
      }
    };

    // Live update when reception registers or updates patient visits
    const handleVisitUpdate = (e?: any) => {
      loadDoctorVisits();
      const updatedVisitId = e?.detail?.visitId || e?.detail?.visit?.id;
      const updatedStatus = e?.detail?.status || e?.detail?.visit?.status;
      if (activeVisit && updatedVisitId === activeVisit.id && updatedStatus === 'cancelled') {
        setIsConsultationModalOpen(false);
        setActiveVisit(null);
        const reason = e?.detail?.cancellationReason || e?.detail?.visit?.cancellation_reason || '';
        alert(`تنبيه من الاستقبال: تم إلغاء حجز المريض (${activeVisit.patient_name})${reason ? ` بسبب: ${reason}` : ''}. تم إغلاق جلسة الكشف.`);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hms_patient_visits') {
        loadDoctorVisits();
      }
    };

    window.addEventListener('hospital-attendance-updated', handleAttendanceUpdate);
    window.addEventListener('hospital-visit-updated', handleVisitUpdate);
    window.addEventListener('storage', handleStorage);

    // Multi-device polling heartbeat
    const pollInterval = setInterval(() => {
      loadDoctorVisits();
      loadDoctorAttendance();
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('hospital-attendance-updated', handleAttendanceUpdate);
      window.removeEventListener('hospital-visit-updated', handleVisitUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [selectedDoctorId]);

  const currentDoctor = doctors.find(d => d.id === selectedDoctorId);

  // Filtered Visits for Today's Queue
  const filteredVisits = visits.filter(v => {
    const matchesSearch =
      !searchQuery ||
      v.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.patient_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.patient_phone?.includes(searchQuery);

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'waiting') return v.status === 'registered' || v.status === 'attended';
    if (statusFilter === 'in_consultation') return v.status === 'in_consultation';
    if (statusFilter === 'completed') return v.status === 'completed';
    if (statusFilter === 'cancelled') return v.status === 'cancelled';
    return true;
  });

  // Smart Prioritization for Doctor's Queue:
  // 1. in_consultation (currently active in doctor's office)
  // 2. attended (confirmed arrived in waiting hall - READY to enter)
  // 3. registered (booked ticket, but reception has not confirmed presence yet)
  // 4. completed (finished examination)
  // 5. cancelled (cancelled tickets at bottom)
  const getStatusPriority = (status: VisitStatus) => {
    switch (status) {
      case 'in_consultation': return 1;
      case 'attended': return 2;
      case 'registered': return 3;
      case 'completed': return 4;
      case 'cancelled': return 5;
      default: return 6;
    }
  };

  const getPatientPriorityRank = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 0; // Emergency/Urgent cases jump to the front of queue!
      case 'special_needs': return 1; // People of determination
      case 'elderly': return 2; // Elderly patients (60+)
      default: return 3; // Normal
    }
  };

  const sortedFilteredVisits = [...filteredVisits].sort((a, b) => {
    const pA = getStatusPriority(a.status);
    const pB = getStatusPriority(b.status);
    if (pA !== pB) return pA - pB;

    // For waiting or active patients, prioritize urgent cases first
    if (a.status !== 'completed' && a.status !== 'cancelled') {
      const prioA = getPatientPriorityRank(a.priority);
      const prioB = getPatientPriorityRank(b.priority);
      if (prioA !== prioB) return prioA - prioB;
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // Next ready patient to call in queue (attended in hall first, then registered)
  const nextWaitingPatient = sortedFilteredVisits.find(
    v => v.status === 'attended'
  ) || sortedFilteredVisits.find(v => v.status === 'registered');

  // Queue Statistics Breakdown
  const attendedCount = visits.filter(v => v.status === 'attended').length;
  const registeredCount = visits.filter(v => v.status === 'registered').length;
  const waitingCount = attendedCount + registeredCount;
  const inConsultCount = visits.filter(v => v.status === 'in_consultation').length;
  const completedCount = visits.filter(v => v.status === 'completed').length;
  const cancelledCount = visits.filter(v => v.status === 'cancelled').length;

  // Open Consultation Workspace for a specific visit
  const handleOpenConsultation = async (visit: PatientVisit, forceStartUnconfirmed: boolean = false) => {
    // Strict Guard: Never allow starting consultation or calling a cancelled ticket
    if (visit.status === 'cancelled') {
      alert(`عذراً، هذا الحجز ملغي من قِبل موظف الاستقبال${visit.cancellation_reason ? ` (سبب الإلغاء: ${visit.cancellation_reason})` : ''}. لا يمكن نداء الحالة أو بدء الكشف الطبي.`);
      return;
    }

    // Smart Guard (Option 2): If patient hasn't confirmed arrival at reception yet, prompt confirmation
    if (visit.status === 'registered' && !forceStartUnconfirmed) {
      setUnconfirmedPromptVisit(visit);
      return;
    }

    setActiveVisit(visit);
    const pat = patients.find(p => p.id === visit.patient_id);
    setActivePatient(pat || null);

    const currentDoc = doctors.find(d => d.id === selectedDoctorId);
    loadSpecialtyPresets(visit.specialty_id || currentDoc?.specialty_id, selectedDoctorId);

    // Fetch patient history visits
    try {
      const allPatientVisits = await dbService.getVisits(visit.patient_id);
      // Filter out the current visit from previous history
      setPatientHistoryVisits(allPatientVisits.filter(v => v.id !== visit.id));
    } catch {
      setPatientHistoryVisits([]);
    }

    // Initialize consultation fields
    setSymptoms(visit.symptoms || '');
    setDiagnosis(visit.diagnosis || '');
    setDoctorNotes(visit.doctor_notes || '');
    setRevisitRecommended(visit.revisit_recommended ?? false);
    setFollowUpDate(visit.follow_up_date || '');

    // Initialize vital signs
    setBloodPressure(visit.vital_signs?.blood_pressure || '');
    setPulse(visit.vital_signs?.pulse || '');
    setTemperature(visit.vital_signs?.temperature || '');
    setWeight(visit.vital_signs?.weight || '');
    setRandomBloodSugar(visit.vital_signs?.random_blood_sugar || '');
    setOxygenSat(visit.vital_signs?.oxygen_saturation || '');

    // Parse existing prescription into medicines list and freeTextRx
    if (visit.prescription) {
      setFreeTextRx(visit.prescription);
      const lines = visit.prescription.split('\n').filter(Boolean);
      const items: MedicineItem[] = lines.map((line, idx) => {
        const cleanLine = line.replace(/^\d+[\.\-\)]\s*/, '').trim();
        const match = cleanLine.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          return {
            id: `med-${Date.now()}-${idx}`,
            name: match[1].trim(),
            dosage: match[2].trim(),
            frequency: '',
            duration: '',
            instructions: '',
          };
        }
        return {
          id: `med-${Date.now()}-${idx}`,
          name: cleanLine,
          dosage: '',
          frequency: '',
          duration: '',
          instructions: '',
        };
      });
      setMedicines(items.length > 0 ? items : [{ id: 'med-0', name: '', dosage: 'قرص 3 مرات بعد الأكل لمدة 5 أيام', frequency: '', duration: '', instructions: '' }]);
    } else {
      setFreeTextRx('');
      setMedicines([{ id: 'med-0', name: '', dosage: 'قرص 3 مرات بعد الأكل لمدة 5 أيام', frequency: '', duration: '', instructions: '' }]);
    }
    setRxViewMode('table');

    // Parse existing tests
    if (visit.tests_requested) {
      setCustomTests(visit.tests_requested);
      const matchedIds = diagnosticServices
        .filter(s => visit.tests_requested?.toLowerCase().includes(s.name.toLowerCase()))
        .map(s => s.id);
      setSelectedDiagnosticServiceIds(matchedIds);
    } else {
      setCustomTests('');
      setSelectedDiagnosticServiceIds([]);
    }
    setSelectedTests([]);

    // If visit was just registered or attended, move to in_consultation
    if (visit.status === 'registered' || visit.status === 'attended') {
      try {
        await dbService.updateVisitStatus(visit.id, 'in_consultation', undefined, currentUser || undefined);
        loadDoctorVisits();
      } catch (err) {
        console.error('Failed to update status to in_consultation:', err);
      }
    }

    setIsConsultationModalOpen(true);
  };

  // Call patient with real hospital audio chime & Arabic speech
  const handleCallPatient = (visit: PatientVisit) => {
    announcePatientCall({
      patientName: visit.patient_name || 'المريض',
      ticketNumber: visit.ticket_number || visit.patient_number || 'A-01',
      departmentName: `عيادة ${currentDoctor?.specialty_name || 'العيادة الخارجية'}`,
      roomName: `عيادة د/ ${currentDoctor?.full_name || 'الطبيب'}`,
    });
    setCallingToast({
      name: visit.patient_name || 'المريض',
      number: visit.ticket_number || visit.patient_number || 'A-01',
      room: `عيادة د/ ${currentDoctor?.full_name || 'الطبيب'}`,
    });
    setTimeout(() => setCallingToast(null), 4500);
  };

  // Direct 1-Click WhatsApp Prescription Sender
  const handleDirectWhatsAppPrescription = (visit: PatientVisit) => {
    const rawPhone = (visit.patient_phone || '').trim().replace(/[^0-9]/g, '');
    if (!rawPhone) {
      alert('لا يوجد رقم هاتف مسجل لهذا المريض لإرسال الروشتة عبر الواتساب.');
      return;
    }
    const cleanPhone = rawPhone.startsWith('0') ? '20' + rawPhone.substring(1) : rawPhone.startsWith('20') ? rawPhone : '20' + rawPhone;

    const message = `مستشفى ميت علي التخصصي 🏥\nالروشتة والتقرير الطبي للكشف 📋\n\n• المريض: ${visit.patient_name || 'غير محدد'}\n• الطبيب: ${visit.doctor_name || currentDoctor?.full_name || 'طبيب العيادة'} (${visit.specialty_name || currentDoctor?.specialty_name || 'العيادة'})\n• التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n\n🔹 التشخيص الطبي:\n${visit.diagnosis || 'فحص ومتابعة طبية'}\n\n💊 العلاج والوصفة الطبية (Rx):\n${visit.prescription || 'حسب إرشادات الطبيب'}${visit.tests_requested ? `\n\n🔬 الفحوصات والتحاليل المطلوبة:\n${visit.tests_requested}` : ''}${visit.doctor_notes ? `\n\n💡 توصيات وإرشادات الطبيب:\n${visit.doctor_notes}` : ''}${visit.follow_up_date ? `\n\n📅 موعد الاستشارة القادمة: ${visit.follow_up_date}` : ''}\n\nنتمنى لكم دوام الصحة والعافية 🌸`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Confirm arrival for an unconfirmed patient and immediately begin consultation
  const handleConfirmArrivalAndStart = async (visit: PatientVisit) => {
    setIsConfirmingAttendance(true);
    try {
      // 1. Explicitly mark as attended first to update reception system and records
      await dbService.updateVisitStatus(visit.id, 'attended', undefined, currentUser || undefined);
      // 2. Open consultation and move to in_consultation
      await handleOpenConsultation({ ...visit, status: 'attended' }, true);
      setUnconfirmedPromptVisit(null);
      setSuccessToast(`تم تأكيد حضور المريض (${visit.patient_name}) وبدء الكشف الطبي بنجاح`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء تأكيد حضور المريض.');
    } finally {
      setIsConfirmingAttendance(false);
    }
  };

  // Medicine items handlers
  const handleAddMedicine = () => {
    setMedicines(prev => [
      ...prev,
      {
        id: `med-${Date.now()}`,
        name: '',
        dosage: 'قرص 3 مرات يومياً بعد الأكل لمدة 5 أيام',
        frequency: '',
        duration: '',
        instructions: '',
      },
    ]);
  };

  const handleRemoveMedicine = (id: string) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
  };

  const handleUpdateMedicine = (id: string, field: keyof MedicineItem, value: string) => {
    setMedicines(prev => prev.map(m => (m.id === id ? { ...m, [field]: value } : m)));
  };

  // Convert Table Mode -> Free Text Mode
  const handleSwitchToTextMode = () => {
    const validMeds = medicines.filter(m => m.name.trim());
    if (validMeds.length > 0) {
      const compiled = validMeds
        .map((m, idx) => {
          const details = [m.dosage, m.frequency, m.duration, m.instructions].filter(Boolean).join(' - ');
          return `${idx + 1}. ${m.name.trim()}${details ? ` (${details})` : ''}`;
        })
        .join('\n');
      setFreeTextRx(compiled);
    }
    setRxViewMode('text');
  };

  // Convert Free Text Mode -> Table Mode
  const handleSwitchToTableMode = () => {
    if (freeTextRx.trim()) {
      const lines = freeTextRx.split('\n').map(l => l.trim()).filter(Boolean);
      const parsed: MedicineItem[] = lines.map((line, idx) => {
        const cleanLine = line.replace(/^\d+[\.\-\)]\s*/, '').trim();
        const match = cleanLine.match(/^(.*?)\s*[\(\-–]\s*(.*?)\)?$/);
        if (match) {
          return {
            id: `med-${Date.now()}-${idx}`,
            name: match[1].trim(),
            dosage: match[2].replace(/\)$/, '').trim(),
            frequency: '',
            duration: '',
            instructions: '',
          };
        }
        return {
          id: `med-${Date.now()}-${idx}`,
          name: cleanLine,
          dosage: '',
          frequency: '',
          duration: '',
          instructions: '',
        };
      });
      if (parsed.length > 0) {
        setMedicines(parsed);
      }
    }
    setRxViewMode('table');
  };

  // Save Diagnosis & Complete Consultation
  const handleSaveDiagnosis = async (markCompleted: boolean = true) => {
    if (!activeVisit) return;
    if (!diagnosis.trim()) {
      alert('يرجى كتابة التشخيص الطبي للحالة أولاً.');
      return;
    }

    setIsSavingDiagnosis(true);
    try {
      // الرقابة الصارمة: إذا كان المريض لم يسدد الرسوم بعد، يمنع إتمام الكشف إلا باعتماد إعفاء خيري أو توجيهه للخزينة
      if (markCompleted && activeVisit.payment_status === 'unpaid') {
        const confirmWaive = window.confirm(
          `⚠️ تنبيه مالي وإداري هام:\nالمريض (${activeVisit.patient_name}) لم يسدد رسوم الكشف (${activeVisit.fee_amount || 40} ج) بالاستقبال بعد (حجز هاتف/واتساب معلق السداد)!\n\nهل ترغب في اعتماد «إعفاء خيري» للحالة الآن لإتمام الكشف، أم توجيه المريض للخزينة للسداد؟\n\n• اضغط (OK / موافق) لاعتماد إعفاء خيري فوراً وإكمال الكشف.\n• اضغط (Cancel / إلغاء) لحفظ الكشف كمسودة وتوجيه المريض لشباك الاستقبال.`
        );
        if (confirmWaive) {
          await dbService.confirmVisitPayment(
            activeVisit.id,
            {
              payment_method: 'charity',
              payment_notes: 'إعفاء خيري معتمد من طبيب العيادة أثناء إتمام الكشف',
              markAttended: true,
            },
            currentUser || undefined
          );
        } else {
          // حفظ الكشف كمسودة دون إغلاقه
          markCompleted = false;
        }
      }

      // Compile prescription text according to current view mode
      let compiledRx = '';
      if (rxViewMode === 'text') {
        compiledRx = freeTextRx.trim();
        // Also parse into medicines for internal structure
        if (compiledRx) {
          const lines = compiledRx.split('\n').map(l => l.trim()).filter(Boolean);
          const parsed = lines.map((l, idx) => {
            const clean = l.replace(/^\d+[\.\-\)]\s*/, '').trim();
            const match = clean.match(/^(.*?)\s*[\(\-–]\s*(.*?)\)?$/);
            return {
              id: `med-${Date.now()}-${idx}`,
              name: match ? match[1].trim() : clean,
              dosage: match ? match[2].replace(/\)$/, '').trim() : '',
              frequency: '',
              duration: '',
              instructions: '',
            };
          });
          setMedicines(parsed);
        }
      } else {
        const validMeds = medicines.filter(m => m.name.trim());
        compiledRx = validMeds
          .map((m, idx) => {
            let line = `${idx + 1}. ${m.name.trim()}`;
            const details = [m.dosage, m.frequency, m.duration, m.instructions].filter(Boolean).join(' - ');
            if (details) line += ` (${details})`;
            return line;
          })
          .join('\n');
        setFreeTextRx(compiledRx);
      }

      // Compile tests from selected diagnostic services & custom input
      const pickedServices = diagnosticServices.filter(s => selectedDiagnosticServiceIds.includes(s.id));
      const pickedServiceNames = pickedServices.map(s => s.name);
      const allTests = Array.from(new Set([...pickedServiceNames, ...selectedTests, customTests.trim()])).filter(Boolean).join(' + ');

      // Automatically create Lab and Radiology orders for technician portals
      if (pickedServices.length > 0) {
        const labServices = pickedServices.filter(s => s.type === 'lab' || s.service_type === 'lab');
        const radServices = pickedServices.filter(s => s.type === 'radiology' || s.service_type === 'radiology');

        if (labServices.length > 0) {
          try {
            createDiagnosticOrder({
              department: 'lab',
              patient_id: activeVisit.patient_id,
              patient_name: activeVisit.patient_name,
              patient_number: activeVisit.patient_number,
              patient_phone: activeVisit.patient_phone,
              doctor_name: currentDoctor?.full_name || activeVisit.doctor_name,
              specialty_name: currentDoctor?.specialty_name || activeVisit.specialty_name,
              test_names: labServices.map(s => s.name).join(' + '),
              priority: activeVisit.priority || 'normal',
              status: 'waiting',
              fee_amount: labServices.reduce((sum, s) => sum + (s.price || 0), 0) || 50,
              payment_status: 'paid',
            });
          } catch (e) {
            console.error('Failed to create lab order:', e);
          }
        }

        if (radServices.length > 0) {
          try {
            createDiagnosticOrder({
              department: 'radiology',
              patient_id: activeVisit.patient_id,
              patient_name: activeVisit.patient_name,
              patient_number: activeVisit.patient_number,
              patient_phone: activeVisit.patient_phone,
              doctor_name: currentDoctor?.full_name || activeVisit.doctor_name,
              specialty_name: currentDoctor?.specialty_name || activeVisit.specialty_name,
              test_names: radServices.map(s => s.name).join(' + '),
              priority: activeVisit.priority || 'normal',
              status: 'waiting',
              fee_amount: radServices.reduce((sum, s) => sum + (s.price || 0), 0) || 60,
              payment_status: 'paid',
            });
          } catch (e) {
            console.error('Failed to create radiology order:', e);
          }
        }
      }

      const vitals = (bloodPressure || pulse || temperature || weight || randomBloodSugar || oxygenSat) ? {
        blood_pressure: bloodPressure.trim(),
        pulse: pulse.trim(),
        temperature: temperature.trim(),
        weight: weight.trim(),
        random_blood_sugar: randomBloodSugar.trim(),
        oxygen_saturation: oxygenSat.trim(),
      } : undefined;

      await dbService.saveVisitDiagnosis(
        activeVisit.id,
        {
          symptoms: symptoms.trim(),
          diagnosis: diagnosis.trim(),
          prescription: compiledRx,
          tests_requested: allTests,
          doctor_notes: doctorNotes.trim(),
          vital_signs: vitals,
          revisit_recommended: revisitRecommended,
          follow_up_date: revisitRecommended ? followUpDate : undefined,
          status: markCompleted ? 'completed' : 'in_consultation',
        },
        currentUser || undefined
      );

      setSuccessToast(markCompleted ? 'تم حفظ التشخيص وإكمال الكشف بنجاح!' : 'تم حفظ مسودة الكشف الطبي.');
      setTimeout(() => setSuccessToast(null), 4000);

      await loadDoctorVisits();
      if (markCompleted) {
        setIsConsultationModalOpen(false);
      }
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء حفظ التشخيص.');
    } finally {
      setIsSavingDiagnosis(false);
    }
  };

  // Calculate patient age
  const getPatientAge = (birthDate?: string) => {
    if (!birthDate) return 'غير محدد';
    const birth = new Date(birthDate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      years--;
    }
    return `${years} سنة`;
  };

  // Copy previous prescription into current consultation
  const handleCopyPreviousPrescription = (prescriptionText?: string) => {
    if (!prescriptionText) return;
    const lines = prescriptionText.split('\n').filter(Boolean);
    const parsedItems: MedicineItem[] = lines.map((line, idx) => {
      const cleanLine = line.replace(/^\d+[\.\-\)]\s*/, '').trim();
      const match = cleanLine.match(/^(.*?)\s*[\(\-–]\s*(.*?)\)?$/);
      if (match) {
        return {
          id: `med-${Date.now()}-${idx}`,
          name: match[1].trim(),
          dosage: match[2].replace(/\)$/, '').trim(),
          frequency: '',
          duration: '',
          instructions: '',
        };
      }
      return {
        id: `med-${Date.now()}-${idx}`,
        name: cleanLine,
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      };
    });

    if (parsedItems.length > 0) {
      setMedicines(parsedItems);
      setFreeTextRx(prescriptionText);
      setSuccessToast(`تم نسخ ${parsedItems.length} أدوية من الزيارة السابقة إلى الروشتة الحالية بنجاح`);
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  // Apply Clinical Protocol (قالب علاجي جاهز)
  const handleApplyProtocol = (proto: typeof clinicalProtocols[0]) => {
    if (!diagnosis.trim()) {
      setDiagnosis(proto.diagnosis);
    }
    if (!doctorNotes.trim() && proto.notes) {
      setDoctorNotes(proto.notes);
    }
    const newItems: MedicineItem[] = proto.medicines.map((m, idx) => {
      const combinedDose = [m.dosage, m.frequency, m.duration, m.instructions].filter(Boolean).join(' - ');
      return {
        id: `med-${Date.now()}-${idx}`,
        name: m.name,
        dosage: combinedDose,
        frequency: '',
        duration: '',
        instructions: '',
      };
    });
    setMedicines(newItems);
    
    // Sync free text representation
    const textLines = newItems.map((m, idx) => `${idx + 1}. ${m.name} (${m.dosage})`).join('\n');
    setFreeTextRx(textLines);

    setSuccessToast(`تم تطبيق بروتوكول (${proto.name}) وإدراج الأدوية والتعليمات بنجاح`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Add Quick Common Drug
  const handleAddQuickDrug = (drug: typeof quickCommonDrugs[0]) => {
    const combinedDose = [drug.dosage, drug.frequency, drug.duration].filter(Boolean).join(' - ');
    const newItem: MedicineItem = {
      id: `med-${Date.now()}`,
      name: drug.name,
      dosage: combinedDose,
      frequency: '',
      duration: '',
      instructions: '',
    };
    setMedicines(prev => {
      const filtered = prev.filter(m => m.name.trim() !== '');
      return [...filtered, newItem];
    });

    // Also append to free text
    setFreeTextRx(prev => {
      const trimmed = prev.trim();
      const count = trimmed ? trimmed.split('\n').filter(Boolean).length + 1 : 1;
      const newLine = `${count}. ${drug.name} (${combinedDose})`;
      return trimmed ? `${trimmed}\n${newLine}` : newLine;
    });

    setSuccessToast(`تمت إضافة (${drug.name}) للروشتة`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  // Quick preset follow-up date calculation
  const handleSetFollowUpDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFollowUpDate(d.toISOString().split('T')[0]);
  };

  // Save consultation and trigger instant print
  const handleSaveAndPrintImmediately = async () => {
    if (!activeVisit) return;
    if (!diagnosis.trim()) {
      alert('يرجى كتابة التشخيص الطبي للحالة أولاً قبل الحفظ والطباعة.');
      return;
    }
    await handleSaveDiagnosis(true);
    setIsPrintModalOpen(true);
    setTimeout(() => {
      printElement('hospital-printable-prescription', 'روشتة طبية - مستشفى ميت علي');
    }, 450);
  };

  // Save consultation and immediately open WhatsApp modal for the patient
  const handleSaveAndSendWhatsApp = async () => {
    if (!activeVisit) return;
    if (!diagnosis.trim()) {
      alert('يرجى كتابة التشخيص الطبي للحالة أولاً قبل إرسال الروشتة عبر الواتساب.');
      return;
    }

    const compiledRx = medicines.length > 0
      ? medicines
          .filter(m => m.name.trim())
          .map((m, idx) => {
            let line = `${idx + 1}. ${m.name.trim()}`;
            const details = [m.dosage, m.frequency, m.duration, m.instructions].filter(Boolean).join(' - ');
            if (details) line += ` (${details})`;
            return line;
          })
          .join('\n')
      : freeTextRx.trim();

    const allTests = [...selectedTests, customTests.trim()].filter(Boolean).join(' + ');

    const snapshotVisit: PatientVisit = {
      ...activeVisit,
      diagnosis: diagnosis.trim(),
      prescription: compiledRx,
      tests_requested: allTests,
      doctor_notes: doctorNotes.trim(),
      follow_up_date: revisitRecommended ? followUpDate : undefined,
      status: 'completed',
    };

    await handleSaveDiagnosis(true);
    setNotificationModalVisit(snapshotVisit);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-500 animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Floating Audio Calling Notification Banner */}
      {callingToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 border border-blue-400 animate-bounce">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <Volume2 className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-blue-100 flex items-center gap-1.5">
              <span>جاري النداء الصوتي بصالة الانتظار</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
            </div>
            <div className="text-sm font-extrabold text-white">
              نداء: {callingToast.name} • رقم الدور: ({callingToast.number})
            </div>
          </div>
        </div>
      )}

      {/* Top Banner / Doctor Clinic Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {currentDoctor?.full_name || 'عيادة الطبيب'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                  {currentDoctor?.specialty_name || 'العيادة الخارجية'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                  {currentDoctor?.title}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                <span>طابور كشوفات اليوم: {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                {currentDoctor?.phone && (
                  <span className="text-slate-400">• هاتف الطبيب: {currentDoctor.phone}</span>
                )}
              </p>
            </div>
          </div>

          {/* If Admin, allow switching doctor view */}
          {isAdmin && (
            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="text-xs font-medium text-slate-600 whitespace-nowrap">معاينة عيادة:</span>
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:border-blue-600 cursor-pointer font-medium"
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.specialty_name})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Live Attendance Status Strip with Quick Confirmation */}
        <div className="mt-4 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 border-slate-200">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-slate-700">حالة حضور العيادة اليوم:</span>
            {attendance?.status === 'present' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                حاضر بالعيادة الآن (مؤكد على شاشات الاستقبال والجمهور)
              </span>
            ) : attendance?.status === 'delayed' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                متأخر (متوقع وصولك: {attendance.delay_expected_time || '11:00'})
              </span>
            ) : attendance?.status === 'apologized' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                معتذر عن حضور عيادة اليوم
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                لم يتم تأكيد الحضور بعد لليوم
              </span>
            )}

            {attendance?.updated_by_name && attendance.status !== 'unconfirmed' && (
              <span className="text-[11px] text-slate-500 hidden md:inline">
                ({attendance.updated_by_name})
              </span>
            )}
          </div>

          {attendance?.status !== 'present' && (
            <button
              onClick={async () => {
                if (!selectedDoctorId) return;
                await dbService.updateDoctorAttendance(
                  selectedDoctorId,
                  getTodayDateString(),
                  'present',
                  null,
                  'حضر الطبيب بالعيادة',
                  currentUser || undefined
                );
                await loadDoctorAttendance();
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>تأكيد حضوري الآن بالعيادة</span>
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-800">في الانتظار</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-amber-900">{waitingCount}</span>
              <span className="text-[11px] text-amber-700">مريض</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-800 font-semibold border-t border-amber-200/60 pt-1">
              <span className="text-emerald-700 font-bold">{attendedCount} حاضر بالصالة</span>
              <span>•</span>
              <span className="text-amber-700">{registeredCount} لم يؤكد وصوله</span>
            </div>
          </div>

          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-800">داخل الكشف حالياً</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-blue-900">{inConsultCount}</span>
              <span className="text-[11px] text-blue-700">مريض</span>
            </div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800">تم الكشف والروشتة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-emerald-900">{completedCount}</span>
              <span className="text-[11px] text-emerald-700">مريض</span>
            </div>
          </div>

          <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-800">ملغي من الاستقبال</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-rose-900">{cancelledCount}</span>
              <span className="text-[11px] text-rose-700">حجز</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">إجمالي تذاكر اليوم</span>
              <Users className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{visits.length}</span>
              <span className="text-[11px] text-slate-500">تذكرة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Patients Queue Workspace */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو رقم الملف أو هاتف المريض..."
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              الكل ({visits.length})
            </button>
            <button
              onClick={() => setStatusFilter('waiting')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                statusFilter === 'waiting'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50'
              }`}
            >
              في الانتظار ({waitingCount})
            </button>
            <button
              onClick={() => setStatusFilter('in_consultation')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                statusFilter === 'in_consultation'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50'
              }`}
            >
              بالكشف الآن ({inConsultCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50'
              }`}
            >
              مكتمل ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'cancelled'
                  ? 'bg-rose-700 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-rose-50'
              }`}
            >
              <span>ملغي ({cancelledCount})</span>
            </button>
          </div>
        </div>

        {/* Priority Queue Informational Notice Banner & Quick Call */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-b border-slate-200 text-xs flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-slate-700 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
              نظام الطابور الذكي:
            </span>
            <span className="text-[11px] text-slate-600">
              يتم تقديم المرضى الحاضرين بصالة الانتظار أولاً في الطابور لتسهيل ندائهم مباشرة.
            </span>
            <div className="hidden lg:flex items-center gap-2 text-[11px] mr-2">
              <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                أخضر = حاضر وجاهز
              </span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-1 text-amber-800 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                برتقالي = يتطلب تأكيد
              </span>
            </div>
          </div>

          {/* Quick Next Patient Call Button */}
          <button
            type="button"
            onClick={() => {
              if (nextWaitingPatient) {
                handleCallPatient(nextWaitingPatient);
                handleOpenConsultation(nextWaitingPatient);
              }
            }}
            disabled={!nextWaitingPatient}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs shrink-0 ${
              nextWaitingPatient
                ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer shadow-emerald-600/20'
                : 'bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title={nextWaitingPatient ? `نداء المريض التالي بالصوت: ${nextWaitingPatient.patient_name}` : 'لا يوجد مرضى بالانتظار حالياً'}
          >
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>
              {nextWaitingPatient
                ? `نداء المريض التالي (${nextWaitingPatient.patient_name})`
                : 'لا يوجد مرضى بالانتظار'}
            </span>
          </button>
        </div>

        {/* Patients Queue Table */}
        {sortedFilteredVisits.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">لا يوجد مرضى في هذه القائمة حالياً</h4>
            <p className="text-xs text-slate-500 mt-1">
              عند حجز أي تذكرة لهذا الطبيب من شاشة الاستقبال، ستظهر فورياً في هذا الطابور.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedFilteredVisits.map((visit, index) => {
              const pat = patients.find(p => p.id === visit.patient_id);
              const isAttended = visit.status === 'attended';
              const isRegistered = visit.status === 'registered';
              const isInConsultation = visit.status === 'in_consultation';
              const isCompleted = visit.status === 'completed';
              const isCancelled = visit.status === 'cancelled';

              return (
                <div
                  key={visit.id}
                  className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isInConsultation
                      ? 'bg-blue-50/40 border-r-4 border-r-blue-600'
                      : visit.priority === 'urgent' && !isCompleted && !isCancelled
                      ? 'bg-rose-50/40 border-r-4 border-r-rose-600 ring-1 ring-rose-200'
                      : isAttended
                      ? 'bg-emerald-50/25 border-r-4 border-r-emerald-500 hover:bg-emerald-50/40'
                      : isCompleted
                      ? 'bg-white opacity-85 hover:opacity-100'
                      : isCancelled
                      ? 'bg-rose-50/40 border-r-4 border-r-rose-500 opacity-90'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border ${
                      isCancelled
                        ? 'bg-rose-100 text-rose-700 border-rose-300'
                        : visit.priority === 'urgent' && !isCompleted && !isCancelled
                        ? 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
                        : isAttended
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${isCancelled ? 'text-slate-700 line-through decoration-rose-400' : 'text-slate-900'}`}>
                          {visit.patient_name || 'مريض'}
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          {visit.patient_number || pat?.patient_number}
                        </span>

                        {/* Priority Badge */}
                        {visit.priority === 'urgent' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1 animate-pulse">
                            <Zap className="w-3 h-3 text-rose-600 fill-rose-500" />
                            <span>⚡ طوارئ وحالة عاجلة</span>
                          </span>
                        ) : visit.priority === 'elderly' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <span>👵 كبار السن</span>
                          </span>
                        ) : visit.priority === 'special_needs' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
                            <span>♿ أصحاب الهمم</span>
                          </span>
                        ) : null}

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            visit.visit_type === 'new'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-purple-50 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {visit.visit_type === 'new' ? 'كشف جديد' : 'إعادة واستشارة'}
                        </span>

                        {/* Booking Source Badge */}
                        {visit.booking_source === 'whatsapp' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            واتساب
                          </span>
                        ) : visit.booking_source === 'phone' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            هاتف
                          </span>
                        ) : null}

                        {/* Payment Status Badge */}
                        {visit.payment_status === 'paid' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            مسدد ({visit.paid_amount || visit.fee_amount || 40} ج)
                          </span>
                        ) : visit.payment_status === 'waived' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-900 border border-purple-300">
                            إعفاء خيري
                          </span>
                        ) : visit.payment_status === 'refunded' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-900 border border-rose-300">
                            مسترد
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-700" />
                            غير مسدد ({visit.fee_amount || (visit.visit_type === 'follow_up' ? 20 : 40)} ج)
                          </span>
                        )}

                        {isCancelled && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            حجز ملغي من الاستقبال
                          </span>
                        )}
                        {pat?.blood_type && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold">
                            {pat.blood_type}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                        <span>السن: {getPatientAge(pat?.birth_date)}</span>
                        <span>• الهاتف: {visit.patient_phone || pat?.phone}</span>
                        {visit.reception_notes && (
                          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-sm text-[11px]">
                            ملاحظة الاستقبال: {visit.reception_notes}
                          </span>
                        )}
                      </div>

                      {/* Display cancellation reason if cancelled */}
                      {isCancelled && (
                        <div className="mt-2 text-xs bg-rose-100/80 border border-rose-200 text-rose-900 rounded-lg p-2 flex items-center gap-1.5 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>
                            تم إلغاء الحجز من قِبل موظف الاستقبال
                            {visit.cancellation_reason ? ` • سبب الإلغاء: (${visit.cancellation_reason})` : ''}
                          </span>
                        </div>
                      )}

                      {/* If completed, preview diagnosis */}
                      {isCompleted && visit.diagnosis && (
                        <div className="mt-2 text-xs bg-emerald-50/70 border border-emerald-200/60 rounded-lg p-2 text-emerald-950">
                          <span className="font-bold">التشخيص المسجل:</span> {visit.diagnosis}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge & Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isInConsultation && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full animate-pulse">
                        <Activity className="w-3.5 h-3.5" />
                        داخل الكشف
                      </span>
                    )}

                    {isAttended && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full shadow-2xs">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        حاضر بالصالة (جاهز)
                      </span>
                    )}

                    {isRegistered && (
                      <span
                        className="flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full"
                        title="حجز مسجل بالاستقبال ولكن لم يسجل تأكيد وصول المريض بالصالة بعد"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        حجز مسجل (لم يؤكد الوصول)
                      </span>
                    )}

                    {isCompleted && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        تم الكشف
                      </span>
                    )}

                    {isCancelled && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        ملغي
                      </span>
                    )}

                    {isCancelled ? (
                      <div
                        title="قام موظف الاستقبال بإلغاء هذا الحجز. لا يمكن نداء الحالة أو الكشف عليها."
                        className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-200 cursor-not-allowed select-none opacity-80"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>حجز ملغي (مغلق)</span>
                      </div>
                    ) : isInConsultation ? (
                      <button
                        onClick={() => handleOpenConsultation(visit)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs bg-blue-600 hover:bg-blue-700 active:scale-95 text-white"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>استكمال الكشف الطبي</span>
                      </button>
                    ) : isAttended ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCallPatient(visit)}
                          className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer transition-all active:scale-95 shadow-2xs"
                          title="نداء صوتي بنغمة المستشفى والصوت العربي"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            handleCallPatient(visit);
                            handleOpenConsultation(visit);
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white"
                          title="نداء المريض وبدء الكشف فوراً"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>نداء وبدء الكشف</span>
                        </button>
                      </div>
                    ) : isRegistered ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCallPatient(visit)}
                          className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer transition-all active:scale-95 shadow-2xs"
                          title="نداء صوتي للمريض بالانتظار"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setUnconfirmedPromptVisit(visit)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs bg-amber-500 hover:bg-amber-600 active:scale-95 text-white border border-amber-600"
                          title="المريض لم يسجل وصوله بالصالة بعد. اضغط لتأكيد حضوره وبدء الكشف الطبي."
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>تأكيد وصول وبدء الكشف</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* 1-Click Direct WhatsApp */}
                        <button
                          type="button"
                          onClick={() => handleDirectWhatsAppPrescription(visit)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
                          title="إرسال فوري للروشتة والعلاج عبر الواتساب"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>واتساب فوري</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNotificationModalVisit(visit);
                          }}
                          className="px-2 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-pointer flex items-center gap-1 transition-all"
                          title="تخصيص رسالة الروشتة ومشاركتها"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>مشاركة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveVisit(visit);
                            setIsPrintModalOpen(true);
                            setTimeout(() => {
                              printElement('hospital-printable-prescription', 'روشتة طبية - مستشفى ميت علي');
                            }, 400);
                          }}
                          className="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer flex items-center gap-1 transition-all"
                          title="طباعة الروشتة الرسمية"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>طباعة</span>
                        </button>

                        <button
                          onClick={() => handleOpenConsultation(visit)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* Consultation & Diagnosis Modal (عيادة الفحص وكتابة الروشتة) */}
      {/* ========================================================================= */}
      {isConsultationModalOpen && activeVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-5 sm:p-6 shadow-2xl relative my-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center shrink-0 border border-teal-100">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">
                      غرفة الكشف الطبي • {activeVisit.patient_name}
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold">
                      {activeVisit.patient_number}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        activeVisit.visit_type === 'new'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {activeVisit.visit_type === 'new' ? 'كشف جديد' : 'إعادة واستشارة'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    السن: {getPatientAge(activePatient?.birth_date)} • الجنس:{' '}
                    {activePatient?.gender === 'female' ? 'أنثى' : 'ذكر'} • فصيلة الدم:{' '}
                    {activePatient?.blood_type || 'غير محددة'} • هاتف: {activePatient?.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
                  title="طباعة الروشتة الطبية"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">معاينة وطباعة الروشتة</span>
                </button>
                <button
                  onClick={() => setIsConsultationModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5 text-slate-800 pr-1">
              {/* Previous History Alert (if any past visits exist) */}
              {patientHistoryVisits.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-teal-600" />
                      السجل المرضي والزيارات السابقة لهذا المريض ({patientHistoryVisits.length} زيارات مسجلة):
                    </span>
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto divide-y divide-slate-200 pr-1 text-xs">
                    {patientHistoryVisits.map(hv => (
                      <div key={hv.id} className="pt-2.5 first:pt-0 bg-white/70 p-2.5 rounded-xl border border-slate-200/80 mb-1.5 last:mb-0">
                        <div className="flex items-center justify-between text-slate-600 mb-1">
                          <span className="font-bold text-slate-900 text-xs">
                            {hv.specialty_name} • {hv.doctor_name}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded-md">{hv.visit_date}</span>
                        </div>
                        {hv.diagnosis && (
                          <div className="flex items-center justify-between gap-2 mt-0.5 text-xs">
                            <p className="text-slate-700">
                              <span className="font-bold text-slate-800">التشخيص:</span> {hv.diagnosis}
                            </p>
                            {!diagnosis && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDiagnosis(hv.diagnosis || '');
                                  setSuccessToast('تم استخدام التشخيص السابق');
                                  setTimeout(() => setSuccessToast(null), 3000);
                                }}
                                className="text-[10px] font-bold text-teal-700 hover:text-teal-900 hover:underline shrink-0 cursor-pointer bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200"
                              >
                                استخدام نفس التشخيص
                              </button>
                            )}
                          </div>
                        )}
                        {hv.prescription && (
                          <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-slate-100">
                            <p className="text-slate-600 text-[11px] line-clamp-1 flex-1">
                              <span className="font-semibold text-slate-700">العلاج السابق:</span> {hv.prescription}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleCopyPreviousPrescription(hv.prescription)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                              title="نسخ أدوية هذه الزيارة إلى الروشتة الحالية مباشرة"
                            >
                              <Copy className="w-3 h-3" />
                              <span>نسخ للروشتة الحالية</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vital Signs Mini-Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold text-slate-800">
                      العلامات الحيوية للمريض (Vital Signs)
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md font-medium">اختياري</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVitalSigns(!showVitalSigns)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showVitalSigns ? 'طي الشريط ▲' : 'إظهار شريط العلامات الحيوية ▼'}
                  </button>
                </div>

                {showVitalSigns && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        ضغط الدم (BP)
                      </label>
                      <input
                        type="text"
                        value={bloodPressure}
                        onChange={e => setBloodPressure(e.target.value)}
                        placeholder="120/80"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-hidden focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        النبض (Pulse)
                      </label>
                      <input
                        type="text"
                        value={pulse}
                        onChange={e => setPulse(e.target.value)}
                        placeholder="72 bpm"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-hidden focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        درجة الحرارة (Temp)
                      </label>
                      <input
                        type="text"
                        value={temperature}
                        onChange={e => setTemperature(e.target.value)}
                        placeholder="37.0 °C"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-hidden focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        الوزن (Weight)
                      </label>
                      <input
                        type="text"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        placeholder="70 kg"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-hidden focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        السكر العشوائي (RBS)
                      </label>
                      <input
                        type="text"
                        value={randomBloodSugar}
                        onChange={e => setRandomBloodSugar(e.target.value)}
                        placeholder="110 mg/dL"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-hidden focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        الأكسجين (SpO2)
                      </label>
                      <input
                        type="text"
                        value={oxygenSat}
                        onChange={e => setOxygenSat(e.target.value)}
                        placeholder="98%"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-hidden focus:border-teal-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 1. Chief Complaint & Symptoms */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  ١. الشكوى المرضية والأعراض الحالية (Chief Complaint & Symptoms)
                </label>
                <textarea
                  rows={2}
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
                  placeholder="وصف شكوى المريض، مدة الأعراض، شدة الألم أو الحرارة، الملاحظات الإكلينيكية..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
              </div>

              {/* 2. Clinical Diagnosis - Streamlined Dropdown & Custom Registration */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                    <span>٢. التشخيص الطبي المعتمد (Clinical Diagnosis)</span>
                    <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    اختر من القائمة أو اكتب تشخيصاً جديداً مع إمكانية حفظه
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  {/* Diagnosis Dropdown */}
                  <div className="sm:col-span-6">
                    <select
                      value={customDiagnosesList.includes(diagnosis) ? diagnosis : (diagnosis ? '__custom__' : '')}
                      onChange={e => {
                        if (e.target.value === '__custom__') {
                          // Keep existing custom value or focus input
                        } else {
                          setDiagnosis(e.target.value);
                        }
                      }}
                      className="w-full text-xs font-semibold py-2 px-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-hidden focus:border-teal-600 focus:ring-1 focus:ring-teal-600 cursor-pointer shadow-2xs"
                    >
                      <option value="" disabled>🩺 اختر تشخيصاً من القائمة المعتمدة ({customDiagnosesList.length})...</option>
                      {customDiagnosesList.map((diag, i) => (
                        <option key={i} value={diag}>{diag}</option>
                      ))}
                      <option value="__custom__">✏️ كتابة تشخيص طبي يدوي غير موجود بالقائمة...</option>
                    </select>
                  </div>

                  {/* Diagnosis Input & Save-to-list Button */}
                  <div className="sm:col-span-6 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={diagnosis}
                      onChange={e => setDiagnosis(e.target.value)}
                      placeholder="التشخيص الطبي للحالة (يمكنك تعديله أو كتابة تشخيص جديد)..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:outline-hidden focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-2xs"
                    />

                    {diagnosis.trim() && !customDiagnosesList.includes(diagnosis.trim()) && (
                      <button
                        type="button"
                        onClick={handleSaveNewDiagnosisToList}
                        className="px-2.5 py-2 text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-xl shrink-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1 active:scale-95"
                        title="حفظ هذا التشخيص الجديد في القائمة المنسدلة للاستخدام الدائم"
                      >
                        <Plus className="w-3.5 h-3.5 text-teal-700" />
                        <span>حفظ بالقائمة</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Prescription & Medications (Rx) - Simplified Dual-Mode UI */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
                {/* Header & Controls Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 mb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        ٣. الروشتة والوصفة الطبية (Prescription - Rx)
                        <span className="text-[10px] font-normal text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                          {rxViewMode === 'table'
                            ? `${medicines.filter(m => m.name.trim()).length} أدوية مسجلة`
                            : 'كتابة حرة سريعة'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* View Mode Toggle Switch */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300/80 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        if (rxViewMode !== 'table') handleSwitchToTableMode();
                      }}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        rxViewMode === 'table'
                          ? 'bg-white text-teal-900 shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>جدول منظم</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (rxViewMode !== 'text') handleSwitchToTextMode();
                      }}
                      className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        rxViewMode === 'text'
                          ? 'bg-white text-teal-900 shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      <span>كتابة حرة سريعة</span>
                    </button>
                  </div>
                </div>

                {/* Smart Action Toolbar: Quick Protocol & Quick Drug Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  {/* Clinical Protocol Selector */}
                  <div className="sm:col-span-6 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-teal-950 shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      بروتوكول جاهز:
                    </span>
                    <select
                      defaultValue=""
                      onChange={e => {
                        const proto = clinicalProtocols.find(p => p.id === e.target.value);
                        if (proto) handleApplyProtocol(proto);
                        e.target.value = '';
                      }}
                      className="w-full text-xs font-semibold py-1.5 px-2 bg-teal-50/50 border border-teal-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-teal-600 cursor-pointer"
                    >
                      <option value="" disabled>⚡ اختر بروتوكولاً شاملاً ({clinicalProtocols.length} قوالب جاهزة)...</option>
                      {clinicalProtocols.some(p => p.doctor_id === selectedDoctorId) && (
                        <optgroup label="⭐ بروتوكولاتي الخاصة المفضلة">
                          {clinicalProtocols
                            .filter(p => p.doctor_id === selectedDoctorId)
                            .map(proto => (
                              <option key={proto.id} value={proto.id}>
                                ⭐ {proto.name} ({proto.medicines.length} أدوية)
                              </option>
                            ))}
                        </optgroup>
                      )}
                      <optgroup label={`🏥 بروتوكولات قسم (${doctors.find(d => d.id === selectedDoctorId)?.specialty_name || 'القسم'}) المعتمدة`}>
                        {clinicalProtocols
                          .filter(p => p.doctor_id !== selectedDoctorId)
                          .map(proto => (
                            <option key={proto.id} value={proto.id}>
                              {proto.name} {proto.latinName ? `- ${proto.latinName}` : ''} ({proto.medicines.length} أدوية)
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Quick Drug Dropdown */}
                  <div className="sm:col-span-6 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700 shrink-0 flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      دواء شائع:
                    </span>
                    <select
                      defaultValue=""
                      onChange={e => {
                        const drug = quickCommonDrugs.find(d => d.name === e.target.value);
                        if (drug) handleAddQuickDrug(drug);
                        e.target.value = '';
                      }}
                      className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-teal-600 cursor-pointer"
                    >
                      <option value="" disabled>+ إضافة دواء شائع لقسم {doctors.find(d => d.id === selectedDoctorId)?.specialty_name || ''} ({quickCommonDrugs.length} أدوية)...</option>
                      {quickCommonDrugs.map((drug, i) => (
                        <option key={i} value={drug.name}>
                          {drug.name} ({drug.dosage} - {drug.frequency})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mode 1: Simplified Table View */}
                {rxViewMode === 'table' ? (
                  <div className="space-y-2">
                    {/* Table Column Headers */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-1 text-[11px] font-bold text-slate-500">
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-5">اسم الدواء والشكل الصيدلي والتركيز</div>
                      <div className="col-span-5">الجرعة وطريقة وتكرار الاستخدام والمدة</div>
                      <div className="col-span-1 text-center">حذف</div>
                    </div>

                    {medicines.map((med, idx) => (
                      <div
                        key={med.id}
                        className="bg-white border border-slate-200 rounded-xl p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center hover:border-slate-300 transition-colors shadow-2xs"
                      >
                        <div className="sm:col-span-1 font-mono text-xs font-bold text-slate-400 text-center">
                          {idx + 1}
                        </div>

                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            value={med.name}
                            onChange={e => handleUpdateMedicine(med.id, 'name', e.target.value)}
                            placeholder="اسم الدواء (مثال: Panadol Extra 500mg)..."
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600 font-bold text-slate-900 bg-slate-50/30 focus:bg-white"
                          />
                        </div>

                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            value={med.dosage}
                            onChange={e => handleUpdateMedicine(med.id, 'dosage', e.target.value)}
                            placeholder="الجرعة والتكرار (مثال: قرص 3 مرات يومياً بعد الأكل لمدة 5 أيام)..."
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600 text-slate-700 bg-slate-50/30 focus:bg-white"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-center">
                          {medicines.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveMedicine(med.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="حذف هذا الدواء"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add New Medicine Row Button */}
                    {/* Add New Medicine Row & Save Favorite Protocol Buttons */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200/60 mt-2">
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={handleAddMedicine}
                          className="px-3 py-1.5 text-xs font-bold bg-white border border-dashed border-teal-400 text-teal-800 hover:bg-teal-50 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ إضافة سطر دواء جديد</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNewFavoriteName(diagnosis ? `بروتوكول ${diagnosis.split('(')[0].trim()}` : '');
                            setIsSaveFavoriteModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                          title="حفظ هذه الروشتة الحالية كبروتوكول علاجي مفضل خاص بي"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
                          <span>⭐ حفظ كبروتوكول مفضل لي</span>
                        </button>
                      </div>

                      <span className="text-[11px] text-slate-400">
                        يمكنك الضغط على "كتابة حرة سريعة" لكتابة الروشتة كنص حر وسريع
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Mode 2: Free Text Prescription Pad */
                  <div className="space-y-2">
                    <div className="relative">
                      <textarea
                        rows={6}
                        value={freeTextRx}
                        onChange={e => setFreeTextRx(e.target.value)}
                        placeholder={`اكتب أو الصق الروشتة الطبية هنا بحرية تامة... مثال:
1. بنادول 500 مجم (Panadol) - قرص 3 مرات يومياً بعد الأكل عند اللزوم
2. أوجمانتين 1 جم (Augmentin) - قرص كل 12 ساعة بعد الأكل لمدة 7 أيام
3. جافيسكون شراب (Gaviscon) - ملعقة كبيرة بعد الوجبات وقبل النوم`}
                        className="w-full p-3.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-mono text-slate-900 bg-white leading-relaxed shadow-inner"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] bg-teal-50/60 border border-teal-100 px-3 py-2 rounded-lg">
                      <span className="flex items-center gap-1 text-teal-900 font-semibold">
                        <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        وضع الكتابة الحرة: يمكنك كتابة كل دواء بسطر منفصل، وستظهر الروشتة منسقة في نموذج الطباعة الرسمي.
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setNewFavoriteName(diagnosis ? `بروتوكول ${diagnosis.split('(')[0].trim()}` : '');
                            setIsSaveFavoriteModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          title="حفظ النص الحالي كبروتوكول علاجي مفضل"
                        >
                          <Star className="w-3 h-3 text-amber-600 fill-amber-400" />
                          <span>حفظ كبروتوكول مفضل</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSwitchToTableMode}
                          className="text-teal-700 hover:text-teal-900 font-bold underline cursor-pointer"
                        >
                          تحويل إلى جدول منظم ⬅
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Requested Lab & Imaging Tests */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-teal-600" />
                    <span>٤. طلب تحاليل وفحوصات معملية أو أشعة (تضاف لطابور الفنيين فوراً)</span>
                  </label>
                  <span className="text-[10px] text-teal-800 font-bold bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-200">
                    {selectedDiagnosticServiceIds.length} فحص محدد
                  </span>
                </div>

                <DiagnosticServicePicker
                  selectedServiceIds={selectedDiagnosticServiceIds}
                  onSelectionChange={setSelectedDiagnosticServiceIds}
                />

                <div className="mt-2.5">
                  <input
                    type="text"
                    value={customTests}
                    onChange={e => setCustomTests(e.target.value)}
                    placeholder="أي تحاليل أخرى أو مواصفات خاصة للأشعة (مثال: صائم 12 ساعة، رنين مع صبغة)..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 bg-white"
                  />
                </div>
              </div>

              {/* 5. Doctor Advice & Dietary Recommendations */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  ٥. نصائح وتوصيات الطبيب للمريض (Advice & Dietary Recommendations)
                </label>
                <textarea
                  rows={2}
                  value={doctorNotes}
                  onChange={e => setDoctorNotes(e.target.value)}
                  placeholder="التعليمات الغذائية، المحاذير، الراحة، التمارين، موانع الاستعمال..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600"
                />
              </div>

              {/* 6. Revisit & Follow-up Scheduling */}
              <div className="bg-purple-50/50 border border-purple-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="revisitCheck"
                    checked={revisitRecommended}
                    onChange={e => setRevisitRecommended(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="revisitCheck" className="text-xs font-bold text-purple-950 cursor-pointer">
                    يوصى بحضور المريض لإعادة كشف / استشارة بعد انتهاء العلاج
                  </label>
                </div>

                {revisitRecommended && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-purple-900 font-medium whitespace-nowrap">موعد الإعادة المقترح:</span>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={e => setFollowUpDate(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-white border border-purple-300 rounded-lg text-slate-800 focus:outline-hidden focus:border-purple-600 font-bold"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSetFollowUpDays(3)}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-purple-200 text-purple-800 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                      >
                        بعد 3 أيام
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetFollowUpDays(7)}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-purple-200 text-purple-800 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                      >
                        بعد أسبوع
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetFollowUpDays(10)}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-purple-200 text-purple-800 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                      >
                        بعد 10 أيام
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetFollowUpDays(14)}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-purple-200 text-purple-800 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                      >
                        بعد أسبوعين
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetFollowUpDays(30)}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-purple-200 text-purple-800 hover:bg-purple-100 rounded-md transition-colors cursor-pointer"
                      >
                        بعد شهر
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>يتم حفظ التشخيص والروشتة فورياً في السجل الطبي التراكمي للمريض.</span>
              </div>

              <div className="flex items-center gap-2 justify-end flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSaveDiagnosis(false)}
                  disabled={isSavingDiagnosis}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-300 disabled:opacity-50"
                >
                  حفظ كمسودة
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer border border-blue-200 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>معاينة الروشتة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveDiagnosis(true)}
                  disabled={isSavingDiagnosis}
                  className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingDiagnosis ? 'جاري الحفظ...' : 'حفظ الكشف'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndSendWhatsApp}
                  disabled={isSavingDiagnosis}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  title="حفظ الكشف وإرسال الروشتة فوراً إلى هاتف المريض عبر الواتساب"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-100" />
                  <span>حفظ وإرسال بالواتساب</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndPrintImmediately}
                  disabled={isSavingDiagnosis}
                  className="px-4.5 py-2 text-xs font-bold bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 active:scale-95 text-white rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  title="حفظ الكشف وإرسال الروشتة فوراً إلى الطابعة في خطوة واحدة"
                >
                  <Printer className="w-4 h-4" />
                  <span>حفظ وطباعة فورية</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Official Prescription Print Preview Modal (روشتة رسمية للمستشفى) */}
      {/* ========================================================================= */}
      {isPrintModalOpen && activeVisit && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div id="hospital-printable-prescription" className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="print:hidden absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prescription Header */}
            <div className="text-center pb-4 border-b-2 border-slate-900 mb-6">
              <span className="text-[11px] font-bold text-teal-800 block">
                جمهورية مصر العربية • وزارة التضامن الاجتماعي • لجان الزكاة
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                مستشفى ميت علي التخصصي الخيري
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                عيادة: {currentDoctor?.specialty_name || activeVisit.specialty_name} • د. {currentDoctor?.full_name} ({currentDoctor?.title})
              </p>
            </div>

            {/* Patient Header Block */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">اسم المريض:</span>
                <span className="font-bold text-slate-900">{activeVisit.patient_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">رقم الملف:</span>
                <span className="font-bold font-mono text-slate-900">{activeVisit.patient_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">السن / الجنس:</span>
                <span className="font-bold text-slate-900">
                  {getPatientAge(activePatient?.birth_date)} / {activePatient?.gender === 'female' ? 'أنثى' : 'ذكر'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">تاريخ الكشف:</span>
                <span className="font-bold text-slate-900 font-mono">{activeVisit.visit_date}</span>
              </div>
            </div>

            {/* Vital Signs (if recorded) */}
            {(bloodPressure || pulse || temperature || weight || randomBloodSugar || oxygenSat) && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 mb-4 text-[11px] flex items-center justify-between flex-wrap gap-2 text-slate-700">
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                  العلامات الحيوية:
                </span>
                <div className="flex items-center gap-3 flex-wrap">
                  {bloodPressure && <span>الضغط: <b>{bloodPressure}</b></span>}
                  {pulse && <span>النبض: <b>{pulse}</b></span>}
                  {temperature && <span>الحرارة: <b>{temperature}</b></span>}
                  {weight && <span>الوزن: <b>{weight}</b></span>}
                  {randomBloodSugar && <span>السكر: <b>{randomBloodSugar}</b></span>}
                  {oxygenSat && <span>الأكسجين: <b>{oxygenSat}</b></span>}
                </div>
              </div>
            )}

            {/* Diagnosis */}
            {diagnosis && (
              <div className="mb-4">
                <span className="text-xs font-bold text-slate-700 block mb-1">التشخيص الطبي (Diagnosis):</span>
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs font-bold text-blue-950">
                  {diagnosis}
                </div>
              </div>
            )}

            {/* Rx Symbol & Medication List */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-black italic font-serif text-teal-800">℞</span>
                <span className="text-xs font-bold text-slate-800">العلاج والوصفة الطبية:</span>
              </div>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 p-1">
                {rxViewMode === 'text' && freeTextRx.trim() ? (
                  <div className="p-3 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans font-medium">
                    {freeTextRx}
                  </div>
                ) : medicines.filter(m => m.name.trim()).length === 0 ? (
                  <p className="p-3 text-xs text-slate-400 text-center">لم تتم إضافة أدوية بالروشتة</p>
                ) : (
                  medicines
                    .filter(m => m.name.trim())
                    .map((m, idx) => (
                      <div key={idx} className="p-2.5 flex items-start gap-2 text-xs">
                        <span className="font-bold font-mono text-slate-500 mt-0.5">{idx + 1}.</span>
                        <div className="flex-1">
                          <span className="font-bold text-slate-900">{m.name}</span>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            {[m.dosage, m.frequency, m.duration, m.instructions].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Requested Tests & Advice */}
            {(selectedTests.length > 0 || customTests) && (
              <div className="mb-4 text-xs">
                <span className="font-bold text-slate-700 block mb-1">الفحوصات المطلوبة:</span>
                <p className="text-slate-800 bg-amber-50/70 border border-amber-200 rounded-lg p-2">
                  {[...selectedTests, customTests].filter(Boolean).join(' + ')}
                </p>
              </div>
            )}

            {doctorNotes && (
              <div className="mb-6 text-xs">
                <span className="font-bold text-slate-700 block mb-1">توصيات المريض:</span>
                <p className="text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2">
                  {doctorNotes}
                </p>
              </div>
            )}

            {/* Signature & Hospital Footer */}
            <div className="pt-6 border-t-2 border-slate-200 mt-6 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">توقيع الطبيب المعالج:</span>
                <span className="font-bold text-slate-900 mt-2 block">د. {currentDoctor?.full_name}</span>
              </div>
              <div className="text-left text-[11px] text-slate-400">
                <span>مع تمنياتنا للمريض بالشفاء العاجل</span>
                <br />
                <span>مستشفى لجنة الزكاة بميت علي</span>
              </div>
            </div>

            {/* Actions: Send via WhatsApp & Print */}
            <div className="print:hidden mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const compiledRx = medicines.length > 0 
                    ? medicines
                        .filter(m => m.name.trim())
                        .map((m, i) => `${i + 1}. ${m.name} (${[m.dosage, m.frequency, m.duration, m.instructions].filter(Boolean).join(' - ')})`)
                        .join('\n')
                    : freeTextRx.trim();
                  const allTests = [...selectedTests, customTests.trim()].filter(Boolean).join(' + ');
                  const updated: PatientVisit = {
                    ...activeVisit,
                    diagnosis: diagnosis.trim() || activeVisit.diagnosis,
                    prescription: compiledRx || activeVisit.prescription,
                    tests_requested: allTests || activeVisit.tests_requested,
                    follow_up_date: revisitRecommended ? followUpDate : activeVisit.follow_up_date,
                    status: 'completed',
                  };
                  setIsPrintModalOpen(false);
                  setNotificationModalVisit(updated);
                }}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs transition-all"
                title="إرسال الروشتة فوراً عبر الواتساب للمريض"
              >
                <MessageSquare className="w-4 h-4 text-emerald-100" />
                <span>إرسال الروشتة عبر الواتساب للمريض</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                >
                  إغلاق المعاينة
                </button>
                <button
                  type="button"
                  onClick={() => printElement('hospital-printable-prescription', 'روشتة طبية - مستشفى ميت علي')}
                  className="px-5 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 active:scale-95 text-white rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>إرسال للطابعة الرسمية (Print)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Confirmation Modal for Unconfirmed Patient (تأكيد حضور مريض لم يؤكد وصوله بالاستقبال) */}
      {/* ========================================================================= */}
      {unconfirmedPromptVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-amber-200 max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Top accent banner */}
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500" />

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  تأكيد حضور المريض وبدء الكشف
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تنبيه تنظيمي لضبط سير العمل والربط بين الاستقبال والعيادة
                </p>
              </div>
              <button
                onClick={() => setUnconfirmedPromptVisit(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Patient Info Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sm text-slate-900">{unconfirmedPromptVisit.patient_name}</span>
                <span className="px-2 py-0.5 rounded-md font-mono bg-white border border-slate-200 text-slate-700 font-bold">
                  {unconfirmedPromptVisit.patient_number}
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 text-[11px] flex-wrap">
                <span>نوع الكشف: {unconfirmedPromptVisit.visit_type === 'new' ? 'كشف جديد' : 'إعادة واستشارة'}</span>
                {unconfirmedPromptVisit.patient_phone && (
                  <span>• الهاتف: {unconfirmedPromptVisit.patient_phone}</span>
                )}
              </div>
            </div>

            {/* Explanation box */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 mb-5 text-xs text-amber-950 space-y-2.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>حالة التذكرة حالياً: (حجز مسجل بالاستقبال فقط)</span>
              </div>
              <p className="leading-relaxed text-slate-700">
                لم يقم موظف الاستقبال بتأكيد وصول المريض لصالة الانتظار حتى الآن.
                إذا كان المريض متواجداً بالفعل أمام عيادتك وتريد بدء الكشف الطبي الآن:
              </p>
              <div className="bg-white/90 rounded-lg p-2.5 border border-amber-200 text-[11px] text-emerald-950 font-semibold space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>سيقوم النظام فورياً بتحديث حالة المريض إلى (حاضر بالصالة).</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>سيتم نقله إلى (داخل الكشف) وإشعار موظف الاستقبال على جهازه فوراً.</span>
                </div>
              </div>

              {unconfirmedPromptVisit.payment_status === 'unpaid' && (
                <div className="bg-rose-50 border border-rose-300 rounded-lg p-2.5 text-[11px] text-rose-950 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>تنبيه مالي: هذا المريض لم يسدد رسوم الكشف ({unconfirmedPromptVisit.fee_amount || 40} ج) بالاستقبال بعد.</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUnconfirmedPromptVisit(null)}
                disabled={isConfirmingAttendance}
                className="px-4 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                تراجع (انتظار وصول المريض)
              </button>
              <button
                type="button"
                onClick={() => handleConfirmArrivalAndStart(unconfirmedPromptVisit)}
                disabled={isConfirmingAttendance}
                className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isConfirmingAttendance ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>جاري التأكيد وبدء الكشف...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>نعم، المريض أمامي وتأكيد البدء</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Save as Doctor's Favorite Protocol */}
      {isSaveFavoriteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                <h3 className="font-bold text-sm text-slate-900">
                  حفظ الروشتة الحالية كبروتوكول علاجي مفضل
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveFavoriteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              سيتم حفظ الأدوية والجرعات المسجلة حالياً كقالب علاجي خاص بك، ليظهر دائماً في أعلى قائمة البروتوكولات بعيادتك بنقرة واحدة.
            </p>

            <form onSubmit={handleSaveCurrentAsFavoriteProtocol} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  اسم البروتوكول المفضل <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newFavoriteName}
                  onChange={e => setNewFavoriteName(e.target.value)}
                  placeholder="مثال: بروتوكول نزلات البرد الخاص بي..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  الاسم الطبي بالإنجليزية (اختياري)
                </label>
                <input
                  type="text"
                  value={newFavoriteLatin}
                  onChange={e => setNewFavoriteLatin(e.target.value)}
                  placeholder="مثال: My URTI Regimen..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-hidden focus:border-teal-600"
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">
                  الأدوية المشمولة ({medicines.filter(m => m.name.trim()).length || (freeTextRx ? 'كتابة حرة' : 0)}):
                </span>
                <p className="text-slate-500 text-[11px] line-clamp-2">
                  {medicines.filter(m => m.name.trim()).map(m => m.name).join(' ، ') || freeTextRx.slice(0, 100)}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSaveFavoriteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Star className="w-3.5 h-3.5 fill-slate-950" />
                  <span>حفظ في بروتوكولاتي</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient WhatsApp Prescription Modal (Doctor Role: Prescription Only) */}
      <PatientNotificationModal
        isOpen={!!notificationModalVisit}
        onClose={() => setNotificationModalVisit(null)}
        visit={notificationModalVisit}
        allowedTabs={['prescription']}
        defaultTab="prescription"
      />
    </div>
  );
};
