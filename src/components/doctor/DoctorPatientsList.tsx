import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PatientVisit, Patient, Doctor } from '../../types';
import { dbService } from '../../lib/databaseService';
import {
  Users,
  Search,
  FileText,
  Printer,
  Calendar,
  Clock,
  Phone,
  Pill,
  CheckCircle2,
  Stethoscope,
  Activity,
  History,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';

export const DoctorPatientsList: React.FC = () => {
  const { currentUser, doctorId } = useAuth();
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'today' | 'completed' | 'new' | 'follow_up'>('all');
  const [selectedVisitForPrint, setSelectedVisitForPrint] = useState<PatientVisit | null>(null);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const getPatientAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? `${age} سنة` : 'أقل من سنة';
  };

  const loadData = async () => {
    if (!doctorId) return;
    setIsLoading(true);
    try {
      const [allVisits, allPatients, allDocs] = await Promise.all([
        dbService.getVisits(undefined, undefined, doctorId),
        dbService.getPatients(),
        dbService.getDoctors(),
      ]);

      setVisits(allVisits);
      setPatients(allPatients);
      const myDoc = allDocs.find(d => d.id === doctorId);
      setDoctor(myDoc || null);
    } catch (e) {
      console.error('Error loading doctor patient history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleVisitUpdate = () => {
      loadData();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hms_patient_visits') {
        loadData();
      }
    };

    window.addEventListener('hospital-visit-updated', handleVisitUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('hospital-visit-updated', handleVisitUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [doctorId]);

  // Derived metrics
  const uniquePatientsCount = new Set(visits.map(v => v.patient_id)).size;
  const completedVisitsCount = visits.filter(v => v.status === 'completed').length;
  const todayVisitsCount = visits.filter(v => v.visit_date === todayStr).length;

  const filteredVisits = visits.filter(v => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matches =
        v.patient_name?.toLowerCase().includes(q) ||
        v.patient_number?.toLowerCase().includes(q) ||
        v.patient_phone?.includes(q) ||
        v.diagnosis?.toLowerCase().includes(q) ||
        v.prescription?.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // 2. Status / Category Filter
    if (statusFilter === 'today') return v.visit_date === todayStr;
    if (statusFilter === 'completed') return v.status === 'completed';
    if (statusFilter === 'new') return v.visit_type === 'new';
    if (statusFilter === 'follow_up') return v.visit_type === 'follow_up';

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  سجل مرضى وكشوفات {doctor?.full_name || currentUser?.full_name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  {doctor?.specialty_name || 'العيادة الخارجية'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                الأرشيف الطبي المباشر والتاريخ المرضي الكامل للحالات المسجلة والمفحوصة بعيادتك الخاصة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>مربوط تلقائياً مع طابور الكشف والاستقبال</span>
          </div>
        </div>

        {/* 4 Analytics Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">إجمالي الكشوفات المسجلة</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">{visits.length}</span>
          </div>
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80">
            <span className="text-[11px] font-semibold text-blue-700 block">المرضى الفعليين (ملفات مستقلة)</span>
            <span className="text-xl font-bold text-blue-950 font-mono mt-0.5 block">{uniquePatientsCount}</span>
          </div>
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
            <span className="text-[11px] font-semibold text-emerald-700 block">كشوفات مكتملة مع روشتة</span>
            <span className="text-xl font-bold text-emerald-950 font-mono mt-0.5 block">{completedVisitsCount}</span>
          </div>
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
            <span className="text-[11px] font-semibold text-amber-700 block">كشوفات وحجوزات اليوم</span>
            <span className="text-xl font-bold text-amber-950 font-mono mt-0.5 block">{todayVisitsCount}</span>
          </div>
        </div>

        {/* Filter Tabs & Search Row */}
        <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            {[
              { id: 'all', label: 'كافة الكشوفات', count: visits.length },
              { id: 'today', label: 'كشوفات اليوم', count: todayVisitsCount },
              { id: 'completed', label: 'مكتمل وله روشتة', count: completedVisitsCount },
              { id: 'new', label: 'كشف جديد', count: visits.filter(v => v.visit_type === 'new').length },
              { id: 'follow_up', label: 'إعادة واستشارة', count: visits.filter(v => v.visit_type === 'follow_up').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
                    statusFilter === tab.id ? 'bg-white/20 text-white font-extrabold' : 'bg-white text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 md:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، الملف، الهاتف، أو الدواء..."
              className="w-full pr-9 pl-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-600 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* Patient Visits List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span>قائمة كشوفات وتشخيصات المرضى المطابقة ({filteredVisits.length})</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            تحديث تلقائي لحظي مع غرفة الكشف والاستقبال
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            جاري تحميل سجلات العيادة...
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">لا توجد سجلات مطابقة للبحث</p>
            <p className="text-[11px] text-slate-400 mt-1">
              ستظهر هنا جميع الحالات التي يتم حجزها أو الكشف عليها في عيادتك الخاصة
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredVisits.map(visit => {
              const isExpanded = expandedVisitId === visit.id;
              const pat = patients.find(p => p.id === visit.patient_id);
              const patientAge = getPatientAge(pat?.birth_date);
              const totalPatientVisits = visits.filter(v => v.patient_id === visit.patient_id).length;

              return (
                <div key={visit.id} className="p-4 hover:bg-slate-50/80 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100 mt-0.5">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">{visit.patient_name}</h4>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-sm">
                            {visit.patient_number}
                          </span>
                          {patientAge && (
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                              {patientAge}
                            </span>
                          )}
                          {pat?.blood_type && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-sm">
                              {pat.blood_type}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              visit.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : visit.status === 'in_consultation'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {visit.status === 'completed'
                              ? 'تم الكشف'
                              : visit.status === 'in_consultation'
                              ? 'قيد الفحص'
                              : 'في الانتظار'}
                          </span>
                          <span className="text-[10px] bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                            {totalPatientVisits > 1 ? `الزيارة رقم (${totalPatientVisits}) للمريض` : 'أول زيارة للعيادة'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            تاريخ الكشف: <strong>{visit.visit_date}</strong>
                          </span>
                          {visit.patient_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span dir="ltr">{visit.patient_phone}</span>
                            </span>
                          )}
                          <span className="text-slate-500">
                            نوع الحجز: <strong>{visit.visit_type === 'new' ? 'كشف جديد' : 'إعادة واستشارة'}</strong>
                          </span>
                          {visit.revisit_recommended && visit.follow_up_date && (
                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-semibold text-[11px] border border-blue-200">
                              📅 موعد الإعادة المقترح: {visit.follow_up_date}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)}
                        className="px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'إخفاء التفاصيل' : 'التشخيص والروشتة'}</span>
                      </button>

                      {visit.prescription && (
                        <button
                          onClick={() => setSelectedVisitForPrint(visit)}
                          className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-900 text-white rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          title="طباعة الروشتة"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Medical Diagnosis Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 bg-blue-50/40 p-4 rounded-xl animate-in fade-in">
                      {visit.diagnosis ? (
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 block mb-1">
                            التشخيص الطبي المسجل:
                          </span>
                          <div className="p-2.5 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-blue-950">
                            {visit.diagnosis}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">لم يتم تسجيل تشخيص بعد لهذه الزيارة.</p>
                      )}

                      {visit.symptoms && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 block mb-1">الشكوى والأعراض:</span>
                          <div className="p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700">
                            {visit.symptoms}
                          </div>
                        </div>
                      )}

                      {visit.prescription && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                            <Pill className="w-3.5 h-3.5 text-teal-600" />
                            <span>العلاج والروشتة المصروفة:</span>
                          </span>
                          <pre className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {visit.prescription}
                          </pre>
                        </div>
                      )}

                      {visit.tests_requested && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 block mb-1">الفحوصات والتحاليل المطلوبة:</span>
                          <div className="p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700">
                            {visit.tests_requested}
                          </div>
                        </div>
                      )}

                      {visit.doctor_notes && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-700 block mb-1">تعليمات وإرشادات الطبيب للمريض:</span>
                          <div className="p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700">
                            {visit.doctor_notes}
                          </div>
                        </div>
                      )}

                      {pat?.notes && (
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 block mb-1">ملاحظات الملف الطبي الدائم للمريض:</span>
                          <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600">
                            {pat.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prescription Print Modal */}
      {selectedVisitForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedVisitForPrint(null)}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Official Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
              <h3 className="font-extrabold text-base text-slate-900">مستشفى ميت علي التخصصي</h3>
              <p className="text-xs text-slate-600 mt-0.5">العيادات الخارجية التخصصية • قسم {doctor?.specialty_name || 'الباطنة'}</p>
              <div className="mt-2 text-xs font-bold text-blue-900 bg-blue-50 py-1 rounded-lg">
                روشتة طبية معتمدة — {doctor?.full_name || currentUser?.full_name} ({doctor?.title})
              </div>
            </div>

            {/* Patient Info with age, gender, blood type */}
            {(() => {
              const printPat = patients.find(p => p.id === selectedVisitForPrint.patient_id);
              const printAge = getPatientAge(printPat?.birth_date);

              return (
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg mb-4">
                  <div>
                    <span className="text-slate-500">اسم المريض: </span>
                    <strong className="text-slate-900">{selectedVisitForPrint.patient_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">رقم الملف: </span>
                    <span className="font-mono font-bold text-slate-900">{selectedVisitForPrint.patient_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">السن / النوع: </span>
                    <span className="font-semibold text-slate-800">
                      {printAge ? `${printAge}` : 'غير محدد'} {printPat?.gender === 'female' ? '(أنثى)' : printPat?.gender === 'male' ? '(ذكر)' : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">فصيلة الدم: </span>
                    <span className="font-mono font-bold text-rose-700">{printPat?.blood_type || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">تاريخ الكشف: </span>
                    <span>{selectedVisitForPrint.visit_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">التشخيص: </span>
                    <span className="font-semibold text-slate-900">{selectedVisitForPrint.diagnosis || 'فحص بالعيادة'}</span>
                  </div>
                </div>
              );
            })()}

            {/* Prescription Content */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white mb-4">
              <div className="text-lg font-serif italic text-blue-700 font-bold mb-2">Rx:</div>
              <pre className="text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed">
                {selectedVisitForPrint.prescription}
              </pre>

              {selectedVisitForPrint.tests_requested && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700">الفحوصات المطلوبة:</span>
                  <p className="text-xs text-slate-600 mt-0.5">{selectedVisitForPrint.tests_requested}</p>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-[10px] text-slate-400">
                توقيع الطبيب المعالج: .......................................
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الروشتة</span>
                </button>
                <button
                  onClick={() => setSelectedVisitForPrint(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
