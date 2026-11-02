import React, { useState } from 'react';
import { PatientVisit, PaymentMethod } from '../../types';
import { dbService } from '../../lib/databaseService';
import { useAuth } from '../../context/AuthContext';
import {
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  Building2,
  Clock,
  Printer,
  HeartHandshake,
  Smartphone,
  Coins,
} from 'lucide-react';

interface ConfirmPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: PatientVisit | null;
  onPaymentConfirmed: (updatedVisit: PatientVisit, shouldPrintReceipt?: boolean) => void;
}

export const ConfirmPaymentModal: React.FC<ConfirmPaymentModalProps> = ({
  isOpen,
  onClose,
  visit,
  onPaymentConfirmed,
}) => {
  const { currentUser } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [markAttended, setMarkAttended] = useState<boolean>(true);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen || !visit) return null;

  const feeAmount = visit.fee_amount || (visit.visit_type === 'follow_up' ? 20 : 40);
  const receivedNum = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, receivedNum - feeAmount);

  const handleConfirm = async (shouldPrintReceipt: boolean = false) => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const updated = await dbService.confirmVisitPayment(
        visit.id,
        {
          paid_amount: paymentMethod === 'charity' ? 0 : feeAmount,
          payment_method: paymentMethod,
          payment_notes: paymentNotes.trim() || undefined,
          markAttended: markAttended,
        },
        currentUser || undefined
      );

      onPaymentConfirmed(updated, shouldPrintReceipt);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشل تسجيل السداد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBypassAttendanceOnly = async () => {
    // If the receptionist wants to mark attendance without collecting fees yet (emergency)
    setIsSubmitting(true);
    try {
      const updated = await dbService.updateVisitStatus(
        visit.id,
        'attended',
        visit.reception_notes,
        currentUser || undefined
      );
      onPaymentConfirmed(updated, false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشل تحديث الحالة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Top accent bar */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-700 rounded-t-2xl" />

        <button
          onClick={onClose}
          className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5 mb-4 border-b border-slate-100 pb-3 pl-8">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200">
            <Coins className="w-6 h-6 text-teal-700" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              تحصيل الرسوم وتأكيد الحضور بالخزينة
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              إثبات استلام ثمن الكشف بالخزينة وإصدار إيصال تحصيل رسمي
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Patient & Ticket Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-sm text-slate-900">{visit.patient_name}</span>
            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-teal-800">
              ملف: {visit.patient_number}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200/60">
            <span>
              عيادة {visit.specialty_name} • د. {visit.doctor_name}
            </span>
            <span className="font-semibold text-teal-900">
              {visit.visit_type === 'new' ? 'كشف جديد' : 'إعادة واستشارة'}
            </span>
          </div>
          {visit.booking_source && (
            <div className="text-[11px] text-slate-500">
              مصدر الحجز:{' '}
              <span className="font-semibold text-slate-700">
                {visit.booking_source === 'whatsapp'
                  ? 'واتساب (WhatsApp)'
                  : visit.booking_source === 'phone'
                  ? 'اتصال هاتفي'
                  : 'شباك الاستقبال'}
              </span>
            </div>
          )}
        </div>

        {/* Fee Highlight Box */}
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-3.5 mb-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-teal-900 block">المبلغ المطلوب سداده:</span>
            <span className="text-[11px] text-teal-700 font-medium">
              {visit.visit_type === 'new' ? 'تسعيرة الكشف الجديد' : 'تسعيرة الإعادة والاستشارة'}
            </span>
          </div>
          <div className="text-left">
            <span className="text-2xl font-black font-mono text-teal-950">
              {paymentMethod === 'charity' ? '0' : feeAmount}{' '}
              <span className="text-sm font-bold">ج.م</span>
            </span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-3 mb-4">
          <label className="block text-xs font-bold text-slate-800">
            طريقة التحصيل واستلام المبلغ <span className="text-rose-600">*</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Coins className="w-4 h-4 shrink-0" />
              <span>كاش (نقدي)</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('vodafone_cash')}
              className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                paymentMethod === 'vodafone_cash'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>فودافون كاش</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('instapay')}
              className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                paymentMethod === 'instapay'
                  ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>إنستاباي (InstaPay)</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('visa')}
              className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                paymentMethod === 'visa'
                  ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>فيزا / بطاقة</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('charity')}
              className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer col-span-2 sm:col-span-1 ${
                paymentMethod === 'charity'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <HeartHandshake className="w-4 h-4 shrink-0" />
              <span>إعفاء خيري معتمد</span>
            </button>
          </div>
        </div>

        {/* Cash Calculation (If Cash) */}
        {paymentMethod === 'cash' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                المبلغ المستلم من يد المريض (اختياري لحساب الباقي):
              </label>
              <div className="w-28 relative">
                <input
                  type="number"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  placeholder={String(feeAmount)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-left font-mono font-bold focus:outline-hidden focus:border-teal-600"
                />
              </div>
            </div>

            {receivedNum > 0 && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 font-bold">
                <span className="text-slate-600">الباقي للمريض:</span>
                <span
                  className={`font-mono text-sm ${
                    receivedNum < feeAmount ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {receivedNum < feeAmount
                    ? `مبلغ ناقص (-${feeAmount - receivedNum} ج.م)`
                    : `${changeDue.toFixed(2)} ج.م`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Optional Notes */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            ملاحظات مالية / رقم مرجع العملية (اختياري)
          </label>
          <input
            type="text"
            value={paymentNotes}
            onChange={e => setPaymentNotes(e.target.value)}
            placeholder={
              paymentMethod === 'vodafone_cash'
                ? 'مثال: رقم التحويل 010...'
                : paymentMethod === 'instapay'
                ? 'مثال: مرجع التحويل البنكي...'
                : paymentMethod === 'charity'
                ? 'مثال: قرار إعفاء غير قادرين برقم...'
                : 'أي ملاحظة تظهر في التقرير المالي...'
            }
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600"
          />
        </div>

        {/* Mark Attended Checkbox */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={markAttended}
              onChange={e => setMarkAttended(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded-md focus:ring-teal-500 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900 block">
                تأكيد حضور المريض بالصالة فوراً (جاهز للكشف عند الطبيب)
              </span>
              <span className="text-[11px] text-slate-500">
                سيتم تحديث حالة المريض إلى (حاضر بالصالة) ليظهر للطبيب في قائمة الانتظار مباشرة.
              </span>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleBypassAttendanceOnly}
            disabled={isSubmitting}
            className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors order-3 sm:order-1 text-center"
            title="تأكيد الحضور فقط وتأجيل التحصيل للطوارئ"
          >
            تجاوز السداد الآن (حضور فقط)
          </button>

          <div className="flex items-center gap-2 justify-end order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => handleConfirm(true)}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 active:scale-95 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 border border-teal-300"
              title="استلام المبلغ وطباعة إيصال التحصيل للمريض فوراً"
            >
              <Printer className="w-4 h-4 text-teal-700" />
              <span>تحصيل وطباعة الإيصال</span>
            </button>
            <button
              type="button"
              onClick={() => handleConfirm(false)}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:scale-95 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري التحصيل...' : 'تأكيد استلام المبلغ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
