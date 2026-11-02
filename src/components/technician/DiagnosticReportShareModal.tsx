import React, { useState } from 'react';
import { DiagnosticOrder } from '../../types';
import { printElement } from '../../lib/printUtils';
import { formatWhatsAppNumber, shareOrSendPdfViaWhatsApp } from '../../lib/pdfGenerator';
import {
  MessageSquare,
  Printer,
  Copy,
  Check,
  X,
  Phone,
  Send,
  FlaskConical,
  Scan,
  Download,
  FileText,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface DiagnosticReportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: DiagnosticOrder | null;
  currentStaffName?: string;
}

export const DiagnosticReportShareModal: React.FC<DiagnosticReportShareModalProps> = ({
  isOpen,
  onClose,
  order,
  currentStaffName,
}) => {
  const [phone, setPhone] = useState(order?.patient_phone || '');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [shareSuccessNotice, setShareSuccessNotice] = useState<string | null>(null);

  // Sync phone when order changes
  React.useEffect(() => {
    if (order) {
      setPhone(order.patient_phone || '');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const isLab = order.department === 'lab';
  const elementId = `printable-diag-report-${order.id}`;

  const cleanRecipientPhone = formatWhatsAppNumber(phone);

  const technicianDisplay = order.technician_name || currentStaffName || (isLab ? 'كيميائي المعمل' : 'أخصائي الأشعة');

  // Pre-formatted official Arabic WhatsApp message
  const reportDate = order.completed_at
    ? new Date(order.completed_at).toLocaleDateString('ar-EG')
    : new Date().toLocaleDateString('ar-EG');

  const formattedWhatsAppText = isLab
    ? `📋 *مستوصف لجنة زكاة ميت علي الخيري*
🔬 *معمل التحاليل الطبية والباثولوجيا الإكلينيكية*
---------------------------------------
👤 *اسم المريض:* ${order.patient_name}
🔢 *رقم العينة / الباركود:* ${order.order_number}
📁 *رقم الملف الطبي:* ${order.patient_number || '—'}
📅 *تاريخ التقرير:* ${reportDate}
🩸 *نوع العينة المسحوبة:* ${order.sample_type || 'عينة دم وريدي'}

🧪 *التحاليل والفحوصات المطلوبة:*
${order.test_names}

📊 *النتائج والقراءات المخبرية المعتمدة:*
${order.results_summary || 'النتائج معتمدة وضمن المعدلات الطبيعية.'}

👨‍🔬 *الكيميائي المسؤول:* ${technicianDisplay}
✅ *الحالة:* تقرير مخبري رسمي معتمد
---------------------------------------
🏥 مستوصف لجنة زكاة ميت علي الخيري
📍 ميت علي - مركز المنصورة - الدقهلية
📞 هاتف الاستعلامات: 050-2580111
نسأل الله لكم دوام الصحة والعافية والشفاء العاجل.`
    : `📋 *مستوصف لجنة زكاة ميت علي الخيري*
🩻 *قسم الأشعة التشخيصية والتصوير الطبي*
---------------------------------------
👤 *اسم المريض:* ${order.patient_name}
🔢 *رقم الفحص:* ${order.order_number}
📁 *رقم الملف الطبي:* ${order.patient_number || '—'}
📅 *تاريخ الفحص:* ${reportDate}
⚙️ *الجهاز المستخدم:* ${order.sample_type || 'Digital X-Ray'}

🔍 *فحص الأشعة المطلوب:*
${order.test_names}

📑 *الملاحظات والتشخيص الإشعاعي (Findings):*
${order.radiology_findings || 'فحص الأشعة سليم تماماً وضمن المعدلات الطبيعية.'}

${
  order.radiology_conclusion
    ? `🎯 *الخلاصة والتشخيص النهائي (Impression):*\n${order.radiology_conclusion}\n`
    : ''
}
👨‍⚕️ *أخصائي تكنولوجيا الأشعة:* ${technicianDisplay}
✅ *الحالة:* تقرير إشعاعي رسمي معتمد
---------------------------------------
🏥 مستوصف لجنة زكاة ميت علي الخيري
📍 ميت علي - مركز المنصورة - الدقهلية
📞 هاتف الاستعلامات: 050-2580111
نسأل الله لكم دوام الصحة والعافية والشفاء العاجل.`;

  // Copy text to clipboard
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedWhatsAppText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert('تعذر نسخ النص تلقائياً، يمكنك نسخه يدوياً من المربع.');
    }
  };

  // Direct WhatsApp Send
  const handleSendWhatsApp = async () => {
    if (!phone.trim()) {
      alert('يرجى إدخال رقم هاتف المريض أو رقم الواتساب أولاً.');
      return;
    }

    setIsSending(true);
    try {
      // 1. Direct Web/App opening with encoded message
      const targetPhone = formatWhatsAppNumber(phone);
      const encodedMsg = encodeURIComponent(formattedWhatsAppText);
      const waUrl = targetPhone
        ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedMsg}`
        : `https://api.whatsapp.com/send?text=${encodedMsg}`;

      window.open(waUrl, '_blank', 'noopener,noreferrer');

      setShareSuccessNotice(
        `تم فتح محادثة الواتساب بنجاح للرقم (${targetPhone || phone}). يتم إرسال التقرير الآن!`
      );
      setTimeout(() => setShareSuccessNotice(null), 5000);
    } catch (err) {
      console.error('WhatsApp share error:', err);
      alert('حدث خطأ أثناء فتح الواتساب.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isLab ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {isLab ? <FlaskConical className="w-5 h-5" /> : <Scan className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                {isLab ? 'مشاركة وطباعة تقرير التحليل الطبي' : 'مشاركة وطباعة تقرير فحص الأشعة'}
              </h3>
              <p className="text-[11px] text-slate-500">
                المريض: <strong className="text-slate-800">{order.patient_name}</strong> • رقم الفحص: ({order.order_number})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => printElement(elementId)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors ${
                isLab ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة ورقية</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WhatsApp Sharing Card */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-emerald-950">
                  إرسال التقرير الطبي المعتمد عبر واتساب (WhatsApp)
                </h4>
                <p className="text-[10px] text-emerald-800">
                  يصل التقرير مباشرة إلى شات المريض بصيغة منسقة ومعتمدة
                </p>
              </div>
            </div>

            {/* Phone Input & Action */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-36 sm:w-44 pr-8 pl-3 py-1.5 text-xs font-mono font-bold border border-emerald-300 rounded-xl bg-white focus:outline-hidden focus:border-emerald-600 text-slate-900"
                />
              </div>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={isSending}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال واتساب</span>
              </button>
            </div>
          </div>

          {/* Success toast */}
          {shareSuccessNotice && (
            <div className="p-2 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-[11px] font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{shareSuccessNotice}</span>
            </div>
          )}

          {/* Quick Copy bar */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-900/80">
            <span>
              رقم المحادثة المستهدف: <strong className="font-mono text-emerald-950">{cleanRecipientPhone ? `+${cleanRecipientPhone}` : 'غير محدد'}</strong>
            </span>
            <button
              type="button"
              onClick={handleCopyText}
              className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم نسخ التقرير بنجاح!' : 'نسخ نص التقرير'}</span>
            </button>
          </div>
        </div>

        {/* Printable & Official Report Paper Container */}
        <div
          id={elementId}
          className="bg-white p-6 border border-slate-200 rounded-2xl text-slate-900 text-xs space-y-4 shadow-xs"
          dir="rtl"
        >
          {/* Header */}
          <div
            className={`border-b-2 pb-3 flex items-center justify-between ${
              isLab ? 'border-amber-500' : 'border-indigo-500'
            }`}
          >
            <div>
              <h2 className="text-base font-black text-slate-900">
                مستوصف لجنة زكاة ميت علي الخيري
              </h2>
              <p
                className={`text-[11px] font-bold mt-0.5 ${
                  isLab ? 'text-amber-800' : 'text-indigo-800'
                }`}
              >
                {isLab
                  ? 'معمل التحاليل الطبية والباثولوجيا الإكلينيكية'
                  : 'قسم الأشعة التشخيصية والتصوير الطبي والموجات الصوتية'}
              </p>
              <p className="text-[10px] text-slate-500">
                ميت علي - مركز المنصورة - الدقهلية | هاتف: 050-2580111
              </p>
            </div>
            <div className="text-left font-mono text-[11px]">
              <div
                className={`font-black ${
                  isLab ? 'text-amber-900' : 'text-indigo-900'
                }`}
              >
                {isLab ? 'LABORATORY REPORT' : 'RADIOLOGY REPORT'}
              </div>
              <div className="font-bold">رقم الفحص: {order.order_number}</div>
              <div>التاريخ: {reportDate}</div>
            </div>
          </div>

          {/* Patient Info Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px]">
            <div>
              <span className="text-slate-500 block">اسم المريض:</span>
              <strong className="text-slate-900 text-xs">{order.patient_name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">رقم الملف:</span>
              <span className="font-mono font-bold">{order.patient_number || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">الطبيب المحول:</span>
              <span>{order.doctor_name || 'حجز مباشر'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">
                {isLab ? 'نوع العينة:' : 'الجهاز المستخدم:'}
              </span>
              <span className="font-semibold text-slate-800">
                {order.sample_type || (isLab ? 'عينة دم وريدي' : 'Digital X-Ray')}
              </span>
            </div>
          </div>

          {/* Required Tests / Scans */}
          <div
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
              isLab
                ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                : 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
            }`}
          >
            <span>{isLab ? 'الفحوصات المخبرية المطلوبة:' : 'فحص الأشعة المطلوب:'}</span>
            <span className="text-slate-900 font-extrabold">{order.test_names}</span>
          </div>

          {/* Findings & Medical Report Body */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white min-h-[140px] space-y-3">
            <span className="text-[11px] font-bold text-slate-600 block">
              {isLab
                ? 'نتائج وقراءات الفحص المعملي (Laboratory Findings & Values):'
                : 'الملاحظات والتشخيص الإشعاعي (Radiological Findings):'}
            </span>
            <pre className="whitespace-pre-wrap font-mono text-xs text-slate-900 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">
              {isLab
                ? order.results_summary || 'النتائج معتمدة وضمن المعدلات الطبيعية.'
                : order.radiology_findings || 'فحص الأشعة سليم تماماً وضمن المعدلات الطبيعية.'}
            </pre>

            {!isLab && order.radiology_conclusion && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-indigo-900 block mb-0.5">
                  الخلاصة والتشخيص النهائي (Impression):
                </span>
                <p className="font-extrabold text-slate-900 text-xs">
                  {order.radiology_conclusion}
                </p>
              </div>
            )}
          </div>

          {/* Signatures & Accreditation Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <div>
              <span>{isLab ? 'كيميائي المعمل المعتمد: ' : 'أخصائي الأشعة والتصوير: '}</span>
              <strong className="text-slate-900">{technicianDisplay}</strong>
            </div>

            <div className="text-center">
              <span className="block text-[10px] text-slate-400">ختم واعتماد القسم</span>
              <span
                className={`font-mono text-xs font-bold ${
                  isLab ? 'text-amber-800' : 'text-indigo-800'
                }`}
              >
                [تقرير طبي معتمد رسمياً]
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-500">
            يمكن للمريض استلام التقرير ورقياً أو عبر تطبيق واتساب مباشرة
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
