import React, { useState, useEffect } from 'react';
import { PatientVisit, VisitStatus } from '../../types';
import { dbService } from '../../lib/databaseService';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  UserCheck,
  Filter,
  RefreshCw,
  AlertTriangle,
  X,
  FileText,
  Stethoscope,
  Activity,
  Bell,
  Coins,
  DollarSign,
  CreditCard,
  Printer,
  Smartphone,
  HeartHandshake,
  MessageSquare,
  PhoneCall,
  User,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Ticket,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { ConfirmPaymentModal } from './ConfirmPaymentModal';
import { VisitReceiptModal } from './VisitReceiptModal';
import { PatientNotificationModal } from './PatientNotificationModal';
import { ThermalQueueTicketModal } from './ThermalQueueTicketModal';

export const VisitsManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentTabFilter, setPaymentTabFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [liveCallNotification, setLiveCallNotification] = useState<{
    patientName?: string;
    doctorName?: string;
    status?: string;
  } | null>(null);

  // Financial Payment & Receipt Modals State
  const [paymentModalVisit, setPaymentModalVisit] = useState<PatientVisit | null>(null);
  const [receiptModalVisit, setReceiptModalVisit] = useState<PatientVisit | null>(null);

  // Priority Filter & Notification/Thermal Modals State (Reception: Ticket & Receipt only)
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [notificationModalVisit, setNotificationModalVisit] = useState<PatientVisit | null>(null);
  const [notificationModalTab, setNotificationModalTab] = useState<'ticket' | 'receipt'>('ticket');
  const [thermalTicketVisit, setThermalTicketVisit] = useState<PatientVisit | null>(null);

  // Cancellation Reason Modal State
  const [cancellingVisit, setCancellingVisit] = useState<PatientVisit | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Completion Confirmation Modal State
  const [completingVisit, setCompletingVisit] = useState<PatientVisit | null>(null);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);

  const QUICK_CANCELLATION_REASONS = [
    'اعتذار المريض لظرف طارئ',
    'تأخر أو اعتذار الطبيب المعالج',
    'تغيير الموعد / تحويل ليوم آخر',
    'تسجيل الكشف بالخطأ بالاستقبال',
    'عدم حضور المريض بعد النداء المتكرر',
    'تحويل المريض للقسم الداخلي / الطوارئ',
  ];

  const fetchVisits = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getVisits(undefined, selectedDate);
      setVisits(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();

    // Listen to real-time visit updates (when doctor calls patient or saves diagnosis)
    const handleVisitUpdate = (e: any) => {
      fetchVisits();
      if (e.detail?.status === 'in_consultation') {
        setLiveCallNotification({
          patientName: e.detail?.patientName,
          doctorName: e.detail?.doctorName,
          status: 'in_consultation',
        });
        setTimeout(() => setLiveCallNotification(null), 7000);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hms_patient_visits') {
        fetchVisits();
      }
    };

    window.addEventListener('hospital-visit-updated', handleVisitUpdate);
    window.addEventListener('storage', handleStorage);

    // Multi-device polling heartbeat
    const pollInterval = setInterval(() => {
      fetchVisits();
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('hospital-visit-updated', handleVisitUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [selectedDate]);

  const handleStatusChange = async (
    visitId: string,
    newStatus: VisitStatus,
    reason?: string
  ) => {
    try {
      await dbService.updateVisitStatus(
        visitId,
        newStatus,
        undefined,
        currentUser || undefined,
        reason
      );
      await fetchVisits();
    } catch (err: any) {
      alert(err?.message || 'فشل تحديث حالة الزيارة');
    }
  };

  const handleConfirmCancellation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cancellingVisit) return;
    if (!cancellationReason.trim()) {
      alert('يرجى تحديد أو كتابة سبب إلغاء الزيارة.');
      return;
    }

    setIsCancelling(true);
    try {
      if (cancellingVisit.payment_status === 'paid') {
        await dbService.refundVisitPayment(
          cancellingVisit.id,
          cancellationReason.trim(),
          currentUser || undefined
        );
      } else {
        await handleStatusChange(
          cancellingVisit.id,
          'cancelled',
          cancellationReason.trim()
        );
      }
      setCancellingVisit(null);
      setCancellationReason('');
      await fetchVisits();
    } catch (err: any) {
      alert(err?.message || 'فشل إلغاء الزيارة.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!completingVisit) return;
    if (completingVisit.payment_status === 'unpaid') {
      alert('⚠️ عفواً، لا يمكن إتمام الكشف الطبي لمريض لم يسدد رسوم الكشف بالخزينة بعد.\nيرجى تحصيل الرسوم أولاً.');
      return;
    }
    if (completingVisit.status === 'registered') {
      alert('⚠️ عفواً، لا يمكن إتمام الكشف الطبي لمريض لم يسجل حضوره بالصالة بعد.\nيرجى تسجيل حضور المريض أولاً.');
      return;
    }
    setIsCompleting(true);
    try {
      await handleStatusChange(completingVisit.id, 'completed');
      setCompletingVisit(null);
    } catch (err: any) {
      alert(err?.message || 'فشل تأكيد اكتمال الكشف.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Financial Quick Calculations for Today
  const todayPaidVisits = visits.filter(v => v.payment_status === 'paid');
  const todayTotalRevenue = todayPaidVisits.reduce((acc, v) => acc + (v.paid_amount || v.fee_amount || 40), 0);
  const todayCashRevenue = todayPaidVisits
    .filter(v => v.payment_method === 'cash' || !v.payment_method)
    .reduce((acc, v) => acc + (v.paid_amount || v.fee_amount || 40), 0);
  const todayUnpaidCount = visits.filter(v => v.payment_status === 'unpaid' && v.status !== 'cancelled').length;
  const todayWaivedCount = visits.filter(v => v.payment_status === 'waived').length;

  const registeredCount = visits.filter(v => v.status === 'registered').length;
  const attendedCount = visits.filter(v => v.status === 'attended').length;
  const inConsultationCount = visits.filter(v => v.status === 'in_consultation').length;
  const completedCount = visits.filter(v => v.status === 'completed').length;
  const cancelledCount = visits.filter(v => v.status === 'cancelled').length;

  const humanitarianCount = visits.filter(v => v.priority && v.priority !== 'normal').length;
  const urgentCount = visits.filter(v => v.priority === 'urgent').length;
  const elderlyCount = visits.filter(v => v.priority === 'elderly').length;
  const specialNeedsCount = visits.filter(v => v.priority === 'special_needs').length;

  const filteredVisits = visits.filter(v => {
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchesPayment =
      paymentTabFilter === 'all' ||
      (paymentTabFilter === 'paid' && v.payment_status === 'paid') ||
      (paymentTabFilter === 'unpaid' && v.payment_status === 'unpaid' && v.status !== 'cancelled') ||
      (paymentTabFilter === 'waived' && v.payment_status === 'waived');

    const matchesPriority =
      priorityFilter === 'all' ||
      (priorityFilter === 'urgent' && v.priority === 'urgent') ||
      (priorityFilter === 'elderly' && v.priority === 'elderly') ||
      (priorityFilter === 'special_needs' && v.priority === 'special_needs') ||
      (priorityFilter === 'humanitarian' && (v.priority === 'urgent' || v.priority === 'elderly' || v.priority === 'special_needs'));

    const matchesSearch =
      !searchQuery.trim() ||
      v.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.patient_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.specialty_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.payment_receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.cancellation_reason && v.cancellation_reason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesPayment && matchesPriority && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Top Banner: Date & Title */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">إدارة زيارات وحالات الكشوفات بالاستقبال</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة حركة المرضى، إثبات تحصيل الرسوم بالخزينة، وتحديث مسار الكشف اللحظي.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">تاريخ الكشف:</span>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-slate-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 cursor-pointer focus:outline-hidden"
            />
          </div>

          <button
            onClick={fetchVisits}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer border border-slate-200"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cashier & Payments Quick Strip for Reception */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-800/80 text-teal-200 flex items-center justify-center shrink-0 border border-teal-700/60">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">حركة خزينة الاستقبال لليوم</h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                {selectedDate}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              متابعة الإيصالات المحصلة فورياً والتذاكر المعلقة بانتظار السداد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-center min-w-28">
            <span className="text-[10px] text-slate-300 block">إجمالي متحصلات اليوم:</span>
            <span className="text-base font-black font-mono text-emerald-400">
              {todayTotalRevenue.toFixed(2)} ج.م
            </span>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-center min-w-28">
            <span className="text-[10px] text-slate-300 block">كاش بالدرج:</span>
            <span className="text-base font-black font-mono text-teal-300">
              {todayCashRevenue.toFixed(2)} ج.م
            </span>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-center">
            <span className="text-[10px] text-slate-300 block">تذاكر مسددة:</span>
            <span className="text-base font-black font-mono text-emerald-300">
              {todayPaidVisits.length}
            </span>
          </div>

          {todayUnpaidCount > 0 ? (
            <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl px-3 py-1.5 text-center animate-pulse">
              <span className="text-[10px] text-amber-300 block font-bold">بانتظار السداد:</span>
              <span className="text-base font-black font-mono text-amber-400">
                {todayUnpaidCount} تذكرة
              </span>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5 text-center">
              <span className="text-[10px] text-emerald-300 block font-medium">حالة السداد:</span>
              <span className="text-xs font-bold text-emerald-400">كافة التذاكر مسددة</span>
            </div>
          )}
        </div>
      </div>

      {/* Live Call Notification Alert Banner for Reception */}
      {liveCallNotification && (
        <div className="bg-purple-900 text-white p-3.5 rounded-xl border border-purple-700 shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-purple-700/80 flex items-center justify-center text-purple-200 shrink-0">
              <Bell className="w-4 h-4 animate-bounce" />
            </span>
            <div>
              <p className="text-xs font-bold text-white">
                تنبيه نداء كشف مباشر: دخل المريض {liveCallNotification.patientName ? `(${liveCallNotification.patientName})` : ''} إلى غرفة الطبيب الآن!
              </p>
              <p className="text-[11px] text-purple-200">
                {liveCallNotification.doctorName ? `مع: ${liveCallNotification.doctorName}` : ''} • تحولت الحالة تلقائياً على شاشتك إلى "داخل الكشف مع الطبيب الآن".
              </p>
            </div>
          </div>
          <button
            onClick={() => setLiveCallNotification(null)}
            className="text-purple-300 hover:text-white text-xs px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          RECEPTION VISITS & QUEUE FILTER CONTROL PANEL (قوائم منسدلة منظمة ومدمجة)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3.5">
        {/* Row 1: Search Input & Matches Status & Reset */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث باسم المريض، رقم الملف، الطبيب، العيادة، أو الإيصال..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2 bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                title="مسح نص البحث"
              >
                ✕
              </button>
            )}
          </div>

          {/* Matches Counter & Reset Button */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs whitespace-nowrap shadow-2xs">
              عرض {filteredVisits.length} من أصل {visits.length} كشف
            </span>

            {(statusFilter !== 'all' || paymentTabFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setPaymentTabFilter('all');
                  setPriorityFilter('all');
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                title="إلغاء كافة شروط التصفية والبحث"
              >
                <span>إلغاء الفلاتر</span>
                <span className="text-[10px]">✕</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Dropdowns Filter Grid (3 Dropdown Selects: Status, Payment, Priority) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          {/* Dropdown 1: Visit Flow & Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-teal-700" />
              <span>مسار وحالة الكشف:</span>
            </label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className={`w-full py-2.5 pr-3 pl-8 text-xs font-bold rounded-xl border transition-all cursor-pointer appearance-none bg-white ${
                  statusFilter !== 'all'
                    ? 'border-teal-600 ring-1 ring-teal-600/30 text-teal-900 bg-teal-50/40'
                    : 'border-slate-300 text-slate-800 hover:border-slate-400'
                }`}
              >
                <option value="all">كافة مسارات الكشف ({visits.length})</option>
                <option value="registered">📋 مسجلة بالانتظار ({registeredCount})</option>
                <option value="attended">🟢 حضر بالصالة (جاهز) ({attendedCount})</option>
                <option value="in_consultation">🩺 داخل الكشف مع الطبيب ({inConsultationCount})</option>
                <option value="completed">✅ اكتمل الكشف ({completedCount})</option>
                <option value="cancelled">❌ كشوفات ملغاة ({cancelledCount})</option>
              </select>
              <div className="pointer-events-none absolute left-2.5 top-3 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Dropdown 2: Payment Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-teal-700" />
              <span>التحصيل المالي بالخزينة:</span>
            </label>
            <div className="relative">
              <select
                value={paymentTabFilter}
                onChange={e => setPaymentTabFilter(e.target.value)}
                className={`w-full py-2.5 pr-3 pl-8 text-xs font-bold rounded-xl border transition-all cursor-pointer appearance-none bg-white ${
                  paymentTabFilter !== 'all'
                    ? 'border-teal-600 ring-1 ring-teal-600/30 text-teal-900 bg-teal-50/40'
                    : 'border-slate-300 text-slate-800 hover:border-slate-400'
                }`}
              >
                <option value="all">كافة الحالات المالية ({visits.length})</option>
                <option value="paid">🟢 مسدد بالخزينة ({todayPaidVisits.length})</option>
                <option value="unpaid">⚠️ معلق السداد ({todayUnpaidCount})</option>
                <option value="waived">🤝 إعفاء خيري معتمد ({todayWaivedCount})</option>
              </select>
              <div className="pointer-events-none absolute left-2.5 top-3 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Dropdown 3: Priority & Humanitarian */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>أولوية ورعاية الحالة:</span>
            </label>
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className={`w-full py-2.5 pr-3 pl-8 text-xs font-bold rounded-xl border transition-all cursor-pointer appearance-none bg-white ${
                  priorityFilter !== 'all'
                    ? 'border-amber-500 ring-1 ring-amber-500/30 text-amber-950 bg-amber-50/40'
                    : 'border-slate-300 text-slate-800 hover:border-slate-400'
                }`}
              >
                <option value="all">كافة الأولويات ({visits.length})</option>
                <option value="humanitarian">❤️ حالات خاصة وإنسانية ({humanitarianCount})</option>
                <option value="urgent">⚡ طوارئ وحالات مستعجلة ({urgentCount})</option>
                <option value="elderly">👵 كبار السن ({elderlyCount})</option>
                <option value="special_needs">♿ أصحاب الهمم ({specialNeedsCount})</option>
              </select>
              <div className="pointer-events-none absolute left-2.5 top-3 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          UNIFIED RESPONSIVE VISITS CARDS GRID (Mobile, Tablet, Desktop)
          Replaces clumsy table with modern, responsive status cards
         ========================================================================= */}
      {filteredVisits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-400 space-y-3">
          <p className="text-sm text-slate-600 font-medium">
            {isLoading ? 'جاري تحميل زيارات اليوم...' : 'لا توجد زيارات مسجلة لهذا التاريخ أو الفلتر المحدد'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold rounded-xl border border-teal-200 cursor-pointer text-xs transition-colors"
            >
              إلغاء التصفية والبحث
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
          {filteredVisits.map(v => (
            <div
              key={v.id}
              className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                v.priority === 'urgent'
                  ? 'bg-rose-50/20 border-2 border-rose-300 ring-2 ring-rose-400/20 shadow-md'
                  : v.priority === 'elderly'
                  ? 'bg-purple-50/15 border border-purple-200/90 shadow-xs hover:border-purple-300'
                  : v.priority === 'special_needs'
                  ? 'bg-blue-50/15 border border-blue-200/90 shadow-xs hover:border-blue-300'
                  : 'bg-white border-slate-200/90 hover:border-teal-300 shadow-xs hover:shadow-md'
              }`}
            >
              {/* Card Body */}
              <div className="p-4 sm:p-4.5 space-y-3.5">
                {/* Header: File Number, Type, & Status */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg tabular-nums border border-teal-200/70">
                      ملف: {v.patient_number}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {v.visit_type === 'new' ? 'كشف جديد' : 'إعادة/استشارة'}
                    </span>
                    {/* Priority Tag */}
                    {v.priority === 'urgent' && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black animate-pulse flex items-center gap-1 shadow-2xs">
                        <Zap className="w-3 h-3 text-amber-300" />
                        <span>طوارئ ⚡</span>
                      </span>
                    )}
                    {v.priority === 'elderly' && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold">
                        <span>👵 كبار السن</span>
                      </span>
                    )}
                    {v.priority === 'special_needs' && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200 text-[10px] font-bold">
                        <span>♿ أصحاب الهمم</span>
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                      v.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : v.status === 'in_consultation'
                        ? 'bg-purple-100 text-purple-900 border border-purple-300 ring-2 ring-purple-400/40 animate-pulse'
                        : v.status === 'attended'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : v.status === 'cancelled'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {v.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                    {v.status === 'in_consultation' && <Stethoscope className="w-3.5 h-3.5 text-purple-700 animate-bounce" />}
                    {v.status === 'attended' && <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                    {v.status === 'cancelled' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                    {v.status === 'registered' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                    <span>
                      {v.status === 'completed'
                        ? 'اكتملت الزيارة'
                        : v.status === 'in_consultation'
                        ? 'داخل الكشف مع الطبيب الآن'
                        : v.status === 'attended'
                        ? 'حضر بالعيادة'
                        : v.status === 'cancelled'
                        ? 'أُلغيت'
                        : 'مسجلة بالاستقبال'}
                    </span>
                  </span>
                </div>

                {/* Booking Source & Payment Status Strip */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Booking Source Badge */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                      {v.booking_source === 'whatsapp' ? (
                        <>
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>حجز واتساب</span>
                        </>
                      ) : v.booking_source === 'phone' ? (
                        <>
                          <PhoneCall className="w-3 h-3 text-blue-600" />
                          <span>حجز هاتفي</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 text-slate-600" />
                          <span>شباك الاستقبال</span>
                        </>
                      )}
                    </span>

                    {/* Payment Status Badge */}
                    {v.payment_status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>مسدد {v.paid_amount || v.fee_amount || 40} ج ({v.payment_method === 'cash' ? 'كاش' : v.payment_method === 'vodafone_cash' ? 'فودافون كاش' : v.payment_method === 'instapay' ? 'إنستاباي' : v.payment_method === 'visa' ? 'فيزا' : 'نقدي'})</span>
                      </span>
                    ) : v.payment_status === 'waived' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                        <HeartHandshake className="w-3 h-3 text-purple-700" />
                        <span>إعفاء خيري</span>
                      </span>
                    ) : v.payment_status === 'refunded' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                        <RotateCcw className="w-3 h-3 text-rose-700" />
                        <span>مسترد</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 animate-pulse">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        <span>غير مسدد ({v.fee_amount || (v.visit_type === 'follow_up' ? 20 : 40)} ج)</span>
                      </span>
                    )}
                  </div>

                  {/* Actions for WhatsApp / Ticket / Receipt */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* WhatsApp Action Button (Reception: Ticket & Receipt only) */}
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationModalVisit(v);
                        setNotificationModalTab(v.payment_status === 'paid' ? 'receipt' : 'ticket');
                      }}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-200 cursor-pointer flex items-center gap-1 transition-all"
                      title="إرسال تذكرة الدور أو إيصال السداد للمريض عبر الواتساب"
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-600" />
                      <span>واتساب</span>
                    </button>

                    {/* Thermal Queue Ticket Print */}
                    <button
                      type="button"
                      onClick={() => setThermalTicketVisit(v)}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border border-slate-300 cursor-pointer flex items-center gap-1 transition-all"
                      title="طباعة كارت الدور الحراري للعيادة"
                    >
                      <Ticket className="w-3 h-3 text-teal-600" />
                      <span>كارت الدور</span>
                    </button>

                    {/* Actions for Payment / Receipt */}
                    {v.payment_status === 'paid' ? (
                      <button
                        type="button"
                        onClick={() => setReceiptModalVisit(v)}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer flex items-center gap-1 transition-colors"
                        title="طباعة إيصال السداد المالي"
                      >
                        <Printer className="w-3 h-3 text-teal-600" />
                        <span>إيصال ({v.payment_receipt_number || 'طباعة'})</span>
                      </button>
                    ) : v.payment_status === 'unpaid' && v.status !== 'cancelled' ? (
                      <button
                        type="button"
                        onClick={() => setPaymentModalVisit(v)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-700 active:scale-95 text-white cursor-pointer flex items-center gap-1 shadow-2xs transition-all"
                        title="استلام رسوم الكشف وإصدار إيصال"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>تحصيل الرسوم</span>
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Patient Information & Direct Phone */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug truncate" title={v.patient_name}>
                      {v.patient_name}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-teal-800">عيادة {v.specialty_name}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600 truncate">{v.doctor_name}</span>
                    </div>
                  </div>

                  {v.patient_phone && (
                    <a
                      href={`tel:${v.patient_phone}`}
                      className="flex items-center gap-1 text-xs font-mono font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 active:bg-teal-200 px-2.5 py-1.5 rounded-xl border border-teal-200 shrink-0 transition-colors"
                      title="الاتصال بالمريض"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span className="tabular-nums">{v.patient_phone}</span>
                    </a>
                  )}
                </div>

                {/* Reception Notes if any */}
                {v.reception_notes && (
                  <div className="text-xs text-slate-600 bg-slate-50/90 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    <span className="font-semibold text-slate-400">ملاحظات: </span>
                    <span>{v.reception_notes}</span>
                  </div>
                )}

                {/* Clinical Outcome Details for Reception (Tests, Diagnosis, Revisit) */}
                {v.status === 'completed' && (v.diagnosis || v.tests_requested || (v.revisit_recommended && v.follow_up_date)) && (
                  <div className="text-xs bg-emerald-50/80 border border-emerald-200/90 p-2.5 rounded-xl space-y-1.5 text-emerald-950">
                    {v.diagnosis && (
                      <div>
                        <span className="font-bold text-emerald-900">تشخيص الطبيب: </span>
                        <span>{v.diagnosis}</span>
                      </div>
                    )}
                    {v.tests_requested && (
                      <div className="flex items-center gap-1.5 text-teal-900 bg-teal-100/70 p-1.5 rounded-lg text-[11px] font-medium">
                        <span className="font-bold">🔬 فحوصات مطلوبة:</span>
                        <span>{v.tests_requested}</span>
                      </div>
                    )}
                    {v.revisit_recommended && v.follow_up_date && (
                      <div className="flex items-center gap-1.5 text-blue-900 bg-blue-100/70 p-1.5 rounded-lg text-[11px] font-medium">
                        <span className="font-bold">📅 موعد الإعادة المقترح:</span>
                        <span>{v.follow_up_date}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Cancellation Reason Banner if cancelled */}
                {v.status === 'cancelled' && v.cancellation_reason && (
                  <div className="text-xs bg-rose-50 text-rose-900 border border-rose-200/90 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>سبب الإلغاء:</span>
                    </div>
                    <p className="text-rose-900 text-[11px] leading-relaxed font-medium">
                      {v.cancellation_reason}
                    </p>
                  </div>
                )}
              </div>

              {/* Status Action Buttons with Active Border Highlighting & Terminal Lock */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-100">
                {/* Active Consultation In-Progress Strip */}
                {v.status === 'in_consultation' && (
                  <div className="mb-2.5 p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Activity className="w-4 h-4 text-purple-600 animate-spin shrink-0" />
                      <span>المريض داخل غرفة الطبيب حالياً</span>
                    </div>
                    <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-md font-bold">
                      الروشتة قيد الإعداد
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                  <span>حالة الكشف:</span>
                  {(v.status === 'completed' || v.status === 'cancelled') && (
                    <span className="text-[10px] bg-slate-200/90 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                      حالة نهائية مقفلة
                    </span>
                  )}
                  {v.status === 'in_consultation' && (
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold">
                      فحص طبي جاري
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Attended Button with Smart Payment Verification */}
                  <button
                    onClick={() => {
                      if (v.payment_status === 'unpaid') {
                        setPaymentModalVisit(v);
                      } else {
                        handleStatusChange(v.id, 'attended');
                      }
                    }}
                    disabled={v.status === 'attended' || v.status === 'completed' || v.status === 'cancelled'}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center text-center ${
                      v.status === 'attended'
                        ? 'border-2 border-blue-700 ring-2 ring-blue-500/50 bg-blue-600 text-white shadow-sm'
                        : v.status === 'completed' || v.status === 'cancelled'
                        ? 'border border-slate-200 bg-slate-100/60 text-slate-400 cursor-not-allowed opacity-50'
                        : v.payment_status === 'unpaid'
                        ? 'border-2 border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 cursor-pointer shadow-2xs'
                        : 'border border-blue-200 bg-blue-50/80 text-blue-800 hover:bg-blue-100 cursor-pointer'
                    }`}
                    title={
                      v.status === 'completed' || v.status === 'cancelled'
                        ? 'الكشف مغلق نهائياً'
                        : v.payment_status === 'unpaid'
                        ? 'تنبيه: لم يسدد المريض الرسوم بعد. اضغط لتحصيل الرسوم وتأكيد الحضور'
                        : 'تسجيل وصول المريض إلى صالة الانتظار'
                    }
                  >
                    <span>
                      {v.payment_status === 'unpaid' && v.status === 'registered' ? 'سداد وحضور' : 'حضر المريض'}
                    </span>
                  </button>

                  {/* Completed Button with Strict Anti-Bypass Guardrails */}
                  <button
                    onClick={() => {
                      if (v.status === 'completed' || v.status === 'cancelled') return;
                      if (v.payment_status === 'unpaid') {
                        alert(
                          '⚠️ تنبيه مالي وإداري:\nلا يمكن إتمام الكشف الطبي؛ لأن المريض لم يسدد رسوم الكشف بالخزينة بعد.\nسيتم فتح نافذة تحصيل الرسوم لتسجيل السداد وإثبات الحضور أولاً.'
                        );
                        setPaymentModalVisit(v);
                        return;
                      }
                      if (v.status === 'registered') {
                        alert(
                          '⚠️ تنبيه إداري:\nالمريض مسجل فقط ولم يؤكد وصوله لصالة الانتظار بعد.\nيرجى الضغط على زر «حضر المريض» أولاً عند وصوله للعيادة قبل إمكانية إتمام الكشف.'
                        );
                        return;
                      }
                      setCompletingVisit(v);
                    }}
                    disabled={v.status === 'completed' || v.status === 'cancelled'}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center text-center ${
                      v.status === 'completed'
                        ? 'border-2 border-emerald-700 ring-2 ring-emerald-500/50 bg-emerald-600 text-white shadow-sm cursor-not-allowed'
                        : v.status === 'cancelled'
                        ? 'border border-slate-200 bg-slate-100/60 text-slate-400 cursor-not-allowed opacity-50'
                        : v.payment_status === 'unpaid'
                        ? 'border-2 border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 cursor-pointer shadow-2xs animate-pulse'
                        : v.status === 'registered'
                        ? 'border border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer'
                        : 'border border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 cursor-pointer'
                    }`}
                    title={
                      v.status === 'completed'
                        ? 'الكشف مكتمل نهائياً'
                        : v.status === 'cancelled'
                        ? 'الكشف ملغي نهائياً'
                        : v.payment_status === 'unpaid'
                        ? 'تنبيه: غير مسدد. انقر لتحصيل الرسوم وتسجيل الحضور أولاً'
                        : v.status === 'registered'
                        ? 'تنبيه: لم يحضر. يجب الضغط على «حضر المريض» أولاً'
                        : 'تأكيد انتهاء الكشف الطبي'
                    }
                  >
                    <span>
                      {v.status === 'completed'
                        ? 'مكتملة (نهائي)'
                        : v.payment_status === 'unpaid'
                        ? 'سداد أولاً ⚠️'
                        : v.status === 'registered'
                        ? 'لم يحضر بعد'
                        : 'اكتمل الكشف'}
                    </span>
                  </button>

                  {/* Cancelled Button */}
                  <button
                    onClick={() => {
                      setCancellingVisit(v);
                      setCancellationReason(v.cancellation_reason || '');
                    }}
                    disabled={v.status === 'completed' || v.status === 'cancelled'}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center text-center ${
                      v.status === 'cancelled'
                        ? 'border-2 border-rose-700 ring-2 ring-rose-500/50 bg-rose-600 text-white shadow-sm cursor-not-allowed'
                        : v.status === 'completed'
                        ? 'border border-slate-200 bg-slate-100/60 text-slate-400 cursor-not-allowed opacity-50'
                        : 'border border-rose-200 bg-rose-50/80 text-rose-800 hover:bg-rose-100 cursor-pointer'
                    }`}
                    title={v.status === 'completed' ? 'الكشف مكتمل نهائياً' : v.status === 'cancelled' ? 'الكشف ملغي نهائياً' : 'إلغاء الزيارة مع تسجيل السبب'}
                  >
                    <span>{v.status === 'cancelled' ? 'ملغاة (نهائي)' : 'إلغاء الزيارة'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Completed Visit */}
      {completingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setCompletingVisit(null)}
              className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3 pl-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  تأكيد اكتمال الكشف الطبي
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  العيادة: {completingVisit.specialty_name} · د. {completingVisit.doctor_name}
                </p>
              </div>
            </div>

            {/* Strict Validation Blocker if unpaid or not attended */}
            {(completingVisit.payment_status === 'unpaid' || completingVisit.status === 'registered') && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3.5 text-xs text-rose-950 space-y-2.5 mb-4 shadow-2xs">
                <div className="font-bold text-rose-900 flex items-center gap-2 text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>ممنوع إتمام الكشف - متطلبات غير مكتملة:</span>
                </div>
                <div className="space-y-1 pr-6 text-[11px]">
                  {completingVisit.status === 'registered' && (
                    <div className="text-rose-800 font-bold flex items-center gap-1.5">
                      <span>❌ المريض لم يؤكد حضوره بصالة الانتظار بعد (الحالة: مسجلة فقط).</span>
                    </div>
                  )}
                  {completingVisit.payment_status === 'unpaid' && (
                    <div className="text-rose-800 font-bold flex items-center gap-1.5">
                      <span>❌ لم يتم سداد رسوم الكشف بالخزينة (مطلوب سداد: {completingVisit.fee_amount || 40} ج).</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                  🔒 يمنع النظام إنهاء الكشف الطبي قبل تحصيل الرسوم وإثبات حضور المريض الفعلي بالعيادة لمنع الأخطاء وحماية إيرادات المستشفى.
                </p>
                {completingVisit.payment_status === 'unpaid' && (
                  <button
                    type="button"
                    onClick={() => {
                      const v = completingVisit;
                      setCompletingVisit(null);
                      setPaymentModalVisit(v);
                    }}
                    className="w-full mt-2 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Coins className="w-4 h-4" />
                    <span>تحصيل الرسوم وإثبات الحضور بالخزينة الآن</span>
                  </button>
                )}
              </div>
            )}

            {/* Warning that this is irreversible */}
            <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-bold block text-amber-950 mb-0.5">تنبيه هام (إجراء نهائي):</strong>
                بمجرد تأكيد خيار <span className="underline font-bold">اكتمل الكشف</span>، سيتم إغلاق ملف الزيارة نهائياً ولن تتمكن من اختيار أو تعديل أي خيار آخر بعد التأكيد.
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 mb-5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">اسم المريض:</span>
                <span className="font-bold text-slate-900">{completingVisit.patient_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">رقم الملف:</span>
                <span className="font-mono font-bold text-teal-800">{completingVisit.patient_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">حالة الحضور:</span>
                <span className={`font-semibold ${completingVisit.status === 'registered' ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}`}>
                  {completingVisit.status === 'registered' ? 'لم يؤكد الحضور (مسجل فقط ❌)' : 'حاضر بالعيادة ✅'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">حالة السداد:</span>
                <span className={`font-semibold ${completingVisit.payment_status === 'unpaid' ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}`}>
                  {completingVisit.payment_status === 'unpaid' ? 'غير مسدد ❌' : 'مسدد بالخزينة ✅'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">نوع الكشف:</span>
                <span className="font-semibold text-slate-700">
                  {completingVisit.visit_type === 'new' ? 'كشف جديد' : 'إعادة / استشارة'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompletingVisit(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmCompletion}
                disabled={isCompleting || completingVisit.payment_status === 'unpaid' || completingVisit.status === 'registered'}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title={
                  completingVisit.payment_status === 'unpaid' || completingVisit.status === 'registered'
                    ? 'غير مسموح بالإتمام حتى استيفاء الحضور والسداد'
                    : 'تأكيد اكتمال الكشف'
                }
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isCompleting ? 'جاري التأكيد...' : 'نعم، تأكيد اكتمال الكشف'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Reason Modal with Irreversible Notice */}
      {cancellingVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setCancellingVisit(null);
                setCancellationReason('');
              }}
              className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3 pl-8">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  تأكيد إلغاء الكشف والزيارة
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  المريض: <strong className="text-slate-800 font-bold">{cancellingVisit.patient_name}</strong> (ملف: {cancellingVisit.patient_number}) · عيادة {cancellingVisit.specialty_name}
                </p>
              </div>
            </div>

            {/* Warning that cancellation is irreversible */}
            <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5 mb-3.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-bold block text-amber-950 mb-0.5">تنبيه هام (إجراء نهائي):</strong>
                بمجرد تأكيد خيار <span className="underline font-bold">إلغاء الزيارة</span>، سيتم إغلاق الزيارة نهائياً ولن يُسمح باختيار أو تعديل أي خيار آخر بعدها.
              </div>
            </div>

            {/* Financial Refund Notice if already paid */}
            {cancellingVisit.payment_status === 'paid' && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3.5 text-xs text-rose-950 flex items-start gap-2.5 mb-4 shadow-2xs">
                <Coins className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5 text-[13px]">
                    <span>تنبيه مالي واجب الاسترجاع الفوري للمريض</span>
                  </div>
                  <p className="leading-relaxed text-rose-800">
                    هذا المريض قد سدد بالفعل رسوم الكشف بقيمة{' '}
                    <strong className="font-extrabold text-rose-950 underline">
                      {cancellingVisit.paid_amount || cancellingVisit.fee_amount || 40} جنيهاً
                    </strong>{' '}
                    بإيصال رقم (<span className="font-mono font-bold text-rose-950">{cancellingVisit.payment_receipt_number || 'مسجل'}</span>).
                  </p>
                  <p className="text-[11px] text-rose-700 font-medium">
                    ⚡ عند تأكيد الإلغاء، سيقوم النظام تلقائياً بتسجيل استرداد المبلغ وعكس الإيصال وخصمه من إيراد وردية الخزينة. يرجى رد المبلغ نقداً أو عبر وسيلة الدفع للمريض فوراً.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmCancellation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  أسباب شائعة وسريعة (اختر بنقرة واحدة):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CANCELLATION_REASONS.map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setCancellationReason(reason)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer text-right ${
                        cancellationReason === reason
                          ? 'bg-rose-100 text-rose-800 border-rose-400 font-bold shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  سبب الإلغاء بالتفصيل: <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  placeholder="يرجى كتابة سبب الإلغاء بالتفصيل (مثل: اعتذار تليفوني من المريض، إلغاء الحجز لظروف السفر، خطأ في تكرار التسجيل...)"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:border-rose-600 focus:bg-white transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setCancellingVisit(null);
                    setCancellationReason('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  تراجع
                </button>

                <button
                  type="submit"
                  disabled={isCancelling || !cancellationReason.trim()}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isCancelling ? 'جاري الإلغاء والاسترداد...' : 'تأكيد إلغاء الكشف نهائياً'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Payment Modal (For collecting fees on attendance or anytime) */}
      <ConfirmPaymentModal
        isOpen={!!paymentModalVisit}
        onClose={() => setPaymentModalVisit(null)}
        visit={paymentModalVisit}
        onPaymentConfirmed={(updated, shouldPrint) => {
          fetchVisits();
          if (shouldPrint) {
            setReceiptModalVisit(updated);
          }
        }}
      />

      {/* Official Printable Medical Receipt Modal */}
      <VisitReceiptModal
        isOpen={!!receiptModalVisit}
        onClose={() => setReceiptModalVisit(null)}
        visit={receiptModalVisit}
      />

      {/* WhatsApp Patient Notification Modal (Reception: Ticket & Receipt Only) */}
      <PatientNotificationModal
        isOpen={!!notificationModalVisit}
        onClose={() => setNotificationModalVisit(null)}
        visit={notificationModalVisit}
        allowedTabs={['ticket', 'receipt']}
        defaultTab={notificationModalTab}
        onPrintTicket={(v) => {
          setNotificationModalVisit(null);
          setThermalTicketVisit(v);
        }}
        onPrintReceipt={(v) => {
          setNotificationModalVisit(null);
          setReceiptModalVisit(v);
        }}
      />

      {/* Thermal Queue Ticket Modal (80mm/58mm format) */}
      <ThermalQueueTicketModal
        isOpen={!!thermalTicketVisit}
        onClose={() => setThermalTicketVisit(null)}
        visit={thermalTicketVisit}
      />
    </div>
  );
};
