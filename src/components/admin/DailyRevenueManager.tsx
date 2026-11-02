import React, { useState, useEffect } from 'react';
import { DailyRevenueSummary, PatientVisit, PaymentMethod } from '../../types';
import { dbService } from '../../lib/databaseService';
import { useAuth } from '../../context/AuthContext';
import { getTodayDateString } from '../../lib/mockData';
import { VisitReceiptModal } from './VisitReceiptModal';
import { printElement } from '../../lib/printUtils';
import {
  DollarSign,
  Coins,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  Printer,
  Search,
  UserCheck,
  TrendingUp,
  HeartHandshake,
  ArrowDownLeft,
  FileText,
  ShieldCheck,
  RotateCcw,
  Smartphone,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react';

export const DailyRevenueManager: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [summary, setSummary] = useState<DailyRevenueSummary | null>(null);
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selectedVisitForReceipt, setSelectedVisitForReceipt] = useState<PatientVisit | null>(null);

  // Opening Shift Cash Float State
  const [isFloatModalOpen, setIsFloatModalOpen] = useState<boolean>(false);
  const [floatAmountInput, setFloatAmountInput] = useState<string>('0');
  const [floatNotesInput, setFloatNotesInput] = useState<string>('');
  const [isSavingFloat, setIsSavingFloat] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sum, visList] = await Promise.all([
        dbService.getDailyFinancialSummary(selectedDate),
        dbService.getVisits(undefined, selectedDate),
      ]);
      setSummary(sum);
      setVisits(visList);
      if (sum) {
        setFloatAmountInput(sum.opening_cash_balance ? String(sum.opening_cash_balance) : '0');
        setFloatNotesInput(sum.opening_cash_notes || '');
      }
    } catch (err) {
      console.error('Failed to load financial summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOpeningFloat = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFloat(true);
    try {
      const numAmount = parseFloat(floatAmountInput) || 0;
      await dbService.saveShiftOpeningFloat(
        selectedDate,
        numAmount,
        floatNotesInput.trim(),
        currentUser || undefined
      );
      setIsFloatModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save opening float:', err);
      alert('حدث خطأ أثناء حفظ رصيد بداية الوردية');
    } finally {
      setIsSavingFloat(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleVisitUpdate = () => {
      loadData();
    };

    window.addEventListener('hospital-visit-updated', handleVisitUpdate);
    const interval = setInterval(loadData, 5000);

    return () => {
      window.removeEventListener('hospital-visit-updated', handleVisitUpdate);
      clearInterval(interval);
    };
  }, [selectedDate]);

  const handlePrintDailyReport = () => {
    printElement('daily-shift-printable-report', `تقرير تقفيل الخزينة والوردية - ${selectedDate}`);
  };

  // Filtered receipts list
  const paidVisits = visits.filter(v => v.payment_status === 'paid' || v.payment_status === 'waived' || v.payment_status === 'refunded');

  const filteredReceipts = paidVisits.filter(v => {
    const matchesSearch =
      !searchQuery ||
      v.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.patient_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.payment_receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.paid_by_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (methodFilter === 'all') return true;
    if (methodFilter === 'cash') return v.payment_method === 'cash';
    if (methodFilter === 'vodafone_cash') return v.payment_method === 'vodafone_cash';
    if (methodFilter === 'instapay') return v.payment_method === 'instapay';
    if (methodFilter === 'visa') return v.payment_method === 'visa';
    if (methodFilter === 'charity') return v.payment_status === 'waived' || v.payment_method === 'charity';
    if (methodFilter === 'refunded') return v.payment_status === 'refunded';

    return true;
  });

  const getMethodBadge = (v: PatientVisit) => {
    if (v.payment_status === 'refunded') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          مسترد (-{v.paid_amount || v.fee_amount} ج)
        </span>
      );
    }
    if (v.payment_status === 'waived') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          إعفاء خيري (لجنة الزكاة)
        </span>
      );
    }
    switch (v.payment_method) {
      case 'cash':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            كاش (نقدي)
          </span>
        );
      case 'vodafone_cash':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            فودافون كاش
          </span>
        );
      case 'instapay':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            إنستاباي
          </span>
        );
      case 'visa':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            فيزا / كارت
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
            نقدي
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. Header & Date Controller
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-200">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  إيرادات الخزينة وتقفيل الوردية اليومية
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  سجل مالي معتمد
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                متابعة حركة تحصيل رسوم الكشوفات، مطابقة النقدية بالدرج، وتفصيل عهدة موظفي الاستقبال
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="text-xs font-bold bg-transparent border-none text-slate-800 focus:outline-hidden cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDateString())}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedDate === getTodayDateString()
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              اليوم
            </button>

            <button
              type="button"
              onClick={handlePrintDailyReport}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة تقرير تقفيل الوردية</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            Cash Drawer & Shift Float Reconciliation Banner
           ========================================================================= */}
        <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white shadow-md border border-teal-700/40">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center shrink-0">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-teal-100">
                    مطابقة الخزينة وعهدة الفكة الافتتاحية (رصيد بداية الوردية)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-400/20 text-teal-200 border border-teal-400/30">
                    الوردية الحالية
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  رصيد الفكة المسلم للصراف عند بدء العمل + كاش الكشوفات المحصل = إجمالي النقدية المتوقع بالدرج عند الإقفال
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFloatAmountInput(summary?.opening_cash_balance ? String(summary.opening_cash_balance) : '0');
                setFloatNotesInput(summary?.opening_cash_notes || '');
                setIsFloatModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer self-start lg:self-auto shrink-0 active:scale-95"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{summary?.opening_cash_balance ? 'تعديل عهدة بداية الوردية' : '+ تسجيل عهدة بداية الوردية (فكة)'}</span>
            </button>
          </div>

          {/* Mathematical Equation Ribbon */}
          <div className="mt-4 pt-3 border-t border-teal-800/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Opening Cash Float */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <span className="text-[11px] text-teal-200 block font-medium">1. رصيد بداية الوردية (عهدة الفكة)</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-white">
                  {(summary?.opening_cash_balance || 0).toFixed(2)}
                </span>
                <span className="text-xs text-teal-300 font-bold">ج.م</span>
              </div>
              <span className="text-[10px] text-slate-300 block mt-1 truncate">
                {summary?.opening_cash_updated_by ? `سجلها: ${summary.opening_cash_updated_by}` : 'لم تسجل عهدة بعد'}
                {summary?.opening_cash_notes ? ` (${summary.opening_cash_notes})` : ''}
              </span>
            </div>

            {/* 2. Today's Net Cash Collected */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
              <span className="text-[11px] text-teal-200 block font-medium">+ 2. متحصلات كاش اليوم (العيادات)</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-emerald-300">
                  {summary ? summary.cash_total.toFixed(2) : '0.00'}
                </span>
                <span className="text-xs text-teal-300 font-bold">ج.م</span>
              </div>
              <span className="text-[10px] text-slate-300 block mt-1">
                صافي النقدية المستلمة من المرضى بالاستقبال
              </span>
            </div>

            {/* 3. Expected Total Cash In Drawer */}
            <div className="bg-emerald-500/20 backdrop-blur-xs rounded-xl p-3 border border-emerald-400/30">
              <span className="text-[11px] text-emerald-200 block font-bold">= 3. إجمالي النقدية المتوقع وجودها بالدرج</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-emerald-300">
                  {summary ? (summary.expected_cash_in_drawer ?? ((summary.opening_cash_balance || 0) + summary.cash_total)).toFixed(2) : '0.00'}
                </span>
                <span className="text-xs text-emerald-200 font-bold">ج.م</span>
              </div>
              <span className="text-[10px] text-emerald-200/90 block mt-1 font-semibold">
                المبلغ الفعلي الواجب جرده وتسليمه للخزينة الرئيسية
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. High-Impact Financial KPI Cards
           ========================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-4 border-t border-slate-100">
          {/* Total Net Revenue */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">إجمالي إيرادات اليوم</span>
              <TrendingUp className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-950">
                {summary ? summary.total_revenue.toFixed(2) : '0.00'}
              </span>
              <span className="text-xs font-bold text-emerald-800">ج.م</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-1 font-medium">
              محصل من {summary?.paid_visits_count || 0} تذكرة مسددة
            </p>
          </div>

          {/* Cash in Hand (Drawer Cash) */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-900">النقدية الفعلية (كاش بالدرج)</span>
              <Coins className="w-4 h-4 text-teal-700" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-teal-950">
                {summary ? summary.cash_total.toFixed(2) : '0.00'}
              </span>
              <span className="text-xs font-bold text-teal-800">ج.م</span>
            </div>
            <p className="text-[11px] text-teal-700 mt-1 font-medium">
              المبلغ الفعلي المفترض تسليمه بالإقفال
            </p>
          </div>

          {/* Electronic Payments */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900">المدفوعات الإلكترونية</span>
              <CreditCard className="w-4 h-4 text-purple-700" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-purple-950">
                {summary ? summary.electronic_total.toFixed(2) : '0.00'}
              </span>
              <span className="text-xs font-bold text-purple-800">ج.م</span>
            </div>
            <p className="text-[11px] text-purple-700 mt-1 font-medium">
              محافظ (فودافون كاش) + إنستاباي + فيزا
            </p>
          </div>

          {/* Unpaid / Pending & Charity */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">إعفاءات وحجوزات معلقة</span>
              <HeartHandshake className="w-4 h-4 text-amber-700" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-amber-950">
                {summary ? summary.unpaid_visits_count : 0}
              </span>
              <span className="text-xs font-bold text-amber-800">تذكرة لم تسدد</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-1 font-medium">
              إعفاء خيري معتمد: {summary ? summary.waived_total : 0} ج.م ({summary?.waived_visits_count || 0})
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. Shift Settlement by Cashier & Specialty Breakdown
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cashier Settlement (تقفيل عهدة موظفي الاستقبال) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-700" />
              <h3 className="font-bold text-sm text-slate-900">
                تقفيل عهدة موظفي الاستقبال (الورديات)
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-500">
              مطابقة العهدة النقدية لكل موظف
            </span>
          </div>

          {!summary || Object.keys(summary.by_cashier).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              لم تسجل أي متحصلات مالية باسم موظفين لهذا التاريخ
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {Object.entries(summary.by_cashier).map(([cashierName, data], idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">{cashierName}</span>
                      <span className="text-slate-500 text-[11px]">
                        قام بتحصيل {data.count} إيصال كشف
                      </span>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="font-mono font-black text-sm text-emerald-800 block">
                      {data.revenue.toFixed(2)} ج.م
                    </span>
                    <span className="text-[10px] text-slate-400">عهدة الخزينة المسلمة</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue by Clinic / Specialty (الإيرادات حسب العيادة) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-700" />
              <h3 className="font-bold text-sm text-slate-900">
                إيرادات العيادات التخصصية
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-500">
              توزيع المبالغ حسب التخصص
            </span>
          </div>

          {!summary || Object.keys(summary.by_specialty).length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              لا توجد بيانات عيادات لهذا التاريخ
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {Object.entries(summary.by_specialty).map(([specId, data], idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">عيادة {data.specialty_name}</span>
                    <span className="text-slate-500 text-[11px]">{data.count} كشف مسجل</span>
                  </div>
                  <div className="text-left">
                    <span className="font-mono font-bold text-slate-900">
                      {data.revenue.toFixed(2)} ج.م
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          4. Detailed Receipts Ledger (سجل الإيصالات المالية اليومية)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Ledger Header & Search */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-700" />
            <h3 className="font-bold text-sm text-slate-900">
              سجل الإيصالات المالية الصادرة ({filteredReceipts.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الإيصال، المريض، أو المحصل..."
                className="w-full pl-3 pr-9 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-teal-600"
              />
            </div>

            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="all">كافة طرق الدفع</option>
              <option value="cash">نقدي (كاش)</option>
              <option value="vodafone_cash">فودافون كاش</option>
              <option value="instapay">إنستاباي</option>
              <option value="visa">فيزا / بطاقة</option>
              <option value="charity">إعفاء خيري</option>
              <option value="refunded">مسترد</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        {filteredReceipts.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            لا توجد إيصالات مسددة مطابقة لخيارات البحث
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3">رقم الإيصال</th>
                  <th className="p-3">المريض</th>
                  <th className="p-3">العيادة والطبيب</th>
                  <th className="p-3">النوع</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">طريقة السداد</th>
                  <th className="p-3">المحصل / الصراف</th>
                  <th className="p-3">التوقيت</th>
                  <th className="p-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceipts.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-teal-800">
                      {v.payment_receipt_number || 'REC-XXXXX'}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">{v.patient_name}</span>
                      <span className="text-[11px] font-mono text-slate-500">{v.patient_number}</span>
                    </td>
                    <td className="p-3 text-slate-700">
                      <span className="font-medium block">عيادة {v.specialty_name}</span>
                      <span className="text-[11px] text-slate-500">{v.doctor_name}</span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.visit_type === 'new'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}
                      >
                        {v.visit_type === 'new' ? 'كشف جديد' : 'إعادة'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-mono font-extrabold text-slate-900">
                        {v.payment_status === 'waived' ? '0' : (v.paid_amount || v.fee_amount || 40)}{' '}
                        <span className="text-[10px] text-slate-500 font-normal">ج.م</span>
                      </span>
                    </td>
                    <td className="p-3">{getMethodBadge(v)}</td>
                    <td className="p-3 text-slate-700 font-medium">
                      {v.paid_by_name || 'موظف الاستقبال'}
                    </td>
                    <td className="p-3 text-[11px] font-mono text-slate-500">
                      {v.paid_at
                        ? new Date(v.paid_at).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedVisitForReceipt(v)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1"
                        title="معاينة وطباعة الإيصال الرسمي"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>طباعة</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      <VisitReceiptModal
        isOpen={!!selectedVisitForReceipt}
        onClose={() => setSelectedVisitForReceipt(null)}
        visit={selectedVisitForReceipt}
      />

      {/* Opening Shift Cash Float Modal (تسجيل / تعديل رصيد بداية الوردية) */}
      {isFloatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    تسجيل رصيد بداية الوردية (الفكة)
                  </h3>
                  <p className="text-xs text-slate-500">
                    تاريخ الوردية: {selectedDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFloatModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOpeningFloat} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  مبلغ عهدة الفكة الافتتاحية (ج.م): <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={floatAmountInput}
                    onChange={e => setFloatAmountInput(e.target.value)}
                    required
                    placeholder="مثال: 500"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-bold font-mono text-slate-900 focus:outline-hidden focus:border-teal-600 focus:bg-white"
                  />
                  <span className="absolute left-3 top-3 text-xs font-bold text-slate-500">
                    جنيه مصري
                  </span>
                </div>
                {/* Quick denomination chips */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-500 font-medium">مبالغ شائعة:</span>
                  {[200, 300, 500, 1000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFloatAmountInput(String(amt))}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 cursor-pointer"
                    >
                      {amt} ج
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  تفاصيل فئات الفكة / ملاحظات الاستلام:
                </label>
                <textarea
                  rows={2}
                  value={floatNotesInput}
                  onChange={e => setFloatNotesInput(e.target.value)}
                  placeholder="مثال: عهدة فكة مستلمة من الخزينة الرئيسية (فئات 5، 10، و 20 جنيه)..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>معادلة الجرد وتسليم الوردية:</span>
                </div>
                <div className="text-[11px] text-teal-800">
                  إجمالي النقدية الواجب تسليمها ={' '}
                  <span className="font-mono font-bold">
                    {(parseFloat(floatAmountInput) || 0) + (summary?.cash_total || 0)} ج.م
                  </span>
                  {' '} (عهدة {parseFloat(floatAmountInput) || 0} ج + كاش اليوم {summary?.cash_total || 0} ج)
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFloatModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingFloat}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Coins className="w-4 h-4" />
                  <span>{isSavingFloat ? 'جاري الاعتماد...' : 'اعتماد وحفظ العهدة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Shift Handover Report (Invisible on screen, styled for Print) */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8 print:z-[9999] print:text-black">
        <div id="daily-shift-printable-report" className="max-w-2xl mx-auto border-2 border-slate-800 p-6 rounded-lg font-sans">
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-slate-800 mb-4">
            <h1 className="text-xl font-black">مستشفى لجنة الزكاة بميت علي</h1>
            <p className="text-xs text-slate-600">العيادات التخصصية الشاملة والخدمات الطبية الخيرية</p>
            <h2 className="text-base font-bold mt-2 bg-slate-100 py-1 border border-slate-300">
              تقرير تقفيل الخزينة وتسليم الوردية اليومية
            </h2>
            <div className="flex justify-between text-xs mt-2 font-mono">
              <span>تاريخ التقفيل: {selectedDate}</span>
              <span>وقت الطباعة: {new Date().toLocaleTimeString('ar-EG')}</span>
            </div>
          </div>

          {/* Key Figures Table */}
          <table className="w-full text-xs text-right border-collapse mb-4">
            <tbody>
              <tr className="border-b border-slate-300">
                <td className="py-1.5 font-bold">1. عهدة بداية الوردية (الفكة الافتتاحية):</td>
                <td className="py-1.5 font-mono font-bold text-left">
                  {(summary?.opening_cash_balance || 0).toFixed(2)} ج.م
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="py-1.5 font-bold">2. متحصلات الكاش الفعلي من المرضى:</td>
                <td className="py-1.5 font-mono font-bold text-left">
                  {(summary?.cash_total || 0).toFixed(2)} ج.م
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="py-1.5 font-bold">3. متحصلات الدفع الإلكتروني (إنستاباي / كاش / فيزا):</td>
                <td className="py-1.5 font-mono font-bold text-left">
                  {(summary?.electronic_total || 0).toFixed(2)} ج.م
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="py-1.5 font-bold">4. إجمالي إيرادات الكشوفات الصافية:</td>
                <td className="py-1.5 font-mono font-bold text-left">
                  {(summary?.total_revenue || 0).toFixed(2)} ج.م
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="py-1.5 font-bold">5. إجمالي عدد التذاكر المسددة:</td>
                <td className="py-1.5 font-mono font-bold text-left">
                  {summary?.paid_visits_count || 0} كشف
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="py-1.5 font-bold">6. تذاكر الإعفاء الخيري (لجنة الزكاة):</td>
                <td className="py-1.5 font-mono font-bold text-left">
                  {summary?.waived_visits_count || 0} حالة ({summary?.waived_total || 0} ج)
                </td>
              </tr>
              <tr className="bg-slate-200 border-t-2 border-b-2 border-slate-900 font-bold">
                <td className="py-2 text-sm font-black">
                  إجمالي النقدية الفعلية الواجب تسليمها بالدرج (1 + 2):
                </td>
                <td className="py-2 text-base font-black font-mono text-left">
                  {(summary ? (summary.expected_cash_in_drawer ?? ((summary.opening_cash_balance || 0) + summary.cash_total)) : 0).toFixed(2)} ج.م
                </td>
              </tr>
            </tbody>
          </table>

          {/* Cashier Breakdown */}
          {summary && Object.keys(summary.by_cashier).length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold mb-1">تفصيل متحصلات موظفي الاستقبال:</h4>
              <table className="w-full text-[11px] text-right border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300">
                  <tr>
                    <th className="p-1">اسم الموظف</th>
                    <th className="p-1">عدد الإيصالات</th>
                    <th className="p-1 text-left">المبلغ المحصل</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.by_cashier).map(([name, data], idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-1">{name}</td>
                      <td className="p-1 font-mono">{data.count}</td>
                      <td className="p-1 font-mono text-left">{data.revenue.toFixed(2)} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-4 pt-8 text-center text-xs">
            <div>
              <p className="font-bold">مسؤول الاستقبال / الصراف</p>
              <div className="h-12 border-b border-slate-400 mt-2"></div>
              <p className="text-[10px] text-slate-500 mt-1">الاسم والتوقيع</p>
            </div>
            <div>
              <p className="font-bold">المشرف المالي / المراجع</p>
              <div className="h-12 border-b border-slate-400 mt-2"></div>
              <p className="text-[10px] text-slate-500 mt-1">الاسم والتوقيع</p>
            </div>
            <div>
              <p className="font-bold">اعتماد الخزينة الرئيسية</p>
              <div className="h-12 border-b border-slate-400 mt-2"></div>
              <p className="text-[10px] text-slate-500 mt-1">ختم الإدارة المالية</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
