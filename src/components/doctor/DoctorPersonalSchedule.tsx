import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Doctor, DoctorSchedule, DoctorDailyAttendance, AttendanceStatus } from '../../types';
import { dbService } from '../../lib/databaseService';
import { getTodayDateString } from '../../lib/mockData';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Calendar,
  Building2,
  DollarSign,
  Phone,
  UserCheck,
  Send,
  Timer,
  AlertTriangle,
  Info,
  RotateCcw,
} from 'lucide-react';

export const DoctorPersonalSchedule: React.FC = () => {
  const { currentUser, doctorId } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [attendance, setAttendance] = useState<DoctorDailyAttendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelayTime, setSelectedDelayTime] = useState('11:00');
  const [delayReason, setDelayReason] = useState('');
  const [showDelayInput, setShowDelayInput] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const todayStr = getTodayDateString();

  const loadDoctorData = async () => {
    if (!doctorId) return;
    setIsLoading(true);
    try {
      const [allDocs, allSchedules, todayAttendanceList] = await Promise.all([
        dbService.getDoctors(),
        dbService.getDoctorSchedules(),
        dbService.getInternalDoctorAttendance(todayStr),
      ]);

      const myDoc = allDocs.find(d => d.id === doctorId);
      setDoctor(myDoc || null);

      const mySchedules = allSchedules.filter(s => s.doctor_id === doctorId);
      setSchedules(mySchedules);

      const myAtt = todayAttendanceList.find(a => a.doctor_id === doctorId);
      setAttendance(myAtt || null);
    } catch (e) {
      console.error('Error loading doctor schedule:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();

    // Bidirectional real-time sync with reception and administration
    const handleAttendanceChange = (e: any) => {
      if (!e.detail?.doctorId || e.detail.doctorId === doctorId) {
        loadDoctorData();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hms_doctor_attendance') {
        loadDoctorData();
      }
    };

    window.addEventListener('hospital-attendance-updated', handleAttendanceChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('hospital-attendance-updated', handleAttendanceChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [doctorId]);

  const handleUpdateMyAttendance = async (
    status: AttendanceStatus,
    delayTime?: string | null,
    notes?: string | null
  ) => {
    if (!doctorId) return;
    setIsUpdating(true);
    setMessage(null);
    try {
      await dbService.updateDoctorAttendance(
        doctorId,
        todayStr,
        status,
        delayTime,
        notes,
        currentUser || undefined
      );

      setMessage({
        text:
          status === 'present'
            ? 'تم تأكيد حضورك بالعيادة اليوم بنجاح، وظهرت حالتك "حاضر بالعيادة" على شاشة الاستقبال وشاشات المرضى.'
            : status === 'delayed'
            ? `تم إبلاغ الاستقبال والمرضى بموعد وصولك المتوقع في تمام (${delayTime}).`
            : status === 'apologized'
            ? 'تم تسجيل اعتذارك عن الحضور اليوم وإبلاغ إدارة الاستقبال بالعيادات.'
            : status === 'unconfirmed'
            ? 'تم التراجع عن التحديد وإعادة حالتك إلى "غير مؤكد حتى الآن" بنجاح.'
            : 'تم تحديث الحالة بنجاح.',
        type: 'success',
      });

      await loadDoctorData();
      setShowDelayInput(false);
    } catch (err: any) {
      setMessage({
        text: err?.message || 'فشل تحديث الحالة، يرجى المحاولة مرة أخرى.',
        type: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status?: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            حاضر بالعيادة الآن
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Timer className="w-3.5 h-3.5 text-amber-600" />
            متأخر (متوقع وصولك: {attendance?.delay_expected_time || 'لاحقاً'})
          </span>
        );
      case 'apologized':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            معتذر عن حضور اليوم
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            لم تسجل تأكيد الحضور بعد اليوم
          </span>
        );
    }
  };

  const getDayArabic = (day: number | string) => {
    const numMap: Record<number, string> = {
      0: 'الأحد',
      1: 'الإثنين',
      2: 'الثلاثاء',
      3: 'الأربعاء',
      4: 'الخميس',
      5: 'الجمعة',
      6: 'السبت',
    };
    if (typeof day === 'number') return numMap[day] || `يوم ${day}`;
    const strMap: Record<string, string> = {
      Saturday: 'السبت',
      Sunday: 'الأحد',
      Monday: 'الإثنين',
      Tuesday: 'الثلاثاء',
      Wednesday: 'الأربعاء',
      Thursday: 'الخميس',
      Friday: 'الجمعة',
    };
    return strMap[day] || String(day);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500">جاري تحميل بيانات جدول العيادة وتأكيد الحضور...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Message */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Doctor Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{doctor?.full_name || currentUser?.full_name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  {doctor?.specialty_name || currentUser?.specialty_name || 'العيادة الخارجية'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{doctor?.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>رسوم الكشف: <strong>{doctor?.consultation_fee || 0} ج.م</strong></span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span>إعادة الاستشارة: <strong>{doctor?.followup_fee || 0} ج.م</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Attendance Action Card */}
      <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-blue-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-300" />
              <h3 className="text-base font-bold text-white">تسجيل حالة تواجدي بالعيادة اليوم</h3>
            </div>
            <p className="text-xs text-blue-200 mt-1">
              اليوم: {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-blue-800/60 flex items-center gap-2">
            <span className="text-xs text-blue-200 font-medium">حالتك الحالية المسجلة:</span>
            {getStatusBadge(attendance?.status)}
          </div>
        </div>

        {/* Quick Presence Buttons */}
        <div className="mt-5 space-y-4">
          <p className="text-xs text-blue-200">
            اضغط لتأكيد حالتك اليوم مباشرة، وسيتم تحديثها فورياً على شاشات الاستقبال والمرضى:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Present Button */}
            <button
              onClick={() => handleUpdateMyAttendance('present', null, 'حضر الطبيب بالعيادة')}
              disabled={isUpdating}
              className={`p-3.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                attendance?.status === 'present'
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg ring-2 ring-emerald-300'
                  : 'bg-emerald-950/60 hover:bg-emerald-800 border-emerald-700/80 text-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>أنا متواجد بالعيادة الآن (حاضر)</span>
            </button>

            {/* Delay Button */}
            <button
              onClick={() => setShowDelayInput(!showDelayInput)}
              disabled={isUpdating}
              className={`p-3.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                attendance?.status === 'delayed'
                  ? 'bg-amber-600 border-amber-400 text-white shadow-lg ring-2 ring-amber-300'
                  : 'bg-amber-950/60 hover:bg-amber-800 border-amber-700/80 text-amber-200'
              }`}
            >
              <Timer className="w-4 h-4 text-amber-300" />
              <span>سأتأخر عن الموعد (تحديد موعد وصول)</span>
            </button>

            {/* Apologized Button */}
            <button
              onClick={() => handleUpdateMyAttendance('apologized', null, 'اعتذار الطبيب عن عيادة اليوم')}
              disabled={isUpdating}
              className={`p-3.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                attendance?.status === 'apologized'
                  ? 'bg-rose-600 border-rose-400 text-white shadow-lg ring-2 ring-rose-300'
                  : 'bg-rose-950/60 hover:bg-rose-800 border-rose-700/80 text-rose-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-rose-300" />
              <span>اعتذار عن حضور عيادة اليوم</span>
            </button>
          </div>

          {/* Undo / Reset to Unconfirmed: Visible ONLY if a status is currently assigned */}
          {attendance && attendance.status !== 'unconfirmed' && (
            <button
              onClick={() => handleUpdateMyAttendance('unconfirmed', null, 'تراجع الطبيب عن التحديد')}
              disabled={isUpdating}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-950/60 hover:bg-slate-900 border border-slate-700/80 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="التراجع عن التحديد الحالي وإعادة حالتك لوضع غير مؤكد"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>تراجع عن التحديد (إعادة حالتي لوضع "غير مؤكد حتى الآن")</span>
            </button>
          )}

          {/* Delay Details Drawer */}
          {showDelayInput && (
            <div className="bg-slate-950/80 border border-amber-500/50 rounded-xl p-4 space-y-3 mt-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>حدد الوقت المتوقع لوصولك العيادة لإبلاغ المرضى بالصالة:</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="time"
                  value={selectedDelayTime}
                  onChange={e => setSelectedDelayTime(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-amber-500/50 rounded-lg text-white font-mono text-sm focus:outline-hidden"
                />

                <input
                  type="text"
                  value={delayReason}
                  onChange={e => setDelayReason(e.target.value)}
                  placeholder="ملاحظة أو سبب التأخير (اختياري)..."
                  className="flex-1 min-w-[200px] px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-hidden"
                />

                <button
                  onClick={() =>
                    handleUpdateMyAttendance(
                      'delayed',
                      selectedDelayTime,
                      delayReason || `متوقع وصول الطبيب في تمام ${selectedDelayTime}`
                    )
                  }
                  disabled={isUpdating}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  إرسال وإبلاغ الاستقبال
                </button>
              </div>
            </div>
          )}
          {/* Bidirectional Sync & Audit Status Box */}
          {attendance && attendance.status !== 'unconfirmed' && (
            <div className="bg-slate-950/70 border border-blue-700/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-blue-200">
                <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  آخر تحديث مسجل: <strong className="text-white">{attendance.updated_by_name || 'الاستقبال'}</strong>
                  {attendance.updated_at && (
                    <span className="text-blue-300 mr-2">
                      (الساعة {new Date(attendance.updated_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  )}
                </span>
              </div>
              {attendance.updated_by_name?.includes('الطبيب') ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/90 px-2.5 py-0.5 rounded-lg border border-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  مؤكد من قبلك شخصياً
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/90 px-2.5 py-0.5 rounded-lg border border-amber-600">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  مسجل بواسطة الاستقبال
                </span>
              )}
            </div>
          )}

          {/* Sync guarantee note */}
          <div className="flex items-center gap-2 text-[11px] text-blue-200/90 bg-blue-950/50 p-2.5 rounded-xl border border-blue-800/60">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>تزامن فوري بدون تضارب:</strong> أي تحديث تجريه هنا يظهر فوراً لموظف الاستقبال وعلى شاشات صالة الانتظار. كما أن أي تحديث يجريه الاستقبال ينعكس فوراً على شاشتك.
            </span>
          </div>
        </div>
      </div>

      {/* Doctor's Weekly Clinic Schedule */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">جدول ومواعيد عيادتي الأسبوعية المسجلة بالمستشفى</h3>
        </div>

        {schedules.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
            لم يتم إدخال جدول أسبوعي بعد لهذه العيادة. يمكنك طلب تحديثه من إدارة المستشفى.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {schedules.map(sch => {
              const dayAr = getDayArabic(sch.day_of_week);
              return (
                <div
                  key={sch.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-xs">{dayAr}</span>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      {sch.max_patients ? `حتى ${sch.max_patients} كشف` : 'عيادة كشف'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      من <strong>{sch.start_time}</strong> إلى <strong>{sch.end_time}</strong>
                    </span>
                  </div>
                  {sch.notes && (
                    <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-200/80 pt-1.5">
                      {sch.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            هذا الحساب مخصص حصرياً لك كطبيب، ولا يمكن لأي موظف آخر تعديل تشخيصاتك الطبية أو روشتاتك الخاصة.
          </span>
        </div>
      </div>
    </div>
  );
};
