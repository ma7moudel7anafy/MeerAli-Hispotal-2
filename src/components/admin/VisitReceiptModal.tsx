import React, { useState } from 'react';
import { PatientVisit } from '../../types';
import { printElement } from '../../lib/printUtils';
import {
  shareOrSendPdfViaWhatsApp,
  downloadElementAsPdf,
} from '../../lib/pdfGenerator';
import {
  Printer,
  X,
  CheckCircle2,
  Building2,
  Calendar,
  Clock,
  User,
  CreditCard,
  DollarSign,
  ShieldCheck,
  Phone,
  Send,
  Download,
  Loader2,
} from 'lucide-react';

interface VisitReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: PatientVisit | null;
}

export const VisitReceiptModal: React.FC<VisitReceiptModalProps> = ({
  isOpen,
  onClose,
  visit,
}) => {
  const [phoneNumber, setPhoneNumber] = useState<string>(visit?.patient_phone || '');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  React.useEffect(() => {
    if (visit?.patient_phone) {
      setPhoneNumber(visit.patient_phone);
    }
  }, [visit]);

  if (!isOpen || !visit) return null;

  const handlePrint = () => {
    printElement('hospital-printable-receipt', `إيصال سداد - ${visit.patient_name || 'مريض'}`);
  };

  const getMethodLabel = (method?: string) => {
    switch (method) {
      case 'cash':
        return 'نقدي (كاش بالخزينة)';
      case 'vodafone_cash':
        return 'محفظة فودافون كاش';
      case 'instapay':
        return 'تحويل بنكي / إنستاباي (InstaPay)';
      case 'visa':
        return 'بطاقة ائتمانية / فيزا';
      case 'charity':
        return 'إعفاء خيري معتمد (لجنة الزكاة)';
      default:
        return 'نقدي (كاش)';
    }
  };

  const getAmountInWords = (num: number) => {
    if (num === 0) return 'صفر جنيه (إعفاء خيري معتمد)';
    if (num === 20) return 'فقط عشرون جنيهاً مصرياً لا غير';
    if (num === 30) return 'فقط ثلاثون جنيهاً مصرياً لا غير';
    if (num === 35) return 'فقط خمسة وثلاثون جنيهاً مصرياً لا غير';
    if (num === 40) return 'فقط أربعون جنيهاً مصرياً لا غير';
    if (num === 50) return 'فقط خمسون جنيهاً مصرياً لا غير';
    return `فقط ${num} جنيهاً مصرياً لا غير`;
  };

  const isWaived = visit.payment_status === 'waived';
  const fee = visit.paid_amount !== undefined ? visit.paid_amount : visit.fee_amount || 40;

  const getReceiptWhatsAppMessage = () => {
    return `🧾 *إيصال سداد مالي رسمي معتمد*
*مستشفى لجنة الزكاة بميت علي*

سعادة المريض/ة: *${visit.patient_name}*
ملف رقم: ${visit.patient_number || 'مسجل'}

تم استلام رسوم الكشف بالخزينة بالبيانات التالية:
🔢 *رقم الإيصال الرسمي:* ${visit.payment_receipt_number || 'REC-2026-XXXXX'}
💵 *المبلغ المسدد:* ${visit.paid_amount || visit.fee_amount || 40} جنيهاً مصرياً
💳 *طريقة السداد:* ${getMethodLabel(visit.payment_method)}
🩺 *العيادة والطبيب:* ${visit.specialty_name} - د. ${visit.doctor_name}
👤 *اسم المحصل:* ${visit.paid_by_name || 'موظف الخزينة'}
📅 *تاريخ وساعة الإيصال:* ${visit.paid_at ? new Date(visit.paid_at).toLocaleString('ar-EG') : visit.visit_date}

شكراً لتعاملكم مع مستشفى لجنة الزكاة بميت علي.`;
  };

  const handleSendWhatsAppWithPdf = async () => {
    if (!phoneNumber.trim()) {
      alert('يرجى كتابة رقم هاتف المريض أو الواتساب');
      return;
    }

    try {
      setIsGenerating(true);
      const safeName = (visit.patient_name || 'مريض').replace(/\s+/g, '_');
      const res = await shareOrSendPdfViaWhatsApp({
        elementId: 'hospital-printable-receipt',
        fileName: `إيصال_سداد_${visit.payment_receipt_number || 'REC'}_${safeName}`,
        phoneNumber: phoneNumber.trim(),
        messageText: getReceiptWhatsAppMessage(),
        documentTitle: `إيصال سداد رقم ${visit.payment_receipt_number || ''}`,
      });

      setStatusNotice(`تم فتح محادثة المريض (${res.recipientPhone}) مباشرةً وتنزيل إيصال السداد PDF.`);
      setTimeout(() => setStatusNotice(null), 5000);
    } catch (err: any) {
      console.error('Error sharing receipt PDF:', err);
      alert(err?.message || 'حدث خطأ أثناء فتح محادثة المريض');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      const safeName = (visit.patient_name || 'مريض').replace(/\s+/g, '_');
      const ok = await downloadElementAsPdf(
        'hospital-printable-receipt',
        `إيصال_سداد_${visit.payment_receipt_number || 'REC'}_${safeName}`
      );
      if (ok) {
        setStatusNotice('تم تحميل ملف PDF للإيصال المالي الرسمي.');
        setTimeout(() => setStatusNotice(null), 4000);
      }
    } catch (err) {
      console.error('Error downloading receipt PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button - hidden in print */}
        <button
          onClick={onClose}
          className="print:hidden absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* =========================================================================
            OFFICIAL THERMAL / A5 MEDICAL RECEIPT TEMPLATE (Print & PDF Optimized)
           ========================================================================= */}
        <div id="hospital-printable-receipt" className="space-y-3.5 text-slate-900 bg-white p-2">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-2.5">
            <div className="flex items-center justify-center gap-1.5 text-slate-900 font-black text-sm mb-0.5">
              <Building2 className="w-4 h-4 text-teal-800 shrink-0" />
              <span>مستشفى لجنة الزكاة بميت علي</span>
            </div>
            <p className="text-[11px] text-slate-600 font-semibold">
              العيادات الخارجية التخصصية • قسم الخزينة والاستقبال
            </p>
            <div className="mt-1.5 inline-block px-3 py-0.5 bg-slate-900 text-white rounded-md text-xs font-bold tracking-wide">
              إيصال سداد رسوم كشف رسمي
            </div>
          </div>

          {/* Receipt Meta (Number, Date, Cashier) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs space-y-1 font-medium">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">رقم الإيصال المالي:</span>
              <span className="font-mono font-extrabold text-teal-900 text-sm">
                {visit.payment_receipt_number || 'REC-2026-00000'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">تاريخ وتوقيت التحصيل:</span>
              <span className="font-mono text-slate-800 text-[11px]">
                {visit.paid_at
                  ? new Date(visit.paid_at).toLocaleString('ar-EG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : visit.visit_date}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">الصراف / المحصل:</span>
              <span className="text-slate-900 font-bold">
                {visit.paid_by_name || 'موظف الاستقبال والخزينة'}
              </span>
            </div>
          </div>

          {/* Patient & Clinic Details */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs overflow-hidden">
            <div className="p-2 flex items-center justify-between bg-white">
              <span className="text-slate-500">اسم المريض:</span>
              <strong className="text-slate-900">{visit.patient_name}</strong>
            </div>
            <div className="p-2 flex items-center justify-between bg-slate-50/60">
              <span className="text-slate-500">رقم الملف الطبي:</span>
              <span className="font-mono font-bold text-teal-800">{visit.patient_number}</span>
            </div>
            {visit.patient_phone && (
              <div className="p-2 flex items-center justify-between bg-white">
                <span className="text-slate-500">هاتف المريض:</span>
                <span className="font-mono text-slate-700">{visit.patient_phone}</span>
              </div>
            )}
            <div className="p-2 flex items-center justify-between bg-slate-50/60">
              <span className="text-slate-500">العيادة التخصصية:</span>
              <span className="font-bold text-slate-900">عيادة {visit.specialty_name}</span>
            </div>
            <div className="p-2 flex items-center justify-between bg-white">
              <span className="text-slate-500">الطبيب المعالج:</span>
              <span className="font-bold text-slate-900">{visit.doctor_name}</span>
            </div>
            <div className="p-2 flex items-center justify-between bg-slate-50/60">
              <span className="text-slate-500">نوع التذكرة:</span>
              <span className="font-bold text-teal-900">
                {visit.visit_type === 'new' ? 'كشف جديد' : 'إعادة واستشارة'}
              </span>
            </div>
          </div>

          {/* Amount Paid Box */}
          <div className="bg-emerald-50/90 border-2 border-emerald-400 rounded-xl p-3 text-center space-y-0.5">
            <span className="text-xs font-bold text-emerald-800 block">
              {isWaived ? 'حالة الرسوم: إعفاء خيري معتمد' : 'المبلغ المحصل والمسدد بالخزينة:'}
            </span>
            <div className="text-2xl font-black font-mono text-emerald-950">
              {isWaived ? '0.00' : Number(fee).toFixed(2)}{' '}
              <span className="text-sm font-bold">ج.م</span>
            </div>
            <div className="text-[11px] text-emerald-900 font-medium">
              {getAmountInWords(isWaived ? 0 : Number(fee))}
            </div>
            <div className="pt-1.5 mt-1 border-t border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center justify-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>طريقة السداد: {getMethodLabel(visit.payment_method)}</span>
            </div>
          </div>

          {/* Footer & Validation Stamp */}
          <div className="pt-2 border-t border-dashed border-slate-300 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1 text-emerald-700 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>سند رسمي معتمد بنظام المستشفى</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              مستشفى لجنة الزكاة بميت علي
            </span>
          </div>
        </div>

        {/* WhatsApp Phone Input for Receptionist */}
        <div className="mt-3 print:hidden">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-600" />
              <span>رقم واتساب المريض:</span>
            </label>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md font-bold">
              إرسال مباشر للرقم 🎯
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="مثال: 01012345678"
              className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:bg-white text-slate-900"
            />
          </div>
        </div>

        {/* Status Notice */}
        {statusNotice && (
          <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1.5 print:hidden">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Action Controls - Digital WhatsApp PDF & Paperless Support */}
        <div className="print:hidden mt-3 pt-3 border-t border-slate-100 space-y-1.5">
          <button
            type="button"
            onClick={handleSendWhatsAppWithPdf}
            disabled={isGenerating}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ تجهيز ملف PDF والمحادثة...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>إرسال لرقم المريض مباشرة ({phoneNumber.trim() || 'واتساب'})</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="flex-1 py-2 px-2.5 border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-teal-700" />
              <span>تحميل الإيصال PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="py-2 px-3 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
              title="طباعة ورقية في حال توفر طابعة"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span>طباعة ورقية</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
