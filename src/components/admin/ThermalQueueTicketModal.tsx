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
  Stethoscope,
  Clock,
  User,
  Heart,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Calendar,
  Building2,
  Send,
  Download,
  Phone,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface ThermalQueueTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: PatientVisit | null;
  queueNumber?: number;
}

export const ThermalQueueTicketModal: React.FC<ThermalQueueTicketModalProps> = ({
  isOpen,
  onClose,
  visit,
  queueNumber,
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

  const displayQueue = queueNumber || (visit.id.replace(/\D/g, '').slice(-2) || '1');

  const handlePrint = () => {
    printElement('thermal-queue-ticket', `كارت الدور - عيادة ${visit.specialty_name || 'العيادة'}`);
  };

  const getPriorityLabel = () => {
    switch (visit.priority) {
      case 'urgent':
        return { text: '⚡ أولوية قصوى - حالة طارئة / ألم حاد', badge: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'elderly':
        return { text: '👵 أولوية رعاية - كبار السن', badge: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'special_needs':
        return { text: '♿ أولوية رعاية - أصحاب الهمم', badge: 'bg-blue-100 text-blue-800 border-blue-300' };
      default:
        return null;
    }
  };

  const priorityInfo = getPriorityLabel();

  const getWhatsAppMessage = () => {
    return `🏥 *مستشفى لجنة الزكاة بميت علي*
السلام عليكم أستاذ/ة *${visit.patient_name}*،

تم تأكيد حجز دوركم في العيادات الخارجية بنجاح:
📋 *رقم الدور:* #${displayQueue}
📋 *رقم الملف الطبي:* ${visit.patient_number || 'مسجل'}
🩺 *العيادة:* ${visit.specialty_name}
👨‍⚕️ *الطبيب المعالج:* ${visit.doctor_name}
🎫 *نوع الكشف:* ${visit.visit_type === 'new' ? 'كشف جديد' : 'إعادة / استشارة'}
${visit.priority === 'urgent' ? '⚡ *الأولوية:* حالة طارئة ومستعجلة\n' : visit.priority === 'elderly' ? '👵 *الأولوية:* كبار السن\n' : visit.priority === 'special_needs' ? '♿ *الأولوية:* أصحاب الهمم\n' : ''}
💰 *حالة السداد:* ${visit.payment_status === 'paid' ? `مسدد بالخزينة (${visit.paid_amount || visit.fee_amount || 40} ج)` : visit.payment_status === 'waived' ? 'إعفاء خيري معتمد' : 'معلق لحين السداد عند الحضور'}

يرجى التواجد بصالة الانتظار أمام العيادة عند النداء على دوركم.
نسأل الله لكم دوام الصحة والعافية 🤲`;
  };

  const handleSendWhatsAppWithPdf = async () => {
    if (!phoneNumber.trim()) {
      alert('يرجى إدخال رقم هاتف المريض أو الواتساب');
      return;
    }

    try {
      setIsGenerating(true);
      const safeName = (visit.patient_name || 'مريض').replace(/\s+/g, '_');
      const res = await shareOrSendPdfViaWhatsApp({
        elementId: 'thermal-queue-ticket',
        fileName: `كارت_دور_عيادة_${visit.specialty_name}_${safeName}_${displayQueue}`,
        phoneNumber: phoneNumber.trim(),
        messageText: getWhatsAppMessage(),
        documentTitle: `كارت الدور #${displayQueue} - عيادة ${visit.specialty_name}`,
      });

      setStatusNotice(`تم فتح محادثة المريض (${res.recipientPhone}) مباشرةً وتنزيل كارت الدور PDF.`);
      setTimeout(() => setStatusNotice(null), 5000);
    } catch (err: any) {
      console.error('Error sharing ticket PDF:', err);
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
        'thermal-queue-ticket',
        `كارت_دور_عيادة_${visit.specialty_name}_${safeName}_${displayQueue}`
      );
      if (ok) {
        setStatusNotice('تم تنزيل كارت الدور كملف PDF رسمي.');
        setTimeout(() => setStatusNotice(null), 4000);
      }
    } catch (err) {
      console.error('Error downloading ticket PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-4 sm:p-5 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors print:hidden"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header for UI */}
        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-100 print:hidden">
          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              كارت الدور الرسمي للعيادة
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              جاهز للإرسال واتساب (PDF) أو الطباعة الورقية
            </p>
          </div>
        </div>

        {/* Thermal Slip (Stylized 80mm thermal receipt) */}
        <div
          id="thermal-queue-ticket"
          className="bg-white border-2 border-slate-900 rounded-xl p-4 text-center font-sans space-y-3 print:border-none print:p-0 print:m-0"
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-2.5">
            <div className="flex items-center justify-center gap-1.5 text-teal-900 font-black text-xs">
              <Building2 className="w-4 h-4 text-teal-800" />
              <span>مستشفى لجنة الزكاة بميت علي</span>
            </div>
            <p className="text-[10px] text-slate-600 mt-0.5 font-bold">
              العيادات التخصصية الخيرية • تذكرة دور العيادة
            </p>
          </div>

          {/* Huge Queue Number Box */}
          <div className="bg-teal-900 text-white rounded-xl py-3 px-2 shadow-xs my-2">
            <span className="text-[11px] block font-bold text-teal-200 uppercase tracking-wider">
              رقم الدور بالعيادة
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight my-1 text-white">
              #{displayQueue}
            </div>
            <span className="text-[10px] text-teal-300 block font-semibold">
              يرجى الاحتفاظ بالتذكرة وتسليمها لتمريض العيادة
            </span>
          </div>

          {/* Priority Alert Banner if non-normal */}
          {priorityInfo && (
            <div className={`p-2 rounded-lg border text-[11px] font-bold ${priorityInfo.badge}`}>
              {priorityInfo.text}
            </div>
          )}

          {/* Clinic & Doctor Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-right text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">العيادة:</span>
              <strong className="text-slate-900 font-bold">عيادة {visit.specialty_name}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">الطبيب:</span>
              <span className="text-slate-800 font-semibold">{visit.doctor_name}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-200 pt-1">
              <span className="text-slate-500 font-medium">المريض:</span>
              <strong className="text-slate-900 font-bold">{visit.patient_name}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">رقم الملف:</span>
              <span className="font-mono font-bold text-teal-800">{visit.patient_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">نوع الكشف:</span>
              <span className="font-semibold text-slate-700">
                {visit.visit_type === 'new' ? 'كشف جديد' : 'إعادة / استشارة'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">حالة السداد:</span>
              <span className="font-bold text-emerald-700">
                {visit.payment_status === 'paid'
                  ? `مسدد بالخزينة (${visit.paid_amount || visit.fee_amount || 40} ج)`
                  : visit.payment_status === 'waived'
                  ? 'إعفاء خيري معتمد'
                  : 'معلق بانتظار السداد'}
              </span>
            </div>
          </div>

          {/* Time & Barcode Simulation */}
          <div className="pt-1 text-[10px] text-slate-500 space-y-1">
            <div className="flex items-center justify-center gap-2 font-mono">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{visit.visit_date}</span>
              <span>•</span>
              <Clock className="w-3 h-3 text-slate-400" />
              <span>
                {new Date(visit.created_at).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Barcode line mockup */}
            <div className="font-mono tracking-widest text-[10px] text-slate-400 select-none py-0.5 font-bold">
              ||| | ||||| || |||||| |||| | ||||| | |||||
            </div>

            <div className="flex items-center justify-center gap-1 text-teal-800 font-bold text-[10px]">
              <ShieldCheck className="w-3 h-3 text-teal-600" />
              <span>مستشفى لجنة الزكاة بميت علي • صرح طبي خيري</span>
            </div>
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

        {/* Action Buttons (Digital Delivery & Paperless Support) */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100 print:hidden mt-3">
          {/* Main WhatsApp Button */}
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
            {/* Download PDF button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="flex-1 py-2 px-2.5 border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-teal-700" />
              <span>تحميل كارت الدور PDF</span>
            </button>

            {/* Print paper ticket button */}
            <button
              type="button"
              onClick={handlePrint}
              className="py-2 px-3 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
              title="طباعة ورقية للطابعة الحرارية"
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
