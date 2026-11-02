import React, { useState, useEffect } from 'react';
import { Patient, Specialty, Doctor, BookingSource, PaymentStatus, PaymentMethod, VisitPriority } from '../../types';
import { dbService } from '../../lib/databaseService';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Calendar,
  Stethoscope,
  User,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Clock,
  DollarSign,
  Coins,
  CreditCard,
  Smartphone,
  HeartHandshake,
  MessageSquare,
  PhoneCall,
  Zap,
} from 'lucide-react';

interface VisitRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onVisitCreated: () => void;
}

export const VisitRegistrationModal: React.FC<VisitRegistrationModalProps> = ({
  isOpen,
  onClose,
  patient,
  onVisitCreated,
}) => {
  const { currentUser } = useAuth();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [visitType, setVisitType] = useState<'new' | 'follow_up'>('new');
  const [priority, setPriority] = useState<VisitPriority>('normal');
  const [notes, setNotes] = useState<string>('');
  const [bookingSource, setBookingSource] = useState<BookingSource>('in_person');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      // Auto-detect elderly if patient is 60+
      if (patient?.birth_date) {
        const birth = new Date(patient.birth_date);
        const age = new Date().getFullYear() - birth.getFullYear();
        if (age >= 60) {
          setPriority('elderly');
        } else {
          setPriority('normal');
        }
      } else {
        setPriority('normal');
      }

      Promise.all([
        dbService.getSpecialties(),
        dbService.getDoctors(),
        dbService.getInternalDoctorAttendance(visitDate),
      ]).then(([specs, docs, atts]) => {
        setSpecialties(specs);
        setAllDoctors(docs);
        setAttendanceList(atts);
        if (specs.length > 0) {
          setSelectedSpecialtyId(specs[0].id);
        }
      });
      setErrorMessage('');
    }
  }, [isOpen, visitDate, patient]);

  // Filter doctors strictly by the selected specialty
  const availableDoctors = allDoctors.filter(d => d.specialty_id === selectedSpecialtyId);

  useEffect(() => {
    if (availableDoctors.length > 0) {
      setSelectedDoctorId(availableDoctors[0].id);
    } else {
      setSelectedDoctorId('');
    }
  }, [selectedSpecialtyId, allDoctors]);

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedSpecialtyId || !selectedDoctorId) {
      setErrorMessage('يرجى اختيار العيادة التخصصية والطبيب.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.createVisit(
        {
          patient_id: patient.id,
          specialty_id: selectedSpecialtyId,
          doctor_id: selectedDoctorId,
          visit_date: visitDate,
          visit_type: visitType,
          priority: priority,
          reception_notes: notes,
          booking_source: bookingSource,
          payment_status: paymentStatus,
          payment_method: paymentStatus === 'paid' ? paymentMethod : paymentStatus === 'waived' ? 'charity' : undefined,
          payment_notes: paymentNotes.trim() || undefined,
        },
        currentUser || undefined
      );

      onVisitCreated();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر تسجيل الزيارة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDoctor = allDoctors.find(d => d.id === selectedDoctorId);

  // Auto-switch payment default when changing booking source
  const handleBookingSourceChange = (src: BookingSource) => {
    setBookingSource(src);
    if (src === 'whatsapp' || src === 'phone') {
      setPaymentStatus('unpaid');
    } else {
      setPaymentStatus('paid');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4 sm:mb-5 border-b border-slate-100 pb-3 pl-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md font-mono tabular-nums border border-teal-200/60">
              {patient.patient_number}
            </span>
            <span className="text-xs text-slate-500 font-semibold font-mono tabular-nums">{patient.phone}</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            تسجيل تذكرة كشف لـ {patient.full_name}
          </h3>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
          {/* Specialty Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              العيادة التخصصية المطلوبة <span className="text-rose-600">*</span>
            </label>
            <select
              value={selectedSpecialtyId}
              onChange={e => setSelectedSpecialtyId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 bg-white"
            >
              {specialties.map(spec => (
                <option key={spec.id} value={spec.id}>
                  عيادة {spec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Selection (Strictly filtered by specialty) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                الطبيب المعالج <span className="text-rose-600">*</span>
              </label>
              <span className="text-[10px] text-teal-700 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-teal-600" />
                <span>مرتبط بتخصص العيادة</span>
              </span>
            </div>

            {availableDoctors.length === 0 ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                لا يوجد أطباء مسجلين في هذا التخصص حالياً.
              </div>
            ) : (
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 bg-white font-medium"
              >
                {availableDoctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name} ({doc.title})
                  </option>
                ))}
              </select>
            )}

            {/* Real-time Doctor Attendance Status Indicator for Reception */}
            {selectedDoctor && (
              <div className="mt-2">
                {(() => {
                  const att = attendanceList.find(a => a.doctor_id === selectedDoctor.id);
                  if (att?.status === 'apologized') {
                    return (
                      <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>تنبيه للاستقبال: الطبيب مسجل اعتذار عن حضور عيادة هذا اليوم ({att.internal_notes || 'اعتذار رسمي'}).</span>
                      </div>
                    );
                  }
                  if (att?.status === 'delayed') {
                    return (
                      <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>تنبيه للاستقبال: الطبيب أبلغ بتأخره (موعد وصوله المتوقع: {att.delay_expected_time || '11:00'}).</span>
                      </div>
                    );
                  }
                  if (att?.status === 'present') {
                    return (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>الطبيب حاضر بالعيادة الآن وجاهز لاستقبال الكشف.</span>
                      </div>
                    );
                  }
                  return (
                    <div className="p-1.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>حالة حضور الطبيب لهذا اليوم: لم تؤكد بعد.</span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Visit Date & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                تاريخ الكشف
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={e => setVisitDate(e.target.value)}
                className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                نوع الزيارة
              </label>
              <select
                value={visitType}
                onChange={e => setVisitType(e.target.value as 'new' | 'follow_up')}
                className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 bg-white"
              >
                <option value="new">كشف جديد</option>
                <option value="follow_up">إعادة واستشارة</option>
              </select>
            </div>
          </div>

          {/* Priority & Triage Selection (الأولويات والحالات الإنسانية) */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-800">
                أولوية الكشف والحالات الإنسانية:
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                تحدد ترتيب النداء في طابور العيادة
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  priority === 'normal'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>عادي 🟢</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  priority === 'urgent'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs animate-pulse'
                    : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>حالة طارئة ⚡</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('elderly')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  priority === 'elderly'
                    ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                    : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                }`}
              >
                <span>👵 كبار السن</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('special_needs')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  priority === 'special_needs'
                    ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                }`}
              >
                <span>♿ أصحاب الهمم</span>
              </button>
            </div>
          </div>

          {/* Consultation Fee Display & Booking Source */}
          <div className="space-y-3">
            {/* Booking Source Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                مصدر حجز التذكرة <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleBookingSourceChange('in_person')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    bookingSource === 'in_person'
                      ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>شباك الاستقبال</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBookingSourceChange('whatsapp')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    bookingSource === 'whatsapp'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>واتساب (WhatsApp)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBookingSourceChange('phone')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    bookingSource === 'phone'
                      ? 'bg-blue-700 text-white border-blue-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                  <span>اتصال هاتفي</span>
                </button>
              </div>
            </div>

            {/* Consultation Fee Box */}
            {selectedDoctor && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-slate-700 font-semibold block">
                    {visitType === 'follow_up' ? 'رسوم الإعادة والاستشارة المقررة:' : 'رسوم الكشف الجديد المقررة:'}
                  </span>
                  <span className="text-[11px] text-teal-700 font-medium">
                    {visitType === 'follow_up'
                      ? `(تسعيرة مخفضة لإعادة الكشف والاستشارة)`
                      : `(تسعيرة كشف جديد)`}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-base font-extrabold text-teal-800 font-mono tabular-nums">
                    {visitType === 'follow_up'
                      ? (selectedDoctor.followup_fee !== undefined ? selectedDoctor.followup_fee : Math.round(selectedDoctor.consultation_fee / 2))
                      : selectedDoctor.consultation_fee}{' '}
                    ج.م
                  </span>
                  {visitType === 'follow_up' && (
                    <span className="block text-[10px] text-slate-400 line-through font-mono">
                      الكشف: {selectedDoctor.consultation_fee} ج.م
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Financial Collection Options */}
            <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-teal-700" />
                  <span>تأكيد سداد الرسوم بالخزينة</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {bookingSource !== 'in_person' ? 'حجز عن بُعد (افتراضياً: سداد عند الحضور)' : 'شباك (سداد فوري)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('paid')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                    paymentStatus === 'paid'
                      ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 mb-0.5" />
                  <span>سداد فوري الآن</span>
                  <span className={`text-[10px] font-normal ${paymentStatus === 'paid' ? 'text-teal-100' : 'text-slate-400'}`}>
                    إصدار إيصال تحصيل
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentStatus('unpaid')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                    paymentStatus === 'unpaid'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4 mb-0.5" />
                  <span>سداد عند الحضور</span>
                  <span className={`text-[10px] font-normal ${paymentStatus === 'unpaid' ? 'text-amber-100' : 'text-slate-400'}`}>
                    حجز مسبق معلق
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentStatus('waived')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                    paymentStatus === 'waived'
                      ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4 mb-0.5" />
                  <span>إعفاء خيري</span>
                  <span className={`text-[10px] font-normal ${paymentStatus === 'waived' ? 'text-purple-100' : 'text-slate-400'}`}>
                    لجنة الزكاة
                  </span>
                </button>
              </div>

              {/* Payment Methods (If Paid Now) */}
              {paymentStatus === 'paid' && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    طريقة السداد المستلمة:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        paymentMethod === 'cash'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      كاش (نقدي)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('vodafone_cash')}
                      className={`p-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        paymentMethod === 'vodafone_cash'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      فودافون كاش
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('instapay')}
                      className={`p-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        paymentMethod === 'instapay'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      إنستاباي
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('visa')}
                      className={`p-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        paymentMethod === 'visa'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      فيزا / كارت
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reception Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ملاحظات الاستقبال (اختياري)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: قياس الضغط 120/80، شكوى من ألم بالركبة..."
              className="w-full px-3 py-2.5 text-xs sm:text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-xl cursor-pointer order-2 sm:order-1"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableDoctors.length === 0}
              className="min-h-[44px] px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 rounded-xl transition-colors cursor-pointer disabled:opacity-50 order-1 sm:order-2 shadow-xs"
            >
              {isSubmitting ? 'جاري التأكيد والتسجيل...' : 'تسجيل وحفظ الكشف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
