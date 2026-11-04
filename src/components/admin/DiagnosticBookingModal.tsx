import React, { useState, useEffect } from 'react';
import { Patient, DiagnosticService, VisitPriority, DiagnosticOrder } from '../../types';
import { dbService, createDiagnosticOrder, getAllDiagnosticServices } from '../../lib/databaseService';
import { DiagnosticServicePicker } from '../technician/DiagnosticServicePicker';
import {
  X,
  FlaskConical,
  Scan,
  User,
  Search,
  CheckCircle2,
  Calendar,
  Clock,
  Banknote,
  Ticket,
  Printer,
  Sparkles,
} from 'lucide-react';

interface DiagnosticBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDepartment?: 'lab' | 'radiology';
  initialPatient?: Patient | null;
  initialService?: DiagnosticService | null;
  onOrderCreated?: (order: DiagnosticOrder) => void;
}

export const DiagnosticBookingModal: React.FC<DiagnosticBookingModalProps> = ({
  isOpen,
  onClose,
  initialDepartment = 'lab',
  initialPatient = null,
  initialService = null,
  onOrderCreated,
}) => {
  const [department, setDepartment] = useState<'lab' | 'radiology'>(initialDepartment);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient);

  // Walk-in patient fields if not choosing existing patient
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientNumber, setPatientNumber] = useState('');

  // Selected tests / scans
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [customTests, setCustomTests] = useState('');
  const [priority, setPriority] = useState<VisitPriority>('normal');
  const [feeAmount, setFeeAmount] = useState<number>(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<DiagnosticOrder | null>(null);

  // Sync state when opening
  useEffect(() => {
    if (isOpen) {
      const targetDept = initialService
        ? (initialService.type === 'radiology' || initialService.service_type === 'radiology' ? 'radiology' : 'lab')
        : initialDepartment;
      setDepartment(targetDept);
      setSelectedPatient(initialPatient);
      if (initialPatient) {
        setPatientName(initialPatient.full_name);
        setPatientPhone(initialPatient.phone);
        setPatientNumber(initialPatient.patient_number);
        // Elderly check
        if (initialPatient.birth_date) {
          const age = new Date().getFullYear() - new Date(initialPatient.birth_date).getFullYear();
          if (age >= 60) setPriority('elderly');
        }
      } else {
        setPatientName('');
        setPatientPhone('');
        setPatientNumber('');
      }

      if (initialService) {
        setSelectedServiceIds([initialService.id]);
        setFeeAmount(typeof initialService.price === 'number' ? initialService.price : targetDept === 'lab' ? 50 : 70);
      } else {
        setSelectedServiceIds([]);
        setFeeAmount(targetDept === 'lab' ? 50 : 70);
      }
      setCustomTests('');
      setSuccessOrder(null);

      // Load patients
      dbService.getPatients().then(pats => setPatients(pats));
    }
  }, [isOpen, initialDepartment, initialPatient, initialService]);

  // Toggle service selection
  const handleToggleService = (service: DiagnosticService) => {
    const exists = selectedServiceIds.includes(service.id);
    let nextIds: string[];
    if (exists) {
      nextIds = selectedServiceIds.filter(id => id !== service.id);
    } else {
      nextIds = [...selectedServiceIds, service.id];
    }
    setSelectedServiceIds(nextIds);

    // Calculate sum of fees
    const all = getAllDiagnosticServices();
    const sum = nextIds.reduce((total, id) => {
      const match = all.find(s => s.id === id);
      return total + (match?.price || 0);
    }, 0);

    setFeeAmount(sum > 0 ? sum : department === 'lab' ? 50 : 70);
  };

  // Switch department
  const handleSwitchDepartment = (dept: 'lab' | 'radiology') => {
    setDepartment(dept);
    setSelectedServiceIds([]);
    setCustomTests('');
    setFeeAmount(dept === 'lab' ? 50 : 70);
  };

  // Search filtered patients
  const filteredPatients = patients.filter(p => {
    if (!patientSearch.trim()) return false;
    const q = patientSearch.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      (p.patient_number && p.patient_number.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  });

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setPatientName(p.full_name);
    setPatientPhone(p.phone);
    setPatientNumber(p.patient_number);
    setPatientSearch('');

    if (p.birth_date) {
      const age = new Date().getFullYear() - new Date(p.birth_date).getFullYear();
      if (age >= 60) setPriority('elderly');
    }
  };

  // Submit and create DiagnosticOrder
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert('يرجى تحديد أو كتابة اسم المريض');
      return;
    }

    const allServices = getAllDiagnosticServices();
    const chosenNames = selectedServiceIds
      .map(id => allServices.find(s => s.id === id)?.name)
      .filter(Boolean) as string[];

    if (customTests.trim()) {
      chosenNames.push(customTests.trim());
    }

    if (chosenNames.length === 0) {
      alert('يرجى اختيار فحص واحد على الأقل من القائمة أو كتابة اسم الفحص');
      return;
    }

    setIsSubmitting(true);
    try {
      const newOrder = createDiagnosticOrder({
        department,
        patient_id: selectedPatient?.id,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        patient_number: patientNumber.trim() || undefined,
        test_names: chosenNames.join(' + '),
        priority,
        fee_amount: Number(feeAmount) || (department === 'lab' ? 50 : 70),
        payment_status: 'paid',
        doctor_name: 'حجز مباشر بشباك الاستقبال',
        specialty_name: department === 'lab' ? 'معمل التحاليل الطبية' : 'قسم الأشعة والتصوير',
      });

      setSuccessOrder(newOrder);
      if (onOrderCreated) {
        onOrderCreated(newOrder);
      }
    } catch (err) {
      console.error('Failed to book diagnostic order:', err);
      alert('حدث خطأ أثناء حجز التذكرة');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                department === 'lab' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {department === 'lab' ? <FlaskConical className="w-6 h-6" /> : <Scan className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                حجز تذكرة دور — {department === 'lab' ? 'معمل التحاليل الطبية' : 'قسم الأشعة والتصوير'}
              </h3>
              <p className="text-xs text-slate-500">
                شباك الاستقبال • تحصيل الرسوم الخيرية والإدراج المباشر في شاشة الفني
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Confirmation State */}
        {successOrder ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base font-extrabold text-slate-900">
                تم حجز التذكرة وإدراج المريض في طابور {department === 'lab' ? 'المعمل' : 'الأشعة'} بنجاح!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                تظهر التذكرة الآن على شاشة الفني مع جاهزية النداء الآلي بالمكبر الصوتي
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm mx-auto text-right text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">رقم التذكرة:</span>
                <strong className="text-amber-800 font-mono text-sm">{successOrder.order_number}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">اسم المريض:</span>
                <strong className="text-slate-900">{successOrder.patient_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الفحوصات:</span>
                <span className="font-semibold text-slate-800">{successOrder.test_names}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الرسوم المسددة:</span>
                <strong className="text-emerald-700 font-mono">{successOrder.fee_amount} ج.م (مسدد)</strong>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setSuccessOrder(null);
                  setSelectedServiceIds([]);
                  setCustomTests('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                حجز تذكرة أخرى
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                تم والعودة للاستقبال
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Department Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleSwitchDepartment('lab')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  department === 'lab'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>معمل التحاليل الطبية</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchDepartment('radiology')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  department === 'radiology'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scan className="w-4 h-4" />
                <span>قسم الأشعة والتصوير</span>
              </button>
            </div>

            {/* Patient Search / Selection */}
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">بيانات المريض</span>
                {selectedPatient && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setPatientName('');
                      setPatientPhone('');
                      setPatientNumber('');
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                  >
                    تغيير المريض
                  </button>
                )}
              </div>

              {!selectedPatient && (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    placeholder="ابحث عن مريض مسجل بالاسم أو الهاتف أو رقم الملف..."
                    className="w-full pr-9 pl-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:border-teal-600"
                  />

                  {filteredPatients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-20 divide-y divide-slate-100">
                      {filteredPatients.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPatient(p)}
                          className="w-full p-2 text-right text-xs hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <strong className="text-slate-900 block">{p.full_name}</strong>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ملف: {p.patient_number} • هاتف: {p.phone}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                            اختيار
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    اسم المريض <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    placeholder="الاسم ثلاثي"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    رقم الهاتف (للواتساب)
                  </label>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={e => setPatientPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    رقم الملف (إن وجد)
                  </label>
                  <input
                    type="text"
                    value={patientNumber}
                    onChange={e => setPatientNumber(e.target.value)}
                    placeholder="P-2026-XXXX"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Test / Scan Catalog Multi-Select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-800">
                اختر الفحوصات من الدليل الشامل
              </label>
              <DiagnosticServicePicker
                department={department}
                selectedServiceIds={selectedServiceIds}
                onToggleService={handleToggleService}
                customTests={customTests}
                onChangeCustomTests={setCustomTests}
                onClearSelected={() => setSelectedServiceIds([])}
              />
            </div>

            {/* Priority & Fee Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  أولوية الدور بالانتظار
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="normal">دور عادي</option>
                  <option value="urgent">طوارئ وعاجل</option>
                  <option value="elderly">كبار السن (60+)</option>
                  <option value="special_needs">أصحاب همم واحتياجات خاصة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرسوم الخيرية الإجمالية (ج.م)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={feeAmount}
                  onChange={e => setFeeAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-mono font-bold text-emerald-800 text-sm"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2 text-xs font-extrabold text-white rounded-xl shadow-xs cursor-pointer transition-colors ${
                  department === 'lab'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isSubmitting ? 'جاري الإصدار...' : 'إصدار التذكرة وتحصيل الرسوم'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
